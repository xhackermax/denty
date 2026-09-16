import { resolve } from "node:path";
import { createEncryptedBackup, prisma, verifyEncryptedBackup, verifyRestoreCandidate } from "@denty/db";

let timer:NodeJS.Timeout|undefined;
const lastRestoreDrill=new Map<string,number>();
async function backupAllClinics(){
  const secret=process.env.DENTY_BACKUP_KEY;if(!secret)return;
  const directory=resolve(process.env.DENTY_BACKUP_DIR??"./data/backups"),drillDays=Math.max(1,Number(process.env.DENTY_RESTORE_DRILL_INTERVAL_DAYS??30)||30),drillMs=drillDays*24*60*60*1000;
  const clinics=await prisma.clinic.findMany({select:{id:true}});
  for(const clinic of clinics){
    try{
      const result=await createEncryptedBackup({prisma,clinicId:clinic.id,secret,directory});
      await verifyEncryptedBackup(result.path,secret);
      const now=Date.now(),last=lastRestoreDrill.get(clinic.id)??0;
      if(now-last>=drillMs){await verifyRestoreCandidate(result.path,secret,directory);lastRestoreDrill.set(clinic.id,now)}
      await prisma.backupRecord.create({data:{clinicId:clinic.id,storagePath:result.path,sha256:result.sha256,encrypted:true,sizeBytes:result.sizeBytes,verifiedAt:new Date()}});
    }catch(error){console.error("Denty automatic backup failed",clinic.id,error)}
  }
}
export function startBackupScheduler(){
  if(timer||process.env.DENTY_AUTOMATIC_BACKUPS==="false")return;
  if(!process.env.DENTY_BACKUP_KEY){console.warn("DENTY_BACKUP_KEY no configurada: backups automáticos desactivados");return}
  const hours=Math.max(1,Number(process.env.DENTY_BACKUP_INTERVAL_HOURS??24)||24),ms=hours*60*60*1000;
  const first=setTimeout(()=>void backupAllClinics(),Math.min(60_000,ms));first.unref();
  timer=setInterval(()=>void backupAllClinics(),ms);timer.unref();
}
export function stopBackupScheduler(){if(timer){clearInterval(timer);timer=undefined}}
