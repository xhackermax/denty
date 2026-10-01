-- Executed against isolated fixture by scripts/clinical/__tests__/shared-mouth-sql.test.ts.
do $$ begin
 if private.tooth_is_probeable('00000000-0000-4000-8000-000000000002','36') then raise exception 'Missing tooth was probeable'; end if;
 begin
  insert into periodontal_measurements(patient_id,tooth) values('00000000-0000-4000-8000-000000000002','36');
  raise exception 'Missing tooth accepted';
 exception when check_violation then null; end;
 update dental_entities set active=false;
 insert into periodontal_measurements(patient_id,tooth) values('00000000-0000-4000-8000-000000000002','36');
end $$;
