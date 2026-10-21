// From "DENTY · Matriz maestra de tratamientos odontológicos" v1.0, parts V and VI. Triggers
// say which planned treatments make each item relevant; nothing here is shown unconditionally
// to the patient, because the source asks for consequences "pertinentes al caso".
import type { TradeoffSpecialtyId } from "./types.ts";

export interface CatalogTrigger {
  specialties?: readonly TradeoffSpecialtyId[];
  entryIds?: readonly string[];
}

/** What can happen if a phase is postponed, declined or left unfinished. */
export interface DeferralConsequence {
  id: string;
  decision: string;
  consequence: string;
  action: string;
  trigger: CatalogTrigger;
}

/** A caution for the dentist that cannot be dismissed while it applies. */
export interface ClinicalGuard {
  id: string;
  finding: string;
  behaviour: string;
  control: string;
  trigger: CatalogTrigger | "always";
}

/** The "no tratar / observar" alternative that is clinically defensible for some treatments. */
export interface NoTreatmentOption {
  entryId: string;
  trigger: CatalogTrigger;
}

const ENDODONTICS = [
  "b.endodoncia-restauracion",
  "m.endodoncia-unirradicular",
  "m.endodoncia-multirradicular",
  "b.reendodoncia",
  "m.reendodoncia",
];
const EXTRACTIONS = [
  "b.extraccion-sin-reposicion",
  "b.extraccion-implante-corona",
  "b.extraccion-periodontal",
  "b.extraccion-sin-preservacion-alveolar",
  "m.exodoncia-simple",
  "m.exodoncia-quirurgica",
  "m.extraccion-de-diente-irrestaurable",
  "m.extraccion-periodontal",
  "m.extraccion-sin-preservacion-alveolar",
  "m.extraccion-con-preservacion-alveolar",
];
const POSTS = ["b.poste-reconstruccion", "m.reconstruccion-con-poste-y-munon"];
const COVERAGE = [
  "b.corona-completa",
  "b.onlay-u-overlay",
  "m.corona-completa",
  "m.corona-de-zirconia",
  "m.corona-metal-ceramica",
  "m.corona-de-disilicato-de-litio",
  "m.onlay",
  "m.overlay",
];
const SPLINTS = [
  "b.ferula-de-estabilizacion",
  "b.ferula-con-controles",
  "b.ferula-sin-controles",
  "m.ferula-de-estabilizacion-personalizada",
  "m.ferula-blanda",
  "m.ferula-rigida-de-cobertura-completa",
  "m.ferula-controles-periodicos",
  "m.ferula-sin-seguimiento-posterior",
  "m.ferula-fisioterapia-orofacial",
];
const REMOVABLES = [
  "b.protesis-parcial-removible",
  "b.protesis-completa-convencional",
  "b.sobredentadura-implantorretenida",
  "m.protesis-parcial-acrilica",
  "m.protesis-parcial-esqueletica",
  "m.protesis-removible-flexible",
  "m.protesis-completa-convencional",
  "m.protesis-completa-inmediata",
  "m.protesis-completa-con-implantes",
  "m.sobredentadura-sobre-2-implantes-inferiores",
];
const WHITENING = [
  "b.blanqueamiento-supervisado",
  "m.blanqueamiento-en-consulta",
  "m.blanqueamiento-domiciliario-supervisado",
];
const WEAR_REHABILITATION = [
  "b.ferula-rehabilitacion-del-desgaste",
  "m.ferula-rehabilitacion-del-desgaste",
  "m.aumento-de-dimension-vertical-de-oclusion",
  "m.reconstrucciones-adhesivas-a-nueva-dimension-vertical",
  "m.rehabilitacion-total-con-coronas",
];
const OCCLUSAL_GRINDING = [
  "b.tallado-oclusal-irreversible",
  "m.ajuste-oclusal-irreversible-mediante-tallado",
];
const TOOTH_REPLACEMENT: CatalogTrigger = {
  specialties: ["implantologia"],
  entryIds: [
    "b.puente-fijo-convencional",
    "b.puente-adhesivo-maryland",
    "b.protesis-parcial-removible",
    "m.puente-fijo-convencional",
    "m.puente-adhesivo-tipo-maryland",
    "m.protesis-parcial-acrilica",
    "m.protesis-parcial-esqueletica",
    "m.protesis-removible-flexible",
  ],
};

