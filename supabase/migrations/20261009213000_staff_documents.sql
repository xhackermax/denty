-- Employment records are not clinical patient documents.
-- Separate private storage and admin-only RLS for CVs and contracts.
begin;

create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  document_type text not null check (document_type in ('CV', 'CONTRACT')),
  title text not null check (char_length(title) between 1 and 200),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  file_size_bytes integer not null check (file_size_bytes between 1 and 10485760),
  storage_path text not null unique,
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists staff_documents_clinic_type_idx
  on public.staff_documents (clinic_id, document_type, created_at desc);
create index if not exists staff_documents_staff_idx
  on public.staff_documents (clinic_id, staff_member_id, created_at desc);
alter table public.staff_documents enable row level security;
revoke all on public.staff_documents from public, anon, authenticated;
grant select, insert on public.staff_documents to authenticated;

drop policy if exists staff_documents_admin_read on public.staff_documents;
create policy staff_documents_admin_read on public.staff_documents
  for select to authenticated
  using ((select private.stage11_has_permission(clinic_id, 'users.manage')));

drop policy if exists staff_documents_admin_insert on public.staff_documents;
create policy staff_documents_admin_insert on public.staff_documents
  for insert to authenticated
  with check (
    (select private.stage11_has_permission(clinic_id, 'users.manage'))
    and created_by = (select auth.uid())
    and archived_at is null
    and exists (
      select 1 from public.staff_members s
      where s.id=staff_member_id and s.clinic_id=staff_documents.clinic_id
    )
    and storage_path like clinic_id::text || '/' || staff_member_id::text || '/%'
  );

drop trigger if exists staff_documents_audit_mutation on public.staff_documents;
create trigger staff_documents_audit_mutation
  after insert or update or delete on public.staff_documents
  for each row execute function private.audit_sensitive_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-documents', 'staff-documents', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists staff_documents_objects_read on storage.objects;
create policy staff_documents_objects_read on storage.objects
  for select to authenticated
  using (
    bucket_id='staff-documents'
    and private.stage11_has_permission(private.uuid_from_text((storage.foldername(name))[1]),'users.manage')
    and exists (
      select 1 from public.staff_members s
      where s.id=private.uuid_from_text((storage.foldername(name))[2])
        and s.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
    )
  );

drop policy if exists staff_documents_objects_insert on storage.objects;
create policy staff_documents_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id='staff-documents'
    and private.stage11_has_permission(private.uuid_from_text((storage.foldername(name))[1]),'users.manage')
    and exists (
      select 1 from public.staff_members s
      where s.id=private.uuid_from_text((storage.foldername(name))[2])
        and s.clinic_id=private.uuid_from_text((storage.foldername(name))[1])
    )
  );

-- Allow removal only for orphaned uploads after a failed DB insert, not archived contracts.
drop policy if exists staff_documents_objects_cleanup on storage.objects;
create policy staff_documents_objects_cleanup on storage.objects
  for delete to authenticated
  using (
    bucket_id='staff-documents'
    and private.stage11_has_permission(private.uuid_from_text((storage.foldername(name))[1]),'users.manage')
    and not exists (
      select 1 from public.staff_documents d
      where d.storage_path=storage.objects.name
    )
  );

commit;
