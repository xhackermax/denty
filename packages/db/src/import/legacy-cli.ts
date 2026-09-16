import { readFile } from "node:fs/promises";
import { prisma, disconnectDatabase } from "../index";
import { importLegacyState } from "./legacy";
const file=process.argv[2];if(!file){console.error("Usage: legacy-cli <legacy-state.json>");process.exit(2)}const state=JSON.parse(await readFile(file,"utf8"));const result=await importLegacyState(prisma,state,{clinicId:process.env.DENTY_IMPORT_CLINIC_ID,clinicName:process.env.DENTY_IMPORT_CLINIC_NAME});console.log(JSON.stringify(result,null,2));await disconnectDatabase();
