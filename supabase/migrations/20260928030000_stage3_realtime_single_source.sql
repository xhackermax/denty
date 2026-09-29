-- Stage 3: Supabase is the only runtime source of truth and Realtime Broadcast
-- is scoped by clinic membership. Safe to re-run in staging.

-- Stage 13: the project "postgres" role does not own realtime.messages on hosted
-- Supabase, so the policy is created when allowed and otherwise re-attempted by
-- 20260929130000_stage13_integration_gate.sql / documented in STAGE13-HANDOFF.
do $$
begin
  execute 'alter table realtime.messages enable row level security';
  execute 'drop policy if exists "denty clinic members receive broadcasts" on realtime.messages';
  execute 'create policy "denty clinic members receive broadcasts"
    on realtime.messages for select to authenticated
    using (
      split_part(realtime.topic(), '':'', 1) = ''clinic''
      and exists (
        select 1 from public.clinic_members cm
        where cm.profile_id = auth.uid()
          and cm.active = true
          and cm.clinic_id::text = split_part(realtime.topic(), '':'', 2)
      )
    )';
exception
  when insufficient_privilege then
    raise notice 'Skipping realtime.messages RLS policy because this role does not own Supabase managed realtime tables.';
end $$;

create or replace function private.broadcast_denty_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_uuid uuid;
begin
  if tg_op = 'DELETE' then
    clinic_uuid := (to_jsonb(old)->>'clinic_id')::uuid;
  else
    clinic_uuid := (to_jsonb(new)->>'clinic_id')::uuid;
  end if;
  if clinic_uuid is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  perform realtime.broadcast_changes(
    'clinic:' || clinic_uuid::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.broadcast_denty_change() from public;

-- Attach one broadcast trigger to every public table that carries clinic_id.
do $$
declare r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'clinic_id'
  loop
    execute format('drop trigger if exists denty_realtime_broadcast on public.%I', r.table_name);
    execute format(
      'create trigger denty_realtime_broadcast after insert or update or delete on public.%I for each row execute function private.broadcast_denty_change()',
      r.table_name
    );
  end loop;
end $$;
