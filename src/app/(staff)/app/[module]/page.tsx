import { notFound } from "next/navigation";

import {
  ModuleWorkbench,
  type ParityModuleKey,
} from "@/features/parity/module-workbench";

const MODULES = new Set<ParityModuleKey>([
  "laboratory",
  "prescriptions",
  "communications",
  "documents",
  "finance",
  "analysis",
  "campaigns",
  "alerts",
  "attendance",
  "settings",
]);

interface ModulePageProps {
  params: Promise<{ module: string }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;
  if (!MODULES.has(module as ParityModuleKey)) notFound();
  return <ModuleWorkbench module={module as ParityModuleKey} />;
}
