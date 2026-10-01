-- Cache current-user membership sets once per SELECT, rather than once per patient.
-- These helpers accept no user ID and expose only the current JWT user's scope.
create or replace function private.current_staff_clinic_ids()
returns setof uuid language sql stable security definer set search_path='' as $$
  select cm.clinic_id from public.clinic_members cm
  where cm.profile_id=(select auth.uid()) and cm.active
    and cm.role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT');
$$;
create or replace function private.current_owned_patient_ids()
returns setof uuid language sql stable security definer set search_path='' as $$
  select pa.patient_id from public.patient_accounts pa
  join public.patients p on p.id=pa.patient_id and p.clinic_id=pa.clinic_id
  where pa.profile_id=(select auth.uid()) and pa.active;
$$;
revoke all on function private.current_staff_clinic_ids(),private.current_owned_patient_ids() from public,anon;
grant execute on function private.current_staff_clinic_ids(),private.current_owned_patient_ids() to authenticated;
alter policy patients_access on public.patients using (
  clinic_id in (select private.current_staff_clinic_ids())
  or id in (select private.current_owned_patient_ids())
);
create index if not exists clinic_contacts_created_by_idx on public.clinic_contacts(created_by);
create index if not exists payment_terminals_site_id_idx on public.payment_terminals(site_id);
