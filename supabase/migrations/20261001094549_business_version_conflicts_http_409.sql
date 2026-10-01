-- Business version conflicts are HTTP 409, never serialization failures.
-- Preserve each function's signature, permissions, search_path and full body.
do $migration$
declare fn record; old_definition text; new_definition text;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('transition_lab_work','transition_privacy_request',
        'update_clinic_contact','update_laboratory','update_marketing_campaign',
        'update_prescription_draft','update_task','update_task_status')
      and p.prosrc like '%40001%'
  loop
    old_definition := pg_get_functiondef(fn.oid);
    new_definition := replace(old_definition, '''40001''', '''PT409''');
    if new_definition = old_definition then
      raise exception 'Version conflict SQLSTATE could not be replaced for %',fn.oid::regprocedure;
    end if;
    execute new_definition;
  end loop;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%40001%'
  ) then raise exception 'Unsafe business serialization error remains'; end if;
end $migration$;
notify pgrst, 'reload schema';
