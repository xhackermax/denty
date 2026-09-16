import { z } from "zod";
export const dentalEntitySchema=z.object({id:z.string().optional(),tooth:z.string().optional(),arch:z.string().optional(),entityType:z.string().min(1),status:z.string().min(1),surfaces:z.array(z.string()).optional(),attributes:z.record(z.unknown()).optional(),parentId:z.string().optional(),active:z.boolean().default(true)});
export const saveDentalEntitySchema=z.object({expectedVersion:z.number().int().positive(),entity:dentalEntitySchema});
