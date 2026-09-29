-- Stage 11B: campaigns, attribution, communication consent, message ledger and transactional outbox.
begin;

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  provider text not null check (provider in ('META','GOOGLE','INTERNAL')),
  external_campaign_id text not null,
  name text not null,
  status text not null default 'PAUSED' check (status in ('ACTIVE','PAUSED','ENDED')),
  budget_cents bigint not null default 0 check (budget_cents>=0),
  daily_budget_cents bigint not null default 0 check (daily_budget_cents>=0),
  starts_at timestamptz,
  ends_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clinic_id,provider,external_campaign_id)
);

alter table public.patients add column if not exists declared_campaign_id uuid;
do $$ begin
  alter table public.patients add constraint patients_declared_campaign_fk foreign key (declared_campaign_id) references public.marketing_campaigns(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.patient_attribution_touchpoints (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  touch_kind text not null check (touch_kind in ('DECLARED','OBSERVED')),
  source text,
  detail text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_url text,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(clinic_id,idempotency_key)
);

create table if not exists public.patient_attribution (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  first_touch_id uuid references public.patient_attribution_touchpoints(id) on delete set null,
  last_touch_id uuid references public.patient_attribution_touchpoints(id) on delete set null,
  first_campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  last_campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  declared_source text,
  declared_source_detail text,
  updated_at timestamptz not null default now(),
  unique(clinic_id,patient_id)
);

create table if not exists public.communication_consents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  channel text not null check (channel in ('WHATSAPP','SMS','EMAIL')),
  purpose text not null default 'MARKETING',
  status text not null check (status in ('GRANTED','REVOKED')),
  source text,
  evidence_note text,
  evidence_document_id uuid references public.documents(id) on delete set null,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  supersedes_id uuid references public.communication_consents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists communication_consents_lookup_idx on public.communication_consents(clinic_id,patient_id,channel,purpose,captured_at desc);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  channel text not null check (channel in ('WHATSAPP','SMS','EMAIL')),
  category text not null,
  subject text,
  body text,
  template_key text,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED')),
  provider_message_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  communication_message_id uuid not null references public.communication_messages(id) on delete restrict,
  provider text not null default 'UNASSIGNED',
  idempotency_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED')),
  attempt_count integer not null default 0 check (attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clinic_id,idempotency_key)
);

create index if not exists marketing_campaigns_clinic_status_idx on public.marketing_campaigns(clinic_id,status,created_at desc);
create index if not exists attribution_touchpoints_patient_idx on public.patient_attribution_touchpoints(patient_id,occurred_at);
create index if not exists communication_messages_patient_idx on public.communication_messages(patient_id,created_at desc);
create index if not exists communication_outbox_due_idx on public.communication_outbox(status,next_attempt_at) where status in ('PENDING','FAILED');

alter table public.marketing_campaigns enable row level security;
alter table public.patient_attribution_touchpoints enable row level security;
alter table public.patient_attribution enable row level security;
alter table public.communication_consents enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_outbox enable row level security;

revoke all on public.marketing_campaigns,public.patient_attribution_touchpoints,public.patient_attribution,public.communication_consents,public.communication_messages,public.communication_outbox from anon;
revoke insert,update,delete on public.marketing_campaigns,public.patient_attribution_touchpoints,public.patient_attribution,public.communication_consents,public.communication_messages,public.communication_outbox from authenticated;
grant select on public.marketing_campaigns,public.patient_attribution_touchpoints,public.patient_attribution,public.communication_consents,public.communication_messages,public.communication_outbox to authenticated;

create policy marketing_campaigns_read on public.marketing_campaigns for select to authenticated using ((select private.stage11_has_permission(clinic_id,'marketing.read')));
create policy attribution_touchpoints_read on public.patient_attribution_touchpoints for select to authenticated using ((select private.stage11_has_permission(clinic_id,'attribution.manage')));
create policy patient_attribution_read on public.patient_attribution for select to authenticated using ((select private.stage11_has_permission(clinic_id,'attribution.manage')));
create policy communication_consents_read on public.communication_consents for select to authenticated using ((select private.stage11_has_permission(clinic_id,'communications.read')) or (select private.is_patient_owner(patient_id)));
create policy communication_messages_read on public.communication_messages for select to authenticated using ((select private.stage11_has_permission(clinic_id,'communications.read')) or (select private.is_patient_owner(patient_id)));
create policy communication_outbox_read on public.communication_outbox for select to authenticated using ((select private.stage11_has_permission(clinic_id,'communications.manage')));

