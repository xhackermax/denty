-- Sequential, reorderable and archivable tasks (agenda-style timeline).
begin;

alter table public.tasks add column if not exists position integer;
alter table public.tasks add column if not exists duration_min integer not null default 15;
alter table public.tasks add column if not exists archived_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='tasks_duration_min_check' and conrelid='public.tasks'::regclass) then
    alter table public.tasks add constraint tasks_duration_min_check check (duration_min between 1 and 1440);
  end if;
end $$;

-- Backfill only rows that have no position yet, so re-running never reshuffles user ordering.
with ranked as (
  select id,
    coalesce((select max(m.position) from public.tasks m where m.clinic_id=t.clinic_id),0)
    + row_number() over (
      partition by t.clinic_id
      order by case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'NORMAL' then 2 else 3 end, t.created_at, t.id
    ) as pos
  from public.tasks t
  where t.position is null
)
update public.tasks t set position=ranked.pos from ranked where t.id=ranked.id;

alter table public.tasks alter column position set not null;

create index if not exists tasks_clinic_archived_position_idx on public.tasks(clinic_id,archived_at,position);

-- create_task gains p_duration_min; drop the old signature so PostgREST never sees an ambiguous overload.
drop function if exists public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text);
create or replace function public.create_task(p_clinic_id uuid,p_title text,p_description text default null,p_patient_id uuid default null,p_task_type text default 'GENERAL',p_priority text default 'NORMAL',p_assignee_staff_id uuid default null,p_due_at timestamptz default null,p_source_type text default null,p_source_id text default null,p_duration_min integer default null)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_patient_id is not null and not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tasks_position:'||p_clinic_id::text,0));
  insert into public.tasks(clinic_id,patient_id,task_type,title,description,priority,assignee_staff_id,due_at,source_type,source_id,created_by,duration_min,position)
  values(p_clinic_id,p_patient_id,p_task_type,btrim(p_title),p_description,p_priority,p_assignee_staff_id,p_due_at,p_source_type,p_source_id,(select auth.uid()),coalesce(p_duration_min,15),
    (select coalesce(max(t.position),0)+1 from public.tasks t where t.clinic_id=p_clinic_id)) returning * into r;
  return r;
end $$;

create or replace function public.update_task(p_task_id uuid,p_status text default null,p_title text default null,p_priority text default null,p_duration_min integer default null,p_due_at timestamptz default null,p_clear_due_at boolean default false,p_archived boolean default null,p_expected_version integer default null,p_assignee_staff_id uuid default null)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  select * into r from public.tasks where id=p_task_id for update;
  if r.id is null then raise exception 'TASK_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.is_clinic_staff(r.clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is not null and r.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=r.clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_title is not null and btrim(p_title)='' then raise exception 'INVALID_TITLE' using errcode='23514'; end if;
  update public.tasks set
    status=coalesce(p_status,status),
    title=coalesce(btrim(p_title),title),
    priority=coalesce(p_priority,priority),
    duration_min=coalesce(p_duration_min,duration_min),
    due_at=case when p_clear_due_at then null else coalesce(p_due_at,due_at) end,
    assignee_staff_id=coalesce(p_assignee_staff_id,assignee_staff_id),
    completed_at=case when p_status is null then completed_at when p_status='DONE' then coalesce(completed_at,now()) else null end,
    archived_at=case when p_archived is null then archived_at when p_archived then coalesce(archived_at,now()) else null end,
    version=version+1,updated_at=now()
  where id=p_task_id returning * into r;
  return r;
end $$;

-- Returns the clinic's non-archived tasks, already reordered. Listed ids get 1..n; unlisted active tasks follow after n.
create or replace function public.reorder_tasks(p_clinic_id uuid,p_ordered_ids uuid[])
returns setof public.tasks language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  n:=coalesce(array_length(p_ordered_ids,1),0);
  if n=0 or n>500 then raise exception 'INVALID_ORDERED_IDS' using errcode='23514'; end if;
  if (select count(distinct x) from unnest(p_ordered_ids) x)<>n then raise exception 'DUPLICATE_TASK_IDS' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tasks_position:'||p_clinic_id::text,0));
  perform 1 from public.tasks t where t.clinic_id=p_clinic_id and t.id=any(p_ordered_ids) order by t.id for update;
  if (select count(*) from public.tasks t where t.clinic_id=p_clinic_id and t.id=any(p_ordered_ids))<>n then raise exception 'TASK_NOT_IN_CLINIC' using errcode='23514'; end if;
  update public.tasks t set position=o.ord,version=t.version+1,updated_at=now()
    from unnest(p_ordered_ids) with ordinality as o(id,ord)
    where t.id=o.id and t.clinic_id=p_clinic_id;
  update public.tasks t set position=n+s.rn,updated_at=now()
    from (select id,row_number() over (order by position,created_at,id) rn from public.tasks
          where clinic_id=p_clinic_id and archived_at is null and id<>all(p_ordered_ids)) s
    where t.id=s.id;
  return query select * from public.tasks t where t.clinic_id=p_clinic_id and t.archived_at is null order by t.position,t.created_at;
end $$;

revoke all on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer),public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid),public.reorder_tasks(uuid,uuid[]) from public,anon;
grant execute on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer),public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid),public.reorder_tasks(uuid,uuid[]) to authenticated;

commit;
