import { z } from "zod";

import {
  RECALL_ANCHORS,
  RECALL_CATEGORIES,
  RECALL_CHANNELS,
  RECALL_CLOSE_REASONS,
  RECALL_INTERVAL_MAX,
  RECALL_INTERVAL_UNITS,
  RECALL_STATES,
  RECALL_STORED_STATUSES,
  type RecallState,
} from "@/domain/recalls";

import { idSchema, isoDateSchema } from "../contracts";

// Same limits as the recall_templates constraints, so the form explains a bad
// value instead of the database rejecting it.
export const recallTemplateInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_]{1,48}$/, "Usa mayúsculas, números y guion bajo (máximo 48)."),
    name: z.string().trim().min(3, "Mínimo 3 caracteres.").max(100),
    category: z.enum(RECALL_CATEGORIES),
    description: z.string().trim().max(1000).nullable(),
    intervalValue: z.number().int().min(1).max(RECALL_INTERVAL_MAX),
    intervalUnit: z.enum(RECALL_INTERVAL_UNITS),
    anchorType: z.enum(RECALL_ANCHORS),
    leadDays: z.number().int().min(0).max(180),
    maxAttempts: z.number().int().min(0).max(10),
    autoRecurrence: z.boolean(),
    autoEnroll: z.boolean(),
    messagingEnabled: z.boolean(),
    channels: z.array(z.enum(RECALL_CHANNELS)).max(RECALL_CHANNELS.length),
    reminderOffsets: z.array(z.number().int().min(-180).max(180)).max(10),
    messageTemplateKey: z.string().trim().max(100).nullable(),
    defaultSiteId: idSchema.nullable(),
    defaultStaffId: idSchema.nullable(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.reminderOffsets).size !== value.reminderOffsets.length) {
      ctx.addIssue({
        code: "custom",
        path: ["reminderOffsets"],
        message: "No repitas el mismo día.",
      });
    }
    if (!value.messagingEnabled) return;
    if (value.channels.length === 0) {
      ctx.addIssue({ code: "custom", path: ["channels"], message: "Elige al menos un canal." });
    }
    if (value.reminderOffsets.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["reminderOffsets"],
        message: "Indica cuándo avisar.",
      });
    }
  });
export type RecallTemplateInput = z.infer<typeof recallTemplateInputSchema>;

export const recallTemplateUpdateSchema = z.object({
  template: recallTemplateInputSchema,
  expectedVersion: z.number().int().positive(),
  recomputePending: z.boolean().default(false),
});

export const recallTemplateSchema = z.object({
  id: idSchema,
  code: z.string(),
  name: z.string(),
  category: z.enum(RECALL_CATEGORIES),
  description: z.string().nullable(),
  intervalValue: z.number().int(),
  intervalUnit: z.enum(RECALL_INTERVAL_UNITS),
  anchorType: z.enum(RECALL_ANCHORS),
  leadDays: z.number().int(),
  maxAttempts: z.number().int(),
  autoRecurrence: z.boolean(),
  autoEnroll: z.boolean(),
  messagingEnabled: z.boolean(),
  channels: z.array(z.enum(RECALL_CHANNELS)),
  reminderOffsets: z.array(z.number().int()),
  messageTemplateKey: z.string().nullable(),
  defaultSiteId: idSchema.nullable(),
  defaultStaffId: idSchema.nullable(),
  active: z.boolean(),
  archivedAt: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  openCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
  recomputed: z.number().int().nonnegative().optional(),
});
export type RecallTemplate = z.infer<typeof recallTemplateSchema>;

export const recallTemplatesSchema = z.object({ items: z.array(recallTemplateSchema) });

export const recallTemplateArchiveSchema = z.object({
  archive: z.boolean(),
  reason: z.string().trim().max(300).nullable().default(null),
});

export const recallCandidateFiltersSchema = z.object({
  siteId: idSchema.optional(),
  staffId: idSchema.optional(),
  lastVisitFrom: isoDateSchema.optional(),
  lastVisitTo: isoDateSchema.optional(),
  minAge: z.number().int().min(0).max(120).optional(),
  maxAge: z.number().int().min(0).max(120).optional(),
  treatmentCategory: z.string().trim().min(1).max(60).optional(),
  excludeTemplateId: idSchema.optional(),
});
export type RecallCandidateFilters = z.infer<typeof recallCandidateFiltersSchema>;

export const recallCandidateSchema = z.object({
  patientId: idSchema,
  patientName: z.string(),
  recordNumber: z.string().nullable(),
  lastVisitAt: z.string().nullable(),
  siteName: z.string().nullable(),
});
export const recallCandidatesSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(recallCandidateSchema),
});
export type RecallCandidate = z.infer<typeof recallCandidateSchema>;

export const recallAssignSchema = z.object({
  patientIds: z.array(idSchema).min(1).max(500),
  anchorDate: isoDateSchema.nullable().default(null),
  dueOverrides: z.record(idSchema, isoDateSchema).default({}),
  idempotencyKey: z.string().trim().min(8).max(100).nullable().default(null),
  dryRun: z.boolean().default(false),
});

export const recallAssignResultSchema = z.object({
  added: z.number().int().nonnegative(),
  dryRun: z.boolean(),
  skipped: z.array(
    z.object({
      patientId: idSchema,
      reason: z.enum(["ALREADY_ACTIVE", "PATIENT_ARCHIVED", "PATIENT_NOT_FOUND"]),
    }),
  ),
});
export type RecallAssignResult = z.infer<typeof recallAssignResultSchema>;

