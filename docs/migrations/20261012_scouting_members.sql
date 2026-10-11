-- Scouting project membership (same Auth users as the travel app).
-- Access: service_role only, same as other scouting_* tables.

create table public.scouting_members (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.scouting_projects(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  constraint scouting_members_role_chk
    check (role in ('owner', 'admin', 'editor', 'viewer')),
  constraint scouting_members_unique unique (project_id, user_id)
);

create index scouting_members_user_id_idx on public.scouting_members (user_id);
create index scouting_members_project_id_idx on public.scouting_members (project_id);

alter table public.scouting_members enable row level security;
revoke all on table public.scouting_members from anon, authenticated, public;
grant all on table public.scouting_members to service_role;
grant usage, select on sequence public.scouting_members_id_seq to service_role;

create policy scouting_members_deny_direct on public.scouting_members
  for all to anon, authenticated using (false) with check (false);
