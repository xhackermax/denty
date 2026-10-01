-- Staff, outsider, patient-owner and inactive-account cases; all fixtures roll back.
begin;
do $$
declare member public.clinic_members%rowtype; patient uuid; other_clinic uuid;
begin
  select * into member from public.clinic_members where active limit 1;
  if member.id is null then raise exception 'Fixture requires an active clinic member'; end if;
  select id into patient from public.patients where clinic_id=member.clinic_id limit 1;
  if patient is null then raise exception 'Fixture requires a patient'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member.profile_id,'role','authenticated')::text,true);
  perform set_config('app.test_profile',member.profile_id::text,true);
  perform set_config('app.test_patient',patient::text,true);
  perform set_config('app.test_expected',(select count(*)::text from public.patients p where private.can_access_patient(p.clinic_id,p.id)),true);
  insert into public.clinics(name) values('Temporary RLS regression clinic') returning id into other_clinic;
  insert into public.patients(clinic_id,record_number,first_name,last_name)
    values(other_clinic,'RLS-REGRESSION','Temporary','Fixture');
end $$;
set local role authenticated;
do $$
begin
  if (select count(*) from public.patients)<>current_setting('app.test_expected')::bigint then
    raise exception 'Staff access changed or another clinic became visible';
  end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  if exists(select 1 from public.patients) then raise exception 'Outsider can read patients'; end if;
end $$;
set local role postgres;
do $$ begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_profile'),'role','authenticated')::text,true);
end $$;
update public.clinic_members set active=false where profile_id=current_setting('app.test_profile')::uuid;
insert into public.patient_accounts(clinic_id,patient_id,profile_id)
  select clinic_id,id,current_setting('app.test_profile')::uuid from public.patients where id=current_setting('app.test_patient')::uuid;
set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_profile'),'role','authenticated')::text,true);
  if (select count(*) from public.patients)<>1
    or not exists(select 1 from public.patients where id=current_setting('app.test_patient')::uuid) then
    raise exception 'Patient owner cannot read exactly their own patient';
  end if;
end $$;
set local role postgres;
update public.patient_accounts set active=false where profile_id=current_setting('app.test_profile')::uuid;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.patients) then raise exception 'Inactive patient account can read patients'; end if;
end $$;
rollback;
