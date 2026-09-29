-- Denty Stage 10: canonical laboratory master, clinical lab-work lifecycle,
-- private attachments and supplier finance ledger.

begin;

create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  name text not null,
  tax_id text,
  phone text,
  email text,
  address text,
  default_turnaround_days integer not null default 7 check (default_turnaround_days between 0 and 365),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create table if not exists public.lab_works (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  laboratory_id uuid references public.laboratories(id) on delete restrict,
  clinical_plan_item_id uuid references public.clinical_plan_items(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  dental_entity_id uuid references public.dental_entities(id) on delete set null,
  site_id uuid references public.sites(id) on delete restrict,
  title text not null,
  category text,
  tooth_or_zone text,
  status text not null default 'PLANNED' check (status in ('PLANNED','IMPRESSION_TAKEN','SCANNED','SENT','IN_PRODUCTION','TRIAL','RECEIVED','PLACED','INCIDENT','CANCELLED')),
  notes text,
  sent_at timestamptz,
  eta_at timestamptz,
  received_at timestamptz,
  placed_at timestamptz,
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_work_status_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  lab_work_id uuid not null references public.lab_works(id) on delete restrict,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.lab_reworks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  parent_lab_work_id uuid not null references public.lab_works(id) on delete restrict,
  reason text not null,
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  eta_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.lab_attachments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  lab_work_id uuid not null references public.lab_works(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_path)
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  laboratory_id uuid not null references public.laboratories(id) on delete restrict,
  site_id uuid references public.sites(id) on delete restrict,
  invoice_number text not null,
  issued_at timestamptz not null,
  total_cents bigint not null check (total_cents >= 0),
  status text not null default 'OPEN' check (status in ('OPEN','PARTIALLY_PAID','PAID','VOID')),
  document_path text,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, laboratory_id, invoice_number)
);

create table if not exists public.supplier_invoice_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete restrict,
  lab_work_id uuid references public.lab_works(id) on delete restrict,
  category text not null default 'LABORATORY',
  product_code text,
  description text not null,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_cost_cents bigint not null check (unit_cost_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  laboratory_id uuid not null references public.laboratories(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null default 'BANK_TRANSFER' check (method in ('BANK_TRANSFER','CARD','CASH','DIRECT_DEBIT','OTHER')),
  paid_at timestamptz not null default now(),
  note text,
  idempotency_key text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clinic_id, idempotency_key)
);

create table if not exists public.supplier_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  supplier_payment_id uuid not null references public.supplier_payments(id) on delete restrict,
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (supplier_payment_id, supplier_invoice_id)
);

create index if not exists laboratories_clinic_active_idx on public.laboratories(clinic_id,active,name);
create index if not exists lab_works_clinic_status_idx on public.lab_works(clinic_id,status,eta_at);
create index if not exists lab_works_patient_idx on public.lab_works(patient_id,created_at desc);
create index if not exists lab_works_plan_item_idx on public.lab_works(clinical_plan_item_id) where clinical_plan_item_id is not null;
create index if not exists lab_work_status_events_work_idx on public.lab_work_status_events(lab_work_id,changed_at);
create index if not exists lab_attachments_work_idx on public.lab_attachments(lab_work_id,created_at);
create index if not exists supplier_invoices_lab_idx on public.supplier_invoices(clinic_id,laboratory_id,issued_at desc);
create index if not exists supplier_payments_lab_idx on public.supplier_payments(clinic_id,laboratory_id,paid_at desc);
create index if not exists supplier_allocations_invoice_idx on public.supplier_payment_allocations(supplier_invoice_id,created_at);

