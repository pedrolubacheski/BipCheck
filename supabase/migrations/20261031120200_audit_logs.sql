-- Auditoria: tudo que muda nos dados da empresa fica registrado aqui, pelo próprio banco
-- (triggers e funções), para não dar para pular pelo app.
-- LGPD: guarda só ids e nomes de colunas alteradas, nunca valores (nome, cidade...).
-- Retenção: 30 dias (ver migração de retenção).

create table public.audit_logs (
  id bigint generated always as identity primary key,
  -- sem FK: o log precisa sobreviver à exclusão do registro e da empresa até expirar
  company_id uuid,
  actor_user_id uuid,
  actor_device_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_company_created_at_idx on public.audit_logs (company_id, created_at desc);
create index audit_logs_created_at_idx on public.audit_logs (created_at);

alter table public.audit_logs enable row level security;

create policy "dono lê a auditoria da empresa" on public.audit_logs
  for select to authenticated using (private.is_owner(company_id));

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- Registra um evento de auditoria (usado pelas funções e pelo trigger abaixo)
create function private.log_event(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_company_id uuid default null,
  p_actor_device_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (company_id, actor_user_id, actor_device_id, action, entity, entity_id, metadata)
  values (p_company_id, (select auth.uid()), p_actor_device_id, p_action, p_entity, p_entity_id, p_metadata);
$$;

-- Trigger genérico: <tabela>.insert | <tabela>.update | <tabela>.delete
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- colunas que mudam sozinhas e não interessam à auditoria
  v_ignored text[] := array['updated_at', 'last_seen_at'];
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - v_ignored end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - v_ignored end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' then
    if v_new = v_old then
      return null;
    end if;
    select jsonb_build_object('changed_columns', coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb))
      into v_changed
      from jsonb_each(v_new) n
      where n.value is distinct from v_old -> n.key;
  end if;

  perform private.log_event(
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid else (v_row ->> 'company_id')::uuid end,
    null,
    v_changed
  );
  return null;
end;
$$;

revoke execute on function private.log_event(text, text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.audit_row_change() from public, anon, authenticated;

create trigger audit_row_change after insert or update or delete on public.companies
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.company_members
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.vans
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.van_drivers
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.devices
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.students
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.cards
  for each row execute function private.audit_row_change();
