import { z } from "zod";

import type { ApiClient } from "../client";
import { notificationSchema } from "../contracts";
import {
  alertSchema,
  alertsSchema,
  assignAlertSchema,
  campaignBudgetSchema,
  campaignStatusSchema,
  communicationConsentSchema,
  communicationConsentsSchema,
  communicationsSchema,
  communicationTemplatesSchema,
  createCommunicationSchema,
  createMarketingCampaignSchema,
  finishGamePlaySchema,
  gameDashboardSchema,
  gamePlaySchema,
  gameVoucherSchema,
  marketingCampaignSchema,
  marketingCampaignsSchema,
  marketingConnectionsSchema,
  notificationPreferencesSchema,
  revenueGoalSchema,
  revenueGoalsSchema,
  setCommunicationConsentSchema,
  snoozeAlertSchema,
  startGamePlaySchema,
  updateNotificationPreferenceSchema,
  updateRevenueGoalSchema,
} from "../schemas/engagement";
import { encodeId, withQuery } from "./shared";

const okSchema = z.object({ ok: z.literal(true) });
const notificationsSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative().optional(),
});

export function createEngagementResource(client: ApiClient) {
  return {
    communications: {
      list: () => client.request("/api/admin/communications", communicationsSchema),
      templates: () =>
        client.request(
          "/api/admin/communications/templates",
          communicationTemplatesSchema,
        ),
      forPatient: (patientId: string) =>
        client.request(
          `/api/patients/${encodeId(patientId)}/communications`,
          communicationsSchema,
        ),
      create: (patientId: string, payload: z.input<typeof createCommunicationSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/communications`,
          z.object({ id: z.string().min(1) }).passthrough(),
          createCommunicationSchema.parse(payload),
        ),
      consents: (patientId: string) =>
        client.request(
          `/api/patients/${encodeId(patientId)}/communication-consents`,
          communicationConsentsSchema,
        ),
      setConsent: (
        patientId: string,
        payload: z.input<typeof setCommunicationConsentSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/communication-consents`,
          communicationConsentSchema,
          setCommunicationConsentSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    marketing: {
      connections: () =>
        client.request(
          "/api/admin/marketing/connections",
          marketingConnectionsSchema,
        ),
      campaigns: (provider?: string) =>
        client.request(
          withQuery("/api/admin/marketing/campaigns", { provider }),
          marketingCampaignsSchema,
        ),
      createCampaign: (payload: z.input<typeof createMarketingCampaignSchema>) =>
        client.mutation(
          "/api/admin/marketing/campaigns",
          marketingCampaignSchema,
          createMarketingCampaignSchema.parse(payload),
        ),
      updateCampaign: (provider: string, id: string, payload: Record<string, unknown>) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}`,
          marketingCampaignSchema,
          payload,
          { method: "PATCH" },
        ),
      setStatus: (
        provider: string,
        id: string,
        payload: z.input<typeof campaignStatusSchema>,
      ) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}/status`,
          marketingCampaignSchema,
          campaignStatusSchema.parse(payload),
        ),
      setBudget: (
        provider: string,
        id: string,
        payload: z.input<typeof campaignBudgetSchema>,
      ) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}/budget`,
          marketingCampaignSchema,
          campaignBudgetSchema.parse(payload),
        ),
    },
    alerts: {
      list: () => client.request("/api/admin/alerts", alertsSchema),
      resolve: (id: string) =>
        client.mutation(`/api/admin/alerts/${encodeId(id)}/resolve`, alertSchema, {}),
      review: (id: string) =>
        client.mutation(`/api/admin/alerts/${encodeId(id)}/review`, alertSchema, {}),
      snooze: (id: string, payload: z.input<typeof snoozeAlertSchema>) =>
        client.mutation(
          `/api/admin/alerts/${encodeId(id)}/snooze`,
          alertSchema,
          snoozeAlertSchema.parse(payload),
        ),
      assign: (id: string, payload: z.input<typeof assignAlertSchema>) =>
        client.mutation(
          `/api/admin/alerts/${encodeId(id)}/assign`,
          alertSchema,
          assignAlertSchema.parse(payload),
        ),
      revenueGoals: () =>
        client.request("/api/admin/revenue-goals", revenueGoalsSchema),
      updateRevenueGoal: (payload: z.input<typeof updateRevenueGoalSchema>) =>
        client.mutation(
          "/api/admin/revenue-goals",
          revenueGoalSchema,
          updateRevenueGoalSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    notifications: {
      list: () => client.request("/api/notifications", notificationsSchema),
      read: (id: string) =>
        client.mutation(`/api/notifications/${encodeId(id)}/read`, okSchema, {}),
      preferences: () =>
        client.request("/api/notifications/preferences", notificationPreferencesSchema),
      updatePreference: (
        payload: z.input<typeof updateNotificationPreferenceSchema>,
      ) =>
        client.mutation(
          "/api/notifications/preferences",
          z.object({ id: z.string().min(1) }).passthrough(),
          updateNotificationPreferenceSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    games: {
      dashboard: (patientId: string) =>
        client.request(
          `/api/patient/${encodeId(patientId)}/games/dashboard`,
          gameDashboardSchema,
        ),
      start: (patientId: string, payload: z.input<typeof startGamePlaySchema>) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/games/plays/start`,
          gamePlaySchema,
          startGamePlaySchema.parse(payload),
        ),
      finish: (
        patientId: string,
        playId: string,
        payload: z.input<typeof finishGamePlaySchema>,
      ) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/games/plays/${encodeId(playId)}/finish`,
          gamePlaySchema,
          finishGamePlaySchema.parse(payload),
        ),
      voucher: (patientId: string) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/games/voucher`,
          gameVoucherSchema,
          {},
        ),
      applyVoucher: (id: string) =>
        client.mutation(
          `/api/game-vouchers/${encodeId(id)}/apply`,
          gameVoucherSchema,
          {},
        ),
    },
  } as const;
}
