-- Denty Stage 5: private clinical Storage, patient photos and immutable document versions.

create or replace function private.uuid_from_text(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;
revoke all on function private.uuid_from_text(text) from public, anon;
grant execute on function private.uuid_from_text(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('patient-photos', 'patient-photos', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('clinical-documents', 'clinical-documents', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.patients add column if not exists photo_storage_path text;
alter table public.patients add column if not exists photo_mime_type text;
alter table public.patients add column if not exists photo_checksum text;

-- Object paths are always <clinic_uuid>/<patient_uuid>/<immutable_filename>.
drop policy if exists patient_photos_read on storage.objects;
create policy patient_photos_read on storage.objects
for select to authenticated
using (
  bucket_id = 'patient-photos'
  and private.can_access_patient(
    private.uuid_from_text((storage.foldername(name))[1]),
    private.uuid_from_text((storage.foldername(name))[2])
  )
  and exists (
    select 1 from public.patients p
    where p.id = private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);

drop policy if exists patient_photos_insert on storage.objects;
create policy patient_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'patient-photos'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
  and exists (
    select 1 from public.patients p
    where p.id = private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);

drop policy if exists patient_photos_update on storage.objects;
create policy patient_photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'patient-photos'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
)
with check (
  bucket_id = 'patient-photos'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
);

drop policy if exists patient_photos_delete on storage.objects;
create policy patient_photos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'patient-photos'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
  and not exists (select 1 from public.patients p where p.photo_storage_path = name)
);

drop policy if exists clinical_documents_read on storage.objects;
create policy clinical_documents_read on storage.objects
for select to authenticated
using (
  bucket_id = 'clinical-documents'
  and private.can_access_patient(
    private.uuid_from_text((storage.foldername(name))[1]),
    private.uuid_from_text((storage.foldername(name))[2])
  )
  and exists (
    select 1 from public.patients p
    where p.id = private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);

drop policy if exists clinical_documents_insert on storage.objects;
create policy clinical_documents_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'clinical-documents'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
  and exists (
    select 1 from public.patients p
    where p.id = private.uuid_from_text((storage.foldername(name))[2])
      and p.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);

drop policy if exists clinical_documents_update on storage.objects;
drop policy if exists clinical_documents_delete on storage.objects;
create policy clinical_documents_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'clinical-documents'
  and private.is_clinic_staff(private.uuid_from_text((storage.foldername(name))[1]))
  and not exists (select 1 from public.documents d where d.storage_path = name)
);
-- Referenced clinical document objects cannot be UPDATEd or DELETEd. Only orphan cleanup is allowed.

alter table public.patients add column if not exists photo_storage_path text;
alter table public.patients add column if not exists photo_mime_type text;
alter table public.patients add column if not exists photo_checksum text;

alter table public.documents add column if not exists version_series_id uuid;
alter table public.documents add column if not exists file_size_bytes bigint;
alter table public.documents add column if not exists metadata_json jsonb not null default '{}'::jsonb;
update public.documents set version_series_id = id where version_series_id is null;
alter table public.documents alter column version_series_id set default gen_random_uuid();
alter table public.documents alter column version_series_id set not null;

create unique index if not exists document_version_unique
  on public.documents(version_series_id, version);
create unique index if not exists document_storage_path_unique
  on public.documents(storage_path) where storage_path is not null;
create index if not exists documents_patient_series_idx
  on public.documents(clinic_id, patient_id, version_series_id, version desc);

alter table public.documents drop constraint if exists documents_file_size_nonnegative;
alter table public.documents add constraint documents_file_size_nonnegative
  check (file_size_bytes is null or file_size_bytes >= 0) not valid;
alter table public.documents validate constraint documents_file_size_nonnegative;

alter table public.documents drop constraint if exists documents_checksum_sha256;
alter table public.documents add constraint documents_checksum_sha256
  check (checksum is null or checksum ~ '^[a-f0-9]{64}$') not valid;
alter table public.documents validate constraint documents_checksum_sha256;

comment on column public.documents.storage_path is 'Immutable object path inside the private clinical-documents bucket.';
comment on column public.patients.photo_storage_path is 'Immutable object path inside the private patient-photos bucket.';

-- Document rows must reference a patient that actually belongs to the same clinic.
drop policy if exists documents_staff_insert on public.documents;
create policy documents_staff_insert on public.documents
for insert to authenticated
with check (
  private.is_clinic_staff(clinic_id)
  and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = clinic_id)
);

drop policy if exists documents_staff_update on public.documents;
create policy documents_staff_update on public.documents
for update to authenticated
using (private.is_clinic_staff(clinic_id))
with check (
  private.is_clinic_staff(clinic_id)
  and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = clinic_id)
);
