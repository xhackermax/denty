-- Appointment confirmation links and future-ready WhatsApp/SMS reminder settings.

create table if not exists public.appointment_messaging_settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  reminder_days_before integer not null default 7 check (reminder_days_before between 1 and 30),
  preferred_channel text not null default 'WHATSAPP' check (preferred_channel in ('WHATSAPP','SMS')),
  whatsapp_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  whatsapp_provider text not null default 'UNCONFIGURED',
  sms_provider text not null default 'UNCONFIGURED',
  whatsapp_from text,
  sms_from text,
  confirmation_link_base_url text,
  reminder_template text not null default 'Hola {{patientName}}, confirma tu cita en Denty para el {{appointmentDate}} a las {{appointmentTime}}: {{confirmationUrl}}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.appointment_confirmation_tokens (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  sent_at timestamptz,
  channel text check (channel in ('WHATSAPP','SMS')),
  communication_message_id uuid references public.communication_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(clinic_id, appointment_id)
);

create index if not exists appointment_confirmation_tokens_lookup_idx
  on public.appointment_confirmation_tokens(token)
  where used_at is null;
create index if not exists appointment_confirmation_tokens_due_idx
  on public.appointment_confirmation_tokens(clinic_id, expires_at);

alter table public.appointment_messaging_settings enable row level security;
alter table public.appointment_confirmation_tokens enable row level security;

revoke all on public.appointment_messaging_settings, public.appointment_confirmation_tokens from anon;
revoke insert, update, delete on public.appointment_messaging_settings, public.appointment_confirmation_tokens from authenticated;
grant select on public.appointment_messaging_settings, public.appointment_confirmation_tokens to authenticated;

drop policy if exists appointment_messaging_settings_admin_read on public.appointment_messaging_settings;
create policy appointment_messaging_settings_admin_read
on public.appointment_messaging_settings
for select to authenticated
using ((select private.stage11_has_permission(clinic_id, 'communications.read')));

drop policy if exists appointment_confirmation_tokens_admin_read on public.appointment_confirmation_tokens;
create policy appointment_confirmation_tokens_admin_read
on public.appointment_confirmation_tokens
for select to authenticated
using ((select private.stage11_has_permission(clinic_id, 'communications.read')));

