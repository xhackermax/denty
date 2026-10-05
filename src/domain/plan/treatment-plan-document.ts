/**
 * Treatment plan explained to the patient in plain Spanish.
 *
 * The content follows two references. The phases-of-care sequence: first health and pain, then
 * disease control and re-evaluation, then rebuilding, then maintenance. And the information that
 * Ley 41/2002 (arts. 4 and 10) asks for before a treatment: what it is for, what it involves, its
 * consequences and risks, and the alternatives. Texts use short sentences and everyday words
 * (health-literacy guidance aims at a 6th–8th grade reading level) so the dentist spends the visit
 * answering questions instead of repeating explanations. They inform; they do not replace the
 * signed consent for each procedure.
 */
import { mentions, normalized, treatmentPhase, type TreatmentPhase } from "./treatment-phase";

export type TreatmentFamily =
  | "extraction"
  | "root_canal"
  | "periodontal"
  | "filling"
  | "hygiene"
  | "splint"
  | "orthodontics"
  | "bone_graft"
  | "implant"
  | "whitening"
  | "post"
  | "crown"
  | "veneer"
  | "bridge"
  | "removable"
  | "other";

export interface TreatmentGuide {
  /** What the patient calls it. */
  name: string;
  what: string;
  why: string;
  benefits: string[];
  drawbacks: string[];
  alternatives: string;
  ifNotDone: string;
  visits: string;
}

