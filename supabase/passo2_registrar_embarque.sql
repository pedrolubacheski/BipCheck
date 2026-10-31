-- BipCheck - passo 2: função registrar_embarque
-- A Edge Function chama esta função via RPC: 1 ida ao banco em vez de 3.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run

create or replace function public.registrar_embarque(p_device_token text, p_uid text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_van   uuid;
  v_aluno uuid;
  v_uid   text := upper(p_uid);
begin
  -- 1) Descobre a van pelo token do aparelho
  select id into v_van from public.vans where device_token = p_device_token;
  if v_van is null then return 'aparelho_invalido'; end if;

  -- 2) Confere se o cartão pertence a um aluno desta van
  select aluno_id into v_aluno from public.cartoes where uid = v_uid and van_id = v_van;
  if v_aluno is null then return 'cartao_nao_cadastrado'; end if;

  -- 3) Grava o embarque (o app do motorista recebe via Realtime)
  insert into public.embarques (van_id, aluno_id, cartao_uid) values (v_van, v_aluno, v_uid);
  return 'ok';
end;
$$;

-- Só a Edge Function (service role) pode chamar
revoke execute on function public.registrar_embarque(text, text) from public, anon, authenticated;
grant execute on function public.registrar_embarque(text, text) to service_role;
