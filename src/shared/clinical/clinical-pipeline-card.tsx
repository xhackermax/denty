"use client";

import { Badge, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  canNavigateToClinicalPipelineStep,
  clinicalPipelineHref,
  clinicalPipelineProgress,
  type BudgetLifecycleStatus,
  type ClinicalPipelineStepKey,
} from "@/domain";
import {
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useClinicalWorkflowQuery,
} from "@/shared/clinical/clinical-data";
import { publicEnv } from "@/shared/config/env";
import { DEMO_APPOINTMENTS, DEMO_BUDGETS } from "@/shared/demo/demo-data";
import { usePatientProjectionQuery } from "@/shared/patients/patient-data";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { readDemoBudgetSignature } from "@/features/budgets/budget-signature-storage";
import {
  CONSENT_SIGNATURE_CHANGED_EVENT,
  demoRequiredConsentTemplates,
  readDemoSignedConsentCodes,
} from "@/features/documents/consent-status";
import { requiredConsentTemplates, signedConsentTemplateCodes } from "@/domain/consent-requirements";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";

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
  return value === "PRESENTED" || value === "ACCEPTED" || value === "REJECTED" ? value : "DRAFT";
}

export function ClinicalPipelineCard({ patientId }: { patientId?: string }) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const syncQuery = useClinicalSyncQuery(patientId ?? "", Boolean(patientId) && !demoMode);
  const workflowQuery = useClinicalWorkflowQuery(patientId ?? "", Boolean(patientId) && !demoMode);
  const planQuery = useClinicalPlanQuery(patientId ?? "", Boolean(patientId) && !demoMode);
  const projectionQuery = usePatientProjectionQuery(
    patientId ?? "",
    Boolean(patientId) && !demoMode,
  );
  const documentsQuery = useQuery({
    queryKey: dentyQueryKeys.documents.patient(patientId ?? ""),
    queryFn: () => getBrowserApi().documents.list(patientId),
    enabled: Boolean(patientId) && !demoMode,
  });
  const [demoSignatureVersion, setDemoSignatureVersion] = useState(0);
  const [demoConsentVersion, setDemoConsentVersion] = useState(0);

  useEffect(() => {
    if (!demoMode) return;
    const refreshBudget = () => setDemoSignatureVersion((current) => current + 1);
    const refreshConsents = () => setDemoConsentVersion((current) => current + 1);
    window.addEventListener("denty:budget-signature-changed", refreshBudget);
    window.addEventListener(CONSENT_SIGNATURE_CHANGED_EVENT, refreshConsents);
    return () => {
      window.removeEventListener("denty:budget-signature-changed", refreshBudget);
      window.removeEventListener(CONSENT_SIGNATURE_CHANGED_EVENT, refreshConsents);
    };
  }, [demoMode]);

  const progress = useMemo(() => {
    if (!patientId) return null;
    if (demoMode) {
      const futureCount = DEMO_APPOINTMENTS.filter(
        (item) =>
          item.patientId === patientId &&
          !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(item.status),
      ).length;
      const demoBudget = DEMO_BUDGETS.find((item) => item.patientId === patientId) ?? null;
      const demoSource = demoBudget
        ? {
            budgetId: demoBudget.id,
            totalCents: demoBudget.totalCents,
            sourcePlanVersion: 1,
          }
        : null;
      const demoSigned = demoSource ? Boolean(readDemoBudgetSignature(demoSource)) : false;
      const requiredConsents = demoRequiredConsentTemplates(patientId);
      const signedConsentCodes = readDemoSignedConsentCodes(patientId);
      const signedRequiredConsentCount = requiredConsents.filter((item) =>
        signedConsentCodes.has(item.code),
      ).length;
      return clinicalPipelineProgress({
        patientId,
        odontogramVersion: 1,
        diagnosisCount: 1,
        activePlanItemCount: 1,
        plan: { version: 1, sourceOdontogramVersion: 1 },
        requiredConsentCount: requiredConsents.length,
        signedRequiredConsentCount,
        budget: demoBudget
          ? {
              id: demoBudget.id,
              status: lifecycleStatus(demoBudget.status),
              sourcePlanVersion: 1,
            }
          : null,
        budgetSigned: demoSigned,
        futureAppointmentCount: futureCount,
      });
    }
    const sync = syncQuery.data;
    if (!sync) return null;
    const futureCount = (projectionQuery.data?.appointments ?? []).filter(
      (item) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(item.status),
    ).length;
    const requiredConsents = requiredConsentTemplates(planQuery.data?.items ?? []);
    const signedConsentCodes = signedConsentTemplateCodes(documentsQuery.data?.items ?? []);
    const signedRequiredConsentCount = requiredConsents.filter((item) =>
      signedConsentCodes.has(item.code),
    ).length;
    const budgetSigned = sync.budget
      ? (documentsQuery.data?.items ?? []).some(
          (document) =>
            document.type === "BUDGET" &&
            document.title ===
              `Presupuesto ${sync.budget?.code ?? ""} · v${sync.budget?.sourcePlanVersion ?? 0} · ${formatEUR(sync.budget?.totalCents ?? 0)}` &&
            ["SIGNED", "DELIVERED", "ARCHIVED"].includes(document.status),
        )
      : false;
    return clinicalPipelineProgress({
      patientId,
      odontogramVersion: sync.odontogram.version,
      diagnosisCount: workflowQuery.data?.problems.length ?? 0,
      activePlanItemCount: sync.plan.itemCount,
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
    demoMode,
    demoConsentVersion,
    demoSignatureVersion,
    documentsQuery.data?.items,
    patientId,
    planQuery.data?.items,
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
            Del odontograma a los consentimientos, presupuesto, firma y cita.
          </p>
        </div>
        <Badge variant="light">Plan → consentimientos → presupuesto → firma → citas</Badge>
      </div>
      <div className={styles.pipeline} role="navigation" aria-label="Pipeline clínico">
        {STEPS.map((step, index) => {
          const completed = progress?.completed.has(step.key) ?? false;
          const current = progress?.current === step.key;
          const navigable = progress ? canNavigateToClinicalPipelineStep(progress, step.key) : false;
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
    </section>
  );
}
