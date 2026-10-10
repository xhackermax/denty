-- Clinic-specific birthday greetings, offers and discounts.
-- All three are commercial outreach: no promotional queueing without current consent.
-- Queueing is explicit and idempotent. Delivery requires a separate configured provider.

create table if not exists public.marketing_message_templates (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null check (kind in ('BIRTHDAY','OFFER','DISCOUNT')),
  channel text not null default 'WHATSAPP' check (channel in ('WHATSAPP','SMS','EMAIL')),
  enabled boolean not null default false,
  subject text not null check (length(subject) between 1 and 150),
  body text not null check (length(body) between 10 and 1000),
  offer_details text not null default '' check (length(offer_details) <= 500),
  discount_percent integer check (discount_percent between 1 and 100),
  valid_until date,
  contact_email text not null default '' check (length(contact_email) <= 160),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (clinic_id, kind),
  constraint marketing_templates_complete_offer check (
    not enabled or kind = 'BIRTHDAY' or (length(btrim(offer_details)) >= 10 and valid_until is not null)
  ),
  constraint marketing_templates_discount_only check (
    not enabled or kind <> 'DISCOUNT' or discount_percent is not null
  )
);

alter table public.marketing_message_templates enable row level security;
revoke all on public.marketing_message_templates from public, anon;
revoke insert,update,delete on public.marketing_message_templates from authenticated;
grant select on public.marketing_message_templates to authenticated;
drop policy if exists marketing_templates_read on public.marketing_message_templates;
create policy marketing_templates_read on public.marketing_message_templates
for select to authenticated
using ((select private.stage11_has_permission(clinic_id,'communications.read')));

create or replace function private.seed_marketing_templates(p_clinic uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 insert into public.marketing_message_templates
  (clinic_id,kind,channel,enabled,subject,body,offer_details)
 values
  (p_clinic,'BIRTHDAY','WHATSAPP',false,'Feliz cumpleaños',
   '¡Feliz cumpleaños, {{patientName}}! 🎂 Todo el equipo de {{clinicName}} te desea un bonito día.',''),
  (p_clinic,'OFFER','WHATSAPP',false,'Oferta especial',
   'Hola {{patientName}}, en {{clinicName}} tenemos esta oferta: {{offerDetails}}. Vigencia: {{validUntil}}.',''),
  (p_clinic,'DISCOUNT','WHATSAPP',false,'Descuento especial',
   'Hola {{patientName}}, en {{clinicName}} ofrecemos un {{discountPercent}}% de descuento: {{offerDetails}}. Hasta {{validUntil}}.','')
 on conflict(clinic_id,kind) do nothing;
end;
$$;
revoke all on function private.seed_marketing_templates(uuid) from public,anon,authenticated;

create or replace function private.seed_marketing_templates_on_clinic()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform private.seed_marketing_templates(new.id);
 return new;
end;
$$;
revoke all on function private.seed_marketing_templates_on_clinic() from public,anon,authenticated;
drop trigger if exists clinics_seed_marketing_templates on public.clinics;
create trigger clinics_seed_marketing_templates
after insert on public.clinics for each row
execute function private.seed_marketing_templates_on_clinic();

select private.seed_marketing_templates(c.id) from public.clinics c;

create or replace function public.list_marketing_message_templates(p_clinic_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_templates jsonb;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.read')) then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 perform private.seed_marketing_templates(p_clinic_id);
 select coalesce(jsonb_agg(to_jsonb(t) order by t.kind),'[]'::jsonb) into v_templates
 from public.marketing_message_templates t where t.clinic_id=p_clinic_id;
 return jsonb_build_object('items',v_templates);
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
 if p_enabled and p_channel='EMAIL'
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
 if v_template.channel='EMAIL' and
     v_template.contact_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' then
  raise exception 'UNSUBSCRIBE_ADDRESS_REQUIRED' using errcode='22023';
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
  if (v_template.channel='EMAIL' and nullif(btrim(coalesce(v_patient.email,'')),'') is null)
     or (v_template.channel in ('WHATSAPP','SMS')
         and nullif(btrim(coalesce(v_patient.phone,'')),'') is null) then
   v_skipped:=v_skipped+1; continue;
  end if;
  select cc.status into v_consent from public.communication_consents cc
   where cc.clinic_id=p_clinic_id and cc.patient_id=v_patient.id
    and cc.channel=v_template.channel and cc.purpose='MARKETING'
   order by cc.captured_at desc,cc.created_at desc limit 1;
  if coalesce(v_consent,'REVOKED')<>'GRANTED' then
   v_skipped:=v_skipped+1; continue;
  end if;
  v_body:=replace(v_template.body,'{{patientName}}',
    btrim(coalesce(v_patient.first_name,'')||' '||coalesce(v_patient.last_name,'')));
  v_body:=replace(v_body,'{{clinicName}}',v_clinic.name);
  v_body:=replace(v_body,'{{offerDetails}}',v_template.offer_details);
  v_body:=replace(v_body,'{{discountPercent}}',coalesce(v_template.discount_percent::text,''));
  v_body:=replace(v_body,'{{validUntil}}',coalesce(to_char(v_template.valid_until,'DD/MM/YYYY'),''));
  v_subject:=replace(v_template.subject,'{{clinicName}}',v_clinic.name);
  if p_kind<>'BIRTHDAY' then v_body:='PUBLICIDAD · '||v_clinic.name||'. '||v_body; end if;
  v_body:=v_body||case when v_template.channel='EMAIL'
   then E'\nPara dejar de recibir publicidad, escribe a '||v_template.contact_email||'.'
   else E'\nPara no recibir más ofertas, responde BAJA a este mensaje.' end;
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
   now(),null,v_key);
  v_queued:=v_queued+1;
 end loop;
 return jsonb_build_object('queued',v_queued,'skipped',v_skipped,'alreadyQueued',v_reused);
end;
$$;

revoke all on function public.list_marketing_message_templates(uuid) from public,anon;
grant execute on function public.list_marketing_message_templates(uuid) to authenticated;
revoke all on function public.save_marketing_message_template(uuid,text,text,boolean,text,text,text,integer,date,text) from public,anon;
grant execute on function public.save_marketing_message_template(uuid,text,text,boolean,text,text,text,integer,date,text) to authenticated;
revoke all on function public.queue_marketing_message_templates(uuid,text,uuid) from public,anon;
grant execute on function public.queue_marketing_message_templates(uuid,text,uuid) to authenticated;
