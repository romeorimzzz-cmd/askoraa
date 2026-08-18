-- ASKORAA FINAL V1 MIGRATION
-- Run once in Supabase SQL Editor after the original schema.sql.
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists terms_accepted boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

alter table public.post_applications add column if not exists status text not null default 'PENDING';
alter table public.post_applications add column if not exists responded_at timestamptz;
alter table public.post_applications drop constraint if exists post_applications_status_check;
alter table public.post_applications add constraint post_applications_status_check check(status in ('PENDING','ACCEPTED','REJECTED','CANCELLED'));

create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 type text not null,
 title text not null,
 message text not null default '',
 post_id uuid references public.posts(id) on delete cascade,
 room_id uuid references public.rooms(id) on delete cascade,
 connection_id uuid references public.post_applications(id) on delete cascade,
 is_read boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create table if not exists public.room_solutions(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 solver_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 3 and 10000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.problem_outcomes add column if not exists solver_id uuid references public.profiles(id) on delete cascade;
alter table public.problem_outcomes add column if not exists solution text not null default '';
alter table public.problem_outcomes add column if not exists summary text not null default '';
alter table public.problem_outcomes add column if not exists decided_at timestamptz not null default now();

create table if not exists public.archive_records(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 title text not null,
 body text not null,
 category text not null,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 solver_id uuid not null references public.profiles(id) on delete cascade,
 outcome text not null check(outcome in('YES','NO')),
 solution text not null default '',
 summary text not null default '',
 solved_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists archive_solved_at_idx on public.archive_records(solved_at desc);
create index if not exists archive_category_idx on public.archive_records(category);

create table if not exists public.presence_sessions(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 last_seen timestamptz not null default now()
);
create index if not exists presence_last_seen_idx on public.presence_sessions(last_seen desc);

create table if not exists public.reports(
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 target_type text not null,
 target_id text,
 reason text not null,
 details text not null default '',
 status text not null default 'OPEN' check(status in('OPEN','REVIEWED','CLOSED')),
 created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.room_solutions enable row level security;
alter table public.archive_records enable row level security;
alter table public.presence_sessions enable row level security;
alter table public.reports enable row level security;

-- Public archive: no login wall.
drop policy if exists archive_select_authenticated on public.archive_records;
drop policy if exists archive_select_public on public.archive_records;
create policy archive_select_public on public.archive_records for select using(true);

-- Public online count, but only short-lived timestamps are exposed.
drop policy if exists presence_select_public on public.presence_sessions;
create policy presence_select_public on public.presence_sessions for select using(true);
drop policy if exists presence_upsert_self on public.presence_sessions;
create policy presence_upsert_self on public.presence_sessions for insert with check(auth.uid()=user_id);
drop policy if exists presence_update_self on public.presence_sessions;
create policy presence_update_self on public.presence_sessions for update using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Notifications belong to the recipient.
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications for select using(auth.uid()=user_id);
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Solutions are visible only inside the private room.
drop policy if exists solutions_select_member on public.room_solutions;
create policy solutions_select_member on public.room_solutions for select using(exists(select 1 from public.room_members rm where rm.room_id=room_id and rm.user_id=auth.uid()));
drop policy if exists solutions_insert_solver on public.room_solutions;
create policy solutions_insert_solver on public.room_solutions for insert with check(auth.uid()=solver_id and exists(select 1 from public.rooms r where r.id=room_id and r.solver_id=auth.uid() and r.status='ACTIVE'));
drop policy if exists solutions_update_solver on public.room_solutions;
create policy solutions_update_solver on public.room_solutions for update using(auth.uid()=solver_id and exists(select 1 from public.rooms r where r.id=room_id and r.solver_id=auth.uid())) with check(auth.uid()=solver_id);

-- Reports: anyone authenticated can submit; only the reporter can read their own report in V1.
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports for insert with check(auth.uid()=reporter_id);
drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports for select using(auth.uid()=reporter_id);

-- Owner can accept/reject applications.
drop policy if exists applications_update_owner on public.post_applications;
create policy applications_update_owner on public.post_applications for update using(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid())) with check(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));

-- Trusted I CAN HELP notification.
create or replace function public.notify_help_application() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; post_title text;
begin
 select author_id,title into owner_id,post_title from public.posts where id=new.post_id;
 if owner_id is not null and owner_id<>new.applicant_id then
  insert into public.notifications(user_id,actor_id,type,title,message,post_id,connection_id)
  values(owner_id,new.applicant_id,'HELP_REQUEST','Someone wants to help you','Someone offered to help solve: '||post_title,new.post_id,new.id);
 end if; return new;
end; $$;
drop trigger if exists after_help_application on public.post_applications;
create trigger after_help_application after insert on public.post_applications for each row execute function public.notify_help_application();

-- Atomic accept: exactly one primary solver and one active room per post.
create or replace function public.accept_help_request(p_application_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.post_applications%rowtype; p public.posts%rowtype; r public.rooms%rowtype; result jsonb;
begin
 select * into a from public.post_applications where id=p_application_id for update;
 if not found then raise exception 'Help request not found'; end if;
 select * into p from public.posts where id=a.post_id for update;
 if p.author_id<>auth.uid() then raise exception 'Only the problem owner can accept help'; end if;
 if a.status<>'PENDING' then
   select * into r from public.rooms where post_id=p.id and status='ACTIVE' limit 1;
   if r.id is null then raise exception 'This request is no longer pending'; end if;
   return jsonb_build_object('room_id',r.id,'status','EXISTING');
 end if;
 select * into r from public.rooms where post_id=p.id and status='ACTIVE' for update;
 if r.id is null then
   update public.post_applications set status='ACCEPTED',responded_at=now() where id=a.id;
   insert into public.rooms(post_id,problem_owner_id,solver_id,title,category,status) values(p.id,p.author_id,a.applicant_id,p.title,p.category,'ACTIVE') returning * into r;
   insert into public.room_members(room_id,user_id,role) values(r.id,p.author_id,'OWNER'),(r.id,a.applicant_id,'SOLVER') on conflict do nothing;
   update public.post_applications set status='REJECTED',responded_at=now() where post_id=p.id and status='PENDING' and id<>a.id;
   update public.posts set status='IN_PROGRESS' where id=p.id;
 else
   raise exception 'Another solver is already connected';
 end if;
 return jsonb_build_object('room_id',r.id,'status','CREATED');
end; $$;
grant execute on function public.accept_help_request(uuid) to authenticated;

-- Room creation notification.
create or replace function public.notify_room_created() returns trigger language plpgsql security definer set search_path=public as $$
declare app_id uuid;
begin
 select id into app_id from public.post_applications where post_id=new.post_id and applicant_id=new.solver_id order by created_at desc limit 1;
 insert into public.notifications(user_id,actor_id,type,title,message,post_id,room_id,connection_id)
 values(new.solver_id,new.problem_owner_id,'CONNECTION_ACCEPTED','Solve Room is ready','The problem owner accepted your help. Your private Solve Room is ready.',new.post_id,new.id,app_id);
 return new;
end; $$;
drop trigger if exists after_room_created on public.rooms;
create trigger after_room_created after insert on public.rooms for each row execute function public.notify_room_created();

-- Outcome becomes the trusted source for archive/room/post state.
create or replace function public.process_problem_outcome() returns trigger language plpgsql security definer set search_path=public as $$
declare r public.rooms%rowtype; p public.posts%rowtype; sol text;
begin
 select * into r from public.rooms where id=new.room_id;
 if r.problem_owner_id<>new.decided_by then raise exception 'Only the problem owner can decide the outcome'; end if;
 select * into p from public.posts where id=r.post_id;
 select body into sol from public.room_solutions where room_id=r.id;
 update public.rooms set status=case when new.outcome='YES' then 'SOLVED' else 'UNRESOLVED' end,closed_at=now() where id=r.id;
 update public.posts set status=case when new.outcome='YES' then 'SOLVED' else 'UNRESOLVED' end where id=p.id;
 insert into public.archive_records(room_id,post_id,title,body,category,owner_id,solver_id,outcome,solution,summary,solved_at)
 values(r.id,p.id,p.title,p.body,p.category,r.problem_owner_id,r.solver_id,new.outcome,coalesce(nullif(new.solution,''),coalesce(sol,'')),coalesce(new.summary,''),now())
 on conflict(room_id) do update set outcome=excluded.outcome,solution=excluded.solution,summary=excluded.summary,solved_at=excluded.solved_at;
 insert into public.notifications(user_id,actor_id,type,title,message,post_id,room_id)
 values(r.solver_id,r.problem_owner_id,case when new.outcome='YES' then 'PROBLEM_SOLVED' else 'PROBLEM_UNRESOLVED' end,case when new.outcome='YES' then 'Problem solved' else 'Problem unresolved' end,case when new.outcome='YES' then 'The owner accepted your solution.' else 'The owner marked the discussion unresolved.' end,r.post_id,r.id);
 return new;
end; $$;
drop trigger if exists after_problem_outcome on public.problem_outcomes;
create trigger after_problem_outcome after insert on public.problem_outcomes for each row execute function public.process_problem_outcome();

-- Public archive may be viewed without login; ratings are public contribution metadata.
drop policy if exists ratings_select_participant on public.ratings;
create policy ratings_select_public on public.ratings for select using(true);

-- Realtime tables.
do $$ begin
 begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.room_solutions; exception when duplicate_object then null; end;
end $$;
