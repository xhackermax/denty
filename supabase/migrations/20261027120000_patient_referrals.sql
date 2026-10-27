-- Pacientes asociados: who recommended whom, referral programs and a rewards ledger.
--
-- Additive only, no cascades from patients. Programs are created inactive and
-- with no preset amounts; nothing here sends a message. Rewards are rights
-- whose balance comes from the redemptions ledger, never an editable number.
-- Writes go through audited SECURITY DEFINER functions; tables are read-only
-- for authenticated staff with the right permission and invisible to patients.

-- Tenant keys so new tables can reference (clinic_id, id) and never cross clinics.
-- The same guarded keys are created by the recall centre migration.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_clinic_id_id_key') then
    alter table public.patients add constraint patients_clinic_id_id_key unique (clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sites_clinic_id_id_key') then
    alter table public.sites add constraint sites_clinic_id_id_key unique (clinic_id, id);
  end if;
end $$;

-- Role defaults mirror ROLE_PERMISSIONS in src/domain/permissions.ts; a row in
-- user_permissions overrides them. Includes the recall centre keys so whichever
-- of the two migrations runs last leaves the complete list.
create or replace function private.loyalty_has_permission(target_clinic_id uuid, target_permission text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_member uuid;
  v_role text;
  v_override boolean;
begin
  select cm.id, cm.role into v_member, v_role
  from public.clinic_members cm
  where cm.clinic_id = target_clinic_id and cm.profile_id = (select auth.uid()) and cm.active
  limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override
  from public.user_permissions up
  where up.clinic_member_id = v_member and up.permission = target_permission
  limit 1;
  if found then return coalesce(v_override, false); end if;
  return case v_role
    when 'ADMIN' then true
    when 'RECEPTION' then target_permission in (
      'recalls.read', 'recalls.manage', 'referrals.read', 'referrals.manage',
      'referral_rewards.read', 'referral_rewards.redeem')
    when 'DENTIST' then target_permission in (
      'recalls.read', 'recalls.manage', 'referrals.read', 'referral_rewards.read')
    when 'ASSISTANT' then target_permission in ('recalls.read')
    else false
  end;
end $$;

create or replace function private.madrid_day_start(p_date date)
returns timestamptz language sql stable set search_path = '' as $$
  select p_date::timestamp at time zone 'Europe/Madrid'
$$;

create table if not exists public.referral_programs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 3 and 100),
  site_id uuid,
  qualification text not null default 'APROBACION_MANUAL' check (qualification in (
    'PRIMERA_CITA_COMPLETADA', 'PRIMER_PAGO_CONFIRMADO', 'APROBACION_MANUAL')),
  referrer_reward_kind text not null default 'NONE'
    check (referrer_reward_kind in ('NONE','CREDIT','DISCOUNT_PERCENT','SERVICE','OTHER')),
  referrer_reward_value_cents bigint,
  referrer_reward_percent_bps integer,
  referrer_reward_description text check (char_length(referrer_reward_description) <= 200),
  referred_reward_kind text not null default 'NONE'
    check (referred_reward_kind in ('NONE','CREDIT','DISCOUNT_PERCENT','SERVICE','OTHER')),
  referred_reward_value_cents bigint,
  referred_reward_percent_bps integer,
  referred_reward_description text check (char_length(referred_reward_description) <= 200),
  max_referrals_per_referrer integer check (max_referrals_per_referrer > 0),
  validity_days integer check (validity_days between 1 and 3650),
  starts_at timestamptz,
  ends_at timestamptz,
  terms text not null check (char_length(btrim(terms)) between 1 and 5000),
  active boolean not null default false,
  version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_programs_clinic_id_id_key unique (clinic_id, id),
  constraint referral_programs_site_fkey foreign key (clinic_id, site_id)
    references public.sites(clinic_id, id),
  constraint referral_programs_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  -- Each side's reward carries exactly the value its kind needs. The checks are
  -- wrapped in coalesce because a NULL comparison would otherwise pass.
  constraint referral_programs_referrer_reward_check check (coalesce(
    (referrer_reward_kind = 'NONE' and referrer_reward_value_cents is null and referrer_reward_percent_bps is null)
    or (referrer_reward_kind = 'CREDIT' and referrer_reward_value_cents > 0 and referrer_reward_percent_bps is null)
    or (referrer_reward_kind = 'DISCOUNT_PERCENT' and referrer_reward_percent_bps between 1 and 10000
        and referrer_reward_value_cents is null)
    or (referrer_reward_kind in ('SERVICE','OTHER') and referrer_reward_value_cents is null
        and referrer_reward_percent_bps is null and char_length(btrim(referrer_reward_description)) > 0),
    false)),
  constraint referral_programs_referred_reward_check check (coalesce(
    (referred_reward_kind = 'NONE' and referred_reward_value_cents is null and referred_reward_percent_bps is null)
    or (referred_reward_kind = 'CREDIT' and referred_reward_value_cents > 0 and referred_reward_percent_bps is null)
    or (referred_reward_kind = 'DISCOUNT_PERCENT' and referred_reward_percent_bps between 1 and 10000
        and referred_reward_value_cents is null)
    or (referred_reward_kind in ('SERVICE','OTHER') and referred_reward_value_cents is null
        and referred_reward_percent_bps is null and char_length(btrim(referred_reward_description)) > 0),
    false))
);

create table if not exists public.patient_referrals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  referrer_patient_id uuid not null,
  referred_patient_id uuid not null,
  program_id uuid,
  site_id uuid,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','VOID')),
  source text not null check (source in (
    'DECLARADO_EN_RECEPCION','FORMULARIO','CODIGO_QR','PORTAL','OTRO')),
  reported_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text check (char_length(void_reason) <= 300),
  notes text check (char_length(notes) <= 500),
  replaces_referral_id uuid references public.patient_referrals(id),
  version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_referrals_clinic_id_id_key unique (clinic_id, id),
  constraint patient_referrals_not_self check (referrer_patient_id <> referred_patient_id),
  constraint patient_referrals_void_check check (coalesce(
    status <> 'VOID' or (voided_at is not null and char_length(btrim(void_reason)) > 0),
    false)),
  constraint patient_referrals_confirmed_check check (status <> 'CONFIRMED' or confirmed_at is not null),
  constraint patient_referrals_referrer_fkey foreign key (clinic_id, referrer_patient_id)
    references public.patients(clinic_id, id),
  constraint patient_referrals_referred_fkey foreign key (clinic_id, referred_patient_id)
    references public.patients(clinic_id, id),
  constraint patient_referrals_program_fkey foreign key (clinic_id, program_id)
    references public.referral_programs(clinic_id, id),
  constraint patient_referrals_site_fkey foreign key (clinic_id, site_id)
    references public.sites(clinic_id, id)
);

