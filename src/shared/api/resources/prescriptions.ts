import { z } from "zod";

import type { ApiClient } from "../client";
import { prescriptionSchema } from "../contracts";
import {
  cancelPrescriptionSchema,
  createPrescriptionSchema,
  prescriptionClinicSettingsInputSchema,
  prescriptionHistorySchema,
  prescriptionPrescriberInputSchema,
  prescriptionsSchema,
  signPrescriptionSchema,
  prescriptionSettingsSchema,
  updatePrescriptionSchema,
} from "../schemas/prescriptions";
import { encodeId, withQuery } from "./shared";

const settingsRecordSchema = z.object({ id: z.string().min(1) }).passthrough();

export function createPrescriptionsResource(client: ApiClient) {
  return {
    settings: {
      get: () => client.request("/api/prescription-settings", prescriptionSettingsSchema),
      updateClinic: (payload: z.input<typeof prescriptionClinicSettingsInputSchema>) =>
        client.mutation(
          "/api/prescription-settings/clinic",
          settingsRecordSchema,
          prescriptionClinicSettingsInputSchema.parse(payload),
          { method: "PUT" },
        ),
      updatePrescriber: (
        staffId: string,
        payload: z.input<typeof prescriptionPrescriberInputSchema>,
      ) =>
        client.mutation(
          `/api/prescription-settings/prescribers/${encodeId(staffId)}`,
          settingsRecordSchema,
          prescriptionPrescriberInputSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    list: (patientId?: string) =>
      client.request(withQuery("/api/prescriptions", { patientId }), prescriptionsSchema),
    get: (id: string) =>
      client.request(`/api/prescriptions/${encodeId(id)}`, prescriptionSchema.passthrough()),
    create: (payload: z.input<typeof createPrescriptionSchema>) =>
      client.mutation(
        "/api/prescriptions",
        prescriptionSchema.passthrough(),
        createPrescriptionSchema.parse(payload),
      ),
    update: (id: string, payload: z.input<typeof updatePrescriptionSchema>) =>
      client.mutation(
        `/api/prescriptions/${encodeId(id)}`,
        prescriptionSchema.passthrough(),
        updatePrescriptionSchema.parse(payload),
        { method: "PATCH" },
      ),
    history: (id: string) =>
      client.request(`/api/prescriptions/${encodeId(id)}/history`, prescriptionHistorySchema),
    pdf: (id: string) =>
      client.requestBlob(`/api/prescriptions/${encodeId(id)}/pdf`, {
        headers: { accept: "application/pdf" },
      }),
    validate: (id: string) =>
      client.mutation(
        `/api/prescriptions/${encodeId(id)}/validate`,
        prescriptionSchema.passthrough(),
        {},
      ),
    sign: (id: string, payload: z.input<typeof signPrescriptionSchema>) => {
      const parsed = signPrescriptionSchema.parse(payload);
      const [header = "", encoded = ""] = parsed.signatureDataUrl.split(",", 2);
      const mimeType = header.includes("image/jpeg") ? "image/jpeg" : "image/png";
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
      const form = new FormData();
      form.set(
        "file",
        new File([bytes], mimeType === "image/jpeg" ? "firma.jpg" : "firma.png", {
          type: mimeType,
        }),
      );
      form.set("signerName", parsed.signerName);
      if (parsed.evidence) form.set("evidence", JSON.stringify(parsed.evidence));
      return client.upload(
        `/api/prescriptions/${encodeId(id)}/sign`,
        prescriptionSchema.passthrough(),
        form,
      );
    },
    issue: (id: string) =>
      client.mutation(
        `/api/prescriptions/${encodeId(id)}/issue`,
        prescriptionSchema.passthrough(),
        {},
      ),
    cancel: (id: string, reason: string) =>
      client.mutation(
        `/api/prescriptions/${encodeId(id)}/cancel`,
        prescriptionSchema.passthrough(),
        cancelPrescriptionSchema.parse({ reason }),
      ),
  } as const;
}
