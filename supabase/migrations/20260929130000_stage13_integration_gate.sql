-- Stage 13 — Gate final de integración.
-- Closes the integration gaps found while rebuilding the database from zero:
--   1. Every clinic gets its default treatment catalog and consent/justificante
--      templates, also clinics created after the migrations ran (DNT-S13-001).
--   2. Consent documents can be signed through one canonical RPC, which feeds the
--      Stage 6 consent requirements and unblocks the budget signature (DNT-S13-002).
--   3. Realtime Broadcast policy for private clinic channels (DNT-S13-003).
--   4. Covering indexes for foreign keys, duplicate index cleanup and removal of the
--      legacy compatibility helpers (DNT-S13-004).

begin;

-- ---------------------------------------------------------------------------
-- 1. Clinic defaults: treatment catalog + document templates
-- ---------------------------------------------------------------------------
create or replace function private.seed_clinic_defaults(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.treatment_catalog(
    clinic_id, code, name, specialty, category, default_price_cents, base_cost_cents,
    default_duration_min, requires_lab, metadata
  )
  select p_clinic_id, seed.code, seed.name, seed.specialty, seed.category, 0, 0,
         seed.duration, seed.requires_lab, seed.metadata
  from (values
    ('CHECKUP', 'Revisión', 'GENERAL', 'PREVENTION', 30, false, '{"consent_codes":[]}'::jsonb),
    ('HYGIENE', 'Higiene', 'PERIODONTICS', 'PREVENTION', 45, false, '{"consent_codes":["CONSENT_CLEANING"]}'::jsonb),
    ('FILLING', 'Obturación', 'CONSERVATIVE', 'RESTORATION', 45, false, '{"consent_codes":["CONSENT_FILLINGS"]}'::jsonb),
    ('EXTRACTION', 'Extracción simple', 'SURGERY', 'SURGERY', 45, false, '{"consent_codes":["CONSENT_EXTRACTION"]}'::jsonb),
    ('ENDODONTICS', 'Endodoncia', 'ENDODONTICS', 'ENDODONTICS', 60, false, '{"consent_codes":["CONSENT_ENDO"]}'::jsonb),
    ('IMPLANT', 'Implante', 'SURGERY', 'IMPLANTOLOGY', 60, true, '{"consent_codes":["CONSENT_IMPLANT"]}'::jsonb),
    ('CROWN_ZIRCONIA', 'Corona zirconio', 'PROSTHODONTICS', 'PROSTHESIS', 45, true, '{"consent_codes":["CONSENT_PROSTHESIS"]}'::jsonb),
    ('SPLINT', 'Férula', 'PROSTHODONTICS', 'SPLINT', 30, true, '{"consent_codes":[]}'::jsonb),
    ('WHITENING', 'Blanqueamiento externo', 'AESTHETICS', 'AESTHETICS', 60, false, '{"consent_codes":["CONSENT_WHITEN_EXT"]}'::jsonb)
  ) as seed(code, name, specialty, category, duration, requires_lab, metadata)
  on conflict (clinic_id, code) do nothing;

  insert into public.document_templates(clinic_id, code, title, body, schema_json, active, version)
  select p_clinic_id, seed.code, seed.title, seed.body, '{}'::jsonb, true, 1
  from (values
    ('CONSENT_CLEANING', 'CI Tartrectomía / limpieza dental',
     'Consentimiento informado para tartrectomía. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_FILLINGS', 'CI Obturaciones',
     'Consentimiento informado para obturaciones. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_EXTRACTION', 'CI Extracción simple',
     'Consentimiento informado para extracción dental. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_ENDO', 'CI Endodoncia',
     'Consentimiento informado para endodoncia. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_IMPLANT', 'CI Implantes',
     'Consentimiento informado para cirugía de implantes. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_PROSTHESIS', 'CI Prótesis',
     'Consentimiento informado para prótesis. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_WHITEN_EXT', 'CI Blanqueamiento dental externo',
     'Consentimiento informado para blanqueamiento externo. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_ANESTHESIA', 'CI Anestesia',
     'Consentimiento informado para anestesia local. Plantilla base: la clínica debe revisarla con su asesoría antes de usarla.'),
    ('CONSENT_IMAGES', 'CI Tratamiento de imágenes',
     'Autorización para la toma y uso clínico de fotografías y radiografías.'),
    ('DATA_PROTECTION', 'Información y consentimiento de protección de datos',
     'Información sobre el tratamiento de datos personales y de salud (RGPD/LOPDGDD). Revisar con el DPD de la clínica.'),
    ('ATTENDANCE_CERTIFICATE', 'Justificante de asistencia',
     'Se certifica que el/la paciente ha asistido a consulta en la fecha y horario indicados.')
  ) as seed(code, title, body)
  on conflict (clinic_id, code, version) do nothing;
end;
$$;

revoke all on function private.seed_clinic_defaults(uuid) from public, anon, authenticated;

create or replace function private.seed_clinic_defaults_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_clinic_defaults(new.id);
  return new;
end;
$$;

revoke all on function private.seed_clinic_defaults_on_insert() from public, anon, authenticated;

drop trigger if exists clinics_seed_defaults on public.clinics;
create trigger clinics_seed_defaults
after insert on public.clinics
for each row execute function private.seed_clinic_defaults_on_insert();

select private.seed_clinic_defaults(c.id) from public.clinics c;

-- ---------------------------------------------------------------------------
-- 2. Canonical consent/document signature
-- ---------------------------------------------------------------------------
create or replace function public.sign_clinical_document(
  p_document_id uuid,
  p_signer_name text,
  p_signature_path text,
  p_signature_checksum text,
  p_signature_mime text default 'image/png'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents%rowtype;
begin
  select * into v_doc from public.documents where id = p_document_id for update;
  if v_doc.id is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_staff(v_doc.clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_doc.status not in ('DRAFT', 'FINAL') then
    raise exception 'DOCUMENT_NOT_SIGNABLE' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_signer_name, ''))) < 2 then
    raise exception 'SIGNER_NAME_REQUIRED' using errcode = '22023';
  end if;
  if p_signature_checksum is null or p_signature_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_SIGNATURE_CHECKSUM' using errcode = '22023';
  end if;
  if p_signature_mime not in ('image/png', 'image/jpeg') then
    raise exception 'INVALID_SIGNATURE_MIME' using errcode = '22023';
  end if;
  if p_signature_path is null
     or split_part(p_signature_path, '/', 1) <> v_doc.clinic_id::text
     or split_part(p_signature_path, '/', 2) <> v_doc.patient_id::text then
    raise exception 'INVALID_SIGNATURE_PATH' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'clinical-documents' and o.name = p_signature_path
  ) then
    raise exception 'SIGNATURE_OBJECT_MISSING' using errcode = 'P0002';
  end if;

  update public.documents
  set status = 'SIGNED',
      signer_name = btrim(p_signer_name),
      signed_at = now(),
      signature_data = null,
      metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
        'signature', jsonb_build_object(
          'path', p_signature_path,
          'checksum', p_signature_checksum,
          'mimeType', p_signature_mime,
          'signedBy', auth.uid(),
          'signedAt', now()
        )
      )
  where id = p_document_id
  returning * into v_doc;

  return to_jsonb(v_doc) - 'signature_data';
