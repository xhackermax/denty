-- Stage 11C: persistent work items plus quick-action launcher destinations.
begin;
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete restrict,
  task_type text not null default 'GENERAL',
  title text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','DONE','CANCELLED')),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  assignee_staff_id uuid references public.staff_members(id) on delete set null,
  due_at timestamptz,
  source_type text,
  source_id text,
  created_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_clinic_status_due_idx on public.tasks(clinic_id,status,due_at);
create index if not exists tasks_assignee_idx on public.tasks(assignee_staff_id,status,due_at);
alter table public.tasks enable row level security;
revoke all on public.tasks from anon;
revoke insert,update,delete on public.tasks from authenticated;
grant select on public.tasks to authenticated;
create policy tasks_staff_read on public.tasks for select to authenticated using ((select private.is_clinic_staff(clinic_id)));

create or replace function public.create_task(p_clinic_id uuid,p_title text,p_description text default null,p_patient_id uuid default null,p_task_type text default 'GENERAL',p_priority text default 'NORMAL',p_assignee_staff_id uuid default null,p_due_at timestamptz default null,p_source_type text default null,p_source_id text default null)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_patient_id is not null and not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  insert into public.tasks(clinic_id,patient_id,task_type,title,description,priority,assignee_staff_id,due_at,source_type,source_id,created_by)
  values(p_clinic_id,p_patient_id,p_task_type,btrim(p_title),p_description,p_priority,p_assignee_staff_id,p_due_at,p_source_type,p_source_id,(select auth.uid())) returning * into r;
  return r;
end $$;

create or replace function public.update_task_status(p_task_id uuid,p_status text,p_expected_version integer default null,p_assignee_staff_id uuid default null,p_due_at timestamptz default null)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  select * into r from public.tasks where id=p_task_id for update;
  if r.id is null then raise exception 'TASK_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.is_clinic_staff(r.clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is not null and r.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=r.clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  update public.tasks set status=p_status,assignee_staff_id=coalesce(p_assignee_staff_id,assignee_staff_id),due_at=coalesce(p_due_at,due_at),completed_at=case when p_status='DONE' then now() else null end,version=version+1,updated_at=now() where id=p_task_id returning * into r;
  return r;
end $$;

revoke all on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text),public.update_task_status(uuid,text,integer,uuid,timestamptz) from public,anon;
grant execute on function public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text),public.update_task_status(uuid,text,integer,uuid,timestamptz) to authenticated;

drop trigger if exists tasks_audit_mutation on public.tasks;
create trigger tasks_audit_mutation after insert or update or delete on public.tasks for each row execute function private.audit_sensitive_mutation();
drop trigger if exists denty_realtime_broadcast on public.tasks;
create trigger denty_realtime_broadcast after insert or update or delete on public.tasks for each row execute function private.broadcast_denty_change();
commit;
