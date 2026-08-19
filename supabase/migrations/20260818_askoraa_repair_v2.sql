-- ASKORAA V1 REPAIR V2
-- Run this AFTER the existing ASKORAA V1 migration.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Profiles: real names + optional profile picture.
-- ------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- Backfill names for older accounts that were created before the
-- metadata-based profile trigger was in place.
update public.profiles p
set display_name = coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), p.display_name)
from auth.users u
where u.id = p.id
  and coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), '') <> ''
  and (p.display_name is null or trim(p.display_name) = '' or p.display_name = 'ASKORAA User');

-- Keep future profile creation synced to signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'ASKORAA User'))
  on conflict(id) do update
  set display_name = case
    when public.profiles.display_name is null
      or trim(public.profiles.display_name) = ''
      or public.profiles.display_name = 'ASKORAA User'
    then excluded.display_name
    else public.profiles.display_name
  end;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Reports: older table may exist without target_id.
-- ------------------------------------------------------------
alter table public.reports add column if not exists target_id text;

-- ------------------------------------------------------------
-- Notifications: repair any old/wrong connection FK.
-- The connection belongs to post_applications, not another table.
-- ------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select distinct con.conname
    from pg_constraint con
    join pg_attribute a
      on a.attrelid = con.conrelid
     and a.attnum = any(con.conkey)
    where con.conrelid = 'public.notifications'::regclass
      and con.contype = 'f'
      and a.attname = 'connection_id'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_connection_id_fkey
  foreign key(connection_id)
  references public.post_applications(id)
  on delete cascade;

-- ------------------------------------------------------------
-- Archive: backfill rooms whose outcome was already recorded.
-- This also recovers solves from the period when the notification
-- FK could cause the outcome transaction to fail after insertion.
-- ------------------------------------------------------------
insert into public.archive_records(
  room_id,post_id,title,body,category,owner_id,solver_id,
  outcome,solution,summary,solved_at
)
select
  r.id,
  p.id,
  p.title,
  p.body,
  p.category,
  r.problem_owner_id,
  r.solver_id,
  po.outcome,
  coalesce(nullif(po.solution,''), rs.body, ''),
  coalesce(po.summary,''),
  coalesce(po.decided_at,po.created_at,now())
from public.problem_outcomes po
join public.rooms r on r.id = po.room_id
join public.posts p on p.id = r.post_id
left join public.room_solutions rs on rs.room_id = r.id
where not exists (
  select 1 from public.archive_records ar where ar.room_id = r.id
)
on conflict(room_id) do nothing;

-- Make sure public archive is actually readable without login.
alter table public.archive_records enable row level security;
drop policy if exists archive_select_public on public.archive_records;
create policy archive_select_public
on public.archive_records
for select using (true);

-- Make sure reports remain authenticated-only for writes.
alter table public.reports enable row level security;
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self
on public.reports
for insert
with check (auth.uid() = reporter_id);

-- Realtime is needed for the actual notification/chat experience.
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_solutions; exception when duplicate_object then null; end;
end $$;

-- Tell PostgREST to immediately reload its schema cache.
notify pgrst, 'reload schema';