-- One active referrer per referred patient.
create unique index if not exists patient_referrals_active_referred
  on public.patient_referrals(clinic_id, referred_patient_id) where status in ('PENDING','CONFIRMED');
create index if not exists patient_referrals_referrer_idx
  on public.patient_referrals(clinic_id, referrer_patient_id, created_at);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  referral_id uuid not null,
  program_id uuid not null,
  beneficiary_patient_id uuid not null,
  beneficiary_role text not null check (beneficiary_role in ('REFERRER','REFERRED')),
  reward_kind text not null check (reward_kind in ('CREDIT','DISCOUNT_PERCENT','SERVICE','OTHER')),
  value_cents bigint,
  percent_bps integer,
  description text,
  terms_snapshot jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','EARNED','EXPIRED','CANCELLED')),
  qualified_appointment_id uuid references public.appointments(id),
  qualification_reference text check (char_length(qualification_reference) <= 200),
  earned_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_rewards_clinic_id_id_key unique (clinic_id, id),
  constraint referral_rewards_once unique (referral_id, program_id, beneficiary_role),
  constraint referral_rewards_referral_fkey foreign key (clinic_id, referral_id)
    references public.patient_referrals(clinic_id, id),
  constraint referral_rewards_program_fkey foreign key (clinic_id, program_id)
    references public.referral_programs(clinic_id, id),
  constraint referral_rewards_beneficiary_fkey foreign key (clinic_id, beneficiary_patient_id)
    references public.patients(clinic_id, id),
  constraint referral_rewards_value_check check (coalesce(
    (reward_kind = 'CREDIT' and value_cents > 0 and percent_bps is null)
    or (reward_kind = 'DISCOUNT_PERCENT' and percent_bps between 1 and 10000 and value_cents is null)
    or (reward_kind in ('SERVICE','OTHER') and value_cents is null and percent_bps is null),
    false)),
  constraint referral_rewards_earned_check check (status <> 'EARNED' or earned_at is not null),
  constraint referral_rewards_cancel_check check (status <> 'CANCELLED' or cancelled_at is not null)
);
create index if not exists referral_rewards_beneficiary_idx
  on public.referral_rewards(clinic_id, beneficiary_patient_id, status);

create table if not exists public.referral_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  reward_id uuid not null,
  invoice_id uuid references public.invoices(id),
  budget_id uuid references public.budgets(id),
  amount_cents bigint check (amount_cents > 0),
  status text not null default 'APPLIED' check (status in ('APPLIED','REVERSED')),
  reason text check (char_length(reason) <= 300),
  reversal_reason text check (char_length(reversal_reason) <= 300),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  reversed_by uuid references public.profiles(id),
  reversed_at timestamptz,
  constraint referral_reward_redemptions_idempotency unique (clinic_id, idempotency_key),
  constraint referral_reward_redemptions_reward_fkey foreign key (clinic_id, reward_id)
    references public.referral_rewards(clinic_id, id),
  constraint referral_reward_redemptions_reversal_check check (coalesce(
    status = 'APPLIED' or (reversed_at is not null and char_length(btrim(reversal_reason)) > 0),
    false))
);
create index if not exists referral_reward_redemptions_reward_idx
  on public.referral_reward_redemptions(clinic_id, reward_id, status);

-- Version and timestamp on every change, so clients can detect concurrent edits.
create or replace function private.referral_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists referral_programs_touch on public.referral_programs;
create trigger referral_programs_touch before update on public.referral_programs
  for each row execute function private.referral_touch();
drop trigger if exists patient_referrals_touch on public.patient_referrals;
create trigger patient_referrals_touch before update on public.patient_referrals
  for each row execute function private.referral_touch();
drop trigger if exists referral_rewards_touch on public.referral_rewards;
create trigger referral_rewards_touch before update on public.referral_rewards
  for each row execute function private.referral_touch();

-- A referral may not close a loop (A→B→A, A→B→C→A…). The clinic-wide lock
-- serialises graph changes so two concurrent inserts cannot build a cycle.
create or replace function private.referral_prevent_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'VOID' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('patient_referrals:' || new.clinic_id::text, 0));
  if exists (
    with recursive up(patient_id, depth) as (
      select new.referrer_patient_id, 0
      union
      select r.referrer_patient_id, up.depth + 1
      from up
      join public.patient_referrals r
        on r.clinic_id = new.clinic_id and r.referred_patient_id = up.patient_id
       and r.status in ('PENDING','CONFIRMED') and r.id <> new.id
      where up.depth < 1000
    )
    select 1 from up where up.patient_id = new.referred_patient_id
  ) then
    raise exception 'REFERRAL_CYCLE' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists patient_referrals_prevent_cycle on public.patient_referrals;
create trigger patient_referrals_prevent_cycle
  before insert or update of referrer_patient_id, referred_patient_id, status on public.patient_referrals
  for each row execute function private.referral_prevent_cycle();

create or replace function private.referral_audit(
  p_clinic_id uuid, p_action text, p_entity_type text, p_entity_id uuid,
  p_patient_id uuid, p_before jsonb, p_after jsonb, p_metadata jsonb default '{}'::jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log(
    clinic_id, actor_profile_id, patient_id, action, entity_type, entity_id,
    metadata, before_json, after_json
  ) values (
    p_clinic_id, (select auth.uid()), p_patient_id, p_action, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb), p_before, p_after
  )
$$;

-- Mirrors deriveRewardState in src/domain/referrals.ts (checked by the contract test).
create or replace function private.referral_reward_state(
  p_status text, p_kind text, p_value_cents bigint, p_applied_cents bigint,
  p_applied_count integer, p_expires_at timestamptz, p_now timestamptz
) returns text language sql immutable set search_path = '' as $$
  select case
    when p_status = 'PENDING' then 'PENDIENTE'
    when p_status = 'CANCELLED' then 'CANCELADO'
    when p_status = 'EXPIRED' then 'VENCIDO'
    when (p_kind = 'CREDIT' and greatest(coalesce(p_value_cents, 0) - p_applied_cents, 0) = 0)
      or (p_kind <> 'CREDIT' and p_applied_count > 0) then 'USADO'
    when p_expires_at is not null and p_expires_at < p_now then 'VENCIDO'
    when p_applied_count > 0 then 'PARCIAL'
    else 'DISPONIBLE'
  end
$$;

