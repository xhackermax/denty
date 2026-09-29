import { describe, expect, it, vi } from "vitest";

import type { SupabaseAuthClient } from "../../supabase/auth-client";
import type { SupabaseRestClient } from "../../supabase/rest-client";
import { AuthRepository } from "../auth-repository";

const CLINIC = "11111111-1111-1111-1111-111111111111";
const PATIENT = "22222222-2222-2222-2222-222222222222";
const PROFILE = "33333333-3333-3333-3333-333333333333";

function fakeDb(tables: Record<string, Array<Record<string, unknown>>>) {
  const inserts: Array<{ table: string; body: Record<string, unknown> }> = [];
  const select = vi.fn(
    async (table: string, query: Record<string, string | number | undefined>) => {
      const rows = tables[table] ?? [];
      return rows.filter((row) =>
        Object.entries(query).every(([key, filter]) => {
          if (["select", "limit", "order"].includes(key) || typeof filter !== "string") return true;
          if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
          if (filter === "is.null") return row[key] == null;
          if (filter.startsWith("in.(")) {
            const values = filter
              .slice(4, -1)
              .split(",")
              .map((value) => value.replace(/^"|"$/g, ""));
            return values.includes(String(row[key]));
          }
          return true;
        }),
      );
    },
  );
  const client = {
    select,
    insert: vi.fn(async (table: string, body: Record<string, unknown>) => {
      inserts.push({ table, body });
      return { id: "new-row", ...body };
    }),
    patchMany: vi.fn(async () => []),
  } as unknown as SupabaseRestClient;
  return { client, inserts };
}

function fakeAuth() {
  return {
    adminCreateUser: vi.fn(async (input: { email: string }) => ({
      id: PROFILE,
      email: input.email,
    })),
    adminDeleteUser: vi.fn(async () => undefined),
    adminUpdateUser: vi.fn(async () => ({ id: PROFILE })),
  } as unknown as SupabaseAuthClient & {
    adminCreateUser: ReturnType<typeof vi.fn>;
    adminUpdateUser: ReturnType<typeof vi.fn>;
  };
}

const patientRow = {
  id: PATIENT,
  clinic_id: CLINIC,
  record_number: "DNT-000123",
  first_name: "Lucía",
  last_name: "Pérez Soto",
  dni: "12.345.678-z",
  email: null,
  archived_at: null,
};

describe("patient portal accounts", () => {
  it("creates the account with the DNI as password and an internal email when the record has none", async () => {
    const { client, inserts } = fakeDb({
      patients: [patientRow],
      patient_accounts: [],
      profiles: [],
    });
    const auth = fakeAuth();
    const repo = new AuthRepository(client, { adminClient: client, authClient: auth });

    const created = await repo.createUser({
      clinicId: CLINIC,
      role: "PATIENT",
      patientId: PATIENT,
    });

    const call = auth.adminCreateUser.mock.calls[0]?.[0] as { email: string; password: string };
    expect(call.password).toBe("12345678Z");
    expect(call.email).toMatch(/^paciente-dnt-000123-22222222@denty\.local$/);
    expect(created).toMatchObject({ recordNumber: "DNT-000123", passwordFromDni: true });
    expect(inserts.some((row) => row.table === "patient_accounts")).toBe(true);
  });

  it("resolves a record number to the portal account email, case-insensitively", async () => {
    const { client } = fakeDb({
      patients: [patientRow],
      patient_accounts: [
        { id: "pa", clinic_id: CLINIC, patient_id: PATIENT, profile_id: PROFILE, active: true },
      ],
      profiles: [
        { id: PROFILE, first_name: "Lucía", last_name: "", email: "l@x.es", active: true },
      ],
    });
    const repo = new AuthRepository(client, { adminClient: client, authClient: fakeAuth() });

    await expect(repo.patientLoginEmails("dnt-000123")).resolves.toEqual(["l@x.es"]);
    await expect(repo.patientLoginEmails("DNT-999999")).resolves.toEqual([]);
    await expect(repo.patientLoginEmails('x",y')).resolves.toEqual([]);
  });

  it("refuses to reset the password of a user from another clinic", async () => {
    const { client } = fakeDb({ clinic_members: [], patient_accounts: [] });
    const auth = fakeAuth();
    const repo = new AuthRepository(client, { adminClient: client, authClient: auth });

    await expect(
      repo.resetUserPassword(CLINIC, PROFILE, { password: "nueva-clave-segura" }),
    ).rejects.toThrow(/no pertenece/);
    expect(auth.adminUpdateUser).not.toHaveBeenCalled();
  });

  it("resets a patient account back to its DNI", async () => {
    const { client } = fakeDb({
      clinic_members: [],
      patients: [patientRow],
      patient_accounts: [
        { id: "pa", clinic_id: CLINIC, patient_id: PATIENT, profile_id: PROFILE, active: true },
      ],
    });
    const auth = fakeAuth();
    const repo = new AuthRepository(client, { adminClient: client, authClient: auth });

    await expect(repo.resetUserPassword(CLINIC, PROFILE, { useDni: true })).resolves.toEqual({
      ok: true,
      usedDni: true,
    });
    expect(auth.adminUpdateUser).toHaveBeenCalledWith(PROFILE, { password: "12345678Z" });
  });
});
