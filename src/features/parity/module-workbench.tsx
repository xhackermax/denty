"use client";

import { PageHeader } from "@/shared/ui";

import styles from "@/shared/ui/parity.module.css";
import { AlertsModule } from "./modules/alerts-module";
import { AnalysisModule } from "./modules/analysis-module";
import { AttendanceModule } from "./modules/attendance-module";
import { CampaignsModule } from "./modules/campaigns-module";
import { CommunicationsModule } from "./modules/communications-module";
import { DocumentsModule } from "./modules/documents-module";
import { FinanceModule } from "./modules/finance-module";
import { LaboratoryModule } from "./modules/laboratory-module";
import { PrescriptionsModule } from "./modules/prescriptions-module";
import { SettingsModule } from "./modules/settings-module";

export type ParityModuleKey =
  | "laboratory"
  | "prescriptions"
  | "communications"
  | "documents"
  | "finance"
  | "analysis"
  | "campaigns"
  | "alerts"
  | "attendance"
  | "settings";

interface ModuleWorkbenchProps {
  module: ParityModuleKey;
}

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

function renderModule(module: ParityModuleKey) {
  switch (module) {
    case "laboratory":
      return <LaboratoryModule />;
    case "prescriptions":
      return <PrescriptionsModule />;
    case "communications":
      return <CommunicationsModule />;
    case "documents":
      return <DocumentsModule />;
    case "finance":
      return <FinanceModule />;
    case "analysis":
      return <AnalysisModule />;
    case "campaigns":
      return <CampaignsModule />;
    case "alerts":
      return <AlertsModule />;
    case "attendance":
      return <AttendanceModule />;
    case "settings":
      return <SettingsModule />;
  }
}

export function ModuleWorkbench({ module }: ModuleWorkbenchProps) {
  const meta = TITLES[module];
  return (
    <div className={styles.grid}>
      <PageHeader eyebrow="Denty" title={meta.title} description={meta.description} />
      {renderModule(module)}
    </div>
  );
}
