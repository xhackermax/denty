-- Clinical tradeoff library, phase 2 («DENTY · Matriz maestra de tratamientos» v1.0, part V).
--
-- 1) Each clinic adapts the shared catalog without copying it: one override row per phrase it
--    edits, hides, reorders or adds. Deleting the row restores the template phrase. The template
--    itself stays in code (src/domain/plan/tradeoff-catalog) so every clinic gets corrections.
-- 2) Every change to an override is kept in an append-only history (who, when, before, after).
-- 3) What was shown to the patient and what they decided is saved as an immutable snapshot.
--    Saving again adds a new version to the same series; nothing is ever updated in place.
begin;

create table if not exists public.clinical_argument_overrides (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  phrase_id text not null check (phrase_id ~ '^[a-z]\.[a-z0-9-]+\.[A-Z][A-Za-z0-9-]*$'),
  entry_id text not null check (entry_id ~ '^[a-z]\.[a-z0-9-]+$'),
  kind text not null check (kind in ('advantage', 'disadvantage')),
  text text check (text is null or length(btrim(text)) between 1 and 300),
  hidden boolean not null default false,
  position integer check (position is null or position between 0 and 999),
  custom boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, phrase_id),
  -- A phrase the clinic added has nothing to fall back to.
  check (not custom or text is not null),
  check (starts_with(phrase_id, entry_id || '.'))
);
create index if not exists clinical_argument_overrides_entry_idx
  on public.clinical_argument_overrides(clinic_id, entry_id);