create or replace function private.referral_program_json(p public.referral_programs)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'siteId', p.site_id, 'qualification', p.qualification,
    'referrerReward', jsonb_build_object('kind', p.referrer_reward_kind,
      'valueCents', p.referrer_reward_value_cents, 'percentBps', p.referrer_reward_percent_bps,
      'description', p.referrer_reward_description),
    'referredReward', jsonb_build_object('kind', p.referred_reward_kind,
      'valueCents', p.referred_reward_value_cents, 'percentBps', p.referred_reward_percent_bps,
      'description', p.referred_reward_description),
    'maxReferralsPerReferrer', p.max_referrals_per_referrer, 'validityDays', p.validity_days,
    'startsAt', p.starts_at, 'endsAt', p.ends_at, 'terms', p.terms, 'active', p.active,
    'version', p.version, 'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'referralCount', (select count(*) from public.patient_referrals r
      where r.clinic_id = p.clinic_id and r.program_id = p.id and r.status <> 'VOID')
  )
$$;

create or replace function private.referral_item_json(r public.patient_referrals)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'status', r.status, 'source', r.source, 'reportedAt', r.reported_at,
    'confirmedAt', r.confirmed_at, 'voidedAt', r.voided_at, 'voidReason', r.void_reason,
    'notes', r.notes, 'version', r.version, 'createdAt', r.created_at,
    'referrer', jsonb_build_object('id', a.id,
      'name', btrim(a.first_name || ' ' || a.last_name), 'recordNumber', a.record_number),
    'referred', jsonb_build_object('id', b.id,
      'name', btrim(b.first_name || ' ' || b.last_name), 'recordNumber', b.record_number),
    'programId', r.program_id, 'programName', p.name,
    'siteId', r.site_id, 'siteName', s.name,
    'rewardCount', (select count(*) from public.referral_rewards w
      where w.clinic_id = r.clinic_id and w.referral_id = r.id and w.status <> 'CANCELLED')
  )
  from public.patients a, public.patients b
  left join public.referral_programs p on p.clinic_id = r.clinic_id and p.id = r.program_id
  left join public.sites s on s.clinic_id = r.clinic_id and s.id = r.site_id
  where a.clinic_id = r.clinic_id and a.id = r.referrer_patient_id
    and b.clinic_id = r.clinic_id and b.id = r.referred_patient_id
$$;

create or replace function private.referral_reward_json(w public.referral_rewards, p_now timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  with totals as (
    select coalesce(sum(x.amount_cents), 0)::bigint as applied_cents, count(*)::integer as applied_count,
      max(x.created_at) as last_movement_at
    from public.referral_reward_redemptions x
    where x.clinic_id = w.clinic_id and x.reward_id = w.id and x.status = 'APPLIED'
  )
  select jsonb_build_object(
    'id', w.id, 'referralId', w.referral_id, 'programId', w.program_id,
    'programName', w.terms_snapshot->>'programName',
    'qualification', w.terms_snapshot->>'qualification',
    'beneficiary', jsonb_build_object('id', b.id,
      'name', btrim(b.first_name || ' ' || b.last_name), 'recordNumber', b.record_number),
    'beneficiaryRole', w.beneficiary_role,
    'origin', jsonb_build_object('id', o.id, 'name', btrim(o.first_name || ' ' || o.last_name)),
    'kind', w.reward_kind, 'valueCents', w.value_cents, 'percentBps', w.percent_bps,
    'description', w.description, 'status', w.status,
    'state', private.referral_reward_state(w.status, w.reward_kind, w.value_cents,
      t.applied_cents, t.applied_count, w.expires_at, p_now),
    'appliedCents', t.applied_cents, 'appliedCount', t.applied_count,
    'remainingCents', case when w.reward_kind = 'CREDIT'
      then greatest(w.value_cents - t.applied_cents, 0) end,
    'earnedAt', w.earned_at, 'expiresAt', w.expires_at,
    'qualificationReference', w.qualification_reference,
    'cancelReason', w.cancel_reason,
    'lastMovementAt', greatest(t.last_movement_at, w.updated_at),
    'version', w.version, 'createdAt', w.created_at
  )
  from totals t, public.patient_referrals r
  join public.patients b on b.clinic_id = r.clinic_id and b.id = w.beneficiary_patient_id
  -- The "origin" is the other side of the referral, shown to authorised staff only.
  join public.patients o on o.clinic_id = r.clinic_id and o.id = case w.beneficiary_role
    when 'REFERRER' then r.referred_patient_id else r.referrer_patient_id end
  where r.clinic_id = w.clinic_id and r.id = w.referral_id
$$;

-- Marks a pending reward as earned; the validity window starts now.
create or replace function private.referral_earn(
  w public.referral_rewards, p_appointment_id uuid, p_reference text
) returns public.referral_rewards language plpgsql security definer set search_path = '' as $$
declare
  v_days integer := (w.terms_snapshot->>'validityDays')::integer;
  v_result public.referral_rewards;
begin
  update public.referral_rewards set status = 'EARNED', earned_at = now(),
    expires_at = case when v_days is null then null else now() + make_interval(days => v_days) end,
    qualified_appointment_id = coalesce(p_appointment_id, qualified_appointment_id),
    qualification_reference = coalesce(nullif(btrim(p_reference), ''), qualification_reference)
  where id = w.id returning * into v_result;
  perform private.referral_audit(w.clinic_id, 'REWARD_EARNED', 'referral_reward', w.id,
    w.beneficiary_patient_id, jsonb_build_object('status', w.status),
    jsonb_build_object('status', 'EARNED', 'appointmentId', p_appointment_id));
  return v_result;
end $$;

-- Rewards are created when a referral is confirmed, from a snapshot of the
-- program at that moment; later edits of the program never touch them.
create or replace function private.referral_generate_rewards(r public.patient_referrals)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  p public.referral_programs;
  v_role text;
  v_kind text;
  v_value bigint;
  v_bps integer;
  v_description text;
  v_patient uuid;
  v_created integer := 0;
  w public.referral_rewards;
  v_appointment uuid;
begin
  if r.program_id is null then return 0; end if;
  select * into p from public.referral_programs x where x.clinic_id = r.clinic_id and x.id = r.program_id;
  if not found or not p.active
     or (p.starts_at is not null and now() < p.starts_at)
     or (p.ends_at is not null and now() > p.ends_at)
     or (p.site_id is not null and p.site_id is distinct from r.site_id) then
    return 0;
  end if;
  foreach v_role in array array['REFERRER','REFERRED'] loop
    if v_role = 'REFERRER' then
      v_kind := p.referrer_reward_kind; v_value := p.referrer_reward_value_cents;
      v_bps := p.referrer_reward_percent_bps; v_description := p.referrer_reward_description;
      v_patient := r.referrer_patient_id;
      if p.max_referrals_per_referrer is not null and (
        select count(*) from public.referral_rewards x
        join public.patient_referrals y on y.clinic_id = x.clinic_id and y.id = x.referral_id
        where x.clinic_id = r.clinic_id and x.program_id = p.id and x.beneficiary_role = 'REFERRER'
          and y.referrer_patient_id = r.referrer_patient_id and x.status <> 'CANCELLED'
      ) >= p.max_referrals_per_referrer then
        continue;
      end if;
    else
      v_kind := p.referred_reward_kind; v_value := p.referred_reward_value_cents;
      v_bps := p.referred_reward_percent_bps; v_description := p.referred_reward_description;
      v_patient := r.referred_patient_id;
    end if;
    continue when v_kind = 'NONE';
    insert into public.referral_rewards(
      clinic_id, referral_id, program_id, beneficiary_patient_id, beneficiary_role,
      reward_kind, value_cents, percent_bps, description, terms_snapshot
    ) values (
      r.clinic_id, r.id, p.id, v_patient, v_role, v_kind, v_value, v_bps, v_description,
      jsonb_build_object('programId', p.id, 'programName', p.name, 'programVersion', p.version,
        'qualification', p.qualification, 'validityDays', p.validity_days, 'terms', p.terms,
        'kind', v_kind, 'valueCents', v_value, 'percentBps', v_bps, 'description', v_description)
    ) on conflict (referral_id, program_id, beneficiary_role) do nothing
    returning * into w;
    if w.id is null then continue; end if;
    v_created := v_created + 1;
    perform private.referral_audit(r.clinic_id, 'REWARD_CREATED', 'referral_reward', w.id,
      v_patient, null, jsonb_build_object('kind', v_kind, 'valueCents', v_value, 'percentBps', v_bps));
    -- The referred patient may already have had the qualifying visit.
    if p.qualification = 'PRIMERA_CITA_COMPLETADA' then
      select a.id into v_appointment from public.appointments a
      where a.clinic_id = r.clinic_id and a.patient_id = r.referred_patient_id
        and a.status = 'COMPLETED' and a.starts_at >= r.reported_at
      order by a.starts_at limit 1;
      if v_appointment is not null then perform private.referral_earn(w, v_appointment, null); end if;
    end if;
    w := null;
  end loop;
  return v_created;
end $$;

create or replace function private.referral_rewards_on_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  w public.referral_rewards;
begin
  if new.status <> 'COMPLETED' or old.status = 'COMPLETED' then return new; end if;
  for w in
    select x.* from public.referral_rewards x
    join public.patient_referrals r on r.clinic_id = x.clinic_id and r.id = x.referral_id
    where x.clinic_id = new.clinic_id and r.referred_patient_id = new.patient_id
      and r.status = 'CONFIRMED' and x.status = 'PENDING'
      and x.terms_snapshot->>'qualification' = 'PRIMERA_CITA_COMPLETADA'
      and new.starts_at >= r.reported_at
    for update of x
  loop
    perform private.referral_earn(w, new.id, null);
  end loop;
  return new;
end $$;

drop trigger if exists appointments_referral_rewards on public.appointments;
create trigger appointments_referral_rewards after update of status on public.appointments
  for each row execute function private.referral_rewards_on_appointment();

-- ---------------------------------------------------------------------------
-- Programs
-- ---------------------------------------------------------------------------

create or replace function public.referral_programs_list(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(private.referral_program_json(p) order by p.active desc, p.name)
    from public.referral_programs p where p.clinic_id = p_clinic_id
  ), '[]'::jsonb));
