import { describe, expect, it } from "vitest";

import { planLocalVoiceCommand, type LocalVoiceAction } from "../local-nlu";

const CTX = { patientId: "p1", patientName: "Paciente Test" };

function actions(phrase: string): LocalVoiceAction[] {
  return planLocalVoiceCommand(phrase, CTX).actions;
}

function expectAction(phrase: string, partial: Record<string, unknown>) {
  expect(actions(phrase), phrase).toContainEqual(expect.objectContaining(partial));
}

function expectNoAction(phrase: string, type: string) {
  expect(
    actions(phrase).map((a) => a.type),
    phrase,
  ).not.toContain(type);
}

describe("navigation phrasing", () => {
  it.each([
    ["llévame a finanzas", "finance"],
    ["muéstrame el laboratorio", "laboratory"],
    ["enséñame el odontograma", "odontogram"],
    ["llévame al odontograma", "odontogram"],
    ["oye denty vamos a la agenda", "agenda"],
    ["quiero ver la agenda de hoy", "agenda"],
    ["abre la agenda de mañana", "agenda"],
    ["abre agenda", "agenda"],
    ["ve al inicio", "home"],
    ["ir a cobros", "finance"],
    ["ver tareas pendientes", "tasks"],
  ])("%s -> %s", (phrase, destination) => {
    expectAction(phrase, { type: "navigation.open", destination });
  });

  it.each([
    "abre la agenda de mañana",
    "quiero ver la agenda de hoy",
    "llévame a finanzas",
    "abre el odontograma",
  ])("navigation never invents an appointment or patient: %s", (phrase) => {
    expectNoAction(phrase, "appointment.schedule");
    const resolves = actions(phrase).filter((a) => a.type === "patient.resolve");
    expect(resolves).toEqual([{ type: "patient.resolve", query: "Paciente Test" }]);
  });
});

describe("opening a patient", () => {
  it.each([
    ["busca a Pedro Sánchez", "Pedro Sánchez"],
    ["ve a la ficha de Ana López", "Ana López"],
    ["muéstrame a Carlos Ruiz", "Carlos Ruiz"],
    ["llévame a la ficha de María García", "María García"],
    ["abre la ficha de María García", "María García"],
  ])("%s", (phrase, name) => {
    expectAction(phrase, { type: "patient.resolve", query: name });
    expectAction(phrase, { type: "navigation.patient", patientRef: name });
  });

  it("opens a patient by file number", () => {
    expectAction("abre la ficha número 1234", { type: "patient.resolve", query: "1234" });
    expectAction("abre el paciente 452", { type: "patient.resolve", query: "452" });
    expectAction("abre la ficha 452", { type: "navigation.patient", patientRef: "452" });
  });

  it("does not open a patient for plain section words", () => {
    expectNoAction("ve a pacientes", "navigation.patient");
    expectNoAction("muéstrame el odontograma", "navigation.patient");
  });
});

describe("arrivals and no-shows name the patient", () => {
  it.each([
    ["ha llegado Marta", "appointment.arrive", "Marta"],
    ["Marta ha llegado", "appointment.arrive", "Marta"],
    ["ya está aquí Luis Gil", "appointment.arrive", "Luis Gil"],
    ["acaba de llegar Luis Gil", "appointment.arrive", "Luis Gil"],
    ["no vino Pedro", "appointment.no_show", "Pedro"],
    ["Pedro Ruiz no ha venido", "appointment.no_show", "Pedro Ruiz"],
    ["ha faltado Juan", "appointment.no_show", "Juan"],
    ["Juan no se ha presentado", "appointment.no_show", "Juan"],
  ])("%s", (phrase, type, name) => {
    expectAction(phrase, { type, patientRef: name });
  });

  it("does not treat a missing tooth as a no-show", () => {
    expectNoAction("el diente 36 está ausente", "appointment.no_show");
    expectNoAction("la muela 46 ausente", "appointment.no_show");
    expectAction("el diente 36 está ausente", { type: "odontogram.set_state", status: "MISSING" });
  });

  it("does not turn 'ha llegado el trabajo del laboratorio' into a patient", () => {
    expectNoAction("ha llegado el trabajo del laboratorio", "appointment.arrive");
    expectAction("ha llegado el trabajo del laboratorio", { type: "lab.transition" });
  });
});

