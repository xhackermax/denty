begin;

-- Stage 8: canonical invoice ledger, idempotent provider payments and tamper-evident fiscal chain.
create table if not exists public.invoice_series (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  code text not null,
  name text not null,
  prefix text not null,
  next_number bigint not null default 1 check (next_number > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code),
  unique (clinic_id, prefix)
);

create table if not exists public.billing_settings (
  clinic_id uuid primary key references public.clinics(id) on delete restrict,
  fiscal_mode text not null default 'NO_VERIFACTU' check (fiscal_mode in ('VERIFACTU','NO_VERIFACTU')),
  default_due_days integer not null default 0 check (default_due_days between 0 and 365),
  auto_submit_verifactu boolean not null default false,
  fiscal_tax_id text,
  fiscal_legal_name text,
  fiscal_address text,
  verifactu_environment text not null default 'test' check (verifactu_environment in ('test','production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  budget_id uuid references public.budgets(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  series_id uuid not null references public.invoice_series(id) on delete restrict,
  original_invoice_id uuid references public.invoices(id) on delete restrict,
  type text not null default 'STANDARD' check (type in ('STANDARD','SIMPLIFIED','RECTIFYING')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ISSUED','RECTIFIED')),
  customer_name text not null,
  customer_tax_id text,
  customer_address text,
  issuer_tax_id text,
  issuer_legal_name text,
  issuer_address text,
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  sequence_number bigint,
  full_number text,
  issued_at timestamptz,
  due_at timestamptz,
  rectification_reason text,
  aeat_rectification_type text check (aeat_rectification_type is null or aeat_rectification_type in ('R1','R2','R3','R4','R5')),
  created_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, full_number),
  check ((status='DRAFT' and full_number is null and issued_at is null) or (status<>'DRAFT' and full_number is not null and issued_at is not null))
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  clinical_plan_item_id uuid references public.clinical_plan_items(id) on delete set null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents bigint not null,
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  exemption_code text,
  line_subtotal_cents bigint not null,
  tax_cents bigint not null,
  total_cents bigint not null,
  created_at timestamptz not null default now()
);

alter table public.payment_allocations add column if not exists invoice_id uuid;
do $$ begin
  alter table public.payment_allocations add constraint payment_allocations_invoice_fk foreign key (invoice_id) references public.invoices(id) on delete restrict;
exception when duplicate_object then null; end $$;

alter table public.payment_attempts add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.payment_attempts add column if not exists payment_method text check (payment_method is null or payment_method in ('CASH','CARD','TRANSFER','FINANCING','OTHER'));

alter table public.fiscal_records add column if not exists fiscal_mode text check (fiscal_mode is null or fiscal_mode in ('VERIFACTU','NO_VERIFACTU'));
alter table public.fiscal_records add column if not exists hash_algorithm text not null default 'SHA-256';
alter table public.fiscal_records add column if not exists schema_version text not null default 'DENTY-RRSIF-1';
alter table public.fiscal_records add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table public.fiscal_records add constraint fiscal_records_invoice_fk foreign key (invoice_id) references public.invoices(id) on delete restrict;
exception when duplicate_object then null; end $$;

create index if not exists invoices_clinic_issued_idx on public.invoices(clinic_id,issued_at desc) where issued_at is not null;
create index if not exists invoices_patient_idx on public.invoices(patient_id,created_at desc);
create index if not exists invoice_lines_invoice_idx on public.invoice_lines(invoice_id,created_at);
create index if not exists payment_allocations_invoice_idx on public.payment_allocations(invoice_id,created_at);
create index if not exists payment_attempts_invoice_idx on public.payment_attempts(invoice_id,created_at desc);
create index if not exists fiscal_records_invoice_idx on public.fiscal_records(invoice_id,created_at desc);

create or replace function private.has_finance_permission(target_clinic_id uuid,target_permission text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_member uuid; v_role text; v_override boolean;
begin
  select cm.id,cm.role into v_member,v_role from public.clinic_members cm
  where cm.clinic_id=target_clinic_id and cm.profile_id=(select auth.uid()) and cm.active limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override from public.user_permissions up where up.clinic_member_id=v_member and up.permission=target_permission limit 1;
  if found then return coalesce(v_override,false); end if;
  if v_role='ADMIN' then return true; end if;
  return target_permission in ('finance.read','finance.write') and v_role in ('RECEPTION','DENTIST');
end $$;
revoke all on function private.has_finance_permission(uuid,text) from public,anon;
grant execute on function private.has_finance_permission(uuid,text) to authenticated;

alter table public.invoice_series enable row level security;
alter table public.billing_settings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

drop policy if exists invoice_series_stage8_read on public.invoice_series;
create policy invoice_series_stage8_read on public.invoice_series for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')));
drop policy if exists billing_settings_stage8_read on public.billing_settings;
create policy billing_settings_stage8_read on public.billing_settings for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')) or (select private.has_finance_permission(clinic_id,'billing.settings.manage')));
drop policy if exists invoices_stage8_read on public.invoices;
create policy invoices_stage8_read on public.invoices for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')) or ((select private.can_access_patient(clinic_id,patient_id)) and not (select private.is_clinic_staff(clinic_id))));
drop policy if exists invoice_lines_stage8_read on public.invoice_lines;
create policy invoice_lines_stage8_read on public.invoice_lines for select to authenticated using (exists(select 1 from public.invoices i where i.id=invoice_id and ((select private.has_finance_permission(i.clinic_id,'finance.read')) or ((select private.can_access_patient(i.clinic_id,i.patient_id)) and not (select private.is_clinic_staff(i.clinic_id))))));

-- Replace broad pre-Stage-8 finance policies.
drop policy if exists payments_access on public.payments;
drop policy if exists payments_staff_insert on public.payments;
drop policy if exists payments_staff_update on public.payments;
create policy payments_access on public.payments for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')) or ((select private.can_access_patient(clinic_id,patient_id)) and not (select private.is_clinic_staff(clinic_id))));

drop policy if exists payment_allocations_access on public.payment_allocations;
drop policy if exists payment_allocations_staff_insert on public.payment_allocations;
drop policy if exists payment_allocations_staff_update on public.payment_allocations;
drop policy if exists "staff manage payment allocations" on public.payment_allocations;
create policy payment_allocations_finance_read on public.payment_allocations for select to authenticated using (exists(select 1 from public.payments p where p.id=payment_id and ((select private.has_finance_permission(p.clinic_id,'finance.read')) or ((select private.can_access_patient(p.clinic_id,p.patient_id)) and not (select private.is_clinic_staff(p.clinic_id))))));

drop policy if exists payment_attempts_clinic on public.payment_attempts;
drop policy if exists payment_attempts_staff_select on public.payment_attempts;
drop policy if exists payment_attempts_staff_insert on public.payment_attempts;
drop policy if exists payment_attempts_staff_update on public.payment_attempts;
create policy payment_attempts_finance_read on public.payment_attempts for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')));

drop policy if exists fiscal_records_clinic on public.fiscal_records;
drop policy if exists fiscal_records_staff_select on public.fiscal_records;
drop policy if exists fiscal_records_staff_insert on public.fiscal_records;
drop policy if exists fiscal_records_staff_update on public.fiscal_records;
create policy fiscal_records_finance_read on public.fiscal_records for select to authenticated using ((select private.has_finance_permission(clinic_id,'finance.read')));

revoke insert,update,delete on public.invoice_series,public.billing_settings,public.invoices,public.invoice_lines,public.payments,public.payment_allocations,public.payment_attempts,public.fiscal_records from authenticated;
grant select on public.invoice_series,public.billing_settings,public.invoices,public.invoice_lines to authenticated;

-- Audit and immutable issued/fiscal data.
do $$ begin
  create trigger invoice_series_set_updated_at before update on public.invoice_series for each row execute function private.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger billing_settings_set_updated_at before update on public.billing_settings for each row execute function private.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger invoices_set_updated_at before update on public.invoices for each row execute function private.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ declare t text; begin
  foreach t in array array['invoice_series','billing_settings','invoices','invoice_lines'] loop
    execute format('drop trigger if exists stage8_audit on public.%I',t);
    execute format('create trigger stage8_audit after insert or update or delete on public.%I for each row execute function private.audit_sensitive_mutation()',t);
  end loop;
end $$;

create or replace function private.prevent_fiscal_record_mutation() returns trigger language plpgsql security invoker set search_path='' as $$ begin raise exception 'FISCAL_RECORD_IMMUTABLE' using errcode='55000'; end $$;
drop trigger if exists fiscal_records_immutable on public.fiscal_records;
create trigger fiscal_records_immutable before update or delete on public.fiscal_records for each row execute function private.prevent_fiscal_record_mutation();

create or replace function private.prevent_issued_invoice_mutation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.status<>'DRAFT' then
    if old.status='ISSUED' and new.status='RECTIFIED' and (to_jsonb(new)-'status'-'updated_at'-'version')=(to_jsonb(old)-'status'-'updated_at'-'version') then return new; end if;
    raise exception 'ISSUED_INVOICE_IMMUTABLE' using errcode='55000';
  end if;
  return new;
end $$;
drop trigger if exists invoices_issued_immutable on public.invoices;
create trigger invoices_issued_immutable before update on public.invoices for each row execute function private.prevent_issued_invoice_mutation();

create or replace function private.prevent_issued_invoice_line_mutation() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_status text;
begin
  v_id:=case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
  select status into v_status from public.invoices where id=v_id;
  if v_status is distinct from 'DRAFT' then raise exception 'ISSUED_INVOICE_LINES_IMMUTABLE' using errcode='55000'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists invoice_lines_issued_immutable on public.invoice_lines;
create trigger invoice_lines_issued_immutable before insert or update or delete on public.invoice_lines for each row execute function private.prevent_issued_invoice_line_mutation();

create or replace function private.invoice_json(p_invoice_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select to_jsonb(i)||jsonb_build_object('lines',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at,l.id) from public.invoice_lines l where l.invoice_id=i.id),'[]'::jsonb)) from public.invoices i where i.id=p_invoice_id
$$;
revoke all on function private.invoice_json(uuid) from public,anon,authenticated;

create or replace function private.insert_invoice_lines(p_invoice_id uuid,p_clinic_id uuid,p_patient_id uuid,p_lines jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r jsonb; q integer; u bigint; rate integer; base bigint; tax bigint; plan_item uuid;
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'INVOICE_LINES_REQUIRED' using errcode='22023'; end if;
  for r in select * from jsonb_array_elements(p_lines) loop
    q:=coalesce((r->>'quantity')::integer,1); u:=(r->>'unitPriceCents')::bigint; rate:=coalesce((r->>'taxRateBps')::integer,0); plan_item:=nullif(r->>'clinicalPlanItemId','')::uuid;
    if q<=0 or rate<0 or rate>10000 or nullif(btrim(r->>'description'),'') is null then raise exception 'INVALID_INVOICE_LINE' using errcode='22023'; end if;
    if plan_item is not null and not exists(select 1 from public.clinical_plan_items cpi join public.clinical_plans cp on cp.id=cpi.plan_id where cpi.id=plan_item and cpi.clinic_id=p_clinic_id and cp.patient_id=p_patient_id) then raise exception 'PLAN_ITEM_PATIENT_MISMATCH' using errcode='23514'; end if;
    base:=u*q; tax:=round((base::numeric*rate::numeric)/10000)::bigint;
    insert into public.invoice_lines(clinic_id,invoice_id,clinical_plan_item_id,description,quantity,unit_price_cents,tax_rate_bps,exemption_code,line_subtotal_cents,tax_cents,total_cents)
    values(p_clinic_id,p_invoice_id,plan_item,btrim(r->>'description'),q,u,rate,nullif(btrim(r->>'exemptionCode'),''),base,tax,base+tax);
  end loop;
  update public.invoices i set subtotal_cents=x.b,tax_cents=x.t,total_cents=x.total,version=i.version+1 from (select coalesce(sum(line_subtotal_cents),0)::bigint b,coalesce(sum(tax_cents),0)::bigint t,coalesce(sum(total_cents),0)::bigint total from public.invoice_lines where invoice_id=p_invoice_id) x where i.id=p_invoice_id;
end $$;
revoke all on function private.insert_invoice_lines(uuid,uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function private.create_fiscal_record_for_invoice(p_invoice_id uuid,p_record_type text default 'alta') returns public.fiscal_records language plpgsql security definer set search_path='' as $$
declare i public.invoices%rowtype; s public.billing_settings%rowtype; prev text; payload jsonb; h text; r public.fiscal_records%rowtype;
begin
  select * into i from public.invoices where id=p_invoice_id;
  if i.id is null or i.status='DRAFT' then raise exception 'INVOICE_NOT_ISSUED' using errcode='23514'; end if;
  -- One clinic-wide lock keeps the hash chain linear even when several invoice series issue concurrently.
  perform pg_advisory_xact_lock(hashtextextended(i.clinic_id::text,0));
  select * into s from public.billing_settings where clinic_id=i.clinic_id;
  if s.clinic_id is null then raise exception 'BILLING_SETTINGS_REQUIRED' using errcode='23514'; end if;
  select record_hash into prev from public.fiscal_records where clinic_id=i.clinic_id order by created_at desc,id desc limit 1;
  payload:=jsonb_build_object('recordType',p_record_type,'invoiceId',i.id,'fullNumber',i.full_number,'issuedAt',i.issued_at,'invoiceType',i.type,'customerName',i.customer_name,'customerTaxId',i.customer_tax_id,'subtotalCents',i.subtotal_cents,'taxCents',i.tax_cents,'totalCents',i.total_cents,'issuerTaxId',i.issuer_tax_id,'issuerLegalName',i.issuer_legal_name,'issuerAddress',i.issuer_address,'fiscalMode',s.fiscal_mode);
  h:=encode(digest(coalesce(prev,'')||'|'||payload::text,'sha256'),'hex');
  insert into public.fiscal_records(clinic_id,invoice_id,record_type,payload,previous_hash,record_hash,provider_status,fiscal_mode,hash_algorithm,schema_version)
  values(i.clinic_id,i.id,p_record_type,payload,prev,h,case when s.fiscal_mode='VERIFACTU' then 'pending' else 'local' end,s.fiscal_mode,'SHA-256','DENTY-RRSIF-1') returning * into r;
  if s.fiscal_mode='VERIFACTU' and s.auto_submit_verifactu then
    insert into public.integration_events(clinic_id,scope,external_event_id,idempotency_key,payload,status) values(i.clinic_id,'verifactu',r.id::text,'verifactu:'||r.id::text,jsonb_build_object('fiscalRecordId',r.id,'invoiceId',i.id),'pending') on conflict(clinic_id,idempotency_key) do nothing;
  end if;
  return r;
end $$;
revoke all on function private.create_fiscal_record_for_invoice(uuid,text) from public,anon,authenticated;

create or replace function public.create_invoice_series(p_clinic_id uuid,p_code text,p_name text,p_prefix text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.invoice_series%rowtype; pref text;
begin
  if not private.has_finance_permission(p_clinic_id,'billing.settings.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  pref:=coalesce(nullif(btrim(p_prefix),''),upper(btrim(p_code))||'-');
  insert into public.invoice_series(clinic_id,code,name,prefix) values(p_clinic_id,upper(btrim(p_code)),btrim(p_name),pref) returning * into r; return to_jsonb(r);
end $$;

create or replace function public.update_billing_settings(p_clinic_id uuid,p_fiscal_mode text,p_default_due_days integer,p_auto_submit_verifactu boolean,p_fiscal_tax_id text default null,p_fiscal_legal_name text default null,p_fiscal_address text default null,p_verifactu_environment text default 'test') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.billing_settings%rowtype;
begin
  if not private.has_finance_permission(p_clinic_id,'billing.settings.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_fiscal_mode not in ('VERIFACTU','NO_VERIFACTU') or p_default_due_days not between 0 and 365 or p_verifactu_environment not in ('test','production') then raise exception 'INVALID_BILLING_SETTINGS' using errcode='22023'; end if;
  if p_fiscal_mode='VERIFACTU' and (nullif(btrim(p_fiscal_tax_id),'') is null or nullif(btrim(p_fiscal_legal_name),'') is null) then raise exception 'FISCAL_IDENTITY_REQUIRED' using errcode='23514'; end if;
  insert into public.billing_settings(clinic_id,fiscal_mode,default_due_days,auto_submit_verifactu,fiscal_tax_id,fiscal_legal_name,fiscal_address,verifactu_environment)
  values(p_clinic_id,p_fiscal_mode,p_default_due_days,p_auto_submit_verifactu,nullif(btrim(p_fiscal_tax_id),''),nullif(btrim(p_fiscal_legal_name),''),nullif(btrim(p_fiscal_address),''),p_verifactu_environment)
  on conflict(clinic_id) do update set fiscal_mode=excluded.fiscal_mode,default_due_days=excluded.default_due_days,auto_submit_verifactu=excluded.auto_submit_verifactu,fiscal_tax_id=excluded.fiscal_tax_id,fiscal_legal_name=excluded.fiscal_legal_name,fiscal_address=excluded.fiscal_address,verifactu_environment=excluded.verifactu_environment,updated_at=now() returning * into r; return to_jsonb(r);
end $$;

create or replace function public.create_invoice_draft(p_patient_id uuid,p_budget_id uuid,p_appointment_id uuid,p_series_id uuid,p_type text,p_customer_name text,p_customer_tax_id text,p_customer_address text,p_lines jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; r public.invoices%rowtype;
begin
  select clinic_id into c from public.patients where id=p_patient_id;
  if c is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(c,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.invoice_series where id=p_series_id and clinic_id=c and active) then raise exception 'INVOICE_SERIES_NOT_FOUND' using errcode='P0002'; end if;
  if p_budget_id is not null and not exists(select 1 from public.budgets where id=p_budget_id and clinic_id=c and patient_id=p_patient_id) then raise exception 'BUDGET_PATIENT_MISMATCH' using errcode='23514'; end if;
  if p_appointment_id is not null and not exists(select 1 from public.appointments where id=p_appointment_id and clinic_id=c and patient_id=p_patient_id) then raise exception 'APPOINTMENT_PATIENT_MISMATCH' using errcode='23514'; end if;
  insert into public.invoices(clinic_id,patient_id,budget_id,appointment_id,series_id,type,customer_name,customer_tax_id,customer_address,created_by) values(c,p_patient_id,p_budget_id,p_appointment_id,p_series_id,p_type,btrim(p_customer_name),nullif(btrim(p_customer_tax_id),''),nullif(btrim(p_customer_address),''),(select auth.uid())) returning * into r;
  perform private.insert_invoice_lines(r.id,c,p_patient_id,p_lines); return private.invoice_json(r.id);
end $$;

create or replace function public.create_invoice_from_budget(p_budget_id uuid,p_series_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.budgets%rowtype; p public.patients%rowtype; lines jsonb;
begin
  select * into b from public.budgets where id=p_budget_id;
  if b.id is null then raise exception 'BUDGET_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(b.clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if b.status<>'SIGNED' then raise exception 'BUDGET_NOT_SIGNED' using errcode='23514'; end if;
  select * into p from public.patients where id=b.patient_id;
  select jsonb_agg(jsonb_build_object('description',bi.description,'quantity',bi.quantity,'unitPriceCents',bi.unit_price_cents,'taxRateBps',0,'clinicalPlanItemId',bi.clinical_plan_item_id) order by bi.created_at,bi.id) into lines from public.budget_items bi where bi.budget_id=b.id and bi.billing_mode<>'no_charge';
  return public.create_invoice_draft(b.patient_id,b.id,null,p_series_id,'STANDARD',btrim(p.first_name||' '||p.last_name),p.dni,null,coalesce(lines,'[]'::jsonb));
end $$;

create or replace function public.issue_invoice(p_invoice_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.invoices%rowtype; ser public.invoice_series%rowtype; setg public.billing_settings%rowtype; n bigint;
begin
  select * into i from public.invoices where id=p_invoice_id for update;
  if i.id is null then raise exception 'INVOICE_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(i.clinic_id,'billing.issue') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if i.status<>'DRAFT' then return private.invoice_json(i.id); end if;
  select * into setg from public.billing_settings where clinic_id=i.clinic_id for update;
  if setg.clinic_id is null or nullif(btrim(setg.fiscal_tax_id),'') is null or nullif(btrim(setg.fiscal_legal_name),'') is null then raise exception 'FISCAL_IDENTITY_REQUIRED' using errcode='23514'; end if;
  select * into ser from public.invoice_series where id=i.series_id and clinic_id=i.clinic_id and active for update;
  if ser.id is null then raise exception 'INVOICE_SERIES_NOT_FOUND' using errcode='P0002'; end if;
  n:=ser.next_number; update public.invoice_series set next_number=next_number+1 where id=ser.id;
  update public.invoices set status='ISSUED',sequence_number=n,full_number=ser.prefix||lpad(n::text,6,'0'),issued_at=now(),due_at=now()+make_interval(days=>setg.default_due_days),issuer_tax_id=setg.fiscal_tax_id,issuer_legal_name=setg.fiscal_legal_name,issuer_address=setg.fiscal_address,version=version+1 where id=i.id;
  perform private.create_fiscal_record_for_invoice(i.id,'alta'); return private.invoice_json(i.id);
end $$;

create or replace function public.rectify_invoice(p_invoice_id uuid,p_reason text,p_lines jsonb default null,p_aeat_rectification_type text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.invoices%rowtype; n public.invoices%rowtype; lines jsonb;
begin
  select * into o from public.invoices where id=p_invoice_id for update;
  if o.id is null then raise exception 'INVOICE_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(o.clinic_id,'billing.issue') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if o.status<>'ISSUED' then raise exception 'INVOICE_NOT_RECTIFIABLE' using errcode='23514'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'RECTIFICATION_REASON_REQUIRED' using errcode='22023'; end if;
  if p_aeat_rectification_type is not null and p_aeat_rectification_type not in ('R1','R2','R3','R4','R5') then raise exception 'INVALID_RECTIFICATION_TYPE' using errcode='22023'; end if;
  if p_lines is null then select jsonb_agg(jsonb_build_object('description','Rectificación: '||description,'quantity',quantity,'unitPriceCents',-unit_price_cents,'taxRateBps',tax_rate_bps,'exemptionCode',exemption_code,'clinicalPlanItemId',clinical_plan_item_id) order by created_at,id) into lines from public.invoice_lines where invoice_id=o.id; else lines:=p_lines; end if;
  insert into public.invoices(clinic_id,patient_id,budget_id,appointment_id,series_id,original_invoice_id,type,status,customer_name,customer_tax_id,customer_address,rectification_reason,aeat_rectification_type,created_by) values(o.clinic_id,o.patient_id,o.budget_id,o.appointment_id,o.series_id,o.id,'RECTIFYING','DRAFT',o.customer_name,o.customer_tax_id,o.customer_address,btrim(p_reason),p_aeat_rectification_type,(select auth.uid())) returning * into n;
  perform private.insert_invoice_lines(n.id,o.clinic_id,o.patient_id,lines); perform public.issue_invoice(n.id); update public.invoices set status='RECTIFIED',version=version+1 where id=o.id; return private.invoice_json(n.id);
end $$;

create or replace function public.allocate_payment_to_invoice(p_payment_id uuid,p_invoice_id uuid,p_amount_cents bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.payments%rowtype; i public.invoices%rowtype; invoice_paid bigint; payment_allocated bigint; r public.payment_allocations%rowtype;
begin
  select * into p from public.payments where id=p_payment_id for update; select * into i from public.invoices where id=p_invoice_id for update;
  if p.id is null or i.id is null then raise exception 'PAYMENT_OR_INVOICE_NOT_FOUND' using errcode='P0002'; end if;
  if p.clinic_id<>i.clinic_id or p.patient_id is distinct from i.patient_id then raise exception 'PAYMENT_INVOICE_MISMATCH' using errcode='23514'; end if;
  if not private.has_finance_permission(p.clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(sum(pa.amount_cents),0) into invoice_paid from public.payment_allocations pa where pa.invoice_id=i.id;
  if invoice_paid+p_amount_cents>i.total_cents then raise exception 'PAYMENT_EXCEEDS_INVOICE_BALANCE' using errcode='23514'; end if;
  select coalesce(sum(pa.amount_cents),0) into payment_allocated from public.payment_allocations pa where pa.payment_id=p.id;
  if payment_allocated+p_amount_cents>p.amount_cents then raise exception 'PAYMENT_ALLOCATION_EXCEEDS_PAYMENT' using errcode='23514'; end if;
  insert into public.payment_allocations(payment_id,invoice_id,budget_id,amount_cents) values(p.id,i.id,i.budget_id,p_amount_cents) returning * into r; return to_jsonb(r);
end $$;

create or replace function public.record_invoice_payment(p_patient_id uuid,p_invoice_id uuid,p_budget_id uuid,p_amount_cents integer,p_method text,p_provider text default null,p_provider_transaction_id text default null,p_idempotency_key text default null,p_reference text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; p public.payments%rowtype; e public.payments%rowtype;
begin
  select clinic_id into c from public.patients where id=p_patient_id; if c is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(c,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_amount_cents<=0 or p_method not in ('CASH','CARD','TRANSFER','FINANCING','OTHER') then raise exception 'INVALID_PAYMENT' using errcode='22023'; end if;
  if p_invoice_id is not null and not exists(select 1 from public.invoices where id=p_invoice_id and clinic_id=c and patient_id=p_patient_id and status<>'DRAFT') then raise exception 'INVOICE_PATIENT_MISMATCH' using errcode='23514'; end if;
  if p_budget_id is not null and not exists(select 1 from public.budgets where id=p_budget_id and clinic_id=c and patient_id=p_patient_id) then raise exception 'BUDGET_PATIENT_MISMATCH' using errcode='23514'; end if;
  if p_idempotency_key is not null then select * into e from public.payments where clinic_id=c and idempotency_key=p_idempotency_key limit 1; if e.id is not null then if e.patient_id<>p_patient_id or e.amount_cents<>p_amount_cents or e.method<>p_method or e.budget_id is distinct from p_budget_id or (p_invoice_id is not null and not exists(select 1 from public.payment_allocations where payment_id=e.id and invoice_id=p_invoice_id)) then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23514'; end if; return to_jsonb(e); end if; end if;
  insert into public.payments(clinic_id,patient_id,budget_id,amount_cents,method,status,provider,provider_transaction_id,received_by,idempotency_key,provider_metadata) values(c,p_patient_id,p_budget_id,p_amount_cents,p_method,'COMPLETED',p_provider,p_provider_transaction_id,(select auth.uid()),p_idempotency_key,jsonb_build_object('reference',p_reference)) returning * into p;
  if p_invoice_id is not null then perform public.allocate_payment_to_invoice(p.id,p_invoice_id,p_amount_cents); elsif p_budget_id is not null then insert into public.payment_allocations(payment_id,budget_id,amount_cents) values(p.id,p_budget_id,p_amount_cents); end if; return to_jsonb(p);
end $$;

create or replace function public.create_or_get_payment_attempt(p_patient_id uuid,p_provider text,p_amount_cents integer,p_currency text,p_idempotency_key text,p_budget_id uuid default null,p_invoice_id uuid default null,p_method text default 'CARD') returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; r public.payment_attempts%rowtype;
begin
  select clinic_id into c from public.patients where id=p_patient_id; if c is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(c,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_provider not in ('manual','sumup','stripe') or p_amount_cents<=0 or p_currency !~ '^[A-Z]{3}$' or p_method not in ('CASH','CARD','TRANSFER','FINANCING','OTHER') or nullif(btrim(p_idempotency_key),'') is null then raise exception 'INVALID_PAYMENT_ATTEMPT' using errcode='22023'; end if;
  if p_invoice_id is not null and not exists(select 1 from public.invoices where id=p_invoice_id and clinic_id=c and patient_id=p_patient_id and status<>'DRAFT') then raise exception 'INVOICE_PATIENT_MISMATCH' using errcode='23514'; end if;
  if p_budget_id is not null and not exists(select 1 from public.budgets where id=p_budget_id and clinic_id=c and patient_id=p_patient_id) then raise exception 'BUDGET_PATIENT_MISMATCH' using errcode='23514'; end if;
  insert into public.payment_attempts(clinic_id,patient_id,provider,provider_status,idempotency_key,amount_cents,currency,budget_id,invoice_id,payment_method,created_by) values(c,p_patient_id,p_provider,'created',btrim(p_idempotency_key),p_amount_cents,upper(p_currency),p_budget_id,p_invoice_id,p_method,(select auth.uid())) on conflict(clinic_id,provider,idempotency_key) do nothing;
  select * into r from public.payment_attempts where clinic_id=c and provider=p_provider and idempotency_key=btrim(p_idempotency_key) for update;
  if r.patient_id<>p_patient_id or r.amount_cents<>p_amount_cents or r.currency<>upper(p_currency) or r.invoice_id is distinct from p_invoice_id or r.budget_id is distinct from p_budget_id or coalesce(r.payment_method,'CARD')<>p_method then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23514'; end if; return to_jsonb(r);
end $$;

create or replace function public.update_payment_attempt(p_attempt_id uuid,p_status text,p_provider_transaction_id text default null,p_provider_checkout_id text default null,p_reader_id text default null,p_error_code text default null,p_error_message text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.payment_attempts%rowtype;
begin
  select * into r from public.payment_attempts where id=p_attempt_id for update; if r.id is null then raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(r.clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.provider_status in ('succeeded','failed','cancelled','expired') then return to_jsonb(r); end if;
  if not ((r.provider_status='created' and p_status in ('processing','succeeded','cancelled','expired')) or (r.provider_status='processing' and p_status in ('requires_action','succeeded','failed','cancelled','expired')) or (r.provider_status='requires_action' and p_status in ('processing','succeeded','failed','cancelled','expired')) or r.provider_status=p_status) then raise exception 'INVALID_PAYMENT_TRANSITION' using errcode='23514'; end if;
  update public.payment_attempts set provider_status=p_status,provider_transaction_id=coalesce(p_provider_transaction_id,provider_transaction_id),provider_checkout_id=coalesce(p_provider_checkout_id,provider_checkout_id),reader_id=coalesce(p_reader_id,reader_id),error_code=p_error_code,error_message=p_error_message,completed_at=case when p_status in ('succeeded','failed','cancelled','expired') then coalesce(completed_at,now()) else completed_at end where id=r.id returning * into r; return to_jsonb(r);
end $$;

create or replace function public.post_succeeded_payment_attempt(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.payment_attempts%rowtype; p jsonb; pid uuid;
begin
  select * into a from public.payment_attempts where id=p_attempt_id for update; if a.id is null then raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(a.clinic_id,'finance.write') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if a.provider_status<>'succeeded' then raise exception 'PAYMENT_ATTEMPT_NOT_SUCCEEDED' using errcode='23514'; end if;
  if a.ledger_payment_id is not null then return (select to_jsonb(x) from public.payments x where x.id=a.ledger_payment_id); end if;
  p:=public.record_invoice_payment(a.patient_id,a.invoice_id,a.budget_id,a.amount_cents,coalesce(a.payment_method,case when a.provider='manual' then 'OTHER' else 'CARD' end),a.provider,a.provider_transaction_id,'attempt:'||a.id::text,null);
  pid:=(p->>'id')::uuid; update public.payment_attempts set ledger_payment_id=pid where id=a.id; return p;
end $$;

create or replace function public.queue_verifactu_submission(p_invoice_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.invoices%rowtype; s public.billing_settings%rowtype; f public.fiscal_records%rowtype; e public.integration_events%rowtype;
begin
  select * into i from public.invoices where id=p_invoice_id; if i.id is null then raise exception 'INVOICE_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_finance_permission(i.clinic_id,'billing.issue') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into s from public.billing_settings where clinic_id=i.clinic_id; if coalesce(s.fiscal_mode,'NO_VERIFACTU')<>'VERIFACTU' then raise exception 'VERIFACTU_NOT_ENABLED' using errcode='23514'; end if;
  if nullif(btrim(s.fiscal_tax_id),'') is null or nullif(btrim(s.fiscal_legal_name),'') is null then raise exception 'FISCAL_IDENTITY_REQUIRED' using errcode='23514'; end if;
  select * into f from public.fiscal_records where invoice_id=i.id order by created_at desc,id desc limit 1; if f.id is null then raise exception 'FISCAL_RECORD_NOT_FOUND' using errcode='P0002'; end if;
  insert into public.integration_events(clinic_id,scope,external_event_id,idempotency_key,payload,status) values(i.clinic_id,'verifactu',f.id::text,'verifactu:'||f.id::text,jsonb_build_object('fiscalRecordId',f.id,'invoiceId',i.id),'pending') on conflict(clinic_id,idempotency_key) do update set payload=excluded.payload returning * into e; return jsonb_build_object('status','queued','submission',to_jsonb(e));
end $$;

-- Retire the pre-Stage-8 writer so nobody bypasses invoice allocation/idempotency.
revoke execute on function public.record_payment(uuid,uuid,integer,text,text,text,text) from authenticated,public,anon;

do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_invoice_series','update_billing_settings','create_invoice_draft','create_invoice_from_budget','issue_invoice','rectify_invoice','allocate_payment_to_invoice','record_invoice_payment','create_or_get_payment_attempt','update_payment_attempt','post_succeeded_payment_attempt','queue_verifactu_submission') loop
    execute format('revoke execute on function %s from public, anon',r.sig); execute format('grant execute on function %s to authenticated',r.sig);
  end loop;
end $$;

create or replace function private.broadcast_stage8_finance_change() returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb; c uuid;
begin
  j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end; c:=nullif(j->>'clinic_id','')::uuid;
  if c is null and tg_table_name='payment_allocations' then select clinic_id into c from public.payments where id=nullif(j->>'payment_id','')::uuid; end if;
  if c is not null then begin perform realtime.send(jsonb_build_object('table',tg_table_name,'operation',tg_op,'id',j->>'id'),'finance_changed','clinic:'||c::text,true); exception when others then null; end; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.broadcast_stage8_finance_change() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['invoice_series','billing_settings','invoices','invoice_lines','payment_allocations'] loop
    execute format('drop trigger if exists stage8_finance_broadcast on public.%I',t);
    execute format('create trigger stage8_finance_broadcast after insert or update or delete on public.%I for each row execute function private.broadcast_stage8_finance_change()',t);
  end loop;
end $$;

commit;
