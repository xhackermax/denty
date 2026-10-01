-- Isolated role-aware fixture: scripts/clinical/__tests__/diagnosis-sql.test.ts.
do $$ begin
 begin
 insert into public.clinical_diagnoses(clinic_id,patient_id,category,value,detail,justification)
 values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','periodontal','healthy','{}','');
 raise exception 'Cross-clinic diagnosis write accepted';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.clinical_diagnoses where clinic_id='00000000-0000-4000-8000-000000000011') then raise exception 'Cross-clinic diagnosis visible';end if;
 begin
 update public.clinical_diagnoses set justification='Overwrite';
 raise exception 'Clinical history overwrite accepted';
 exception when insufficient_privilege then null;end;
end $$;