export const DEFERRAL_CONSEQUENCES: readonly DeferralConsequence[] = [
  {
    id: "C01",
    decision: "Hacer endodoncia sin restauración definitiva",
    consequence: "Mayor riesgo de filtración, reinfección o fractura",
    action: "Explicar y planificar restauración definitiva",
    trigger: { entryIds: ENDODONTICS },
  },
  {
    id: "C02",
    decision: "Extraer un diente y dejar el espacio",
    consequence: "Posible movimiento dentario y pérdida de volumen óseo",
    action: "Registrar plan de reposición o vigilancia",
    trigger: { entryIds: EXTRACTIONS },
  },
  {
    id: "C03",
    decision: "Colocar implante sin mantenimiento",
    consequence: "Complicaciones periimplantarias inadvertidas",
    action: "Programa de higiene y revisiones",
    trigger: { specialties: ["implantologia"] },
  },
  {
    id: "C04",
    decision: "Finalizar ortodoncia sin retenedores",
    consequence: "Mayor riesgo de recidiva",
    action: "Protocolizar retención y controles",
    trigger: { specialties: ["ortodoncia"] },
  },
  {
    id: "C05",
    decision: "Tratar periodontitis y abandonar controles",
    consequence: "Mayor riesgo de progresión o recaída",
    action: "Calendario de mantenimiento periodontal",
    trigger: { specialties: ["periodoncia"] },
  },
  {
    id: "C06",
    decision: "Utilizar férula sin revisiones",
    consequence: "Deterioro o desadaptación no detectados",
    action: "Programar revisión de adaptación y contactos",
    trigger: { entryIds: SPLINTS },
  },
  {
    id: "C07",
    decision: "Usar prótesis removible sin limpiarla",
    consequence: "Mayor biofilm e irritación de mucosas",
    action: "Instrucciones escritas de higiene",
    trigger: { entryIds: REMOVABLES },
  },
  {
    id: "C08",
    decision: "Blanquear sin revisar coronas u obturaciones",
    consequence: "Diferencias de color con restauraciones",
    action: "Aviso previo de restauraciones existentes",
    trigger: { entryIds: WHITENING },
  },
  {
    id: "C09",
    decision: "Rehabilitar desgaste sin controlar factores",
    consequence: "Repetición de desgaste, fracturas o molestias",
    action: "Plan etiológico y mantenimiento",
    trigger: { entryIds: WEAR_REHABILITATION },
  },
  {
    id: "C10",
    decision: "Posponer el tratamiento de una infección activa",
    consequence: "Persistencia o extensión de infección",
    action: "Informar urgencias y seguimiento clínico",
    trigger: {
      entryIds: [
        ...ENDODONTICS,
        ...EXTRACTIONS,
        "m.drenaje-de-absceso",
        "m.tratamiento-de-periimplantitis",
        "m.tratamiento-no-quirurgico-de-periimplantitis",
        "m.tratamiento-quirurgico-de-periimplantitis",
      ],
    },
  },
];

export const CLINICAL_GUARDS: readonly ClinicalGuard[] = [
  {
    id: "G01",
    finding: "Diente restaurable",
    behaviour: "Permitir valorar conservación",
    control: "No elegir automáticamente endodoncia",
    trigger: { entryIds: [...ENDODONTICS, ...EXTRACTIONS] },
  },
  {
    id: "G02",
    finding: "Fractura radicular vertical confirmada irrestaurable",
    behaviour: "Excluir endodoncia como solución conservadora",
    control: "Verificar diagnóstico y pronóstico",
    trigger: { entryIds: ENDODONTICS },
  },
  {
    id: "G03",
    finding: "Diente endodonciado con remanente suficiente",
    behaviour: "No añadir poste automáticamente",
    control: "Determinar retención requerida",
    trigger: { entryIds: POSTS },
  },
  {
    id: "G04",
    finding: "Pérdida importante de estructura coronal",
    behaviour: "Valorar cobertura y retención",
    control: "Tener en cuenta férula dentinaria y oclusión",
    trigger: { entryIds: [...COVERAGE, ...POSTS] },
  },
  {
    id: "G05",
    finding: "Periodontitis activa",
    behaviour: "Alertar antes de ciertas rehabilitaciones",
    control: "Control periodontal previo cuando corresponda",
    trigger: { specialties: ["implantologia", "protesis"] },
  },
  {
    id: "G06",
    finding: "Ausencia de antagonista funcional",
    behaviour: "Adaptar advertencia sobre extrusión",
    control: "No afirmar extrusión obligatoria",
    trigger: { entryIds: [...EXTRACTIONS, "m.no-reponer-un-diente-ausente"] },
  },
  {
    id: "G07",
    finding: "Paciente en crecimiento",
    behaviour: "Alertar por limitaciones de implantes osteointegrados",
    control: "Valorar alternativas transitorias",
    trigger: { specialties: ["implantologia"] },
  },
  {
    id: "G08",
    finding: "Bruxismo sin pérdida estructural significativa",
    behaviour: "No proponer aumento de dimensión vertical automático",
    control: "Priorizar diagnóstico y protección si indicada",
    trigger: { entryIds: WEAR_REHABILITATION },
  },
  {
    id: "G09",
    finding: "Dolor de ATM aislado",
    behaviour: "Priorizar evaluación y medidas reversibles",
    control: "Evitar tallado irreversible como rutina",
    trigger: { entryIds: OCCLUSAL_GRINDING },
  },
  {
    id: "G10",
    finding: "Datos diagnósticos insuficientes",
    behaviour: "No recomendar plan automáticamente",
    control: "Pedir evaluación profesional",
    trigger: "always",
  },
];

export const NO_TREATMENT_OPTIONS: readonly NoTreatmentOption[] = [
  { entryId: "m.no-reponer-un-diente-ausente", trigger: TOOTH_REPLACEMENT },
  { entryId: "b.observacion-no-tratar-ortodoncia", trigger: { specialties: ["ortodoncia"] } },
  { entryId: "m.no-realizar-tratamiento-estetico", trigger: { specialties: ["estetica"] } },
  { entryId: "b.control-del-desgaste", trigger: { entryIds: WEAR_REHABILITATION } },
  {
    entryId: "b.vigilancia-de-cordal",
    trigger: {
      entryIds: [
        "b.extraccion-de-cordal",
        "b.coronectomia",
        "m.exodoncia-de-tercer-molar-sintomatico",
        "m.coronectomia-de-tercer-molar",
      ],
    },
  },
  {
    entryId: "b.control-de-recesion",
    trigger: {
      entryIds: [
        "b.injerto-gingival",
        "m.injerto-gingival-libre",
        "m.injerto-de-tejido-conectivo",
        "m.colgajo-de-avance-coronal",
        "m.cirugia-de-cobertura-radicular-con-tunel",
        "m.pinhole-tecnicas-mucogingivales-alternativas",
      ],
    },
  },
  {
    entryId: "b.observacion-sin-mantenedor",
    trigger: {
      entryIds: [
        "b.mantenedor-de-espacio",
        "m.mantenedor-de-espacio-fijo",
        "m.mantenedor-de-espacio-removible",
      ],
    },
  },
];
