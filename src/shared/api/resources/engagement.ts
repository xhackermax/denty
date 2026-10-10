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
  recoveryWorklistSchema,
  recoveryKindSchema,
  communicationTemplatesSchema,
  createCommunicationSchema,
  appointmentMessagingSettingsSchema,
  queueAppointmentRemindersResultSchema,
  marketingMessageTemplatesSchema,
  marketingMessageTemplateSchema,
  saveMarketingMessageTemplateSchema,
  queueMarketingMessageTemplateSchema,
  marketingMessageQueueResultSchema,
  marketingCommunicationPolicySchema,
  updateMarketingCommunicationPolicySchema,
  marketingAudiencePreviewSchema,
  updateAppointmentMessagingSettingsSchema,
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
  updateMarketingCampaignSchema,
  createPatientAttributionTouchSchema,
  patientAttributionTouchSchema,
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
      recoveryWorklist: (options: {
        kind?: z.infer<typeof recoveryKindSchema>;
        page?: number;
        pageSize?: number;
      } = {}) => client.request(
        withQuery("/api/recovery/worklist", {
          kind: options.kind ?? "ALL",
          page: String(options.page ?? 1),
          pageSize: String(options.pageSize ?? 25),
        }),
        recoveryWorklistSchema,
      ),
      list: () => client.request("/api/admin/communications", communicationsSchema),
      appointmentSettings: () =>
        client.request(
          "/api/admin/communications/appointment-settings",
          appointmentMessagingSettingsSchema,
        ),
      updateAppointmentSettings: (
        payload: z.input<typeof updateAppointmentMessagingSettingsSchema>,
      ) =>
        client.mutation(
          "/api/admin/communications/appointment-settings",
          appointmentMessagingSettingsSchema,
          updateAppointmentMessagingSettingsSchema.parse(payload),
          { method: "PUT" },
        ),
      queueAppointmentReminders: () =>
        client.mutation(
          "/api/admin/communications/appointment-reminders/queue",
          queueAppointmentRemindersResultSchema,
          {},
        ),
      templates: () =>
        client.request("/api/admin/communications/templates", communicationTemplatesSchema),
      marketingPolicy: () =>
        client.request("/api/admin/communications/marketing-policy",
          marketingCommunicationPolicySchema),
      saveMarketingPolicy: (
        input: z.input<typeof updateMarketingCommunicationPolicySchema>,
      ) => client.mutation("/api/admin/communications/marketing-policy",
        marketingCommunicationPolicySchema,
        updateMarketingCommunicationPolicySchema.parse(input), { method: "PUT" }),
      previewCampaign: (
        input: z.input<typeof queueMarketingMessageTemplateSchema>,
      ) => client.mutation("/api/admin/communications/campaign-templates/preview",
        marketingAudiencePreviewSchema,
        queueMarketingMessageTemplateSchema.parse(input)),
      campaignTemplates: () =>
        client.request("/api/admin/communications/campaign-templates",
          marketingMessageTemplatesSchema),
      saveCampaignTemplate: (
        input: z.input<typeof saveMarketingMessageTemplateSchema>,
      ) => client.mutation("/api/admin/communications/campaign-templates",
        marketingMessageTemplateSchema,
        saveMarketingMessageTemplateSchema.parse(input), { method: "PUT" }),
      queueCampaignTemplate: (
        input: z.input<typeof queueMarketingMessageTemplateSchema>,
      ) => client.mutation("/api/admin/communications/campaign-templates/queue",
        marketingMessageQueueResultSchema,
        queueMarketingMessageTemplateSchema.parse(input)),

      forPatient: (patientId: string) =>
        client.request(`/api/patients/${encodeId(patientId)}/communications`, communicationsSchema),
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
      setConsent: (patientId: string, payload: z.input<typeof setCommunicationConsentSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/communication-consents`,
          communicationConsentSchema,
          setCommunicationConsentSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    marketing: {
      connections: () =>
        client.request("/api/admin/marketing/connections", marketingConnectionsSchema),
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
      updateCampaign: (
        provider: string,
        id: string,
        payload: z.input<typeof updateMarketingCampaignSchema>,
      ) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}`,
          marketingCampaignSchema,
          updateMarketingCampaignSchema.parse(payload),
          { method: "PATCH" },
        ),
      setStatus: (provider: string, id: string, payload: z.input<typeof campaignStatusSchema>) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}/status`,
          marketingCampaignSchema,
          campaignStatusSchema.parse(payload),
        ),
      setBudget: (provider: string, id: string, payload: z.input<typeof campaignBudgetSchema>) =>
        client.mutation(
          `/api/admin/marketing/campaigns/${encodeId(provider)}/${encodeId(id)}/budget`,
          marketingCampaignSchema,
          campaignBudgetSchema.parse(payload),
        ),
      attributePatient: (
        patientId: string,
        payload: z.input<typeof createPatientAttributionTouchSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/attribution-touchpoints`,
          patientAttributionTouchSchema,
          createPatientAttributionTouchSchema.parse(payload),
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
      revenueGoals: () => client.request("/api/admin/revenue-goals", revenueGoalsSchema),
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
      updatePreference: (payload: z.input<typeof updateNotificationPreferenceSchema>) =>
        client.mutation(
          "/api/notifications/preferences",
          z.object({ id: z.string().min(1) }).passthrough(),
          updateNotificationPreferenceSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    games: {
      dashboard: (patientId: string) =>
        client.request(`/api/patient/${encodeId(patientId)}/games/dashboard`, gameDashboardSchema),
      start: (patientId: string, payload: z.input<typeof startGamePlaySchema>) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/games/plays/start`,
          gamePlaySchema,
          startGamePlaySchema.parse(payload),
        ),
      finish: (patientId: string, playId: string, payload: z.input<typeof finishGamePlaySchema>) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/games/plays/${encodeId(playId)}/finish`,
          gamePlaySchema,
          finishGamePlaySchema.parse(payload),
        ),
      voucher: (patientId: string) =>
        client.mutation(`/api/patient/${encodeId(patientId)}/games/voucher`, gameVoucherSchema, {}),
      applyVoucher: (id: string) =>
        client.mutation(`/api/game-vouchers/${encodeId(id)}/apply`, gameVoucherSchema, {}),
    },
  } as const;
}
