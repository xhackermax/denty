import { z } from "zod";

import { idSchema } from "../contracts";

export const communicationChannelSchema = z.enum(["WHATSAPP", "SMS", "EMAIL"]);
export const communicationCategorySchema = z.enum([
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CHANGE",
  "PAYMENT_REMINDER",
  "DOCUMENT_AVAILABLE",
  "ADMINISTRATIVE",
  "MARKETING",
]);

export const communicationSchema = z.object({ id: idSchema }).passthrough();
export const communicationsSchema = z.object({
  items: z.array(communicationSchema),
});

export const createCommunicationSchema = z
  .object({
    channel: communicationChannelSchema.default("WHATSAPP"),
    category: communicationCategorySchema.default("ADMINISTRATIVE"),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    templateKey: z.string().min(1).optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    campaignId: idSchema.optional(),
    idempotencyKey: z.string().min(1).max(160).optional(),
  })
  .passthrough();

export const communicationConsentSchema = z.object({ id: idSchema }).passthrough();
export const communicationConsentsSchema = z.object({
  items: z.array(communicationConsentSchema),
});

export const communicationTemplatesSchema = z.object({
  items: z.array(
    z.object({
      key: communicationCategorySchema,
      label: z.string().min(1),
    }),
  ),
});

export const marketingMessageKindSchema = z.enum(["BIRTHDAY", "OFFER", "DISCOUNT"]);
export const marketingMessageTemplateSchema = z.object({
  clinic_id: idSchema,
  kind: marketingMessageKindSchema,
  channel: communicationChannelSchema,
  enabled: z.boolean(),
  subject: z.string(),
  body: z.string(),
  offer_details: z.string(),
  discount_percent: z.number().int().nullable(),
  valid_until: z.string().nullable(),
  contact_email: z.string(),
  updated_at: z.string(),
});
export const marketingMessageTemplatesSchema = z.object({
  items: z.array(marketingMessageTemplateSchema),
});
export const saveMarketingMessageTemplateSchema = z.object({
  kind: marketingMessageKindSchema,
  channel: communicationChannelSchema,
  enabled: z.boolean(),
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(10).max(1000),
  offerDetails: z.string().trim().max(500),
  discountPercent: z.number().int().min(1).max(100).nullable(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  contactEmail: z.string().trim().max(160),
}).superRefine((input, ctx) => {
  if (input.enabled && input.kind !== "BIRTHDAY" &&
      (input.offerDetails.length < 10 || !input.validUntil)) {
    ctx.addIssue({ code: "custom", path: ["offerDetails"],
      message: "Indica las condiciones y el último día de la oferta." });
  }
  if (input.enabled && input.kind === "DISCOUNT" && !input.discountPercent) {
    ctx.addIssue({ code: "custom", path: ["discountPercent"],
      message: "Indica el porcentaje de descuento." });
  }
  if (input.enabled && input.channel === "EMAIL" &&
      !/^[^ @]+@[^ @]+\.[^ @]+$/.test(input.contactEmail)) {
    ctx.addIssue({ code: "custom", path: ["contactEmail"],
      message: "Se requiere una dirección de contacto para solicitar la baja." });
  }
});
export const marketingCommunicationPolicySchema = z.object({
  clinic_id: idSchema,
  min_days_between_messages: z.number().int().min(7).max(90),
  send_from_hour: z.number().int().min(8).max(13),
  send_until_hour: z.number().int().min(16).max(21),
  updated_at: z.string(),
});
export const updateMarketingCommunicationPolicySchema = z.object({
  frequencyDays: z.number().int().min(7).max(90),
  startHour: z.number().int().min(8).max(13),
  endHour: z.number().int().min(16).max(21),
}).refine(v => v.endHour - v.startHour >= 5, {
  message: "Deja al menos cinco horas para los envíos.",
  path: ["endHour"],
});
export const marketingAudiencePreviewSchema = z.object({
  candidates: z.number().int().nonnegative(),
  eligible: z.number().int().nonnegative(),
  excluded: z.record(z.string(), z.number().int().nonnegative()),
  scheduledAt: z.string(),
  channel: communicationChannelSchema,
});

export const queueMarketingMessageTemplateSchema = z.object({
  kind: marketingMessageKindSchema,
  patientId: idSchema.optional(),
}).refine(input => input.kind === "BIRTHDAY" || Boolean(input.patientId), {
  message: "Selecciona un paciente para ofertas y descuentos.",
});
export const marketingMessageQueueResultSchema = z.object({
  queued: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  alreadyQueued: z.number().int().nonnegative(),
});

export const appointmentMessagingSettingsSchema = z
  .object({
    clinic_id: idSchema.optional(),
    clinicId: idSchema.optional(),
    reminder_days_before: z.number().int().min(1).max(30).optional(),
    reminderDaysBefore: z.number().int().min(1).max(30).optional(),
    preferred_channel: z.enum(["WHATSAPP", "SMS"]).optional(),
    preferredChannel: z.enum(["WHATSAPP", "SMS"]).optional(),
    whatsapp_enabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    sms_enabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsapp_provider: z.string().optional(),
    whatsappProvider: z.string().optional(),
    sms_provider: z.string().optional(),
    smsProvider: z.string().optional(),
    whatsapp_from: z.string().nullable().optional(),
    whatsappFrom: z.string().nullable().optional(),
    sms_from: z.string().nullable().optional(),
    smsFrom: z.string().nullable().optional(),
    confirmation_link_base_url: z.string().nullable().optional(),
    confirmationLinkBaseUrl: z.string().nullable().optional(),
    reminder_template: z.string().optional(),
    reminderTemplate: z.string().optional(),
  })
  .passthrough();

export const updateAppointmentMessagingSettingsSchema = z.object({
  reminderDaysBefore: z.number().int().min(1).max(30),
  preferredChannel: z.enum(["WHATSAPP", "SMS"]),
  whatsappEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  whatsappProvider: z.string().min(1).max(80),
  smsProvider: z.string().min(1).max(80),
  whatsappFrom: z.string().max(120).optional(),
  smsFrom: z.string().max(120).optional(),
  confirmationLinkBaseUrl: z.string().url().optional(),
  reminderTemplate: z.string().min(1).max(500),
});

export const queueAppointmentRemindersResultSchema = z.object({
  queued: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

export const setCommunicationConsentSchema = z.object({
  channel: communicationChannelSchema,
  category: z.string().min(1).default("*"),
  granted: z.boolean(),
  source: z.string().max(80).optional(),
  evidenceNote: z.string().max(300).optional(),
});

export const notificationPreferenceSchema = z
  .object({
    id: idSchema,
  })
  .passthrough();

export const notificationPreferencesSchema = z.object({
  items: z.array(notificationPreferenceSchema),
});

export const updateNotificationPreferenceSchema = z.object({
  patientId: idSchema.optional(),
  channel: z.string().min(1),
  type: z.string().min(1).default("*"),
  enabled: z.boolean(),
});

export const marketingProviderSchema = z.enum(["META", "GOOGLE", "INTERNAL"]);
export const marketingConnectionSchema = z
  .object({
    provider: z.string().min(1),
    connected: z.boolean(),
  })
  .passthrough();
export const marketingConnectionsSchema = z.object({
  items: z.array(marketingConnectionSchema),
});

export const marketingCampaignSchema = z
  .object({
    id: idSchema.optional(),
    externalId: z.string().min(1),
    provider: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
    version: z.number().int().positive().optional(),
    attributedPatients: z.number().int().nonnegative().optional(),
    signedBudgets: z.number().int().nonnegative().optional(),
    invoicedCents: z.number().nonnegative().optional(),
    collectedCents: z.number().nonnegative().optional(),
  })
  .passthrough();

export const marketingCampaignsSchema = z.object({
  items: z.array(marketingCampaignSchema),
});

export const createMarketingCampaignSchema = z
  .object({
    provider: marketingProviderSchema,
    name: z.string().min(1),
    externalId: z.string().min(1).optional(),
    dailyBudgetCents: z.number().int().nonnegative().optional(),
    utmSource: z.string().max(120).optional(),
    utmMedium: z.string().max(120).optional(),
    utmCampaign: z.string().max(160).optional(),
  })
  .passthrough();

export const updateMarketingCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  dailyBudgetCents: z.number().int().nonnegative().optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export const campaignStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]),
});

