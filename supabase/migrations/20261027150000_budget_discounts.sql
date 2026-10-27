-- Budget discounts and early-payment ("pronto pago") discount.
-- The clinic configures the early-payment offer and discount presets in the admin finance
-- settings; each draft budget stores the discount actually applied. total_cents stays the
-- gross sum of the lines (the existing RPCs keep maintaining it) and final_total_cents is
-- derived from it, so every rewrite of the lines re-applies the discount automatically.
begin;

create table if not exists public.budget_discount_settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  early_payment_enabled boolean not null default false,
  early_payment_percent numeric(5,2) not null default 5
    check (early_payment_percent > 0 and early_payment_percent <= 100),
  early_payment_terms text not null default 'Abonando el importe total antes de iniciar el tratamiento.'
    check (char_length(early_payment_terms) <= 300),
  max_discount_percent numeric(5,2) not null default 100
    check (max_discount_percent >= 0 and max_discount_percent <= 100),
  discount_presets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(discount_presets) = 'array' and jsonb_array_length(discount_presets) <= 20),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.budget_discount_settings enable row level security;
revoke all on public.budget_discount_settings from anon;
revoke insert, update, delete on public.budget_discount_settings from authenticated;
grant select on public.budget_discount_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'budget_discount_settings'
      and policyname = 'budget_discount_settings_staff_read'
  ) then
    create policy budget_discount_settings_staff_read
    on public.budget_discount_settings
    for select to authenticated
    using ((select private.is_clinic_staff(clinic_id)));
  end if;
end $$;

