import { describe, expect, it } from "vitest";

import { planLocalVoiceCommand } from "../local-nlu";

describe("local voice NLU parity", () => {
  it("expands a bridge across the midline by FDI arch order", () => {
    const plan = planLocalVoiceCommand("Oye Denty, puente 13 a 23 con 22 ausente", {
      patientName: "Juan Pérez",
    });
    const bridge = plan.actions.find((action) => action.type === "odontogram.bridge");
    expect(bridge?.type).toBe("odontogram.bridge");
    if (bridge?.type === "odontogram.bridge") {
      expect(bridge.teeth).toEqual(["13", "12", "11", "21", "22", "23"]);
    }
  });

  it("reads MOD restoration surfaces", () => {
    const plan = planLocalVoiceCommand("hay que hacer empaste MOD en 26", {
      patientName: "Juan Pérez",
    });
    const item = plan.actions.find((action) => action.type === "clinical.add_item");
    expect(item?.type).toBe("clinical.add_item");
    if (item?.type === "clinical.add_item") expect(item.surfaces).toEqual(["M", "O", "D"]);
  });

  it("distinguishes completed endodontics from planned treatment", () => {
    const completed = planLocalVoiceCommand("endodoncia realizada en 22", {
      patientName: "Juan Pérez",
    });
    expect(completed.actions.some((action) => action.type === "clinical.complete_item")).toBe(true);

    const planned = planLocalVoiceCommand("hay que hacer endodoncia 22", {
      patientName: "Juan Pérez",
    });
    expect(planned.actions.some((action) => action.type === "clinical.add_item")).toBe(true);
  });

  it("requires confirmation for payments", () => {
    const plan = planLocalVoiceCommand("Juan Pérez ha pagado 120 euros con tarjeta", {
      patientName: "Juan Pérez",
    });
    const payment = plan.actions.find((action) => action.type === "payment.record");
    expect(payment?.type).toBe("payment.record");
    if (payment?.type === "payment.record") {
      expect(payment.amountCents).toBe(12_000);
      expect(payment.method).toBe("CARD");
    }
    expect(plan.requiresConfirmation).toBe(true);
  });

  it("captures periodontal measurements", () => {
    const plan = planLocalVoiceCommand("26 mesiovestibular sondaje 6 sangrado", {
      patientName: "Juan Pérez",
    });
    const perio = plan.actions.find((action) => action.type === "periodontal.update");
    expect(perio?.type).toBe("periodontal.update");
    if (perio?.type === "periodontal.update") {
      expect(perio.tooth).toBe("26");
      expect(perio.site).toBe("MV");
      expect(perio.probingDepth).toBe(6);
      expect(perio.bleeding).toBe(true);
    }
  });
  it("understands open the patient with Spanish article", () => {
    const plan = planLocalVoiceCommand("Oye Denty abre el paciente Juan Pérez");
    expect(plan.actions).toContainEqual({ type: "patient.resolve", query: "Juan Pérez" });
    expect(plan.actions).toContainEqual({ type: "navigation.patient", patientRef: "Juan Pérez" });
  });
});
