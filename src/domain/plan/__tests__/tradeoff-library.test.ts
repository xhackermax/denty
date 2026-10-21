import { describe, expect, test } from "vitest";

import {
  applyArgumentOverrides,
  customPhraseId,
  libraryPhrases,
  phraseOverride,
  reorderOverrides,
  type ArgumentOverride,
} from "../tradeoff-library";
import { tradeoffEntry } from "../treatment-tradeoffs";

const crown = tradeoffEntry("b.corona-completa")!;
const override = (patch: Partial<ArgumentOverride> & { phraseId: string }): ArgumentOverride => ({
  entryId: "b.corona-completa",
  kind: "advantage",
  text: null,
  hidden: false,
  position: null,
  custom: false,
  ...patch,
});

describe("applyArgumentOverrides", () => {
  test("sin cambios de la clínica devuelve la plantilla tal cual", () => {
    expect(applyArgumentOverrides(crown, [])).toEqual(crown);
  });

  test("edita el texto, oculta frases y añade las propias de la clínica", () => {
    const [first, second] = crown.advantages;
    const result = applyArgumentOverrides(crown, [
      override({ phraseId: first!.id, text: "Protege el diente que queda." }),
      override({ phraseId: second!.id, hidden: true }),
      override({
        phraseId: "b.corona-completa.C-1",
        text: "Hecha en nuestro laboratorio.",
        custom: true,
      }),
      override({ phraseId: "b.otra.A1", entryId: "b.otra", text: "No es de esta corona." }),
    ]);
    expect(result.advantages.map((phrase) => phrase.text)).toEqual([
      "Protege el diente que queda.",
      ...crown.advantages.slice(2).map((phrase) => phrase.text),
      "Hecha en nuestro laboratorio.",
    ]);
    expect(result.disadvantages).toEqual(crown.disadvantages);
  });

  test("respeta el orden elegido y deja al final las frases sin posición", () => {
    const ids = crown.disadvantages.map((phrase) => phrase.id);
    const result = applyArgumentOverrides(crown, [
      override({ phraseId: ids[1]!, kind: "disadvantage", position: 0 }),
      override({ phraseId: ids[0]!, kind: "disadvantage", position: 1 }),
    ]);
    expect(result.disadvantages.map((phrase) => phrase.id).slice(0, 2)).toEqual([ids[1], ids[0]]);
  });

  test("ignora frases propias sin texto", () => {
    const result = applyArgumentOverrides(crown, [
      override({ phraseId: "b.corona-completa.C-1", custom: true }),
    ]);
    expect(result.advantages).toHaveLength(crown.advantages.length);
  });
});

describe("libraryPhrases", () => {
  test("lista también las ocultas y marca qué cambió la clínica", () => {
    const [first] = crown.advantages;
    const phrases = libraryPhrases(crown, [
      override({ phraseId: first!.id, text: "Otro texto.", hidden: true }),
    ]);
    expect(phrases[0]).toEqual({
      id: first!.id,
      kind: "advantage",
      text: "Otro texto.",
      templateText: first!.text,
      hidden: true,
      custom: false,
      changed: true,
    });
    expect(phrases.filter((phrase) => phrase.changed)).toHaveLength(1);
    expect(phrases).toHaveLength(crown.advantages.length + crown.disadvantages.length);
  });
});

describe("reorderOverrides", () => {
  test("mueve una frase y fija la posición de toda su lista, sin tocar el resto", () => {
    const phrases = libraryPhrases(crown, []);
    const [first, second] = crown.advantages;
    const result = reorderOverrides(crown, phrases, [], second!.id, -1);
    expect(result.map((item) => [item.phraseId, item.position])).toEqual(
      crown.advantages
        .map((phrase) => phrase.id)
        .map((id, index) => [index === 0 ? second!.id : index === 1 ? first!.id : id, index]),
    );
    expect(result.every((item) => item.kind === "advantage")).toBe(true);
  });

  test("conserva el texto editado de las frases que reordena", () => {
    const [first, second] = crown.advantages;
    const overrides = [override({ phraseId: first!.id, text: "Editada." })];
    const result = reorderOverrides(
      crown,
      libraryPhrases(crown, overrides),
      overrides,
      first!.id,
      1,
    );
    expect(result.find((item) => item.phraseId === first!.id)).toMatchObject({
      text: "Editada.",
      position: 1,
    });
    expect(result.find((item) => item.phraseId === second!.id)).toMatchObject({ position: 0 });
  });

  test("en los extremos no hace nada", () => {
    const phrases = libraryPhrases(crown, []);
    expect(reorderOverrides(crown, phrases, [], crown.advantages[0]!.id, -1)).toEqual([]);
    expect(reorderOverrides(crown, phrases, [], "no-existe", 1)).toEqual([]);
  });
});

describe("customPhraseId", () => {
  test("crea un id válido para la base de datos y distinto de los existentes", () => {
    const id = customPhraseId("b.corona-completa", ["b.corona-completa.C1"]);
    expect(id).toMatch(/^b\.corona-completa\.C[A-Za-z0-9-]*$/);
    expect(id).toBe("b.corona-completa.C2");
  });
});

describe("phraseOverride", () => {
  const [first] = crown.advantages;
  const phrases = (overrides: ArgumentOverride[]) => libraryPhrases(crown, overrides);

  test("guarda el texto nuevo y conserva la posición elegida antes", () => {
    const overrides = [override({ phraseId: first!.id, position: 3 })];
    expect(
      phraseOverride(
        crown.id,
        phrases(overrides).find((item) => item.id === first!.id)!,
        overrides,
        {
          text: " Otra frase. ",
        },
      ),
    ).toEqual(override({ phraseId: first!.id, text: "Otra frase.", position: 3 }));
  });

  test("volver al texto de la plantilla guarda null", () => {
    const overrides = [override({ phraseId: first!.id, text: "Cambiada." })];
    const phrase = phrases(overrides).find((item) => item.id === first!.id)!;
    expect(phraseOverride(crown.id, phrase, overrides, { text: first!.text }).text).toBeNull();
  });

  test("ocultar mantiene el texto editado y las frases propias siguen siendo propias", () => {
    const overrides = [
      override({ phraseId: first!.id, text: "Cambiada." }),
      override({ phraseId: "b.corona-completa.C1", text: "Propia.", custom: true }),
    ];
    const list = phrases(overrides);
    expect(
      phraseOverride(
        crown.id,
        list.find((item) => item.id === first!.id)!,
        overrides,
        {
          hidden: true,
        },
      ),
    ).toMatchObject({ text: "Cambiada.", hidden: true });
    expect(
      phraseOverride(
        crown.id,
        list.find((item) => item.custom)!,
        overrides,
        { hidden: true },
      ),
    ).toMatchObject({ text: "Propia.", custom: true, hidden: true });
  });
});
