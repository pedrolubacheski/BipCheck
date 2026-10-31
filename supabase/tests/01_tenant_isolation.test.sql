-- Isolamento entre empresas e permissões por papel (dono x motorista)
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Helpers só deste teste (pg_temp some no fim da sessão)
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

-- Dados fictícios: empresa A (dono + motorista da van 1) e empresa B (dono)
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'motorista.a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono.b@teste.local');
insert into public.companies (id, name) values
  ('a1000000-0000-0000-0000-000000000000', 'Empresa A'),
  ('b1000000-0000-0000-0000-000000000000', 'Empresa B');
insert into public.company_members (company_id, user_id, email, role) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local', 'owner'),
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'motorista.a@teste.local', 'driver'),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'dono.b@teste.local', 'owner');
insert into public.vans (id, company_id, name) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000000', 'Van 1'),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'Van 2');
insert into public.van_drivers (company_id, van_id, user_id) values
  ('a1000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
insert into public.students (id, company_id, name) values
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000000', 'Aluno Fictício');
insert into public.boardings (company_id, van_id, student_id) values
  ('a1000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001');

-- Empresa B não enxerga nada da empresa A
select pg_temp.login_as('b0000000-0000-0000-0000-000000000001');
select is_empty('select id from public.vans', 'dono de outra empresa não vê as vans');
select is_empty('select id from public.students', 'dono de outra empresa não vê os alunos');
select is_empty('select id from public.boardings', 'dono de outra empresa não vê os embarques');
select throws_ok(
  $$insert into public.students (company_id, name) values ('a1000000-0000-0000-0000-000000000000', 'Intruso')$$,
  '42501', null, 'dono de outra empresa não cria aluno na empresa A'
);
select is_empty(
  $$update public.vans set name = 'Invadida' where company_id = 'a1000000-0000-0000-0000-000000000000' returning id$$,
  'dono de outra empresa não altera vans da empresa A'
);
select pg_temp.logout();

-- Dono vê tudo da própria empresa
select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.boardings), 2, 'dono vê os embarques de todas as vans');
select lives_ok(
  $$insert into public.students (company_id, name) values ('a1000000-0000-0000-0000-000000000000', 'Novo Aluno')$$,
  'dono cria aluno na própria empresa'
);
select is_empty(
  $$delete from public.company_members where user_id = 'a0000000-0000-0000-0000-000000000001' returning id$$,
  'dono não consegue remover a si mesmo'
);
select pg_temp.logout();

-- Motorista: lê o necessário, não altera cadastro, só vê embarques da van dele
select pg_temp.login_as('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.students), 2, 'motorista vê os alunos da empresa');
select results_eq(
  'select van_id from public.boardings',
  $$values ('a2000000-0000-0000-0000-000000000001'::uuid)$$,
  'motorista só vê embarques da van dele'
);
select throws_ok(
  $$insert into public.students (company_id, name) values ('a1000000-0000-0000-0000-000000000000', 'X')$$,
  '42501', null, 'motorista não cria aluno'
);
select is_empty('select id from public.devices', 'motorista não vê os leitores');
select is_empty('select id from public.audit_logs', 'motorista não vê a auditoria');
select pg_temp.logout();

-- Sem login
set local role anon;
select throws_ok('select id from public.students', '42501', null, 'sem login não lê nada');
reset role;

select * from finish();
rollback;
