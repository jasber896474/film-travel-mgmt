-- Split mixed "background" into address / access / site_condition.
-- Add hours, contact, status for crew recce sheets.

alter table public.scouting_entries
  add column if not exists address text not null default '',
  add column if not exists access text not null default '',
  add column if not exists site_condition text not null default '',
  add column if not exists hours text not null default '',
  add column if not exists contact text not null default '',
  add column if not exists status text not null default 'pending';

update public.scouting_entries
  set site_condition = background
  where coalesce(site_condition, '') = ''
    and coalesce(background, '') <> '';
