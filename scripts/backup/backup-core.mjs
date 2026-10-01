import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
const archivePattern = /^denty-backup-\d{8}T\d{9}Z-[a-f0-9-]{36}\.tar\.gz\.age$/;
const checksum = (data) => createHash("sha256").update(data).digest("hex");
export async function runBackup(config, { run, fetchImpl = fetch, now = () => new Date() }) {
  const { dbUrl, supabaseUrl, serviceKey, ageRecipient, outputDir, retention = 7 } = config;
  if (
    !dbUrl ||
    !supabaseUrl ||
    !serviceKey ||
    !ageRecipient ||
    !outputDir ||
    !Number.isInteger(retention) ||
    retention < 1
  )
    throw new Error("Configuración de copia incompleta o retención inválida.");
  if (!/^postgres(?:ql)?:\/\//.test(dbUrl) || new URL(supabaseUrl).protocol !== "https:")
    throw new Error("La copia requiere conexión Postgres y HTTPS a Supabase.");
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const lockPath = join(outputDir, ".denty-backup.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch {
    throw new Error("Ya hay una copia en curso; revisa el bloqueo local.");
  }
  let temporary;
  try {
    for (const command of ["supabase", "psql", "tar", "age"]) await run(command, ["--version"]);
    temporary = await mkdtemp(join(outputDir, ".denty-work-"));
    await chmod(temporary, 0o700);
    const schemas = (
      await run("psql", [
        "--dbname",
        dbUrl,
        "-At",
        "--command",
        "select string_agg(quote_ident(nspname), ',') from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema'",
      ])
    ).trim();
    if (!schemas) throw new Error("No se pudieron enumerar los esquemas.");
    await run("supabase", [
      "db",
      "dump",
      "--db-url",
      dbUrl,
      "--role-only",
      "--file",
      join(temporary, "roles.sql"),
    ]);
    await run("supabase", [
      "db",
      "dump",
      "--db-url",
      dbUrl,
      "--schema",
      schemas,
      "--file",
      join(temporary, "schema.sql"),
    ]);
    await run("supabase", [
      "db",
      "dump",
      "--db-url",
      dbUrl,
      "--schema",
      schemas,
      "--data-only",
      "--use-copy",
      "--file",
      join(temporary, "data.sql"),
    ]);
    const sqlFiles = [];
    for (const name of ["roles.sql", "schema.sql", "data.sql"]) {
      const data = await readFile(join(temporary, name));
      if (!data.length) throw new Error("El volcado SQL está vacío.");
      await chmod(join(temporary, name), 0o600);
      sqlFiles.push({ file: name, bytes: data.length, sha256: checksum(data) });
    }
    const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` };
    const request = async (path, init = {}) => {
      const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, "")}/storage/v1${path}`, {
        ...init,
        headers: { ...headers, ...init.headers },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`Storage no disponible (${response.status}).`);
      return response;
    };
    const buckets = await (await request("/bucket")).json();
    if (!Array.isArray(buckets)) throw new Error("Inventario de buckets inválido.");
    const objects = [];
    await mkdir(join(temporary, "storage"), { mode: 0o700 });
    for (const bucket of buckets) {
      const bucketId = bucket.id;
      if (typeof bucketId !== "string") throw new Error("Bucket inválido.");
      const visited = new Set();
      const visit = async (prefix) => {
        if (visited.has(prefix)) throw new Error("Carpeta de Storage repetida.");
        visited.add(prefix);
        let offset = 0;
        for (;;) {
          const page = await (
            await request(`/object/list/${encodeURIComponent(bucketId)}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                prefix,
                limit: 100,
                offset,
                sortBy: { column: "name", order: "asc" },
              }),
            })
          ).json();
          if (!Array.isArray(page)) throw new Error("Listado de Storage inválido.");
          if (!page.length) break;
          for (const entry of page) {
            if (typeof entry.name !== "string" || !entry.name)
              throw new Error("Objeto de Storage inválido.");
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.id == null && entry.metadata == null) {
              await visit(path);
              continue;
            }
            const encoded = encodeURIComponent(path);
            const response = await request(
              `/object/authenticated/${encodeURIComponent(bucketId)}/${encoded}`,
            );
            const bytes = new Uint8Array(await response.arrayBuffer());
            const file = `storage/${checksum(Buffer.from(JSON.stringify([bucketId, path])))}.bin`;
            await writeFile(join(temporary, file), bytes, { mode: 0o600, flag: "wx" });
            objects.push({
              bucket: bucketId,
              path,
              file,
              bytes: bytes.length,
              sha256: checksum(bytes),
              contentType:
                response.headers.get("content-type") ??
                entry.metadata?.mimetype ??
                "application/octet-stream",
            });
          }
          offset += page.length;
        }
      };
      await visit("");
    }
    await writeFile(
      join(temporary, "manifest.json"),
      JSON.stringify(
        { version: 1, createdAt: now().toISOString(), schemas, sqlFiles, buckets, objects },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    const plaintextArchive = join(temporary, "snapshot.tar.gz");
    await run("tar", [
      "-czf",
      plaintextArchive,
      "-C",
      temporary,
      "roles.sql",
      "schema.sql",
      "data.sql",
      "manifest.json",
      "storage",
    ]);
    const encrypted = join(temporary, "snapshot.tar.gz.age");
    await run("age", ["-r", ageRecipient, "-o", encrypted, plaintextArchive]);
    if (!(await stat(encrypted)).size) throw new Error("El archivo cifrado está vacío.");
    await chmod(encrypted, 0o600);
    const name = `denty-backup-${now().toISOString().replace(/[-:.]/g, "")}-${randomUUID()}.tar.gz.age`;
    const archivePath = join(outputDir, name);
    await rename(encrypted, archivePath);
    const older = (await readdir(outputDir))
      .filter((file) => archivePattern.test(file) && file !== name)
      .sort()
      .reverse();
    for (const old of older.slice(retention - 1)) await rm(join(outputDir, old));
    return { archivePath };
  } catch {
    throw new Error(
      "No se pudo completar la copia. No se han conservado datos sin cifrar; comprueba conexión y herramientas locales.",
    );
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
