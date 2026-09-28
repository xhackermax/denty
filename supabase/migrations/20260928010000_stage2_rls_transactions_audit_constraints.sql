-- Denty Stage 2: RLS, transaction boundaries, append-only audit, updated_at and tenant integrity.
-- Assumes Stage 1 Auth cutover is applied first.
-- Ordinary application traffic runs as authenticated + user JWT. Secret/service-role is reserved for trusted admin/bootstrap jobs.

begin;

-- ---------------------------------------------------------------------------
-- 1. Private authorization helpers. SECURITY DEFINER helpers never live in an
-- exposed API schema and every relation is schema-qualified.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_clinic_staff(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.profile_id = (select auth.uid())
      and cm.active
      and cm.role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT')
  );
$$;

create or replace function private.is_clinic_admin(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.profile_id = (select auth.uid())
      and cm.active
      and cm.role = 'ADMIN'
  );
$$;

create or replace function private.is_patient_owner(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_accounts pa
    where pa.patient_id = target_patient_id
      and pa.profile_id = (select auth.uid())
      and pa.active
  );
$$;

create or replace function private.can_access_clinic(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_clinic_staff(target_clinic_id)
    or exists (
      select 1
      from public.patient_accounts pa
      where pa.clinic_id = target_clinic_id
        and pa.profile_id = (select auth.uid())
        and pa.active
    );
$$;

create or replace function private.can_access_patient(target_clinic_id uuid, target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_clinic_staff(target_clinic_id)
    or exists (
      select 1
      from public.patient_accounts pa
      where pa.clinic_id = target_clinic_id
        and pa.patient_id = target_patient_id
        and pa.profile_id = (select auth.uid())
        and pa.active
    );
$$;

create or replace function private.can_admin_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members mine
    join public.clinic_members target on target.clinic_id = mine.clinic_id
    where mine.profile_id = (select auth.uid())
      and mine.active
      and mine.role = 'ADMIN'
      and target.profile_id = target_profile_id
      and target.active
  ) or exists (
    select 1
    from public.clinic_members mine
    join public.patient_accounts target on target.clinic_id = mine.clinic_id
    where mine.profile_id = (select auth.uid())
      and mine.active
      and mine.role = 'ADMIN'
      and target.profile_id = target_profile_id
      and target.active
  );
$$;

create or replace function private.profile_belongs_to_clinic(target_profile_id uuid, target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.profile_id = target_profile_id and cm.clinic_id = target_clinic_id and cm.active
  ) or exists (
    select 1 from public.patient_accounts pa
    where pa.profile_id = target_profile_id and pa.clinic_id = target_clinic_id and pa.active
  );
$$;

revoke all on function private.is_clinic_staff(uuid) from public, anon;
revoke all on function private.is_clinic_admin(uuid) from public, anon;
revoke all on function private.is_patient_owner(uuid) from public, anon;
revoke all on function private.can_access_clinic(uuid) from public, anon;
revoke all on function private.can_access_patient(uuid, uuid) from public, anon;
revoke all on function private.can_admin_profile(uuid) from public, anon;
revoke all on function private.profile_belongs_to_clinic(uuid, uuid) from public, anon;
grant execute on function private.is_clinic_staff(uuid) to authenticated;
grant execute on function private.is_clinic_admin(uuid) to authenticated;
grant execute on function private.is_patient_owner(uuid) to authenticated;
grant execute on function private.can_access_clinic(uuid) to authenticated;
grant execute on function private.can_access_patient(uuid, uuid) to authenticated;
grant execute on function private.can_admin_profile(uuid) to authenticated;
grant execute on function private.profile_belongs_to_clinic(uuid, uuid) to authenticated;

-- Move the auth trigger to the private schema before retiring exposed helper functions.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, first_name, last_name, email, phone, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.phone,
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        phone = excluded.phone,
        updated_at = now();
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Drop legacy policies as a set. Stage 2 redefines the entire matrix below.
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'clinics','profiles','clinic_members','user_permissions','patient_accounts','app_sessions','legacy_identity_map',
        'patients','staff_members','sites','cabinets','dental_entities','clinical_history_events','periodontal_measurements',
        'odontogram_snapshots','clinical_plans','clinical_plan_items','clinical_plan_dependencies','budgets','budget_items',
        'budget_signed_snapshots','document_templates','documents','consent_requirements','appointments','appointment_status_events',
        'appointment_relationships','notifications','document_exports','payments','audit_log','clinic_payment_methods','payment_terminals',
        'appointment_blocks','payment_allocations','patient_recalls','fiscal_records','integration_events','bank_transactions',
        'ai_clinical_reviews','kiosk_checkins','interoperability_exports','clinic_payment_settings','payment_attempts'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Public helpers from earlier migrations are no longer needed by RLS.
drop function if exists public.can_admin_profile(uuid);
drop function if exists public.can_access_patient(uuid, uuid);
drop function if exists public.is_clinic_admin(uuid);
drop function if exists public.is_clinic_member(uuid);
drop function if exists public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 3. RLS on every effective public application table.
-- ---------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.clinic_members enable row level security;
alter table public.user_permissions enable row level security;
alter table public.patient_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.legacy_identity_map enable row level security;
alter table public.patients enable row level security;
alter table public.staff_members enable row level security;
alter table public.sites enable row level security;
alter table public.cabinets enable row level security;
alter table public.dental_entities enable row level security;
alter table public.clinical_history_events enable row level security;
alter table public.periodontal_measurements enable row level security;
alter table public.odontogram_snapshots enable row level security;
alter table public.clinical_plans enable row level security;
alter table public.clinical_plan_items enable row level security;
alter table public.clinical_plan_dependencies enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_signed_snapshots enable row level security;
alter table public.document_templates enable row level security;
alter table public.documents enable row level security;
alter table public.consent_requirements enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_events enable row level security;
alter table public.appointment_relationships enable row level security;
alter table public.notifications enable row level security;
alter table public.document_exports enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;
alter table public.clinic_payment_methods enable row level security;
alter table public.payment_terminals enable row level security;
alter table public.appointment_blocks enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.patient_recalls enable row level security;
alter table public.fiscal_records enable row level security;
alter table public.integration_events enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.ai_clinical_reviews enable row level security;
alter table public.kiosk_checkins enable row level security;
alter table public.interoperability_exports enable row level security;
alter table public.clinic_payment_settings enable row level security;
alter table public.payment_attempts enable row level security;

-- Data API grants are explicit. RLS is the second barrier after table privileges.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on table public.legacy_identity_map from authenticated;
revoke insert, update, delete on table public.audit_log from authenticated;
revoke update, delete on table public.audit_log from authenticated;
revoke update, delete on table public.budget_signed_snapshots from authenticated;

-- Tenant / identity.
create policy clinics_select on public.clinics
for select to authenticated
using ((select private.can_access_clinic(id)));
create policy clinics_admin_update on public.clinics
for update to authenticated
using ((select private.is_clinic_admin(id)))
with check ((select private.is_clinic_admin(id)));

create policy profiles_self_or_admin_select on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.can_admin_profile(id)));
create policy profiles_self_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy clinic_members_self_or_admin_select on public.clinic_members
for select to authenticated
using (profile_id = (select auth.uid()) or (select private.is_clinic_admin(clinic_id)));
create policy user_permissions_self_or_admin_select on public.user_permissions
for select to authenticated
using (exists (
  select 1 from public.clinic_members cm
  where cm.id = clinic_member_id
    and (cm.profile_id = (select auth.uid()) or (select private.is_clinic_admin(cm.clinic_id)))
));
create policy patient_accounts_self_or_admin_select on public.patient_accounts
for select to authenticated
using (profile_id = (select auth.uid()) or (select private.is_clinic_admin(clinic_id)));

