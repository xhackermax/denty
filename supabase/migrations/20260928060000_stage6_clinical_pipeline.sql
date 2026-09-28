-- Denty Stage 6: odontogram snapshots, versioned periodontal exams, treatment catalog,
-- clinical plan/budget version coupling, persistent consent requirements and semantic history.
begin;

-- 1) Versioned periodontal exams. Existing measurements remain readable; new writes use exam_id.
create table if not exists public.periodontal_exams (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  version integer not null check (version > 0),
  title text not null default 'Periodontograma',
  summary_json jsonb not null default '{}'::jsonb,
  diagnosis text,
  stage text,
  grade text,
  extent text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (patient_id, version)
);
alter table public.periodontal_measurements
  add column if not exists exam_id uuid references public.periodontal_exams(id) on delete cascade,
  add column if not exists exam_version integer,
  add column if not exists suppuration boolean not null default false;
create index if not exists periodontal_exams_patient_version_idx on public.periodontal_exams(patient_id, version desc);
create index if not exists periodontal_measurements_exam_idx on public.periodontal_measurements(exam_id, tooth, site);
create unique index if not exists periodontal_measurements_exam_site_uidx
  on public.periodontal_measurements(exam_id, tooth, site) where exam_id is not null;

-- 2) Tenant treatment catalog. Plan items retain immutable commercial/clinical snapshots.
create table if not exists public.treatment_catalog (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null,
  name text not null,
  specialty text,
  category text,
  default_price_cents integer not null default 0 check (default_price_cents >= 0),
  base_cost_cents integer not null default 0 check (base_cost_cents >= 0),
  default_duration_min integer check (default_duration_min is null or default_duration_min > 0),
  requires_lab boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code)
);

insert into public.treatment_catalog(clinic_id, code, name, specialty, category, default_price_cents, base_cost_cents, default_duration_min, requires_lab, metadata)
select c.id, seed.code, seed.name, seed.specialty, seed.category, 0, 0, seed.duration, seed.requires_lab, seed.metadata
from public.clinics c
cross join (values
  ('IMPLANT','Implante','SURGERY','IMPLANTOLOGY',60,true,'{"consent_codes":["CONSENT_IMPLANT"]}'::jsonb),
  ('CROWN_ZIRCONIA','Corona zirconio','PROSTHODONTICS','PROSTHESIS',45,true,'{"consent_codes":["CONSENT_PROSTHESIS"]}'::jsonb),
  ('ENDODONTICS','Endodoncia','ENDODONTICS','ENDODONTICS',60,false,'{"consent_codes":["CONSENT_ENDO"]}'::jsonb),
  ('SPLINT','Férula','PROSTHODONTICS','SPLINT',30,true,'{"consent_codes":[]}'::jsonb),
  ('HYGIENE','Higiene','PERIODONTICS','PREVENTION',45,false,'{"consent_codes":["CONSENT_CLEANING"]}'::jsonb)
) as seed(code,name,specialty,category,duration,requires_lab,metadata)
on conflict (clinic_id, code) do nothing;

alter table public.clinical_plan_items
  add column if not exists treatment_catalog_id uuid references public.treatment_catalog(id) on delete restrict,
  add column if not exists treatment_code_snapshot text,
  add column if not exists label_snapshot text,
  add column if not exists price_snapshot_cents integer,
  add column if not exists cost_snapshot_cents integer,
  add column if not exists treatment_metadata_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists is_ad_hoc boolean not null default false;

update public.clinical_plan_items i
set treatment_catalog_id = c.id,
    treatment_code_snapshot = coalesce(i.treatment_code_snapshot, i.treatment_code),
    label_snapshot = coalesce(i.label_snapshot, i.label),
    price_snapshot_cents = coalesce(i.price_snapshot_cents, i.price_cents, c.default_price_cents),
    cost_snapshot_cents = coalesce(i.cost_snapshot_cents, c.base_cost_cents),
    treatment_metadata_snapshot = case when i.treatment_metadata_snapshot = '{}'::jsonb then coalesce(c.metadata,'{}'::jsonb) else i.treatment_metadata_snapshot end
from public.treatment_catalog c
where c.clinic_id = i.clinic_id
  and upper(c.code) = upper(i.treatment_code)
  and i.treatment_catalog_id is null;

