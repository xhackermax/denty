"use client";

import { Badge, Button, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  canNavigateToClinicalPipelineStep,
  clinicalPipelineHref,
  clinicalPipelineProgress,
  type BudgetLifecycleStatus,
  type ClinicalPipelineStepKey,
} from "@/domain";
import {
  useClinicalSyncQuery,
  useClinicalWorkflowQuery,
  useConsentRequirementsQuery,
} from "@/shared/clinical/clinical-data";
import { usePatientProjectionQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";
import { TreatmentFlowModal } from "./treatment-flow";

const STEPS: readonly { key: ClinicalPipelineStepKey; label: string }[] = [
  { key: "odontogram", label: "Odontograma" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "plan", label: "Plan" },
  { key: "consents", label: "Consentimientos" },
  { key: "budget", label: "Presupuesto" },
  { key: "signature", label: "Firma" },
  { key: "appointments", label: "Citas" },
];

function lifecycleStatus(value: string | undefined): BudgetLifecycleStatus {
  return value === "PRESENTED" || value === "ACCEPTED" || value === "REJECTED" || value === "SIGNED"
    ? value
    : "DRAFT";
}

export function ClinicalPipelineCard({ patientId }: { patientId: string }) {
  const [flowOpen, setFlowOpen] = useState(false);
  const syncQuery = useClinicalSyncQuery(patientId ?? "", Boolean(patientId));
  const workflowQuery = useClinicalWorkflowQuery(patientId ?? "", Boolean(patientId));
  const consentRequirementsQuery = useConsentRequirementsQuery(patientId ?? "", Boolean(patientId));
  const projectionQuery = usePatientProjectionQuery(patientId ?? "", Boolean(patientId));
  const progress = useMemo(() => {
    if (!patientId) return null;
    const sync = syncQuery.data;
    if (!sync) return null;
    const selectedPlanItemIds = new Set(sync.budget?.selectedPlanItemIds ?? []);
    const futureCount = (projectionQuery.data?.appointments ?? []).filter(
      (item) =>
        !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(item.status) &&
        (selectedPlanItemIds.size === 0 ||
          (item.clinicalPlanItemId ? selectedPlanItemIds.has(item.clinicalPlanItemId) : false)),
    ).length;
    const requiredConsents = (consentRequirementsQuery.data?.items ?? []).filter(
      (item) =>
        item.requiredBefore === "BUDGET_SIGNATURE" &&
        (selectedPlanItemIds.size === 0 ||
          !item.clinicalPlanItemId ||
          selectedPlanItemIds.has(item.clinicalPlanItemId)),
    );
    const signedRequiredConsentCount = requiredConsents.filter(
      (item) => item.status === "SATISFIED",
    ).length;
    const budgetSigned = sync.budget?.status === "SIGNED";
    return clinicalPipelineProgress({
      patientId,
      odontogramVersion: sync.odontogram.version,
      diagnosisCount: workflowQuery.data?.problems.length ?? 0,
      activePlanItemCount:
        sync.budget?.status === "SIGNED" && selectedPlanItemIds.size > 0
          ? selectedPlanItemIds.size
          : sync.plan.itemCount,
      plan: {
        version: sync.plan.version,
        sourceOdontogramVersion: sync.plan.sourceOdontogramVersion ?? -1,
      },
      requiredConsentCount: requiredConsents.length,
      signedRequiredConsentCount,
      budget: sync.budget
        ? {
            id: sync.budget.id,
            status: lifecycleStatus(sync.budget.status),
            sourcePlanVersion: sync.budget.sourcePlanVersion ?? -1,
          }
        : null,
      budgetSigned,
      futureAppointmentCount: futureCount,
    });
  }, [
    consentRequirementsQuery.data?.items,
    patientId,
    projectionQuery.data?.appointments,
    syncQuery.data,
    workflowQuery.data?.problems.length,
  ]);

  // Un paciente concreto es obligatorio: no existe un pipeline clínico global.
  if (!patientId) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderText}>
          <h2 className={styles.sectionTitle}>Pipeline clínico</h2>
          <p className={styles.sectionDescription}>
            Del odontograma a los consentimientos, presupuesto, firma y cita.
          </p>
        </div>
        <div>
          {patientId ? (
            <Button
              size="xs"
              color="teal"
              mr="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => setFlowOpen(true)}
            >
              Continuar paso a paso
            </Button>
          ) : null}
          <Badge variant="light">Plan → consentimientos → presupuesto → firma → citas</Badge>
          {syncQuery.data?.budget?.outdated ? (
            <Badge color="yellow" variant="light" ml="xs">
              Crear revisión del presupuesto
            </Badge>
          ) : null}
        </div>
      </div>
      <div className={styles.pipeline} role="navigation" aria-label="Pipeline clínico">
        {STEPS.map((step, index) => {
          const completed = progress?.completed.has(step.key) ?? false;
          const current = progress?.current === step.key;
          const navigable = progress
            ? canNavigateToClinicalPipelineStep(progress, step.key)
            : false;
          const className = `${styles.pipelineStep} ${completed || current ? styles.pipelineStepActive : ""}`;
          const content = (
            <>
              <span className={styles.pipelineNumber}>{index + 1}</span>
              <Text fw={750} size="sm">
                {step.label}
              </Text>
              <small>
                {completed
                  ? "Hecho"
                  : current
                    ? "Ahora"
                    : step.key === "consents"
                      ? "Firma CI"
                      : step.key === "appointments"
                        ? "Firma presupuesto"
                        : "Pendiente"}
              </small>
            </>
          );

          return navigable ? (
            <Link
              className={className}
              data-current={current}
              href={clinicalPipelineHref(step.key, patientId)}
              key={step.key}
              aria-current={current ? "step" : undefined}
            >
              {content}
            </Link>
          ) : (
            <div
              className={className}
              data-current={current}
              data-disabled="true"
              key={step.key}
              aria-disabled="true"
              title={
                step.key === "budget" || step.key === "signature"
                  ? "Firma primero todos los consentimientos informados requeridos por el plan."
                  : step.key === "appointments"
                    ? "El paciente debe firmar el presupuesto antes de crear citas."
                    : "Completa el paso anterior."
              }
            >
              {content}
            </div>
          );
        })}
      </div>
      {patientId ? (
        <TreatmentFlowModal
          patientId={patientId}
          opened={flowOpen}
          onClose={() => setFlowOpen(false)}
        />
      ) : null}
    </section>
  );
}
