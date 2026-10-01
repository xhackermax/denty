import { describe, expect, it } from "vitest";

import {
  pickPatientOverride,
  resolveVoicePatient,
  type VoicePatientCandidate,
} from "../voice-patient-resolver";

const PATIENTS: readonly VoicePatientCandidate[] = [
  { id: "patient-1", firstName: "María", lastName: "García", recordNumber: "000104" },
  { id: "patient-2", firstName: "Álvaro", lastName: "Ruiz", recordNumber: "000205" },
];

describe("voice patient resolver", () => {
  it("resolves an exact patient name ignoring accents", () => {
    const matches = resolveVoicePatient("maria garcia", PATIENTS);
    expect(matches[0]?.id).toBe("patient-1");
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.99);
  });

  it("resolves a record number", () => {
    const matches = resolveVoicePatient("000104", PATIENTS);
    expect(matches[0]?.id).toBe("patient-1");
  });
});

describe("voice patient resolver: real dictation", () => {
  const MORE: readonly VoicePatientCandidate[] = [
    { id: "p-ana", firstName: "Ana", lastName: "García López", recordNumber: "000104" },
    { id: "p-mariana", firstName: "Mariana", lastName: "Soto", recordNumber: "000210" },
    { id: "p-jose", firstName: "José Luis", lastName: "De la Fuente", recordNumber: "000033" },
  ];

  it("resolves inverted order with a comma", () => {
    expect(resolveVoicePatient("García López, Ana", MORE)[0]?.id).toBe("p-ana");
  });

  it("resolves a compound surname said partially", () => {
    expect(resolveVoicePatient("ana garcia lopez", MORE)[0]?.id).toBe("p-ana");
  });

  it("does not match a name fragment inside another word", () => {
    const ids = resolveVoicePatient("ana", MORE).map((match) => match.id);
    expect(ids).toContain("p-ana");
    expect(ids).not.toContain("p-mariana");
  });

  it("resolves a record number dropping leading zeros", () => {
    expect(resolveVoicePatient("104", MORE)[0]?.id).toBe("p-ana");
    expect(resolveVoicePatient("ficha 104", MORE)[0]?.id).toBe("p-ana");
  });

  it("resolves a record number said digit by digit in words", () => {
    expect(resolveVoicePatient("cero cero cero uno cero cuatro", MORE)[0]?.id).toBe("p-ana");
    expect(resolveVoicePatient("uno cero cuatro", MORE)[0]?.id).toBe("p-ana");
  });

  it("resolves a record number said as a cardinal", () => {
    expect(resolveVoicePatient("ciento cuatro", MORE)[0]?.id).toBe("p-ana");
    expect(resolveVoicePatient("treinta y tres", MORE)[0]?.id).toBe("p-jose");
  });

  it("does not match a short number inside a longer record", () => {
    expect(resolveVoicePatient("10", MORE)).toEqual([]);
  });

  it("returns ties in a stable alphabetical order", () => {
    const twins: VoicePatientCandidate[] = [
      { id: "b", firstName: "Luis", lastName: "Pérez" },
      { id: "a", firstName: "Carlos", lastName: "Pérez" },
    ];
    const matches = resolveVoicePatient("perez", twins);
    expect(matches.map((match) => match.id)).toEqual(["a", "b"]);
    expect(matches[0]?.score).toBe(matches[1]?.score);
  });

  it("ignores empty and filler queries", () => {
    expect(resolveVoicePatient("   ", MORE)).toEqual([]);
    expect(resolveVoicePatient("del paciente", MORE)).toEqual([]);
  });
});

describe("pickPatientOverride", () => {
  const LIST: readonly VoicePatientCandidate[] = [
    { id: "a", firstName: "Ana", lastName: "García López" },
    { id: "b", firstName: "Luis", lastName: "García Pérez" },
    { id: "c", firstName: "Marta", lastName: "Ruiz" },
  ];

  it("returns another patient when the spoken name clearly identifies them", () => {
    expect(pickPatientOverride("Marta Ruiz", "a", LIST)?.id).toBe("c");
  });

  it("keeps the open patient when the name matches them", () => {
    expect(pickPatientOverride("Ana García", "a", LIST)).toBeUndefined();
  });

  it("does not switch patient on a weak single-word match", () => {
    expect(pickPatientOverride("ruiz", "a", LIST)).toBeUndefined();
  });

  it("does not switch patient when the name is ambiguous", () => {
    expect(pickPatientOverride("garcia", "c", LIST)).toBeUndefined();
  });
});
