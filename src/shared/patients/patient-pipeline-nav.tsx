"use client";

import { Button } from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconFileText,
  IconHeartbeat,
  IconListCheck,
  IconReceipt,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import {
  PATIENT_PIPELINE_STEPS,
  adjacentPipelineSteps,
  patientPipelineHref,
  type PatientPipelineStepKey,
} from "./patient-pipeline";
import styles from "./patient-pipeline-nav.module.css";

const STEP_ICONS: Readonly<Record<PatientPipelineStepKey, typeof IconHeartbeat>> = {
  odontogram: IconHeartbeat,
  plan: IconListCheck,
  budget: IconReceipt,
  documents: IconFileText,
  appointments: IconCalendar,
};

interface PatientPipelineProps {
  patientId: string;
  current?: PatientPipelineStepKey;
}

export function PatientPipelineNav({ patientId, current }: PatientPipelineProps) {
  return (
    <nav className={styles.steps} aria-label="Pasos del paciente">
      {PATIENT_PIPELINE_STEPS.map((step, index) => {
        const Icon = STEP_ICONS[step.key];
        const active = step.key === current;
        return (
          <Link
            key={step.key}
            href={patientPipelineHref(step.key, patientId)}
            className={styles.step}
            data-active={active}
            {...(active ? { "aria-current": "step" as const } : {})}
          >
            <span className={styles.stepIndex} aria-hidden>
              {index + 1}
            </span>
            <Icon size={18} aria-hidden />
            <span>{step.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function PatientPipelineStepper({ patientId, current }: Required<PatientPipelineProps>) {
  const { previous, next } = adjacentPipelineSteps(current);
  return (
    <div className={styles.stepper}>
      {previous ? (
        <Button
          component={Link}
          href={patientPipelineHref(previous.key, patientId)}
          variant="default"
          leftSection={<IconArrowLeft size={17} />}
          aria-label={`Anterior: ${previous.label}`}
          className={styles.previous}
        >
          {previous.label}
        </Button>
      ) : null}
      {next ? (
        <Button
          component={Link}
          href={patientPipelineHref(next.key, patientId)}
          rightSection={<IconArrowRight size={17} />}
          aria-label={`Siguiente: ${next.label}`}
          className={styles.next}
        >
          {next.label}
        </Button>
      ) : null}
    </div>
  );
}

export function PatientPipelineFrame({
  patientId,
  current,
  children,
}: Required<PatientPipelineProps> & { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <PatientPipelineNav patientId={patientId} current={current} />
      {children}
      <PatientPipelineStepper patientId={patientId} current={current} />
    </div>
  );
}

// Documentos y Citas también se usan fuera de una ficha: solo muestran el
// pipeline cuando llegan desde un paciente (?patientId=…).
export function PatientPipelineFromQuery({
  current,
  children,
}: {
  current: PatientPipelineStepKey;
  children: ReactNode;
}) {
  const patientId = useSearchParams().get("patientId");
  if (!patientId) return <>{children}</>;
  return (
    <PatientPipelineFrame patientId={patientId} current={current}>
      {children}
    </PatientPipelineFrame>
  );
}
