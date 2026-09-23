"use client";

import { Badge, Text } from "@mantine/core";
import Link from "next/link";
import { useMemo } from "react";

import {
  clinicalPipelineHref,
  clinicalPipelineProgress,
  type BudgetLifecycleStatus,
  type ClinicalPipelineStepKey,
} from "@/domain";
import { useClinicalSyncQuery, useClinicalWorkflowQuery } from "@/shared/clinical/clinical-data";
import { publicEnv } from "@/shared/config/env";
import { DEMO_APPOINTMENTS } from "@/shared/demo/demo-data";
import { usePatientProjectionQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";

const STEPS: readonly { key: ClinicalPipelineStepKey; label: string }[] = [
  { key: "odontogram", label: "Odontograma" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "plan", label: "Plan" },
  { key: "budget", label: "Presupuesto" },
  { key: "appointments", label: "Citas" },
];

function lifecycleStatus(value: string | undefined): BudgetLifecycleStatus {
  return value === "PRESENTED" || value === "ACCEPTED" || value === "REJECTED" ? value : "DRAFT";
}

export function ClinicalPipelineCard({ patientId }: { patientId?: string }) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const syncQuery = useClinicalSyncQuery(patientId ?? "", Boolean(patientId) && !demoMode);
  const workflowQuery = useClinicalWorkflowQuery(patientId ?? "", Boolean(patientId) && !demoMode);
  const projectionQuery = usePatientProjectionQuery(
    patientId ?? "",
    Boolean(patientId) && !demoMode,
  );

  const progress = useMemo(() => {
    if (!patientId) return null;
    if (demoMode) {
      const futureCount = DEMO_APPOINTMENTS.filter(
        (item) =>
          item.patientId === patientId &&
          !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(item.status),
      ).length;
      return clinicalPipelineProgress({
        patientId,
        odontogramVersion: 1,
        diagnosisCount: 1,
        activePlanItemCount: 0,
        plan: null,
        budget: null,
        futureAppointmentCount: futureCount,
      });
    }
    const sync = syncQuery.data;
    if (!sync) return null;
    const futureCount = (projectionQuery.data?.appointments ?? []).filter(
      (item) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(item.status),
    ).length;
    return clinicalPipelineProgress({
      patientId,
      odontogramVersion: sync.odontogram.version,
      diagnosisCount: workflowQuery.data?.problems.length ?? 0,
      activePlanItemCount: sync.plan.itemCount,
      plan: {
        version: sync.plan.version,
        sourceOdontogramVersion: sync.plan.sourceOdontogramVersion ?? -1,
      },
      budget: sync.budget
        ? {
            id: sync.budget.id,
            status: lifecycleStatus(sync.budget.status),
            sourcePlanVersion: sync.budget.sourcePlanVersion ?? -1,
          }
        : null,
      futureAppointmentCount: futureCount,
    });
  }, [
    demoMode,
    patientId,
    projectionQuery.data?.appointments,
    syncQuery.data,
    workflowQuery.data?.problems.length,
  ]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderText}>
          <h2 className={styles.sectionTitle}>Pipeline clínico</h2>
          <p className={styles.sectionDescription}>
            Del odontograma a la cita, sin perder el paciente.
          </p>
        </div>
        <Badge variant="light">Odontograma → citas</Badge>
      </div>
      <div className={styles.pipeline} role="navigation" aria-label="Pipeline clínico">
        {STEPS.map((step, index) => {
          const completed = progress?.completed.has(step.key) ?? false;
          const current = progress?.current === step.key;
          return (
            <Link
              className={`${styles.pipelineStep} ${completed || current ? styles.pipelineStepActive : ""}`}
              data-current={current}
              href={clinicalPipelineHref(step.key, patientId)}
              key={step.key}
              aria-current={current ? "step" : undefined}
            >
              <span className={styles.pipelineNumber}>{index + 1}</span>
              <Text fw={750} size="sm">
                {step.label}
              </Text>
              <small>{completed ? "Hecho" : current ? "Ahora" : "Abrir"}</small>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