create table if not exists public.clinical_argument_override_history (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  phrase_id text not null,
  entry_id text not null,
  action text not null check (action in ('SAVE', 'RESTORE')),
  before jsonb,
  after jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index if not exists clinical_argument_override_history_entry_idx
  on public.clinical_argument_override_history(clinic_id, entry_id, changed_at desc);

create or replace function private.record_argument_override_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row public.clinical_argument_overrides%rowtype;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  insert into public.clinical_argument_override_history(
    clinic_id, phrase_id, entry_id, action, before, after, changed_by
  ) values (
    v_row.clinic_id, v_row.phrase_id, v_row.entry_id,
    case when tg_op = 'DELETE' then 'RESTORE' else 'SAVE' end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

drop trigger if exists clinical_argument_overrides_history on public.clinical_argument_overrides;
create trigger clinical_argument_overrides_history
  after insert or update or delete on public.clinical_argument_overrides
  for each row execute function private.record_argument_override_history();

create or replace function private.touch_argument_override()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists clinical_argument_overrides_touch on public.clinical_argument_overrides;
create trigger clinical_argument_overrides_touch
  before insert or update on public.clinical_argument_overrides
  for each row execute function private.touch_argument_override();

alter table public.clinical_argument_overrides enable row level security;
alter table public.clinical_argument_override_history enable row level security;
revoke all on public.clinical_argument_overrides, public.clinical_argument_override_history from anon;

drop policy if exists argument_overrides_read on public.clinical_argument_overrides;
create policy argument_overrides_read on public.clinical_argument_overrides
  for select to authenticated using (private.is_clinic_staff(clinic_id));
drop policy if exists argument_overrides_insert on public.clinical_argument_overrides;
create policy argument_overrides_insert on public.clinical_argument_overrides
  for insert to authenticated with check (private.can_manage_catalog(clinic_id));
drop policy if exists argument_overrides_update on public.clinical_argument_overrides;
create policy argument_overrides_update on public.clinical_argument_overrides
  for update to authenticated
  using (private.can_manage_catalog(clinic_id)) with check (private.can_manage_catalog(clinic_id));
drop policy if exists argument_overrides_delete on public.clinical_argument_overrides;
create policy argument_overrides_delete on public.clinical_argument_overrides
  for delete to authenticated using (private.can_manage_catalog(clinic_id));
drop policy if exists argument_override_history_read on public.clinical_argument_override_history;
create policy argument_override_history_read on public.clinical_argument_override_history
  for select to authenticated using (private.is_clinic_staff(clinic_id));

grant select, insert, update, delete on public.clinical_argument_overrides to authenticated;
-- History rows are written only by the trigger above.
grant select on public.clinical_argument_override_history to authenticated;

-- Reordering rewrites every phrase of a list, so saves go in one transaction: a half-applied
-- order would show the patient phrases in an order nobody chose. Invoker rights keep RLS on.
create or replace function public.save_argument_overrides(p_clinic_id uuid, p_overrides jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if not private.can_manage_catalog(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(p_overrides) <> 'array' or jsonb_array_length(p_overrides) not between 1 and 200 then
    raise exception 'INVALID_OVERRIDES' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_overrides) loop
    insert into public.clinical_argument_overrides(
      clinic_id, phrase_id, entry_id, kind, text, hidden, position, custom
    ) values (
      p_clinic_id, v_item->>'phraseId', v_item->>'entryId', v_item->>'kind',
      nullif(btrim(coalesce(v_item->>'text', '')), ''),
      coalesce((v_item->>'hidden')::boolean, false),
      (v_item->>'position')::integer,
      coalesce((v_item->>'custom')::boolean, false)
    )
    on conflict (clinic_id, phrase_id) do update set
      entry_id = excluded.entry_id, kind = excluded.kind, text = excluded.text,
      hidden = excluded.hidden, position = excluded.position, custom = excluded.custom
    -- Saving the same values again must not add noise to the history.
    where (clinical_argument_overrides.text, clinical_argument_overrides.hidden,
           clinical_argument_overrides.position, clinical_argument_overrides.kind)
      is distinct from (excluded.text, excluded.hidden, excluded.position, excluded.kind);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.restore_argument_overrides(p_clinic_id uuid, p_phrase_ids text[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  if not private.can_manage_catalog(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.clinical_argument_overrides
   where clinic_id = p_clinic_id and phrase_id = any(p_phrase_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.save_argument_overrides(uuid, jsonb),
  public.restore_argument_overrides(uuid, text[]) from public, anon;
grant execute on function public.save_argument_overrides(uuid, jsonb),
  public.restore_argument_overrides(uuid, text[]) to authenticated;

create table if not exists public.patient_treatment_comparisons (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  series_id uuid not null,
  version integer not null check (version > 0),
  decision text not null
    check (decision in ('PENDING', 'ACCEPTED', 'DECLINED', 'POSTPONED', 'NO_TREATMENT')),
  chosen_option_id text check (chosen_option_id is null or length(chosen_option_id) between 1 and 100),
  decision_note text not null default '' check (length(decision_note) <= 2000),
  catalog_version text not null check (length(catalog_version) between 1 and 20),
  professional_name text not null check (length(btrim(professional_name)) between 1 and 200),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (series_id, version),
  check ((decision = 'ACCEPTED') = (chosen_option_id is not null))
);
create index if not exists patient_treatment_comparisons_patient_idx
  on public.patient_treatment_comparisons(clinic_id, patient_id, created_at desc);

create or replace function private.reject_comparison_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'COMPARISON_IMMUTABLE' using errcode = '42501';
end;
$$;

drop trigger if exists patient_treatment_comparisons_immutable on public.patient_treatment_comparisons;
create trigger patient_treatment_comparisons_immutable
  before update or delete on public.patient_treatment_comparisons
  for each row execute function private.reject_comparison_change();

alter table public.patient_treatment_comparisons enable row level security;
revoke all on public.patient_treatment_comparisons from anon;
drop policy if exists treatment_comparisons_read on public.patient_treatment_comparisons;
create policy treatment_comparisons_read on public.patient_treatment_comparisons
  for select to authenticated using (private.is_clinic_staff(clinic_id));
drop policy if exists treatment_comparisons_create on public.patient_treatment_comparisons;
create policy treatment_comparisons_create on public.patient_treatment_comparisons
  for insert to authenticated with check (
    private.is_clinical_diagnostician(clinic_id)
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.clinic_id = patient_treatment_comparisons.clinic_id
    )
  );
grant select, insert on public.patient_treatment_comparisons to authenticated;

-- One call per save so the version number is computed and taken atomically; a concurrent save of
-- the same series hits the unique (series_id, version) key instead of silently forking.
create or replace function public.save_treatment_comparison(
  p_patient_id uuid,
  p_series_id uuid,
  p_input jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_clinic uuid;
  v_series uuid := coalesce(p_series_id, gen_random_uuid());
  v_version integer;
  v_row public.patient_treatment_comparisons%rowtype;
begin
  select clinic_id into v_clinic from public.patients where id = p_patient_id;
  if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinical_diagnostician(v_clinic) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_series_id is not null and not exists (
    select 1 from public.patient_treatment_comparisons
    where series_id = p_series_id and patient_id = p_patient_id
  ) then
    raise exception 'COMPARISON_NOT_FOUND' using errcode = 'P0002';
  end if;
  select coalesce(max(version), 0) + 1 into v_version
    from public.patient_treatment_comparisons where series_id = v_series;
  insert into public.patient_treatment_comparisons(
    clinic_id, patient_id, series_id, version, decision, chosen_option_id, decision_note,
    catalog_version, professional_name, content
  ) values (
    v_clinic, p_patient_id, v_series, v_version, p_input->>'decision',
    nullif(p_input->>'chosenOptionId', ''), coalesce(p_input->>'decisionNote', ''),
    p_input->>'catalogVersion', p_input->>'professionalName', coalesce(p_input->'content', '{}')
  ) returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.save_treatment_comparison(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_treatment_comparison(uuid, uuid, jsonb) to authenticated;

commit;