create or replace function private.has_lab_permission(target_clinic_id uuid,target_permission text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_member uuid; v_role text; v_override boolean;
begin
  select cm.id,cm.role into v_member,v_role from public.clinic_members cm
  where cm.clinic_id=target_clinic_id and cm.profile_id=(select auth.uid()) and cm.active limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override from public.user_permissions up
    where up.clinic_member_id=v_member and up.permission=target_permission limit 1;
  if found then return coalesce(v_override,false); end if;
  if v_role='ADMIN' then return true; end if;
  if target_permission='lab.read' then return v_role in ('RECEPTION','DENTIST','ASSISTANT'); end if;
  if target_permission='lab.write' then return v_role in ('RECEPTION','DENTIST','ASSISTANT'); end if;
  return false;
end $$;
revoke all on function private.has_lab_permission(uuid,text) from public,anon;
grant execute on function private.has_lab_permission(uuid,text) to authenticated;

alter table public.laboratories enable row level security;
alter table public.lab_works enable row level security;
alter table public.lab_work_status_events enable row level security;
alter table public.lab_reworks enable row level security;
alter table public.lab_attachments enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.supplier_invoice_items enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.supplier_payment_allocations enable row level security;

-- Exposed tables are read-only to authenticated clients; mutations go through RPCs.
revoke all on public.laboratories, public.lab_works, public.lab_work_status_events, public.lab_reworks, public.lab_attachments,
  public.supplier_invoices, public.supplier_invoice_items, public.supplier_payments, public.supplier_payment_allocations from anon;
revoke insert,update,delete on public.laboratories, public.lab_works, public.lab_work_status_events, public.lab_reworks, public.lab_attachments,
  public.supplier_invoices, public.supplier_invoice_items, public.supplier_payments, public.supplier_payment_allocations from authenticated;
grant select on public.laboratories, public.lab_works, public.lab_work_status_events, public.lab_reworks, public.lab_attachments,
  public.supplier_invoices, public.supplier_invoice_items, public.supplier_payments, public.supplier_payment_allocations to authenticated;

create policy laboratories_read on public.laboratories for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')));
create policy lab_works_read on public.lab_works for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')));
create policy lab_work_status_events_read on public.lab_work_status_events for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')));
create policy lab_reworks_read on public.lab_reworks for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')));
create policy lab_attachments_read on public.lab_attachments for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')));
create policy supplier_invoices_read on public.supplier_invoices for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')) and (select private.has_finance_permission(clinic_id,'finance.read')));
create policy supplier_invoice_items_read on public.supplier_invoice_items for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')) and (select private.has_finance_permission(clinic_id,'finance.read')));
create policy supplier_payments_read on public.supplier_payments for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')) and (select private.has_finance_permission(clinic_id,'finance.read')));
create policy supplier_payment_allocations_read on public.supplier_payment_allocations for select to authenticated using ((select private.has_lab_permission(clinic_id,'lab.read')) and (select private.has_finance_permission(clinic_id,'finance.read')));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('lab-attachments','lab-attachments',false,52428800,array[
  'application/pdf','image/jpeg','image/png','image/webp','application/zip','application/vnd.ms-pki.stl','model/stl','application/octet-stream'
])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Object path: <clinic_uuid>/<lab_work_uuid>/<immutable_file_name>.
drop policy if exists lab_attachments_storage_read on storage.objects;
create policy lab_attachments_storage_read on storage.objects for select to authenticated using (
  bucket_id='lab-attachments'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]),'lab.read')
  and exists (
    select 1 from public.lab_works lw
    where lw.id=private.uuid_from_text((storage.foldername(name))[2])
      and lw.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
  )
);
drop policy if exists lab_attachments_storage_insert on storage.objects;
create policy lab_attachments_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='lab-attachments'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]),'lab.write')
  and exists (
    select 1 from public.lab_works lw
    where lw.id=private.uuid_from_text((storage.foldername(name))[2])
      and lw.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
  )
);
drop policy if exists lab_attachments_storage_update on storage.objects;
drop policy if exists lab_attachments_storage_delete on storage.objects;
create policy lab_attachments_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='lab-attachments'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]),'lab.write')
  and not exists(select 1 from public.lab_attachments la where la.storage_path=name)
);

