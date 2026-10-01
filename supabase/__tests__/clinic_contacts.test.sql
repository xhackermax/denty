-- Contact RPC integration test. Uses a real staff identity; every mutation rolls back.
-- Run against a seeded Denty database via SQL/MCP or psql with ON_ERROR_STOP=1.
begin;
do $$
declare member public.clinic_members%rowtype;
begin
  select * into member from public.clinic_members
    where active and role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT') limit 1;
  if member.id is null then raise exception 'Fixture requires an active staff member'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member.profile_id,'role','authenticated')::text,true);
  perform set_config('app.test_clinic',member.clinic_id::text,true);
end $$;
set local role authenticated;
do $$
declare contact public.clinic_contacts%rowtype; updated public.clinic_contacts%rowtype;
  state text; test_name text := 'Regression '||gen_random_uuid()::text;
  original_claims text := current_setting('request.jwt.claims');
begin
  select * into contact from public.create_clinic_contact(
    p_clinic_id=>current_setting('app.test_clinic')::uuid,
    p_name=>test_name,p_category=>'Regression',p_notes=>'Temporary notes');
  if contact.id is null or contact.name<>test_name then raise exception 'Contact creation failed'; end if;
  if not exists(select 1 from public.list_clinic_contacts(
    current_setting('app.test_clinic')::uuid,p_search=>test_name) c where c.id=contact.id) then
    raise exception 'Contact search failed';
  end if;
  select * into updated from public.update_clinic_contact(
    p_contact_id=>contact.id,p_name=>test_name||' updated',p_notes=>'',p_expected_version=>contact.version);
  if updated.version<>contact.version+1 or updated.notes is not null then
    raise exception 'Contact update or note clearing failed';
  end if;
  begin
    perform public.update_clinic_contact(p_contact_id=>contact.id,p_expected_version=>contact.version);
    raise exception 'Stale contact update accepted';
  exception when others then
    get stacked diagnostics state=returned_sqlstate;
    if state<>'PT409' then raise exception 'Expected PT409, got %',state; end if;
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  begin
    perform public.list_clinic_contacts(current_setting('app.test_clinic')::uuid);
    raise exception 'Outsider contact read accepted';
  exception when others then
    get stacked diagnostics state=returned_sqlstate;
    if state<>'42501' then raise exception 'Expected permission denial, got %',state; end if;
  end;
  perform set_config('request.jwt.claims',original_claims,true);
  perform public.delete_clinic_contact(contact.id);
  if exists(select 1 from public.clinic_contacts where id=contact.id) then
    raise exception 'Contact deletion failed';
  end if;
end $$;
rollback;
