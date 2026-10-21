import { describe, expect, test } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import {
  handleClinicalArgumentsRoute,
  isClinicalArgumentsRoute,
} from "../clinical-arguments-route";

type Call = { method: string; path: string; query: URLSearchParams; body: unknown };

function fakeClient(respond: (call: Call) => unknown = () => []) {
  const calls: Call[] = [];
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      const call = {
        method: init?.method ?? "GET",
        path: url.pathname.replace("/rest/v1/", ""),
        query: url.searchParams,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      calls.push(call);
      return Response.json(respond(call));
    },
  );
  return { client, calls };
}

const identity = (permissions: string[], client: SupabaseRestClient) => ({
  actor: { clinicId: "clinic", permissions },
  restClient: client,
});

const LIBRARY = ["api", "admin", "clinical-arguments"];
const COMPARISONS = ["api", "patients", "p1", "treatment-comparisons"];
const request = (method: string, body?: unknown, path = "/api/x") =>
  new Request(`https://denty.example${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const phrase = {
  phraseId: "b.corona-completa.A1",
  entryId: "b.corona-completa",
  kind: "advantage",
  text: "Protege el diente.",
  hidden: false,
  position: null,
  custom: false,
};

const content = {
  options: [
    {
      id: "b1",
      label: "Opción 1",
      title: "Endodoncia",
      code: "P-1",
      totalCents: 1000,
      treatments: [],
      advantages: ["Conserva el diente."],
      disadvantages: [],
    },
    {
      id: "b2",
      label: "Opción 2",
      title: "Implante",
      code: "P-2",
      totalCents: 2000,
      treatments: [],
      advantages: [],
      disadvantages: [],
    },
  ],
  common: [],
  consequences: [],
};
const comparisonInput = {
  seriesId: null,
  decision: "ACCEPTED",
  chosenOptionId: "b1",
  decisionNote: "",
  catalogVersion: "1.0",
  professionalName: "Dra. Ruiz",
  content,
};
const comparisonRow = {
  id: "c1",
  patient_id: "p1",
  series_id: "s1",
  version: 1,
  decision: "ACCEPTED",
  chosen_option_id: "b1",
  decision_note: "",
  catalog_version: "1.0",
  professional_name: "Dra. Ruiz",
  content,
  created_by: "u1",
  created_at: "2026-10-21T10:00:00Z",
};

test("reconoce solo sus rutas", () => {
  expect(isClinicalArgumentsRoute(LIBRARY)).toBe(true);
  expect(isClinicalArgumentsRoute([...LIBRARY, "restore"])).toBe(true);
  expect(isClinicalArgumentsRoute(COMPARISONS)).toBe(true);
  expect(isClinicalArgumentsRoute(["api", "admin", "treatment-catalog"])).toBe(false);
  expect(isClinicalArgumentsRoute(["api", "patients", "p1", "diagnoses"])).toBe(false);
});

describe("biblioteca de frases", () => {
  test("sin sesión responde 401 sin consultar la base de datos", async () => {
    const response = await handleClinicalArgumentsRoute(request("GET"), LIBRARY, null);
    expect(response.status).toBe(401);
  });

  test("el personal clínico lee las frases de su clínica", async () => {
    const { client, calls } = fakeClient(() => [
      {
        phrase_id: "b.corona-completa.A1",
        entry_id: "b.corona-completa",
        kind: "advantage",
        text: null,
        hidden: true,
        position: 2,
        custom: false,
      },
    ]);
    const response = await handleClinicalArgumentsRoute(
      request("GET"),
      LIBRARY,
      identity(["clinical.read"], client),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ ...phrase, text: null, hidden: true, position: 2 }],
    });
    expect(calls[0]?.query.get("clinic_id")).toBe("eq.clinic");
  });

  test("recepción no lee ni cambia la biblioteca clínica", async () => {
    const { client, calls } = fakeClient();
    for (const req of [request("GET"), request("PUT", { items: [phrase] })]) {
      const response = await handleClinicalArgumentsRoute(
        req,
        LIBRARY,
        identity(["patients.read"], client),
      );
      expect(response.status).toBe(403);
    }
    expect(calls).toHaveLength(0);
  });

  test("el odontólogo lee pero no cambia frases: eso es del gestor del catálogo", async () => {
    const { client, calls } = fakeClient();
    const response = await handleClinicalArgumentsRoute(
      request("PUT", { items: [phrase] }),
      LIBRARY,
      identity(["clinical.read", "clinical.write"], client),
    );
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("guarda cambios en una sola llamada transaccional", async () => {
    const { client, calls } = fakeClient(() => 1);
    const response = await handleClinicalArgumentsRoute(
      request("PUT", { items: [phrase] }),
      LIBRARY,
      identity(["catalog.manage"], client),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    expect(calls).toEqual([
      expect.objectContaining({
        path: "rpc/save_argument_overrides",
        body: { p_clinic_id: "clinic", p_overrides: [phrase] },
      }),
    ]);
  });

  test("valida antes de escribir: frase de otro tratamiento o propia sin texto", async () => {
    const { client, calls } = fakeClient();
    const manager = identity(["catalog.manage"], client);
    for (const bad of [
      { ...phrase, entryId: "b.implante-unitario" },
      { ...phrase, phraseId: "b.corona-completa.C1", text: null, custom: true },
      { ...phrase, phraseId: "corona" },
    ]) {
      await expect(
        handleClinicalArgumentsRoute(request("PUT", { items: [bad] }), LIBRARY, manager),
      ).rejects.toThrow();
    }
    expect(calls).toHaveLength(0);
  });

  test("restaura la plantilla de las frases indicadas", async () => {
    const { client, calls } = fakeClient(() => 2);
    const response = await handleClinicalArgumentsRoute(
      request("POST", { phraseIds: ["b.corona-completa.A1", "b.corona-completa.C1"] }),
      [...LIBRARY, "restore"],
      identity(["catalog.manage"], client),
    );
    expect(await response.json()).toEqual({ count: 2 });
    expect(calls[0]?.body).toEqual({
      p_clinic_id: "clinic",
      p_phrase_ids: ["b.corona-completa.A1", "b.corona-completa.C1"],
    });
  });

  test("el historial muestra el texto guardado y, al restaurar, el que se quitó", async () => {
    const { client, calls } = fakeClient(() => [
      {
        id: "h2",
        phrase_id: "b.corona-completa.A1",
        entry_id: "b.corona-completa",
        action: "RESTORE",
        before: { text: "Antes.", hidden: true },
        after: null,
        changed_by: "u1",
        changed_at: "2026-10-21T10:00:00Z",
      },
    ]);
    const response = await handleClinicalArgumentsRoute(
      request("GET", undefined, "/api/admin/clinical-arguments/history?entryId=b.corona-completa"),
      [...LIBRARY, "history"],
      identity(["clinical.read"], client),
    );
    expect((await response.json()).items[0]).toMatchObject({
      action: "RESTORE",
      text: "Antes.",
      hidden: true,
    });
    expect(calls[0]?.query.get("entry_id")).toBe("eq.b.corona-completa");
  });

  test("rutas desconocidas responden 404", async () => {
    const { client } = fakeClient();
    const response = await handleClinicalArgumentsRoute(
      request("DELETE"),
      LIBRARY,
      identity(["catalog.manage"], client),
    );
    expect(response.status).toBe(404);
  });
});

describe("comparaciones del paciente", () => {
  test("guardar exige permiso clínico de escritura", async () => {
    const { client, calls } = fakeClient();
    const response = await handleClinicalArgumentsRoute(
      request("POST", comparisonInput),
      COMPARISONS,
      identity(["clinical.read"], client),
    );
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("leer exige permiso clínico", async () => {
    const { client } = fakeClient();
    const response = await handleClinicalArgumentsRoute(
      request("GET"),
      COMPARISONS,
      identity(["finance.read"], client),
    );
    expect(response.status).toBe(403);
  });

  test("rechaza una decisión que no casa con la opción elegida antes de escribir", async () => {
    const { client, calls } = fakeClient();
    const dentist = identity(["clinical.read", "clinical.write"], client);
    for (const bad of [
      { ...comparisonInput, chosenOptionId: "otra" },
      { ...comparisonInput, decision: "POSTPONED" },
      { ...comparisonInput, content: { ...content, options: [content.options[0]] } },
    ]) {
      await expect(
        handleClinicalArgumentsRoute(request("POST", bad), COMPARISONS, dentist),
      ).rejects.toThrow();
    }
    expect(calls).toHaveLength(0);
  });

  test("comprueba que el paciente es de la clínica antes de guardar", async () => {
    const { client, calls } = fakeClient(() => []);
    await expect(
      handleClinicalArgumentsRoute(
        request("POST", comparisonInput),
        COMPARISONS,
        identity(["clinical.write"], client),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.query.get("clinic_id")).toBe("eq.clinic");
  });

  test("guarda la versión y lista el historial del paciente", async () => {
    const { client, calls } = fakeClient((call) =>
      call.path === "patients"
        ? [{ id: "p1" }]
        : call.path.startsWith("rpc/")
          ? comparisonRow
          : [comparisonRow],
    );
    const dentist = identity(["clinical.read", "clinical.write"], client);
    const saved = await handleClinicalArgumentsRoute(
      request("POST", comparisonInput),
      COMPARISONS,
      dentist,
    );
    expect(saved.status).toBe(201);
    expect(await saved.json()).toMatchObject({ seriesId: "s1", version: 1, chosenOptionId: "b1" });
    const rpc = calls.find((call) => call.path === "rpc/save_treatment_comparison");
    expect(rpc?.body).toMatchObject({ p_patient_id: "p1", p_series_id: null });
    expect(rpc?.body).not.toHaveProperty("p_input.seriesId");
    const list = await handleClinicalArgumentsRoute(request("GET"), COMPARISONS, dentist);
    expect((await list.json()).items).toHaveLength(1);
  });
});
