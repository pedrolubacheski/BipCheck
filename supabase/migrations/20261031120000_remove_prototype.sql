-- Remove o esquema do protótipo (nomes em português, sem separação por empresa).
-- Os dados do protótipo eram só de teste. O esquema definitivo vem nas próximas migrações.

drop function if exists public.registrar_embarque(text, text);

drop table if exists public.embarques;
drop table if exists public.cartoes;
drop table if exists public.alunos;
drop table if exists public.vans;
