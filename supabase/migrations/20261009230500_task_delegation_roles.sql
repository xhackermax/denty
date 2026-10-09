-- Task delegation: clinic administrators can assign any active colleague;
-- dentists can delegate to receptionists and assistants/hygienists;
-- reception/assistants can only assign to their own linked staff identity.
--
-- The task RPCs are SECURITY DEFINER and bypass table RLS. Guard assignments
-- at the table boundary so no RPC variant can bypass this rule.
begin;

create or replace function private.enforce_task_delegation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_target_profile_id uuid;
begin
  -- Status updates and other edits preserve the previous assignee.
  if tg_op = 'UPDATE' and new.assignee_staff_id is not distinct from old.assignee_staff_id then
    return new;
  end if;
  if new.assignee_staff_id is null then
    return new;
  end if;

  select cm.role into v_actor_role
  from public.clinic_members cm
  where cm.clinic_id = new.clinic_id
    and cm.profile_id = (select auth.uid())
    and cm.active
  limit 1;

  if v_actor_role is null then
    raise exception 'TASK_ASSIGNMENT_FORBIDDEN' using errcode = '42501';
  end if;

  select sm.role, sm.profile_id into v_target_role, v_target_profile_id
  from public.staff_members sm
  where sm.id = new.assignee_staff_id
    and sm.clinic_id = new.clinic_id
    and sm.active;

  if v_target_role is null then
    raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode = '23514';
  end if;

  if v_actor_role = 'ADMIN'
    or v_target_profile_id = (select auth.uid())
    or (v_actor_role = 'DENTIST' and v_target_role in ('RECEPTION', 'ASSISTANT'))
  then
    return new;
  end if;

  raise exception 'TASK_ASSIGNMENT_FORBIDDEN' using errcode = '42501';
end;
$$;

revoke all on function private.enforce_task_delegation() from public, anon, authenticated;

drop trigger if exists tasks_enforce_delegation on public.tasks;
create trigger tasks_enforce_delegation
before insert or update of assignee_staff_id
on public.tasks
for each row execute function private.enforce_task_delegation();

commit;
