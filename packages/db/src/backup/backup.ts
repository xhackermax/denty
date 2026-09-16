import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import type { PrismaClient } from "../../generated/client/index.js";

const MAGIC_V1=Buffer.from("DENTYBK1");
const MAGIC_V2=Buffer.from("DENTYBK2");
const ARCHIVE_MAGIC=Buffer.from("DENTYAR2");
const SALT_BYTES=16,IV_BYTES=12,TAG_BYTES=16,MAX_MANIFEST_BYTES=8*1024*1024;

type BundleKind="database"|"attachment"|"document";
type BundleEntry={archivePath:string;kind:BundleKind;sizeBytes:number;sha256:string;sourcePath?:string};
type BundleManifest={format:"DENTY_ARCHIVE_V2";version:2;clinicId:string;createdAt:string;entries:Array<Omit<BundleEntry,"sourcePath">>};

function key(secret:string,salt:Buffer){return scryptSync(secret,salt,32)}
function hash(data:Buffer){return createHash("sha256").update(data).digest("hex")}
async function hashFile(path:string){const h=createHash("sha256");for await(const chunk of createReadStream(path))h.update(chunk as Buffer);return h.digest("hex")}
function normalizeArchivePath(value:string){return value.split(sep).join("/").replace(/^\/+/,"")}
function safeRestorePath(root:string,archivePath:string){
  const clean=normalizeArchivePath(archivePath);
  if(!clean||clean.includes("\0")||clean.split("/").some(part=>part===".."))throw Object.assign(new Error("Backup path invalid"),{code:"BACKUP_PATH_INVALID"});
  const base=resolve(root),candidate=resolve(base,...clean.split("/"));
  if(candidate!==base&&!candidate.startsWith(base+sep))throw Object.assign(new Error("Backup path invalid"),{code:"BACKUP_PATH_INVALID"});
  return candidate;
}
async function pathExists(path:string){try{await stat(path);return true}catch{return false}}
async function walkFiles(root:string):Promise<string[]>{
  if(!(await pathExists(root)))return[];
  const out:string[]=[];
  async function walk(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isSymbolicLink())throw Object.assign(new Error(`Backup refuses symbolic link: ${path}`),{code:"BACKUP_SYMLINK_REFUSED"});if(entry.isDirectory())await walk(path);else if(entry.isFile())out.push(path)}}
  await walk(root);return out.sort();
}
async function collectTree(root:string,archivePrefix:string,kind:BundleKind):Promise<BundleEntry[]>{const entries:BundleEntry[]=[];for(const sourcePath of await walkFiles(root)){const archivePath=`${archivePrefix}/${normalizeArchivePath(relative(root,sourcePath))}`,info=await stat(sourcePath);entries.push({archivePath,kind,sizeBytes:info.size,sha256:await hashFile(sourcePath),sourcePath})}return entries}