create or replace function private.validate_lab_work_references(
  p_clinic_id uuid,p_patient_id uuid,p_laboratory_id uuid,p_plan_item_id uuid,p_appointment_id uuid,p_dental_entity_id uuid,p_site_id uuid
) returns void language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'LAB_PATIENT_CLINIC_MISMATCH' using errcode='23514'; end if;
  if p_laboratory_id is not null and not exists(select 1 from public.laboratories l where l.id=p_laboratory_id and l.clinic_id=p_clinic_id and l.active) then raise exception 'LABORATORY_CLINIC_MISMATCH' using errcode='23514'; end if;
  if p_plan_item_id is not null and not exists(
    select 1
    from public.clinical_plan_items i
    join public.clinical_plans p on p.id=i.plan_id
    where i.id=p_plan_item_id
      and i.clinic_id=p_clinic_id
      and p.clinic_id=p_clinic_id
      and p.patient_id=p_patient_id
  ) then raise exception 'LAB_PLAN_ITEM_MISMATCH' using errcode='23514'; end if;
  if p_appointment_id is not null and not exists(select 1 from public.appointments a where a.id=p_appointment_id and a.clinic_id=p_clinic_id and a.patient_id=p_patient_id) then raise exception 'LAB_APPOINTMENT_MISMATCH' using errcode='23514'; end if;
  if p_dental_entity_id is not null and not exists(select 1 from public.dental_entities d where d.id=p_dental_entity_id and d.clinic_id=p_clinic_id and d.patient_id=p_patient_id) then raise exception 'LAB_DENTAL_ENTITY_MISMATCH' using errcode='23514'; end if;
  if p_site_id is not null and not exists(select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'LAB_SITE_MISMATCH' using errcode='23514'; end if;
end $$;
revoke all on function private.validate_lab_work_references(uuid,uuid,uuid,uuid,uuid,uuid,uuid) from public,anon;

create or replace function public.create_laboratory(
  p_clinic_id uuid,p_name text,p_tax_id text default null,p_phone text default null,p_email text default null,p_address text default null,p_default_turnaround_days integer default 7
) returns public.laboratories language plpgsql volatile security definer set search_path='' as $$
declare r public.laboratories%rowtype;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'LAB_NAME_REQUIRED' using errcode='22023'; end if;
  insert into public.laboratories(clinic_id,name,tax_id,phone,email,address,default_turnaround_days)
  values(p_clinic_id,btrim(p_name),nullif(btrim(p_tax_id),''),nullif(btrim(p_phone),''),nullif(btrim(p_email),''),nullif(btrim(p_address),''),coalesce(p_default_turnaround_days,7)) returning * into r;
  return r;
end $$;

create or replace function public.update_laboratory(
  p_laboratory_id uuid,p_expected_version integer,p_name text default null,p_tax_id text default null,p_phone text default null,p_email text default null,p_address text default null,p_default_turnaround_days integer default null,p_active boolean default null
) returns public.laboratories language plpgsql volatile security definer set search_path='' as $$
declare r public.laboratories%rowtype;
begin
  select * into r from public.laboratories where id=p_laboratory_id for update;
  if r.id is null then raise exception 'LABORATORY_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_lab_permission(r.clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.version<>p_expected_version then raise exception 'LABORATORY_VERSION_CONFLICT' using errcode='40001'; end if;
  update public.laboratories set
    name=coalesce(nullif(btrim(p_name),''),name),tax_id=case when p_tax_id is null then tax_id else nullif(btrim(p_tax_id),'') end,
    phone=case when p_phone is null then phone else nullif(btrim(p_phone),'') end,email=case when p_email is null then email else nullif(btrim(p_email),'') end,
    address=case when p_address is null then address else nullif(btrim(p_address),'') end,
    default_turnaround_days=coalesce(p_default_turnaround_days,default_turnaround_days),active=coalesce(p_active,active),version=version+1,updated_at=now()
  where id=p_laboratory_id returning * into r;
  return r;
end $$;

create or replace function public.create_lab_work(
  p_clinic_id uuid,p_patient_id uuid,p_title text,p_laboratory_id uuid default null,p_clinical_plan_item_id uuid default null,p_appointment_id uuid default null,p_dental_entity_id uuid default null,p_site_id uuid default null,p_category text default null,p_tooth_or_zone text default null,p_eta_at timestamptz default null,p_cost_cents bigint default 0,p_notes text default null
) returns public.lab_works language plpgsql volatile security definer set search_path='' as $$
declare r public.lab_works%rowtype;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform private.validate_lab_work_references(p_clinic_id,p_patient_id,p_laboratory_id,p_clinical_plan_item_id,p_appointment_id,p_dental_entity_id,p_site_id);
  if nullif(btrim(p_title),'') is null then raise exception 'LAB_WORK_TITLE_REQUIRED' using errcode='22023'; end if;
  insert into public.lab_works(clinic_id,patient_id,laboratory_id,clinical_plan_item_id,appointment_id,dental_entity_id,site_id,title,category,tooth_or_zone,eta_at,cost_cents,notes,created_by)
  values(p_clinic_id,p_patient_id,p_laboratory_id,p_clinical_plan_item_id,p_appointment_id,p_dental_entity_id,p_site_id,btrim(p_title),nullif(btrim(p_category),''),nullif(btrim(p_tooth_or_zone),''),p_eta_at,greatest(coalesce(p_cost_cents,0),0),nullif(btrim(p_notes),''),(select auth.uid())) returning * into r;
  insert into public.lab_work_status_events(clinic_id,lab_work_id,from_status,to_status,note,changed_by) values(r.clinic_id,r.id,null,'PLANNED','Trabajo creado',(select auth.uid()));
  return r;
end $$;

create or replace function private.lab_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable set search_path='' as $$
  select case p_from
    when 'PLANNED' then p_to in ('IMPRESSION_TAKEN','SCANNED','SENT','CANCELLED')
    when 'IMPRESSION_TAKEN' then p_to in ('SCANNED','SENT','CANCELLED')
    when 'SCANNED' then p_to in ('SENT','CANCELLED')
    when 'SENT' then p_to in ('IN_PRODUCTION','RECEIVED','INCIDENT','CANCELLED')
    when 'IN_PRODUCTION' then p_to in ('TRIAL','RECEIVED','INCIDENT','CANCELLED')
    when 'TRIAL' then p_to in ('IN_PRODUCTION','RECEIVED','INCIDENT','CANCELLED')
    when 'INCIDENT' then p_to in ('IN_PRODUCTION','RECEIVED','CANCELLED')
    when 'RECEIVED' then p_to in ('PLACED','INCIDENT')
    else false end
$$;

create or replace function public.transition_lab_work(p_lab_work_id uuid,p_expected_version integer,p_status text,p_note text default null)
returns public.lab_works language plpgsql volatile security definer set search_path='' as $$
declare r public.lab_works%rowtype; old_status text;
begin
  select * into r from public.lab_works where id=p_lab_work_id for update;
  if r.id is null then raise exception 'LAB_WORK_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_lab_permission(r.clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.version<>p_expected_version then raise exception 'LAB_WORK_VERSION_CONFLICT' using errcode='40001'; end if;
  if p_status=r.status then return r; end if;
  if not private.lab_transition_allowed(r.status,p_status) then raise exception 'INVALID_LAB_TRANSITION' using errcode='23514'; end if;
  old_status:=r.status;
  update public.lab_works set status=p_status,version=version+1,updated_at=now(),
    sent_at=case when p_status='SENT' then coalesce(sent_at,now()) else sent_at end,
    received_at=case when p_status='RECEIVED' then coalesce(received_at,now()) else received_at end,
    placed_at=case when p_status='PLACED' then coalesce(placed_at,now()) else placed_at end
  where id=p_lab_work_id returning * into r;
  insert into public.lab_work_status_events(clinic_id,lab_work_id,from_status,to_status,note,changed_by) values(r.clinic_id,r.id,old_status,p_status,nullif(btrim(p_note),''),(select auth.uid()));
  return r;
end $$;

create or replace function public.create_lab_rework(p_lab_work_id uuid,p_reason text,p_cost_cents bigint default 0,p_eta_at timestamptz default null)
returns public.lab_reworks language plpgsql volatile security definer set search_path='' as $$
declare w public.lab_works%rowtype; r public.lab_reworks%rowtype;
begin
  select * into w from public.lab_works where id=p_lab_work_id for update;
  if w.id is null then raise exception 'LAB_WORK_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_lab_permission(w.clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if w.status='CANCELLED' then raise exception 'LAB_WORK_CANCELLED' using errcode='23514'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'REWORK_REASON_REQUIRED' using errcode='22023'; end if;
  insert into public.lab_reworks(clinic_id,parent_lab_work_id,reason,cost_cents,eta_at,created_by)
  values(w.clinic_id,w.id,btrim(p_reason),greatest(coalesce(p_cost_cents,0),0),p_eta_at,(select auth.uid())) returning * into r;
  update public.lab_works set status='INCIDENT',eta_at=coalesce(p_eta_at,eta_at),cost_cents=cost_cents+greatest(coalesce(p_cost_cents,0),0),version=version+1,updated_at=now() where id=w.id;
  insert into public.lab_work_status_events(clinic_id,lab_work_id,from_status,to_status,note,changed_by) values(w.clinic_id,w.id,w.status,'INCIDENT','Repetición: '||btrim(p_reason),(select auth.uid()));
  return r;
end $$;

create or replace function public.register_lab_attachment(p_lab_work_id uuid,p_storage_path text,p_file_name text,p_mime_type text,p_size_bytes bigint,p_sha256 text)
returns public.lab_attachments language plpgsql volatile security definer set search_path='' as $$
declare w public.lab_works%rowtype; r public.lab_attachments%rowtype; expected_prefix text;
begin
  select * into w from public.lab_works where id=p_lab_work_id;
  if w.id is null then raise exception 'LAB_WORK_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_lab_permission(w.clinic_id,'lab.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  expected_prefix:=w.clinic_id::text||'/'||w.id::text||'/';
  if p_storage_path not like expected_prefix||'%' then raise exception 'INVALID_ATTACHMENT_PATH' using errcode='23514'; end if;
  insert into public.lab_attachments(clinic_id,lab_work_id,storage_path,file_name,mime_type,size_bytes,sha256,created_by)
  values(w.clinic_id,w.id,p_storage_path,p_file_name,p_mime_type,p_size_bytes,p_sha256,(select auth.uid())) returning * into r;
  return r;
end $$;

create or replace function public.record_supplier_invoice(
  p_clinic_id uuid,p_laboratory_id uuid,p_invoice_number text,p_issued_at timestamptz,p_total_cents bigint,p_site_id uuid default null,p_document_path text default null,p_items jsonb default '[]'::jsonb
) returns public.supplier_invoices language plpgsql volatile security definer set search_path='' as $$
declare r public.supplier_invoices%rowtype; item jsonb; item_sum bigint:=0; work_id uuid; line_total bigint;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.write') or not private.has_finance_permission(p_clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.laboratories l where l.id=p_laboratory_id and l.clinic_id=p_clinic_id) then raise exception 'LABORATORY_CLINIC_MISMATCH' using errcode='23514'; end if;
  if p_site_id is not null and not exists(select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'LAB_SITE_MISMATCH' using errcode='23514'; end if;
  if nullif(btrim(p_invoice_number),'') is null then raise exception 'SUPPLIER_INVOICE_NUMBER_REQUIRED' using errcode='22023'; end if;
  if p_total_cents<0 then raise exception 'INVALID_SUPPLIER_INVOICE_TOTAL' using errcode='22023'; end if;
  insert into public.supplier_invoices(clinic_id,laboratory_id,site_id,invoice_number,issued_at,total_cents,document_path,created_by)
  values(p_clinic_id,p_laboratory_id,p_site_id,btrim(p_invoice_number),p_issued_at,p_total_cents,nullif(btrim(p_document_path),''),(select auth.uid())) returning * into r;
  for item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    work_id:=nullif(item->>'labWorkId','')::uuid;
    if work_id is not null and not exists(select 1 from public.lab_works w where w.id=work_id and w.clinic_id=p_clinic_id and w.laboratory_id=p_laboratory_id) then raise exception 'SUPPLIER_ITEM_WORK_MISMATCH' using errcode='23514'; end if;
    line_total:=coalesce((item->>'totalCents')::bigint,round(coalesce((item->>'quantity')::numeric,1)*coalesce((item->>'unitCostCents')::bigint,0))::bigint);
    item_sum:=item_sum+line_total;
    insert into public.supplier_invoice_items(clinic_id,supplier_invoice_id,lab_work_id,category,product_code,description,quantity,unit_cost_cents,total_cents)
    values(p_clinic_id,r.id,work_id,coalesce(nullif(item->>'category',''),'LABORATORY'),nullif(item->>'productCode',''),coalesce(nullif(item->>'description',''),'Trabajo de laboratorio'),coalesce((item->>'quantity')::numeric,1),coalesce((item->>'unitCostCents')::bigint,0),line_total);
  end loop;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb))>0 and item_sum<>p_total_cents then raise exception 'SUPPLIER_INVOICE_ITEMS_TOTAL_MISMATCH' using errcode='23514'; end if;
  return r;