end;
$$;

revoke all on function public.sign_clinical_document(uuid, text, text, text, text) from public, anon;
grant execute on function public.sign_clinical_document(uuid, text, text, text, text) to authenticated;

-- A signed signature image is evidence: forbid deleting it from Storage.
drop policy if exists clinical_documents_delete on storage.objects;
create policy clinical_documents_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'clinical-documents'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
  and not exists (select 1 from public.documents d where d.storage_path = name)
  and not exists (
    select 1 from public.documents d where d.metadata_json -> 'signature' ->> 'path' = name
  )
);

-- ---------------------------------------------------------------------------
-- 3. Realtime Broadcast authorization for private clinic channels
-- ---------------------------------------------------------------------------
do $$
begin
  execute 'alter table realtime.messages enable row level security';
  execute 'drop policy if exists "denty clinic members receive broadcasts" on realtime.messages';
  execute $policy$
    create policy "denty clinic members receive broadcasts"
    on realtime.messages for select to authenticated
    using (
      split_part(realtime.topic(), ':', 1) = 'clinic'
      and exists (
        select 1 from public.clinic_members cm
        where cm.profile_id = (select auth.uid())
          and cm.active
          and cm.clinic_id::text = split_part(realtime.topic(), ':', 2)
      )
    )
  $policy$;
exception when insufficient_privilege then
  raise notice 'Stage 13: realtime.messages policy must be created by the project owner (see docs/STAGE13-HANDOFF).';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Hygiene: legacy helpers, duplicate index, foreign-key covering indexes
-- ---------------------------------------------------------------------------
drop function if exists public.is_clinic_staff(uuid);
drop function if exists public.is_patient_owner(uuid);

do $$
begin
  if exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'document_templates_clinic_code_version_uq')
     and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'document_templates_clinic_id_code_version_key') then
    execute 'drop index if exists public.document_templates_clinic_code_version_uq';
  end if;
end;
$$;

do $$
declare
  fk record;
  v_name text;
begin
  for fk in
    select c.conrelid::regclass as table_name,
           cl.relname as rel,
           c.conname,
           array_agg(a.attname order by k.ord) as cols
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey
      )
    group by c.conrelid, cl.relname, c.conname
  loop
    v_name := left(fk.rel || '_' || array_to_string(fk.cols, '_') || '_fkx', 63);
    execute format('create index if not exists %I on %s (%s)', v_name, fk.table_name,
      (select string_agg(format('%I', col), ', ') from unnest(fk.cols) as col));
  end loop;
end;
$$;

commit;