export const TREATMENT_GUIDES: Record<TreatmentFamily, TreatmentGuide> = {
  extraction: {
    name: "Extracción",
    what: "Sacamos un diente que ya no se puede salvar. Antes dormimos la zona con anestesia, así que no duele.",
    why: "El diente está muy roto, infectado o se mueve mucho. Dejarlo puede causar dolor, infección o dañar los dientes de al lado.",
    benefits: ["Quita el dolor y el foco de infección.", "Protege el hueso y los dientes vecinos."],
    drawbacks: [
      "Queda un hueco que conviene reponer para que los demás dientes no se muevan.",
      "Los primeros días puede haber molestias, algo de hinchazón o un pequeño sangrado.",
    ],
    alternatives:
      "Si el diente tiene arreglo, intentamos salvarlo con una endodoncia o una reconstrucción.",
    ifNotDone: "La infección puede extenderse, el dolor puede volver y se puede perder más hueso.",
    visits: "Una visita corta y una revisión.",
  },
  root_canal: {
    name: "Endodoncia",
    what: "Limpiamos por dentro la raíz del diente, donde está el nervio, y la sellamos. Se hace con anestesia.",
    why: "El nervio está inflamado o infectado por una caries profunda o un golpe. Por eso duele o hay infección.",
    benefits: ["Salva tu propio diente en lugar de sacarlo.", "Quita el dolor y la infección."],
    drawbacks: [
      "El diente queda más frágil. Muchas veces necesita después un perno o una corona.",
      "Puede haber molestias unos días al masticar.",
    ],
    alternatives:
      "La alternativa es sacar el diente y reponerlo con un implante, un puente o una prótesis.",
    ifNotDone: "La infección puede crecer, formar un flemón y acabar con la pérdida del diente.",
    visits: "Una o dos visitas.",
  },
  periodontal: {
    name: "Tratamiento de encías",
    what: "Limpiamos a fondo por debajo de la encía, donde el cepillo no llega. Se hace por zonas y con anestesia.",
    why: "Tus encías tienen bolsas con sarro y bacterias. Esa infección destruye poco a poco el hueso que sujeta los dientes.",
    benefits: [
      "Frena la pérdida de hueso.",
      "Las encías dejan de sangrar y se reduce el mal aliento.",
      "Prepara la boca para que los demás tratamientos duren más.",
    ],
    drawbacks: [
      "Los dientes pueden notarse sensibles al frío unas semanas.",
      "Al bajar la inflamación, la encía puede retraerse un poco.",
    ],
    alternatives:
      "No hay otra forma de quitar el sarro de debajo de la encía. En casos avanzados se añade cirugía de encías.",
    ifNotDone: "Los dientes pueden empezar a moverse y acabar cayéndose, aunque no tengan caries.",
    visits: "Dos a cuatro visitas y revisiones periódicas.",
  },
  filling: {
    name: "Empaste",
    what: "Quitamos la caries y rellenamos el hueco con un material del color del diente.",
    why: "La caries es una zona del diente dañada por bacterias. Si no se quita, sigue avanzando hacia el nervio.",
    benefits: [
      "Frena la caries cuando todavía es pequeña.",
      "Es rápido y conserva casi todo el diente.",
    ],
    drawbacks: [
      "Puede haber algo de sensibilidad unos días.",
      "Con los años el empaste se desgasta y puede tener que cambiarse.",
    ],
    alternatives: "Si la caries es muy grande, puede hacer falta una incrustación o una corona.",
    ifNotDone: "La caries crece. Lo que hoy es un empaste puede acabar en endodoncia o extracción.",
    visits: "Una visita por diente o por zona.",
  },
  hygiene: {
    name: "Limpieza dental",
    what: "Quitamos el sarro y las manchas de los dientes y te enseñamos a cuidarlos en casa.",
    why: "El sarro acumula bacterias que inflaman las encías y favorecen la caries.",
    benefits: ["Encías más sanas y menos sangrado.", "Dientes más limpios y mejor aliento."],
    drawbacks: ["Puede notarse algo de sensibilidad un día o dos."],
    alternatives: "El cepillado no quita el sarro ya formado. Solo se retira en la consulta.",
    ifNotDone: "El sarro sigue creciendo y puede acabar en enfermedad de las encías.",
    visits: "Una visita. Se repite cada seis o doce meses.",
  },
  splint: {
    name: "Férula de descarga",
    what: "Es una funda de plástico a medida que te pones por la noche sobre los dientes.",
    why: "Aprietas o rechinas los dientes, muchas veces sin darte cuenta. Eso los desgasta y puede doler la mandíbula.",
    benefits: [
      "Protege los dientes y los empastes del desgaste.",
      "Relaja los músculos y alivia el dolor de mandíbula o de cabeza.",
    ],
    drawbacks: [
      "Al principio cuesta acostumbrarse a dormir con ella.",
      "Hay que limpiarla a diario y revisarla de vez en cuando.",
    ],
    alternatives: "Se puede combinar con fisioterapia o con técnicas para controlar el estrés.",
    ifNotDone: "Los dientes se siguen desgastando y pueden romperse o doler.",
    visits: "Una visita para tomar medidas y otra para entregarla.",
  },
  orthodontics: {
    name: "Ortodoncia",
    what: "Movemos los dientes poco a poco con brackets o con alineadores transparentes.",
    why: "Tus dientes o tu mordida no encajan bien. Eso dificulta la limpieza y reparte mal la fuerza al masticar.",
    benefits: [
      "Dientes alineados que se limpian mejor.",
      "Una mordida más equilibrada y una sonrisa más bonita.",
      "Coloca los dientes en buena posición antes de hacer coronas o implantes.",
    ],
    drawbacks: [
      "Dura meses y pide constancia.",
      "Al acabar hay que llevar un retenedor para que los dientes no vuelvan atrás.",
    ],
    alternatives:
      "En casos leves, a veces se mejora el aspecto con carillas, sin mover los dientes.",
    ifNotDone: "La mordida puede seguir desgastando los dientes y dificultando su limpieza.",
    visits: "Revisiones cada cuatro a ocho semanas durante el tratamiento.",
  },
  bone_graft: {
    name: "Regeneración de hueso",
    what: "Añadimos material de hueso donde falta para que luego se pueda poner un implante.",
    why: "Al perder un diente, el hueso se va reduciendo. Sin hueso suficiente el implante no se sujeta bien.",
    benefits: [
      "Permite poner implantes donde antes no era posible.",
      "Mejora el soporte y el aspecto de la encía.",
    ],
    drawbacks: [
      "Hay que esperar varios meses a que el hueso madure.",
      "Puede haber hinchazón y molestias los primeros días.",
    ],
    alternatives:
      "En algunos casos se usa un implante más corto o una prótesis que no necesita hueso extra.",
    ifNotDone: "No se podrá poner el implante en esa zona y el hueso seguirá reduciéndose.",
    visits: "Una cirugía y revisiones hasta que el hueso esté listo.",
  },
  implant: {
    name: "Implante",
    what: "Es una raíz artificial de titanio que se coloca en el hueso. Encima se pone después un diente fijo.",
    why: "Te falta un diente. El implante lo repone sin tocar los dientes de al lado.",
    benefits: [
      "Es fijo y se siente casi como un diente natural.",
      "No hay que tallar los dientes vecinos.",
      "Ayuda a conservar el hueso.",
    ],
    drawbacks: [
      "Hay que esperar unos meses a que se una al hueso.",
      "Es una pequeña cirugía y necesita buena higiene y revisiones para durar.",
    ],
    alternatives: "Un puente fijo sobre los dientes vecinos o una prótesis removible.",
    ifNotDone:
      "Los dientes de al lado y el de enfrente pueden moverse hacia el hueco. El hueso se pierde.",
    visits: "Una cirugía, una espera de unos meses y dos o tres visitas para el diente.",
  },
  whitening: {
    name: "Blanqueamiento",
    what: "Aclaramos el color de los dientes con un gel, en la consulta o en casa con férulas.",
    why: "Quieres unos dientes más blancos. Se hace antes de coronas o carillas para igualar el color.",
    benefits: [
      "Dientes más claros sin quitar nada del diente.",
      "El resultado se ve en pocas semanas.",
    ],
    drawbacks: [
      "Puede dar sensibilidad unos días.",
      "No aclara empastes, coronas ni carillas, y el color se va perdiendo con el tiempo.",
    ],
    alternatives: "Carillas o coronas, que también cambian la forma del diente.",
    ifNotDone: "No afecta a la salud. Es un tratamiento estético.",
    visits: "Una a tres visitas o unas semanas en casa.",
  },
  post: {
    name: "Perno",
    what: "Es una pequeña pieza que se coloca dentro de la raíz de un diente con endodoncia.",
    why: "El diente perdió mucha estructura. El perno da sujeción a la reconstrucción o a la corona.",
    benefits: [
      "Permite conservar dientes muy destruidos.",
      "Da firmeza a la corona que va encima.",
    ],
    drawbacks: ["Si el diente es muy débil, la raíz puede llegar a romperse con los años."],
    alternatives: "Si no queda suficiente diente, la opción es extraerlo y poner un implante.",
    ifNotDone: "La reconstrucción puede soltarse o el diente puede partirse.",
    visits: "Una visita, normalmente junto a la de la corona.",
  },
  crown: {
    name: "Corona",
    what: "Es una funda a medida que cubre todo el diente para protegerlo y devolverle su forma.",
    why: "El diente está muy debilitado, roto o tiene una endodoncia. Una corona evita que se parta.",
    benefits: ["Protege el diente y lo hace resistente.", "Tiene un aspecto natural."],
    drawbacks: [
      "Hay que tallar el diente para hacerle sitio.",
      "Con el tiempo puede necesitar cambiarse.",
    ],
    alternatives: "Una incrustación si el daño es menor, o extraer el diente y poner un implante.",
    ifNotDone: "El diente se puede romper y, a veces, ya no se puede salvar.",
    visits: "Dos o tres visitas: preparar, probar y colocar.",
  },
  veneer: {
    name: "Carilla",
    what: "Es una lámina fina que se pega en la cara de delante del diente.",
    why: "Mejora la forma, el tamaño o el color de los dientes que se ven al sonreír.",
    benefits: ["Sonrisa más armónica.", "Se talla muy poco diente."],
    drawbacks: ["Puede despegarse o romperse.", "Es un tratamiento que no tiene vuelta atrás."],
    alternatives: "Blanqueamiento, ortodoncia o empastes estéticos, según el caso.",
    ifNotDone: "No afecta a la salud. Es un tratamiento estético.",
    visits: "Dos o tres visitas.",
  },
  bridge: {
    name: "Puente fijo",
    what: "Repone uno o varios dientes con una pieza fija que se apoya en los dientes de los lados.",
    why: "Faltan dientes y los de alrededor pueden servir de apoyo.",
    benefits: ["Es fijo, no se quita.", "Devuelve la masticación y la estética en pocas semanas."],
    drawbacks: [
      "Hay que tallar los dientes de apoyo.",
      "Exige limpiar bien por debajo del puente.",
    ],
    alternatives:
      "Implantes, que no necesitan tocar los dientes vecinos, o una prótesis removible.",
    ifNotDone: "Los dientes se mueven hacia el hueco y se mastica peor.",
    visits: "Dos o tres visitas.",
  },
  removable: {
    name: "Prótesis removible",
    what: "Es una dentadura que repone los dientes que faltan y que puedes quitarte para limpiarla.",
    why: "Faltan varios dientes. Es la forma más sencilla y económica de reponerlos.",
    benefits: ["Devuelve la masticación y la sonrisa.", "No hace falta cirugía."],
    drawbacks: [
      "Necesita un tiempo de adaptación para hablar y comer.",
      "Se puede mover. Con los años hay que ajustarla porque la encía cambia.",
    ],
    alternatives: "Implantes o puentes fijos, o una prótesis sujeta con implantes.",
    ifNotDone: "Se mastica peor y los dientes que quedan sufren más carga.",
    visits: "Cuatro o cinco visitas de medidas, pruebas y ajustes.",
  },
  other: {
    name: "Otro tratamiento",
    what: "Tu dentista te explicará en la consulta en qué consiste este tratamiento.",
    why: "Forma parte de tu plan porque ayuda a mantener tu boca sana y funcional.",
    benefits: ["Completa el resto del plan."],
    drawbacks: ["Pregunta a tu dentista por sus molestias o riesgos concretos."],
    alternatives: "Tu dentista te contará si hay otras opciones en tu caso.",
    ifNotDone: "Pregunta qué puede pasar si decides no hacerlo o retrasarlo.",
    visits: "Te lo indicaremos al darte la cita.",
  },
};