end $$;

create or replace function public.record_supplier_payment(
  p_clinic_id uuid,p_laboratory_id uuid,p_amount_cents bigint,p_method text,p_paid_at timestamptz,p_note text,p_idempotency_key text
) returns public.supplier_payments language plpgsql volatile security definer set search_path='' as $$
declare r public.supplier_payments%rowtype;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.write') or not private.has_finance_permission(p_clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.laboratories l where l.id=p_laboratory_id and l.clinic_id=p_clinic_id) then raise exception 'LABORATORY_CLINIC_MISMATCH' using errcode='23514'; end if;
  if p_amount_cents<=0 or nullif(btrim(p_idempotency_key),'') is null then raise exception 'INVALID_SUPPLIER_PAYMENT' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_clinic_id::text||':'||btrim(p_idempotency_key),0));
  select * into r from public.supplier_payments where clinic_id=p_clinic_id and idempotency_key=btrim(p_idempotency_key) for update;
  if r.id is not null then
    if r.laboratory_id<>p_laboratory_id or r.amount_cents<>p_amount_cents or r.method<>p_method then raise exception 'SUPPLIER_PAYMENT_IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
    return r;
  end if;
  insert into public.supplier_payments(clinic_id,laboratory_id,amount_cents,method,paid_at,note,idempotency_key,created_by)
  values(p_clinic_id,p_laboratory_id,p_amount_cents,p_method,coalesce(p_paid_at,now()),nullif(btrim(p_note),''),btrim(p_idempotency_key),(select auth.uid())) returning * into r;
  return r;
