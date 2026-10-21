import { mentions, normalized } from "./treatment-phase.ts";

export interface TradeoffClassifiable {
  treatmentCode: string;
  label: string;
}

export interface TreatmentTradeoffs {
  advantages: string[];
  disadvantages: string[];
}

interface TradeoffRule {
  words: readonly string[];
  advantages: readonly string[];
  disadvantages: readonly string[];
}

// Generic chairside talking points, shown only when the dentist wrote none for the branch.
// First match wins: implant comes before crown so "corona sobre implante" reads as implant work.
const RULES: readonly TradeoffRule[] = [
  {
    words: ["puente", "bridge"],
    advantages: ["Fijo y sin cirugía", "Se completa en pocas semanas"],
    disadvantages: [
      "Hay que tallar los dientes vecinos",
      "El hueso bajo el hueco sigue reabsorbiéndose",
      "Más difícil de limpiar",
    ],
  },
  {
    words: ["removible", "removable", "dentadura", "denture", "esqueletico"],
    advantages: ["Opción más económica", "Sin cirugía y reversible"],
    disadvantages: [
      "Menos estable y cómoda que una opción fija",
      "Se retira para limpiar y requiere adaptación",
    ],
  },
  {
    words: ["injerto", "graft", "seno", "sinus", "regeneracion"],
    advantages: ["Permite colocar implantes donde falta hueso"],
    disadvantages: ["Cirugía adicional y más tiempo de tratamiento"],
  },
  {
    words: ["implant"],
    advantages: [
      "Reposición fija que no desgasta los dientes vecinos",
      "Conserva el hueso de la zona",
      "Muy duradero con buena higiene",
    ],
    disadvantages: ["Requiere cirugía y unos meses de integración", "Coste más alto"],
  },
  {
    words: ["endodon", "conducto", "pulpect"],
    advantages: ["Conserva el diente natural", "Elimina el dolor y la infección"],
    disadvantages: [
      "Suele necesitar una corona después",
      "El pronóstico depende del diente que queda",
    ],
  },
  {
    words: ["corona", "crown", "incrustacion", "onlay", "inlay"],
    advantages: ["Protege un diente debilitado", "Recupera forma y estética"],
    disadvantages: ["Hay que tallar el diente"],
  },
  {
    words: ["extrac", "exodon"],
    advantages: ["Elimina el foco de infección de inmediato", "Procedimiento corto y económico"],
    disadvantages: [
      "Se pierde el diente y conviene reponerlo",
      "Los dientes vecinos pueden desplazarse",
    ],
  },
  {
    words: ["obtura", "filling", "empaste", "reconstru", "restaura"],
    advantages: ["Rápido y conservador"],
    disadvantages: ["Menos resistente que una corona en dientes muy destruidos"],
  },
  {
    words: ["carilla", "veneer"],
    advantages: ["Mejora la estética con poco tallado"],
    disadvantages: ["Puede despegarse o fracturarse"],
  },
  {
    words: ["ortodon", "orthodon", "alineador", "aligner", "bracket"],
    advantages: ["Corrige la posición de los dientes y la mordida"],
    disadvantages: ["Tratamiento largo, de varios meses"],
  },
  {
    words: ["periodon", "raspado", "curetaje", "alisado", "gingiv"],
    advantages: ["Frena la pérdida de encía y hueso"],
    disadvantages: ["Necesita mantenimientos periódicos"],
  },
];

function ruleFor(item: TradeoffClassifiable): TradeoffRule | undefined {
  const text = `${normalized(item.treatmentCode)} ${normalized(item.label)}`;
  return RULES.find((rule) => rule.words.some((word) => mentions(text, word)));
}

export function suggestedTradeoffs(items: readonly TradeoffClassifiable[]): TreatmentTradeoffs {
  const advantages = new Set<string>();
  const disadvantages = new Set<string>();
  for (const item of items) {
    const rule = ruleFor(item);
    rule?.advantages.forEach((line) => advantages.add(line));
    rule?.disadvantages.forEach((line) => disadvantages.add(line));
  }
  return { advantages: [...advantages], disadvantages: [...disadvantages] };
}