export const recallStateSchema = z.enum(RECALL_STATES);

export const recallItemSchema = z.object({
  id: idSchema,
  patientId: idSchema,
  patientName: z.string(),
  recordNumber: z.string().nullable(),
  kind: z.string(),
  templateId: idSchema.nullable(),
  templateName: z.string().nullable(),
  dueAt: z.string(),
  status: z.enum(RECALL_STORED_STATUSES),
  state: recallStateSchema,
  closeReason: z.enum(RECALL_CLOSE_REASONS).nullable(),
  pausedUntil: z.string().nullable(),
  siteId: idSchema.nullable(),
  siteName: z.string().nullable(),
  staffId: idSchema.nullable(),
  staffName: z.string().nullable(),
  contactedAt: z.string().nullable(),
  contactAttempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().nullable(),
  bookedAppointmentId: idSchema.nullable(),
  bookedAppointmentAt: z.string().nullable(),
  lastVisitAt: z.string().nullable(),
  nextAppointment: z.object({ id: idSchema, startsAt: z.string() }).nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
});
export type RecallItem = z.infer<typeof recallItemSchema>;

export const recallKpisSchema = z.object({
  pending: z.number().int().nonnegative(),
  upcoming: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  contacted: z.number().int().nonnegative(),
  booked: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
});
export type RecallKpis = z.infer<typeof recallKpisSchema>;

export const recallListSchema = z.object({
  total: z.number().int().nonnegative(),
  kpis: recallKpisSchema,
  items: z.array(recallItemSchema),
});
export type RecallList = z.infer<typeof recallListSchema>;

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

export const recallListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optional(z.string().trim().max(100)),
  state: optional(recallStateSchema),
  templateId: optional(idSchema),
  source: optional(z.enum(["TEMPLATE", "AUTOMATIC"])),
  siteId: optional(idSchema),
  staffId: optional(idSchema),
  patientId: optional(idSchema),
  dueFrom: optional(isoDateSchema),
  dueTo: optional(isoDateSchema),
  includeClosed: z.preprocess((value) => value === true || value === "true", z.boolean()),
});
/** What the browser sends; the schema also accepts the same values as query strings. */
export interface RecallListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  state?: RecallState;
  templateId?: string;
  source?: "TEMPLATE" | "AUTOMATIC";
  siteId?: string;
  staffId?: string;
  patientId?: string;
  dueFrom?: string;
  dueTo?: string;
  includeClosed?: boolean;
}

export const RECALL_ACTIONS = [
  "CONTACT",
  "POSTPONE",
  "RESCHEDULE",
  "ASSIGN",
  "LINK_APPOINTMENT",
  "COMPLETE",
  "CANCEL",
  "REOPEN",
] as const;
export type RecallAction = (typeof RECALL_ACTIONS)[number];

const assignPayloadSchema = z
  .object({ staffId: idSchema.nullable().optional(), siteId: idSchema.nullable().optional() })
  .refine((value) => "staffId" in value || "siteId" in value, "Indica responsable o sede.");

export const recallActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONTACT"), payload: z.object({}).default({}) }),
  z.object({ action: z.literal("POSTPONE"), payload: z.object({ until: isoDateSchema }) }),
  z.object({ action: z.literal("RESCHEDULE"), payload: z.object({ dueDate: isoDateSchema }) }),
  z.object({ action: z.literal("ASSIGN"), payload: assignPayloadSchema }),
  z.object({
    action: z.literal("LINK_APPOINTMENT"),
    payload: z.object({ appointmentId: idSchema }),
  }),
  z.object({ action: z.literal("COMPLETE"), payload: z.object({}).default({}) }),
  z.object({ action: z.literal("CANCEL"), payload: z.object({}).default({}) }),
  z.object({ action: z.literal("REOPEN"), payload: z.object({}).default({}) }),
]);
export const recallActionRequestSchema = z.intersection(
  recallActionSchema,
  z.object({ expectedVersion: z.number().int().positive().nullable().default(null) }),
);
export type RecallActionRequest = z.input<typeof recallActionRequestSchema>;

export const recallBulkSchema = z.intersection(
  z.object({ ids: z.array(idSchema).min(1).max(200) }),
  z.discriminatedUnion("action", [
    z.object({ action: z.literal("CONTACT"), payload: z.object({}).default({}) }),
    z.object({ action: z.literal("POSTPONE"), payload: z.object({ until: isoDateSchema }) }),
    z.object({ action: z.literal("RESCHEDULE"), payload: z.object({ dueDate: isoDateSchema }) }),
    z.object({ action: z.literal("ASSIGN"), payload: assignPayloadSchema }),
    z.object({ action: z.literal("CANCEL"), payload: z.object({}).default({}) }),
  ]),
);
export type RecallBulkRequest = z.input<typeof recallBulkSchema>;

export const recallBulkResultSchema = z.object({
  updated: z.number().int().nonnegative(),
  failed: z.array(z.object({ id: idSchema, reason: z.string() })),
});

export const recallHistorySchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      eventType: z.string(),
      before: z.record(z.string(), z.unknown()).nullable(),
      after: z.record(z.string(), z.unknown()).nullable(),
      actorName: z.string().nullable(),
      appointmentId: idSchema.nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type RecallHistory = z.infer<typeof recallHistorySchema>;
