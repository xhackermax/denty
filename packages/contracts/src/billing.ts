import { z } from "zod";
export const invoiceLineInputSchema=z.object({description:z.string().min(1),quantity:z.number().int().positive().default(1),unitPriceCents:z.number().int(),taxRateBps:z.number().int().min(0).max(10000).default(0),exemptionCode:z.string().optional(),clinicalPlanItemId:z.string().optional()});
export const createInvoiceDraftSchema=z.object({patientId:z.string().optional(),budgetId:z.string().optional(),seriesId:z.string(),type:z.enum(["STANDARD","SIMPLIFIED","RECTIFYING"]).default("STANDARD"),customerName:z.string().min(1),customerTaxId:z.string().optional(),customerAddress:z.string().optional(),lines:z.array(invoiceLineInputSchema).min(1)});
export const recordPaymentSchema=z.object({patientId:z.string().optional(),amountCents:z.number().int().positive(),method:z.enum(["CASH","CARD","TRANSFER","FINANCING","OTHER"]),reference:z.string().optional()});
export const allocatePaymentSchema=z.object({invoiceId:z.string(),amountCents:z.number().int().positive()});
