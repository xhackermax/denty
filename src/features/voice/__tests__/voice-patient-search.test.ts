import { describe, expect, it, vi } from "vitest";

import { searchVoicePatients } from "../voice-patient-search";

const ana = { id: "1", firstName: "Ana", lastName: "López" };
const anabel = { id: "2", firstName: "Anabel", lastName: "Ruiz" };
const luis = { id: "3", firstName: "Luis", lastName: "López", recordNumber: "120" };

describe("searchVoicePatients", () => {
  it("searches each spoken word because the server matches one field at a time", async () => {
    const list = vi.fn(async (term: string) =>
      [ana, anabel, luis].filter((patient) =>
        [patient.firstName, patient.lastName].some((value) => value.toLowerCase().includes(term)),
      ),
    );
    const found = await searchVoicePatients("Ana López", list);
    expect(list.mock.calls.map(([term]) => term).sort()).toEqual(["ana", "lópez"]);
    expect(found.map((patient) => patient.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("searches record numbers as they are", async () => {
    const list = vi.fn(async () => [luis]);
    await searchVoicePatients("120", list);
    expect(list).toHaveBeenCalledWith("120");
  });

  it("skips filler words and caps the number of requests", async () => {
    const list = vi.fn(async (_term: string) => [] as (typeof ana)[]);
    await searchVoicePatients("la de María José García del Río", list);
    expect(list.mock.calls.length).toBeLessThanOrEqual(3);
    expect(list.mock.calls.map(([term]) => term)).not.toContain("la");
    expect(list.mock.calls.map(([term]) => term)).not.toContain("de");
  });

  it("returns nothing for an empty query", async () => {
    const list = vi.fn(async () => [ana]);
    expect(await searchVoicePatients("  ", list)).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });
});