describe("odontogram states", () => {
  it.each([
    ["pieza 26 sana", "26", "HEALTHY"],
    ["el 14 está sano", "14", "HEALTHY"],
    ["la 15 sana", "15", "HEALTHY"],
  ])("%s", (phrase, tooth, status) => {
    expectAction(phrase, { type: "odontogram.set_state", tooth, status });
  });

  it("applies a state to several teeth in one sentence", () => {
    const check = (phrase: string, status: string, teeth: string[]) => {
      const found = actions(phrase)
        .filter((a) => a.type === "odontogram.set_state" && a.status === status)
        .map((a) => ("tooth" in a ? a.tooth : ""));
      expect(found, phrase).toEqual(teeth);
    };
    check("caries en 14 y 15", "CARIES", ["14", "15"]);
    check("caries en el 14, el 15 y el 16", "CARIES", ["14", "15", "16"]);
    check("el 14 y el 15 sanos", "HEALTHY", ["14", "15"]);
    check("ausentes 18 y 28", "MISSING", ["18", "28"]);
    check("faltan el 18 y el 28", "MISSING", ["18", "28"]);
  });

  it("keeps surfaces for each tooth of a list", () => {
    expectAction("caries oclusal en 14 y 15", { tooth: "15", status: "CARIES", surfaces: ["O"] });
  });

  it("splits mixed findings and treatments into separate clauses", () => {
    const a = actions("caries en 14 y 15, endodoncia en 26");
    expect(a).toContainEqual(expect.objectContaining({ tooth: "14", status: "CARIES" }));
    expect(a).toContainEqual(expect.objectContaining({ tooth: "15", status: "CARIES" }));
    expect(a).toContainEqual(
      expect.objectContaining({
        type: "clinical.add_item",
        tooth: "26",
        treatmentCode: "endodontics",
      }),
    );
    expect(
      a.filter((x) => "tooth" in x && x.tooth === "14" && x.type === "clinical.add_item"),
    ).toEqual([]);
  });

  it("splits 'y' before a new finding", () => {
    const a = actions("caries en 14 y endodoncia en 26");
    expect(a).toContainEqual(expect.objectContaining({ tooth: "14", status: "CARIES" }));
    expect(a).toContainEqual(expect.objectContaining({ type: "clinical.add_item", tooth: "26" }));
    expect(a.some((x) => x.type === "clinical.add_item" && x.tooth === "14")).toBe(false);
  });

  it("keeps two treatments on the same tooth", () => {
    expectAction("endodoncia en 26 y corona en 26", { treatmentCode: "crown", tooth: "26" });
    expectAction("endodoncia en 26 y corona en 26", { treatmentCode: "endodontics", tooth: "26" });
  });

  it("keeps self-correction working across commas", () => {
    expectAction("caries en 26 distal, no perdón, mesial", {
      tooth: "26",
      status: "CARIES",
      surfaces: ["M"],
    });
  });
});

