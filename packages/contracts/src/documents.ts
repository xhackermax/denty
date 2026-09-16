import { z } from "zod";
export const createDocumentSchema=z.object({patientId:z.string(),templateId:z.string().optional(),type:z.string().min(1),title:z.string().min(1),data:z.record(z.union([z.string(),z.number(),z.null()])).default({})});
export const signDocumentSchema=z.object({signerName:z.string().min(2),signatureData:z.string().optional()});
