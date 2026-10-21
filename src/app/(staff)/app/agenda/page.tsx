import { AgendaPage } from "@/features/agenda/agenda-page";
import { PatientPipelineFromQuery } from "@/shared/patients/patient-pipeline-nav";
import { Suspense } from "react";

export default function AgendaRoute() {
  return (
    <Suspense fallback={null}>
      <PatientPipelineFromQuery current="appointments">
        <AgendaPage />
      </PatientPipelineFromQuery>
    </Suspense>
  );
}
