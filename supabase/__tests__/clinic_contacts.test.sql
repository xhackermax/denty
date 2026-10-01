-- Tests for clinic_contacts RPC functions
-- Run with: psql $DATABASE_URL -f supabase/__tests__/clinic_contacts.test.sql

begin;

-- Setup: create test clinic and staff
with fixtures as (
  insert into public.clinics(name) values('Test Clinic') returning id as clinic_id
),
auth_user as (
  select auth.uid() as user_id
),
staff as (
  insert into public.staff_members(clinic_id, display_name, role, active)
  select f.clinic_id, 'Test Staff', 'ASSISTANT', true
  from fixtures f
  returning id, clinic_id
)
select 'Setup complete' as test;

-- Test 1: Create a contact successfully
with clinic as (
  select id from public.clinics where name = 'Test Clinic'
),
contact as (
  select * from public.create_clinic_contact(
    p_clinic_id := (select id from clinic),
    p_name := 'Plumber Juan',
    p_category := 'Plumber',
    p_phones := jsonb_build_array(jsonb_build_object('number', '555-1234', 'type', 'mobile')),
    p_emails := jsonb_build_array('plumber@example.com'),
    p_notes := 'Available weekdays',
    p_hours := '9:00-17:00'
  )
)
select
  case
    when (select name from contact) = 'Plumber Juan' then 'PASS: Create contact'
    else 'FAIL: Create contact - name mismatch'
  end as test,
  (select category from contact) as category;

-- Test 2: List contacts
with clinic as (
  select id from public.clinics where name = 'Test Clinic'
),
list_result as (
  select * from public.list_clinic_contacts(
    p_clinic_id := (select id from clinic),
    p_limit := 10
  )
)
select
  case
    when (select count(*) from list_result) > 0 then 'PASS: List contacts'
    else 'FAIL: List contacts - no results'
  end as test,
  (select total_count from list_result limit 1) as count;

-- Test 3: Search contacts
with clinic as (
  select id from public.clinics where name = 'Test Clinic'
),
search_result as (
  select * from public.list_clinic_contacts(
    p_clinic_id := (select id from clinic),
    p_search := 'Plumber',
    p_limit := 10
  )
)
select
  case
    when (select count(*) from search_result) > 0 then 'PASS: Search contacts'
    else 'FAIL: Search contacts - no results'
  end as test;

-- Test 4: Update a contact
with clinic as (
  select id from public.clinics where name = 'Test Clinic'
),
contact_id as (
  select id, version from public.clinic_contacts
  where clinic_id = (select id from clinic)
  and name = 'Plumber Juan'
  limit 1
),
updated as (
  select * from public.update_clinic_contact(
    p_contact_id := (select id from contact_id),
    p_name := 'Plumber Juan Updated',
    p_expected_version := (select version from contact_id)
  )
)
select
  case
    when (select name from updated) = 'Plumber Juan Updated' then 'PASS: Update contact'
    else 'FAIL: Update contact - name not updated'
  end as test;

-- Test 5: Delete a contact
with clinic as (
  select id from public.clinics where name = 'Test Clinic'
),
contact_to_delete as (
  select id from public.clinic_contacts
  where clinic_id = (select id from clinic)
  and name = 'Plumber Juan Updated'
  limit 1
),
deleted as (
  select public.delete_clinic_contact((select id from contact_to_delete))
),
verify as (
  select count(*) as remaining from public.clinic_contacts
  where clinic_id = (select id from clinic)
)
select
  case
    when (select remaining from verify) = 0 then 'PASS: Delete contact'
    else 'FAIL: Delete contact - contact still exists'
  end as test;

-- Cleanup
delete from public.clinic_contacts;
delete from public.staff_members;
delete from public.clinics where name = 'Test Clinic';

commit;
