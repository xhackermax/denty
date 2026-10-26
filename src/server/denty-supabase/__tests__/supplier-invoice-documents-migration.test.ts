import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const clinic = "00000000-0000-0000-0000-0000000000c1";
const otherClinic = "00000000-0000-0000-0000-0000000000c2";
const invoice = "00000000-0000-0000-0000-0000000000a1";
const pdf = "application/pdf";
const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const migration = readFileSync(
  resolve("supabase/migrations/20261021230000_supplier_invoice_documents.sql"),
  "utf8",
);
let db: PGlite;

type Row = {
  document_path: string | null;
  document_file_name: string | null;
  document_mime_type: string | null;
  version: number;
};

async function attach(path: string, fileName: string, mimeType: string): Promise<Row> {
  const result = await db.query<Row>(
    "select * from public.attach_supplier_invoice_document($1, $2, $3, $4)",
    [invoice, path, fileName, mimeType],
  );
  return result.rows[0]!;
}

describe("attach_supplier_invoice_document SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create schema storage;
      create table storage.buckets (
        id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
      );
      create table storage.objects (bucket_id text, name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[]
        language sql as $$ select string_to_array(name, '/') $$;
      create function private.uuid_from_text(value text) returns uuid
        language sql as $$ select value::uuid $$;
      create table private.writers (clinic_id uuid primary key);
      create function private.has_lab_permission(uuid, text) returns boolean
        language sql as $$ select exists (select 1 from private.writers where clinic_id = $1) $$;
      create function private.has_finance_permission(uuid, text) returns boolean
        language sql as $$ select exists (select 1 from private.writers where clinic_id = $1) $$;
      create table public.supplier_invoices (
        id uuid primary key,
        clinic_id uuid not null,
        invoice_number text not null,
        document_path text,
        version integer not null default 1,
        updated_at timestamptz not null default now()
      );
      insert into private.writers values ('${clinic}');
      insert into public.supplier_invoices (id, clinic_id, invoice_number)
        values ('${invoice}', '${clinic}', 'F-2026-001');
    `);
    await db.exec(migration);
  });

  afterEach(async () => {
    await db.close();
  });

  it("links a scanned PDF to the invoice and bumps its version", async () => {
    const row = await attach(`${clinic}/${invoice}/scan.pdf`, " factura.pdf ", pdf);
    expect(row).toMatchObject({
      document_path: `${clinic}/${invoice}/scan.pdf`,
      document_file_name: "factura.pdf",
      document_mime_type: pdf,
      version: 2,
    });
  });

  it("replaces an earlier scan with a DOCX", async () => {
    await attach(`${clinic}/${invoice}/scan.pdf`, "factura.pdf", pdf);
    const row = await attach(`${clinic}/${invoice}/scan.docx`, "factura.docx", docx);
    expect(row.document_path).toBe(`${clinic}/${invoice}/scan.docx`);
    expect(row.document_mime_type).toBe(docx);
    expect(row.version).toBe(3);
  });

  it("rejects files that are not PDF or DOCX", async () => {
    await expect(attach(`${clinic}/${invoice}/scan.png`, "scan.png", "image/png")).rejects.toThrow(
      "SUPPLIER_INVOICE_DOCUMENT_TYPE",
    );
  });

  it("rejects storage paths outside the invoice folder", async () => {
    await expect(attach(`${otherClinic}/${invoice}/scan.pdf`, "f.pdf", pdf)).rejects.toThrow(
      "SUPPLIER_INVOICE_DOCUMENT_PATH",
    );
    await expect(attach(`${clinic}/other/scan.pdf`, "f.pdf", pdf)).rejects.toThrow(
      "SUPPLIER_INVOICE_DOCUMENT_PATH",
    );
  });

  it("rejects callers without lab and finance write permission", async () => {
    await db.exec(`delete from private.writers`);
    await expect(attach(`${clinic}/${invoice}/scan.pdf`, "f.pdf", pdf)).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("creates the private bucket limited to PDF and DOCX", async () => {
    const result = await db.query<{ public: boolean; allowed_mime_types: string[] }>(
      "select public, allowed_mime_types from storage.buckets where id = 'supplier-invoice-documents'",
    );
    expect(result.rows).toEqual([{ public: false, allowed_mime_types: [pdf, docx] }]);
  });
});
