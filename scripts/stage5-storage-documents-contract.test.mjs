import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), "utf8");
const migrationName = "20260928050000_stage5_storage_documents_backups.sql";
assert.ok(
  existsSync(resolve(root, "supabase/migrations", migrationName)),
  `Missing ${migrationName}`,
);
const migration = read(`supabase/migrations/${migrationName}`);

for (const bucket of ["patient-photos", "clinical-documents"]) {
  assert.match(
    migration,
    new RegExp(`storage\\.buckets[\\s\\S]*${bucket}`),
    `private bucket missing: ${bucket}`,
  );
  assert.match(
    migration,
    new RegExp(`bucket_id\\s*=\\s*'${bucket}'[\\s\\S]*private\\.can_access_patient`, "i"),
    `read policy must be patient-scoped: ${bucket}`,
  );
  assert.match(
    migration,
    new RegExp(`bucket_id\\s*=\\s*'${bucket}'[\\s\\S]*private\\.is_clinic_staff`, "i"),
    `write policy must be staff-scoped: ${bucket}`,
  );
}
assert.match(migration, /public\s*=\s*false/i, "clinical buckets must be private");
assert.match(migration, /file_size_bytes/i, "document metadata must persist file size");
assert.match(
  migration,
  /document_version_unique/i,
  "document version must be unique within a chain",
);

const contracts = read("src/shared/api/contracts.ts");
assert.match(
  contracts,
  /patientSchema[\s\S]*photoUrl:/,
  "patient output contract must expose photoUrl",
);
const coreResource = read("src/shared/api/resources/core.ts");
assert.match(
  coreResource,
  /patients:[\s\S]*uploadPhoto:/,
  "patient photo changes must use a dedicated upload command",
);
assert.match(contracts, /documentSchema[\s\S]*checksum:/, "document contract must expose checksum");
assert.match(contracts, /documentSchema[\s\S]*version:/, "document contract must expose version");
assert.match(
  contracts,
  /documentSchema[\s\S]*fileName:/,
  "document contract must expose file metadata",
);

const patientRepo = read("src/server/denty-supabase/patient-repository.ts");
assert.match(
  patientRepo,
  /async\s+setPatientPhoto[\s\S]*photo_url:/,
  "patient repository must persist the server-managed photo URL",
);

assert.ok(
  existsSync(resolve(root, "src/server/storage/storage-repository.ts")),
  "storage repository is required",
);
const storageRepo = read("src/server/storage/storage-repository.ts");
assert.match(storageRepo, /patient-photos/);
assert.match(storageRepo, /clinical-documents/);
assert.match(storageRepo, /\.storage\.from\(/, "storage must use Supabase Storage client");
assert.doesNotMatch(
  storageRepo,
  /service_role|SUPABASE_SECRET_KEY/i,
  "normal storage flow must not use service-role",
);

assert.ok(
  existsSync(resolve(root, "src/features/patients/patient-photo-capture.tsx")),
  "patient camera component is required",
);
const camera = read("src/features/patients/patient-photo-capture.tsx");
assert.match(camera, /getUserMedia/);
assert.match(
  camera,
  /video:\s*(?:true|deviceId\s*\?\s*\{\s*deviceId:\s*\{\s*exact:\s*deviceId\s*\}\s*\}\s*:\s*true)/,
);
assert.match(camera, /compressVideoFrame/);
assert.match(read("src/features/patients/photo-compression.ts"), /createElement\("canvas"\)/);
assert.match(camera, /onPhotoReady/);
assert.match(camera, /capturePhoto/);

const routeHandler = read("src/server/denty-supabase/route-handler.ts");
assert.match(routeHandler, /patient-photo/);
assert.match(routeHandler, /documents[\s\S]*file/);
assert.match(routeHandler, /security[\s\S]*backups/);
assert.match(routeHandler, /formData\(\)/, "binary uploads must use multipart/FormData");
assert.doesNotMatch(
  routeHandler,
  /base64/i,
  "Stage 5 binary routes must not encode attachments in JSON",
);

const docs = read("src/features/parity/modules/documents-module.tsx");
assert.match(docs, /FileButton/);
assert.match(docs, /uploadFile/);

const settings = read("src/features/parity/modules/settings-module.tsx");
assert.doesNotMatch(settings, /Crear copia/);
assert.match(settings, /PITR|Supabase/i);

const securitySchema = read("src/shared/api/schemas/security.ts");
assert.match(securitySchema, /configured:\s*z\.boolean/);
assert.match(securitySchema, /provider:\s*z\.literal\("SUPABASE_MANAGED"\)/);

console.log("stage5-storage-documents-contract: ok");
