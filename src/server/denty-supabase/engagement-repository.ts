import type { SupabaseRestClient } from "../supabase/rest-client";

interface CampaignRow {
  id: string;
  provider: string;
  external_campaign_id: string;
  name: string;
  status: string;
  daily_budget_cents: number;
  budget_cents: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
interface MessageRow {
  id: string;
  patient_id: string;
  campaign_id: string | null;
  channel: string;
  category: string;
  subject: string | null;
  body: string | null;
  status: string;
  provider_message_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}
interface ConsentRow {
  id: string;
  patient_id: string;
  channel: string;
  purpose: string;
  status: string;
  source: string | null;
  evidence_note: string | null;
  captured_at: string;
  revoked_at: string | null;
  created_at: string;
}
interface AppointmentMessagingSettingsRow {
  clinic_id: string;
  reminder_days_before: number;
  preferred_channel: "WHATSAPP" | "SMS";
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_provider: string;
  sms_provider: string;
  whatsapp_from: string | null;
  sms_from: string | null;
  confirmation_link_base_url: string | null;
  reminder_template: string;
  updated_at: string;
}

const campaign = (r: CampaignRow, roi?: Record<string, unknown>) => ({
  id: r.id,
  externalId: r.external_campaign_id,
  provider: r.provider,
  name: r.name,
  status: r.status,
  dailyBudgetCents: Number(r.daily_budget_cents),
  budgetCents: Number(r.budget_cents),
  utmSource: r.utm_source,
  utmMedium: r.utm_medium,
  utmCampaign: r.utm_campaign,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(roi ?? {}),
});
const message = (r: MessageRow) => ({
  id: r.id,
  patientId: r.patient_id,
  campaignId: r.campaign_id,
  channel: r.channel,
  category: r.category,
  subject: r.subject,
  body: r.body,
  status: r.status,
  providerMessageId: r.provider_message_id,
  scheduledAt: r.scheduled_at,
  sentAt: r.sent_at,
  deliveredAt: r.delivered_at,
  failedAt: r.failed_at,
  failureReason: r.failure_reason,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const consent = (r: ConsentRow) => ({
  id: r.id,
  patientId: r.patient_id,
  channel: r.channel,
  purpose: r.purpose,
  status: r.status,
  granted: r.status === "GRANTED",
  source: r.source,
  evidenceNote: r.evidence_note,
  capturedAt: r.captured_at,
  revokedAt: r.revoked_at,
  createdAt: r.created_at,
});
const appointmentMessagingSettings = (r: AppointmentMessagingSettingsRow) => ({
  clinicId: r.clinic_id,
  reminderDaysBefore: r.reminder_days_before,
  preferredChannel: r.preferred_channel,
  whatsappEnabled: r.whatsapp_enabled,
  smsEnabled: r.sms_enabled,
  whatsappProvider: r.whatsapp_provider,
  smsProvider: r.sms_provider,
  whatsappFrom: r.whatsapp_from,
  smsFrom: r.sms_from,
  confirmationLinkBaseUrl: r.confirmation_link_base_url,
  reminderTemplate: r.reminder_template,
  updatedAt: r.updated_at,
});

export class EngagementRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  async listCampaigns(provider?: string) {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "created_at.desc",
    };
    if (provider) query.provider = `eq.${provider}`;
    const [rows, roi] = await Promise.all([
      this.client.select<CampaignRow>("marketing_campaigns", query),
      this.client
        .rpc<Array<Record<string, unknown>>>("stage11_campaign_roi", { p_clinic_id: this.clinicId })
        .catch(() => []),
    ]);
    const roiMap = new Map(roi.map((x) => [String(x.campaignId ?? ""), x]));
    return { items: rows.map((r) => campaign(r, roiMap.get(r.id))) };
  }
  async getAppointmentMessagingSettings() {
    const row = await this.client.rpc<AppointmentMessagingSettingsRow>(
      "get_appointment_messaging_settings",
      { p_clinic_id: this.clinicId },
    );
    return appointmentMessagingSettings(row);
  }
  async updateAppointmentMessagingSettings(input: {
    reminderDaysBefore: number;
    preferredChannel: "WHATSAPP" | "SMS";
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    whatsappProvider: string;
    smsProvider: string;
    whatsappFrom?: string;
    smsFrom?: string;
    confirmationLinkBaseUrl?: string;
    reminderTemplate: string;
  }) {
    const row = await this.client.rpc<AppointmentMessagingSettingsRow>(
      "update_appointment_messaging_settings",
      {
        p_clinic_id: this.clinicId,
        p_reminder_days_before: input.reminderDaysBefore,
        p_preferred_channel: input.preferredChannel,
        p_whatsapp_enabled: input.whatsappEnabled,
        p_sms_enabled: input.smsEnabled,
        p_whatsapp_provider: input.whatsappProvider,
        p_sms_provider: input.smsProvider,
        p_whatsapp_from: input.whatsappFrom ?? null,
        p_sms_from: input.smsFrom ?? null,
        p_confirmation_link_base_url: input.confirmationLinkBaseUrl ?? null,
        p_reminder_template: input.reminderTemplate,
      },
    );
    return appointmentMessagingSettings(row);
  }
  async queueAppointmentConfirmationReminders() {
    return this.client.rpc<{ queued: number; skipped: number }>(
      "queue_appointment_confirmation_reminders",
      { p_clinic_id: this.clinicId },
    );
  }
  async createCampaign(input: {
    provider: string;
    name: string;
    externalId?: string;
    dailyBudgetCents?: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }) {
    const row = await this.client.rpc<CampaignRow>("create_marketing_campaign", {
      p_clinic_id: this.clinicId,
      p_provider: input.provider,
      p_name: input.name,
      p_external_campaign_id: input.externalId ?? null,
      p_daily_budget_cents: input.dailyBudgetCents ?? 0,
      p_utm_source: input.utmSource ?? null,
      p_utm_medium: input.utmMedium ?? null,
      p_utm_campaign: input.utmCampaign ?? null,
    });
    return campaign(row);
  }
  async updateCampaign(
    identifier: string,
    input: { name?: string; status?: string; dailyBudgetCents?: number; expectedVersion?: number },
    provider?: string,
  ) {
    let id = identifier;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
    ) {
      const rows = await this.client.select<CampaignRow>("marketing_campaigns", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        external_campaign_id: `eq.${identifier}`,
        ...(provider ? { provider: `eq.${provider}` } : {}),
        limit: 1,
      });
      if (!rows[0]) throw new Error("Campaign not found");
      id = rows[0].id;
    }
    return campaign(
      await this.client.rpc<CampaignRow>("update_marketing_campaign", {
        p_campaign_id: id,
        p_name: input.name ?? null,
        p_status: input.status ?? null,
        p_daily_budget_cents: input.dailyBudgetCents ?? null,
        p_expected_version: input.expectedVersion ?? null,
      }),
    );
  }
  async attributePatient(
    patientId: string,
    input: {
      campaignId?: string;
      source?: string;
      detail?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
      landingUrl?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.client.rpc<Record<string, unknown>>("record_patient_attribution_touchpoint", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_campaign_id: input.campaignId ?? null,
      p_source: input.source ?? null,
      p_detail: input.detail ?? null,
      p_utm_source: input.utmSource ?? null,
      p_utm_medium: input.utmMedium ?? null,
      p_utm_campaign: input.utmCampaign ?? null,
      p_utm_content: input.utmContent ?? null,
      p_utm_term: input.utmTerm ?? null,
      p_landing_url: input.landingUrl ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
      p_occurred_at: new Date().toISOString(),
    });
  }
  async listCommunications(patientId?: string) {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "created_at.desc",
    };
    if (patientId) query.patient_id = `eq.${patientId}`;
    const rows = await this.client.select<MessageRow>("communication_messages", query);
    return { items: rows.map(message) };
  }
  async createCommunication(
    patientId: string,
    input: {
      channel: string;
      category: string;
      subject?: string;
      body?: string;
      templateKey?: string;
      variables?: Record<string, unknown>;
      scheduledAt?: string;
      campaignId?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.client.rpc<Record<string, unknown>>("queue_communication", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_channel: input.channel,
      p_category: input.category,
      p_subject: input.subject ?? null,
      p_body: input.body ?? null,
      p_template_key: input.templateKey ?? null,
      p_variables: input.variables ?? {},
      p_scheduled_at: input.scheduledAt ?? null,
      p_campaign_id: input.campaignId ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
    });
  }
  async listConsents(patientId: string) {
    const rows = await this.client.select<ConsentRow>("communication_consents", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      patient_id: `eq.${patientId}`,
      order: "captured_at.desc",
    });
    return { items: rows.map(consent) };
  }
  async setConsent(
    patientId: string,
    input: {
      channel: string;
      category?: string;
      granted: boolean;
      source?: string;
      evidenceNote?: string;
    },
  ) {
    const row = await this.client.rpc<ConsentRow>("set_communication_consent", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_channel: input.channel,
      p_purpose: input.category ?? "MARKETING",
      p_granted: input.granted,
      p_source: input.source ?? "STAFF",
      p_evidence_note: input.evidenceNote ?? null,
      p_evidence_document_id: null,
    });
    return consent(row);
  }
  connections() {
    return {
      items: [
        { provider: "INTERNAL", connected: true },
        { provider: "META", connected: false },
        { provider: "GOOGLE", connected: false },
      ],
    };
  }
}
