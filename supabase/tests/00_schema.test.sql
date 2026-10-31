-- Regras estruturais que valem para o banco inteiro (RLS, índices, permissões)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'toda tabela do schema public tem RLS ligada'
);

select is(
  (select count(*)::int from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and (i.indkey::int2[])[0] = c.conkey[1]
      )),
  0,
  'toda chave estrangeira tem índice'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0,
  'anon não tem permissão em nenhuma tabela'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and p.prosecdef
      and not exists (select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%')),
  0,
  'toda função security definer fixa o search_path'
);

select ok(
  not has_function_privilege('authenticated', 'public.register_boarding(text, text)', 'execute')
    and not has_function_privilege('anon', 'public.register_boarding(text, text)', 'execute'),
  'register_boarding só pode ser chamada pela service_role'
);

select ok(
  not has_column_privilege('authenticated', 'public.devices', 'token_hash', 'select'),
  'o app não consegue ler o hash do token dos leitores'
);

select * from finish();
rollback;
