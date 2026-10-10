-- Safe patient communication: simulate recipients, avoid marketing fatigue and
-- respect a quiet window before calling the provider.
create table if not exists public.marketing_communication_policy (
 clinic_id uuid primary key references public.clinics(id) on delete cascade,
 min_days_between_messages integer not null default 21
   check (min_days_between_messages between 7 and 90),
 send_from_hour integer not null default 10 check(send_from_hour between 8 and 13),
 send_until_hour integer not null default 19 check(send_until_hour between 16 and 21),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 check(send_until_hour-send_from_hour>=5)
);
alter table public.marketing_communication_policy enable row level security;
revoke all on public.marketing_communication_policy from public,anon;
revoke insert,update,delete on public.marketing_communication_policy from authenticated;
grant select on public.marketing_communication_policy to authenticated;
drop policy if exists marketing_policy_read on public.marketing_communication_policy;
create policy marketing_policy_read on public.marketing_communication_policy
 for select to authenticated
 using((select private.stage11_has_permission(clinic_id,'communications.read')));
insert into public.marketing_communication_policy(clinic_id)
 select id from public.clinics on conflict(clinic_id) do nothing;

create or replace function private.init_marketing_policy()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.marketing_communication_policy(clinic_id)
 values(new.id) on conflict(clinic_id) do nothing;
 return new;
end;
$$;
revoke all on function private.init_marketing_policy() from public,anon,authenticated;
drop trigger if exists clinic_init_marketing_policy on public.clinics;
create trigger clinic_init_marketing_policy after insert on public.clinics
for each row execute function private.init_marketing_policy();

-- All enabled campaigns must have a real contact address for unsubscribe.
-- A "reply BAJA" shortcut is not assumed without a connected inbound webhook.
create or replace function private.require_marketing_contact_email()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.enabled and coalesce(new.contact_email,'') !~ '^[^ @]+@[^ @]+\.[^ @]+$' then
  raise exception 'MARKETING_UNSUBSCRIBE_CONTACT_REQUIRED' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.require_marketing_contact_email() from public,anon,authenticated;
drop trigger if exists require_marketing_unsubscribe on public.marketing_message_templates;
create trigger require_marketing_unsubscribe before insert or update
on public.marketing_message_templates
for each row execute function private.require_marketing_contact_email();

-- Shared eligibility for the preview and the eventual queueing operation.
create or replace function private.marketing_recipient_reason(
 p_clinic uuid,p_patient uuid,p_kind text,p_channel text,p_frequency_days int,p_today date
) returns text language plpgsql security definer set search_path='' as $$
declare v_patient public.patients%rowtype; v_consent text;
begin
 select * into v_patient from public.patients
  where clinic_id=p_clinic and id=p_patient and archived_at is null;
 if not found then return 'NOT_ACTIVE'; end if;
 -- Unknown age is not assumed to be adulthood.
 if v_patient.birth_date is null or
   v_patient.birth_date>(p_today-interval '18 years')::date then
   return 'UNDERAGE_OR_UNKNOWN_AGE';
 end if;
 if p_kind='BIRTHDAY' and not (
  to_char(v_patient.birth_date,'MM-DD')=to_char(p_today,'MM-DD') or
  (to_char(v_patient.birth_date,'MM-DD')='02-29'
   and to_char(p_today,'MM-DD')='02-28'
   and extract(day from (date_trunc('month',p_today::timestamp)
       + interval '1 month - 1 day'))=28)
 ) then return 'NOT_BIRTHDAY'; end if;
 if (p_channel='EMAIL' and nullif(btrim(coalesce(v_patient.email,'')),'') is null)
   or (p_channel in ('WHATSAPP','SMS')
    and nullif(btrim(coalesce(v_patient.phone,'')),'') is null)
  then return 'MISSING_CONTACT'; end if;
 select status into v_consent from public.communication_consents
  where clinic_id=p_clinic and patient_id=p_patient
   and channel=p_channel and purpose='MARKETING'
  order by captured_at desc,created_at desc limit 1;
 if coalesce(v_consent,'REVOKED')<>'GRANTED' then return 'NO_CONSENT'; end if;
 if exists(select 1 from public.communication_messages m
  where m.clinic_id=p_clinic and m.patient_id=p_patient
  and m.category='MARKETING' and m.status in ('QUEUED','SENT','DELIVERED')
  and m.created_at>now()-make_interval(days=>p_frequency_days))
  then return 'RECENT_PROMOTION'; end if;
 return 'ELIGIBLE';