// Order inside each phase. Phase 1: first what hurts or is infected, then stop the disease.
// Phase 2: align before rebuilding; bone before implants; whitening before crowns and veneers
// so their colour matches; posts before the crown that sits on them.
const ORDER: TreatmentFamily[] = [
  "extraction",
  "root_canal",
  "periodontal",
  "filling",
  "hygiene",
  "splint",
  "orthodontics",
  "bone_graft",
  "implant",
  "whitening",
  "post",
  "crown",
  "veneer",
  "bridge",
  "removable",
  "other",
];

const ORDER_REASONS: Record<TreatmentFamily, string> = {
  extraction: "Va primero porque quita el dolor y los focos de infección que no tienen arreglo.",
  root_canal: "Se hace pronto para eliminar la infección del nervio y salvar el diente.",
  periodontal: "Las encías tienen que estar sanas antes de reconstruir o reponer dientes.",
  filling: "Paramos las caries mientras son pequeñas, antes de que lleguen al nervio.",
  hygiene: "Deja la boca limpia para que los tratamientos curen mejor.",
  splint: "Protege los dientes y los arreglos del desgaste por apretar.",
  orthodontics:
    "Primero colocamos los dientes en su sitio; después se reconstruye sobre esa posición.",
  bone_graft: "El hueso tiene que estar listo antes de poner el implante.",
  implant: "Se pone cuando la boca está sana y el hueso preparado.",
  whitening: "Se hace antes de coronas o carillas para que su color se iguale al de tus dientes.",
  post: "Se coloca antes de la corona porque es la base que la sujeta.",
  crown: "Va al final de la reconstrucción del diente, cuando la raíz está sana.",
  veneer: "Se hace al final, con el color y la posición de los dientes ya decididos.",
  bridge: "Se coloca cuando los dientes de apoyo están sanos.",
  removable: "Se hace al final para que encaje con la boca ya tratada.",
  other: "Tu dentista te explicará en qué momento conviene hacerlo.",
};

