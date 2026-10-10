import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  marketingAudiencePreviewSchema,
  updateMarketingCommunicationPolicySchema,
} from "@/shared/api/schemas/engagement";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20261011001500_marketing_audience_safety.sql", import.meta.url),
  "utf8",
);

describe("patient marketing guardrails", () => {
  it("allows a deliberate cadence and quiet hours, rejecting invalid configurations", () => {
    expect(updateMarketingCommunicationPolicySchema.safeParse({
      frequencyDays: 21, startHour: 10, endHour: 19,
    }).success).toBe(true);
    expect(updateMarketingCommunicationPolicySchema.safeParse({
      frequencyDays: 0, startHour: 10, endHour: 19,
    }).success).toBe(false);
    expect(updateMarketingCommunicationPolicySchema.safeParse({
      frequencyDays: 21, startHour: 13, endHour: 16,
    }).success).toBe(false);
  });

  it("validates privacy-preserving dry-run counts without patient identity fields", () => {
    expect(marketingAudiencePreviewSchema.parse({
      candidates: 12, eligible: 3,
      excluded: { NO_CONSENT: 5, RECENT_PROMOTION: 4 },
      scheduledAt: "2026-10-11T10:00:00+02:00", channel: "WHATSAPP",
    }).eligible).toBe(3);
    expect(marketingAudiencePreviewSchema.safeParse({
      candidates: -1, eligible: 0, excluded: {}, scheduledAt: "invalid", channel: "WHATSAPP",
    }).success).toBe(false);
  });

  it("uses the same eligibility check for simulation and the real queue", () => {
    expect(sql).toContain("create or replace function private.marketing_recipient_reason");
    expect(sql).toContain("v_reason:=private.marketing_recipient_reason(");
    expect(sql).toContain("v_reason<>'ELIGIBLE'");
    expect(sql).toContain("v_reason='ELIGIBLE'");
    expect(sql).toContain("purpose='MARKETING'");
    expect(sql).toContain("RECENT_PROMOTION");
    expect(sql).toContain("UNDERAGE_OR_UNKNOWN_AGE");
    expect(sql).toContain("MISSING_CONTACT");
    expect(sql).toContain("NO_CONSENT");
  });

  it("respects the quiet hours and includes a truthful unsubscribe address", () => {
    expect(sql).toContain("v_scheduled,null,v_key");
    expect(sql).toContain("send_from_hour");
    expect(sql).toContain("send_until_hour");
    expect(sql).toContain("at time zone 'Europe/Madrid'");
    expect(sql).toContain("Para dejar de recibir estos mensajes, escribe a ");
    expect(sql).not.toContain("responde BAJA");
    expect(sql).toContain("MARKETING_UNSUBSCRIBE_CONTACT_REQUIRED");
  });

  it("protects settings with RLS, limited privileges and permission checks", () => {
    expect(sql).toContain("alter table public.marketing_communication_policy enable row level security");
    expect(sql).toContain("revoke insert,update,delete on public.marketing_communication_policy from authenticated");
    expect(sql).toContain("private.stage11_has_permission(p_clinic_id,'communications.manage')");
    expect(sql).toContain("revoke all on function private.marketing_recipient_reason");
  });
});