create or replace function public.get_appointment_messaging_settings(p_clinic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.appointment_messaging_settings%rowtype;
begin
  if not (select private.stage11_has_permission(p_clinic_id, 'communications.read')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.appointment_messaging_settings(clinic_id)
  values (p_clinic_id)
  on conflict (clinic_id) do nothing;

  select * into v_settings
  from public.appointment_messaging_settings
  where clinic_id = p_clinic_id;

  return to_jsonb(v_settings);
end;
$$;

create or replace function public.update_appointment_messaging_settings(
  p_clinic_id uuid,
  p_reminder_days_before integer,
  p_preferred_channel text,
  p_whatsapp_enabled boolean,
  p_sms_enabled boolean,
  p_whatsapp_provider text,
  p_sms_provider text,
  p_whatsapp_from text default null,
  p_sms_from text default null,
  p_confirmation_link_base_url text default null,
  p_reminder_template text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.appointment_messaging_settings%rowtype;
begin
  if not (select private.stage11_has_permission(p_clinic_id, 'communications.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_preferred_channel not in ('WHATSAPP','SMS') then
    raise exception 'INVALID_CHANNEL' using errcode = '22023';
  end if;
  if coalesce(p_reminder_days_before, 7) not between 1 and 30 then
    raise exception 'INVALID_REMINDER_WINDOW' using errcode = '22023';
  end if;

  insert into public.appointment_messaging_settings(
    clinic_id,
    reminder_days_before,
    preferred_channel,
    whatsapp_enabled,
    sms_enabled,
    whatsapp_provider,
    sms_provider,
    whatsapp_from,
    sms_from,
    confirmation_link_base_url,
    reminder_template,
    updated_by
  )
  values (
    p_clinic_id,
    coalesce(p_reminder_days_before, 7),
    p_preferred_channel,
    coalesce(p_whatsapp_enabled, true),
    coalesce(p_sms_enabled, true),
    coalesce(nullif(btrim(p_whatsapp_provider), ''), 'UNCONFIGURED'),
    coalesce(nullif(btrim(p_sms_provider), ''), 'UNCONFIGURED'),
    nullif(btrim(coalesce(p_whatsapp_from, '')), ''),
    nullif(btrim(coalesce(p_sms_from, '')), ''),
    nullif(btrim(coalesce(p_confirmation_link_base_url, '')), ''),
    coalesce(nullif(btrim(p_reminder_template), ''), 'Hola {{patientName}}, confirma tu cita en Denty para el {{appointmentDate}} a las {{appointmentTime}}: {{confirmationUrl}}'),
    (select auth.uid())
  )
  on conflict (clinic_id) do update set
    reminder_days_before = excluded.reminder_days_before,
    preferred_channel = excluded.preferred_channel,
    whatsapp_enabled = excluded.whatsapp_enabled,
    sms_enabled = excluded.sms_enabled,
    whatsapp_provider = excluded.whatsapp_provider,
    sms_provider = excluded.sms_provider,
    whatsapp_from = excluded.whatsapp_from,
    sms_from = excluded.sms_from,
    confirmation_link_base_url = excluded.confirmation_link_base_url,
    reminder_template = excluded.reminder_template,
    updated_at = now(),
    updated_by = (select auth.uid())
  returning * into v_settings;

  return to_jsonb(v_settings);
end;
$$;

create or replace function public.create_appointment_confirmation_token(
  p_clinic_id uuid,
  p_appointment_id uuid,
  p_expires_at timestamptz default null,
  p_channel text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_token public.appointment_confirmation_tokens%rowtype;
begin
  if not (select private.stage11_has_permission(p_clinic_id, 'communications.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_appointment
  from public.appointments
  where id = p_appointment_id and clinic_id = p_clinic_id;
  if v_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.appointment_confirmation_tokens(
    clinic_id,
    appointment_id,
    patient_id,
    token,
    expires_at,
    channel
  )
  values (
    p_clinic_id,
    v_appointment.id,
    v_appointment.patient_id,
    encode(gen_random_bytes(32), 'hex'),
    coalesce(p_expires_at, v_appointment.starts_at + interval '12 hours'),
    p_channel
  )
  on conflict (clinic_id, appointment_id) do update set
    expires_at = greatest(public.appointment_confirmation_tokens.expires_at, excluded.expires_at),
    channel = coalesce(excluded.channel, public.appointment_confirmation_tokens.channel)
  returning * into v_token;

  return to_jsonb(v_token);
end;
$$;

create or replace function public.confirm_appointment_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.appointment_confirmation_tokens%rowtype;
  v_appointment public.appointments%rowtype;
  v_previous text;
begin
  select * into v_token
  from public.appointment_confirmation_tokens
  where token = p_token
  for update;

  if v_token.id is null then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_NOT_FOUND');
  end if;
  if v_token.expires_at < now() then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_EXPIRED');
  end if;

  select * into v_appointment
  from public.appointments
  where id = v_token.appointment_id
    and clinic_id = v_token.clinic_id
    and patient_id = v_token.patient_id
  for update;

  if v_appointment.id is null then
    return jsonb_build_object('ok', false, 'code', 'APPOINTMENT_NOT_FOUND');
  end if;
  if v_appointment.status in ('CANCELLED','NO_SHOW','COMPLETED') then
    return jsonb_build_object('ok', false, 'code', 'APPOINTMENT_CLOSED', 'status', v_appointment.status);
  end if;

  v_previous := v_appointment.status;
  if v_appointment.status <> 'CONFIRMED' then
    update public.appointments
    set status = 'CONFIRMED',
        version = version + 1,
        updated_at = now()
    where id = v_appointment.id
    returning * into v_appointment;

    insert into public.appointment_status_events(
      clinic_id,
      appointment_id,
      patient_id,
      previous_status,
      new_status,
      changed_by
    )
    values (
      v_appointment.clinic_id,
      v_appointment.id,
      v_appointment.patient_id,
      v_previous,
      'CONFIRMED',
      null
    );
  end if;

  update public.appointment_confirmation_tokens
  set used_at = coalesce(used_at, now())
  where id = v_token.id
  returning * into v_token;

  return jsonb_build_object(
    'ok', true,
    'appointmentId', v_appointment.id,
    'patientId', v_appointment.patient_id,
    'startsAt', v_appointment.starts_at,
    'status', v_appointment.status
  );
end;
$$;

create or replace function public.queue_appointment_confirmation_reminders(p_clinic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.appointment_messaging_settings%rowtype;
  v_appointment record;
  v_token public.appointment_confirmation_tokens%rowtype;
  v_channel text;
  v_base_url text;
  v_url text;
  v_body text;
  v_message jsonb;
  v_queued integer := 0;
  v_skipped integer := 0;
begin
  if not (select private.stage11_has_permission(p_clinic_id, 'communications.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.appointment_messaging_settings(clinic_id)
  values (p_clinic_id)
  on conflict (clinic_id) do nothing;

  select * into v_settings
  from public.appointment_messaging_settings
  where clinic_id = p_clinic_id;

  v_base_url := trim(trailing '/' from coalesce(v_settings.confirmation_link_base_url, ''));
  if v_base_url = '' then
    raise exception 'CONFIRMATION_BASE_URL_REQUIRED' using errcode = '22023';
  end if;

  for v_appointment in
    select a.*, p.first_name, p.last_name, p.phone
    from public.appointments a
    join public.patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id
    where a.clinic_id = p_clinic_id
      and a.status = 'PLANNED'
      and a.starts_at >= now() + make_interval(days => v_settings.reminder_days_before)
      and a.starts_at < now() + make_interval(days => v_settings.reminder_days_before + 1)
      and p.phone is not null
    order by a.starts_at
  loop
    v_channel := case
      when v_settings.preferred_channel = 'WHATSAPP' and v_settings.whatsapp_enabled then 'WHATSAPP'
      when v_settings.sms_enabled then 'SMS'
      else null
    end;

    if v_channel is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.appointment_confirmation_tokens(
      clinic_id,
      appointment_id,
      patient_id,
      token,
      expires_at,
      channel,
      sent_at
    )
    values (
      p_clinic_id,
      v_appointment.id,
      v_appointment.patient_id,
      encode(gen_random_bytes(32), 'hex'),
      v_appointment.starts_at + interval '12 hours',
      v_channel,
      now()
    )
    on conflict (clinic_id, appointment_id) do update set
      expires_at = greatest(public.appointment_confirmation_tokens.expires_at, excluded.expires_at),
      channel = excluded.channel,
      sent_at = coalesce(public.appointment_confirmation_tokens.sent_at, now())
    returning * into v_token;

    v_url := v_base_url || '/confirmar-cita/' || v_token.token;
    v_body := replace(v_settings.reminder_template, '{{patientName}}', btrim(coalesce(v_appointment.first_name, '') || ' ' || coalesce(v_appointment.last_name, '')));
    v_body := replace(v_body, '{{appointmentDate}}', to_char(v_appointment.starts_at at time zone 'Europe/Madrid', 'DD/MM/YYYY'));
    v_body := replace(v_body, '{{appointmentTime}}', to_char(v_appointment.starts_at at time zone 'Europe/Madrid', 'HH24:MI'));
    v_body := replace(v_body, '{{confirmationUrl}}', v_url);

    v_message := public.queue_communication(
      p_clinic_id,
      v_appointment.patient_id,
      v_channel,
      'APPOINTMENT_REMINDER',
      'Confirma tu cita',
      v_body,
      'APPOINTMENT_CONFIRMATION_LINK',
      jsonb_build_object(
        'appointmentId', v_appointment.id,
        'confirmationUrl', v_url,
        'tokenId', v_token.id,
        'providerReady', false,
        'whatsappProvider', v_settings.whatsapp_provider,
        'smsProvider', v_settings.sms_provider
      ),
      now(),
      null,
      'appointment-confirmation-' || v_appointment.id::text
    );

    update public.appointment_confirmation_tokens
    set communication_message_id = (v_message->>'id')::uuid
    where id = v_token.id;

    v_queued := v_queued + 1;
  end loop;

  return jsonb_build_object('queued', v_queued, 'skipped', v_skipped);
end;
$$;

create or replace function public.set_appointment_confirmation_status(
  p_appointment_id uuid,
  p_expected_version integer,
  p_new_status text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_previous text;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if v_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_staff(v_appointment.clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_appointment.version <> p_expected_version then
    return jsonb_build_object('conflict', true, 'currentVersion', v_appointment.version);
  end if;
  if p_new_status not in ('PLANNED','CONFIRMED','RUNNING_LATE') then
    raise exception 'INVALID_CONFIRMATION_STATUS' using errcode = '22023';
  end if;
  if v_appointment.status not in ('PLANNED','CONFIRMED','RUNNING_LATE') then
    raise exception 'INVALID_APPOINTMENT_TRANSITION:%->%', v_appointment.status, p_new_status using errcode = '22023';
  end if;

  v_previous := v_appointment.status;
  update public.appointments
  set status = p_new_status,
      reason = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), reason),
      version = version + case when status = p_new_status then 0 else 1 end,
      updated_at = now()
  where id = p_appointment_id
  returning * into v_appointment;

  if v_previous <> p_new_status then
    insert into public.appointment_status_events(
      clinic_id,
      appointment_id,
      patient_id,
      previous_status,
      new_status,
      changed_by
    )
    values (
      v_appointment.clinic_id,
      v_appointment.id,
      v_appointment.patient_id,
      v_previous,
      p_new_status,
      (select auth.uid())
    );
  end if;

  return to_jsonb(v_appointment);
end;
$$;

revoke all on function public.get_appointment_messaging_settings(uuid) from public, anon;
revoke all on function public.update_appointment_messaging_settings(uuid, integer, text, boolean, boolean, text, text, text, text, text, text) from public, anon;
revoke all on function public.create_appointment_confirmation_token(uuid, uuid, timestamptz, text) from public, anon;
revoke all on function public.confirm_appointment_by_token(text) from public, anon, authenticated;
revoke all on function public.queue_appointment_confirmation_reminders(uuid) from public, anon;
revoke all on function public.set_appointment_confirmation_status(uuid, integer, text, text) from public, anon;

grant execute on function public.get_appointment_messaging_settings(uuid) to authenticated;
grant execute on function public.update_appointment_messaging_settings(uuid, integer, text, boolean, boolean, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_appointment_confirmation_token(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.queue_appointment_confirmation_reminders(uuid) to authenticated;
grant execute on function public.set_appointment_confirmation_status(uuid, integer, text, text) to authenticated;
