import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../client";
import { createPatientSchema } from "../contracts";
import { createDentyApi } from "../endpoints";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("createDentyApi", () => {
  it("allows creating a patient without DNI because identity no longer depends on the clinical document", () => {
    expect(
      createPatientSchema.safeParse({
        firstName: "Juan",
        lastName: "Perez",
        birthDate: "1994-09-23",
      }).success,
    ).toBe(true);
  });

  it("keeps verified legacy routes grouped by domain", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse({ items: [] })));
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.prescriptions.list("patient 1");
    await api.engagement.notifications.preferences();

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/api/prescriptions?patientId=patient+1",
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/api/notifications/preferences",
    );
  });

  it("uses distinct verified contracts for login and session", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ user: { id: "u1", displayName: "Ana", role: "ASSISTANT" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          actor: {
            userId: "u1",
            clinicId: "c1",
            role: "ASSISTANT",
            permissions: ["patients.read"],
            sessionId: "s1",
          },
          permissions: ["patients.read"],
        }),
      );
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await expect(
      api.auth.login({ identifier: "ana", password: "password" }),
    ).resolves.toMatchObject({ user: { role: "ASSISTANT" } });
    await expect(api.auth.session()).resolves.toMatchObject({
      actor: { clinicId: "c1", role: "ASSISTANT" },
    });
  });

  it("uses DELETE for clinical dependency removal", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.clinical.plan.removeDependency("plan-1", {
      itemId: "item-1",
      dependsOnId: "item-0",
      reason: "secuencia clínica",
    });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain("/api/clinical-plans/plan-1/dependencies?");
    expect(init?.method).toBe("DELETE");
  });

  it("uses an explicit endpoint for treatment plan item reordering", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "plan-1",
        patientId: "patient-1",
        status: "DRAFT",
        items: [],
        route: [],
        budgets: [],
      }),
    );
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.clinical.plan.reorder("patient/1", ["item-b", "item-a"]);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/api/patients/patient%2F1/clinical-plan/reorder");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ orderedIds: ["item-b", "item-a"] });
  });

  it("supports editing and deleting managed users", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "u1",
          displayName: "Ana",
          email: "ana@clinic.test",
          role: "ADMIN",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, deletedAuthUser: true, role: "ADMIN" }));
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.admin.users.update("u/1", {
      displayName: "Ana Admin",
      email: "admin@clinic.test",
    });
    await api.admin.users.delete("u/1");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/api/users/u%2F1");
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://api.example.test/api/users/u%2F1");
    expect(fetchImpl.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("downloads documents through the shared binary client", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: { "content-type": "application/pdf" },
      }),
    );
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    const pdf = await api.documents.download("doc/1");
    const [, init] = fetchImpl.mock.calls[0] ?? [];

    expect(pdf.type).toBe("application/pdf");
    expect(new Headers(init?.headers).get("accept")).toBe("application/pdf");
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("/api/documents/doc%2F1/file");
  });

  it("uses the verified odontogram mutation contracts", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          entities: [
            {
              id: "caries-16-d",
              tooth: "16",
              entityType: "CARIES",
              status: "caries_pending",
              surfacesJson: ["D"],
              active: true,
              version: 1,
            },
          ],
          version: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "perio-1",
          tooth: "16",
          site: "MV",
          probingDepth: 4,
          bleeding: true,
          measuredAt: "2026-09-21T14:00:00+02:00",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "snap-1",
          label: "Control",
          payloadJson: { version: 2 },
          createdAt: "2026-09-21T14:00:00+02:00",
        }),
      );
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.clinical.odontogram.batch("p1", {
      expectedVersion: 1,
      entities: [
        {
          id: "caries-16-d",
          tooth: "16",
          entityType: "CARIES",
          status: "caries_pending",
          surfaces: ["D"],
          active: true,
        },
      ],
    });
    await api.clinical.odontogram.periodontal("p1", {
      tooth: "16",
      site: "MV",
      probingDepth: 4,
      bleeding: true,
    });
    await api.clinical.odontogram.snapshots.create("p1", { label: "Control" });

    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({
      expectedVersion: 1,
      entities: [{ entityType: "CARIES" }],
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))).toEqual({
      tooth: "16",
      site: "MV",
      probingDepth: 4,
      bleeding: true,
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body))).toEqual({
      label: "Control",
    });
  });

  it("normalizes raw snapshot payloads returned by create", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "snap-raw",
        label: "Control",
        payloadJson: {
          version: 7,
          entities: [
            {
              id: "crown-11",
              tooth: "11",
              entityType: "CROWN",
              status: "crown_completed",
              active: true,
              version: 2,
            },
          ],
          periodontal: [],
        },
        createdAt: "2026-09-21T14:00:00+02:00",
      }),
    );
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    const snapshot = await api.clinical.odontogram.snapshots.create("p1", {
      label: "Control",
    });

    expect(snapshot.version).toBe(7);
    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0]?.id).toBe("crown-11");
  });

  it("exposes archive and restore as explicit patient lifecycle commands", async () => {
    const patient = {
      id: "p1",
      clinicId: "c1",
      recordNumber: "000042",
      firstName: "Ana",
      lastName: "Ruiz",
      dni: null,
      birthDate: "1994-09-23",
      archivedAt: "2026-09-28T08:00:00+02:00",
      version: 3,
      createdAt: "2026-01-01T10:00:00+01:00",
      updatedAt: "2026-09-28T08:00:00+02:00",
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(patient));
    const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));

    await api.patients.archive("p1", { expectedVersion: 2, reason: "Duplicada" });
    await api.patients.restore("p1", { expectedVersion: 3 });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/api/patients/p1/archive");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://api.example.test/api/patients/p1/restore");
  });
});
