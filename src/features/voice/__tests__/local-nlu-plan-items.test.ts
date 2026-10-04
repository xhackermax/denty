import { describe, expect, it } from "vitest";

import { planLocalVoiceCommand, type LocalVoiceAction } from "../local-nlu";

const CONTEXT = { patientId: "p1" };

function plan(text: string): LocalVoiceAction[] {
  return planLocalVoiceCommand(text, CONTEXT).actions.filter(
    (action) => action.type !== "patient.resolve",
  );
}

function planItems(text: string) {
  return plan(text).filter((action) => action.type === "clinical.plan_item");
}

describe("plan items for non-odontogram treatments", () => {
  it.each([
    ["hay que hacer carillas en el 11 y el 21", ["VENEER"], ["11", "21"], true],
    ["blanqueamiento", ["WHITENING"], [undefined], false],
    ["quiere un blanqueamiento dental", ["WHITENING"], [undefined], false],
    ["hay que hacer ortodoncia", ["ORTHODONTICS"], [undefined], true],
    ["alineadores invisibles", ["ALINEADOR_ORTODONCIA_INVISIBLE"], [undefined], false],
    ["sellador en el 36", ["SELLANTE"], ["36"], false],
    ["aplicar flúor", ["FLUORIDE"], [undefined], true],
    ["hacer una férula", ["SPLINT"], [undefined], false],
    ["férula de descarga", ["FERULA_RIGIDA_DESCARGA_ESSIX"], [undefined], false],
  ])("%s", (text, codes, teeth, adHoc) => {
    const items = planItems(text);

    expect(items.map((item) => item.treatmentCode)).toEqual(
      codes.flatMap((code) => teeth.map(() => code)),
    );
    expect(items.map((item) => item.tooth)).toEqual(teeth);
    expect(items.every((item) => item.adHoc === adHoc)).toBe(true);
  });

  it("does not plan a treatment that is described as already done or badly done", () => {
    expect(planItems("blanqueamiento realizado")).toEqual([]);
    expect(planItems("carilla mal puesta en el 11")).toEqual([]);
  });

  it("does not repeat a patient-level treatment for every tooth named", () => {
    expect(
      planItems("blanqueamiento y sellador en el 16 y 26").map((i) => i.treatmentCode),
    ).toEqual(["WHITENING", "SELLANTE", "SELLANTE"]);
  });
});

describe("crowns, bridges and what the patient already wears", () => {
  it("treats funda as a crown", () => {
    expect(plan("funda en el 14")).toMatchObject([
      { type: "clinical.add_item", treatmentCode: "crown", tooth: "14" },
    ]);
  });

  it.each(["el paciente lleva una funda en el 14", "lleva una corona en el 14"])(
    "%s records a crown already placed",
    (text) => {
      expect(plan(text)).toMatchObject([
        { type: "clinical.complete_item", treatmentCode: "crown", tooth: "14" },
      ]);
    },
  );

  it("records a bridge the patient already wears as completed", () => {
    const [bridge] = plan("lleva un puente del 14 al 16");

    expect(bridge).toMatchObject({ type: "odontogram.bridge", status: "COMPLETED" });
    expect([...(bridge as { teeth: string[] }).teeth].sort()).toEqual(["14", "15", "16"]);
  });

  it.each([
    [
      "Hay un puente desde el diente treinta y dos hasta el cuarenta y dos",
      ["31", "32", "41", "42"],
    ],
    ["hay un puente desde el 32 hasta el 42", ["31", "32", "41", "42"]],
    ["tiene un puente del diente 14 al diente 16", ["14", "15", "16"]],
    ["hay una prótesis fija entre el 24 y el 26", ["24", "25", "26"]],
  ])("understands the bridge span in “%s”", (text, teeth) => {
    const [bridge] = plan(text);

    expect(bridge).toMatchObject({ type: "odontogram.bridge", status: "COMPLETED" });
    expect([...(bridge as { teeth: string[] }).teeth].sort()).toEqual(teeth);
  });

  it("reads “desde la pieza … hasta la …” as a span to do", () => {
    const [bridge] = plan("puente desde la pieza 14 hasta la 16");

    expect(bridge).toMatchObject({ type: "odontogram.bridge", status: "PLANNED" });
    expect([...(bridge as { teeth: string[] }).teeth].sort()).toEqual(["14", "15", "16"]);
  });

  it("records a loose bridge as unsatisfactory", () => {
    expect(plan("hay un puente desajustado del 14 al 16")).toMatchObject([
      { type: "odontogram.bridge", status: "UNSATISFACTORY" },
    ]);
  });

  it("keeps a bridge to do as planned", () => {
    expect(plan("hay que hacer un puente del 14 al 16")).toMatchObject([
      { type: "odontogram.bridge", status: "PLANNED" },
    ]);
  });
});