async function writeArchive(path:string,manifest:BundleManifest,entries:BundleEntry[]){
  const json=Buffer.from(JSON.stringify(manifest)),length=Buffer.alloc(4);length.writeUInt32BE(json.length);
  if(json.length>MAX_MANIFEST_BYTES)throw new Error("Backup manifest is too large");
  await writeFile(path,Buffer.concat([ARCHIVE_MAGIC,length,json]),{mode:0o600});
  for(const entry of entries)await pipeline(createReadStream(entry.sourcePath!),createWriteStream(path,{flags:"a"}));
}
async function encryptArchive(archivePath:string,finalPath:string,secret:string){
  const salt=randomBytes(SALT_BYTES),iv=randomBytes(IV_BYTES),cipher=createCipheriv("aes-256-gcm",key(secret,salt),iv),ciphertext=`${archivePath}.cipher`;
  try{
    await pipeline(createReadStream(archivePath),cipher,createWriteStream(ciphertext,{mode:0o600}));
    await writeFile(finalPath,Buffer.concat([MAGIC_V2,salt,iv]),{mode:0o600});
    await pipeline(createReadStream(ciphertext),createWriteStream(finalPath,{flags:"a"}));
    await appendFile(finalPath,cipher.getAuthTag());
  }finally{await rm(ciphertext,{force:true}).catch(()=>{})}
}
async function decryptV2ToArchive(path:string,secret:string,destination:string){
  const info=await stat(path),headerBytes=MAGIC_V2.length+SALT_BYTES+IV_BYTES;
  if(info.size<headerBytes+TAG_BYTES+1)throw new Error("Invalid V2 backup length");
  const fh=await open(path,"r");
  try{
    const header=Buffer.alloc(headerBytes),tag=Buffer.alloc(TAG_BYTES);await fh.read(header,0,header.length,0);await fh.read(tag,0,TAG_BYTES,info.size-TAG_BYTES);
    if(!header.subarray(0,MAGIC_V2.length).equals(MAGIC_V2))throw new Error("Invalid V2 backup magic");
    const salt=header.subarray(MAGIC_V2.length,MAGIC_V2.length+SALT_BYTES),iv=header.subarray(MAGIC_V2.length+SALT_BYTES),decipher=createDecipheriv("aes-256-gcm",key(secret,salt),iv);decipher.setAuthTag(tag);
    await pipeline(createReadStream(path,{start:headerBytes,end:info.size-TAG_BYTES-1}),decipher,createWriteStream(destination,{mode:0o600}));
  }finally{await fh.close()}
  return destination;
}
async function readArchiveManifest(archivePath:string){
  const fh=await open(archivePath,"r");
  try{
    const head=Buffer.alloc(ARCHIVE_MAGIC.length+4);await fh.read(head,0,head.length,0);if(!head.subarray(0,ARCHIVE_MAGIC.length).equals(ARCHIVE_MAGIC))throw new Error("Invalid backup archive magic");const len=head.readUInt32BE(ARCHIVE_MAGIC.length);if(len<=0||len>MAX_MANIFEST_BYTES)throw new Error("Invalid backup manifest length");const body=Buffer.alloc(len);await fh.read(body,0,len,head.length);const manifest=JSON.parse(body.toString("utf8")) as BundleManifest;if(manifest.format!=="DENTY_ARCHIVE_V2"||manifest.version!==2||!Array.isArray(manifest.entries))throw new Error("Invalid backup manifest");return{manifest,dataOffset:head.length+len};
  }finally{await fh.close()}
}
async function extractArchive(archivePath:string,targetRoot:string){
  const {manifest,dataOffset}=await readArchiveManifest(archivePath),archiveInfo=await stat(archivePath);let offset=dataOffset;
  for(const entry of manifest.entries){
    if(!Number.isSafeInteger(entry.sizeBytes)||entry.sizeBytes<0||!/^[a-f0-9]{64}$/i.test(entry.sha256))throw Object.assign(new Error("Backup manifest entry invalid"),{code:"BACKUP_MANIFEST_INVALID"});
    const destination=safeRestorePath(targetRoot,entry.archivePath),end=offset+entry.sizeBytes-1;if(entry.sizeBytes&&end>=archiveInfo.size)throw Object.assign(new Error("Backup entry exceeds archive size"),{code:"BACKUP_MANIFEST_INVALID"});await mkdir(dirname(destination),{recursive:true});
    if(entry.sizeBytes===0)await writeFile(destination,Buffer.alloc(0),{mode:0o600});else await pipeline(createReadStream(archivePath,{start:offset,end}),createWriteStream(destination,{mode:0o600}));
    const actual=await hashFile(destination);if(actual!==entry.sha256)throw Object.assign(new Error(`Backup INTEGRITY verification failed for ${entry.archivePath}`),{code:"BACKUP_INTEGRITY_ERROR",archivePath:entry.archivePath});offset+=entry.sizeBytes;
  }
  if(offset!==archiveInfo.size)throw Object.assign(new Error("Backup archive contains unexpected trailing data"),{code:"BACKUP_MANIFEST_INVALID"});
  return manifest;
}

