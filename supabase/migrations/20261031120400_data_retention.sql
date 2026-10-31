-- Retenção de dados (LGPD e para o banco não encher):
--   embarques: 3 meses
--   auditoria: 30 dias
-- Um job diário do pg_cron apaga o que passou do prazo.

create extension if not exists pg_cron with schema pg_catalog;

create function private.purge_expired_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.boardings where boarded_at < now() - interval '3 months';
  delete from public.audit_logs where created_at < now() - interval '30 days';
end;
$$;

revoke execute on function private.purge_expired_data() from public, anon, authenticated;

-- Todo dia às 06:00 UTC (03:00 em Brasília)
select cron.schedule('purge-expired-data', '0 6 * * *', 'select private.purge_expired_data()');