export const campaignBudgetSchema = z.object({
  dailyBudgetCents: z.number().int().nonnegative(),
});

export const alertSchema = z.object({ id: idSchema }).passthrough();
export const alertsSchema = z.object({
  items: z.array(alertSchema),
  openCount: z.number().int().nonnegative(),
  criticalCount: z.number().int().nonnegative(),
});

export const snoozeAlertSchema = z.object({
  until: z.string().datetime({ offset: true }),
});

export const assignAlertSchema = z.object({
  userId: idSchema.nullable(),
});

export const revenueGoalSchema = z.object({ id: idSchema }).passthrough();
export const revenueGoalsSchema = z.object({
  items: z.array(revenueGoalSchema),
});

export const updateRevenueGoalSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  siteId: idSchema.nullable().optional(),
  targetCents: z.number().int().nonnegative(),
});

export const gameIdSchema = z.enum([
  "snake",
  "blockDrop",
  "dentyRun",
  "memory",
  "merge",
  "airHockey",
  "dentyImpossible",
  "ticTacToeAi",
  "ticTacToeLocal",
  "miniGolf",
  "breakoutDental",
  "whackCavity",
  "connectPuzzle",
  "endlessRoad",
]);

export const startGamePlaySchema = z.object({ gameId: gameIdSchema });
export const finishGamePlaySchema = z.object({
  score: z.number().finite().nonnegative().optional(),
});
export const gameDashboardSchema = z.object({ patientId: idSchema }).passthrough();
export const gamePlaySchema = z.object({ id: idSchema }).passthrough();
export const gameVoucherSchema = z.object({ id: idSchema }).passthrough();

export const patientAttributionTouchSchema = z.object({ id: idSchema }).passthrough();
export const createPatientAttributionTouchSchema = z.object({
  campaignId: idSchema.optional(),
  source: z.string().max(120).optional(),
  detail: z.string().max(300).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(160).optional(),
  utmContent: z.string().max(160).optional(),
  utmTerm: z.string().max(160).optional(),
  landingUrl: z.string().url().max(1000).optional(),
  idempotencyKey: z.string().min(1).max(160).optional(),
});
