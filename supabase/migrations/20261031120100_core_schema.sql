-- Esquema base multi-tenant: cada dono de frota é uma empresa (company) e
-- toda tabela de dados carrega company_id. A RLS separa os dados por empresa
-- e pelo papel da pessoa na empresa (owner = dono, driver = motorista).

create extension if not exists pgcrypto with schema extensions;

-- Funções internas (helpers de RLS, triggers) ficam fora do schema exposto pela API
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.member_role as enum ('owner', 'driver');

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ========== TABELAS ==========

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- cópia do e-mail da conta, para o dono identificar quem é quem (auth.users não é legível pelo app)
  email text not null,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.vans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- permite FKs compostas (id, company_id): impede ligar registros de empresas diferentes
  unique (id, company_id)
);

-- Motoristas vinculados a cada van (o motorista só vê os embarques das vans dele)
create table public.van_drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  van_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (van_id, user_id),
  foreign key (van_id, company_id) references public.vans (id, company_id) on delete cascade,
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);

-- Leitores RFID (ESP32). O token fica só como hash SHA-256; o texto puro
-- é mostrado uma única vez, na criação ou na troca do token.
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  van_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 80),
  token_hash text not null unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (van_id, company_id) references public.vans (id, company_id) on delete set null (van_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  city text check (city is null or char_length(trim(city)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);

-- Cartão/tag RFID. Pertence ao aluno (não à van): vale em qualquer van da empresa.
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  student_id uuid not null,
  uid text not null check (uid ~ '^[0-9A-F]{8,20}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, uid),
  unique (id, company_id),
  foreign key (student_id, company_id) references public.students (id, company_id) on delete cascade
);

-- Registro imutável de cada embarque (gravado só pela função register_boarding)
create table public.boardings (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  van_id uuid not null,
  student_id uuid not null,
  device_id uuid,
  card_id uuid,
  boarded_at timestamptz not null default now(),
  foreign key (van_id, company_id) references public.vans (id, company_id) on delete cascade,
  foreign key (student_id, company_id) references public.students (id, company_id) on delete cascade,
  foreign key (device_id, company_id) references public.devices (id, company_id) on delete set null (device_id),
  foreign key (card_id, company_id) references public.cards (id, company_id) on delete set null (card_id)
);

-- ========== ÍNDICES (toda FK e company_id; a RLS filtra por eles) ==========

create index company_members_user_id_idx on public.company_members (user_id);
create index vans_company_id_idx on public.vans (company_id);
create index van_drivers_company_id_idx on public.van_drivers (company_id);
create index van_drivers_user_id_idx on public.van_drivers (user_id);
create index van_drivers_company_user_idx on public.van_drivers (company_id, user_id);
create index devices_company_id_idx on public.devices (company_id);
create index devices_van_id_idx on public.devices (van_id);
create index students_company_id_idx on public.students (company_id);
create index cards_student_id_idx on public.cards (student_id);
create index boardings_company_boarded_at_idx on public.boardings (company_id, boarded_at desc);
create index boardings_van_boarded_at_idx on public.boardings (van_id, boarded_at desc);
create index boardings_student_boarded_at_idx on public.boardings (student_id, boarded_at desc);
create index boardings_device_id_idx on public.boardings (device_id);
create index boardings_card_id_idx on public.boardings (card_id);
create index boardings_boarded_at_idx on public.boardings (boarded_at);

-- ========== updated_at automático ==========

create trigger set_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.company_members
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.vans
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.van_drivers
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.devices
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.students
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.cards
  for each row execute function private.set_updated_at();

-- ========== HELPERS DE RLS ==========
-- security definer: leem company_members sem cair na própria RLS (evita recursão)

create function private.is_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = (select auth.uid())
  );
$$;

create function private.is_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create function private.drives_van(p_van_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.van_drivers
    where van_id = p_van_id and user_id = (select auth.uid())
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
grant execute on function private.drives_van(uuid) to authenticated;

-- ========== RLS ==========

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.vans enable row level security;
alter table public.van_drivers enable row level security;
alter table public.devices enable row level security;
alter table public.students enable row level security;
alter table public.cards enable row level security;
alter table public.boardings enable row level security;

-- companies: criada pela função create_company; nunca apagada pelo app
create policy "membros leem a própria empresa" on public.companies
  for select to authenticated using (private.is_member(id));
create policy "dono edita a empresa" on public.companies
  for update to authenticated using (private.is_owner(id)) with check (private.is_owner(id));

-- company_members: membros são adicionados pela função add_company_member
create policy "membros veem os colegas" on public.company_members
  for select to authenticated using (private.is_member(company_id));
create policy "dono altera papéis" on public.company_members
  for update to authenticated
  using (private.is_owner(company_id) and user_id <> (select auth.uid()))
  with check (private.is_owner(company_id));
create policy "dono remove membros (menos a si mesmo)" on public.company_members
  for delete to authenticated
  using (private.is_owner(company_id) and user_id <> (select auth.uid()));

-- vans
create policy "membros leem as vans" on public.vans
  for select to authenticated using (private.is_member(company_id));
create policy "dono cria vans" on public.vans
  for insert to authenticated with check (private.is_owner(company_id));
create policy "dono edita vans" on public.vans
  for update to authenticated using (private.is_owner(company_id)) with check (private.is_owner(company_id));
create policy "dono apaga vans" on public.vans
  for delete to authenticated using (private.is_owner(company_id));

-- van_drivers
create policy "membros leem os vínculos" on public.van_drivers
  for select to authenticated using (private.is_member(company_id));
create policy "dono vincula motoristas" on public.van_drivers
  for insert to authenticated with check (private.is_owner(company_id));
create policy "dono desvincula motoristas" on public.van_drivers
  for delete to authenticated using (private.is_owner(company_id));

-- devices: criados e com token trocado só pelas funções create_device / rotate_device_token
create policy "dono lê os leitores" on public.devices
  for select to authenticated using (private.is_owner(company_id));
create policy "dono edita os leitores" on public.devices
  for update to authenticated using (private.is_owner(company_id)) with check (private.is_owner(company_id));
create policy "dono apaga os leitores" on public.devices
  for delete to authenticated using (private.is_owner(company_id));

-- students
create policy "membros leem os alunos" on public.students
  for select to authenticated using (private.is_member(company_id));
create policy "dono cria alunos" on public.students
  for insert to authenticated with check (private.is_owner(company_id));
create policy "dono edita alunos" on public.students
  for update to authenticated using (private.is_owner(company_id)) with check (private.is_owner(company_id));
create policy "dono apaga alunos" on public.students
  for delete to authenticated using (private.is_owner(company_id));

-- cards
create policy "membros leem os cartões" on public.cards
  for select to authenticated using (private.is_member(company_id));
create policy "dono cria cartões" on public.cards
  for insert to authenticated with check (private.is_owner(company_id));
create policy "dono edita cartões" on public.cards
  for update to authenticated using (private.is_owner(company_id)) with check (private.is_owner(company_id));
create policy "dono apaga cartões" on public.cards
  for delete to authenticated using (private.is_owner(company_id));

-- boardings: o dono vê tudo da empresa; o motorista só as vans dele. Ninguém grava pelo app.
create policy "dono e motorista da van leem embarques" on public.boardings
  for select to authenticated
  using (private.is_owner(company_id) or private.drives_van(van_id));

-- ========== PERMISSÕES (o mínimo necessário; a RLS filtra as linhas) ==========

revoke all on public.companies, public.company_members, public.vans, public.van_drivers,
  public.devices, public.students, public.cards, public.boardings
  from anon, authenticated;

grant select, update (name) on public.companies to authenticated;
grant select, update (role), delete on public.company_members to authenticated;
grant select, insert (company_id, name), update (name), delete on public.vans to authenticated;
grant select, insert (company_id, van_id, user_id), delete on public.van_drivers to authenticated;
-- token_hash nunca é lido pelo app
grant select (id, company_id, van_id, name, last_seen_at, created_at, updated_at),
  update (name, van_id), delete on public.devices to authenticated;
grant select, insert (company_id, name, city), update (name, city), delete on public.students to authenticated;
grant select, insert (company_id, student_id, uid), update (active), delete on public.cards to authenticated;
grant select on public.boardings to authenticated;

-- ========== TEMPO REAL ==========

alter publication supabase_realtime add table public.boardings;
