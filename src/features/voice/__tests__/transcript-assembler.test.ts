import { describe, expect, it } from "vitest";

import { createTranscriptAssembler } from "../transcript-assembler";

describe("createTranscriptAssembler", () => {
  it("keeps the text typed before recording started", () => {
    const assembler = createTranscriptAssembler("Marca caries");
    assembler.commitFinal("en el 16");
    expect(assembler.text()).toBe("Marca caries en el 16");
  });

  it("replaces partial results instead of concatenating them", () => {
    const assembler = createTranscriptAssembler("");
    assembler.setInterim("marca");
    assembler.setInterim("marca caries");
    assembler.setInterim("marca caries en el");
    expect(assembler.text()).toBe("marca caries en el");
  });

  it("drops the partial once its final segment arrives", () => {
    const assembler = createTranscriptAssembler("");
    assembler.setInterim("marca caries en");
    assembler.commitFinal("marca caries en el 16");
    expect(assembler.text()).toBe("marca caries en el 16");
    expect(assembler.finalText()).toBe("marca caries en el 16");
  });

  it("appends consecutive final segments once each", () => {
    const assembler = createTranscriptAssembler("");
    assembler.commitFinal("marca caries");
    assembler.setInterim("en el");
    assembler.commitFinal("en el 16");
    expect(assembler.text()).toBe("marca caries en el 16");
  });

  it("ignores empty finals and blank partials", () => {
    const assembler = createTranscriptAssembler("abre");
    assembler.commitFinal("   ");
    assembler.setInterim("");
    expect(assembler.text()).toBe("abre");
  });

  it("rebuilds from a full recognition session without duplicating earlier results", () => {
    const assembler = createTranscriptAssembler("Paciente:");
    assembler.replaceSession(["marca caries"], "en el");
    assembler.replaceSession(["marca caries", "en el 16"], "");
    expect(assembler.text()).toBe("Paciente: marca caries en el 16");
  });

  it("collapses cumulative Android results into the latest one", () => {
    const assembler = createTranscriptAssembler("");
    assembler.replaceSession(["da", "da una", "da una caries en", "da una caries en distal"], "");
    expect(assembler.text()).toBe("da una caries en distal");
  });

  it("keeps distinct consecutive segments that merely share words", () => {
    const assembler = createTranscriptAssembler("");
    assembler.replaceSession(["caries en el 17", "caries en el 46"], "");
    expect(assembler.text()).toBe("caries en el 17 caries en el 46");
  });

  it("finalText excludes the pending partial", () => {
    const assembler = createTranscriptAssembler("");
    assembler.commitFinal("abre la agenda");
    assembler.setInterim("y");
    expect(assembler.finalText()).toBe("abre la agenda");
  });
});
