-- Denty Games rewards are tied to a verified clinic arrival, not to the browser UI.

create table if not exists public.patient_game_plays (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  game_id text not null,
  status text not null default 'STARTED' check (status in ('STARTED','FINISHED')),
  score integer check (score is null or score >= 0),
  reward_eligible boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_game_vouchers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  amount_cents integer not null check (amount_cents between 100 and 500),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','APPLIED')),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by uuid
);

create unique index if not exists patient_game_vouchers_one_per_appointment_idx
  on public.patient_game_vouchers(appointment_id);
create index if not exists patient_game_plays_patient_started_idx
  on public.patient_game_plays(clinic_id, patient_id, started_at desc);
create index if not exists patient_game_plays_appointment_idx
  on public.patient_game_plays(appointment_id, status);
create index if not exists patient_game_vouchers_patient_idx
  on public.patient_game_vouchers(clinic_id, patient_id, created_at desc);

alter table public.patient_game_plays enable row level security;
alter table public.patient_game_vouchers enable row level security;

drop policy if exists patient_game_plays_select_access on public.patient_game_plays;
create policy patient_game_plays_select_access
  on public.patient_game_plays for select to authenticated
  using ((select private.can_access_patient(clinic_id, patient_id)));

drop policy if exists patient_game_vouchers_select_access on public.patient_game_vouchers;
create policy patient_game_vouchers_select_access
  on public.patient_game_vouchers for select to authenticated
  using ((select private.can_access_patient(clinic_id, patient_id)));

grant select on public.patient_game_plays to authenticated;
grant select on public.patient_game_vouchers to authenticated;

create or replace function private.game_patient_label(p_record_number text)
returns text language sql immutable set search_path = '' as $$
  select case
    when regexp_replace(coalesce(p_record_number,''), '\D', '', 'g') = '' then 'Ficha ••----'
    else 'Ficha ••' || lpad(right(regexp_replace(coalesce(p_record_number,''), '\D', '', 'g'), 4), 4, '0')
  end
$$;

create or replace function private.game_reward_cents(p_count integer)
returns integer language sql immutable set search_path = '' as $$
  select least(500, greatest(0, floor(greatest(coalesce(p_count,0),0) / 3.0)::integer * 100))
$$;

create or replace function private.current_arrived_game_appointment(
  p_clinic_id uuid,
  p_patient_id uuid
) returns public.appointments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  select a.* into v_appointment
  from public.appointments a
  where a.clinic_id = p_clinic_id
    and a.patient_id = p_patient_id
    and a.status in ('ARRIVED','WAITING')
    and coalesce(a.arrived_at, a.waiting_room_at) is not null
    and (a.starts_at at time zone 'Europe/Madrid')::date =
      (now() at time zone 'Europe/Madrid')::date
  order by coalesce(a.arrived_at, a.waiting_room_at) desc, a.starts_at desc
  limit 1;

  return v_appointment;
end;
$$;