end;
$$;
revoke all on function private.marketing_recipient_reason(uuid,uuid,text,text,int,date)
from public,anon,authenticated;

create or replace function public.get_marketing_communication_policy(p_clinic_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_policy public.marketing_communication_policy%rowtype;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.read')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 insert into public.marketing_communication_policy(clinic_id) values(p_clinic_id)
 on conflict(clinic_id) do nothing;
 select * into v_policy from public.marketing_communication_policy
 where clinic_id=p_clinic_id;
 return to_jsonb(v_policy);
end;
$$;

create or replace function public.save_marketing_communication_policy(
 p_clinic_id uuid,p_frequency_days int,p_start_hour int,p_end_hour int
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_policy public.marketing_communication_policy%rowtype;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.manage')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 insert into public.marketing_communication_policy(
  clinic_id,min_days_between_messages,send_from_hour,send_until_hour,updated_by)
 values(p_clinic_id,p_frequency_days,p_start_hour,p_end_hour,(select auth.uid()))
 on conflict(clinic_id) do update set
  min_days_between_messages=excluded.min_days_between_messages,
  send_from_hour=excluded.send_from_hour,send_until_hour=excluded.send_until_hour,
  updated_at=now(),updated_by=(select auth.uid())
 returning * into v_policy;
 return to_jsonb(v_policy);
end;
$$;

create or replace function public.save_marketing_message_template(
  p_clinic_id uuid,p_kind text,p_channel text,p_enabled boolean,
  p_subject text,p_body text,p_offer_details text default '',
  p_discount_percent integer default null,p_valid_until date default null,
  p_contact_email text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_record public.marketing_message_templates%rowtype;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.manage')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_kind not in ('BIRTHDAY','OFFER','DISCOUNT')
    or p_channel not in ('WHATSAPP','SMS','EMAIL')
    or length(btrim(coalesce(p_body,''))) < 10
    or length(btrim(coalesce(p_subject,''))) < 1 then
  raise exception 'INVALID_MESSAGE_TEMPLATE' using errcode='22023';
 end if;
 if p_enabled
    and btrim(coalesce(p_contact_email,'')) !~ '^[^ @]+@[^ @]+\.[^ @]+$' then
  raise exception 'CONTACT_EMAIL_REQUIRED_FOR_UNSUBSCRIBE' using errcode='22023';
 end if;
 if p_enabled and p_kind <> 'BIRTHDAY' and p_valid_until < (now() at time zone 'Europe/Madrid')::date then
  raise exception 'OFFER_HAS_EXPIRED' using errcode='22023';
 end if;
 insert into public.marketing_message_templates(
  clinic_id,kind,channel,enabled,subject,body,offer_details,
  discount_percent,valid_until,contact_email,updated_by)
 values (
  p_clinic_id,p_kind,p_channel,p_enabled,btrim(p_subject),btrim(p_body),
  btrim(coalesce(p_offer_details,'')),p_discount_percent,p_valid_until,
  btrim(coalesce(p_contact_email,'')),(select auth.uid())
 )
 on conflict(clinic_id,kind) do update set
  channel=excluded.channel, enabled=excluded.enabled,
  subject=excluded.subject,body=excluded.body,offer_details=excluded.offer_details,
  discount_percent=excluded.discount_percent,valid_until=excluded.valid_until,
  contact_email=excluded.contact_email,updated_at=now(),updated_by=(select auth.uid())
 returning * into v_record;
 return to_jsonb(v_record);
end;
$$;
create or replace function public.queue_marketing_message_templates(
  p_clinic_id uuid, p_kind text, p_patient_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_template public.marketing_message_templates%rowtype;
 v_clinic public.clinics%rowtype;
 v_patient record;
 v_body text;
 v_subject text;
 v_consent text;
 v_key text;
 v_now date := (now() at time zone 'Europe/Madrid')::date;
 v_queued integer := 0;
 v_skipped integer := 0;
 v_reused integer := 0;
 v_message jsonb;
 v_policy public.marketing_communication_policy%rowtype;
 v_reason text;
 v_local timestamp;
 v_scheduled timestamptz;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.manage')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_kind not in ('BIRTHDAY','OFFER','DISCOUNT') then
  raise exception 'INVALID_MARKETING_KIND' using errcode='22023';
 end if;
 if p_kind <> 'BIRTHDAY' and p_patient_id is null then
  raise exception 'RECIPIENT_REQUIRED_FOR_PROMOTION' using errcode='22023';
 end if;
 insert into public.marketing_communication_policy(clinic_id) values(p_clinic_id)
 on conflict(clinic_id) do nothing;
 select * into v_policy from public.marketing_communication_policy where clinic_id=p_clinic_id;
 select * into v_clinic from public.clinics where id=p_clinic_id;
 select * into v_template from public.marketing_message_templates
  where clinic_id=p_clinic_id and kind=p_kind;
 if v_clinic.id is null or v_template.clinic_id is null or not v_template.enabled then
  raise exception 'TEMPLATE_NOT_ACTIVE' using errcode='22023';
 end if;
 if p_kind <> 'BIRTHDAY' and (
    v_template.valid_until is null or v_template.valid_until < v_now
    or length(btrim(v_template.offer_details)) < 10
    or (p_kind='DISCOUNT' and v_template.discount_percent is null)
 ) then
  raise exception 'PROMOTION_NOT_VALID' using errcode='22023';
 end if;
 if v_template.contact_email !~ '^[^ @]+@[^ @]+[.][^ @]+$' then
  raise exception 'UNSUBSCRIBE_ADDRESS_REQUIRED' using errcode='22023';
 end if;
 v_local := now() at time zone 'Europe/Madrid';
 if v_local::time < make_time(v_policy.send_from_hour,0,0) then
   v_scheduled := (v_local::date + make_time(v_policy.send_from_hour,0,0))
                at time zone 'Europe/Madrid';
 elsif v_local::time >= make_time(v_policy.send_until_hour,0,0) then
   v_scheduled := ((v_local::date + 1) + make_time(v_policy.send_from_hour,0,0))
                at time zone 'Europe/Madrid';
 else v_scheduled := now();
 end if;
 for v_patient in
  select p.id, p.first_name, p.last_name, p.birth_date, p.phone, p.email
  from public.patients p
  where p.clinic_id=p_clinic_id and p.archived_at is null
   and (p_patient_id is null or p.id=p_patient_id)
   and (p_kind <> 'BIRTHDAY' or (
      p.birth_date is not null
      and (
       to_char(p.birth_date,'MM-DD')=to_char(v_now,'MM-DD')
       or (to_char(p.birth_date,'MM-DD')='02-29'
           and to_char(v_now,'MM-DD')='02-28'
           and extract(day from (date_trunc('month',v_now::timestamp)
             + interval '1 month - 1 day'))=28)
      )
   ))
  order by p.id
 loop
  v_reason:=private.marketing_recipient_reason(p_clinic_id,v_patient.id,
      p_kind,v_template.channel,v_policy.min_days_between_messages,v_now);
  if v_reason<>'ELIGIBLE' then v_skipped:=v_skipped+1;continue;end if;
  v_body:=replace(v_template.body,'{{patientName}}',
    btrim(coalesce(v_patient.first_name,'')||' '||coalesce(v_patient.last_name,'')));
  v_body:=replace(v_body,'{{clinicName}}',v_clinic.name);
  v_body:=replace(v_body,'{{offerDetails}}',v_template.offer_details);
  v_body:=replace(v_body,'{{discountPercent}}',coalesce(v_template.discount_percent::text,''));
  v_body:=replace(v_body,'{{validUntil}}',coalesce(to_char(v_template.valid_until,'DD/MM/YYYY'),''));
  v_subject:=replace(v_template.subject,'{{clinicName}}',v_clinic.name);
  if p_kind<>'BIRTHDAY' then v_body:='PUBLICIDAD · '||v_clinic.name||'. '||v_body; end if;
  v_body:=v_body||E'\nPara dejar de recibir estos mensajes, escribe a '||
      v_template.contact_email||'.';
  v_key:='marketing-template:'||p_kind||':'||p_clinic_id::text||':'||
   v_patient.id::text||':'||
   case when p_kind='BIRTHDAY' then to_char(v_now,'YYYY')
        else to_char(v_now,'YYYY-MM-DD') end;
  if exists(select 1 from public.communication_outbox co
    where co.clinic_id=p_clinic_id and co.idempotency_key=v_key) then
   v_reused:=v_reused+1;continue;
  end if;
  v_message:=public.queue_communication(
   p_clinic_id,v_patient.id,v_template.channel,'MARKETING',
   v_subject,v_body,'PROMOTION_'||p_kind,
   jsonb_build_object('kind',p_kind,'consentChecked',true,'providerReady',false),
   v_scheduled,null,v_key);
  v_queued:=v_queued+1;
 end loop;
 return jsonb_build_object('queued',v_queued,'skipped',v_skipped,'alreadyQueued',v_reused);
end;
$$;

create or replace function public.preview_marketing_template_recipients(
 p_clinic_id uuid,p_kind text,p_patient_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_template public.marketing_message_templates%rowtype;
 v_policy public.marketing_communication_policy%rowtype;
 v_patient record; v_reason text;
 v_groups jsonb := '{}'::jsonb; v_candidates int:=0;v_eligible int:=0;
 v_today date:=(now() at time zone 'Europe/Madrid')::date;
 v_local timestamp:=now() at time zone 'Europe/Madrid';
 v_scheduled timestamptz;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.manage')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_kind not in ('BIRTHDAY','OFFER','DISCOUNT')
    or (p_kind<>'BIRTHDAY' and p_patient_id is null) then
   raise exception 'INVALID_RECIPIENT_SCOPE' using errcode='22023';
 end if;
 select * into v_template from public.marketing_message_templates
 where clinic_id=p_clinic_id and kind=p_kind;
 select * into v_policy from public.marketing_communication_policy
 where clinic_id=p_clinic_id;
 if v_policy.clinic_id is null or v_template.clinic_id is null or not v_template.enabled
  then raise exception 'TEMPLATE_NOT_ACTIVE' using errcode='22023';end if;
 if v_template.contact_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' then
  raise exception 'UNSUBSCRIBE_CONTACT_REQUIRED' using errcode='22023';
 end if;
 if p_kind<>'BIRTHDAY' and
  (v_template.valid_until is null or v_template.valid_until<v_today) then
  raise exception 'PROMOTION_EXPIRED' using errcode='22023';
 end if;
 for v_patient in select id from public.patients
  where clinic_id=p_clinic_id and archived_at is null
    and (p_patient_id is null or id=p_patient_id)
    and (p_kind<>'BIRTHDAY' or (birth_date is not null
       and (to_char(birth_date,'MM-DD')=to_char(v_today,'MM-DD')
        or (to_char(birth_date,'MM-DD')='02-29'
            and to_char(v_today,'MM-DD')='02-28'
            and extract(day from (date_trunc('month',v_today::timestamp)
             + interval '1 month - 1 day'))=28))))
 loop
  v_candidates:=v_candidates+1;
  v_reason:=private.marketing_recipient_reason(p_clinic_id,v_patient.id,p_kind,
    v_template.channel,v_policy.min_days_between_messages,v_today);
  if v_reason='ELIGIBLE' then v_eligible:=v_eligible+1;
  else v_groups:=jsonb_set(v_groups,array[v_reason],
    to_jsonb(coalesce((v_groups->>v_reason)::int,0)+1),true);end if;
 end loop;
 if v_local::time<make_time(v_policy.send_from_hour,0,0) then
  v_scheduled:=(v_local::date+make_time(v_policy.send_from_hour,0,0))
   at time zone 'Europe/Madrid';
 elsif v_local::time>=make_time(v_policy.send_until_hour,0,0) then
  v_scheduled:=((v_local::date+1)+make_time(v_policy.send_from_hour,0,0))
   at time zone 'Europe/Madrid';
 else v_scheduled:=now();end if;
 return jsonb_build_object('candidates',v_candidates,'eligible',v_eligible,
  'excluded',v_groups,'scheduledAt',v_scheduled,'channel',v_template.channel);
end;
$$;

revoke all on function public.get_marketing_communication_policy(uuid) from public,anon;
grant execute on function public.get_marketing_communication_policy(uuid) to authenticated;
revoke all on function public.save_marketing_communication_policy(uuid,int,int,int) from public,anon;
grant execute on function public.save_marketing_communication_policy(uuid,int,int,int) to authenticated;
revoke all on function public.preview_marketing_template_recipients(uuid,text,uuid) from public,anon;
grant execute on function public.preview_marketing_template_recipients(uuid,text,uuid) to authenticated;
