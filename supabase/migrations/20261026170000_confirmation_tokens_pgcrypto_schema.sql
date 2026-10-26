-- pgcrypto lives in the extensions schema, so with search_path = '' the token
-- generators must call extensions.gen_random_bytes explicitly.
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
    encode(extensions.gen_random_bytes(32), 'hex'),
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
      encode(extensions.gen_random_bytes(32), 'hex'),
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