update public.clinical_plan_items
set treatment_code_snapshot = coalesce(treatment_code_snapshot, treatment_code),
    label_snapshot = coalesce(label_snapshot, label),
    price_snapshot_cents = coalesce(price_snapshot_cents, price_cents, 0),
    cost_snapshot_cents = coalesce(cost_snapshot_cents, 0),
    treatment_metadata_snapshot = coalesce(treatment_metadata_snapshot, '{}'::jsonb),
    is_ad_hoc = true
where treatment_catalog_id is null;

-- 3) Persistent consent derivation fields.
alter table public.consent_requirements
  add column if not exists template_id uuid references public.document_templates(id) on delete set null,
  add column if not exists satisfied_by_document_id uuid references public.documents(id) on delete set null,
  add column if not exists rule_version integer not null default 1 check (rule_version > 0);
create unique index if not exists consent_requirement_plan_item_code_idx
  on public.consent_requirements(clinical_plan_item_id, consent_code)
  where clinical_plan_item_id is not null;

-- Catalog write authorization honors ADMIN plus explicit catalog.manage overrides.
create or replace function private.can_manage_catalog(target_clinic_id uuid)
returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_clinic_admin(target_clinic_id) or exists (
    select 1
    from public.clinic_members cm
    join public.user_permissions up on up.clinic_member_id=cm.id
    where cm.clinic_id=target_clinic_id
      and cm.profile_id=(select auth.uid())
      and cm.active
      and up.permission='catalog.manage'
      and up.allowed
  );
$$;
revoke all on function private.can_manage_catalog(uuid) from public,anon;
grant execute on function private.can_manage_catalog(uuid) to authenticated;

-- 4) RLS and grants for new tables.
alter table public.periodontal_exams enable row level security;
alter table public.treatment_catalog enable row level security;
revoke all on table public.periodontal_exams from anon;
revoke all on table public.treatment_catalog from anon;
grant select, insert on table public.periodontal_exams to authenticated;
grant select, insert, update on table public.treatment_catalog to authenticated;

drop policy if exists periodontal_exams_access on public.periodontal_exams;
create policy periodontal_exams_access on public.periodontal_exams
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
drop policy if exists periodontal_exams_staff_insert on public.periodontal_exams;
create policy periodontal_exams_staff_insert on public.periodontal_exams
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

drop policy if exists treatment_catalog_read on public.treatment_catalog;
create policy treatment_catalog_read on public.treatment_catalog
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
drop policy if exists treatment_catalog_admin_insert on public.treatment_catalog;
create policy treatment_catalog_admin_insert on public.treatment_catalog
for insert to authenticated with check ((select private.can_manage_catalog(clinic_id)));
drop policy if exists treatment_catalog_admin_update on public.treatment_catalog;
create policy treatment_catalog_admin_update on public.treatment_catalog
for update to authenticated using ((select private.can_manage_catalog(clinic_id))) with check ((select private.can_manage_catalog(clinic_id)));

-- 5) Snapshot RPC: exact, versioned payload captured server-side.
create or replace function public.create_odontogram_snapshot(p_patient_id uuid, p_label text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_version integer;
  v_entities jsonb;
  v_periodontal jsonb;
  v_exam_id uuid;
  v_snapshot public.odontogram_snapshots%rowtype;
begin
  select clinic_id into v_clinic_id from public.patients where id = p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(max(version),1) into v_version from public.dental_entities where patient_id=p_patient_id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'tooth',tooth,'arch',arch,'entityType',entity_type,'status',status,
      'surfacesJson',surfaces_json,'attributesJson',attributes_json,'parentId',parent_id,'active',active,'version',version
    ) order by created_at), '[]'::jsonb)
    into v_entities from public.dental_entities where patient_id=p_patient_id and active;
  select id into v_exam_id from public.periodontal_exams where patient_id=p_patient_id order by version desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'tooth',tooth,'site',site,'probingDepth',probing_depth,'recession',recession,
      'bleeding',bleeding,'plaque',plaque,'suppuration',suppuration,'mobility',mobility,'furcation',furcation,'measuredAt',measured_at
    ) order by tooth,site), '[]'::jsonb)
    into v_periodontal
    from (
      select distinct on (pm.tooth, pm.site) pm.*
      from public.periodontal_measurements pm
      where pm.patient_id=p_patient_id
      order by pm.tooth, pm.site, pm.exam_version desc nulls last, pm.measured_at desc, pm.created_at desc
    ) current_pm;
  insert into public.odontogram_snapshots(clinic_id,patient_id,label,payload_json,version)
  values(v_clinic_id,p_patient_id,nullif(btrim(p_label),''),jsonb_build_object(
    'schemaVersion',1,'version',v_version,'entities',v_entities,'periodontal',v_periodontal
  ),v_version) returning * into v_snapshot;
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'ODONTOGRAM_SNAPSHOT_CREATED',v_snapshot.id,'ODONTOGRAM_SNAPSHOT',jsonb_build_object('version',v_version));
  return to_jsonb(v_snapshot);
