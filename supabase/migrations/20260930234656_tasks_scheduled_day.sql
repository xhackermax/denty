-- Day-based agenda: a task may be scheduled on a calendar day (no time), independent of an optional fixed due_at.
-- Effective day of a task = scheduled_on, else the Europe/Madrid date of due_at, else null (Bandeja / inbox).
begin;

alter table public.tasks add column if not exists scheduled_on date;

-- Only rows that have a due_at and no day yet; re-running never overwrites user choices.
update public.tasks set scheduled_on=(due_at at time zone 'Europe/Madrid')::date
  where scheduled_on is null and due_at is not null;

create index if not exists tasks_clinic_scheduled_on_idx on public.tasks(clinic_id,scheduled_on);

-- New params are appended with defaults; drop the old signatures so PostgREST never sees ambiguous overloads.
drop function if exists public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer);
create or replace function public.create_task(p_clinic_id uuid,p_title text,p_description text default null,p_patient_id uuid default null,p_task_type text default 'GENERAL',p_priority text default 'NORMAL',p_assignee_staff_id uuid default null,p_due_at timestamptz default null,p_source_type text default null,p_source_id text default null,p_duration_min integer default null,p_scheduled_on date default null)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_patient_id is not null and not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tasks_position:'||p_clinic_id::text,0));
  insert into public.tasks(clinic_id,patient_id,task_type,title,description,priority,assignee_staff_id,due_at,source_type,source_id,created_by,duration_min,position,scheduled_on)
  values(p_clinic_id,p_patient_id,p_task_type,btrim(p_title),p_description,p_priority,p_assignee_staff_id,p_due_at,p_source_type,p_source_id,(select auth.uid()),coalesce(p_duration_min,15),
    (select coalesce(max(t.position),0)+1 from public.tasks t where t.clinic_id=p_clinic_id),p_scheduled_on) returning * into r;
  return r;
end $$;

drop function if exists public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid);
create or replace function public.update_task(p_task_id uuid,p_status text default null,p_title text default null,p_priority text default null,p_duration_min integer default null,p_due_at timestamptz default null,p_clear_due_at boolean default false,p_archived boolean default null,p_expected_version integer default null,p_assignee_staff_id uuid default null,p_scheduled_on date default null,p_clear_scheduled_on boolean default false)
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
    scheduled_on=case when p_clear_scheduled_on then null else coalesce(p_scheduled_on,scheduled_on) end,
    assignee_staff_id=coalesce(p_assignee_staff_id,assignee_staff_id),
    completed_at=case when p_status is null then completed_at when p_status='DONE' then coalesce(completed_at,now()) else null end,
    archived_at=case when p_archived is null then archived_at when p_archived then coalesce(archived_at,now()) else null end,
    version=version+1,updated_at=now()
  where id=p_task_id returning * into r;
  return r;
end $$;

revoke all on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer,date),public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid,date,boolean) from public,anon;
grant execute on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer,date),public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid,date,boolean) to authenticated;

commit;