create policy app_sessions_select on public.app_sessions
for select to authenticated
using (profile_id = (select auth.uid()) or (select private.is_clinic_admin(clinic_id)));
create policy app_sessions_insert on public.app_sessions
for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and (select private.can_access_clinic(clinic_id))
);
create policy app_sessions_update on public.app_sessions
for update to authenticated
using (profile_id = (select auth.uid()) or (select private.is_clinic_admin(clinic_id)))
with check (profile_id = (select auth.uid()) or (select private.is_clinic_admin(clinic_id)));

create policy staff_members_staff_select on public.staff_members
for select to authenticated
using ((select private.is_clinic_staff(clinic_id)));
create policy staff_members_admin_manage on public.staff_members
for all to authenticated
using ((select private.is_clinic_admin(clinic_id)))
with check ((select private.is_clinic_admin(clinic_id)));

create policy sites_staff_select on public.sites
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy sites_admin_manage on public.sites
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));
create policy cabinets_staff_select on public.cabinets
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy cabinets_admin_manage on public.cabinets
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

-- Patient master and clinical domain.
create policy patients_access on public.patients
for select to authenticated
using ((select private.can_access_patient(clinic_id, id)));
create policy patients_staff_insert on public.patients
for insert to authenticated
with check ((select private.is_clinic_staff(clinic_id)));
create policy patients_staff_update on public.patients
for update to authenticated
using ((select private.is_clinic_staff(clinic_id)))
with check ((select private.is_clinic_staff(clinic_id)));

create policy dental_entities_access on public.dental_entities
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy dental_entities_staff_insert on public.dental_entities
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy dental_entities_staff_update on public.dental_entities
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy clinical_history_access on public.clinical_history_events
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy clinical_history_staff_insert on public.clinical_history_events
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

create policy periodontal_access on public.periodontal_measurements
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy periodontal_staff_manage on public.periodontal_measurements
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy odontogram_snapshots_access on public.odontogram_snapshots
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy odontogram_snapshots_staff_insert on public.odontogram_snapshots
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

