import type { ClinicalIconFamily } from "./clinical-glyph";

/** Clinical suggestions; prices and duration remain owned by the clinic catalog. */
export const AGENDA_TREATMENT_OPTIONS = [
  {
    label: "Caries",
    family: "restorative_surface",
  },
  {
    label: "Obturación",
    family: "restorative_surface",
  },
  {
    label: "Reconstrucción localizada",
    family: "restorative_surface",
  },
  {
    label: "Reparación de obturación",
    family: "restorative_surface",
  },
  {
    label: "Extracción simple",
    family: "extraction",
  },
  {
    label: "Resto radicular simple",
    family: "extraction",
  },
  {
    label: "Cirugía oral",
    family: "surgery",
  },
  {
    label: "Exodoncia quirúrgica",
    family: "surgery",
  },
  {
    label: "Cordal incluido",
    family: "surgery",
  },
  {
    label: "Colgajo",
    family: "surgery",
  },
  {
    label: "Apicectomía",
    family: "surgery",
  },
  {
    label: "Injerto óseo",
    family: "surgery",
  },
  {
    label: "Regeneración",
    family: "surgery",
  },
  {
    label: "Elevación de seno",
    family: "surgery",
  },
  {
    label: "Cirugía mucogingival",
    family: "surgery",
  },
  {
    label: "Endodoncia",
    family: "endodontics",
  },
  {
    label: "Reendodoncia",
    family: "endodontics",
  },
  {
    label: "Apertura endodóntica",
    family: "endodontics",
  },
  {
    label: "Medicación intraconducto",
    family: "endodontics",
  },
  {
    label: "Control endodóntico",
    family: "endodontics",
  },
  {
    label: "Colocación de implante",
    family: "implantology",
  },
  {
    label: "Segunda fase de implante",
    family: "implantology",
  },
  {
    label: "Descubrimiento de implante",
    family: "implantology",
  },
  {
    label: "Control implantológico",
    family: "implantology",
  },
  {
    label: "Corona",
    family: "crown",
  },
  {
    label: "Provisional de corona",
    family: "crown",
  },
  {
    label: "Prueba de corona",
    family: "crown",
  },
  {
    label: "Cementado de corona",
    family: "crown",
  },
  {
    label: "Puente",
    family: "fixed_prosthesis",
  },
  {
    label: "Prótesis fija",
    family: "fixed_prosthesis",
  },
  {
    label: "Provisional fijo",
    family: "fixed_prosthesis",
  },
  {
    label: "Prueba de estructura",
    family: "fixed_prosthesis",
  },
  {
    label: "Cementado de puente",
    family: "fixed_prosthesis",
  },
  {
    label: "Parcial removible",
    family: "removable_prosthesis",
  },
  {
    label: "Esquelético",
    family: "removable_prosthesis",
  },
  {
    label: "Removible provisional",
    family: "removable_prosthesis",
  },
  {
    label: "Rebase",
    family: "removable_prosthesis",
  },
  {
    label: "Reparación de prótesis removible",
    family: "removable_prosthesis",
  },
  {
    label: "Prueba de prótesis removible",
    family: "removable_prosthesis",
  },
  {
    label: "Prótesis completa",
    family: "complete_denture",
  },
  {
    label: "Dentadura completa",
    family: "complete_denture",
  },
  {
    label: "Prueba de total",
    family: "complete_denture",
  },
  {
    label: "Ajuste de total",
    family: "complete_denture",
  },
  {
    label: "Férula de descarga",
    family: "occlusal_splint",
  },
  {
    label: "Ajuste de férula",
    family: "occlusal_splint",
  },
  {
    label: "Control de férula",
    family: "occlusal_splint",
  },
  {
    label: "Ortodoncia fija",
    family: "orthodontics",
  },
  {
    label: "Brackets",
    family: "orthodontics",
  },
  {
    label: "Revisión de ortodoncia",
    family: "orthodontics",
  },
  {
    label: "Activación de ortodoncia",
    family: "orthodontics",
  },
  {
    label: "Retención de ortodoncia",
    family: "orthodontics",
  },
  {
    label: "Profilaxis",
    family: "periodontal_hygiene",
  },
  {
    label: "Tartrectomía",
    family: "periodontal_hygiene",
  },
  {
    label: "Raspado y alisado radicular",
    family: "periodontal_hygiene",
  },
  {
    label: "Mantenimiento periodontal",
    family: "periodontal_hygiene",
  },
  {
    label: "Desbridamiento",
    family: "periodontal_hygiene",
  },
  {
    label: "Sellador de fosas y fisuras",
    family: "sealant",
  },
  {
    label: "Inlay",
    family: "indirect_restoration",
  },
  {
    label: "Onlay",
    family: "indirect_restoration",
  },
  {
    label: "Overlay",
    family: "indirect_restoration",
  },
  {
    label: "Carilla",
    family: "indirect_restoration",
  },
  {
    label: "Blanqueamiento en clínica",
    family: "whitening",
  },
  {
    label: "Blanqueamiento domiciliario",
    family: "whitening",
  },
  {
    label: "Control de blanqueamiento",
    family: "whitening",
  },
  {
    label: "Periapical",
    family: "imaging",
  },
  {
    label: "Bitewing",
    family: "imaging",
  },
  {
    label: "Panorámica",
    family: "imaging",
  },
  {
    label: "Cbct",
    family: "imaging",
  },
  {
    label: "Escaneado intraoral",
    family: "imaging",
  },
  {
    label: "Registros",
    family: "imaging",
  },
  {
    label: "Primera visita",
    family: "diagnostic",
  },
  {
    label: "Estudio",
    family: "diagnostic",
  },
  {
    label: "Diagnóstico",
    family: "diagnostic",
  },
  {
    label: "Plan de tratamiento",
    family: "diagnostic",
  },
  {
    label: "Revisión",
    family: "review",
  },
  {
    label: "Control",
    family: "review",
  },
  {
    label: "Urgencia dental",
    family: "emergency",
  },
  {
    label: "Dolor agudo",
    family: "emergency",
  },
  {
    label: "Fractura",
    family: "emergency",
  },
  {
    label: "Inflamación aguda",
    family: "emergency",
  },
  {
    label: "Pulpotomía",
    family: "endodontics",
  },
  {
    label: "Pulpectomía",
    family: "endodontics",
  },
  {
    label: "Mantenedor de espacio",
    family: "orthodontics",
  },
  {
    label: "Corona pediátrica",
    family: "crown",
  },
  {
    label: "Perno",
    family: "endodontics",
  },
] as const satisfies readonly { label: string; family: ClinicalIconFamily }[];

export function agendaTreatmentOptions(
  catalog: readonly { name: string; active: boolean }[],
): string[] {
  const names = [
    ...catalog.filter((item) => item.active).map((item) => item.name),
    ...AGENDA_TREATMENT_OPTIONS.map((item) => item.label),
  ];
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
