-- Run through Supabase SQL/MCP against a seeded Denty database. No data persists.
begin;
do $$
declare member public.clinic_members%rowtype; task public.tasks%rowtype; state text;
begin
  select cm.* into member from public.clinic_members cm
  where cm.active and exists(select 1 from public.tasks t where t.clinic_id=cm.clinic_id) limit 1;
  if member.id is null then raise exception 'Fixture requires an active staff member and task'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member.profile_id,'role','authenticated')::text,true);
  select * into task from public.tasks where clinic_id=member.clinic_id limit 1;
  begin
    perform public.update_task_status(task.id,task.status,task.version-1);
    raise exception 'Stale task version accepted';
  exception when others then
    get stacked diagnostics state=returned_sqlstate;
    if state<>'PT409' then raise exception 'Expected PT409, got %',state; end if;
  end;
  begin
    perform public.update_task(task.id,p_expected_version=>task.version-1);
    raise exception 'Stale task edit accepted';
  exception when others then
    get stacked diagnostics state=returned_sqlstate;
    if state<>'PT409' then raise exception 'Expected PT409, got %',state; end if;
  end;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%40001%') then
    raise exception 'Business RPC still raises serialization_failure';
  end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  begin
    perform public.update_task_status(task.id,task.status,task.version);
    raise exception 'Outsider task update accepted';
  exception when others then
    get stacked diagnostics state=returned_sqlstate;
    if state<>'42501' then raise exception 'Expected permission denial, got %',state; end if;
  end;
  if has_function_privilege('anon','public.update_task_status(uuid,text,integer,uuid,timestamptz)','execute') then
    raise exception 'Anonymous task mutation is permitted';
  end if;
end $$;
rollback;
