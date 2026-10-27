import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../client";
import { createDentyApi } from "../endpoints";

const ID = "11111111-1111-4111-8111-111111111111";
const template = {
  id: ID,
  code: "HIGIENE",
  name: "Higiene",
  category: "GENERAL",
  description: null,
  intervalValue: 6,
  intervalUnit: "MESES",
  anchorType: "FECHA_MANUAL",
  leadDays: 14,
  maxAttempts: 3,
  autoRecurrence: true,
  autoEnroll: false,
  messagingEnabled: false,
  channels: [],
  reminderOffsets: [],
  messageTemplateKey: null,
  defaultSiteId: null,
  defaultStaffId: null,
  active: true,
  archivedAt: null,
  version: 1,
  createdAt: "2026-10-27T08:00:00.000Z",
  updatedAt: "2026-10-27T08:00:00.000Z",
  openCount: 0,
  overdueCount: 0,
};
const input = Object.fromEntries(
  Object.entries(template).filter(
    ([key]) =>
      ![
        "id",
        "archivedAt",
        "version",
        "createdAt",
        "updatedAt",
        "openCount",
        "overdueCount",
      ].includes(key),
  ),
);
const recall = {
  id: ID,
  patientId: ID,
  patientName: "Ana Ruiz",
  recordNumber: "7",
  kind: "RECALL_HIGIENE",
  templateId: ID,
  templateName: "Higiene",
  dueAt: "2026-11-01T08:00:00.000Z",
  status: "contacted",
  state: "CONTACTADO",
  closeReason: null,
  pausedUntil: null,
  siteId: null,
  siteName: null,
  staffId: null,
  staffName: null,
  contactedAt: "2026-10-27T08:00:00.000Z",
  contactAttempts: 1,
  maxAttempts: 3,
  bookedAppointmentId: null,
  bookedAppointmentAt: null,
  lastVisitAt: null,
  nextAppointment: null,
  version: 2,
  createdAt: "2026-10-01T08:00:00.000Z",
};

function makeApi(body: unknown) {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockImplementation(() => Promise.resolve(Response.json(body)));
  const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));
  const call = (index = 0) => {
    const [url, init] = fetchImpl.mock.calls[index] ?? [];
    return {
      url: String(url),
      method: init?.method ?? "GET",
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    };
  };
  return { api, call };
}

describe("recalls resource", () => {
  it("envía solo los filtros con valor y omite includeClosed cuando es falso", async () => {
    const { api, call } = makeApi({
      total: 0,
      kpis: { pending: 0, upcoming: 0, overdue: 0, contacted: 0, booked: 0, completed: 0 },
      items: [],
    });
    await api.recalls.list({ state: "VENCIDO", search: "", includeClosed: false });
    expect(call().url).toBe(
      "https://api.example.test/api/recalls?page=1&pageSize=25&state=VENCIDO",
    );
  });

  it("aplica una acción con la versión esperada y valida la respuesta", async () => {
    const { api, call } = makeApi(recall);
    const result = await api.recalls.act(ID, { action: "CONTACT", expectedVersion: 1 });
    expect(result.state).toBe("CONTACTADO");
    expect(call()).toMatchObject({
      url: `https://api.example.test/api/recalls/${ID}/actions`,
      method: "POST",
      body: { action: "CONTACT", payload: {}, expectedVersion: 1 },
    });
  });

  it("rechaza en el navegador un lote vacío sin llamar al servidor", () => {
    const { api } = makeApi({});
    expect(() => api.recalls.bulk({ ids: [], action: "CANCEL" })).toThrow();
  });

  it("crea, edita y archiva tipos por sus rutas", async () => {
    const { api, call } = makeApi(template);
    await api.recalls.createTemplate(input as never);
    await api.recalls.updateTemplate(ID, { template: input as never, expectedVersion: 1 });
    await api.recalls.archiveTemplate(ID, { archive: true });
    expect(call(0)).toMatchObject({
      url: "https://api.example.test/api/recalls/templates",
      method: "POST",
    });
    expect(call(1)).toMatchObject({
      url: `https://api.example.test/api/recalls/templates/${ID}`,
      method: "PUT",
      body: { expectedVersion: 1, recomputePending: false },
    });
    expect(call(2)).toMatchObject({
      url: `https://api.example.test/api/recalls/templates/${ID}/archive`,
      body: { archive: true, reason: null },
    });
  });

  it("lista tipos, historial, candidatos y asigna pacientes", async () => {
    const templates = makeApi({ items: [template] });
    await templates.api.recalls.templates(true);
    expect(templates.call().url).toBe(
      "https://api.example.test/api/recalls/templates?includeArchived=true",
    );

    const history = makeApi({ items: [] });
    await history.api.recalls.history(ID);
    expect(history.call().url).toBe(`https://api.example.test/api/recalls/${ID}/history`);

    const candidates = makeApi({ total: 0, items: [] });
    await candidates.api.recalls.candidates({ minAge: 18 });
    expect(candidates.call()).toMatchObject({ method: "POST", body: { minAge: 18 } });

    const assign = makeApi({ added: 1, dryRun: false, skipped: [] });
    await assign.api.recalls.assign(ID, { patientIds: [ID] });
    expect(assign.call()).toMatchObject({
      url: `https://api.example.test/api/recalls/templates/${ID}/assign`,
      body: { patientIds: [ID], dueOverrides: {}, anchorDate: null, dryRun: false },
    });
  });
});