create or replace function private.stage11_apply_touchpoint(p_touch_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare t public.patient_attribution_touchpoints%rowtype;
begin
  select * into t from public.patient_attribution_touchpoints where id=p_touch_id;
  if t.id is null then return; end if;
  insert into public.patient_attribution(clinic_id,patient_id,first_touch_id,last_touch_id,first_campaign_id,last_campaign_id,declared_source,declared_source_detail,updated_at)
  values(t.clinic_id,t.patient_id,t.id,t.id,t.campaign_id,t.campaign_id,case when t.touch_kind='DECLARED' then t.source else null end,case when t.touch_kind='DECLARED' then t.detail else null end,now())
  on conflict(clinic_id,patient_id) do update set
    first_touch_id=coalesce(public.patient_attribution.first_touch_id,excluded.first_touch_id),
    last_touch_id=excluded.last_touch_id,
    first_campaign_id=coalesce(public.patient_attribution.first_campaign_id,excluded.first_campaign_id),
    last_campaign_id=coalesce(excluded.last_campaign_id,public.patient_attribution.last_campaign_id),
    declared_source=case when t.touch_kind='DECLARED' then t.source else public.patient_attribution.declared_source end,
    declared_source_detail=case when t.touch_kind='DECLARED' then t.detail else public.patient_attribution.declared_source_detail end,
    updated_at=now();
end $$;
revoke all on function private.stage11_apply_touchpoint(uuid) from public,anon;

create or replace function private.sync_declared_patient_attribution()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_touch uuid; v_key text; v_campaign public.marketing_campaigns%rowtype;
begin
  if new.declared_source is null and new.declared_campaign_id is null then return new; end if;
  if tg_op='UPDATE'
    and new.declared_source is not distinct from old.declared_source
    and new.declared_source_detail is not distinct from old.declared_source_detail
    and new.declared_campaign_id is not distinct from old.declared_campaign_id then return new; end if;
  if new.declared_campaign_id is not null then
    select * into v_campaign from public.marketing_campaigns c where c.id=new.declared_campaign_id and c.clinic_id=new.clinic_id;
    if v_campaign.id is null then raise exception 'CAMPAIGN_NOT_IN_CLINIC' using errcode='23514'; end if;
  end if;
  v_key:='declared:'||new.id::text||':'||new.version::text||':'||coalesce(new.declared_source,'')||':'||coalesce(new.declared_source_detail,'')||':'||coalesce(new.declared_campaign_id::text,'');
  insert into public.patient_attribution_touchpoints(clinic_id,patient_id,campaign_id,touch_kind,source,detail,utm_source,utm_medium,utm_campaign,idempotency_key,occurred_at,created_by)
  values(new.clinic_id,new.id,new.declared_campaign_id,'DECLARED',coalesce(new.declared_source,v_campaign.provider),coalesce(new.declared_source_detail,v_campaign.name),v_campaign.utm_source,v_campaign.utm_medium,v_campaign.utm_campaign,v_key,now(),(select auth.uid()))
  on conflict(clinic_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_touch;
  perform private.stage11_apply_touchpoint(v_touch);
  return new;
end $$;
revoke all on function private.sync_declared_patient_attribution() from public,anon;

drop trigger if exists patients_stage11_declared_attribution on public.patients;
create trigger patients_stage11_declared_attribution after insert or update of declared_source,declared_source_detail,declared_campaign_id on public.patients for each row execute function private.sync_declared_patient_attribution();

-- Backfill the current declared source without losing its distinction from observed UTM attribution.
do $$ declare p record; v_touch uuid; begin
  for p in select id,clinic_id,declared_source,declared_source_detail,created_at from public.patients where declared_source is not null loop
    insert into public.patient_attribution_touchpoints(clinic_id,patient_id,touch_kind,source,detail,idempotency_key,occurred_at)
    values(p.clinic_id,p.id,'DECLARED',p.declared_source,p.declared_source_detail,'declared-backfill:'||p.id::text,p.created_at)
    on conflict(clinic_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_touch;
    perform private.stage11_apply_touchpoint(v_touch);
  end loop;
end $$;

create or replace function public.create_marketing_campaign(p_clinic_id uuid,p_provider text,p_name text,p_external_campaign_id text default null,p_daily_budget_cents bigint default 0,p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null)
returns public.marketing_campaigns language plpgsql security definer set search_path='' as $$
declare r public.marketing_campaigns%rowtype; v_external text;
begin
  if not (select private.stage11_has_permission(p_clinic_id,'marketing.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_external:=coalesce(nullif(btrim(p_external_campaign_id),''),'local-'||gen_random_uuid()::text);
  insert into public.marketing_campaigns(clinic_id,provider,external_campaign_id,name,status,daily_budget_cents,utm_source,utm_medium,utm_campaign,created_by)
  values(p_clinic_id,p_provider,v_external,btrim(p_name),'PAUSED',greatest(coalesce(p_daily_budget_cents,0),0),p_utm_source,p_utm_medium,coalesce(p_utm_campaign,btrim(p_name)),(select auth.uid())) returning * into r;
  return r;
end $$;

create or replace function public.update_marketing_campaign(p_campaign_id uuid,p_name text default null,p_status text default null,p_daily_budget_cents bigint default null,p_expected_version integer default null)
returns public.marketing_campaigns language plpgsql security definer set search_path='' as $$
declare r public.marketing_campaigns%rowtype;
begin
  select * into r from public.marketing_campaigns where id=p_campaign_id for update;
  if r.id is null then raise exception 'CAMPAIGN_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage11_has_permission(r.clinic_id,'marketing.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is not null and r.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  update public.marketing_campaigns set name=coalesce(nullif(btrim(p_name),''),name),status=coalesce(p_status,status),daily_budget_cents=coalesce(p_daily_budget_cents,daily_budget_cents),version=version+1,updated_at=now() where id=p_campaign_id returning * into r;
  return r;
end $$;

create or replace function public.record_patient_attribution_touchpoint(p_clinic_id uuid,p_patient_id uuid,p_campaign_id uuid default null,p_source text default null,p_detail text default null,p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null,p_utm_content text default null,p_utm_term text default null,p_landing_url text default null,p_idempotency_key text default null,p_occurred_at timestamptz default now())
returns public.patient_attribution_touchpoints language plpgsql security definer set search_path='' as $$
declare t public.patient_attribution_touchpoints%rowtype; v_campaign public.marketing_campaigns%rowtype;
begin
  if not (select private.stage11_has_permission(p_clinic_id,'attribution.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_campaign_id is not null then
    select * into v_campaign from public.marketing_campaigns c where c.id=p_campaign_id and c.clinic_id=p_clinic_id;
    if v_campaign.id is null then raise exception 'CAMPAIGN_NOT_IN_CLINIC' using errcode='23514'; end if;
  end if;
  insert into public.patient_attribution_touchpoints(clinic_id,patient_id,campaign_id,touch_kind,source,detail,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_url,idempotency_key,occurred_at,created_by)
  values(p_clinic_id,p_patient_id,p_campaign_id,'OBSERVED',p_source,p_detail,coalesce(p_utm_source,v_campaign.utm_source),coalesce(p_utm_medium,v_campaign.utm_medium),coalesce(p_utm_campaign,v_campaign.utm_campaign),p_utm_content,p_utm_term,p_landing_url,coalesce(nullif(p_idempotency_key,''),'observed-'||gen_random_uuid()::text),coalesce(p_occurred_at,now()),(select auth.uid()))
  on conflict(clinic_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into t;
  perform private.stage11_apply_touchpoint(t.id);
  return t;
end $$;

create or replace function public.set_communication_consent(p_clinic_id uuid,p_patient_id uuid,p_channel text,p_purpose text,p_granted boolean,p_source text default null,p_evidence_note text default null,p_evidence_document_id uuid default null)
returns public.communication_consents language plpgsql security definer set search_path='' as $$
declare prev public.communication_consents%rowtype; r public.communication_consents%rowtype;
begin
  if not ((select private.stage11_has_permission(p_clinic_id,'communications.manage')) or (select private.is_patient_owner(p_patient_id))) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  select * into prev from public.communication_consents where clinic_id=p_clinic_id and patient_id=p_patient_id and channel=p_channel and purpose=p_purpose order by captured_at desc,created_at desc limit 1;
  insert into public.communication_consents(clinic_id,patient_id,channel,purpose,status,source,evidence_note,evidence_document_id,captured_at,revoked_at,supersedes_id,created_by)
  values(p_clinic_id,p_patient_id,p_channel,p_purpose,case when p_granted then 'GRANTED' else 'REVOKED' end,p_source,p_evidence_note,p_evidence_document_id,now(),case when p_granted then null else now() end,prev.id,(select auth.uid())) returning * into r;
  return r;
end $$;

create or replace function public.queue_communication(p_clinic_id uuid,p_patient_id uuid,p_channel text,p_category text,p_subject text default null,p_body text default null,p_template_key text default null,p_variables jsonb default '{}'::jsonb,p_scheduled_at timestamptz default null,p_campaign_id uuid default null,p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.communication_messages%rowtype; o public.communication_outbox%rowtype; v_key text; v_consent text;
begin
  if not (select private.stage11_has_permission(p_clinic_id,'communications.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_campaign_id is not null and not exists(select 1 from public.marketing_campaigns c where c.id=p_campaign_id and c.clinic_id=p_clinic_id) then raise exception 'CAMPAIGN_NOT_IN_CLINIC' using errcode='23514'; end if;
  if upper(p_category)='MARKETING' then
    select cc.status into v_consent from public.communication_consents cc
    where cc.clinic_id=p_clinic_id and cc.patient_id=p_patient_id and cc.channel=p_channel and cc.purpose='MARKETING'
    order by cc.captured_at desc,cc.created_at desc limit 1;
    if coalesce(v_consent,'REVOKED')<>'GRANTED' then raise exception 'MARKETING_CONSENT_REQUIRED' using errcode='42501'; end if;
  end if;
  v_key:=coalesce(nullif(p_idempotency_key,''),'communication-'||gen_random_uuid()::text);
  select cm.* into m from public.communication_outbox co join public.communication_messages cm on cm.id=co.communication_message_id where co.clinic_id=p_clinic_id and co.idempotency_key=v_key limit 1;
  if m.id is not null then return jsonb_build_object('id',m.id,'status',m.status,'outboxId',(select id from public.communication_outbox where communication_message_id=m.id limit 1)); end if;
  insert into public.communication_messages(clinic_id,patient_id,campaign_id,channel,category,subject,body,template_key,variables,status,scheduled_at,created_by)
  values(p_clinic_id,p_patient_id,p_campaign_id,p_channel,p_category,p_subject,p_body,p_template_key,coalesce(p_variables,'{}'::jsonb),'QUEUED',p_scheduled_at,(select auth.uid())) returning * into m;
  insert into public.communication_outbox(clinic_id,communication_message_id,idempotency_key,status,next_attempt_at)
  values(p_clinic_id,m.id,v_key,'PENDING',coalesce(p_scheduled_at,now())) returning * into o;
  return jsonb_build_object('id',m.id,'status',m.status,'outboxId',o.id,'idempotencyKey',o.idempotency_key);
end $$;


create or replace function public.claim_communication_outbox(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;

  -- Consent is checked again at dispatch time. A marketing message may have been
  -- queued while consent was valid and then revoked before a worker claims it.
  update public.communication_outbox o
  set status='CANCELLED',last_error='MARKETING_CONSENT_REVOKED',locked_at=null,updated_at=now()
  from public.communication_messages m
  where m.id=o.communication_message_id
    and o.status in ('PENDING','FAILED')
    and m.category='MARKETING'
    and not exists (
      select 1 from public.communication_consents cc
      where cc.id=(
        select latest.id from public.communication_consents latest
        where latest.clinic_id=m.clinic_id and latest.patient_id=m.patient_id
          and latest.channel=m.channel and latest.purpose='MARKETING'
        order by latest.captured_at desc,latest.created_at desc limit 1
      ) and cc.status='GRANTED'
    );

  update public.communication_messages m
  set status='CANCELLED',failure_reason='MARKETING_CONSENT_REVOKED',updated_at=now()
  where m.category='MARKETING' and m.status in ('QUEUED','FAILED')
    and exists(select 1 from public.communication_outbox o where o.communication_message_id=m.id and o.status='CANCELLED' and o.last_error='MARKETING_CONSENT_REVOKED');

  with candidates as (
    select o.id from public.communication_outbox o
    where o.status in ('PENDING','FAILED') and o.next_attempt_at<=now()
    order by o.next_attempt_at,o.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),100))
  ), claimed as (
    update public.communication_outbox o
    set status='PROCESSING',attempt_count=o.attempt_count+1,locked_at=now(),updated_at=now()
    from candidates c where o.id=c.id
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'outboxId',c.id,'messageId',m.id,'clinicId',c.clinic_id,'patientId',m.patient_id,
    'channel',m.channel,'category',m.category,'subject',m.subject,'body',m.body,'variables',m.variables,
    'idempotencyKey',c.idempotency_key,'attemptCount',c.attempt_count
  ) order by c.created_at),'[]'::jsonb) into v_result
  from claimed c join public.communication_messages m on m.id=c.communication_message_id;
  return v_result;
end $$;

create or replace function public.finish_communication_outbox(p_outbox_id uuid,p_status text,p_provider_message_id text default null,p_error text default null,p_next_attempt_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.communication_outbox%rowtype; m public.communication_messages%rowtype; v_outbox_status text; v_message_status text;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into o from public.communication_outbox where id=p_outbox_id for update;
  if o.id is null then raise exception 'OUTBOX_NOT_FOUND' using errcode='P0002'; end if;
  if p_status not in ('SENT','DELIVERED','FAILED','CANCELLED') then raise exception 'INVALID_DELIVERY_STATUS' using errcode='22023'; end if;
  v_outbox_status:=p_status;
  v_message_status:=p_status;
  update public.communication_outbox set status=v_outbox_status,last_error=p_error,next_attempt_at=case when p_status='FAILED' then coalesce(p_next_attempt_at,now()+interval '5 minutes') else next_attempt_at end,locked_at=null,updated_at=now() where id=o.id returning * into o;
  update public.communication_messages set status=v_message_status,provider_message_id=coalesce(p_provider_message_id,provider_message_id),sent_at=case when p_status in ('SENT','DELIVERED') then coalesce(sent_at,now()) else sent_at end,delivered_at=case when p_status='DELIVERED' then coalesce(delivered_at,now()) else delivered_at end,failed_at=case when p_status='FAILED' then now() else failed_at end,failure_reason=case when p_status='FAILED' then p_error else failure_reason end,updated_at=now() where id=o.communication_message_id returning * into m;
  return jsonb_build_object('id',m.id,'status',m.status,'outboxId',o.id,'attemptCount',o.attempt_count);
end $$;

create or replace function public.record_communication_delivery(p_clinic_id uuid,p_idempotency_key text,p_provider_message_id text,p_status text,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.communication_outbox%rowtype; m public.communication_messages%rowtype;
begin
  select * into o from public.communication_outbox where clinic_id=p_clinic_id and idempotency_key=p_idempotency_key for update;
  if o.id is null then raise exception 'OUTBOX_NOT_FOUND' using errcode='P0002'; end if;
  update public.communication_outbox set status=p_status,last_error=p_error,locked_at=null,updated_at=now() where id=o.id returning * into o;
  update public.communication_messages set provider_message_id=coalesce(p_provider_message_id,provider_message_id),status=p_status,sent_at=case when p_status in ('SENT','DELIVERED') then coalesce(sent_at,now()) else sent_at end,delivered_at=case when p_status='DELIVERED' then coalesce(delivered_at,now()) else delivered_at end,failed_at=case when p_status='FAILED' then now() else failed_at end,failure_reason=case when p_status='FAILED' then p_error else failure_reason end,updated_at=now() where id=o.communication_message_id returning * into m;
  return jsonb_build_object('id',m.id,'status',m.status,'providerMessageId',m.provider_message_id);
end $$;

create or replace function public.stage11_campaign_roi(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not (select private.stage11_has_permission(p_clinic_id,'marketing.read')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'campaignId',c.id,'externalId',c.external_campaign_id,'provider',c.provider,'name',c.name,'status',c.status,'dailyBudgetCents',c.daily_budget_cents,
    'attributedPatients',(select count(*) from public.patient_attribution pa where pa.clinic_id=p_clinic_id and pa.last_campaign_id=c.id),
    'signedBudgets',(select count(*) from public.budgets b
      where b.clinic_id=p_clinic_id and b.status='SIGNED'
        and (select t.campaign_id from public.patient_attribution_touchpoints t
             where t.clinic_id=b.clinic_id and t.patient_id=b.patient_id
               and t.occurred_at<=coalesce((select s.signed_at from public.budget_signed_snapshots s where s.budget_id=b.id and s.revision=b.revision order by s.signed_at desc limit 1),b.updated_at)
             order by t.occurred_at desc,t.created_at desc limit 1)=c.id),
    'invoicedCents',coalesce((select sum(i.total_cents) from public.invoices i
      where i.clinic_id=p_clinic_id and i.status in ('ISSUED','RECTIFIED')
        and (select t.campaign_id from public.patient_attribution_touchpoints t
             where t.clinic_id=i.clinic_id and t.patient_id=i.patient_id and t.occurred_at<=coalesce(i.issued_at,i.created_at)
             order by t.occurred_at desc,t.created_at desc limit 1)=c.id),0),
    'collectedCents',coalesce((select sum(p.amount_cents) from public.payments p
      where p.clinic_id=p_clinic_id and p.status='COMPLETED'
        and (select t.campaign_id from public.patient_attribution_touchpoints t
             where t.clinic_id=p.clinic_id and t.patient_id=p.patient_id and t.occurred_at<=p.paid_at
             order by t.occurred_at desc,t.created_at desc limit 1)=c.id),0)
  ) order by c.created_at desc) from public.marketing_campaigns c where c.clinic_id=p_clinic_id),'[]'::jsonb);
end $$;

revoke all on function public.create_marketing_campaign(uuid,text,text,text,bigint,text,text,text),public.update_marketing_campaign(uuid,text,text,bigint,integer),public.record_patient_attribution_touchpoint(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz),public.set_communication_consent(uuid,uuid,text,text,boolean,text,text,uuid),public.queue_communication(uuid,uuid,text,text,text,text,text,jsonb,timestamptz,uuid,text) from public,anon;
grant execute on function public.create_marketing_campaign(uuid,text,text,text,bigint,text,text,text),public.update_marketing_campaign(uuid,text,text,bigint,integer),public.record_patient_attribution_touchpoint(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,timestamptz),public.set_communication_consent(uuid,uuid,text,text,boolean,text,text,uuid),public.queue_communication(uuid,uuid,text,text,text,text,text,jsonb,timestamptz,uuid,text),public.stage11_campaign_roi(uuid) to authenticated;
revoke all on function public.record_communication_delivery(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_communication_delivery(uuid,text,text,text,text) to service_role;
revoke all on function public.claim_communication_outbox(integer),public.finish_communication_outbox(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_communication_outbox(integer),public.finish_communication_outbox(uuid,text,text,text,timestamptz) to service_role;

-- Audit + Broadcast all Stage 11 engagement tables.
do $$ declare t text; begin
  foreach t in array array['marketing_campaigns','patient_attribution_touchpoints','patient_attribution','communication_consents','communication_messages','communication_outbox'] loop
    execute format('drop trigger if exists %I_audit_mutation on public.%I',t,t);
    execute format('create trigger %I_audit_mutation after insert or update or delete on public.%I for each row execute function private.audit_sensitive_mutation()',t,t);
    execute format('drop trigger if exists denty_realtime_broadcast on public.%I',t);
    execute format('create trigger denty_realtime_broadcast after insert or update or delete on public.%I for each row execute function private.broadcast_denty_change()',t);
  end loop;
end $$;

commit;
