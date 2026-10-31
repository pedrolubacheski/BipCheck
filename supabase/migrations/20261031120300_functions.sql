-- Funções (RPC) com a regra de negócio que precisa ser confiável.
-- Todas security definer com search_path vazio e execução liberada só para quem precisa.

-- ========== EMPRESA E MEMBROS ==========

-- Cria a empresa e coloca quem chamou como dono
create function public.create_company(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.companies (name) values (trim(p_name)) returning id into v_company_id;
  insert into public.company_members (company_id, user_id, email, role)
    select v_company_id, v_user_id, u.email, 'owner' from auth.users u where u.id = v_user_id;
  return v_company_id;
end;
$$;

-- Adiciona (ou muda o papel de) uma pessoa que já tem conta, pelo e-mail
create function public.add_company_member(p_company_id uuid, p_email text, p_role public.member_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_member_id uuid;
begin
  if not private.is_owner(p_company_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id, email into v_user_id, v_email from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  insert into public.company_members (company_id, user_id, email, role)
  values (p_company_id, v_user_id, v_email, p_role)
  on conflict (company_id, user_id) do update set role = excluded.role
  returning id into v_member_id;
  return v_member_id;
end;
$$;

-- ========== LEITORES (DEVICES) ==========

create function private.hash_device_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create function private.new_device_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select encode(extensions.gen_random_bytes(24), 'hex');
$$;

-- Cria um leitor e devolve o token em texto puro UMA única vez (no banco fica só o hash)
create function public.create_device(p_company_id uuid, p_name text, p_van_id uuid default null)
returns table (device_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := private.new_device_token();
begin
  if not private.is_owner(p_company_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.devices (company_id, van_id, name, token_hash)
  values (p_company_id, p_van_id, trim(p_name), private.hash_device_token(v_token))
  returning id into device_id;
  token := v_token;
  return next;
end;
$$;

-- Troca o token de um leitor (perdido, roubado ou vazado). O token antigo para de funcionar na hora.
create function public.rotate_device_token(p_device_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_token text := private.new_device_token();
begin
  select company_id into v_company_id from public.devices where id = p_device_id;
  if v_company_id is null or not private.is_owner(v_company_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.devices set token_hash = private.hash_device_token(v_token) where id = p_device_id;
  return v_token;
end;
$$;

-- ========== EMBARQUE ==========

-- Chamada só pela Edge Function register-boarding (service_role), uma ida ao banco por bip.
-- Retorna {"status": ...}:
--   registered        embarque gravado
--   duplicate         mesmo aluno, mesma van, há menos de 2 minutos (toque repetido)
--   invalid_device    token não reconhecido
--   device_unassigned leitor sem van
--   unknown_card      cartão não cadastrado ou desativado
--   rate_limited      mais de 1 requisição por segundo do mesmo leitor
create function public.register_boarding(p_device_token text, p_uid text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.devices%rowtype;
  v_card public.cards%rowtype;
  v_uid text := upper(trim(p_uid));
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

  if exists (
    select 1 from public.boardings
    where student_id = v_card.student_id
      and van_id = v_device.van_id
      and boarded_at > now() - interval '2 minutes'
  ) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  insert into public.boardings (company_id, van_id, student_id, device_id, card_id)
  values (v_device.company_id, v_device.van_id, v_card.student_id, v_device.id, v_card.id)
  returning id into v_boarding_id;

  return jsonb_build_object('status', 'registered', 'boarding_id', v_boarding_id);
end;
$$;

-- ========== PERMISSÕES ==========

revoke execute on function public.create_company(text) from public, anon;
revoke execute on function public.add_company_member(uuid, text, public.member_role) from public, anon;
revoke execute on function public.create_device(uuid, text, uuid) from public, anon;
revoke execute on function public.rotate_device_token(uuid) from public, anon;
revoke execute on function public.register_boarding(text, text) from public, anon, authenticated;
revoke execute on function private.hash_device_token(text) from public, anon, authenticated;
revoke execute on function private.new_device_token() from public, anon, authenticated;

grant execute on function public.create_company(text) to authenticated;
grant execute on function public.add_company_member(uuid, text, public.member_role) to authenticated;
grant execute on function public.create_device(uuid, text, uuid) to authenticated;
grant execute on function public.rotate_device_token(uuid) to authenticated;
grant execute on function public.register_boarding(text, text) to service_role;
