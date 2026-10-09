-- Candidate CVs are separate from employee records: they have no staff_member_id.
-- PDFs are stored privately in Supabase Storage, not in PostgreSQL.
begin;

create table if not exists public.cv_candidate_archive (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  candidate_name text not null check (char_length(candidate_name) between 2 and 160),
  target_position text check (target_position is null or char_length(target_position) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null default 'application/pdf'
    check (mime_type = 'application/pdf'),
  file_size_bytes integer not null check (file_size_bytes between 1 and 4194304),
  storage_path text not null unique,
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint cv_candidate_archive_path_scoped
    check (storage_path like clinic_id::text || '/archive/%')
);
create index if not exists cv_candidate_archive_clinic_date_idx
  on public.cv_candidate_archive (clinic_id, created_at desc);
create index if not exists cv_candidate_archive_candidate_idx
  on public.cv_candidate_archive (clinic_id, candidate_name);

alter table public.cv_candidate_archive enable row level security;
revoke all on public.cv_candidate_archive from public, anon, authenticated;
grant select, insert, delete on public.cv_candidate_archive to authenticated;

drop policy if exists cv_candidate_archive_admin_select on public.cv_candidate_archive;
create policy cv_candidate_archive_admin_select on public.cv_candidate_archive
  for select to authenticated
  using ((select private.stage11_has_permission(clinic_id, 'users.manage')));

drop policy if exists cv_candidate_archive_admin_insert on public.cv_candidate_archive;
create policy cv_candidate_archive_admin_insert on public.cv_candidate_archive
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.stage11_has_permission(clinic_id, 'users.manage'))
  );

drop policy if exists cv_candidate_archive_admin_delete on public.cv_candidate_archive;
create policy cv_candidate_archive_admin_delete on public.cv_candidate_archive
  for delete to authenticated
  using ((select private.stage11_has_permission(clinic_id, 'users.manage')));

drop trigger if exists cv_candidate_archive_audit on public.cv_candidate_archive;
create trigger cv_candidate_archive_audit after insert or update or delete
  on public.cv_candidate_archive
  for each row execute function private.audit_sensitive_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-archive', 'cv-archive', false, 4194304, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cv_archive_pdf_read on storage.objects;
create policy cv_archive_pdf_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cv-archive'
    and (storage.foldername(name))[2] = 'archive'
    and private.stage11_has_permission(
      private.uuid_from_text((storage.foldername(name))[1]), 'users.manage')
  );

drop policy if exists cv_archive_pdf_insert on storage.objects;
create policy cv_archive_pdf_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cv-archive'
    and (storage.foldername(name))[2] = 'archive'
    and storage.extension(name) = 'pdf'
    and private.stage11_has_permission(
      private.uuid_from_text((storage.foldername(name))[1]), 'users.manage')
  );

-- Removes files after deleting their metadata; cannot delete an indexed candidate PDF
-- directly via the Storage API.
drop policy if exists cv_archive_pdf_delete_orphan on storage.objects;
create policy cv_archive_pdf_delete_orphan on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cv-archive'
    and (storage.foldername(name))[2] = 'archive'
    and private.stage11_has_permission(
      private.uuid_from_text((storage.foldername(name))[1]), 'users.manage')
    and not exists (
      select 1 from public.cv_candidate_archive r
      where r.storage_path = storage.objects.name
    )
  );

commit;
