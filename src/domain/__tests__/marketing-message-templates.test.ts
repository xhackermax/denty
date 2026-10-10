import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  queueMarketingMessageTemplateSchema,
  saveMarketingMessageTemplateSchema,
} from "@/shared/api/schemas/engagement";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20261010144500_marketing_message_templates.sql", import.meta.url),
  "utf8",
);

const base = {
  kind: "BIRTHDAY",
  channel: "WHATSAPP",
  enabled: true,
  subject: "Feliz cumpleaños",
  body: "Feliz cumpleaños, {{patientName}}. Un abrazo de {{clinicName}}.",
  offerDetails: "",
  discountPercent: null,
  validUntil: null,
  contactEmail: "",
} as const;

describe("marketing message templates", () => {
  it("accepts a personalised birthday greeting and rejects untargeted promotions", () => {
    expect(saveMarketingMessageTemplateSchema.safeParse(base).success).toBe(true);
    expect(queueMarketingMessageTemplateSchema.safeParse({ kind: "BIRTHDAY" }).success)
      .toBe(true);
    expect(queueMarketingMessageTemplateSchema.safeParse({ kind: "OFFER" }).success)
      .toBe(false);
    expect(queueMarketingMessageTemplateSchema.safeParse({ kind: "DISCOUNT" }).success)
      .toBe(false);
  });

  it("requires conditions, expiry and a positive discount on enabled promotions", () => {
    const offer = { ...base, kind: "OFFER", enabled: true };
    const discount = { ...base, kind: "DISCOUNT", enabled: true };
    expect(saveMarketingMessageTemplateSchema.safeParse(offer).success).toBe(false);
    expect(saveMarketingMessageTemplateSchema.safeParse(discount).success).toBe(false);
    expect(saveMarketingMessageTemplateSchema.safeParse({
      ...discount, offerDetails: "Aplicable solo a limpiezas",
      validUntil: "2026-12-31", discountPercent: 20,
    }).success).toBe(true);
  });

  it("requires a contact email to facilitate unsubscribing from email promotions", () => {
    expect(saveMarketingMessageTemplateSchema.safeParse({
      ...base, channel: "EMAIL",
    }).success).toBe(false);
    expect(saveMarketingMessageTemplateSchema.safeParse({
      ...base, channel: "EMAIL", contactEmail: "privacidad@clinicadental.es",
    }).success).toBe(true);
  });

  it("checks marketing consent in database and prevents duplicate birthday campaigns", () => {
    expect(sql).toContain("cc.purpose='MARKETING'");
    expect(sql).toContain("coalesce(v_consent,'REVOKED')<>'GRANTED'");
    expect(sql).toContain("public.queue_communication(");
    expect(sql).toContain("v_patient.id::text");
    expect(sql).toContain("to_char(v_now,'YYYY')");
    expect(sql).toContain("public.communication_outbox");
    expect(sql).toContain("private.stage11_has_permission(p_clinic_id,'communications.manage')");
  });

  it("does not enable marketing by default", () => {
    expect(sql).toMatch(/enabled boolean not null default false/);
    expect(sql).toContain("'BIRTHDAY','WHATSAPP',false");
    expect(sql).toContain("'OFFER','WHATSAPP',false");
    expect(sql).toContain("'DISCOUNT','WHATSAPP',false");
  });
});