alter table public.budgets
  add column if not exists discount_label text
    check (discount_label is null or char_length(discount_label) <= 80),
  add column if not exists discount_percent numeric(5,2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  add column if not exists discount_amount_cents integer not null default 0
    check (discount_amount_cents >= 0),
  add column if not exists early_payment_percent numeric(5,2)
    check (early_payment_percent is null or (early_payment_percent > 0 and early_payment_percent <= 100)),
  add column if not exists early_payment_applied boolean not null default false,
  add column if not exists final_total_cents integer generated always as (
    (total_cents - least(total_cents, round(total_cents * discount_percent / 100)::integer + discount_amount_cents))
    - case
        when early_payment_applied and early_payment_percent is not null then
          round(
            (total_cents - least(total_cents, round(total_cents * discount_percent / 100)::integer + discount_amount_cents))
            * early_payment_percent / 100
          )::integer
        else 0
      end
  ) stored;

create or replace function public.get_budget_discount_settings(p_clinic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.budget_discount_settings%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.budget_discount_settings(clinic_id)
  values (p_clinic_id)
  on conflict (clinic_id) do nothing;

  select * into v_settings
  from public.budget_discount_settings
  where clinic_id = p_clinic_id;

  return to_jsonb(v_settings);
end;
$$;

create or replace function public.update_budget_discount_settings(
  p_clinic_id uuid,
  p_early_payment_enabled boolean,
  p_early_payment_percent numeric,
  p_early_payment_terms text,
  p_max_discount_percent numeric,
  p_discount_presets jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.budget_discount_settings%rowtype;
begin
  if not (select private.stage11_has_permission(p_clinic_id, 'settings.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_discount_presets is null
    or jsonb_typeof(p_discount_presets) <> 'array'
    or jsonb_array_length(p_discount_presets) > 20
    or exists(
      select 1
      from jsonb_array_elements(p_discount_presets) preset
      where jsonb_typeof(preset) <> 'object'
        or nullif(btrim(coalesce(preset->>'label', '')), '') is null
        or char_length(preset->>'label') > 80
        or jsonb_typeof(preset->'percent') <> 'number'
        or (preset->>'percent')::numeric <= 0
        or (preset->>'percent')::numeric > 100
    ) then
    raise exception 'INVALID_DISCOUNT_PRESETS' using errcode = '22023';
  end if;

  insert into public.budget_discount_settings(
    clinic_id,
    early_payment_enabled,
    early_payment_percent,
    early_payment_terms,
    max_discount_percent,
    discount_presets,
    updated_by
  )
  values (
    p_clinic_id,
    coalesce(p_early_payment_enabled, false),
    coalesce(p_early_payment_percent, 5),
    coalesce(nullif(btrim(p_early_payment_terms), ''), 'Abonando el importe total antes de iniciar el tratamiento.'),
    coalesce(p_max_discount_percent, 100),
    p_discount_presets,
    (select auth.uid())
  )
  on conflict (clinic_id) do update set
    early_payment_enabled = excluded.early_payment_enabled,
    early_payment_percent = excluded.early_payment_percent,
    early_payment_terms = excluded.early_payment_terms,
    max_discount_percent = excluded.max_discount_percent,
    discount_presets = excluded.discount_presets,
    updated_at = now(),
    updated_by = (select auth.uid())
  returning * into v_settings;

  return to_jsonb(v_settings);
end;
$$;

-- Same guards as update_draft_budget: only unlinked drafts change, with optimistic locking.
-- The early-payment percentage is copied from the clinic settings so the signed budget keeps
-- the offer it was presented with even if the clinic changes it later.
create or replace function public.update_budget_discounts(
  p_budget_id uuid,
  p_patient_id uuid,
  p_expected_version integer,
  p_discount_label text,
  p_discount_percent numeric,
  p_discount_amount_cents integer,
  p_early_payment_applied boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_settings public.budget_discount_settings%rowtype;
  v_percent numeric := coalesce(p_discount_percent, 0);
  v_amount integer := coalesce(p_discount_amount_cents, 0);
  v_max numeric;
begin
  select * into v_budget
  from public.budgets
  where id = p_budget_id and patient_id = p_patient_id
  for update;

  if v_budget.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.is_clinic_staff(v_budget.clinic_id) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if v_budget.version <> p_expected_version then
    return jsonb_build_object('status', 'version_conflict');
  end if;
  if v_budget.status <> 'DRAFT' then
    return jsonb_build_object('status', 'not_editable');
  end if;
  if exists(select 1 from public.budget_signed_snapshots where budget_id = v_budget.id)
    or exists(select 1 from public.invoices where budget_id = v_budget.id)
    or exists(select 1 from public.payments where budget_id = v_budget.id)
    or exists(select 1 from public.payment_allocations where budget_id = v_budget.id) then
    return jsonb_build_object('status', 'linked');
  end if;

  select * into v_settings
  from public.budget_discount_settings
  where clinic_id = v_budget.clinic_id;
  v_max := coalesce(v_settings.max_discount_percent, 100);

  if v_percent < 0 or v_percent > 100 or v_amount < 0
    or (p_discount_label is not null and char_length(btrim(p_discount_label)) > 80)
    or v_percent > v_max
    or v_amount > round(v_budget.total_cents * v_max / 100) then
    return jsonb_build_object('status', 'invalid_discount');
  end if;

  update public.budgets
  set discount_label = case
        when v_percent > 0 or v_amount > 0 then nullif(btrim(coalesce(p_discount_label, '')), '')
        else null
      end,
      discount_percent = v_percent,
      discount_amount_cents = v_amount,
      early_payment_percent = case
        when coalesce(v_settings.early_payment_enabled, false) then v_settings.early_payment_percent
        else null
      end,
      early_payment_applied = coalesce(v_settings.early_payment_enabled, false)
        and coalesce(p_early_payment_applied, false),
      version = version + 1
  where id = v_budget.id;

  return jsonb_build_object('status', 'updated');
end;
$$;

-- Invoices drafted from a discounted budget carry the discounts as negative lines so the
-- invoice total matches what the patient accepted. Issued invoices are never touched.
create or replace function public.create_invoice_from_budget(p_budget_id uuid, p_series_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  b public.budgets%rowtype;
  p public.patients%rowtype;
  lines jsonb;
  v_discount integer;
  v_early integer;
begin
  select * into b from public.budgets where id = p_budget_id;
  if b.id is null then raise exception 'BUDGET_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.has_finance_permission(b.clinic_id, 'finance.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if b.status <> 'SIGNED' then raise exception 'BUDGET_NOT_SIGNED' using errcode = '23514'; end if;
  select * into p from public.patients where id = b.patient_id;
  select jsonb_agg(jsonb_build_object(
    'description', bi.description,
    'quantity', bi.quantity,
    'unitPriceCents', bi.unit_price_cents,
    'taxRateBps', 0,
    'clinicalPlanItemId', bi.clinical_plan_item_id
  ) order by bi.created_at, bi.id)
  into lines
  from public.budget_items bi
  where bi.budget_id = b.id and bi.billing_mode <> 'no_charge';

  v_discount := least(b.total_cents, round(b.total_cents * b.discount_percent / 100)::integer + b.discount_amount_cents);
  v_early := (b.total_cents - v_discount) - b.final_total_cents;
  if v_discount > 0 then
    lines := coalesce(lines, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'description', coalesce('Descuento: ' || b.discount_label, 'Descuento'),
      'quantity', 1,
      'unitPriceCents', -v_discount,
      'taxRateBps', 0
    ));
  end if;
  if v_early > 0 then
    lines := coalesce(lines, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'description', 'Descuento por pronto pago (' || trim_scale(b.early_payment_percent)::text || ' %)',
      'quantity', 1,
      'unitPriceCents', -v_early,
      'taxRateBps', 0
    ));
  end if;

  return public.create_invoice_draft(
    b.patient_id, b.id, null, p_series_id, 'STANDARD',
    btrim(p.first_name || ' ' || p.last_name), p.dni, null, coalesce(lines, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_budget_discount_settings(uuid) from public, anon;
revoke all on function public.update_budget_discount_settings(uuid, boolean, numeric, text, numeric, jsonb) from public, anon;
revoke all on function public.update_budget_discounts(uuid, uuid, integer, text, numeric, integer, boolean) from public, anon;
grant execute on function public.get_budget_discount_settings(uuid) to authenticated;
grant execute on function public.update_budget_discount_settings(uuid, boolean, numeric, text, numeric, jsonb) to authenticated;
grant execute on function public.update_budget_discounts(uuid, uuid, integer, text, numeric, integer, boolean) to authenticated;

commit;
