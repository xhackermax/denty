-- Denty Stage 12: persistent prescriptions, immutable signature evidence and patient-scoped access.
begin;

create or replace function private.stage12_has_prescription_permission(target_clinic_id uuid, target_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_member uuid;
  v_role text;
  v_override boolean;
begin
  select cm.id, cm.role into v_member, v_role
  from public.clinic_members cm
  where cm.clinic_id=target_clinic_id
    and cm.profile_id=(select auth.uid())
    and cm.active
  limit 1;
  if v_member is null then return false; end if;

  select up.allowed into v_override
  from public.user_permissions up
  where up.clinic_member_id=v_member and up.permission=target_permission
  limit 1;
  if found then return coalesce(v_override,false); end if;

  if v_role='ADMIN' then return true; end if;
  if v_role='RECEPTION' and target_permission in ('prescription.read','prescription.draft.write') then return true; end if;
  if v_role='DENTIST' and target_permission in ('prescription.read','prescription.draft.write','prescription.sign','prescription.cancel','prescription.audit.read') then return true; end if;
  if v_role='ASSISTANT' and target_permission='prescription.read' then return true; end if;
  return false;
end $$;
revoke all on function private.stage12_has_prescription_permission(uuid,text) from public,anon;
grant execute on function private.stage12_has_prescription_permission(uuid,text) to authenticated;

create table if not exists public.prescription_clinic_settings (
  clinic_id uuid primary key references public.clinics(id) on delete restrict,
  commercial_name text,
  legal_name text,
  tax_id text,
  address text,
  city text,
  province text,
  postal_code text,
  country text,
  phone text,
  email text,
  logo_storage_path text,
  provider_key text,
  external_clinic_id text,
  provider_enabled boolean not null default false,
  reception_can_draft boolean not null default true,
  version integer not null default 1 check (version>0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.prescription_prescribers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  staff_id uuid not null references public.staff_members(id) on delete restrict,
  display_name text not null,
  professional_qualification text,
  license_number text,
  specialty text,
  professional_phone text,
  professional_email text,
  professional_address text,
  provider_key text,
  external_prescriber_id text,
  enabled boolean not null default false,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique(clinic_id,staff_id)
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  prescriber_staff_id uuid references public.staff_members(id) on delete restrict,
  site_id uuid references public.sites(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','SIGNING','ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','FAILED','EXPIRED')),
  prescription_date date not null default current_date,
  patient_information text,
  patient_snapshot_json jsonb,
  prescriber_snapshot_json jsonb,
  provider_key text,
  provider_reference text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  version integer not null default 1 check (version>0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prescriptions_patient_idx on public.prescriptions(clinic_id,patient_id,created_at desc);
create index if not exists prescriptions_status_idx on public.prescriptions(clinic_id,status,created_at desc);

create table if not exists public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  prescription_id uuid not null references public.prescriptions(id) on delete restrict,
  line_no integer not null check (line_no>0),
  active_ingredient text,
  brand_name text,
  strength text not null,
  pharmaceutical_form text not null,
  route text,
  units_per_dose text not null,
  frequency text not null,
  duration text not null,
  start_date date,
  package_format text,
  package_count text,
  instructions text,
  internal_indication text,
  created_at timestamptz not null default now(),
  unique(prescription_id,line_no)
);

create table if not exists public.prescription_versions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  prescription_id uuid not null references public.prescriptions(id) on delete restrict,
  version integer not null check (version>0),
  status text not null,
  snapshot_json jsonb not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(prescription_id,version)
);

create table if not exists public.prescription_signatures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  prescription_id uuid not null references public.prescriptions(id) on delete restrict,
  prescription_version_id uuid not null references public.prescription_versions(id) on delete restrict,
  signer_name text not null,
  signer_profile_id uuid references public.profiles(id) on delete set null,
  signer_staff_id uuid references public.staff_members(id) on delete set null,
  storage_path text not null unique,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null check (mime_type in ('image/png','image/jpeg')),
  size_bytes bigint not null check (size_bytes>0),
  evidence_json jsonb not null default '{}'::jsonb,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(prescription_id,prescription_version_id)
);

create or replace function private.prevent_prescription_evidence_mutation()
returns trigger
language plpgsql
set search_path=''
as $$ begin raise exception 'PRESCRIPTION_EVIDENCE_IMMUTABLE' using errcode='55000'; end $$;

drop trigger if exists prescription_versions_immutable on public.prescription_versions;
create trigger prescription_versions_immutable before update or delete on public.prescription_versions
for each row execute function private.prevent_prescription_evidence_mutation();
drop trigger if exists prescription_signatures_immutable on public.prescription_signatures;
create trigger prescription_signatures_immutable before update or delete on public.prescription_signatures
for each row execute function private.prevent_prescription_evidence_mutation();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('prescription-evidence','prescription-evidence',false,5242880,array['image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists prescription_evidence_read on storage.objects;
create policy prescription_evidence_read on storage.objects for select to authenticated using (
  bucket_id='prescription-evidence'
  and exists(
    select 1 from public.prescription_signatures ps
    join public.prescriptions p on p.id=ps.prescription_id
    where ps.storage_path=name
      and (
        (select private.stage12_has_prescription_permission(ps.clinic_id,'prescription.read'))
        or ((select private.is_patient_owner(p.patient_id)) and p.status in ('ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','EXPIRED'))
      )
  )
);
drop policy if exists prescription_evidence_insert on storage.objects;
create policy prescription_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='prescription-evidence'
  and (select private.stage12_has_prescription_permission(private.uuid_from_text((storage.foldername(name))[1]),'prescription.sign'))
  and exists (
    select 1 from public.prescriptions p
    where p.id=private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
      and p.status='READY'
  )
);
-- Recorded evidence is immutable. A failed upload→RPC handoff may delete only an orphan
-- while its prescription is still READY and no signature row references the object.
drop policy if exists prescription_evidence_delete_orphan on storage.objects;
create policy prescription_evidence_delete_orphan on storage.objects for delete to authenticated using (
  bucket_id='prescription-evidence'
  and (select private.stage12_has_prescription_permission(private.uuid_from_text((storage.foldername(name))[1]),'prescription.sign'))
  and exists (
    select 1 from public.prescriptions p
    where p.id=private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
      and p.status='READY'
  )
  and not exists (
    select 1 from public.prescription_signatures ps
    where ps.storage_path=name
  )
);
-- No authenticated UPDATE policy exists.

alter table public.prescription_clinic_settings enable row level security;
alter table public.prescription_prescribers enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.prescription_versions enable row level security;
alter table public.prescription_signatures enable row level security;

revoke all on public.prescription_clinic_settings,public.prescription_prescribers,public.prescriptions,public.prescription_items,public.prescription_versions,public.prescription_signatures from anon;
revoke insert,update,delete on public.prescription_clinic_settings,public.prescription_prescribers,public.prescriptions,public.prescription_items,public.prescription_versions,public.prescription_signatures from authenticated;
grant select on public.prescription_clinic_settings,public.prescription_prescribers,public.prescriptions,public.prescription_items,public.prescription_versions,public.prescription_signatures to authenticated;

drop policy if exists prescription_settings_read on public.prescription_clinic_settings;
create policy prescription_settings_read on public.prescription_clinic_settings for select to authenticated using ((select private.stage12_has_prescription_permission(clinic_id,'prescription.read')));
drop policy if exists prescription_prescribers_read on public.prescription_prescribers;
create policy prescription_prescribers_read on public.prescription_prescribers for select to authenticated using ((select private.stage12_has_prescription_permission(clinic_id,'prescription.read')));
drop policy if exists prescriptions_read on public.prescriptions;
create policy prescriptions_read on public.prescriptions for select to authenticated using (
  (select private.stage12_has_prescription_permission(clinic_id,'prescription.read'))
  or ((select private.is_patient_owner(patient_id)) and status in ('ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','EXPIRED'))
);
drop policy if exists prescription_items_read on public.prescription_items;
create policy prescription_items_read on public.prescription_items for select to authenticated using (
  exists(select 1 from public.prescriptions p where p.id=prescription_id and ((select private.stage12_has_prescription_permission(p.clinic_id,'prescription.read')) or ((select private.is_patient_owner(p.patient_id)) and p.status in ('ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','EXPIRED'))))
);
drop policy if exists prescription_versions_read on public.prescription_versions;
create policy prescription_versions_read on public.prescription_versions for select to authenticated using (
  exists(select 1 from public.prescriptions p where p.id=prescription_id and ((select private.stage12_has_prescription_permission(p.clinic_id,'prescription.audit.read')) or ((select private.is_patient_owner(p.patient_id)) and p.status in ('ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','EXPIRED'))))
);
drop policy if exists prescription_signatures_read on public.prescription_signatures;
create policy prescription_signatures_read on public.prescription_signatures for select to authenticated using (
  exists(select 1 from public.prescriptions p where p.id=prescription_id and ((select private.stage12_has_prescription_permission(p.clinic_id,'prescription.read')) or ((select private.is_patient_owner(p.patient_id)) and p.status in ('ISSUED','DISPENSED_PARTIAL','DISPENSED','CANCELLED','EXPIRED'))))
);

create or replace function private.stage12_insert_prescription_items(p_clinic_id uuid,p_prescription_id uuid,p_items jsonb)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_item jsonb; v_line integer:=0;
begin
  delete from public.prescription_items where prescription_id=p_prescription_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_line:=v_line+1;
    insert into public.prescription_items(
      clinic_id,prescription_id,line_no,active_ingredient,brand_name,strength,pharmaceutical_form,route,
      units_per_dose,frequency,duration,start_date,package_format,package_count,instructions,internal_indication
    ) values (
      p_clinic_id,p_prescription_id,v_line,
      nullif(btrim(v_item->>'activeIngredient'),''),nullif(btrim(v_item->>'brandName'),''),
      btrim(v_item->>'strength'),btrim(v_item->>'pharmaceuticalForm'),nullif(btrim(v_item->>'route'),''),
      btrim(v_item->>'unitsPerDose'),btrim(v_item->>'frequency'),btrim(v_item->>'duration'),
      case when nullif(v_item->>'startDate','') is null then null else (v_item->>'startDate')::date end,
      nullif(btrim(v_item->>'packageFormat'),''),nullif(btrim(v_item->>'packageCount'),''),
      nullif(btrim(v_item->>'instructions'),''),nullif(btrim(v_item->>'internalIndication'),'')
    );
  end loop;
end $$;
revoke all on function private.stage12_insert_prescription_items(uuid,uuid,jsonb) from public,anon;

create or replace function public.create_prescription_draft(
  p_clinic_id uuid,p_patient_id uuid,p_prescriber_staff_id uuid,p_site_id uuid default null,
  p_prescription_date date default current_date,p_patient_information text default null,p_items jsonb default '[]'::jsonb
)
returns public.prescriptions
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.prescriptions%rowtype;
begin
  if not (select private.stage12_has_prescription_permission(p_clinic_id,'prescription.draft.write')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id and p.archived_at is null) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if not exists(select 1 from public.staff_members s where s.id=p_prescriber_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'PRESCRIBER_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_site_id is not null and not exists(select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'SITE_NOT_IN_CLINIC' using errcode='23514'; end if;
  insert into public.prescriptions(clinic_id,patient_id,prescriber_staff_id,site_id,prescription_date,patient_information,created_by)
  values(p_clinic_id,p_patient_id,p_prescriber_staff_id,p_site_id,coalesce(p_prescription_date,current_date),p_patient_information,(select auth.uid())) returning * into v_row;
  perform private.stage12_insert_prescription_items(p_clinic_id,v_row.id,p_items);
  return v_row;
end $$;

create or replace function public.update_prescription_draft(
  p_prescription_id uuid,p_expected_version integer,p_prescriber_staff_id uuid default null,p_site_id uuid default null,
  p_prescription_date date default null,p_patient_information text default null,p_items jsonb default null
)
returns public.prescriptions
language plpgsql
security definer
set search_path=''
as $$
declare v_old public.prescriptions%rowtype; v_row public.prescriptions%rowtype;
begin
  select * into v_old from public.prescriptions where id=p_prescription_id for update;
  if v_old.id is null then raise exception 'PRESCRIPTION_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage12_has_prescription_permission(v_old.clinic_id,'prescription.draft.write')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_old.status<>'DRAFT' then raise exception 'PRESCRIPTION_NOT_EDITABLE' using errcode='23514'; end if;
  if v_old.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_prescriber_staff_id is not null and not exists(select 1 from public.staff_members s where s.id=p_prescriber_staff_id and s.clinic_id=v_old.clinic_id and s.active) then raise exception 'PRESCRIBER_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_site_id is not null and not exists(select 1 from public.sites s where s.id=p_site_id and s.clinic_id=v_old.clinic_id) then raise exception 'SITE_NOT_IN_CLINIC' using errcode='23514'; end if;
  update public.prescriptions set
    prescriber_staff_id=coalesce(p_prescriber_staff_id,prescriber_staff_id),
    site_id=coalesce(p_site_id,site_id),
    prescription_date=coalesce(p_prescription_date,prescription_date),
    patient_information=coalesce(p_patient_information,patient_information),
    version=version+1,updated_at=now()
  where id=p_prescription_id returning * into v_row;
  if p_items is not null then perform private.stage12_insert_prescription_items(v_old.clinic_id,p_prescription_id,p_items); end if;
  return v_row;
end $$;

create or replace function public.validate_prescription(p_prescription_id uuid)
returns public.prescriptions
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.prescriptions%rowtype; v_patient jsonb; v_prescriber jsonb; v_items jsonb; v_snapshot jsonb; v_hash text;
begin
  select * into v_row from public.prescriptions where id=p_prescription_id for update;
  if v_row.id is null then raise exception 'PRESCRIPTION_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage12_has_prescription_permission(v_row.clinic_id,'prescription.sign')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_row.status<>'DRAFT' then raise exception 'PRESCRIPTION_NOT_DRAFT' using errcode='23514'; end if;
  if not exists(select 1 from public.prescription_items i where i.prescription_id=v_row.id) then raise exception 'PRESCRIPTION_ITEMS_REQUIRED' using errcode='23514'; end if;
  select jsonb_build_object('id',p.id,'firstName',p.first_name,'lastName',p.last_name,'dni',p.dni,'birthDate',p.birth_date,'recordNumber',p.record_number) into v_patient from public.patients p where p.id=v_row.patient_id;
  select jsonb_build_object('id',s.id,'displayName',coalesce(pp.display_name,s.display_name),'licenseNumber',pp.license_number,'qualification',pp.professional_qualification,'specialty',pp.specialty)
  into v_prescriber from public.staff_members s left join public.prescription_prescribers pp on pp.staff_id=s.id and pp.clinic_id=s.clinic_id where s.id=v_row.prescriber_staff_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'activeIngredient',i.active_ingredient,'brandName',i.brand_name,'strength',i.strength,'pharmaceuticalForm',i.pharmaceutical_form,
    'route',i.route,'unitsPerDose',i.units_per_dose,'frequency',i.frequency,'duration',i.duration,'startDate',i.start_date,
    'packageFormat',i.package_format,'packageCount',i.package_count,'instructions',i.instructions,'internalIndication',i.internal_indication
  ) order by i.line_no),'[]'::jsonb) into v_items from public.prescription_items i where i.prescription_id=v_row.id;
  v_snapshot:=jsonb_build_object('id',v_row.id,'patientId',v_row.patient_id,'prescriberStaffId',v_row.prescriber_staff_id,'prescriptionDate',v_row.prescription_date,'patientInformation',v_row.patient_information,'patient',v_patient,'prescriber',v_prescriber,'items',v_items,'version',v_row.version);
  v_hash:=encode(digest(convert_to(v_snapshot::text,'utf8'),'sha256'),'hex');
  insert into public.prescription_versions(clinic_id,prescription_id,version,status,snapshot_json,content_hash,created_by)
  values(v_row.clinic_id,v_row.id,v_row.version,'READY',v_snapshot,v_hash,(select auth.uid()))
  on conflict(prescription_id,version) do nothing;
  update public.prescriptions set status='READY',patient_snapshot_json=v_patient,prescriber_snapshot_json=v_prescriber,updated_at=now() where id=v_row.id returning * into v_row;
  return v_row;
end $$;

create or replace function public.record_prescription_signature(
  p_prescription_id uuid,p_signer_name text,p_storage_path text,p_checksum_sha256 text,p_mime_type text,p_size_bytes bigint,p_evidence_json jsonb default '{}'::jsonb
)
returns public.prescription_signatures
language plpgsql
security definer
set search_path=''
as $$
declare v_rx public.prescriptions%rowtype; v_version public.prescription_versions%rowtype; v_sig public.prescription_signatures%rowtype; v_staff uuid;
begin
  select * into v_rx from public.prescriptions where id=p_prescription_id for update;
  if v_rx.id is null then raise exception 'PRESCRIPTION_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage12_has_prescription_permission(v_rx.clinic_id,'prescription.sign')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_rx.status<>'READY' then raise exception 'PRESCRIPTION_NOT_READY' using errcode='23514'; end if;
  if nullif(btrim(p_signer_name),'') is null then raise exception 'SIGNER_REQUIRED' using errcode='22023'; end if;
  if p_checksum_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SIGNATURE_CHECKSUM' using errcode='22023'; end if;
  if p_storage_path not like v_rx.clinic_id::text||'/'||v_rx.id::text||'/%' then raise exception 'INVALID_SIGNATURE_PATH' using errcode='22023'; end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id='prescription-evidence' and o.name=p_storage_path
  ) then raise exception 'PRESCRIPTION_SIGNATURE_OBJECT_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_version from public.prescription_versions where prescription_id=v_rx.id and version=v_rx.version;
  if v_version.id is null then raise exception 'PRESCRIPTION_VERSION_NOT_VALIDATED' using errcode='23514'; end if;
  select sm.id into v_staff from public.staff_members sm where sm.clinic_id=v_rx.clinic_id and sm.profile_id=(select auth.uid()) and sm.active limit 1;
  if v_staff is null or v_staff<>v_rx.prescriber_staff_id then raise exception 'SIGNER_MUST_MATCH_PRESCRIBER' using errcode='42501'; end if;
  select * into v_sig from public.prescription_signatures where prescription_version_id=v_version.id limit 1;
  if v_sig.id is not null then
    if v_sig.checksum_sha256=p_checksum_sha256 then return v_sig; end if;
    raise exception 'PRESCRIPTION_ALREADY_SIGNED' using errcode='23505';
  end if;
  insert into public.prescription_signatures(clinic_id,prescription_id,prescription_version_id,signer_name,signer_profile_id,signer_staff_id,storage_path,checksum_sha256,mime_type,size_bytes,evidence_json)
  values(v_rx.clinic_id,v_rx.id,v_version.id,btrim(p_signer_name),(select auth.uid()),v_staff,p_storage_path,p_checksum_sha256,p_mime_type,p_size_bytes,coalesce(p_evidence_json,'{}'::jsonb))
  returning * into v_sig;
  update public.prescriptions set status='SIGNING',updated_at=now() where id=v_rx.id;
  return v_sig;