create or replace function public.get_patient_game_dashboard(
  p_clinic_id uuid,
  p_patient_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
  v_appointment public.appointments%rowtype;
  v_count integer := 0;
  v_voucher public.patient_game_vouchers%rowtype;
begin
  if not (select private.can_access_patient(p_clinic_id, p_patient_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_patient
  from public.patients
  where id = p_patient_id and clinic_id = p_clinic_id;
  if v_patient.id is null then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_appointment := private.current_arrived_game_appointment(p_clinic_id, p_patient_id);
  if v_appointment.id is not null then
    select count(*)::integer into v_count
    from public.patient_game_plays
    where clinic_id = p_clinic_id
      and patient_id = p_patient_id
      and appointment_id = v_appointment.id
      and status = 'FINISHED'
      and reward_eligible;

    select * into v_voucher
    from public.patient_game_vouchers
    where appointment_id = v_appointment.id
    limit 1;
  end if;

  return jsonb_build_object(
    'patientId', p_patient_id,
    'profile', jsonb_build_object('label', private.game_patient_label(v_patient.record_number)),
    'visit', jsonb_build_object(
      'active', v_appointment.id is not null,
      'appointmentId', v_appointment.id,
      'rewardGamesCount', v_count,
      'rewardPotentialCents', private.game_reward_cents(v_count),
      'maxRewardCents', 500,
      'voucher', case when v_voucher.id is null then null else jsonb_build_object(
        'id', v_voucher.id,
        'amountCents', v_voucher.amount_cents,
        'status', v_voucher.status
      ) end
    ),
    'games', '[]'::jsonb
  );
end;
$$;

create or replace function public.start_patient_game_play(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_game_id text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_play public.patient_game_plays%rowtype;
begin
  if not (select private.can_access_patient(p_clinic_id, p_patient_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_appointment := private.current_arrived_game_appointment(p_clinic_id, p_patient_id);

  insert into public.patient_game_plays(
    clinic_id, patient_id, appointment_id, game_id, reward_eligible
  ) values (
    p_clinic_id, p_patient_id, v_appointment.id, left(btrim(p_game_id), 80),
    v_appointment.id is not null
  )
  returning * into v_play;

  return jsonb_build_object(
    'id', v_play.id,
    'playId', v_play.id,
    'rewardEligible', v_play.reward_eligible,
    'appointmentId', v_play.appointment_id
  );
end;
$$;

create or replace function public.finish_patient_game_play(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_play_id uuid,
  p_score integer default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_play public.patient_game_plays%rowtype;
  v_best integer;
begin
  if not (select private.can_access_patient(p_clinic_id, p_patient_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.patient_game_plays
  set status = 'FINISHED',
      score = greatest(coalesce(p_score, 0), 0),
      finished_at = coalesce(finished_at, now()),
      updated_at = now()
  where id = p_play_id
    and clinic_id = p_clinic_id
    and patient_id = p_patient_id
    and status = 'STARTED'
  returning * into v_play;

  if v_play.id is null then
    raise exception 'GAME_PLAY_NOT_FOUND' using errcode = 'P0002';
  end if;

  select max(score) into v_best
  from public.patient_game_plays
  where clinic_id = p_clinic_id
    and patient_id = p_patient_id
    and game_id = v_play.game_id
    and status = 'FINISHED';

  return jsonb_build_object(
    'id', v_play.id,
    'playId', v_play.id,
    'score', v_play.score,
    'personalBest', coalesce(v_best, v_play.score, 0),
    'recordImproved', coalesce(v_play.score, 0) >= coalesce(v_best, v_play.score, 0),
    'rewardEligible', v_play.reward_eligible
  );
end;
$$;

create or replace function public.create_patient_game_voucher(
  p_clinic_id uuid,
  p_patient_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_count integer;
  v_amount integer;
  v_voucher public.patient_game_vouchers%rowtype;
begin
  if not (select private.can_access_patient(p_clinic_id, p_patient_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_appointment := private.current_arrived_game_appointment(p_clinic_id, p_patient_id);
  if v_appointment.id is null then
    raise exception 'GAME_REWARD_REQUIRES_ARRIVAL' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_count
  from public.patient_game_plays
  where clinic_id = p_clinic_id
    and patient_id = p_patient_id
    and appointment_id = v_appointment.id
    and status = 'FINISHED'
    and reward_eligible;

  v_amount := private.game_reward_cents(v_count);
  if v_amount < 100 then
    raise exception 'GAME_REWARD_NOT_UNLOCKED' using errcode = 'P0001';
  end if;

  insert into public.patient_game_vouchers(clinic_id, patient_id, appointment_id, amount_cents)
  values(p_clinic_id, p_patient_id, v_appointment.id, v_amount)
  on conflict (appointment_id) do update set amount_cents = public.patient_game_vouchers.amount_cents
  returning * into v_voucher;

  return jsonb_build_object(
    'id', v_voucher.id,
    'patientId', v_voucher.patient_id,
    'appointmentId', v_voucher.appointment_id,
    'amountCents', v_voucher.amount_cents,
    'status', v_voucher.status
  );
end;
$$;

create or replace function public.apply_patient_game_voucher(
  p_clinic_id uuid,
  p_voucher_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_voucher public.patient_game_vouchers%rowtype;
begin
  if not (select private.has_finance_permission(p_clinic_id, 'finance.write')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.patient_game_vouchers
  set status = 'APPLIED',
      applied_at = coalesce(applied_at, now()),
      applied_by = coalesce(applied_by, (select auth.uid()))
  where id = p_voucher_id
    and clinic_id = p_clinic_id
    and status = 'AVAILABLE'
  returning * into v_voucher;

  if v_voucher.id is null then
    raise exception 'GAME_VOUCHER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_voucher.id,
    'patientId', v_voucher.patient_id,
    'appointmentId', v_voucher.appointment_id,
    'amountCents', v_voucher.amount_cents,
    'status', v_voucher.status
  );
end;
$$;

revoke all on function public.get_patient_game_dashboard(uuid, uuid) from public, anon;
revoke all on function public.start_patient_game_play(uuid, uuid, text) from public, anon;
revoke all on function public.finish_patient_game_play(uuid, uuid, uuid, integer) from public, anon;
revoke all on function public.create_patient_game_voucher(uuid, uuid) from public, anon;
revoke all on function public.apply_patient_game_voucher(uuid, uuid) from public, anon;

grant execute on function public.get_patient_game_dashboard(uuid, uuid) to authenticated;
grant execute on function public.start_patient_game_play(uuid, uuid, text) to authenticated;
grant execute on function public.finish_patient_game_play(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.create_patient_game_voucher(uuid, uuid) to authenticated;
grant execute on function public.apply_patient_game_voucher(uuid, uuid) to authenticated;