describe("treatments on several teeth and their state", () => {
  it("adds the same treatment to every tooth listed", () => {
    const teeth = actions("extracción del 18 y del 28")
      .filter((a) => a.type === "clinical.add_item")
      .map((a) => ("tooth" in a ? a.tooth : ""));
    expect(teeth).toEqual(["18", "28"]);
    const implants = actions("implante en el 36 y 37")
      .filter((a) => a.type === "clinical.add_item")
      .map((a) => ("tooth" in a ? a.tooth : ""));
    expect(implants).toEqual(["36", "37"]);
  });

  it.each([
    ["el empaste del 15 está mal hecho", "clinical.mark_unsatisfactory"],
    ["la corona del 21 está mal colocada", "clinical.mark_unsatisfactory"],
    ["la obturación del 25 está filtrada", "clinical.mark_unsatisfactory"],
    ["la corona del 14 ya está puesta", "clinical.complete_item"],
    ["corona cementada en el 11", "clinical.complete_item"],
    ["empaste hecho en 24 mod", "clinical.complete_item"],
    ["hay que hacer una corona en el 14", "clinical.add_item"],
  ])("%s -> %s", (phrase, type) => {
    expectAction(phrase, { type });
    const others = [
      "clinical.add_item",
      "clinical.complete_item",
      "clinical.mark_unsatisfactory",
    ].filter((t) => t !== type);
    for (const other of others) expectNoAction(phrase, other);
  });

  it("maps tartrectomía to prophylaxis", () => {
    expectAction("tartrectomía", { treatmentCode: "prophylaxis" });
  });
});

describe("periodontics", () => {
  it.each([
    ["sangrado en el 16", { tooth: "16", bleeding: true }],
    ["el 26 sangra", { tooth: "26", bleeding: true }],
    ["movilidad grado 2 en el 31", { tooth: "31", mobility: "2" }],
    ["recesión de 3 en el 13", { tooth: "13", recession: 3 }],
    ["placa en el 11", { tooth: "11", plaque: true }],
    ["supuración en el 36", { tooth: "36", suppuration: true }],
  ])("%s", (phrase, partial) => {
    expectAction(phrase, { type: "periodontal.update", ...partial });
  });
});

describe("allergies and notes", () => {
  it.each([
    ["alergia al látex", "Alergia a látex"],
    ["es alérgico a la penicilina", "Alergia a penicilina"],
    ["el paciente es alérgico a la amoxicilina", "Alergia a amoxicilina"],
    ["alergia a la penicilina", "Alergia a penicilina"],
  ])("%s", (phrase, text) => {
    expectAction(phrase, { type: "clinical.alert", text });
  });
});

describe("appointments", () => {
  it("names the patient without swallowing the date", () => {
    expectAction("agenda cita para Laura Gómez mañana a las cinco", {
      type: "appointment.schedule",
      patientRef: "Laura Gómez",
      dateText: "manana",
    });
    expectAction("cita de revisión el viernes a las 12:30", {
      type: "appointment.schedule",
      dateText: "viernes",
      timeText: "12:30",
      patientRef: "Paciente Test",
    });
  });

  it.each([
    ["pon cita el lunes a las 10 y media", "10:30"],
    ["pon cita el lunes a las diez y media", "10:30"],
    ["pon cita el lunes a las once y cuarto", "11:15"],
    ["pon cita el lunes a las cinco", "17:00"],
    ["pon cita mañana a las cinco de la tarde", "17:00"],
    ["pon cita mañana a las nueve de la mañana", "09:00"],
    ["pon cita mañana a las 5 y media", "17:30"],
    ["pon cita mañana a las 12:30", "12:30"],
    ["pon cita mañana a las diez", "10:00"],
    ["pon cita mañana a las dos", "14:00"],
  ])("%s -> %s", (phrase, timeText) => {
    expectAction(phrase, { type: "appointment.schedule", timeText });
  });

  it("reschedules with spoken hours", () => {
    expectAction("mueve la cita a las cuatro", {
      type: "appointment.reschedule",
      timeText: "16:00",
    });
    expectAction("mueve la cita de Pablo Díaz al jueves a las 11", {
      type: "appointment.reschedule",
      patientRef: "Pablo Díaz",
      timeText: "11:00",
    });
  });
});