end $$;

create or replace function public.issue_prescription(p_prescription_id uuid)
returns public.prescriptions
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.prescriptions%rowtype;
begin
  select * into v_row from public.prescriptions where id=p_prescription_id for update;
  if v_row.id is null then raise exception 'PRESCRIPTION_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage12_has_prescription_permission(v_row.clinic_id,'prescription.sign')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_row.status<>'SIGNING' then raise exception 'PRESCRIPTION_NOT_SIGNED' using errcode='23514'; end if;
  if not exists(select 1 from public.prescription_signatures s join public.prescription_versions v on v.id=s.prescription_version_id where s.prescription_id=v_row.id and v.version=v_row.version and s.signer_staff_id=v_row.prescriber_staff_id) then raise exception 'PRESCRIPTION_SIGNATURE_REQUIRED' using errcode='23514'; end if;
  update public.prescriptions set status='ISSUED',issued_at=now(),updated_at=now() where id=v_row.id returning * into v_row;
  return v_row;
end $$;

create or replace function public.cancel_prescription(p_prescription_id uuid,p_reason text)
returns public.prescriptions
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.prescriptions%rowtype;
begin
  select * into v_row from public.prescriptions where id=p_prescription_id for update;
  if v_row.id is null then raise exception 'PRESCRIPTION_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage12_has_prescription_permission(v_row.clinic_id,'prescription.cancel')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_row.status='CANCELLED' then return v_row; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'CANCEL_REASON_REQUIRED' using errcode='22023'; end if;
  update public.prescriptions set status='CANCELLED',cancelled_at=now(),cancel_reason=btrim(p_reason),updated_at=now() where id=v_row.id returning * into v_row;
  return v_row;
