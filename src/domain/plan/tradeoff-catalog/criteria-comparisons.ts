// Source: «DENTY · Matriz maestra de tratamientos odontológicos» v1.0, part I. Worked comparisons
// aspect by aspect for the two most common decisions about a painful, restorable tooth. Values
// follow the option order of the linked scenario in comparison-scenarios.ts.

export interface ComparisonCriterion {
  aspect: string;
  values: readonly [string, string];
}

export interface CriteriaComparison {
  scenarioId: string;
  /** The clinical situation the table assumes; it does not hold for every patient. */
  assumption: string;
  criteria: readonly ComparisonCriterion[];
  /** Plain-language summary the dentist may read to the patient. */
  patientMessage: string | null;
  /** Nuance the dentist should keep in mind, not shown to the patient. */
  caveat: string | null;
}

const criterion = (aspect: string, first: string, second: string): ComparisonCriterion => ({
  aspect,
  values: [first, second],
});

const PAINFUL_RESTORABLE_MOLAR =
  "Molar doloroso, restaurable, con soporte periodontal suficiente y sin fractura vertical confirmada. El diagnóstico pulpar y periapical determina el tratamiento; la reconstrucción y una eventual corona dependen del tejido remanente.";

export const CRITERIA_COMPARISONS: readonly CriteriaComparison[] = [
  {
    scenarioId: "S01",
    assumption: PAINFUL_RESTORABLE_MOLAR,
    criteria: [
      criterion(
        "Alivio del problema",
        "Trata la enfermedad pulpar/periapical conservando el diente, si tiene éxito.",
        "Trata el foco responsable del dolor, seguido de cicatrización.",
      ),
      criterion(
        "Estructura natural",
        "Se conservan diente y raíz natural.",
        "Pérdida irreversible del diente y de la raíz.",
      ),
      criterion(
        "Ligamento periodontal",
        "Se mantiene, junto con su función sensorial periodontal.",
        "Se pierde con la extracción.",
      ),
      criterion(
        "Hueso alveolar",
        "Se mantiene mejor el entorno radicular si hay salud periapical/periodontal.",
        "Puede sufrir reabsorción tras la extracción.",
      ),
      criterion(
        "Dientes vecinos",
        "Se mantienen contactos y espacio, si la restauración es correcta.",
        "Pueden inclinarse o migrar; el antagonista puede extruirse.",
      ),
      criterion(
        "Función",
        "Puede mantener la masticación mediante una rehabilitación adecuada.",
        "Puede disminuir si el espacio queda sin rehabilitar.",
      ),
      criterion(
        "Riesgos",
        "Reinfección, fractura, retratamiento o posible pérdida futura.",
        "Infección o molestias posquirúrgicas; dificultades de reposición futura.",
      ),
      criterion(
        "Coste",
        "Coste inicial de conductos y restauración; mantenimiento posterior.",
        "Menor inicial sin reposición, pero puede aumentar si se rehabilita.",
      ),
      criterion(
        "Reversibilidad",
        "Posibilita intentar conservar el diente, sin garantía.",
        "Extracción irreversible.",
      ),
    ],
    patientMessage:
      "Si el diente se puede conservar con buen pronóstico, mantenerlo preserva su raíz y ligamento periodontal. La extracción trata la pieza afectada, pero dejar el espacio sin reponer puede complicar una rehabilitación futura.",
    caveat: null,
  },
  {
    scenarioId: "S02",
    assumption: PAINFUL_RESTORABLE_MOLAR,
    criteria: [
      criterion(
        "Biología",
        "Conserva el ligamento periodontal y la propiocepción periodontal.",
        "Osteointegración al hueso, sin ligamento periodontal natural.",
      ),
      criterion(
        "Cirugía",
        "Habitualmente no necesita cirugía de implante.",
        "Requiere extracción y cirugía implantaria.",
      ),
      criterion(
        "Tiempos",
        "A menudo rehabilitación más corta, según complejidad.",
        "Puede implicar meses según cicatrización, injerto y carga.",
      ),
      criterion(
        "Riesgos",
        "Fractura, reinfección, restauración o extracción futura.",
        "Periimplantitis, pérdida ósea, complicaciones protésicas.",
      ),
      criterion(
        "Inversión",
        "Depende del número de conductos y de la restauración; no siempre más barata.",
        "Puede ser mayor al incluir cirugía, implante y corona.",
      ),
    ],
    patientMessage: null,
    caveat:
      "Un implante sí integra células y tejidos óseos a su alrededor; la diferencia es que no reproduce por completo el complejo diente-ligamento periodontal. Un poste intrarradicular no refuerza automáticamente la raíz.",
  },
];
