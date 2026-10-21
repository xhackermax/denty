// From "DENTY · Matriz maestra de tratamientos odontológicos" v1.0, part III. Each option
// lists the catalog entries that represent it, so a plan built from clinic treatments can be
// recognised as one side of a scenario.

export interface ScenarioOption {
  label: string;
  entryIds: readonly string[];
}

export interface ComparisonScenario {
  id: string;
  title: string;
  /** What the dentist must confirm before offering the comparison. */
  check: string;
  options: readonly [ScenarioOption, ScenarioOption];
}

function option(label: string, ...entryIds: string[]): ScenarioOption {
  return { label, entryIds };
}

export const COMPARISON_SCENARIOS: readonly ComparisonScenario[] = [
  {
    id: "S01",
    title: "Diente con dolor: conservar o extraer",
    check: "Diente restaurable con pronóstico periodontal suficiente.",
    options: [
      option(
        "Endodoncia + restauración",
        "b.endodoncia-restauracion",
        "m.endodoncia-unirradicular",
        "m.endodoncia-multirradicular",
      ),
      option(
        "Extracción sin reposición",
        "b.extraccion-sin-reposicion",
        "m.exodoncia-simple",
        "m.extraccion-de-diente-irrestaurable",
      ),
    ],
  },
  {
    id: "S02",
    title: "Salvar el diente o colocar implante",
    check: "Confirmar restaurabilidad y pronóstico endodóntico.",
    options: [
      option(
        "Endodoncia + restauración",
        "b.endodoncia-restauracion",
        "m.endodoncia-unirradicular",
        "m.endodoncia-multirradicular",
      ),
      option(
        "Extracción + implante + corona",
        "b.extraccion-implante-corona",
        "b.implante-unitario",
        "m.implante-unitario-corona",
        "m.extraccion-implante-frente-a-conservar-raiz",
      ),
    ],
  },
  {
    id: "S03",
    title: "Diente ausente: implante o puente",
    check: "Valorar dientes pilares, volumen óseo, edad y mantenimiento.",
    options: [
      option("Implante unitario", "b.implante-unitario", "m.implante-unitario-corona"),
      option(
        "Puente fijo convencional",
        "b.puente-fijo-convencional",
        "m.puente-fijo-convencional",
      ),
    ],
  },
  {
    id: "S04",
    title: "Diente ausente: implante o removible",
    check: "Rehabilitación de una pieza ausente con diferentes compromisos.",
    options: [
      option("Implante unitario", "b.implante-unitario", "m.implante-unitario-corona"),
      option(
        "Prótesis parcial removible",
        "b.protesis-parcial-removible",
        "m.protesis-parcial-acrilica",
        "m.protesis-parcial-esqueletica",
        "m.protesis-removible-flexible",
      ),
    ],
  },
  {
    id: "S05",
    title: "Puente convencional o Maryland",
    check: "Valorar esmalte disponible, espacio y oclusión.",
    options: [
      option(
        "Puente fijo convencional",
        "b.puente-fijo-convencional",
        "m.puente-fijo-convencional",
      ),
      option(
        "Puente adhesivo tipo Maryland",
        "b.puente-adhesivo-maryland",
        "m.puente-adhesivo-tipo-maryland",
      ),
    ],
  },
  {
    id: "S06",
    title: "Arcada edéntula: removible o fija",
    check: "Considerar cirugía, soporte óseo, higiene y coste.",
    options: [
      option(
        "Prótesis completa convencional",
        "b.protesis-completa-convencional",
        "m.protesis-completa-convencional",
      ),
      option(
        "Prótesis fija completa sobre implantes",
        "b.protesis-fija-completa-sobre-implantes",
        "m.protesis-fija-completa-sobre-implantes",
        "m.protesis-fija-hibrida-metal-resina",
        "m.protesis-fija-completa-ceramica-zirconia",
      ),
    ],
  },
  {
    id: "S07",
    title: "Prótesis completa o sobredentadura",
    check: "Especialmente útil en edentulismo inferior.",
    options: [
      option(
        "Prótesis completa convencional",
        "b.protesis-completa-convencional",
        "m.protesis-completa-convencional",
      ),
      option(
        "Sobredentadura implantorretenida",
        "b.sobredentadura-implantorretenida",
        "m.sobredentadura-sobre-2-implantes-inferiores",
        "m.protesis-completa-con-implantes",
      ),
    ],
  },
  {
    id: "S08",
    title: "Empaste o incrustación",
    check: "Seleccionar según tamaño de cavidad y estado de cúspides.",
    options: [
      option("Obturación de composite", "b.obturacion-de-composite", "m.obturacion-de-composite"),
      option(
        "Onlay u overlay",
        "b.onlay-u-overlay",
        "m.onlay",
        "m.overlay",
        "m.incrustacion-inlay",
      ),
    ],
  },
  {
    id: "S09",
    title: "Incrustación o corona",
    check: "Depende de tejido remanente, carga y diseño.",
    options: [
      option("Onlay / overlay", "b.onlay-u-overlay", "m.onlay", "m.overlay"),
      option(
        "Corona completa",
        "b.corona-completa",
        "m.corona-completa",
        "m.corona-de-zirconia",
        "m.corona-metal-ceramica",
        "m.corona-de-disilicato-de-litio",
      ),
    ],
  },
  {
    id: "S10",
    title: "Reconstrucción con o sin poste",
    check: "El poste se añade para retención si hace falta, no para reforzar.",
    options: [
      option(
        "Reconstrucción sin poste",
        "b.reconstruccion-sin-poste",
        "m.reconstruccion-sin-poste",
      ),
      option(
        "Poste + reconstrucción",
        "b.poste-reconstruccion",
        "m.reconstruccion-con-poste-y-munon",
      ),
    ],
  },
  {
    id: "S11",
    title: "Reendodoncia o cirugía apical",
    check: "Evaluar causa de fracaso y acceso al conducto.",
    options: [
      option("Reendodoncia", "b.reendodoncia", "m.reendodoncia"),
      option("Cirugía apical", "b.cirugia-apical", "m.cirugia-apical", "m.apicectomia"),
    ],
  },
  {
    id: "S12",
    title: "Tratamiento periodontal o extracción",
    check: "Extracción solo ante pronóstico irrecuperable.",
    options: [
      option(
        "Tratamiento periodontal conservador",
        "b.tratamiento-periodontal-conservador",
        "m.instrumentacion-subgingival-raspado-y-alisado-radicular",
      ),
      option("Extracción periodontal", "b.extraccion-periodontal", "m.extraccion-periodontal"),
    ],
  },
  {
    id: "S13",
    title: "Periodoncia conservadora o cirugía",
    check: "Cirugía según respuesta al tratamiento inicial.",
    options: [
      option(
        "Tratamiento periodontal conservador",
        "b.tratamiento-periodontal-conservador",
        "m.instrumentacion-subgingival-raspado-y-alisado-radicular",
      ),
      option(
        "Cirugía periodontal",
        "b.cirugia-periodontal",
        "m.cirugia-periodontal-de-acceso",
        "m.cirugia-periodontal-resectiva",
        "m.regeneracion-periodontal",
      ),
    ],
  },
  {
    id: "S14",
    title: "Implante inmediato o diferido",
    check: "Valorar estabilidad primaria y condiciones alveolares.",
    options: [
      option("Implante inmediato", "b.implante-inmediato", "m.implante-inmediato-posextraccion"),
      option("Implante diferido", "b.implante-diferido", "m.implante-diferido"),
    ],
  },
  {
    id: "S15",
    title: "Extracción con o sin preservación",
    check: "Según futura rehabilitación y volumen de defecto.",
    options: [
      option(
        "Preservación alveolar",
        "b.preservacion-alveolar",
        "m.preservacion-alveolar",
        "m.extraccion-con-preservacion-alveolar",
      ),
      option(
        "Extracción sin preservación alveolar",
        "b.extraccion-sin-preservacion-alveolar",
        "m.extraccion-sin-preservacion-alveolar",
      ),
    ],
  },
  {
    id: "S16",
    title: "Brackets o alineadores",
    check: "Evaluar complejidad, estética y colaboración.",
    options: [
      option(
        "Brackets",
        "b.brackets",
        "m.ortodoncia-con-brackets-metalicos",
        "m.brackets-ceramicos",
        "m.ortodoncia-lingual",
      ),
      option("Alineadores", "b.alineadores", "m.ortodoncia-con-alineadores"),
    ],
  },
  {
    id: "S17",
    title: "Ortodoncia o no tratar",
    check: "Considerar función, higiene, estética y preferencias.",
    options: [
      option(
        "Ortodoncia",
        "b.ortodoncia",
        "b.brackets",
        "b.alineadores",
        "m.ortodoncia-con-brackets-metalicos",
        "m.ortodoncia-con-alineadores",
      ),
      option(
        "Observación / no tratar",
        "b.observacion-no-tratar-ortodoncia",
        "m.no-realizar-ortodoncia",
      ),
    ],
  },
  {
    id: "S18",
    title: "Ortodoncia con o sin extracciones",
    check: "Depende de discrepancia, límites alveolares y perfil.",
    options: [
      option(
        "Ortodoncia con extracciones",
        "b.ortodoncia-con-extracciones",
        "m.ortodoncia-con-extracciones",
      ),
      option(
        "Ortodoncia sin extracciones",
        "b.ortodoncia-sin-extracciones",
        "m.ortodoncia-sin-extracciones",
        "m.stripping-ipr",
      ),
    ],
  },
  {
    id: "S19",
    title: "Camuflaje o cirugía ortognática",
    check: "Debe existir estudio especializado de discrepancia esquelética.",
    options: [
      option("Camuflaje ortodóncico", "b.camuflaje-ortodoncico", "m.ortodoncia-de-camuflaje"),
      option("Ortodoncia + cirugía", "b.ortodoncia-cirugia", "m.ortodoncia-cirugia-ortognatica"),
    ],
  },
  {
    id: "S20",
    title: "Férula sola o férula + rehabilitación",
    check: "Rehabilitación solo si existe una necesidad restauradora real.",
    options: [
      option(
        "Férula y seguimiento",
        "b.ferula-de-estabilizacion",
        "b.ferula-con-controles",
        "m.ferula-de-estabilizacion-personalizada",
        "m.ferula-controles-periodicos",
      ),
      option(
        "Férula + rehabilitación del desgaste",
        "b.ferula-rehabilitacion-del-desgaste",
        "m.ferula-rehabilitacion-del-desgaste",
      ),
    ],
  },
  {
    id: "S21",
    title: "Férula con o sin controles",
    check: "Una férula requiere vigilancia; no recomendar abandono de controles.",
    options: [
      option("Férula con controles", "b.ferula-con-controles", "m.ferula-controles-periodicos"),
      option(
        "Férula sin seguimiento",
        "b.ferula-sin-controles",
        "m.ferula-sin-seguimiento-posterior",
      ),
    ],
  },
  {
    id: "S22",
    title: "ATM: medidas conservadoras o tallado",
    check: "El tallado irreversible no trata de rutina el TTM.",
    options: [
      option(
        "Autocuidado / fisioterapia",
        "b.autocuidado-y-fisioterapia-atm",
        "m.autocuidado-y-ejercicios-mandibulares",
        "m.fisioterapia-de-trastornos-temporomandibulares",
      ),
      option(
        "Tallado oclusal irreversible (no rutinario)",
        "b.tallado-oclusal-irreversible",
        "m.ajuste-oclusal-irreversible-mediante-tallado",
      ),
    ],
  },
  {
    id: "S23",
    title: "Desgaste: observar o rehabilitar",
    check: "Evaluar progresión, pérdida estructural y función.",
    options: [
      option("Control del desgaste", "b.control-del-desgaste", "m.observacion-de-desgaste-estable"),
      option(
        "Rehabilitación del desgaste",
        "b.ferula-rehabilitacion-del-desgaste",
        "m.reconstrucciones-adhesivas-a-nueva-dimension-vertical",
        "m.rehabilitacion-total-con-coronas",
        "m.aumento-de-dimension-vertical-de-oclusion",
      ),
    ],
  },
  {
    id: "S24",
    title: "Cordal: vigilar o extraer",
    check: "No extraer profilácticamente todo cordal sano.",
    options: [
      option("Vigilancia", "b.vigilancia-de-cordal", "m.vigilancia-de-tercer-molar-sano"),
      option(
        "Extracción de cordal",
        "b.extraccion-de-cordal",
        "m.exodoncia-de-tercer-molar-sintomatico",
      ),
    ],
  },
  {
    id: "S25",
    title: "Cordal cercano al nervio",
    check: "Coronectomía solo para anatomía y patología adecuadas.",
    options: [
      option("Coronectomía seleccionada", "b.coronectomia", "m.coronectomia-de-tercer-molar"),
      option(
        "Extracción completa",
        "b.extraccion-de-cordal",
        "m.exodoncia-de-tercer-molar-sintomatico",
      ),
    ],
  },
  {
    id: "S26",
    title: "Carillas de composite o cerámica",
    check: "Considerar estética, estructura sana y mantenimiento.",
    options: [
      option("Composite", "b.carillas-de-composite", "m.carillas-de-composite"),
      option("Cerámica", "b.carillas-ceramicas", "m.carillas-ceramicas"),
    ],
  },
  {
    id: "S27",
    title: "Diente temporal: corona o extracción",
    check: "Depende de restaurabilidad y desarrollo dental.",
    options: [
      option(
        "Corona preformada",
        "b.corona-pediatrica",
        "m.corona-preformada-metalica",
        "m.tecnica-de-hall",
      ),
      option(
        "Extracción",
        "b.extraccion-de-diente-temporal",
        "m.extraccion-de-temporal-no-conservable",
      ),
    ],
  },
  {
    id: "S28",
    title: "Pérdida prematura: mantenedor o control",
    check: "Considerar edad dental, pérdida de espacio y erupción.",
    options: [
      option(
        "Mantenedor de espacio",
        "b.mantenedor-de-espacio",
        "m.mantenedor-de-espacio-fijo",
        "m.mantenedor-de-espacio-removible",
      ),
      option("Observación", "b.observacion-sin-mantenedor"),
    ],
  },
  {
    id: "S29",
    title: "Recesión: injerto o control",
    check: "Depende del tipo de recesión y síntomas.",
    options: [
      option(
        "Injerto gingival",
        "b.injerto-gingival",
        "m.injerto-gingival-libre",
        "m.injerto-de-tejido-conectivo",
        "m.colgajo-de-avance-coronal",
      ),
      option("Control sin cirugía", "b.control-de-recesion"),
    ],
  },
  {
    id: "S30",
    title: "Color dental: blanqueamiento o carillas",
    check: "Blanqueamiento cambia color; carillas también pueden cambiar forma.",
    options: [
      option(
        "Blanqueamiento",
        "b.blanqueamiento-supervisado",
        "m.blanqueamiento-en-consulta",
        "m.blanqueamiento-domiciliario-supervisado",
      ),
      option("Carillas cerámicas", "b.carillas-ceramicas", "m.carillas-ceramicas"),
    ],
  },
];
