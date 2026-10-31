-- Auditoria (o que fica registrado e o que não pode ficar) e retenção de dados
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono.b@teste.local');

-- Cada dono cria a própria empresa (gera auditoria com o autor)
select pg_temp.login_as('b0000000-0000-0000-0000-000000000001');
select public.create_company('Empresa B');
select pg_temp.logout();

select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
create temp table company on commit drop as select public.create_company('Empresa A') as id;
insert into public.students (company_id, name, city)
  select id, 'Nome Sensível', 'Cidade Sensível' from company;
update public.students set city = 'Outra Cidade';
select pg_temp.logout();

select ok(
  exists (select 1 from public.audit_logs
    where action = 'students.insert' and actor_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'criar aluno gera log com o autor'
);
select is(
  (select metadata from public.audit_logs where action = 'students.update'),
  '{"changed_columns": ["city"]}'::jsonb,
  'alteração registra só o nome das colunas alteradas'
);
select ok(
  not exists (select 1 from public.audit_logs where metadata::text like '%Sensível%' or metadata::text like '%Outra Cidade%'),
  'a auditoria nunca guarda dados pessoais'
);

select pg_temp.login_as('b0000000-0000-0000-0000-000000000001');
select is_empty(
  $$select id from public.audit_logs where action like 'students.%'$$,
  'dono de outra empresa não lê a auditoria da empresa A'
);
select throws_ok(
  'delete from public.audit_logs', '42501', null,
  'ninguém apaga a auditoria pelo app'
);
select pg_temp.logout();

-- Retenção: embarques 3 meses, auditoria 30 dias
insert into public.vans (id, company_id, name) select 'a2000000-0000-0000-0000-000000000001', id, 'Van 1' from company;
insert into public.boardings (company_id, van_id, student_id, boarded_at)
  select c.id, 'a2000000-0000-0000-0000-000000000001', s.id, b.boarded_at
  from company c, public.students s,
    (values (now() - interval '4 months'), (now() - interval '2 months')) as b (boarded_at);
update public.audit_logs set created_at = now() - interval '31 days' where action = 'students.insert';

select private.purge_expired_data();

select is((select count(*)::int from public.boardings), 1, 'embarques com mais de 3 meses são apagados');
select ok(
  not exists (select 1 from public.audit_logs where action = 'students.insert')
    and exists (select 1 from public.audit_logs where action = 'students.update'),
  'logs com mais de 30 dias são apagados e os recentes ficam'
);
select ok(
  exists (select 1 from cron.job where jobname = 'purge-expired-data'),
  'a limpeza está agendada no pg_cron'
);

select * from finish();
rollback;