end $$;

create or replace function public.allocate_supplier_payment(p_supplier_payment_id uuid,p_supplier_invoice_id uuid,p_amount_cents bigint)
returns public.supplier_payment_allocations language plpgsql volatile security definer set search_path='' as $$
declare p public.supplier_payments%rowtype; i public.supplier_invoices%rowtype; r public.supplier_payment_allocations%rowtype; payment_alloc bigint; invoice_alloc bigint;
begin
  select * into p from public.supplier_payments where id=p_supplier_payment_id for update;
  select * into i from public.supplier_invoices where id=p_supplier_invoice_id for update;
  if p.id is null or i.id is null then raise exception 'SUPPLIER_LEDGER_ROW_NOT_FOUND' using errcode='P0002'; end if;
  if p.clinic_id<>i.clinic_id or p.laboratory_id<>i.laboratory_id then raise exception 'SUPPLIER_ALLOCATION_MISMATCH' using errcode='23514'; end if;
  if not private.has_lab_permission(p.clinic_id,'lab.write') or not private.has_finance_permission(p.clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(sum(amount_cents),0) into payment_alloc from public.supplier_payment_allocations where supplier_payment_id=p.id;
  select coalesce(sum(amount_cents),0) into invoice_alloc from public.supplier_payment_allocations where supplier_invoice_id=i.id;
  if p_amount_cents<=0 or payment_alloc+p_amount_cents>p.amount_cents or invoice_alloc+p_amount_cents>i.total_cents then raise exception 'SUPPLIER_ALLOCATION_EXCEEDS_BALANCE' using errcode='23514'; end if;
  insert into public.supplier_payment_allocations(clinic_id,supplier_payment_id,supplier_invoice_id,amount_cents)
  values(p.clinic_id,p.id,i.id,p_amount_cents) returning * into r;
  select coalesce(sum(amount_cents),0) into invoice_alloc from public.supplier_payment_allocations where supplier_invoice_id=i.id;
  update public.supplier_invoices set status=case when invoice_alloc>=total_cents then 'PAID' when invoice_alloc>0 then 'PARTIALLY_PAID' else 'OPEN' end,version=version+1,updated_at=now() where id=i.id;
  return r;
end $$;

create or replace function public.laboratory_balances(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare out_json jsonb;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.read') or not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'labId',l.id,'name',l.name,'active',l.active,'accruedCents',coalesce(charges.total,0),'paidCents',coalesce(paid.total,0),
    'outstandingCents',greatest(0,coalesce(charges.total,0)-coalesce(paid.total,0)),'workCount',coalesce(works.count,0)
  ) order by l.name),'[]'::jsonb) into out_json
  from public.laboratories l
  left join lateral (select sum(si.total_cents)::bigint total from public.supplier_invoices si where si.laboratory_id=l.id and si.status<>'VOID') charges on true
  left join lateral (select sum(spa.amount_cents)::bigint total from public.supplier_payment_allocations spa join public.supplier_payments sp on sp.id=spa.supplier_payment_id where sp.laboratory_id=l.id) paid on true
  left join lateral (select count(*)::bigint count from public.lab_works lw where lw.laboratory_id=l.id and lw.status<>'CANCELLED') works on true
  where l.clinic_id=p_clinic_id;
  return jsonb_build_object('items',out_json);