end $$;

create or replace function public.referral_program_save(
  p_clinic_id uuid, p_program_id uuid, p_payload jsonb, p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.referral_programs;
  v_before jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_programs.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_program_id is null then
    insert into public.referral_programs(
      clinic_id, name, site_id, qualification,
      referrer_reward_kind, referrer_reward_value_cents, referrer_reward_percent_bps,
      referrer_reward_description, referred_reward_kind, referred_reward_value_cents,
      referred_reward_percent_bps, referred_reward_description, max_referrals_per_referrer,
      validity_days, starts_at, ends_at, terms, active, created_by, updated_by
    ) values (
      p_clinic_id, btrim(p_payload->>'name'), (p_payload->>'siteId')::uuid,
      coalesce(p_payload->>'qualification', 'APROBACION_MANUAL'),
      coalesce(p_payload#>>'{referrerReward,kind}', 'NONE'),
      (p_payload#>>'{referrerReward,valueCents}')::bigint,
      (p_payload#>>'{referrerReward,percentBps}')::integer,
      nullif(btrim(p_payload#>>'{referrerReward,description}'), ''),
      coalesce(p_payload#>>'{referredReward,kind}', 'NONE'),
      (p_payload#>>'{referredReward,valueCents}')::bigint,
      (p_payload#>>'{referredReward,percentBps}')::integer,
      nullif(btrim(p_payload#>>'{referredReward,description}'), ''),
      (p_payload->>'maxReferralsPerReferrer')::integer, (p_payload->>'validityDays')::integer,
      (p_payload->>'startsAt')::timestamptz, (p_payload->>'endsAt')::timestamptz,
      btrim(p_payload->>'terms'), coalesce((p_payload->>'active')::boolean, false),
      (select auth.uid()), (select auth.uid())
    ) returning * into p;
    perform private.referral_audit(p_clinic_id, 'PROGRAM_CREATED', 'referral_program', p.id,
      null, null, private.referral_program_json(p));
    return private.referral_program_json(p);
  end if;

  select * into p from public.referral_programs x
  where x.clinic_id = p_clinic_id and x.id = p_program_id for update;
  if not found then raise exception 'REFERRAL_PROGRAM_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_version is not null and p.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  v_before := private.referral_program_json(p);
  update public.referral_programs set
    name = btrim(p_payload->>'name'), site_id = (p_payload->>'siteId')::uuid,
    qualification = coalesce(p_payload->>'qualification', 'APROBACION_MANUAL'),
    referrer_reward_kind = coalesce(p_payload#>>'{referrerReward,kind}', 'NONE'),
    referrer_reward_value_cents = (p_payload#>>'{referrerReward,valueCents}')::bigint,
    referrer_reward_percent_bps = (p_payload#>>'{referrerReward,percentBps}')::integer,
    referrer_reward_description = nullif(btrim(p_payload#>>'{referrerReward,description}'), ''),
    referred_reward_kind = coalesce(p_payload#>>'{referredReward,kind}', 'NONE'),
    referred_reward_value_cents = (p_payload#>>'{referredReward,valueCents}')::bigint,
    referred_reward_percent_bps = (p_payload#>>'{referredReward,percentBps}')::integer,
    referred_reward_description = nullif(btrim(p_payload#>>'{referredReward,description}'), ''),
    max_referrals_per_referrer = (p_payload->>'maxReferralsPerReferrer')::integer,
    validity_days = (p_payload->>'validityDays')::integer,
    starts_at = (p_payload->>'startsAt')::timestamptz, ends_at = (p_payload->>'endsAt')::timestamptz,
    terms = btrim(p_payload->>'terms'), active = coalesce((p_payload->>'active')::boolean, false),
    updated_by = (select auth.uid())
  where id = p.id returning * into p;
  perform private.referral_audit(p_clinic_id, 'PROGRAM_UPDATED', 'referral_program', p.id,
    null, v_before, private.referral_program_json(p));
  return private.referral_program_json(p);
end $$;

-- ---------------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------------

create or replace function public.referral_list(
  p_clinic_id uuid, p_filters jsonb default '{}'::jsonb,
  p_page integer default 1, p_page_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_search text := nullif(btrim(v_filters->>'search'), '');
  v_result jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_page is null or p_page < 1 or p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'INVALID_REFERRAL_FILTER' using errcode = '22023';
  end if;
  with scoped as (
    select r from public.patient_referrals r
    join public.patients a on a.clinic_id = r.clinic_id and a.id = r.referrer_patient_id
    join public.patients b on b.clinic_id = r.clinic_id and b.id = r.referred_patient_id
    where r.clinic_id = p_clinic_id
      and (v_filters->>'patientId' is null or (v_filters->>'patientId')::uuid in
           (r.referrer_patient_id, r.referred_patient_id))
      and (v_filters->>'referrerPatientId' is null
           or r.referrer_patient_id = (v_filters->>'referrerPatientId')::uuid)
      and (v_filters->>'programId' is null or r.program_id = (v_filters->>'programId')::uuid)
      and (v_filters->>'siteId' is null or r.site_id = (v_filters->>'siteId')::uuid)
      and (v_filters->>'from' is null
           or r.reported_at >= private.madrid_day_start((v_filters->>'from')::date))
      and (v_filters->>'to' is null
           or r.reported_at < private.madrid_day_start((v_filters->>'to')::date + 1))
      and (v_search is null
           or v_search in (a.record_number, b.record_number)
           or (a.first_name || ' ' || a.last_name) ilike '%' || v_search || '%'
           or (b.first_name || ' ' || b.last_name) ilike '%' || v_search || '%')
  ),
  filtered as (
    select * from scoped s
    where (v_filters->>'status' is null and (s.r).status <> 'VOID')
       or (s.r).status = v_filters->>'status'
  ),
  rewards as (
    select x.*, private.referral_reward_state(x.status, x.reward_kind, x.value_cents,
      coalesce(t.applied_cents, 0), coalesce(t.applied_count, 0), x.expires_at, now()) as state
    from public.referral_rewards x
    left join lateral (
      select sum(d.amount_cents)::bigint as applied_cents, count(*)::integer as applied_count
      from public.referral_reward_redemptions d
      where d.clinic_id = x.clinic_id and d.reward_id = x.id and d.status = 'APPLIED'
    ) t on true
    where x.clinic_id = p_clinic_id and x.referral_id in (select (s.r).id from scoped s)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'kpis', jsonb_build_object(
      'activeReferrers', (select count(distinct (r).referrer_patient_id) from scoped where (r).status <> 'VOID'),
      'referred', (select count(*) from scoped where (r).status <> 'VOID'),
      'confirmed', (select count(*) from scoped where (r).status = 'CONFIRMED'),
      'withAppointments', (select count(*) from scoped s where (s.r).status = 'CONFIRMED' and exists (
        select 1 from public.appointments ap
        where ap.clinic_id = p_clinic_id and ap.patient_id = (s.r).referred_patient_id
          and ap.starts_at >= (s.r).reported_at and ap.status not in ('CANCELLED','NO_SHOW'))),
      'rewardsPending', (select count(*) from rewards where state = 'PENDIENTE'),
      'rewardsUsed', (select count(*) from rewards where state in ('PARCIAL','USADO'))
    ),
    'items', coalesce((
      select jsonb_agg(private.referral_item_json(f.r) order by (f.r).reported_at desc, (f.r).id)
      from (
        select * from filtered order by (r).reported_at desc, (r).id
        limit p_page_size offset (p_page - 1) * p_page_size
      ) f
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

create or replace function private.referral_confirm_row(r public.patient_referrals)
returns public.patient_referrals language plpgsql security definer set search_path = '' as $$
declare
  v_result public.patient_referrals;
begin
  update public.patient_referrals set status = 'CONFIRMED', confirmed_at = now(),
    updated_by = (select auth.uid())
  where id = r.id returning * into v_result;
  perform private.referral_generate_rewards(v_result);
  perform private.referral_audit(r.clinic_id, 'REFERRAL_CONFIRMED', 'patient_referral', r.id,
    r.referred_patient_id, jsonb_build_object('status', r.status),
    jsonb_build_object('status', 'CONFIRMED'));
  return v_result;
end $$;

create or replace function private.referral_insert(
  p_clinic_id uuid, p_payload jsonb, p_replaces uuid
) returns public.patient_referrals language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_referrals;
  v_referrer uuid := (p_payload->>'referrerPatientId')::uuid;
  v_referred uuid := (p_payload->>'referredPatientId')::uuid;
  v_program uuid := (p_payload->>'programId')::uuid;
begin
  if v_referrer = v_referred then raise exception 'REFERRAL_SELF' using errcode = '23514'; end if;
  if not exists (select 1 from public.patients x
                 where x.clinic_id = p_clinic_id and x.id = v_referrer)
     or not exists (select 1 from public.patients x
                    where x.clinic_id = p_clinic_id and x.id = v_referred) then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.patients x
             where x.clinic_id = p_clinic_id and x.id in (v_referrer, v_referred)
               and x.archived_at is not null) then
    raise exception 'PATIENT_ARCHIVED' using errcode = '22023';
  end if;
  if v_program is not null and not exists (
    select 1 from public.referral_programs x where x.clinic_id = p_clinic_id and x.id = v_program
  ) then
    raise exception 'REFERRAL_PROGRAM_NOT_FOUND' using errcode = 'P0002';
  end if;
  begin
    insert into public.patient_referrals(
      clinic_id, referrer_patient_id, referred_patient_id, program_id, site_id, source,
      reported_at, notes, replaces_referral_id, created_by, updated_by
    ) values (
      p_clinic_id, v_referrer, v_referred, v_program, (p_payload->>'siteId')::uuid,
      coalesce(p_payload->>'source', 'DECLARADO_EN_RECEPCION'),
      coalesce((p_payload->>'reportedAt')::timestamptz, now()),
      nullif(btrim(p_payload->>'notes'), ''), p_replaces, (select auth.uid()), (select auth.uid())
    ) returning * into r;
  exception when unique_violation then
    raise exception 'REFERRAL_ALREADY_ACTIVE' using errcode = '23505';
  end;
  perform private.referral_audit(p_clinic_id, 'REFERRAL_CREATED', 'patient_referral', r.id,
    v_referred, null, private.referral_item_json(r));
  if p_payload->>'status' = 'CONFIRMED' then r := private.referral_confirm_row(r); end if;
  return r;
end $$;

create or replace function public.referral_create(p_clinic_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return private.referral_item_json(private.referral_insert(p_clinic_id, p_payload, null));
end $$;

create or replace function private.referral_lock(
  p_clinic_id uuid, p_referral_id uuid, p_expected_version integer
) returns public.patient_referrals language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_referrals;
begin
  select * into r from public.patient_referrals x
  where x.clinic_id = p_clinic_id and x.id = p_referral_id for update;
  if not found then raise exception 'REFERRAL_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_version is not null and r.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  return r;
end $$;

create or replace function public.referral_confirm(
  p_clinic_id uuid, p_referral_id uuid, p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_referrals;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  r := private.referral_lock(p_clinic_id, p_referral_id, p_expected_version);
  if r.status <> 'PENDING' then
    raise exception 'REFERRAL_INVALID_TRANSITION' using errcode = '22023';
  end if;
  return private.referral_item_json(private.referral_confirm_row(r));
end $$;

-- Voiding a confirmed referral also withdraws its rewards, so it needs the
-- reversal permission and is refused while any reward has been used.
create or replace function private.referral_void_row(r public.patient_referrals, p_reason text)
returns public.patient_referrals language plpgsql security definer set search_path = '' as $$
declare
  v_result public.patient_referrals;
begin
  if r.status = 'VOID' then raise exception 'REFERRAL_INVALID_TRANSITION' using errcode = '22023'; end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;
  if r.status = 'CONFIRMED'
     and not private.loyalty_has_permission(r.clinic_id, 'referral_rewards.reverse') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.referral_reward_redemptions d
    join public.referral_rewards w on w.clinic_id = d.clinic_id and w.id = d.reward_id
    where w.clinic_id = r.clinic_id and w.referral_id = r.id and d.status = 'APPLIED'
  ) then
    raise exception 'REFERRAL_HAS_REDEMPTIONS' using errcode = '22023';
  end if;
  update public.referral_rewards set status = 'CANCELLED', cancelled_at = now(),
    cancel_reason = 'Relación anulada: ' || btrim(p_reason)
  where clinic_id = r.clinic_id and referral_id = r.id and status in ('PENDING','EARNED');
  update public.patient_referrals set status = 'VOID', voided_at = now(),
    void_reason = btrim(p_reason), updated_by = (select auth.uid())
  where id = r.id returning * into v_result;
  perform private.referral_audit(r.clinic_id, 'REFERRAL_VOIDED', 'patient_referral', r.id,
    r.referred_patient_id, jsonb_build_object('status', r.status),
    jsonb_build_object('status', 'VOID', 'reason', btrim(p_reason)));
  return v_result;
end $$;

create or replace function public.referral_void(
  p_clinic_id uuid, p_referral_id uuid, p_reason text, p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return private.referral_item_json(private.referral_void_row(
    private.referral_lock(p_clinic_id, p_referral_id, p_expected_version), p_reason));
end $$;

-- Changing who recommended a patient never edits the old row: it is voided
-- with a reason and a new relation is created, both in one transaction.
create or replace function public.referral_reassign(
  p_clinic_id uuid, p_referral_id uuid, p_new_referrer_id uuid, p_reason text,
  p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_referrals;
  v_new public.patient_referrals;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  r := private.referral_lock(p_clinic_id, p_referral_id, p_expected_version);
  perform private.referral_void_row(r, p_reason);
  v_new := private.referral_insert(p_clinic_id, jsonb_build_object(
    'referrerPatientId', p_new_referrer_id, 'referredPatientId', r.referred_patient_id,
    'programId', r.program_id, 'siteId', r.site_id, 'source', r.source,
    'reportedAt', r.reported_at, 'notes', r.notes,
    'status', case when r.status = 'CONFIRMED' then 'CONFIRMED' else 'PENDING' end), r.id);
  perform private.referral_audit(p_clinic_id, 'REFERRAL_REASSIGNED', 'patient_referral', v_new.id,
    r.referred_patient_id, jsonb_build_object('referrerPatientId', r.referrer_patient_id),
    jsonb_build_object('referrerPatientId', p_new_referrer_id, 'reason', btrim(p_reason)));
  return private.referral_item_json(v_new);
end $$;

create or replace function public.referral_patient_summary(p_clinic_id uuid, p_patient_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_can_rewards boolean := private.loyalty_has_permission(p_clinic_id, 'referral_rewards.read');
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referrals.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'referredBy', (
      select private.referral_item_json(r) from public.patient_referrals r
      where r.clinic_id = p_clinic_id and r.referred_patient_id = p_patient_id
        and r.status in ('PENDING','CONFIRMED')
    ),
    'referrals', coalesce((
      select jsonb_agg(private.referral_item_json(r) order by r.reported_at desc)
      from public.patient_referrals r
      where r.clinic_id = p_clinic_id and r.referrer_patient_id = p_patient_id and r.status <> 'VOID'
    ), '[]'::jsonb),
    'rewards', case when v_can_rewards then coalesce((
      select jsonb_agg(private.referral_reward_json(w, now()) order by w.created_at desc)
      from public.referral_rewards w
      where w.clinic_id = p_clinic_id and w.beneficiary_patient_id = p_patient_id
    ), '[]'::jsonb) end
  );
end $$;

-- ---------------------------------------------------------------------------
-- Rewards ledger
-- ---------------------------------------------------------------------------

create or replace function public.referral_reward_list(
  p_clinic_id uuid, p_filters jsonb default '{}'::jsonb,
  p_page integer default 1, p_page_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_search text := nullif(btrim(v_filters->>'search'), '');
  v_result jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_page is null or p_page < 1 or p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'INVALID_REFERRAL_FILTER' using errcode = '22023';
  end if;
  with scoped as (
    select private.referral_reward_json(w, now()) as item, w.created_at, w.id
    from public.referral_rewards w
    join public.patients b on b.clinic_id = w.clinic_id and b.id = w.beneficiary_patient_id
    where w.clinic_id = p_clinic_id
      and (v_filters->>'patientId' is null or w.beneficiary_patient_id = (v_filters->>'patientId')::uuid)
      and (v_filters->>'programId' is null or w.program_id = (v_filters->>'programId')::uuid)
      and (v_search is null or b.record_number = v_search
           or (b.first_name || ' ' || b.last_name) ilike '%' || v_search || '%')
  ),
  filtered as (
    select * from scoped s where v_filters->>'state' is null or s.item->>'state' = v_filters->>'state'
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'kpis', jsonb_build_object(
      'pending', (select count(*) from scoped where item->>'state' = 'PENDIENTE'),
      'earned', (select count(*) from scoped where item->>'state' in ('DISPONIBLE','PARCIAL')),
      'used', (select count(*) from scoped where item->>'state' = 'USADO'),
      'expired', (select count(*) from scoped where item->>'state' = 'VENCIDO'),
      'creditRemainingCents', (select coalesce(sum((item->>'remainingCents')::bigint), 0) from scoped
        where item->>'state' in ('DISPONIBLE','PARCIAL'))
    ),
    'items', coalesce((
      select jsonb_agg(f.item order by f.created_at desc, f.id)
      from (select * from filtered order by created_at desc, id
            limit p_page_size offset (p_page - 1) * p_page_size) f
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

create or replace function public.referral_reward_redemptions_list(p_clinic_id uuid, p_reward_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'amountCents', d.amount_cents, 'status', d.status, 'reason', d.reason,
      'reversalReason', d.reversal_reason, 'invoiceId', d.invoice_id, 'budgetId', d.budget_id,
      'createdAt', d.created_at, 'reversedAt', d.reversed_at,
      'actorName', nullif(btrim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), '')
    ) order by d.created_at desc)
    from public.referral_reward_redemptions d
    left join public.profiles pr on pr.id = d.created_by
    where d.clinic_id = p_clinic_id and d.reward_id = p_reward_id
  ), '[]'::jsonb));
end $$;

create or replace function private.referral_reward_lock(
  p_clinic_id uuid, p_reward_id uuid, p_expected_version integer
) returns public.referral_rewards language plpgsql security definer set search_path = '' as $$
declare
  w public.referral_rewards;
begin
  select * into w from public.referral_rewards x
  where x.clinic_id = p_clinic_id and x.id = p_reward_id for update;
  if not found then raise exception 'REWARD_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_version is not null and w.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  return w;
end $$;

-- "Validar cumplimiento": only staff allowed to approve, only once the
-- referral is confirmed, and with evidence unless the program is manual.
create or replace function public.referral_reward_approve(
  p_clinic_id uuid, p_reward_id uuid, p_reference text default null,
  p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  w public.referral_rewards;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.approve') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  w := private.referral_reward_lock(p_clinic_id, p_reward_id, p_expected_version);
  if w.status <> 'PENDING' then raise exception 'REWARD_INVALID_TRANSITION' using errcode = '22023'; end if;
  if not exists (select 1 from public.patient_referrals r
                 where r.clinic_id = w.clinic_id and r.id = w.referral_id and r.status = 'CONFIRMED') then
    raise exception 'REFERRAL_NOT_CONFIRMED' using errcode = '22023';
  end if;
  if w.terms_snapshot->>'qualification' <> 'APROBACION_MANUAL' and nullif(btrim(p_reference), '') is null then
    raise exception 'REFERENCE_REQUIRED' using errcode = '22023';
  end if;
  return private.referral_reward_json(private.referral_earn(w, null, p_reference), now());
end $$;

create or replace function public.referral_reward_cancel(
  p_clinic_id uuid, p_reward_id uuid, p_reason text, p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  w public.referral_rewards;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.approve') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  w := private.referral_reward_lock(p_clinic_id, p_reward_id, p_expected_version);
  if w.status not in ('PENDING','EARNED') then
    raise exception 'REWARD_INVALID_TRANSITION' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  if exists (select 1 from public.referral_reward_redemptions d
             where d.clinic_id = w.clinic_id and d.reward_id = w.id and d.status = 'APPLIED') then
    raise exception 'REWARD_HAS_REDEMPTIONS' using errcode = '22023';
  end if;
  update public.referral_rewards set status = 'CANCELLED', cancelled_at = now(),
    cancel_reason = btrim(p_reason)
  where id = w.id returning * into w;
  perform private.referral_audit(p_clinic_id, 'REWARD_CANCELLED', 'referral_reward', w.id,
    w.beneficiary_patient_id, null, jsonb_build_object('status', 'CANCELLED', 'reason', btrim(p_reason)));
  return private.referral_reward_json(w, now());
end $$;

-- Atomic redemption: the reward row is locked, so two desks cannot spend the
-- same credit twice; the idempotency key makes a retried request harmless.
create or replace function public.referral_reward_redeem(
  p_clinic_id uuid, p_reward_id uuid, p_payload jsonb, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  w public.referral_rewards;
  v_existing public.referral_reward_redemptions;
  v_amount bigint := (p_payload->>'amountCents')::bigint;
  v_invoice uuid := (p_payload->>'invoiceId')::uuid;
  v_budget uuid := (p_payload->>'budgetId')::uuid;
  v_applied bigint;
  v_count integer;
  v_redemption public.referral_reward_redemptions;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.redeem') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  w := private.referral_reward_lock(p_clinic_id, p_reward_id, null);
  select * into v_existing from public.referral_reward_redemptions d
  where d.clinic_id = p_clinic_id and d.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.reward_id <> w.id then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    return private.referral_reward_json(w, now());
  end if;
  select coalesce(sum(d.amount_cents), 0), count(*) into v_applied, v_count
  from public.referral_reward_redemptions d
  where d.clinic_id = w.clinic_id and d.reward_id = w.id and d.status = 'APPLIED';
  if private.referral_reward_state(w.status, w.reward_kind, w.value_cents, v_applied, v_count,
       w.expires_at, now()) not in ('DISPONIBLE','PARCIAL') then
    raise exception 'REWARD_NOT_AVAILABLE' using errcode = '22023';
  end if;
  if w.reward_kind = 'CREDIT' then
    if v_amount is null or v_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
    if v_amount > w.value_cents - v_applied then
      raise exception 'REWARD_INSUFFICIENT_BALANCE' using errcode = '22023';
    end if;
  elsif v_amount is not null then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if v_invoice is not null and not exists (select 1 from public.invoices i
     where i.id = v_invoice and i.clinic_id = p_clinic_id and i.patient_id = w.beneficiary_patient_id) then
    raise exception 'INVALID_REFERENCE' using errcode = '22023';
  end if;
  if v_budget is not null and not exists (select 1 from public.budgets b
     where b.id = v_budget and b.clinic_id = p_clinic_id and b.patient_id = w.beneficiary_patient_id) then
    raise exception 'INVALID_REFERENCE' using errcode = '22023';
  end if;
  insert into public.referral_reward_redemptions(
    clinic_id, reward_id, invoice_id, budget_id, amount_cents, reason, idempotency_key, created_by
  ) values (
    p_clinic_id, w.id, v_invoice, v_budget, v_amount, nullif(btrim(p_payload->>'reason'), ''),
    p_idempotency_key, (select auth.uid())
  ) returning * into v_redemption;
  perform private.referral_audit(p_clinic_id, 'REWARD_REDEEMED', 'referral_reward', w.id,
    w.beneficiary_patient_id, null, jsonb_build_object('redemptionId', v_redemption.id,
      'amountCents', v_amount, 'invoiceId', v_invoice, 'budgetId', v_budget));
  return private.referral_reward_json(w, now());
end $$;

create or replace function public.referral_redemption_reverse(
  p_clinic_id uuid, p_redemption_id uuid, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d public.referral_reward_redemptions;
  w public.referral_rewards;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'referral_rewards.reverse') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  select * into d from public.referral_reward_redemptions x
  where x.clinic_id = p_clinic_id and x.id = p_redemption_id;
  if not found then raise exception 'REDEMPTION_NOT_FOUND' using errcode = 'P0002'; end if;
  w := private.referral_reward_lock(p_clinic_id, d.reward_id, null);
  update public.referral_reward_redemptions set status = 'REVERSED', reversed_at = now(),
    reversed_by = (select auth.uid()), reversal_reason = btrim(p_reason)
  where id = d.id and status = 'APPLIED';
  if not found then raise exception 'REDEMPTION_ALREADY_REVERSED' using errcode = '22023'; end if;
  perform private.referral_audit(p_clinic_id, 'REWARD_REVERSED', 'referral_reward', w.id,
    w.beneficiary_patient_id, jsonb_build_object('redemptionId', d.id, 'status', 'APPLIED'),
    jsonb_build_object('redemptionId', d.id, 'status', 'REVERSED', 'reason', btrim(p_reason)));
  return private.referral_reward_json(w, now());
end $$;

-- ---------------------------------------------------------------------------
-- Row level security and privileges
-- ---------------------------------------------------------------------------

alter table public.referral_programs enable row level security;
alter table public.patient_referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.referral_reward_redemptions enable row level security;

drop policy if exists referral_programs_read on public.referral_programs;
create policy referral_programs_read on public.referral_programs for select to authenticated
  using (private.loyalty_has_permission(clinic_id, 'referrals.read'));
drop policy if exists patient_referrals_read on public.patient_referrals;
create policy patient_referrals_read on public.patient_referrals for select to authenticated
  using (private.loyalty_has_permission(clinic_id, 'referrals.read'));
drop policy if exists referral_rewards_read on public.referral_rewards;
create policy referral_rewards_read on public.referral_rewards for select to authenticated
  using (private.loyalty_has_permission(clinic_id, 'referral_rewards.read'));
drop policy if exists referral_reward_redemptions_read on public.referral_reward_redemptions;
create policy referral_reward_redemptions_read on public.referral_reward_redemptions
  for select to authenticated
  using (private.loyalty_has_permission(clinic_id, 'referral_rewards.read'));

revoke all on public.referral_programs from anon, authenticated;
revoke all on public.patient_referrals from anon, authenticated;
revoke all on public.referral_rewards from anon, authenticated;
revoke all on public.referral_reward_redemptions from anon, authenticated;
grant select on public.referral_programs to authenticated;
grant select on public.patient_referrals to authenticated;
grant select on public.referral_rewards to authenticated;
grant select on public.referral_reward_redemptions to authenticated;

revoke all on function private.loyalty_has_permission(uuid, text) from public;
grant execute on function private.loyalty_has_permission(uuid, text) to authenticated;
revoke all on function private.madrid_day_start(date) from public;
revoke all on function private.referral_touch() from public;
revoke all on function private.referral_prevent_cycle() from public;
revoke all on function private.referral_audit(uuid, text, text, uuid, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function private.referral_reward_state(text, text, bigint, bigint, integer, timestamptz, timestamptz) from public;
revoke all on function private.referral_program_json(public.referral_programs) from public;
revoke all on function private.referral_item_json(public.patient_referrals) from public;
revoke all on function private.referral_reward_json(public.referral_rewards, timestamptz) from public;
revoke all on function private.referral_earn(public.referral_rewards, uuid, text) from public;
revoke all on function private.referral_generate_rewards(public.patient_referrals) from public;
revoke all on function private.referral_rewards_on_appointment() from public;
revoke all on function private.referral_confirm_row(public.patient_referrals) from public;
revoke all on function private.referral_insert(uuid, jsonb, uuid) from public;
revoke all on function private.referral_lock(uuid, uuid, integer) from public;
revoke all on function private.referral_void_row(public.patient_referrals, text) from public;
revoke all on function private.referral_reward_lock(uuid, uuid, integer) from public;

revoke all on function public.referral_programs_list(uuid) from public, anon;
revoke all on function public.referral_program_save(uuid, uuid, jsonb, integer) from public, anon;
revoke all on function public.referral_list(uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.referral_create(uuid, jsonb) from public, anon;
revoke all on function public.referral_confirm(uuid, uuid, integer) from public, anon;
revoke all on function public.referral_void(uuid, uuid, text, integer) from public, anon;
revoke all on function public.referral_reassign(uuid, uuid, uuid, text, integer) from public, anon;
revoke all on function public.referral_patient_summary(uuid, uuid) from public, anon;
revoke all on function public.referral_reward_list(uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.referral_reward_redemptions_list(uuid, uuid) from public, anon;
revoke all on function public.referral_reward_approve(uuid, uuid, text, integer) from public, anon;
revoke all on function public.referral_reward_cancel(uuid, uuid, text, integer) from public, anon;
revoke all on function public.referral_reward_redeem(uuid, uuid, jsonb, text) from public, anon;
revoke all on function public.referral_redemption_reverse(uuid, uuid, text) from public, anon;
grant execute on function public.referral_programs_list(uuid) to authenticated;
grant execute on function public.referral_program_save(uuid, uuid, jsonb, integer) to authenticated;
grant execute on function public.referral_list(uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.referral_create(uuid, jsonb) to authenticated;
grant execute on function public.referral_confirm(uuid, uuid, integer) to authenticated;
grant execute on function public.referral_void(uuid, uuid, text, integer) to authenticated;
grant execute on function public.referral_reassign(uuid, uuid, uuid, text, integer) to authenticated;
grant execute on function public.referral_patient_summary(uuid, uuid) to authenticated;
grant execute on function public.referral_reward_list(uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.referral_reward_redemptions_list(uuid, uuid) to authenticated;
grant execute on function public.referral_reward_approve(uuid, uuid, text, integer) to authenticated;
grant execute on function public.referral_reward_cancel(uuid, uuid, text, integer) to authenticated;
grant execute on function public.referral_reward_redeem(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.referral_redemption_reverse(uuid, uuid, text) to authenticated;
