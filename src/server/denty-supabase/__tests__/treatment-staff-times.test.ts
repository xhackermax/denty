import { describe, expect, it, vi } from "vitest";

import { saveTreatmentStaffTimeSchema } from "@/shared/api/schemas/admin";
import type { SupabaseRestClient } from "../../supabase/rest-client";
import { ClinicalRepository } from "../clinical-repository";

const row = {
  id: "time-1",
  treatment_catalog_id: "implant",
  staff_member_id: "dr-ruiz",
  duration_min: 90,
  appointments_min: 4,
  appointments_max: null,
  version: 2,
  staff_members: { display_name: "Dra. Ruiz" },
};

function repository(existing: unknown[] = []) {
  const client = {
    select: vi.fn(async () => existing),
    insert: vi.fn(async (_table: string, body: Record<string, unknown>) => ({
      ...row,
      ...body,
      version: 1,
    })),
    patch: vi.fn(async () => ({ ...row, version: 3 })),
    delete: vi.fn(async () => undefined),
  };
  return {
    client,
    repo: new ClinicalRepository(client as unknown as SupabaseRestClient, "clinic"),
  };
}

const times = { durationMin: 90, appointmentsMin: 4, appointmentsMax: null };

describe("per-doctor treatment times", () => {
  it("lists the clinic's overrides with the doctor's name", async () => {
    const { client, repo } = repository([row]);
    await expect(repo.listTreatmentStaffTimes()).resolves.toEqual({
      items: [
        {
          id: "time-1",
          treatmentCatalogId: "implant",
          staffMemberId: "dr-ruiz",
          staffName: "Dra. Ruiz",
          durationMin: 90,
          appointmentsMin: 4,
          appointmentsMax: null,
          version: 2,
        },
      ],
    });
    expect(client.select).toHaveBeenCalledWith(
      "treatment_catalog_staff_times",
      expect.objectContaining({ clinic_id: "eq.clinic" }),
    );
  });

  it("creates the override the first time a doctor's times are saved", async () => {
    const { client, repo } = repository([]);
    await repo.saveTreatmentStaffTime("implant", "dr-ruiz", times);
    expect(client.patch).not.toHaveBeenCalled();
    expect(client.insert).toHaveBeenCalledWith("treatment_catalog_staff_times", {
      clinic_id: "clinic",
      treatment_catalog_id: "implant",
      staff_member_id: "dr-ruiz",
      duration_min: 90,
      appointments_min: 4,
      appointments_max: null,
    });
  });

  it("updates the existing override and bumps its version", async () => {
    const { client, repo } = repository([row]);
    await expect(repo.saveTreatmentStaffTime("implant", "dr-ruiz", times)).resolves.toMatchObject({
      version: 3,
    });
    expect(client.insert).not.toHaveBeenCalled();
    expect(client.patch).toHaveBeenCalledWith(
      "treatment_catalog_staff_times",
      expect.objectContaining({
        clinic_id: "eq.clinic",
        treatment_catalog_id: "eq.implant",
        staff_member_id: "eq.dr-ruiz",
      }),
      expect.objectContaining({ duration_min: 90, version: 3 }),
    );
  });

  it("removes only that clinic's override for the doctor", async () => {
    const { client, repo } = repository();
    await expect(repo.deleteTreatmentStaffTime("implant", "dr-ruiz")).resolves.toEqual({
      deleted: true,
    });
    expect(client.delete).toHaveBeenCalledWith("treatment_catalog_staff_times", {
      clinic_id: "eq.clinic",
      treatment_catalog_id: "eq.implant",
      staff_member_id: "eq.dr-ruiz",
    });
  });

  it("stores the catalog's usual number of visits", async () => {
    const { client, repo } = repository();
    await repo.createTreatmentCatalogItem({
      code: "implant",
      name: "Implante",
      appointmentsMin: 3,
      appointmentsMax: 5,
    });
    expect(client.insert).toHaveBeenCalledWith(
      "treatment_catalog",
      expect.objectContaining({ code: "IMPLANT", appointments_min: 3, appointments_max: 5 }),
    );
  });
});

describe("saveTreatmentStaffTimeSchema", () => {
  it("accepts empty fields, which fall back to the catalog", () => {
    expect(
      saveTreatmentStaffTimeSchema.safeParse({
        durationMin: null,
        appointmentsMin: null,
        appointmentsMax: null,
      }).success,
    ).toBe(true);
  });

  it("rejects a maximum below the minimum and non-positive values", () => {
    expect(
      saveTreatmentStaffTimeSchema.safeParse({
        durationMin: 30,
        appointmentsMin: 4,
        appointmentsMax: 2,
      }).success,
    ).toBe(false);
    expect(
      saveTreatmentStaffTimeSchema.safeParse({
        durationMin: 0,
        appointmentsMin: null,
        appointmentsMax: null,
      }).success,
    ).toBe(false);
  });
});
