import { readdir, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { restoreBackupPackage, verifyEncryptedBackup } from "./backup";

function arg(name:string){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined}
const backup=arg("--file"),targetRaw=arg("--target");
if(!backup||!targetRaw){console.error("Usage: pnpm backup:restore -- --file <backup.dentybk> --target <empty-data-dir>");process.exit(2)}
const secret=process.env.DENTY_BACKUP_KEY;if(!secret)throw new Error("DENTY_BACKUP_KEY is required");
const target=resolve(targetRaw),liveUrl=process.env.DATABASE_URL??"",liveDb=liveUrl.startsWith("file:")?resolve(liveUrl.slice(5)):null;
if(liveDb&&(liveDb===target||dirname(liveDb)===target))throw Object.assign(new Error("Restore target must be separate from the live database directory"),{code:"LIVE_TARGET_REFUSED"});
await mkdir(target,{recursive:true});if((await readdir(target)).length)throw Object.assign(new Error("Restore target directory must be empty"),{code:"TARGET_NOT_EMPTY"});
await verifyEncryptedBackup(resolve(backup),secret);const restored=await restoreBackupPackage(resolve(backup),secret,target);
const here=dirname(fileURLToPath(import.meta.url)),dbRoot=resolve(here,"../.."),schema=resolve(dbRoot,"prisma/schema.prisma"),env={...process.env,DATABASE_URL:`file:${restored.databasePath}`};
const migrate=spawnSync("prisma",["migrate","deploy","--schema",schema],{cwd:dbRoot,env,stdio:"inherit"});if(migrate.error)throw new Error(`Unable to execute Prisma migration check: ${migrate.error.message}`);if(migrate.status!==0)throw new Error("Restored database failed Prisma migrate deploy");
const health=spawnSync(process.execPath,["--experimental-strip-types",resolve(dbRoot,"src/health/cli.ts")],{cwd:dbRoot,env,stdio:"inherit"});if(health.status!==0)throw new Error("Restored database failed health check");
console.log(`Restore verified in isolated target: ${target}`);console.log(`Database: ${restored.databasePath}`);console.log("No live database was overwritten. Stop Denty, take a final backup, then perform an explicit cutover to this verified directory.");
