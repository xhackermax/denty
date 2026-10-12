-- Ensure the administrator can delete any unlinked patient budget, even if its
-- status is no longer DRAFT. Preserve finance/signature integrity for all roles.
-- SECURITY DEFINER resolves the budget before explicit authorization, avoiding
-- misleading not_found responses caused by invoker RLS visibility.
begin;

create or replace function public.delete_draft_budget(
  p_budget_id uuid,
  p_patient_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_admin boolean;
begin
  select * into v_budget
  from public.budgets
  where id = p_budget_id and patient_id = p_patient_id
  for update;

  if v_budget.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_admin := private.is_clinic_admin(v_budget.clinic_id);
  if not v_admin and not private.is_clinic_staff(v_budget.clinic_id) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if v_budget.version <> p_expected_version then
    return jsonb_build_object('status', 'version_conflict');
  end if;
  if not v_admin and v_budget.status <> 'DRAFT' then
    return jsonb_build_object('status', 'not_editable');
  end if;
  if exists (select 1 from public.budget_signed_snapshots where budget_id = v_budget.id)
    or exists (select 1 from public.invoices where budget_id = v_budget.id)
    or exists (select 1 from public.payments where budget_id = v_budget.id)
    or exists (select 1 from public.payment_allocations where budget_id = v_budget.id) then
    return jsonb_build_object('status', 'linked');
  end if;

  delete from public.budgets
  where id = v_budget.id and patient_id = p_patient_id and version = p_expected_version;
  if not found then
    return jsonb_build_object('status', 'version_conflict');
  end if;
  return jsonb_build_object('status', 'deleted');
end;
$$;

revoke all on function public.delete_draft_budget(uuid,uuid,integer) from public, anon;
grant execute on function public.delete_draft_budget(uuid,uuid,integer) to authenticated;

commit;
