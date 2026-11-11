-- Função register_boarding (chamada pela Edge Function a cada bip) e tokens dos leitores
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.login_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;
-- Simula que já passou mais de 1 s desde o último bip (evita o limite de requisições)
create function pg_temp.wait_rate_limit() returns void language sql as $$
  update public.devices set last_seen_at = now() - interval '5 seconds';
$$;
create function pg_temp.status(p_token text, p_uid text) returns text language sql as $$
  select public.register_boarding(p_token, p_uid) ->> 'status';
$$;

insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local');
insert into public.companies (id, name) values ('a1000000-0000-0000-0000-000000000000', 'Empresa A');
insert into public.company_members (company_id, user_id, email, role) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local', 'owner');
insert into public.vans (id, company_id, name) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000000', 'Van 1');
insert into public.students (id, company_id, name) values
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000000', 'Aluno Fictício');
insert into public.cards (company_id, student_id, uid) values
  ('a1000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000001', 'A1B2C3D4');

-- O dono cria o leitor; o token em texto puro só aparece aqui
select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
create temp table device on commit drop as
  select * from public.create_device('a1000000-0000-0000-0000-000000000000', 'Leitor 1', 'a2000000-0000-0000-0000-000000000001');
select pg_temp.logout();

select ok((select token ~ '^[0-9a-f]{48}$' from device), 'create_device devolve um token aleatório de 48 caracteres');
select ok(
  (select d.token_hash <> t.token from public.devices d join device t on t.device_id = d.id),
  'o banco guarda só o hash do token, nunca o texto puro'
);

select is(pg_temp.status('token-errado', 'A1B2C3D4'), 'invalid_device', 'token desconhecido é recusado');
select is(pg_temp.status((select token from device), 'a1b2c3d4'), 'registered', 'cartão válido registra o embarque (UID em minúsculo é aceito)');
select is(pg_temp.status((select token from device), 'A1B2C3D4'), 'rate_limited', 'segundo bip no mesmo segundo é limitado');
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from device), 'A1B2C3D4'), 'duplicate', 'toque repetido em menos de 2 minutos não duplica o embarque');
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from device), 'FFFFFFFF'), 'unknown_card', 'cartão não cadastrado é recusado');

update public.cards set active = false where uid = 'A1B2C3D4';
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from device), 'A1B2C3D4'), 'unknown_card', 'cartão desativado é recusado');

-- Leituras guardadas sem rede e reenviadas depois (p_read_at)
insert into public.students (id, company_id, name) values
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'Aluna Fictícia');
insert into public.cards (company_id, student_id, uid) values
  ('a1000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000002', 'B1B2B3B4');

select pg_temp.wait_rate_limit();
select is(
  public.register_boarding((select token from device), 'B1B2B3B4', now() - interval '30 minutes') ->> 'status',
  'registered', 'leitura reenviada é registrada'
);
select ok(
  (select boarded_at < now() - interval '29 minutes' from public.boardings
    where student_id = 'a3000000-0000-0000-0000-000000000002'),
  'o embarque reenviado fica com o horário da leitura, não o do reenvio'
);
select pg_temp.wait_rate_limit();
select is(
  public.register_boarding((select token from device), 'B1B2B3B4', now() - interval '31 minutes') ->> 'status',
  'duplicate', 'leitura reenviada a menos de 2 minutos de outra do mesmo aluno não duplica'
);
select pg_temp.wait_rate_limit();
select is(
  public.register_boarding((select token from device), 'B1B2B3B4', now() - interval '13 hours') ->> 'status',
  'invalid_read_at', 'leitura com mais de 12 horas é recusada'
);
select pg_temp.wait_rate_limit();
select is(
  public.register_boarding((select token from device), 'B1B2B3B4', now() + interval '10 minutes') ->> 'status',
  'invalid_read_at', 'leitura com horário no futuro é recusada'
);
select is(
  (select count(*)::int from public.boardings where student_id = 'a3000000-0000-0000-0000-000000000002'),
  1, 'as leituras recusadas não gravaram embarque'
);

update public.devices set van_id = null;
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from device), 'A1B2C3D4'), 'device_unassigned', 'leitor sem van não registra');

select is((select count(*)::int from public.boardings), 2, 'só os dois embarques válidos foram gravados');

-- Troca de token: o antigo para de funcionar na hora
select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
create temp table rotated on commit drop as
  select public.rotate_device_token((select device_id from device)) as token;
select pg_temp.logout();
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from device), 'A1B2C3D4'), 'invalid_device', 'token antigo deixa de funcionar após a troca');
select pg_temp.wait_rate_limit();
select is(pg_temp.status((select token from rotated), 'A1B2C3D4'), 'device_unassigned', 'token novo é reconhecido');

select * from finish();
rollback;