end; $$;

-- 6) Periodontal exam is one transaction: exam + six-point measurements + semantic history.
create or replace function public.save_periodontal_exam(p_patient_id uuid, p_exam jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_version integer;
  v_exam public.periodontal_exams%rowtype;
  v_site jsonb;
  v_rows jsonb;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(max(version),0)+1 into v_version from public.periodontal_exams where patient_id=p_patient_id;
  insert into public.periodontal_exams(clinic_id,patient_id,version,title,summary_json,diagnosis,stage,grade,extent,notes,metadata,measured_at,created_by)
  values(
    v_clinic_id,p_patient_id,v_version,coalesce(nullif(btrim(p_exam->>'title'),''),'Periodontograma'),
    coalesce(p_exam->'risk','{}'::jsonb),nullif(p_exam->>'diagnosis',''),nullif(p_exam->>'stage',''),
    nullif(p_exam->>'grade',''),nullif(p_exam->>'extent',''),nullif(p_exam->>'notes',''),
    coalesce(p_exam->'metadata','{}'::jsonb),coalesce((p_exam->>'measuredAt')::timestamptz,now()),(select auth.uid())
  )
  returning * into v_exam;
  for v_site in select value from jsonb_array_elements(coalesce(p_exam->'sites','[]'::jsonb)) loop
    insert into public.periodontal_measurements(clinic_id,patient_id,exam_id,exam_version,tooth,site,probing_depth,recession,bleeding,plaque,suppuration,mobility,furcation,measured_at)
    values(v_clinic_id,p_patient_id,v_exam.id,v_version,v_site->>'tooth',v_site->>'site',nullif(v_site->>'probingDepth','')::integer,nullif(v_site->>'recession','')::integer,coalesce((v_site->>'bleeding')::boolean,false),coalesce((v_site->>'plaque')::boolean,false),coalesce((v_site->>'suppuration')::boolean,false),nullif(v_site->>'mobility','')::integer,nullif(v_site->>'furcation','')::integer,v_exam.measured_at);
  end loop;
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'PERIODONTAL_EXAM_SAVED',v_exam.id,'PERIODONTAL_EXAM',jsonb_build_object('version',v_version,'siteCount',jsonb_array_length(coalesce(p_exam->'sites','[]'::jsonb))));
  select coalesce(jsonb_agg(to_jsonb(pm) order by pm.tooth,pm.site),'[]'::jsonb) into v_rows from public.periodontal_measurements pm where pm.exam_id=v_exam.id;
  return jsonb_build_object('exam',to_jsonb(v_exam),'measurements',v_rows);
end; $$;

-- 7) Plan sync records the odontogram source version. It never silently rewrites treatment choices.
create or replace function public.sync_clinical_plan(p_patient_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid; v_odontogram_version integer; v_plan public.clinical_plans%rowtype;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(max(version),1) into v_odontogram_version from public.dental_entities where patient_id=p_patient_id;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1 for update;
  if v_plan.id is null then
    insert into public.clinical_plans(clinic_id,patient_id,status,source_odontogram_version,version)
    values(v_clinic_id,p_patient_id,'DRAFT',v_odontogram_version,1) returning * into v_plan;
  elsif v_plan.source_odontogram_version is distinct from v_odontogram_version then
    update public.clinical_plans set source_odontogram_version=v_odontogram_version,version=version+1 where id=v_plan.id returning * into v_plan;
  end if;
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'CLINICAL_PLAN_SYNCED',v_plan.id,'CLINICAL_PLAN',jsonb_build_object('version',v_plan.version,'sourceOdontogramVersion',v_odontogram_version));
  return to_jsonb(v_plan);
end; $$;

