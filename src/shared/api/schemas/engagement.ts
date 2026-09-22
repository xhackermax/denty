import { z } from "zod";

import { idSchema } from "../contracts";

export const communicationChannelSchema = z.enum(["WHATSAPP", "SMS", "EMAIL"]);
export const communicationCategorySchema = z.enum([
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CHANGE",
  "PAYMENT_REMINDER",
  "DOCUMENT_AVAILABLE",
  "ADMINISTRATIVE",
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

export const setCommunicationConsentSchema = z.object({
  channel: communicationChannelSchema,
  category: z.string().min(1).default("*"),
  granted: z.boolean(),
  source: z.string().max(80).optional(),
  evidenceNote: z.string().max(300).optional(),
});

export const notificationPreferenceSchema = z.object({
  id: idSchema,
}).passthrough();

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
    externalId: z.string().min(1),
    provider: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
  })
  .passthrough();

export const marketingCampaignsSchema = z.object({
  items: z.array(marketingCampaignSchema),
});

export const createMarketingCampaignSchema = z
  .object({
    provider: marketingProviderSchema,
    name: z.string().min(1),
  })
  .passthrough();

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
