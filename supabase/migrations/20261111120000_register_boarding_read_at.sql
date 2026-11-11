-- Fila offline do leitor: register_boarding passa a aceitar o horário da leitura (p_read_at).
--
-- Quando o leitor fica sem rede, ele guarda a leitura e reenvia depois. Sem este parâmetro o
-- embarque ficaria com o horário do reenvio, e não com o horário em que o aluno encostou o cartão.
--
-- Compatível com o firmware e a Edge Function atuais: p_read_at é opcional e, sem ele, vale now().
-- A função antiga (2 parâmetros) é substituída na mesma transação; nenhum dado é alterado.
--
-- Status novo:
--   invalid_read_at   horário no futuro ou com mais de 12 horas (leitura velha demais ou relógio errado)

drop function public.register_boarding(text, text);

create function public.register_boarding(
  p_device_token text,
  p_uid text,
  p_read_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.devices%rowtype;
  v_card public.cards%rowtype;
  v_uid text := upper(trim(p_uid));
  v_boarded_at timestamptz := coalesce(p_read_at, now());
  v_boarding_id bigint;
begin
  select * into v_device
    from public.devices
    where token_hash = private.hash_device_token(p_device_token)
    for update;

  if not found then
    perform private.log_event('device.invalid_token', 'devices');
    return jsonb_build_object('status', 'invalid_device');
  end if;

  if v_device.last_seen_at > now() - interval '1 second' then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  update public.devices set last_seen_at = now() where id = v_device.id;

  if v_device.van_id is null then
    return jsonb_build_object('status', 'device_unassigned');
  end if;

  -- 1 minuto de tolerância para diferença entre o relógio do leitor e o do servidor.
  -- O limite de 12 horas impede um leitor (ou um token roubado) de gravar embarques em datas antigas.
  if v_boarded_at > now() + interval '1 minute' or v_boarded_at < now() - interval '12 hours' then
    perform private.log_event(
      'boarding.invalid_read_at', 'devices', null, v_device.company_id, v_device.id
    );
    return jsonb_build_object('status', 'invalid_read_at');
  end if;

  select * into v_card
    from public.cards
    where company_id = v_device.company_id and uid = v_uid and active;

  if not found then
    perform private.log_event(
      'boarding.unknown_card', 'cards', null, v_device.company_id, v_device.id,
      jsonb_build_object('uid', v_uid)
    );
    return jsonb_build_object('status', 'unknown_card');
  end if;

  -- Toque repetido: mesmo aluno e van a menos de 2 minutos do horário desta leitura
  -- (para uma leitura reenviada, o que conta é a hora em que o cartão foi lido)
  if exists (
    select 1 from public.boardings
    where student_id = v_card.student_id
      and van_id = v_device.van_id
      and boarded_at > v_boarded_at - interval '2 minutes'
      and boarded_at < v_boarded_at + interval '2 minutes'
  ) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  insert into public.boardings (company_id, van_id, student_id, device_id, card_id, boarded_at)
  values (v_device.company_id, v_device.van_id, v_card.student_id, v_device.id, v_card.id, v_boarded_at)
  returning id into v_boarding_id;

  return jsonb_build_object('status', 'registered', 'boarding_id', v_boarding_id);
end;
$$;

revoke execute on function public.register_boarding(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.register_boarding(text, text, timestamptz) to service_role;