-- 8) Consent requirements derive from immutable treatment snapshots/catalog metadata and persist once.
create or replace function public.refresh_consent_requirements(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan public.clinical_plans%rowtype; v_item record; v_code text; v_template_id uuid; v_doc_id uuid; v_count integer := 0;
begin
  select * into v_plan from public.clinical_plans where id=p_plan_id;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_plan.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  delete from public.consent_requirements cr
  where cr.clinical_plan_item_id in (select id from public.clinical_plan_items where plan_id=p_plan_id)
    and cr.status <> 'SATISFIED';
  for v_item in
    select i.id, i.clinic_id, i.plan_id, coalesce(i.treatment_metadata_snapshot, '{}'::jsonb) as metadata
    from public.clinical_plan_items i
    where i.plan_id=p_plan_id and i.status not in ('CANCELLED','SUPERSEDED')
  loop
    for v_code in select jsonb_array_elements_text(coalesce(v_item.metadata->'consent_codes','[]'::jsonb)) loop
      select id into v_template_id from public.document_templates where clinic_id=v_plan.clinic_id and code=v_code and active order by version desc limit 1;
      select d.id into v_doc_id from public.documents d where d.patient_id=v_plan.patient_id and d.template_id=v_template_id and d.status in ('SIGNED','DELIVERED','ARCHIVED') order by d.signed_at desc nulls last limit 1;
      insert into public.consent_requirements(clinic_id,patient_id,clinical_plan_item_id,document_id,consent_code,status,required_before,template_id,satisfied_by_document_id,rule_version)
      values(v_plan.clinic_id,v_plan.patient_id,v_item.id,v_doc_id,v_code,case when v_doc_id is null then 'REQUIRED' else 'SATISFIED' end,'BUDGET_SIGNATURE',v_template_id,v_doc_id,1)
      on conflict (clinical_plan_item_id,consent_code) where clinical_plan_item_id is not null
      do update set template_id=excluded.template_id,status=excluded.status,document_id=excluded.document_id,satisfied_by_document_id=excluded.satisfied_by_document_id,rule_version=excluded.rule_version,updated_at=now();
      v_count := v_count+1;
    end loop;
  end loop;
  return jsonb_build_object('count',v_count);
end; $$;

-- Keep requirement status synchronized when a consent document becomes signed.
create or replace function private.satisfy_consent_requirements_from_document()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.template_id is not null and new.status in ('SIGNED','DELIVERED','ARCHIVED') then
    update public.consent_requirements
    set status='SATISFIED', document_id=new.id, satisfied_by_document_id=new.id, updated_at=now()
    where patient_id=new.patient_id and template_id=new.template_id and status<>'SATISFIED';
  end if;
  return new;
end; $$;
drop trigger if exists documents_satisfy_consent_requirements on public.documents;
create trigger documents_satisfy_consent_requirements after insert or update of status,template_id on public.documents
for each row execute function private.satisfy_consent_requirements_from_document();

-- 9) Budget sync atomically rebuilds a DRAFT revision from the current plan snapshot.
create or replace function public.sync_budget_from_plan(p_patient_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_clinic_id uuid; v_plan public.clinical_plans%rowtype; v_budget public.budgets%rowtype; v_total integer; v_revision integer;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  if v_plan.source_odontogram_version is null then raise exception 'PLAN_NOT_SYNCED' using errcode='23514'; end if;
  perform public.refresh_consent_requirements(v_plan.id);
  select * into v_budget from public.budgets where patient_id=p_patient_id and clinical_plan_id=v_plan.id order by revision desc limit 1 for update;
  select coalesce(sum(case when billing_mode='separate' and status not in ('CANCELLED','SUPERSEDED') then coalesce(price_snapshot_cents,price_cents,0) else 0 end),0)
  into v_total from public.clinical_plan_items where plan_id=v_plan.id;
  if v_budget.id is null or v_budget.status <> 'DRAFT' then
    select coalesce(max(revision),0)+1 into v_revision from public.budgets where patient_id=p_patient_id;
    insert into public.budgets(clinic_id,patient_id,clinical_plan_id,code,status,total_cents,source_plan_version,revision,version)
    values(v_clinic_id,p_patient_id,v_plan.id,'P-'||substr(p_patient_id::text,1,8)||'-R'||v_revision,'DRAFT',v_total,v_plan.version,v_revision,1) returning * into v_budget;
  else
    update public.budgets set total_cents=v_total,source_plan_version=v_plan.version,version=version+1,status='DRAFT' where id=v_budget.id returning * into v_budget;
    delete from public.budget_items where budget_id=v_budget.id;
  end if;
  insert into public.budget_items(clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,billing_mode,quantity,unit_price_cents,total_cents)
  select i.clinic_id,v_budget.id,i.id,i.component_type,coalesce(i.label_snapshot,i.label),i.tooth,i.billing_mode,1,coalesce(i.price_snapshot_cents,i.price_cents,0),case when i.billing_mode='separate' then coalesce(i.price_snapshot_cents,i.price_cents,0) else 0 end
  from public.clinical_plan_items i where i.plan_id=v_plan.id and i.status not in ('CANCELLED','SUPERSEDED');
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'BUDGET_SYNCED_FROM_PLAN',v_budget.id,'BUDGET',jsonb_build_object('planVersion',v_plan.version,'revision',v_budget.revision,'totalCents',v_total));
  return to_jsonb(v_budget);
