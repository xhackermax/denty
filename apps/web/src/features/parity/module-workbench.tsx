"use client";

import { Badge } from "@mantine/core";
import {
  IconBell,
  IconChartBar,
  IconCreditCard,
  IconFileText,
  IconMessage,
  IconMicroscope,
  IconPill,
  IconSettings,
  IconSpeakerphone,
} from "@tabler/icons-react";

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
    description: "Trabajos, estados, entregas, repeticiones y recepción de laboratorio.",
  },
  prescriptions: {
    title: "Recetas",
    description: "Borradores, validación profesional, anulación y datos del prescriptor.",
  },
  communications: {
    title: "Comunicaciones",
    description: "WhatsApp, SMS y email con categorías, consentimiento y trazabilidad.",
  },
  documents: {
    title: "Documentos",
    description: "Plantillas, consentimientos, presupuestos, firma, entrega y archivo.",
  },
  finance: {
    title: "Finanzas",
    description: "Producción, facturación, cobros, pendientes, series y rectificativas.",
  },
  analysis: {
    title: "Análisis",
    description: "KPIs clínicos y económicos, atribución y seguimiento histórico.",
  },
  campaigns: {
    title: "Campañas",
    description: "Meta, Google y campañas internas con gasto, leads y estado.",
  },
  alerts: {
    title: "Alertas",
    description: "Centro de atención clínica, operativa, financiera y de seguridad.",
  },
  attendance: {
    title: "Fichaje",
    description: "Entrada, salida, jornada, ausencias parciales y control horario.",
  },
  settings: {
    title: "Ajustes",
    description: "Usuarios, privacidad, copias, sesiones, receta, marketing y apariencia.",
  },
};

const ICONS = {
  laboratory: IconMicroscope,
  prescriptions: IconPill,
  communications: IconMessage,
  documents: IconFileText,
  finance: IconCreditCard,
  analysis: IconChartBar,
  campaigns: IconSpeakerphone,
  alerts: IconBell,
  attendance: IconCreditCard,
  settings: IconSettings,
} as const;

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
  const Icon = ICONS[module];

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Denty · paridad 2.3.7"
        title={meta.title}
        description={meta.description}
        actions={
          <Badge size="lg" variant="light" leftSection={<Icon size={14} />}>
            Recuperado
          </Badge>
        }
      />
      {renderModule(module)}
    </div>
  );
}
