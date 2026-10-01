import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test } from "vitest";
const modulePath = "../backup-core.mjs";
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function fixture(fail = false) {
  const outputDir = await mkdtemp(join(tmpdir(), "denty-backup-test-"));
  dirs.push(outputDir);
  const run = async (command: string, args: string[]) => {
    if (args.includes("--version")) return "1.0";
    if (command === "psql") return "public,private,auth,storage\n";
    if (command === "supabase") {
      await writeFile(args[args.indexOf("--file") + 1]!, "SQL data");
      return "";
    }
    if (command === "tar") {
      await writeFile(args[args.indexOf("-czf") + 1]!, "archive");
      return "";
    }
    if (command === "age") {
      if (fail) throw new Error("db-secret service-secret");
      await writeFile(args[args.indexOf("-o") + 1]!, "ENCRYPTED");
      return "";
    }
    throw new Error(command);
  };
  const fetchImpl = async (input: string | URL, options?: RequestInit) => {
    const url = new Request(input, options).url;
    if (url.endsWith("/bucket")) return Response.json([{ id: "documents", name: "documents" }]);
    if (url.includes("/list/")) {
      const body = JSON.parse(String(options?.body));
      return Response.json(
        body.offset
          ? []
          : [{ id: "object", name: "../document.pdf", metadata: { mimetype: "application/pdf" } }],
      );
    }
    expect(decodeURIComponent(new URL(url).pathname.split("/authenticated/documents/")[1]!)).toBe(
      "../document.pdf",
    );
    return new Response("document content");
  };
  const config = {
    dbUrl: "postgres://db-secret@localhost/db",
    supabaseUrl: "https://example.supabase.co",
    serviceKey: "service-secret",
    ageRecipient: "age1test",
    outputDir,
    retention: 1,
  };
  return {
    outputDir,
    config,
    deps: { run, fetchImpl, now: () => new Date("2026-10-01T12:00:00Z") },
  };
}
test("publishes only encrypted archive and cleans plaintext including unsafe object names", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture();
  const result = await runBackup(config, deps);
  expect(await readFile(result.archivePath, "utf8")).toBe("ENCRYPTED");
  expect(await readdir(outputDir)).toEqual([result.archivePath.split("/").at(-1)]);
});
test("failed encryption preserves previous backups and redacts secrets", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture(true);
  await writeFile(join(outputDir, "previous.tar.gz.age"), "old");
  await expect(runBackup(config, deps)).rejects.toThrow(/copia/i);
  expect(await readdir(outputDir)).toEqual(["previous.tar.gz.age"]);
});
test("invalid retention fails before creating files", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture();
  await expect(runBackup({ ...config, retention: 0 }, deps)).rejects.toThrow();
  expect(await readdir(outputDir)).toEqual([]);
});

test("retains newest own archives and leaves unrelated files alone", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture();
  const old = "denty-backup-20250901T120000000Z-00000000-0000-4000-8000-000000000001.tar.gz.age";
  await writeFile(join(outputDir, old), "old");
  await writeFile(join(outputDir, "personal.txt"), "keep");
  const result = await runBackup(config, deps);
  expect((await readdir(outputDir)).sort()).toEqual(
    [result.archivePath.split("/").at(-1), "personal.txt"].sort(),
  );
});
test.each(["supabase", "tar", "psql"])(
  "cleans temporary data after %s failure",
  async (command) => {
    const { runBackup } = await import(modulePath);
    const { outputDir, config, deps } = await fixture();
    const run = async (exe: string, args: string[]) => {
      if (exe === command && !args.includes("--version")) throw new Error("private credentials");
      return deps.run(exe, args);
    };
    await expect(runBackup(config, { ...deps, run })).rejects.toThrow(/copia/);
    expect(await readdir(outputDir)).toEqual([]);
  },
);
test("Storage failure leaves no archive or plaintext", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture();
  await expect(
    runBackup(config, { ...deps, fetchImpl: async () => new Response("Denied", { status: 403 }) }),
  ).rejects.toThrow(/copia/);
  expect(await readdir(outputDir)).toEqual([]);
});
test("another process cannot reuse the active lock", async () => {
  const { runBackup } = await import(modulePath);
  const { outputDir, config, deps } = await fixture();
  await writeFile(join(outputDir, ".denty-backup.lock"), "active");
  await expect(runBackup(config, deps)).rejects.toThrow(/curso/);
  expect(await readFile(join(outputDir, ".denty-backup.lock"), "utf8")).toBe("active");
});