describe("payments", () => {
  it.each([
    ["cobra ochenta euros", 8000],
    ["me ha pagado cien euros por transferencia", 10_000],
    ["ha pagado ciento veinte euros con tarjeta", 12_000],
    ["cobrar cincuenta euros en efectivo", 5000],
    ["cobro de 60 euros", 6000],
  ])("%s", (phrase, amountCents) => {
    expectAction(phrase, { type: "payment.record", amountCents });
  });

  it("never turns an amount into a tooth", () => {
    expectNoAction("ha pagado 14 euros con tarjeta", "odontogram.set_state");
    expect(actions("cobrar 26 euros en efectivo").some((a) => "tooth" in a)).toBe(false);
  });
});

describe("false positives", () => {
  it("does not make a tooth of the time or the file number", () => {
    const a = actions("pon cita el lunes a las 14:30");
    expect(a.some((x) => "tooth" in x)).toBe(false);
    expect(actions("abre la ficha 1234").some((x) => "tooth" in x)).toBe(false);
  });

  it("does not invent a patient from a destination or a date word", () => {
    for (const phrase of ["ve a la agenda", "abre la agenda de mañana", "ver pacientes"]) {
      expect(
        actions(phrase).filter((a) => a.type === "patient.resolve"),
        phrase,
      ).toEqual([{ type: "patient.resolve", query: "Paciente Test" }]);
    }
  });
});

describe("more spoken patterns", () => {
  it("names the payer before or after the amount", () => {
    expectAction("Marta López ha pagado cuarenta euros en efectivo", {
      type: "payment.record",
      patientRef: "Marta López",
      amountCents: 4000,
    });
    expectAction("cobra 50 euros a Marta López", {
      type: "payment.record",
      patientRef: "Marta López",
    });
  });

  it("opens a section of a named patient", () => {
    expectAction("abre el odontograma de Laura Gómez", {
      type: "patient.resolve",
      query: "Laura Gómez",
    });
    expectAction("abre el odontograma de Laura Gómez", {
      type: "navigation.open",
      destination: "odontogram",
    });
  });

  it("moves an appointment with a pronoun verb without swallowing the verb in the name", () => {
    expectAction("la cita de Pedro pásala al viernes a las seis", {
      type: "appointment.reschedule",
      patientRef: "Pedro",
      timeText: "18:00",
    });
  });

  it("reads extracted teeth as completed extractions", () => {
    expectAction("muela del juicio 38 extraída", {
      type: "clinical.complete_item",
      treatmentCode: "extraction",
      tooth: "38",
    });
    expectAction("hay que extraer el 48", {
      type: "clinical.add_item",
      treatmentCode: "extraction",
    });
  });

  it("reads teeth written as words with 'y' (treinta y seis) inside a list", () => {
    const states = actions("el treinta y seis tiene caries y el treinta y siete está ausente");
    expect(states).toContainEqual(expect.objectContaining({ tooth: "36", status: "CARIES" }));
    expect(states).toContainEqual(expect.objectContaining({ tooth: "37", status: "MISSING" }));
    expect(states.map((a) => a.type)).not.toContain("appointment.no_show");
  });

  it("a second treatment without tooth reuses the tooth just named", () => {
    expectAction("pon una corona en el dieciséis y una endodoncia", {
      treatmentCode: "endodontics",
      tooth: "16",
    });
  });

  it("keeps the crown dependency when the treatments are split into clauses", () => {
    expectAction("perno en 26 y corona en 26", {
      type: "clinical.add_dependency",
      beforeCode: "post",
      afterCode: "crown",
      tooth: "26",
    });
  });

  it("fills the missing teeth of a bridge said in digits", () => {
    expectAction("puente del 34 al 36 con 35 ausente", {
      type: "odontogram.bridge",
      missingTeeth: ["35"],
    });
  });

  it("opens the agenda when asked with 'ponme'", () => {
    expectAction("ponme la agenda de hoy", { type: "navigation.open", destination: "agenda" });
    expectNoAction("ponme la agenda de hoy", "appointment.schedule");
  });
});
