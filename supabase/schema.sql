-- BipCheck - schema do MVP (passo 1)
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run

-- ========== TABELAS ==========

create table vans (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dono_id uuid not null references auth.users(id) on delete cascade,
  -- token que fica gravado no ESP32 daquela van (identifica o aparelho)
  device_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  criada_em timestamptz not null default now()
);

create table alunos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cidade text,
  criado_em timestamptz not null default now()
);

create table cartoes (
  uid text primary key,                       -- UID do cartão/tag RFID (hex maiúsculo)
  aluno_id uuid not null references alunos(id) on delete cascade,
  van_id uuid not null references vans(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table embarques (
  id bigint generated always as identity primary key,
  van_id uuid not null references vans(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  cartao_uid text not null,
  embarcou_em timestamptz not null default now()
);

create index on embarques (van_id, embarcou_em desc);

-- ========== SEGURANÇA (RLS) ==========

alter table vans      enable row level security;
alter table alunos    enable row level security;
alter table cartoes   enable row level security;
alter table embarques enable row level security;

create policy "dono gerencia suas vans" on vans
  for all using (dono_id = auth.uid()) with check (dono_id = auth.uid());

create policy "dono gerencia seus alunos" on alunos
  for all using (dono_id = auth.uid()) with check (dono_id = auth.uid());

create policy "dono gerencia cartoes das suas vans" on cartoes
  for all
  using (exists (select 1 from vans v where v.id = cartoes.van_id and v.dono_id = auth.uid()))
  with check (exists (select 1 from vans v where v.id = cartoes.van_id and v.dono_id = auth.uid()));

-- embarques: o dono só lê; quem grava é a Edge Function (service role)
create policy "dono le embarques das suas vans" on embarques
  for select
  using (exists (select 1 from vans v where v.id = embarques.van_id and v.dono_id = auth.uid()));

-- ========== TEMPO REAL ==========

alter publication supabase_realtime add table embarques;