const FAMILY_WORDS: [TreatmentFamily, string[]][] = [
  [
    "bone_graft",
    ["injerto", "graft", "seno", "sinus", "membrana", "membrane", "malla", "mesh", "regeneracion"],
  ],
  ["implant", ["implant", "abutment", "pilar", "tibase", "locator"]],
  ["orthodontics", ["ortodon", "orthodon", "alineador", "aligner", "bracket"]],
  ["whitening", ["blanque", "whiten"]],
  ["veneer", ["carilla", "veneer"]],
  ["post", ["perno", "post"]],
  ["removable", ["removable", "removible", "dentadura"]],
  ["bridge", ["puente", "bridge", "prosthesis", "protesis fija"]],
  ["crown", ["corona", "crown", "incrustacion", "onlay", "inlay"]],
  ["extraction", ["extrac", "exodon"]],
  ["root_canal", ["endodon", "conducto", "pulpo", "pulpect"]],
  ["periodontal", ["periodon", "raspado", "curetaje", "alisado", "gingiv"]],
  ["splint", ["ferula", "splint"]],
  ["hygiene", ["higiene", "hygiene", "limpieza", "profilaxis"]],
  ["filling", ["obtura", "filling", "restaura", "empaste", "caries", "sellado"]],
];

export function treatmentFamily(item: { treatmentCode: string; label: string }): TreatmentFamily {
  const text = `${normalized(item.treatmentCode)} ${normalized(item.label)}`;
  for (const [family, words] of FAMILY_WORDS) {
    if (words.some((word) => mentions(text, word))) return family;
  }
  return "other";
}