end; $$;

-- 10) Replace Stage 2 boundary with stricter clinical preconditions; keep same signature.
create or replace function public.finalize_budget_signature(
  p_budget_id uuid,
  p_expected_version integer,
  p_signer_name text,
  p_signature_data text,
  p_snapshot_json jsonb
)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_budget public.budgets%rowtype; v_plan public.clinical_plans%rowtype; v_snapshot public.budget_signed_snapshots%rowtype; v_missing integer; v_snapshot_payload jsonb;
begin
  select * into v_budget from public.budgets where id=p_budget_id for update;
  if v_budget.id is null then raise exception 'BUDGET_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_budget.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_budget.version<>p_expected_version then return jsonb_build_object('conflict',true,'currentVersion',v_budget.version); end if;
  if v_budget.clinical_plan_id is null then raise exception 'BUDGET_OUTDATED: missing plan' using errcode='23514'; end if;
  select * into v_plan from public.clinical_plans where id=v_budget.clinical_plan_id;
  if v_plan.id is null or v_budget.source_plan_version is distinct from v_plan.version then raise exception 'BUDGET_OUTDATED' using errcode='23514'; end if;
  perform public.refresh_consent_requirements(v_plan.id);
  select count(*) into v_missing from public.consent_requirements cr join public.clinical_plan_items i on i.id=cr.clinical_plan_item_id where i.plan_id=v_plan.id and cr.required_before='BUDGET_SIGNATURE' and cr.status<>'SATISFIED';
  if v_missing>0 then raise exception 'CONSENTS_INCOMPLETE' using errcode='23514'; end if;
  if nullif(btrim(p_signer_name),'') is null or nullif(btrim(p_signature_data),'') is null then raise exception 'SIGNATURE_REQUIRED' using errcode='22023'; end if;
  perform set_config('denty.correlation_id',gen_random_uuid()::text,true);
  v_snapshot_payload := jsonb_build_object(
    'budget', to_jsonb(v_budget),
    'items', coalesce((
      select jsonb_agg(to_jsonb(bi) order by bi.created_at asc)
      from public.budget_items bi
      where bi.budget_id=v_budget.id
    ), '[]'::jsonb),
    'plan', to_jsonb(v_plan),
    'consentRequirements', coalesce((
      select jsonb_agg(to_jsonb(cr) order by cr.created_at asc)
      from public.consent_requirements cr
      join public.clinical_plan_items i on i.id=cr.clinical_plan_item_id
      where i.plan_id=v_plan.id
    ), '[]'::jsonb),
    'clientContext', coalesce(p_snapshot_json,'{}'::jsonb)
  );
  insert into public.budget_signed_snapshots(clinic_id,budget_id,patient_id,revision,signer_name,signature_data,snapshot_json)
  values(v_budget.clinic_id,v_budget.id,v_budget.patient_id,v_budget.revision,btrim(p_signer_name),p_signature_data,v_snapshot_payload) returning * into v_snapshot;
  update public.budgets set status='SIGNED',version=version+1 where id=v_budget.id returning * into v_budget;
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_budget.clinic_id,v_budget.patient_id,(select auth.uid()),'BUDGET_SIGNED',v_budget.id,'BUDGET',jsonb_build_object('revision',v_budget.revision,'snapshotId',v_snapshot.id));
  return jsonb_build_object('budget',to_jsonb(v_budget),'snapshot',to_jsonb(v_snapshot));
end; $$;