end $$;

create or replace function public.update_prescription_clinic_settings(p_clinic_id uuid,p_payload jsonb)
returns public.prescription_clinic_settings
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.prescription_clinic_settings%rowtype;
begin
  if not (select private.stage12_has_prescription_permission(p_clinic_id,'prescription.settings.write')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.prescription_clinic_settings(clinic_id,commercial_name,legal_name,tax_id,address,city,province,postal_code,country,phone,email,provider_key,external_clinic_id,provider_enabled,reception_can_draft,updated_by)
  values(p_clinic_id,nullif(p_payload->>'commercialName',''),nullif(p_payload->>'legalName',''),nullif(p_payload->>'taxId',''),nullif(p_payload->>'address',''),nullif(p_payload->>'city',''),nullif(p_payload->>'province',''),nullif(p_payload->>'postalCode',''),nullif(p_payload->>'country',''),nullif(p_payload->>'phone',''),nullif(p_payload->>'email',''),nullif(p_payload->>'providerKey',''),nullif(p_payload->>'externalClinicId',''),coalesce((p_payload->>'providerEnabled')::boolean,false),coalesce((p_payload->>'receptionCanDraft')::boolean,true),(select auth.uid()))
  on conflict(clinic_id) do update set commercial_name=excluded.commercial_name,legal_name=excluded.legal_name,tax_id=excluded.tax_id,address=excluded.address,city=excluded.city,province=excluded.province,postal_code=excluded.postal_code,country=excluded.country,phone=excluded.phone,email=excluded.email,provider_key=excluded.provider_key,external_clinic_id=excluded.external_clinic_id,provider_enabled=excluded.provider_enabled,reception_can_draft=excluded.reception_can_draft,version=public.prescription_clinic_settings.version+1,updated_at=now(),updated_by=(select auth.uid())
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.update_prescription_prescriber(p_clinic_id uuid,p_staff_id uuid,p_payload jsonb)
returns public.prescription_prescribers
language plpgsql
security definer
set search_path=''
as $$
declare v_staff public.staff_members%rowtype; v_row public.prescription_prescribers%rowtype;
begin
  if not (select private.stage12_has_prescription_permission(p_clinic_id,'prescription.settings.write')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_staff from public.staff_members where id=p_staff_id and clinic_id=p_clinic_id;
  if v_staff.id is null then raise exception 'STAFF_NOT_IN_CLINIC' using errcode='23514'; end if;
  insert into public.prescription_prescribers(clinic_id,staff_id,display_name,professional_qualification,license_number,specialty,professional_phone,professional_email,professional_address,provider_key,external_prescriber_id,enabled,updated_by)
  values(p_clinic_id,p_staff_id,coalesce(nullif(p_payload->>'displayName',''),v_staff.display_name),nullif(p_payload->>'professionalQualification',''),nullif(p_payload->>'licenseNumber',''),nullif(p_payload->>'specialty',''),nullif(p_payload->>'professionalPhone',''),nullif(p_payload->>'professionalEmail',''),nullif(p_payload->>'professionalAddress',''),nullif(p_payload->>'providerKey',''),nullif(p_payload->>'externalPrescriberId',''),coalesce((p_payload->>'enabled')::boolean,false),(select auth.uid()))
  on conflict(clinic_id,staff_id) do update set display_name=excluded.display_name,professional_qualification=excluded.professional_qualification,license_number=excluded.license_number,specialty=excluded.specialty,professional_phone=excluded.professional_phone,professional_email=excluded.professional_email,professional_address=excluded.professional_address,provider_key=excluded.provider_key,external_prescriber_id=excluded.external_prescriber_id,enabled=excluded.enabled,version=public.prescription_prescribers.version+1,updated_at=now(),updated_by=(select auth.uid())
  returning * into v_row;
  return v_row;
end $$;

revoke all on function public.create_prescription_draft(uuid,uuid,uuid,uuid,date,text,jsonb) from public,anon;
revoke all on function public.update_prescription_draft(uuid,integer,uuid,uuid,date,text,jsonb) from public,anon;
revoke all on function public.validate_prescription(uuid) from public,anon;
revoke all on function public.record_prescription_signature(uuid,text,text,text,text,bigint,jsonb) from public,anon;
revoke all on function public.issue_prescription(uuid) from public,anon;
revoke all on function public.cancel_prescription(uuid,text) from public,anon;
revoke all on function public.update_prescription_clinic_settings(uuid,jsonb) from public,anon;
revoke all on function public.update_prescription_prescriber(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_prescription_draft(uuid,uuid,uuid,uuid,date,text,jsonb),public.update_prescription_draft(uuid,integer,uuid,uuid,date,text,jsonb),public.validate_prescription(uuid),public.record_prescription_signature(uuid,text,text,text,text,bigint,jsonb),public.issue_prescription(uuid),public.cancel_prescription(uuid,text),public.update_prescription_clinic_settings(uuid,jsonb),public.update_prescription_prescriber(uuid,uuid,jsonb) to authenticated;

do $$ declare t text; begin
  foreach t in array array['prescription_clinic_settings','prescription_prescribers','prescriptions','prescription_items','prescription_versions','prescription_signatures'] loop
    execute format('drop trigger if exists %I_audit_mutation on public.%I',t,t);
    execute format('create trigger %I_audit_mutation after insert or update or delete on public.%I for each row execute function private.audit_sensitive_mutation()',t,t);
    execute format('drop trigger if exists denty_realtime_broadcast on public.%I',t);
    execute format('create trigger denty_realtime_broadcast after insert or update or delete on public.%I for each row execute function private.broadcast_denty_change()',t);
  end loop;
end $$;

commit;