export async function createEncryptedBackup(input:{prisma:PrismaClient;clinicId:string;secret:string;directory:string}){
  await mkdir(input.directory,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-"),databaseSnapshot=join(input.directory,`.${input.clinicId}-${stamp}.sqlite`),archive=join(input.directory,`.${input.clinicId}-${stamp}.archive`),final=join(input.directory,`${input.clinicId}-${stamp}.dentybk`);
  try{
    await input.prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");await input.prisma.$executeRawUnsafe(`VACUUM INTO '${databaseSnapshot.replace(/'/g,"''")}'`);
    const dbInfo=await stat(databaseSnapshot),dbEntry:BundleEntry={archivePath:"database/denty.sqlite",kind:"database",sizeBytes:dbInfo.size,sha256:await hashFile(databaseSnapshot),sourcePath:databaseSnapshot};
    const attachmentRoot=join(resolve(process.env.DENTY_ATTACHMENT_DIR??"./data/attachments"),input.clinicId),documentRoot=join(resolve(process.env.DENTY_DOCUMENT_DIR??"./data/documents"),input.clinicId);
    const entries=[dbEntry,...await collectTree(attachmentRoot,"attachments","attachment"),...await collectTree(documentRoot,"documents","document")];
    const manifest:BundleManifest={format:"DENTY_ARCHIVE_V2",version:2,clinicId:input.clinicId,createdAt:new Date().toISOString(),entries:entries.map(({sourcePath:_,...entry})=>entry)};
    await writeArchive(archive,manifest,entries);await encryptArchive(archive,final,input.secret);
    const finalInfo=await stat(final);return{path:final,sha256:await hashFile(final),sizeBytes:finalInfo.size,sourceSha256:dbEntry.sha256,fileCount:entries.length,formatVersion:2};
  }finally{await rm(databaseSnapshot,{force:true}).catch(()=>{});await rm(archive,{force:true}).catch(()=>{})}
}

async function decryptV1Database(path:string,secret:string,destination:string){const raw=await readFile(path);if(!raw.subarray(0,MAGIC_V1.length).equals(MAGIC_V1))throw new Error("Invalid V1 backup magic");let o=MAGIC_V1.length;const salt=raw.subarray(o,o+=16),iv=raw.subarray(o,o+=12),tag=raw.subarray(o,o+=16),encrypted=raw.subarray(o),decipher=createDecipheriv("aes-256-gcm",key(secret,salt),iv);decipher.setAuthTag(tag);const data=Buffer.concat([decipher.update(encrypted),decipher.final()]);if(!data.subarray(0,16).toString().startsWith("SQLite format 3"))throw new Error("Backup does not contain a SQLite database");await mkdir(dirname(destination),{recursive:true});await writeFile(destination,data,{mode:0o600});return destination}
async function backupMagic(path:string){const fh=await open(path,"r");try{const b=Buffer.alloc(8);await fh.read(b,0,8,0);return b}finally{await fh.close()}}

export async function restoreBackupPackage(path:string,secret:string,targetDirectory:string){
  const magic=await backupMagic(path),root=resolve(targetDirectory);await mkdir(root,{recursive:true});
  if(magic.equals(MAGIC_V1)){const databasePath=safeRestorePath(root,"database/denty.sqlite");await decryptV1Database(path,secret,databasePath);return{formatVersion:1,databasePath,manifest:null,fileCount:1}}
  if(!magic.equals(MAGIC_V2))throw new Error("Invalid backup magic");const archive=join(root,`.denty-restore-${process.pid}-${Date.now()}.archive`);
  try{await decryptV2ToArchive(path,secret,archive);const manifest=await extractArchive(archive,root),databasePath=safeRestorePath(root,"database/denty.sqlite");const db=await readFile(databasePath);if(!db.subarray(0,16).toString().startsWith("SQLite format 3"))throw Object.assign(new Error("Restored database is not SQLite"),{code:"BACKUP_INTEGRITY_ERROR"});return{formatVersion:2,databasePath,manifest,fileCount:manifest.entries.length}}finally{await rm(archive,{force:true}).catch(()=>{})}
}

export async function verifyEncryptedBackup(path:string,secret:string){
  const encryptedHash=await hashFile(path),info=await stat(path),temp=join(dirname(path),`.verify-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`);try{const restored=await restoreBackupPackage(path,secret,temp),sourceSha256=await hashFile(restored.databasePath);return{ok:true,sha256:encryptedHash,sourceSha256,sizeBytes:info.size,fileCount:restored.fileCount,formatVersion:restored.formatVersion}}finally{await rm(temp,{recursive:true,force:true}).catch(()=>{})}
}

// Backward-compatible helper: extract only the database file to destination.
export async function decryptBackup(path:string,secret:string,destination:string){const temp=join(tmpdir(),`denty-db-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`);try{const restored=await restoreBackupPackage(path,secret,temp);await mkdir(dirname(destination),{recursive:true});await pipeline(createReadStream(restored.databasePath),createWriteStream(destination,{mode:0o600}));return destination}finally{await rm(temp,{recursive:true,force:true}).catch(()=>{})}}

export async function verifyRestoreCandidate(path:string,secret:string,directory?:string){const target=join(directory??tmpdir(),`.restore-drill-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`);try{const restored=await restoreBackupPackage(path,secret,target),sourceSha256=await hashFile(restored.databasePath),databaseInfo=await stat(restored.databasePath);return{ok:true,path,sizeBytes:databaseInfo.size,sourceSha256,fileCount:restored.fileCount,formatVersion:restored.formatVersion};}finally{await rm(target,{recursive:true,force:true}).catch(()=>{})}}
