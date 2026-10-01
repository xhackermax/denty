import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { runBackup } from "./backup-core.mjs";
const execute = promisify(execFile);
try {
  const result = await runBackup(
    {
      dbUrl: process.env.SUPABASE_DB_URL,
      supabaseUrl: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
      ageRecipient: process.env.BACKUP_AGE_RECIPIENT,
      outputDir: resolve(process.env.BACKUP_OUTPUT_DIR ?? join(homedir(), "denty-backups")),
      retention: Number(process.env.BACKUP_RETENTION ?? 7),
    },
    {
      run: async (command, args) => {
        const { stdout } = await execute(command, args, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30 * 60 * 1000,
        });
        return stdout;
      },
    },
  );
  console.log(`Copia cifrada: ${result.archivePath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
