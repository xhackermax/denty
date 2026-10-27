"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { PageHeader } from "@/shared/ui";

import styles from "@/shared/ui/parity.module.css";

export type ParityModuleKey =
  | "laboratory"
  | "prescriptions"
  | "communications"
  | "recovery"
  | "recalls"
  | "documents"
  | "finance"
  | "analysis"
  | "campaigns"
  | "referrals"
  | "alerts"
  | "attendance"
  | "settings";

interface ModuleWorkbenchProps {
  module: ParityModuleKey;
}

const MODULE_COMPONENTS = {
  laboratory: dynamic(() =>
    import("./modules/laboratory-module").then((value) => value.LaboratoryModule),
  ),
  prescriptions: dynamic(() =>
    import("./modules/prescriptions-module").then((value) => value.PrescriptionsModule),
  ),
  communications: dynamic(() =>
    import("./modules/communications-module").then((value) => value.CommunicationsModule),
  ),
  recovery: dynamic(() =>
    import("./modules/recovery-module").then((value) => value.RecoveryModule),
  ),
  recalls: dynamic(() =>
    import("@/features/recalls/recalls-module").then((value) => value.RecallsModule),
  ),
  documents: dynamic(() =>
    import("./modules/documents-module").then((value) => value.DocumentsModule),
  ),
  finance: dynamic(() => import("./modules/finance-module").then((value) => value.FinanceModule)),
  analysis: dynamic(() =>
    import("./modules/analysis-module").then((value) => value.AnalysisModule),
  ),
  campaigns: dynamic(() =>
    import("./modules/campaigns-module").then((value) => value.CampaignsModule),
  ),
  referrals: dynamic(() =>
    import("@/features/referrals/referrals-module").then((value) => value.ReferralsModule),
  ),
  alerts: dynamic(() => import("./modules/alerts-module").then((value) => value.AlertsModule)),
  attendance: dynamic(() =>
    import("./modules/attendance-module").then((value) => value.AttendanceModule),
  ),
  settings: dynamic(() =>
    import("./modules/settings-module").then((value) => value.SettingsModule),
  ),
} satisfies Record<ParityModuleKey, ComponentType>;

const TITLES: Record<ParityModuleKey, { title: string; description: string }> = {
  laboratory: {
    title: "Laboratorio",
    description: "Trabajos y entregas.",
  },
  prescriptions: {
    title: "Recetas",
    description: "Crear, firmar y consultar recetas.",
  },
  communications: {
    title: "Comunicaciones",
    description: "Mensajes y seguimiento.",
  },
  recovery: {
    title: "Recuperación de pacientes",
    description: "Revisiones pendientes, tratamientos sin cita y presupuestos por responder.",
  },
  recalls: {
    title: "Recalls",
    description: "Revisiones periódicas: a quién llamar, cuándo y con qué resultado.",
  },
  documents: {
    title: "Documentos",
    description: "Firmados, pendientes y archivo.",
  },
  finance: {
    title: "Finanzas",
    description: "Facturas, cobros y VERI*FACTU.",
  },
  analysis: {
    title: "Análisis",
    description: "Indicadores y evolución.",
  },
  campaigns: {
    title: "Campañas",
    description: "Campañas y resultados.",
  },
  referrals: {
    title: "Pacientes asociados",
    description: "Quién ha recomendado a quién y qué beneficios corresponden.",
  },
  alerts: {
    title: "Alertas",
    description: "Avisos importantes.",
  },
  attendance: {
    title: "Fichaje",
    description: "Jornada y ausencias.",
  },
  settings: {
    title: "Ajustes",
    description: "Cuenta, clínica y privacidad.",
  },
};

export function ModuleWorkbench({ module }: ModuleWorkbenchProps) {
  const meta = TITLES[module];
  const Module = MODULE_COMPONENTS[module];
  return (
    <div className={styles.grid}>
      <PageHeader title={meta.title} description={meta.description} />
      <Module />
    </div>
  );
}