create policy clinical_plans_access on public.clinical_plans
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy clinical_plans_staff_manage on public.clinical_plans
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy clinical_plan_items_access on public.clinical_plan_items
for select to authenticated
using (
  (select private.is_clinic_staff(clinic_id))
  or exists (
    select 1 from public.clinical_plans p
    where p.id = plan_id and (select private.is_patient_owner(p.patient_id))
  )
);
create policy clinical_plan_items_staff_manage on public.clinical_plan_items
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy clinical_plan_dependencies_access on public.clinical_plan_dependencies
for select to authenticated
using (
  (select private.is_clinic_staff(clinic_id))
  or exists (
    select 1
    from public.clinical_plan_items i
    join public.clinical_plans p on p.id = i.plan_id
    where i.id = item_id and (select private.is_patient_owner(p.patient_id))
  )
);
create policy clinical_plan_dependencies_staff_manage on public.clinical_plan_dependencies
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

-- Budgets and signatures.
create policy budgets_access on public.budgets
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy budgets_staff_manage on public.budgets
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy budget_items_access on public.budget_items
for select to authenticated
using (
  (select private.is_clinic_staff(clinic_id))
  or exists (
    select 1 from public.budgets b
    where b.id = budget_id and (select private.is_patient_owner(b.patient_id))
  )
);
create policy budget_items_staff_manage on public.budget_items
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy budget_signed_snapshots_access on public.budget_signed_snapshots
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy budget_signed_snapshots_staff_insert on public.budget_signed_snapshots
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

-- Documents and consents.
create policy document_templates_staff_select on public.document_templates
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy document_templates_admin_manage on public.document_templates
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

create policy documents_access on public.documents
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy documents_staff_insert on public.documents
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy documents_staff_update on public.documents
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy consent_requirements_access on public.consent_requirements
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy consent_requirements_staff_manage on public.consent_requirements
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy document_exports_staff_select on public.document_exports
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy document_exports_staff_insert on public.document_exports
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

-- Agenda / reception.
create policy appointments_access on public.appointments
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy appointments_staff_insert on public.appointments
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy appointments_staff_update on public.appointments
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy appointment_status_events_access on public.appointment_status_events
for select to authenticated
using (
  (select private.is_clinic_staff(clinic_id))
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id and (select private.is_patient_owner(a.patient_id))
  )
);
create policy appointment_status_events_staff_insert on public.appointment_status_events
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

create policy appointment_relationships_access on public.appointment_relationships
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy appointment_relationships_staff_insert on public.appointment_relationships
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

create policy appointment_blocks_staff_select on public.appointment_blocks
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy appointment_blocks_staff_manage on public.appointment_blocks
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy patient_recalls_access on public.patient_recalls
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy patient_recalls_staff_manage on public.patient_recalls
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy notifications_recipient_select on public.notifications
for select to authenticated using (recipient_profile_id = (select auth.uid()));
create policy notifications_recipient_update on public.notifications
for update to authenticated using (recipient_profile_id = (select auth.uid())) with check (recipient_profile_id = (select auth.uid()));
create policy notifications_staff_insert on public.notifications
for insert to authenticated
with check (
  (select private.is_clinic_staff(clinic_id))
  and (select private.profile_belongs_to_clinic(recipient_profile_id, clinic_id))
);

-- Payments / finance.
create policy payments_access on public.payments
for select to authenticated using ((select private.can_access_patient(clinic_id, patient_id)));
create policy payments_staff_insert on public.payments
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy payments_staff_update on public.payments
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy payment_allocations_access on public.payment_allocations
for select to authenticated
using (exists (
  select 1 from public.payments p
  where p.id = payment_id and (select private.can_access_patient(p.clinic_id, p.patient_id))
));
create policy payment_allocations_staff_insert on public.payment_allocations
for insert to authenticated
with check (exists (
  select 1 from public.payments p
  where p.id = payment_id and (select private.is_clinic_staff(p.clinic_id))
));
create policy payment_allocations_staff_update on public.payment_allocations
for update to authenticated
using (exists (
  select 1 from public.payments p
  where p.id = payment_id and (select private.is_clinic_staff(p.clinic_id))
))
with check (exists (
  select 1 from public.payments p
  where p.id = payment_id and (select private.is_clinic_staff(p.clinic_id))
));

create policy clinic_payment_methods_staff_select on public.clinic_payment_methods
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy clinic_payment_methods_admin_manage on public.clinic_payment_methods
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));
create policy payment_terminals_staff_select on public.payment_terminals
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy payment_terminals_admin_manage on public.payment_terminals
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));
create policy clinic_payment_settings_staff_select on public.clinic_payment_settings
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy clinic_payment_settings_admin_manage on public.clinic_payment_settings
for all to authenticated using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));
create policy payment_attempts_staff_select on public.payment_attempts
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy payment_attempts_staff_insert on public.payment_attempts
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy payment_attempts_staff_update on public.payment_attempts
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

-- Platform / integrations.
create policy fiscal_records_staff_select on public.fiscal_records
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy fiscal_records_staff_insert on public.fiscal_records
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy fiscal_records_staff_update on public.fiscal_records
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy integration_events_staff_select on public.integration_events
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy integration_events_staff_insert on public.integration_events
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));
create policy integration_events_staff_update on public.integration_events
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy bank_transactions_staff_select on public.bank_transactions
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy bank_transactions_staff_update on public.bank_transactions
for update to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy ai_clinical_reviews_staff_select on public.ai_clinical_reviews
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy ai_clinical_reviews_staff_manage on public.ai_clinical_reviews
for all to authenticated using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));

