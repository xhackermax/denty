-- Reconcile the applied Supabase migration from 2026-10-08 with the repository history.
-- The canonical operations are also defined by 20261005120000_manage_draft_budgets.sql.
-- CREATE OR REPLACE and permission GRANT/REVOKE are repeatable for existing installations.
begin;

create or replace function public.update_draft_budget(
  p_budget_id uuid,
  p_patient_id uuid,
  p_expected_version integer,
  p_title text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_budget public.budgets%rowtype;
  v_budget_item_count integer;
  v_submitted_count integer;
  v_distinct_count integer;
  v_total bigint;
begin
  select * into v_budget
  from public.budgets
  where id=p_budget_id and patient_id=p_patient_id
  for update;

  if v_budget.id is null then
    return jsonb_build_object('status','not_found');
  end if;
  if not private.is_clinic_staff(v_budget.clinic_id) then
    return jsonb_build_object('status','forbidden');
  end if;
  if v_budget.version<>p_expected_version then
    return jsonb_build_object('status','version_conflict');
  end if;
  if v_budget.status<>'DRAFT' then
    return jsonb_build_object('status','not_editable');
  end if;
  if exists(select 1 from public.budget_signed_snapshots where budget_id=v_budget.id)
    or exists(select 1 from public.invoices where budget_id=v_budget.id)
    or exists(select 1 from public.payments where budget_id=v_budget.id)
    or exists(select 1 from public.payment_allocations where budget_id=v_budget.id) then
    return jsonb_build_object('status','linked');
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array'
    or p_title is not null and char_length(btrim(p_title))>120 then
    return jsonb_build_object('status','invalid_items');
  end if;

  select count(*) into v_budget_item_count
  from public.budget_items
  where budget_id=v_budget.id;
  select count(*),count(distinct submitted.id)
  into v_submitted_count,v_distinct_count
  from jsonb_to_recordset(p_items) as submitted(id uuid, unit_price_cents integer);
  if v_submitted_count<>v_budget_item_count or v_distinct_count<>v_submitted_count
    or exists(
      select 1
      from jsonb_to_recordset(p_items) as submitted(id uuid, unit_price_cents integer)
      left join public.budget_items item
        on item.id=submitted.id and item.budget_id=v_budget.id
      where item.id is null
        or submitted.unit_price_cents is null
        or submitted.unit_price_cents<0
        or submitted.unit_price_cents::bigint*item.quantity>2147483647
    ) then
    return jsonb_build_object('status','invalid_items');
  end if;

  select coalesce(sum(
    case when item.billing_mode='separate'
      then submitted.unit_price_cents::bigint*item.quantity
      else 0
    end
  ),0)
  into v_total
  from jsonb_to_recordset(p_items) as submitted(id uuid, unit_price_cents integer)
  join public.budget_items item on item.id=submitted.id and item.budget_id=v_budget.id;
  if v_total>2147483647 then
    return jsonb_build_object('status','invalid_items');
  end if;

  update public.budget_items item
  set unit_price_cents=submitted.unit_price_cents,
      total_cents=case
        when item.billing_mode='separate' then submitted.unit_price_cents*item.quantity
        else 0
      end
  from jsonb_to_recordset(p_items) as submitted(id uuid, unit_price_cents integer)
  where item.id=submitted.id and item.budget_id=v_budget.id;

  update public.budgets
  set title=nullif(btrim(coalesce(p_title,'')),''),
      total_cents=v_total::integer,
      version=version+1
  where id=v_budget.id;

  return jsonb_build_object('status','updated');
end;
$$;

create or replace function public.delete_draft_budget(
  p_budget_id uuid,
  p_patient_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_budget public.budgets%rowtype;
begin
  select * into v_budget
  from public.budgets
  where id=p_budget_id and patient_id=p_patient_id
  for update;

  if v_budget.id is null then
    return jsonb_build_object('status','not_found');
  end if;
  if not private.is_clinic_staff(v_budget.clinic_id) then
    return jsonb_build_object('status','forbidden');
  end if;
  if v_budget.version<>p_expected_version then
    return jsonb_build_object('status','version_conflict');
  end if;
  if v_budget.status<>'DRAFT' then
    return jsonb_build_object('status','not_editable');
  end if;
  if exists(select 1 from public.budget_signed_snapshots where budget_id=v_budget.id)
    or exists(select 1 from public.invoices where budget_id=v_budget.id)
    or exists(select 1 from public.payments where budget_id=v_budget.id)
    or exists(select 1 from public.payment_allocations where budget_id=v_budget.id) then
    return jsonb_build_object('status','linked');
  end if;

  delete from public.budgets
  where id=v_budget.id and patient_id=p_patient_id and version=p_expected_version;
  if not found then
    return jsonb_build_object('status','version_conflict');
  end if;
  return jsonb_build_object('status','deleted');
end;
$$;

revoke all on function public.update_draft_budget(uuid,uuid,integer,text,jsonb) from public, anon;
revoke all on function public.delete_draft_budget(uuid,uuid,integer) from public, anon;
grant execute on function public.update_draft_budget(uuid,uuid,integer,text,jsonb) to authenticated;
grant execute on function public.delete_draft_budget(uuid,uuid,integer) to authenticated;

commit;
