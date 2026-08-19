-- ASKORAA functional repair: notification types, names, archive and realtime.
create extension if not exists pgcrypto;

-- Allow the notification events used by the application, including a clean
-- chat-close event. We deliberately replace only the notification type check.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.notifications'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'HELP_REQUEST',
    'CONNECTION_ACCEPTED',
    'PROBLEM_SOLVED',
    'PROBLEM_UNRESOLVED',
    'CHAT_CLOSED'
  ));

-- Repair old profiles that were created before display_name metadata was
-- correctly copied from Auth.
update public.profiles p
set display_name = nullif(trim(u.raw_user_meta_data->>'display_name'), '')
from auth.users u
where u.id = p.id
  and nullif(trim(u.raw_user_meta_data->>'display_name'), '') is not null
  and (p.display_name is null or trim(p.display_name) = '' or p.display_name = 'ASKORAA User');

-- Keep future profile names synchronized when Auth metadata contains one.
create or replace function public.sync_profile_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set display_name = coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), display_name)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_profile_name_on_auth on auth.users;
create trigger sync_profile_name_on_auth
after update of raw_user_meta_data on auth.users
for each row execute function public.sync_profile_name();

-- Public archive stays readable without login.
alter table public.archive_records enable row level security;
drop policy if exists archive_select_public on public.archive_records;
create policy archive_select_public on public.archive_records for select using (true);

-- Rebuild missing archive rows from trusted outcomes, without deleting history.
insert into public.archive_records(
  room_id, post_id, title, body, category, owner_id, solver_id,
  outcome, solution, summary, solved_at
)
select
  r.id, p.id, p.title, p.body, p.category, r.problem_owner_id, r.solver_id,
  o.outcome,
  coalesce(nullif(o.solution,''), nullif(rs.body,''), ''),
  coalesce(o.summary,''),
  coalesce(o.decided_at, o.created_at, now())
from public.problem_outcomes o
join public.rooms r on r.id=o.room_id
join public.posts p on p.id=r.post_id
left join public.room_solutions rs on rs.room_id=r.id
where not exists(select 1 from public.archive_records a where a.room_id=r.id)
on conflict (room_id) do nothing;

-- Make sure realtime is enabled for the actual live-chat/event tables.
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_solutions; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