create policy kiosk_checkins_staff_select on public.kiosk_checkins
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy kiosk_checkins_staff_insert on public.kiosk_checkins
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

create policy interoperability_exports_staff_select on public.interoperability_exports
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
create policy interoperability_exports_staff_insert on public.interoperability_exports
for insert to authenticated with check ((select private.is_clinic_staff(clinic_id)));

-- Audit is readable only by clinic admins and never writable directly by app roles.
create policy audit_log_admin_select on public.audit_log
for select to authenticated using ((select private.is_clinic_admin(clinic_id)));

-- ---------------------------------------------------------------------------
-- 4. Automatic updated_at independent of clients.
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon;
grant execute on function private.set_updated_at() to authenticated;

-- Explicit trigger names keep schema review and automated verification simple.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists clinic_members_set_updated_at on public.clinic_members;
create trigger clinic_members_set_updated_at before update on public.clinic_members for each row execute function private.set_updated_at();
drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients for each row execute function private.set_updated_at();
drop trigger if exists dental_entities_set_updated_at on public.dental_entities;
create trigger dental_entities_set_updated_at before update on public.dental_entities for each row execute function private.set_updated_at();
drop trigger if exists clinical_plans_set_updated_at on public.clinical_plans;
create trigger clinical_plans_set_updated_at before update on public.clinical_plans for each row execute function private.set_updated_at();
drop trigger if exists clinical_plan_items_set_updated_at on public.clinical_plan_items;
create trigger clinical_plan_items_set_updated_at before update on public.clinical_plan_items for each row execute function private.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets for each row execute function private.set_updated_at();
drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function private.set_updated_at();
drop trigger if exists consent_requirements_set_updated_at on public.consent_requirements;
create trigger consent_requirements_set_updated_at before update on public.consent_requirements for each row execute function private.set_updated_at();
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function private.set_updated_at();
drop trigger if exists clinic_payment_methods_set_updated_at on public.clinic_payment_methods;
create trigger clinic_payment_methods_set_updated_at before update on public.clinic_payment_methods for each row execute function private.set_updated_at();
drop trigger if exists payment_terminals_set_updated_at on public.payment_terminals;
create trigger payment_terminals_set_updated_at before update on public.payment_terminals for each row execute function private.set_updated_at();
drop trigger if exists clinic_payment_settings_set_updated_at on public.clinic_payment_settings;
create trigger clinic_payment_settings_set_updated_at before update on public.clinic_payment_settings for each row execute function private.set_updated_at();
drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at before update on public.payment_attempts for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Append-only audit in the SAME transaction as the mutation.
-- ---------------------------------------------------------------------------
alter table public.audit_log add column if not exists actor_staff_id uuid references public.staff_members(id) on delete set null;
alter table public.audit_log add column if not exists correlation_id uuid not null default gen_random_uuid();
alter table public.audit_log add column if not exists before_json jsonb;
alter table public.audit_log add column if not exists after_json jsonb;

