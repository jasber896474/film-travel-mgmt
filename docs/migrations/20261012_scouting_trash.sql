-- Soft-delete / recycle bin for scouting. Photos stay on pCloud until purge.

alter table public.scouting_categories
  add column if not exists deleted_at timestamptz;

alter table public.scouting_entries
  add column if not exists deleted_at timestamptz;

alter table public.scouting_photos
  add column if not exists deleted_at timestamptz;

create index if not exists scouting_categories_deleted_at_idx
  on public.scouting_categories (project_id, deleted_at);

create index if not exists scouting_entries_deleted_at_idx
  on public.scouting_entries (project_id, deleted_at);

create index if not exists scouting_photos_deleted_at_idx
  on public.scouting_photos (project_id, deleted_at);