end $$;

-- Legacy analytics supplier routes now read the canonical lab/supplier ledger instead of inferring suppliers.
create or replace function public.analytics_suppliers(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_lab_permission(p_clinic_id,'lab.read') or not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return (select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'name',l.name,'label',l.name,'category','LABORATORY','count',coalesce(w.cnt,0),'costCents',coalesce(c.total,0)
  ) order by l.name),'[]'::jsonb))
  from public.laboratories l
  left join lateral(select count(*)::bigint cnt from public.lab_works lw where lw.laboratory_id=l.id and lw.status<>'CANCELLED') w on true
  left join lateral(select sum(si.total_cents)::bigint total from public.supplier_invoices si where si.laboratory_id=l.id and si.status<>'VOID') c on true
  where l.clinic_id=p_clinic_id);
end $$;

create or replace function public.analytics_purchases(p_clinic_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_site_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total bigint; count_rows bigint;
begin
  if not private.has_lab_permission(p_clinic_id,'lab.read') or not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_start is not null and p_end is not null and p_end<=p_start then raise exception 'INVALID_ANALYTICS_RANGE' using errcode='22023'; end if;
  select coalesce(sum(si.total_cents),0),count(*) into total,count_rows from public.supplier_invoices si
  where si.clinic_id=p_clinic_id and si.status<>'VOID' and (p_start is null or si.issued_at>=p_start) and (p_end is null or si.issued_at<p_end) and (p_site_id is null or si.site_id=p_site_id);
  return jsonb_build_object('kpiVersion','DENTY-KPI-1','costCents',total,'count',count_rows);
end $$;

-- Audit/update timestamps and Realtime for every new mutable table.
drop trigger if exists laboratories_set_updated_at on public.laboratories;
create trigger laboratories_set_updated_at before update on public.laboratories for each row execute function private.set_updated_at();
drop trigger if exists lab_works_set_updated_at on public.lab_works;
create trigger lab_works_set_updated_at before update on public.lab_works for each row execute function private.set_updated_at();
drop trigger if exists supplier_invoices_set_updated_at on public.supplier_invoices;
create trigger supplier_invoices_set_updated_at before update on public.supplier_invoices for each row execute function private.set_updated_at();

-- Tables with clinic_id did not exist when Stage 3 attached its triggers.
do $$ declare t text; begin
  foreach t in array array['laboratories','lab_works','lab_work_status_events','lab_reworks','lab_attachments','supplier_invoices','supplier_invoice_items','supplier_payments','supplier_payment_allocations'] loop
    execute format('drop trigger if exists denty_realtime_broadcast on public.%I',t);
    execute format('create trigger denty_realtime_broadcast after insert or update or delete on public.%I for each row execute function private.broadcast_denty_change()',t);
    execute format('drop trigger if exists %I_audit_mutation on public.%I',t,t);
    execute format('create trigger %I_audit_mutation after insert or update or delete on public.%I for each row execute function private.audit_sensitive_mutation()',t,t);
  end loop;
end $$;

-- Function permissions.
do $$ declare sig text; begin
  foreach sig in array array[
    'public.create_laboratory(uuid,text,text,text,text,text,integer)',
    'public.update_laboratory(uuid,integer,text,text,text,text,text,integer,boolean)',
    'public.create_lab_work(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,bigint,text)',
    'public.transition_lab_work(uuid,integer,text,text)',
    'public.create_lab_rework(uuid,text,bigint,timestamptz)',
    'public.register_lab_attachment(uuid,text,text,text,bigint,text)',
    'public.record_supplier_invoice(uuid,uuid,text,timestamptz,bigint,uuid,text,jsonb)',
    'public.record_supplier_payment(uuid,uuid,bigint,text,timestamptz,text,text)',
    'public.allocate_supplier_payment(uuid,uuid,bigint)',
    'public.laboratory_balances(uuid)',
    'public.analytics_suppliers(uuid)',
    'public.analytics_purchases(uuid,timestamptz,timestamptz,uuid)'
  ] loop
    execute 'revoke all on function '||sig||' from public,anon';
    execute 'grant execute on function '||sig||' to authenticated';
  end loop;
end $$;

commit;
