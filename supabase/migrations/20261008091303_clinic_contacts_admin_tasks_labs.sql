-- Clinic contacts: ADMIN-only writes with optional links to labs and tasks.
-- Staff retain read access. New parameters are optional for existing clients.
begin;

alter table public.clinic_contacts
  add column if not exists laboratory_id uuid references public.laboratories(id) on delete set null;
create index if not exists clinic_contacts_laboratory_idx on public.clinic_contacts(laboratory_id);

alter table public.tasks
  add column if not exists contact_id uuid references public.clinic_contacts(id) on delete set null;
create index if not exists tasks_contact_idx on public.tasks(contact_id);

create or replace function private.clinic_contacts_require_manage(p_clinic_id uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if not (select private.is_clinic_staff(p_clinic_id))
     or not (select private.stage11_has_permission(p_clinic_id, 'contacts.manage')) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
end $$;

create or replace function private.clinic_contacts_check_laboratory(p_clinic_id uuid, p_laboratory_id uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if p_laboratory_id is not null and not exists(
    select 1 from public.laboratories l where l.id = p_laboratory_id and l.clinic_id = p_clinic_id
  ) then
    raise exception 'LABORATORY_NOT_IN_CLINIC' using errcode='23514';
  end if;
end $$;

drop function if exists public.create_clinic_contact(uuid,text,text,jsonb,jsonb,text,text);
create or replace function public.create_clinic_contact(
  p_clinic_id uuid,
  p_name text,
  p_category text,
  p_phones jsonb default null,
  p_emails jsonb default null,
  p_notes text default null,
  p_hours text default null,
  p_laboratory_id uuid default null
) returns public.clinic_contacts language plpgsql security definer set search_path='' as $$
declare r public.clinic_contacts%rowtype;
begin
  perform private.clinic_contacts_require_manage(p_clinic_id);
  if coalesce(btrim(p_name),'') = '' then raise exception 'INVALID_NAME' using errcode='23514'; end if;
  if coalesce(btrim(p_category),'') = '' then raise exception 'INVALID_CATEGORY' using errcode='23514'; end if;
  perform private.clinic_contacts_check_laboratory(p_clinic_id, p_laboratory_id);
  insert into public.clinic_contacts(clinic_id, name, category, phones, emails, notes, hours, created_by, laboratory_id)
  values (
    p_clinic_id, btrim(p_name), btrim(p_category),
    coalesce(p_phones, '[]'::jsonb), coalesce(p_emails, '[]'::jsonb),
    nullif(btrim(p_notes),''), nullif(btrim(p_hours),''),
    (select auth.uid()), p_laboratory_id
  ) returning * into r;
  return r;
end $$;

drop function if exists public.update_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,integer);
create or replace function public.update_clinic_contact(
  p_contact_id uuid,
  p_name text default null,
  p_category text default null,
  p_phones jsonb default null,
  p_emails jsonb default null,
  p_notes text default null,
  p_hours text default null,
  p_expected_version integer default null,
  p_laboratory_id uuid default null,
  p_clear_laboratory boolean default false
) returns public.clinic_contacts language plpgsql security definer set search_path='' as $$
declare r public.clinic_contacts%rowtype;
begin
  select * into r from public.clinic_contacts where id = p_contact_id for update;
  if r.id is null then raise exception 'CONTACT_NOT_FOUND' using errcode='P0002'; end if;
  perform private.clinic_contacts_require_manage(r.clinic_id);
  if p_expected_version is not null and r.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode='PT409';
  end if;
  if p_name is not null and btrim(p_name) = '' then raise exception 'INVALID_NAME' using errcode='23514'; end if;
  if p_category is not null and btrim(p_category) = '' then raise exception 'INVALID_CATEGORY' using errcode='23514'; end if;
  perform private.clinic_contacts_check_laboratory(r.clinic_id, p_laboratory_id);
  update public.clinic_contacts set
    name = coalesce(btrim(p_name), name),
    category = coalesce(btrim(p_category), category),
    phones = coalesce(p_phones, phones),
    emails = coalesce(p_emails, emails),
    notes = case when p_notes is null then notes else nullif(btrim(p_notes),'') end,
    hours = case when p_hours is null then hours else nullif(btrim(p_hours),'') end,
    laboratory_id = case when p_clear_laboratory then null else coalesce(p_laboratory_id, laboratory_id) end,
    version = version + 1,
    updated_at = now()
  where id = p_contact_id
  returning * into r;
  return r;
end $$;

create or replace function public.delete_clinic_contact(p_contact_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_clinic_id uuid;
begin
  select clinic_id into v_clinic_id from public.clinic_contacts where id = p_contact_id;
  if v_clinic_id is null then raise exception 'CONTACT_NOT_FOUND' using errcode='P0002'; end if;
  perform private.clinic_contacts_require_manage(v_clinic_id);
  delete from public.clinic_contacts where id = p_contact_id;
  return true;
end $$;

-- Replace the old task RPC signatures to avoid ambiguous PostgREST overloads.
drop function if exists public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer,date);
create or replace function public.create_task(
  p_clinic_id uuid, p_title text, p_description text default null, p_patient_id uuid default null,
  p_task_type text default 'GENERAL', p_priority text default 'NORMAL',
  p_assignee_staff_id uuid default null, p_due_at timestamptz default null,
  p_source_type text default null, p_source_id text default null,
  p_duration_min integer default null, p_scheduled_on date default null,
  p_contact_id uuid default null
)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_patient_id is not null and not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_contact_id is not null and not exists(select 1 from public.clinic_contacts c where c.id=p_contact_id and c.clinic_id=p_clinic_id) then raise exception 'CONTACT_NOT_IN_CLINIC' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tasks_position:'||p_clinic_id::text,0));
  insert into public.tasks(clinic_id,patient_id,task_type,title,description,priority,assignee_staff_id,due_at,source_type,source_id,created_by,duration_min,position,scheduled_on,contact_id)
  values (p_clinic_id,p_patient_id,p_task_type,btrim(p_title),p_description,p_priority,p_assignee_staff_id,p_due_at,p_source_type,p_source_id,(select auth.uid()),coalesce(p_duration_min,15),
    (select coalesce(max(t.position),0)+1 from public.tasks t where t.clinic_id=p_clinic_id),p_scheduled_on,p_contact_id) returning * into r;
  return r;
end $$;

drop function if exists public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid,date,boolean);
create or replace function public.update_task(
  p_task_id uuid, p_status text default null, p_title text default null,
  p_priority text default null, p_duration_min integer default null,
  p_due_at timestamptz default null, p_clear_due_at boolean default false,
  p_archived boolean default null, p_expected_version integer default null,
  p_assignee_staff_id uuid default null, p_scheduled_on date default null,
  p_clear_scheduled_on boolean default false, p_contact_id uuid default null,
  p_clear_contact boolean default false
)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare r public.tasks%rowtype;
begin
  select * into r from public.tasks where id=p_task_id for update;
  if r.id is null then raise exception 'TASK_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.is_clinic_staff(r.clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is not null and r.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
  if p_assignee_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_assignee_staff_id and s.clinic_id=r.clinic_id and s.active) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_contact_id is not null and not exists(select 1 from public.clinic_contacts c where c.id=p_contact_id and c.clinic_id=r.clinic_id) then raise exception 'CONTACT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_title is not null and btrim(p_title)='' then raise exception 'INVALID_TITLE' using errcode='23514'; end if;
  update public.tasks set
    status=coalesce(p_status,status),
    title=coalesce(btrim(p_title),title),
    priority=coalesce(p_priority,priority),
    duration_min=coalesce(p_duration_min,duration_min),
    due_at=case when p_clear_due_at then null else coalesce(p_due_at,due_at) end,
    scheduled_on=case when p_clear_scheduled_on then null else coalesce(p_scheduled_on,scheduled_on) end,
    contact_id=case when p_clear_contact then null else coalesce(p_contact_id,contact_id) end,
    assignee_staff_id=coalesce(p_assignee_staff_id,assignee_staff_id),
    completed_at=case when p_status is null then completed_at when p_status='DONE' then coalesce(completed_at,now()) else null end,
    archived_at=case when p_archived is null then archived_at when p_archived then coalesce(archived_at,now()) else null end,
    version=version+1,updated_at=now()
  where id=p_task_id returning * into r;
  return r;
end $$;

revoke all on function
  private.clinic_contacts_require_manage(uuid),
  private.clinic_contacts_check_laboratory(uuid,uuid),
  public.create_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,uuid),
  public.update_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,integer,uuid,boolean),
  public.delete_clinic_contact(uuid),
  public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer,date,uuid),
  public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid,date,boolean,uuid,boolean)
from public, anon;
grant execute on function
  private.clinic_contacts_require_manage(uuid),
  private.clinic_contacts_check_laboratory(uuid,uuid),
  public.create_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,uuid),
  public.update_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,integer,uuid,boolean),
  public.delete_clinic_contact(uuid),
  public.create_task(uuid,text,text,uuid,text,text,uuid,timestamptz,text,text,integer,date,uuid),
  public.update_task(uuid,text,text,text,integer,timestamptz,boolean,boolean,integer,uuid,date,boolean,uuid,boolean)
to authenticated;

drop trigger if exists denty_realtime_broadcast on public.clinic_contacts;
create trigger denty_realtime_broadcast after insert or update or delete on public.clinic_contacts
  for each row execute function private.broadcast_denty_change();

commit;
notify pgrst, 'reload schema';