export interface TreatmentPlanItem {
  id: string;
  treatmentCode: string;
  label: string;
  tooth?: string | null | undefined;
  priceCents?: number | null | undefined;
  status: string;
}

export interface TreatmentPlanStep {
  order: number;
  family: TreatmentFamily;
  guide: TreatmentGuide;
  teeth: string[];
  priceCents: number;
  orderReason: string;
}

export interface TreatmentPlanPhaseSection {
  phase: TreatmentPhase;
  title: string;
  purpose: string;
  steps: TreatmentPlanStep[];
  totalCents: number;
}

export interface TreatmentPlanDocument {
  intro: string;
  phases: TreatmentPlanPhaseSection[];
  orderSummary: string[];
  maintenance: string;
  closing: string;
  totalCents: number;
}

const PHASE_TEXT: Record<TreatmentPhase, { title: string; purpose: string }> = {
  primary: {
    title: "Fase 1 · Recuperar la salud",
    purpose:
      "Primero quitamos el dolor y la infección y frenamos la caries y la enfermedad de las encías. Sin una boca sana, cualquier arreglo posterior dura menos.",
  },
  secondary: {
    title: "Fase 2 · Reponer y mejorar",
    purpose:
      "Con la boca ya sana, reponemos los dientes que faltan y mejoramos la mordida y la estética. Antes de empezar esta fase revisamos cómo ha respondido tu boca.",
  },
};

const CLOSED = new Set(["CANCELLED", "SUPERSEDED", "COMPLETED", "DONE"]);

export function buildTreatmentPlanDocument(
  items: readonly TreatmentPlanItem[],
  options: { patientName: string },
): TreatmentPlanDocument {
  const open = items.filter((item) => !CLOSED.has(item.status.toUpperCase()));
  const phases: TreatmentPlanPhaseSection[] = [];
  for (const phase of ["primary", "secondary"] as const) {
    const grouped = new Map<TreatmentFamily, { teeth: string[]; priceCents: number }>();
    for (const item of open) {
      if (treatmentPhase(item) !== phase) continue;
      const family = treatmentFamily(item);
      const entry = grouped.get(family) ?? { teeth: [], priceCents: 0 };
      if (item.tooth && !entry.teeth.includes(item.tooth)) entry.teeth.push(item.tooth);
      entry.priceCents += item.priceCents ?? 0;
      grouped.set(family, entry);
    }
    if (!grouped.size) continue;
    const steps = [...grouped.entries()]
      .sort(([left], [right]) => ORDER.indexOf(left) - ORDER.indexOf(right))
      .map(([family, entry], index) => ({
        order: index + 1,
        family,
        guide: TREATMENT_GUIDES[family],
        teeth: entry.teeth,
        priceCents: entry.priceCents,
        orderReason: ORDER_REASONS[family],
      }));
    phases.push({
      phase,
      ...PHASE_TEXT[phase],
      steps,
      totalCents: steps.reduce((sum, step) => sum + step.priceCents, 0),
    });
  }

  const firstName = options.patientName.trim().split(/\s+/)[0] || "Hola";
  const intro =
    phases.length > 1
      ? `${firstName}, este es tu plan de tratamiento explicado paso a paso. Lo hemos ordenado en dos fases: primero recuperar la salud de tu boca y después reponer y mejorar. Así cada tratamiento se hace sobre una base sana y dura más.`
      : `${firstName}, este es tu plan de tratamiento explicado paso a paso. Lo hemos ordenado para que cada tratamiento se haga en el mejor momento y dure más.`;

  return {
    intro,
    phases,
    orderSummary: [
      "Primero lo urgente: quitar el dolor y la infección.",
      "Después frenar la enfermedad: caries y encías.",
      "Luego reponer y mejorar: implantes, coronas, prótesis u ortodoncia.",
      "Por último, revisiones para mantener el resultado.",
    ],
    maintenance:
      "Al terminar te citaremos para revisiones y limpiezas periódicas. Cepíllate dos veces al día y limpia entre los dientes. Así tus tratamientos durarán muchos años.",
    closing:
      "Este documento te ayuda a entender tu plan. Antes de cada tratamiento con riesgos te daremos su consentimiento informado para firmar. Pregúntanos cualquier duda: puedes cambiar de opinión en cualquier momento.",
    totalCents: phases.reduce((sum, phase) => sum + phase.totalCents, 0),
  };
}
