begin;

-- A supplier invoice can carry the scanned original (PDF or DOCX). The file lives in a
-- private bucket and supplier_invoices.document_path points at it; the name and type are
-- kept so the download keeps the original file name.
alter table public.supplier_invoices
  add column if not exists document_file_name text,
  add column if not exists document_mime_type text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-invoice-documents', 'supplier-invoice-documents', false, 26214400, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object path: <clinic_uuid>/<supplier_invoice_uuid>/<immutable_file_name>.
drop policy if exists supplier_invoice_documents_storage_read on storage.objects;
create policy supplier_invoice_documents_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'supplier-invoice-documents'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]), 'lab.read')
  and private.has_finance_permission(private.uuid_from_text((storage.foldername(name))[1]), 'finance.read')
  and exists (
    select 1 from public.supplier_invoices si
    where si.id = private.uuid_from_text((storage.foldername(name))[2])
      and si.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);
drop policy if exists supplier_invoice_documents_storage_insert on storage.objects;
create policy supplier_invoice_documents_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'supplier-invoice-documents'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]), 'lab.write')
  and private.has_finance_permission(private.uuid_from_text((storage.foldername(name))[1]), 'finance.write')
  and exists (
    select 1 from public.supplier_invoices si
    where si.id = private.uuid_from_text((storage.foldername(name))[2])
      and si.clinic_id = private.uuid_from_text((storage.foldername(name))[1])
  )
);
-- Only files no invoice points at can be removed (failed uploads and replaced scans).
drop policy if exists supplier_invoice_documents_storage_delete on storage.objects;
create policy supplier_invoice_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'supplier-invoice-documents'
  and private.has_lab_permission(private.uuid_from_text((storage.foldername(name))[1]), 'lab.write')
  and private.has_finance_permission(private.uuid_from_text((storage.foldername(name))[1]), 'finance.write')
  and not exists (select 1 from public.supplier_invoices si where si.document_path = name)
);

create or replace function public.attach_supplier_invoice_document(
  p_supplier_invoice_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text
) returns public.supplier_invoices
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.supplier_invoices%rowtype;
begin
  select * into r from public.supplier_invoices where id = p_supplier_invoice_id for update;
  if r.id is null then raise exception 'SUPPLIER_INVOICE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.has_lab_permission(r.clinic_id, 'lab.write')
    or not private.has_finance_permission(r.clinic_id, 'finance.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_mime_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'SUPPLIER_INVOICE_DOCUMENT_TYPE' using errcode = '22023';
  end if;
  if p_storage_path is null or p_storage_path not like r.clinic_id::text || '/' || r.id::text || '/%' then
    raise exception 'SUPPLIER_INVOICE_DOCUMENT_PATH' using errcode = '23514';
  end if;
  if nullif(btrim(p_file_name), '') is null then
    raise exception 'SUPPLIER_INVOICE_DOCUMENT_NAME_REQUIRED' using errcode = '22023';
  end if;
  update public.supplier_invoices set
    document_path = p_storage_path,
    document_file_name = btrim(p_file_name),
    document_mime_type = p_mime_type,
    version = version + 1
  where id = r.id
  returning * into r;
  return r;
end $$;

revoke all on function public.attach_supplier_invoice_document(uuid, text, text, text) from public, anon;
grant execute on function public.attach_supplier_invoice_document(uuid, text, text, text) to authenticated;

commit;
