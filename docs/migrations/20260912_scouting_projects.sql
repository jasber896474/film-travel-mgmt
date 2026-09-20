-- Isolated scouting tables (shared film-travel-mgmt project; 2-project free cap).
-- Access: service_role only. Travel app publishable key cannot read these rows.

create table public.scouting_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table public.scouting_categories (
  project_id uuid not null references public.scouting_projects(id) on delete cascade,
  letter text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, letter)
);

create table public.scouting_entries (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.scouting_projects(id) on delete cascade,
  category_letter text not null,
  sequence integer not null,
  name text not null default '',
  background text not null default '',
  fee text not null default '',
  rules text not null default '',
  map_link text not null default '',
  photo_link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_entries_category_fk
    foreign key (project_id, category_letter)
    references public.scouting_categories(project_id, letter)
);

create table public.scouting_photos (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.scouting_projects(id) on delete cascade,
  entry_id bigint not null references public.scouting_entries(id) on delete cascade,
  url text not null,
  pcloud_file_id text,
  pcloud_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index scouting_entries_project_id_idx on public.scouting_entries (project_id);
create index scouting_entries_category_idx on public.scouting_entries (project_id, category_letter);
create index scouting_photos_entry_id_idx on public.scouting_photos (entry_id);
create index scouting_photos_project_id_idx on public.scouting_photos (project_id);

alter table public.scouting_projects enable row level security;
alter table public.scouting_categories enable row level security;
alter table public.scouting_entries enable row level security;
alter table public.scouting_photos enable row level security;

revoke all on table public.scouting_projects from anon, authenticated, public;
revoke all on table public.scouting_categories from anon, authenticated, public;
revoke all on table public.scouting_entries from anon, authenticated, public;
revoke all on table public.scouting_photos from anon, authenticated, public;

grant all on table public.scouting_projects to service_role;
grant all on table public.scouting_categories to service_role;
grant all on table public.scouting_entries to service_role;
grant all on table public.scouting_photos to service_role;
grant usage, select on sequence public.scouting_entries_id_seq to service_role;
grant usage, select on sequence public.scouting_photos_id_seq to service_role;

create policy scouting_projects_deny_direct on public.scouting_projects
  for all to anon, authenticated using (false) with check (false);
create policy scouting_categories_deny_direct on public.scouting_categories
  for all to anon, authenticated using (false) with check (false);
create policy scouting_entries_deny_direct on public.scouting_entries
  for all to anon, authenticated using (false) with check (false);
create policy scouting_photos_deny_direct on public.scouting_photos
  for all to anon, authenticated using (false) with check (false);