-- New plan items must carry catalog identity or explicit ad-hoc intent.
create or replace function public.add_clinical_plan_item(
  p_patient_id uuid,
  p_treatment_catalog_id uuid,
  p_treatment_code text,
  p_label text,
  p_tooth text default null,
  p_patient_label text default null,
  p_clinical_reason text default null,
  p_phase integer default 1,
  p_priority integer default 0,
  p_price_cents integer default null,
  p_is_ad_hoc boolean default false
)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_clinic_id uuid; v_plan public.clinical_plans%rowtype; v_catalog public.treatment_catalog%rowtype; v_item public.clinical_plan_items%rowtype;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_treatment_catalog_id is not null then select * into v_catalog from public.treatment_catalog where id=p_treatment_catalog_id and clinic_id=v_clinic_id and active; end if;
  if v_catalog.id is null and not p_is_ad_hoc then
    select * into v_catalog from public.treatment_catalog where clinic_id=v_clinic_id and upper(code)=upper(p_treatment_code) and active limit 1;
  end if;
  if v_catalog.id is null and not p_is_ad_hoc then raise exception 'TREATMENT_CATALOG_REQUIRED' using errcode='23514'; end if;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1 for update;
  if v_plan.id is null then perform public.sync_clinical_plan(p_patient_id); select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1; end if;
  insert into public.clinical_plan_items(clinic_id,plan_id,tooth,treatment_code,label,patient_label,clinical_reason,phase,priority,status,price_cents,treatment_catalog_id,treatment_code_snapshot,label_snapshot,price_snapshot_cents,cost_snapshot_cents,treatment_metadata_snapshot,is_ad_hoc)
  values(v_clinic_id,v_plan.id,p_tooth,coalesce(v_catalog.code,p_treatment_code),coalesce(v_catalog.name,p_label),p_patient_label,p_clinical_reason,p_phase,p_priority,'PLANNED',coalesce(p_price_cents,v_catalog.default_price_cents,0),v_catalog.id,coalesce(v_catalog.code,p_treatment_code),coalesce(v_catalog.name,p_label),coalesce(p_price_cents,v_catalog.default_price_cents,0),coalesce(v_catalog.base_cost_cents,0),coalesce(v_catalog.metadata,'{}'::jsonb),p_is_ad_hoc)
  returning * into v_item;
  update public.clinical_plans set version=version+1 where id=v_plan.id;
  perform public.refresh_consent_requirements(v_plan.id);
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'PLAN_ITEM_ADDED',v_item.id,'CLINICAL_PLAN_ITEM',jsonb_build_object('treatmentCode',v_item.treatment_code_snapshot,'tooth',v_item.tooth));
  return to_jsonb(v_item);
end; $$;

-- Stage 2 could not audit this Stage 6 table because it did not exist yet.
drop trigger if exists periodontal_exams_audit_mutation on public.periodontal_exams;
create trigger periodontal_exams_audit_mutation
after insert or update or delete on public.periodontal_exams
for each row execute function private.audit_sensitive_mutation();

-- Auditing / updated_at for catalog.
drop trigger if exists treatment_catalog_set_updated_at on public.treatment_catalog;
create trigger treatment_catalog_set_updated_at before update on public.treatment_catalog for each row execute function private.set_updated_at();
drop trigger if exists treatment_catalog_audit_mutation on public.treatment_catalog;
create trigger treatment_catalog_audit_mutation after insert or update or delete on public.treatment_catalog for each row execute function private.audit_sensitive_mutation();

-- Explicit execute grants. All functions remain SECURITY INVOKER and RLS-aware.
revoke execute on function public.create_odontogram_snapshot(uuid,text) from public,anon;
revoke execute on function public.save_periodontal_exam(uuid,jsonb) from public,anon;
revoke execute on function public.sync_clinical_plan(uuid) from public,anon;
revoke execute on function public.refresh_consent_requirements(uuid) from public,anon;
revoke execute on function public.sync_budget_from_plan(uuid) from public,anon;
revoke execute on function public.add_clinical_plan_item(uuid,uuid,text,text,text,text,text,integer,integer,integer,boolean) from public,anon;
revoke execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) from public,anon;
grant execute on function public.create_odontogram_snapshot(uuid,text) to authenticated;
grant execute on function public.save_periodontal_exam(uuid,jsonb) to authenticated;
grant execute on function public.sync_clinical_plan(uuid) to authenticated;
grant execute on function public.refresh_consent_requirements(uuid) to authenticated;
grant execute on function public.sync_budget_from_plan(uuid) to authenticated;
grant execute on function public.add_clinical_plan_item(uuid,uuid,text,text,text,text,text,integer,integer,integer,boolean) to authenticated;
grant execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) to authenticated;

commit;