create index if not exists audit_log_actor_created_idx on public.audit_log(actor_profile_id, created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists audit_log_correlation_idx on public.audit_log(correlation_id, created_at);

create or replace function private.audit_sensitive_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_clinic_id uuid;
  v_patient_id uuid;
  v_entity_id uuid;
  v_actor_staff_id uuid;
  v_correlation_id uuid;
begin
  v_before := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  v_row := coalesce(v_after, v_before, '{}'::jsonb);

  begin v_clinic_id := nullif(v_row ->> 'clinic_id', '')::uuid; exception when invalid_text_representation then v_clinic_id := null; end;
  begin v_patient_id := nullif(v_row ->> 'patient_id', '')::uuid; exception when invalid_text_representation then v_patient_id := null; end;
  begin v_entity_id := nullif(v_row ->> 'id', '')::uuid; exception when invalid_text_representation then v_entity_id := null; end;

  if v_clinic_id is null and tg_table_name = 'payment_allocations' then
    select p.clinic_id, p.patient_id into v_clinic_id, v_patient_id
    from public.payments p
    where p.id = nullif(v_row ->> 'payment_id', '')::uuid;
  elsif v_clinic_id is null and tg_table_name = 'user_permissions' then
    select cm.clinic_id into v_clinic_id
    from public.clinic_members cm
    where cm.id = nullif(v_row ->> 'clinic_member_id', '')::uuid;
  end if;

  if v_clinic_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select sm.id into v_actor_staff_id
  from public.staff_members sm
  where sm.clinic_id = v_clinic_id
    and sm.profile_id = (select auth.uid())
    and sm.active
  order by sm.created_at asc
  limit 1;

  begin
    v_correlation_id := nullif(current_setting('denty.correlation_id', true), '')::uuid;
  exception when invalid_text_representation then
    v_correlation_id := null;
  end;
  v_correlation_id := coalesce(v_correlation_id, gen_random_uuid());

  insert into public.audit_log(
    clinic_id, actor_profile_id, actor_staff_id, patient_id,
    action, entity_type, entity_id, metadata, correlation_id, before_json, after_json
  ) values (
    v_clinic_id, (select auth.uid()), v_actor_staff_id, v_patient_id,
    tg_op, tg_table_name, v_entity_id,
    jsonb_build_object('trigger', tg_name, 'schema', tg_table_schema),
    v_correlation_id, v_before, v_after
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.audit_sensitive_mutation() from public, anon, authenticated;

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;
revoke all on function private.prevent_audit_mutation() from public, anon;
grant execute on function private.prevent_audit_mutation() to authenticated;

drop trigger if exists audit_log_immutable on public.audit_log;
create trigger audit_log_immutable before update or delete on public.audit_log for each row execute function private.prevent_audit_mutation();

-- Keep signed budget snapshots immutable with a non-privileged private trigger.
create or replace function private.prevent_budget_signed_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Los presupuestos firmados son inmutables; crea una nueva revisión.';
end;
$$;
revoke all on function private.prevent_budget_signed_snapshot_mutation() from public, anon;
grant execute on function private.prevent_budget_signed_snapshot_mutation() to authenticated;
drop trigger if exists budget_signed_snapshots_immutable on public.budget_signed_snapshots;
create trigger budget_signed_snapshots_immutable
before update or delete on public.budget_signed_snapshots
for each row execute function private.prevent_budget_signed_snapshot_mutation();
drop function if exists public.prevent_budget_signed_snapshot_mutation();

-- Audit triggers. BEFORE/AFTER row images and actor are written in the same DB transaction.
drop trigger if exists patients_audit_mutation on public.patients;
create trigger patients_audit_mutation after insert or update or delete on public.patients for each row execute function private.audit_sensitive_mutation();
drop trigger if exists staff_members_audit_mutation on public.staff_members;
create trigger staff_members_audit_mutation after insert or update or delete on public.staff_members for each row execute function private.audit_sensitive_mutation();
drop trigger if exists clinic_members_audit_mutation on public.clinic_members;
create trigger clinic_members_audit_mutation after insert or update or delete on public.clinic_members for each row execute function private.audit_sensitive_mutation();
drop trigger if exists user_permissions_audit_mutation on public.user_permissions;
create trigger user_permissions_audit_mutation after insert or update or delete on public.user_permissions for each row execute function private.audit_sensitive_mutation();
drop trigger if exists patient_accounts_audit_mutation on public.patient_accounts;
create trigger patient_accounts_audit_mutation after insert or update or delete on public.patient_accounts for each row execute function private.audit_sensitive_mutation();
drop trigger if exists dental_entities_audit_mutation on public.dental_entities;
create trigger dental_entities_audit_mutation after insert or update or delete on public.dental_entities for each row execute function private.audit_sensitive_mutation();
drop trigger if exists clinical_history_events_audit_mutation on public.clinical_history_events;
create trigger clinical_history_events_audit_mutation after insert or update or delete on public.clinical_history_events for each row execute function private.audit_sensitive_mutation();
drop trigger if exists odontogram_snapshots_audit_mutation on public.odontogram_snapshots;
create trigger odontogram_snapshots_audit_mutation after insert or update or delete on public.odontogram_snapshots for each row execute function private.audit_sensitive_mutation();
drop trigger if exists periodontal_measurements_audit_mutation on public.periodontal_measurements;
create trigger periodontal_measurements_audit_mutation after insert or update or delete on public.periodontal_measurements for each row execute function private.audit_sensitive_mutation();
drop trigger if exists clinical_plans_audit_mutation on public.clinical_plans;
create trigger clinical_plans_audit_mutation after insert or update or delete on public.clinical_plans for each row execute function private.audit_sensitive_mutation();
drop trigger if exists clinical_plan_items_audit_mutation on public.clinical_plan_items;
create trigger clinical_plan_items_audit_mutation after insert or update or delete on public.clinical_plan_items for each row execute function private.audit_sensitive_mutation();
drop trigger if exists clinical_plan_dependencies_audit_mutation on public.clinical_plan_dependencies;
create trigger clinical_plan_dependencies_audit_mutation after insert or update or delete on public.clinical_plan_dependencies for each row execute function private.audit_sensitive_mutation();
drop trigger if exists budgets_audit_mutation on public.budgets;
create trigger budgets_audit_mutation after insert or update or delete on public.budgets for each row execute function private.audit_sensitive_mutation();
drop trigger if exists budget_items_audit_mutation on public.budget_items;
create trigger budget_items_audit_mutation after insert or update or delete on public.budget_items for each row execute function private.audit_sensitive_mutation();
drop trigger if exists budget_signed_snapshots_audit_mutation on public.budget_signed_snapshots;
create trigger budget_signed_snapshots_audit_mutation after insert on public.budget_signed_snapshots for each row execute function private.audit_sensitive_mutation();
drop trigger if exists documents_audit_mutation on public.documents;
create trigger documents_audit_mutation after insert or update or delete on public.documents for each row execute function private.audit_sensitive_mutation();
drop trigger if exists consent_requirements_audit_mutation on public.consent_requirements;
create trigger consent_requirements_audit_mutation after insert or update or delete on public.consent_requirements for each row execute function private.audit_sensitive_mutation();
drop trigger if exists appointments_audit_mutation on public.appointments;
create trigger appointments_audit_mutation after insert or update or delete on public.appointments for each row execute function private.audit_sensitive_mutation();
drop trigger if exists appointment_status_events_audit_mutation on public.appointment_status_events;
create trigger appointment_status_events_audit_mutation after insert on public.appointment_status_events for each row execute function private.audit_sensitive_mutation();
drop trigger if exists payments_audit_mutation on public.payments;
create trigger payments_audit_mutation after insert or update or delete on public.payments for each row execute function private.audit_sensitive_mutation();
drop trigger if exists payment_allocations_audit_mutation on public.payment_allocations;
create trigger payment_allocations_audit_mutation after insert or update or delete on public.payment_allocations for each row execute function private.audit_sensitive_mutation();
drop trigger if exists payment_attempts_audit_mutation on public.payment_attempts;
create trigger payment_attempts_audit_mutation after insert or update or delete on public.payment_attempts for each row execute function private.audit_sensitive_mutation();

-- ---------------------------------------------------------------------------
-- 6. Tenant/natural-key constraints and indexes used by RLS + core queries.
-- ---------------------------------------------------------------------------
create unique index if not exists patients_clinic_record_number_uq
  on public.patients(clinic_id, record_number)
  where record_number is not null and btrim(record_number) <> '';
create unique index if not exists patients_clinic_legacy_id_uq
  on public.patients(clinic_id, legacy_id)
  where legacy_id is not null;
create unique index if not exists sites_clinic_name_uq
  on public.sites(clinic_id, lower(name));
create unique index if not exists cabinets_site_name_uq
  on public.cabinets(site_id, lower(name));
create unique index if not exists document_templates_clinic_code_version_uq
  on public.document_templates(clinic_id, code, version);
create unique index if not exists budgets_clinic_code_revision_uq
  on public.budgets(clinic_id, code, revision);
create unique index if not exists clinical_plan_dependencies_pair_uq
  on public.clinical_plan_dependencies(item_id, depends_on_id);
create unique index if not exists clinic_payment_methods_clinic_label_uq
  on public.clinic_payment_methods(clinic_id, lower(label));
create unique index if not exists payment_terminals_provider_terminal_uq
  on public.payment_terminals(clinic_id, provider_terminal_id)
  where provider_terminal_id is not null and btrim(provider_terminal_id) <> '';

-- Cross-row and temporal constraints. NOT VALID avoids blocking deployment on legacy rows,
-- while still enforcing all new/changed rows; legacy cleanup can validate them later.
do $$ begin
  alter table public.appointments add constraint appointments_time_order_ck check (ends_at > starts_at) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.appointment_blocks add constraint appointment_blocks_time_order_ck check (ends_at > starts_at) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinical_plan_dependencies add constraint clinical_plan_dependencies_not_self_ck check (item_id <> depends_on_id) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.payment_allocations add constraint payment_allocations_budget_fk foreign key (budget_id) references public.budgets(id) on delete set null not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fiscal_records add constraint fiscal_records_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.integration_events add constraint integration_events_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bank_transactions add constraint bank_transactions_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bank_transactions add constraint bank_transactions_payment_fk foreign key (reconciled_payment_id) references public.payments(id) on delete set null not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_clinical_reviews add constraint ai_clinical_reviews_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_clinical_reviews add constraint ai_clinical_reviews_patient_fk foreign key (patient_id) references public.patients(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_clinical_reviews add constraint ai_clinical_reviews_document_fk foreign key (document_id) references public.documents(id) on delete set null not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiosk_checkins add constraint kiosk_checkins_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiosk_checkins add constraint kiosk_checkins_appointment_fk foreign key (appointment_id) references public.appointments(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiosk_checkins add constraint kiosk_checkins_patient_fk foreign key (patient_id) references public.patients(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.interoperability_exports add constraint interoperability_exports_clinic_fk foreign key (clinic_id) references public.clinics(id) on delete cascade not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.interoperability_exports add constraint interoperability_exports_patient_fk foreign key (patient_id) references public.patients(id) on delete set null not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.payment_attempts add constraint payment_attempts_created_by_fk foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; end $$;

create index if not exists patients_clinic_idx on public.patients(clinic_id, archived_at, created_at desc);
create index if not exists staff_members_clinic_active_idx on public.staff_members(clinic_id, active, display_name);
create index if not exists sites_clinic_idx on public.sites(clinic_id, name);
create index if not exists cabinets_clinic_site_idx on public.cabinets(clinic_id, site_id, name);
create index if not exists dental_entities_clinic_patient_idx on public.dental_entities(clinic_id, patient_id, active, version desc);
create index if not exists clinical_history_clinic_patient_idx on public.clinical_history_events(clinic_id, patient_id, created_at desc);
create index if not exists periodontal_clinic_patient_idx on public.periodontal_measurements(clinic_id, patient_id, measured_at desc);
create index if not exists odontogram_snapshots_clinic_patient_idx on public.odontogram_snapshots(clinic_id, patient_id, created_at desc);
create index if not exists clinical_plans_clinic_patient_idx on public.clinical_plans(clinic_id, patient_id, updated_at desc);
create index if not exists clinical_plan_items_clinic_plan_idx on public.clinical_plan_items(clinic_id, plan_id, phase, priority);
create index if not exists clinical_plan_dependencies_clinic_idx on public.clinical_plan_dependencies(clinic_id, item_id);
create index if not exists budgets_clinic_patient_idx on public.budgets(clinic_id, patient_id, created_at desc);
create index if not exists budget_items_clinic_budget_idx on public.budget_items(clinic_id, budget_id);
create index if not exists document_templates_clinic_active_idx on public.document_templates(clinic_id, active, code);
create index if not exists documents_clinic_patient_idx on public.documents(clinic_id, patient_id, created_at desc);
create index if not exists consent_requirements_clinic_patient_idx on public.consent_requirements(clinic_id, patient_id, status);
create index if not exists appointments_clinic_start_idx on public.appointments(clinic_id, starts_at, status);
create index if not exists appointments_patient_start_idx on public.appointments(patient_id, starts_at desc);
create index if not exists payments_clinic_patient_idx on public.payments(clinic_id, patient_id, paid_at desc);
create index if not exists payment_attempts_clinic_status_idx on public.payment_attempts(clinic_id, provider_status, created_at desc);
create index if not exists fiscal_records_clinic_created_idx on public.fiscal_records(clinic_id, created_at desc);
create index if not exists bank_transactions_clinic_occurred_idx on public.bank_transactions(clinic_id, occurred_at desc);
create index if not exists ai_clinical_reviews_clinic_patient_idx on public.ai_clinical_reviews(clinic_id, patient_id, created_at desc);
create index if not exists kiosk_checkins_clinic_checked_idx on public.kiosk_checkins(clinic_id, checked_in_at desc);
create index if not exists interoperability_exports_clinic_created_idx on public.interoperability_exports(clinic_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Transactional RPC boundaries. All are SECURITY INVOKER: RLS still applies.
-- ---------------------------------------------------------------------------
create or replace function public.save_odontogram_batch(
  p_patient_id uuid,
  p_expected_version integer,
  p_entities jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_current_version integer;
  v_next_version integer;
  v_entity jsonb;
  v_entity_count integer := 0;
  v_rows jsonb;
begin
  select p.clinic_id into v_clinic_id
  from public.patients p
  where p.id = p_patient_id;

  if v_clinic_id is null then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_staff(v_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(max(de.version), 1) into v_current_version
  from public.dental_entities de
  where de.patient_id = p_patient_id;

  if v_current_version <> p_expected_version then
    return jsonb_build_object('conflict', true, 'currentVersion', v_current_version);
  end if;

  v_next_version := p_expected_version + 1;
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  update public.dental_entities
  set active = false
  where patient_id = p_patient_id and active;

  for v_entity in select value from jsonb_array_elements(coalesce(p_entities, '[]'::jsonb))
  loop
    if coalesce((v_entity ->> 'active')::boolean, true) then
      insert into public.dental_entities(
        clinic_id, patient_id, tooth, arch, entity_type, status,
        surfaces_json, attributes_json, parent_id, active, version
      ) values (
        v_clinic_id,
        p_patient_id,
        nullif(v_entity ->> 'tooth', ''),
        nullif(v_entity ->> 'arch', ''),
        v_entity ->> 'entityType',
        v_entity ->> 'status',
        coalesce(v_entity -> 'surfaces', 'null'::jsonb),
        coalesce(v_entity -> 'attributes', '{}'::jsonb),
        null,
        true,
        v_next_version
      );
      v_entity_count := v_entity_count + 1;
    end if;
  end loop;

  insert into public.clinical_history_events(
    clinic_id, patient_id, actor_id, event_type, entity_type, payload_json
  ) values (
    v_clinic_id, p_patient_id, (select auth.uid()), 'ODONTOGRAM_BATCH_SAVED', 'ODONTOGRAM',
    jsonb_build_object('version', v_next_version, 'entityCount', v_entity_count)
  );

  select coalesce(jsonb_agg(to_jsonb(de) order by de.created_at asc), '[]'::jsonb)
  into v_rows
  from public.dental_entities de
  where de.patient_id = p_patient_id and de.active and de.version = v_next_version;

  return jsonb_build_object('version', v_next_version, 'entities', v_rows);
end;
$$;

create or replace function public.transition_appointment(
  p_appointment_id uuid,
  p_expected_version integer,
  p_new_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_previous_status text;
begin
  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if v_appointment.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinic_staff(v_appointment.clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if v_appointment.version <> p_expected_version then
    return jsonb_build_object('conflict', true, 'currentVersion', v_appointment.version);
  end if;
  if p_new_status not in ('PLANNED','ARRIVED','WAITING','IN_CHAIR','COMPLETED','NO_SHOW','CANCELLED','RUNNING_LATE') then
    raise exception 'INVALID_APPOINTMENT_STATUS' using errcode = '22023';
  end if;

  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  v_previous_status := v_appointment.status;
  update public.appointments
  set status = p_new_status,
      reason = coalesce(p_reason, reason),
      version = version + 1,
      arrived_at = case when p_new_status = 'ARRIVED' then coalesce(arrived_at, now()) else arrived_at end,
      waiting_room_at = case when p_new_status = 'WAITING' then coalesce(waiting_room_at, now()) else waiting_room_at end,
      chair_started_at = case when p_new_status = 'IN_CHAIR' then coalesce(chair_started_at, now()) else chair_started_at end,
      completed_at = case when p_new_status = 'COMPLETED' then coalesce(completed_at, now()) else completed_at end,
      cancelled_at = case when p_new_status = 'CANCELLED' then coalesce(cancelled_at, now()) else cancelled_at end,
      no_show_at = case when p_new_status = 'NO_SHOW' then coalesce(no_show_at, now()) else no_show_at end
  where id = p_appointment_id
  returning * into v_appointment;

  insert into public.appointment_status_events(clinic_id, appointment_id, previous_status, new_status, changed_by)
  values (v_appointment.clinic_id, v_appointment.id, v_previous_status, p_new_status, (select auth.uid()));

  return to_jsonb(v_appointment);
end;
$$;

create or replace function public.finalize_budget_signature(
  p_budget_id uuid,
  p_expected_version integer,
  p_signer_name text,
  p_signature_data text,
  p_snapshot_json jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_snapshot public.budget_signed_snapshots%rowtype;
begin
  select * into v_budget from public.budgets where id = p_budget_id for update;
  if v_budget.id is null then raise exception 'BUDGET_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinic_staff(v_budget.clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if v_budget.version <> p_expected_version then
    return jsonb_build_object('conflict', true, 'currentVersion', v_budget.version);
  end if;

  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  insert into public.budget_signed_snapshots(
    clinic_id, budget_id, patient_id, revision, signer_name, signature_data, snapshot_json
  ) values (
    v_budget.clinic_id, v_budget.id, v_budget.patient_id, v_budget.revision,
    btrim(p_signer_name), p_signature_data, coalesce(p_snapshot_json, '{}'::jsonb)
  ) returning * into v_snapshot;

  update public.budgets
  set status = 'SIGNED', version = version + 1
  where id = v_budget.id
  returning * into v_budget;

  return jsonb_build_object('budget', to_jsonb(v_budget), 'snapshot', to_jsonb(v_snapshot));
end;
$$;

create or replace function public.record_payment(
  p_patient_id uuid,
  p_budget_id uuid,
  p_amount_cents integer,
  p_method text,
  p_provider text default null,
  p_provider_transaction_id text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_payment public.payments%rowtype;
begin
  select p.clinic_id into v_clinic_id from public.patients p where p.id = p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_amount_cents <= 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;

  if p_budget_id is not null and not exists (
    select 1 from public.budgets b where b.id = p_budget_id and b.patient_id = p_patient_id and b.clinic_id = v_clinic_id
  ) then
    raise exception 'BUDGET_PATIENT_MISMATCH' using errcode = '23514';
  end if;

  if p_idempotency_key is not null then
    select * into v_payment
    from public.payments p
    where p.clinic_id = v_clinic_id and p.idempotency_key = p_idempotency_key
    limit 1;
    if v_payment.id is not null then return to_jsonb(v_payment); end if;
  end if;

  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  insert into public.payments(
    clinic_id, patient_id, budget_id, amount_cents, method, status,
    provider, provider_transaction_id, received_by, idempotency_key
  ) values (
    v_clinic_id, p_patient_id, p_budget_id, p_amount_cents, p_method, 'COMPLETED',
    p_provider, p_provider_transaction_id, (select auth.uid()), p_idempotency_key
  ) returning * into v_payment;

  if p_budget_id is not null then
    insert into public.payment_allocations(payment_id, budget_id, amount_cents)
    values (v_payment.id, p_budget_id, p_amount_cents);
  end if;

  return to_jsonb(v_payment);
end;
$$;

-- RPC privileges: never leave default PUBLIC execute in place.
revoke execute on function public.save_odontogram_batch(uuid, integer, jsonb) from public, anon;
revoke execute on function public.transition_appointment(uuid, integer, text, text) from public, anon;
revoke execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) from public, anon;
revoke execute on function public.record_payment(uuid, uuid, integer, text, text, text, text) from public, anon;
grant execute on function public.save_odontogram_batch(uuid, integer, jsonb) to authenticated;
grant execute on function public.transition_appointment(uuid, integer, text, text) to authenticated;
grant execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) to authenticated;
grant execute on function public.record_payment(uuid, uuid, integer, text, text, text, text) to authenticated;

commit;
