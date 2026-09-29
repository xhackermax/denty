"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Stepper,
  Text,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendarPlus,
  IconCheck,
  IconPrinter,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { todayMadrid } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { DentyApiError } from "@/shared/api/errors";
import {
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useConsentRequirementsQuery,
  useDocumentTemplatesQuery,
  useSetPlanItemPriceMutation,
  useSignBudgetMutation,
  useSignConsentMutation,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
} from "@/shared/clinical/clinical-data";
import { documentValues, useDocumentContext } from "@/shared/documents/document-context";
import { printClinicalDocument } from "@/shared/documents/print-document";
import { TemplateText } from "@/shared/documents/template-text";
import { usePatientQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";
import {
  TREATMENT_FLOW_STEPS,
  eurosToCents,
  initialTreatmentFlowStep,
  isOpenPlanItem,
  treatmentFlowBlocker,
  type TreatmentFlowState,
  type TreatmentFlowStep,
} from "./treatment-flow-steps";

const STEP_LABELS: Record<TreatmentFlowStep, { label: string; description: string }> = {
  plan: { label: "Plan", description: "Del odontograma" },
  consents: { label: "Consentimientos", description: "Firma del paciente" },
  budget: { label: "Presupuesto", description: "Importe" },
  signature: { label: "Firma", description: "Aceptación" },
  appointments: { label: "Citas", description: "Agendar" },
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof DentyApiError || error instanceof Error ? error.message : fallback;
}

export interface TreatmentFlowModalProps {
  patientId: string;
  opened: boolean;
  onClose: () => void;
}

export function TreatmentFlowModal({ patientId, opened, onClose }: TreatmentFlowModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Tratamiento paso a paso"
      size="xl"
      fullScreen={isMobile}
    >
      {/* Remounted on every open: it always starts from the current clinical state. */}
      {opened ? <TreatmentFlow patientId={patientId} onClose={onClose} /> : null}
    </Modal>
  );
}

function TreatmentFlow({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const syncQuery = useClinicalSyncQuery(patientId);
  const planQuery = useClinicalPlanQuery(patientId);
  const consentsQuery = useConsentRequirementsQuery(patientId);
  const patientQuery = usePatientQuery(patientId);
  const planSync = useSyncPlanFromOdontogramMutation(patientId);
  const budgetSync = useSyncBudgetFromPlanMutation(patientId);
  const [step, setStep] = useState<TreatmentFlowStep | null>(null);
  const started = useRef(false);

  // Opening the flow always derives the plan from the saved odontogram first.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    planSync.mutate();
  }, [planSync]);

  const openItems = useMemo(
    () => (planQuery.data?.items ?? []).filter(isOpenPlanItem),
    [planQuery.data?.items],
  );
  const pendingConsents = (consentsQuery.data?.items ?? []).filter(
    (item) => item.status !== "SATISFIED",
  );
  const syncBudget = syncQuery.data?.budget ?? null;
  const budget = budgetSync.data?.budget ?? null;
  const state: TreatmentFlowState = {
    openItemCount: openItems.length,
    pendingConsentCount: pendingConsents.length,
    budget: syncBudget ? { status: syncBudget.status, outdated: syncBudget.outdated } : null,
  };

  const ready =
    planSync.isSuccess &&
    syncQuery.data &&
    consentsQuery.data &&
    planQuery.isFetched &&
    !syncQuery.isFetching &&
    !planQuery.isFetching &&
    !consentsQuery.isFetching;
  useEffect(() => {
    if (ready && step === null) setStep(initialTreatmentFlowStep(state));
  }, [ready, step, state]);

  // Entering the budget step rebuilds the draft from the plan (never a signed one).
  const enterBudget = () => {
    setStep("budget");
    if (!(syncBudget?.status === "SIGNED" && !syncBudget.outdated)) budgetSync.mutate();
  };

  if (planSync.isError) {
    return (
      <Alert color="red" title="No se pudo preparar el plan">
        {errorText(planSync.error, "Revisa la conexión y vuelve a intentarlo.")}
      </Alert>
    );
  }
  if (!ready || step === null) {
    return (
      <Group gap="sm" py="xl" justify="center">
        <Loader size="sm" />
        <Text c="dimmed">Llevando el odontograma al plan…</Text>
      </Group>
    );
  }

  const index = TREATMENT_FLOW_STEPS.indexOf(step);
  const budgetState: TreatmentFlowState = {
    ...state,
    budget:
      step === "budget" || step === "signature"
        ? budget
          ? { status: budget.status, outdated: false }
          : syncBudget?.status === "SIGNED" && !syncBudget.outdated
            ? { status: "SIGNED", outdated: false }
            : null
        : state.budget,
  };
  const blocker = treatmentFlowBlocker(step, budgetState);
  const goNext = () => {
    const next = TREATMENT_FLOW_STEPS[index + 1];
    if (!next) return onClose();
    if (next === "budget") return enterBudget();
    // Signed budget: the signature step has nothing left to do.
    if (next === "signature" && budgetState.budget?.status === "SIGNED")
      return setStep("appointments");
    setStep(next);
  };
  const goBack = () => {
    const previous = TREATMENT_FLOW_STEPS[index - 1];
    if (previous) setStep(previous);
  };
  const patientName = patientQuery.data
    ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}`.trim()
    : "";
  const summary = planSync.data?.summary;

  return (
    <Stack gap="lg">
      <Stepper active={index} size="sm" allowNextStepsSelect={false}>
        {TREATMENT_FLOW_STEPS.map((key) => (
          <Stepper.Step
            key={key}
            label={STEP_LABELS[key].label}
            aria-label={`${STEP_LABELS[key].label}: ${STEP_LABELS[key].description}`}
          />
        ))}
      </Stepper>

      {step === "plan" ? (
        <PlanStep
          patientId={patientId}
          items={openItems}
          added={summary?.added ?? 0}
          linked={summary?.linked ?? 0}
        />
      ) : null}
      {step === "consents" ? (
        <ConsentsStep
          patientId={patientId}
          patientName={patientName}
          patient={patientQuery.data}
          items={openItems}
          requirements={consentsQuery.data?.items ?? []}
        />
      ) : null}
      {step === "budget" ? (
        <BudgetStep
          loading={budgetSync.isPending}
          error={budgetSync.error}
          budget={budget}
          signed={budgetState.budget?.status === "SIGNED"}
          onRetry={() => budgetSync.mutate()}
        />
      ) : null}
      {step === "signature" && budget ? (
        <SignatureStep
          patientId={patientId}
          patientName={patientName}
          budget={budget}
          onSigned={() => setStep("appointments")}
        />
      ) : null}
      {step === "appointments" ? (
        <AppointmentsStep patientId={patientId} items={openItems} />
      ) : null}

      <Group justify="space-between">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={goBack}
          disabled={index === 0}
        >
          Atrás
        </Button>
        <Group gap="sm">
          {blocker && step !== "appointments" ? (
            <Text size="sm" c="dimmed" maw={320} ta="right">
              {blocker}
            </Text>
          ) : null}
          {step === "appointments" ? (
            <Button leftSection={<IconCheck size={16} />} onClick={onClose}>
              Terminar
            </Button>
          ) : step === "signature" ? null : (
            <Button
              rightSection={<IconArrowRight size={16} />}
              disabled={Boolean(blocker)}
              onClick={goNext}
            >
              Siguiente
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );
}

interface PlanItemView {
  id: string;
  tooth?: string | null | undefined;
  label: string;
  clinicalReason?: string | null | undefined;
  priceCents?: number | null | undefined;
  status: string;
}

function PlanStep({
  patientId,
  items,
  added,
  linked,
}: {
  patientId: string;
  items: PlanItemView[];
  added: number;
  linked: number;
}) {
  const setPrice = useSetPlanItemPriceMutation(patientId);
  const unpriced = items.filter((item) => !item.priceCents).length;
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Lo marcado como pendiente en el odontograma ya está en el plan. Revisa los importes y sigue.
      </Text>
      {added || linked ? (
        <Alert color="teal" variant="light">
          {added
            ? `${plural(added, "tratamiento nuevo", "tratamientos nuevos")} desde el odontograma. `
            : ""}
          {linked
            ? `${plural(linked, "tratamiento que ya estaba", "tratamientos que ya estaban")} en el plan, enlazado${linked === 1 ? "" : "s"} a su diente.`
            : ""}
        </Alert>
      ) : null}
      {items.length === 0 ? (
        <Alert color="yellow" title="El plan está vacío">
          En el odontograma, marca el tratamiento como «pendiente» (por ejemplo, pulsa la superficie
          hasta que la obturación salga en azul), guarda y vuelve aquí.
        </Alert>
      ) : (
        <div className={styles.rowList}>
          {items.map((item) => (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {item.tooth ? `Diente ${item.tooth} · ` : ""}
                  {item.label}
                </span>
                <span className={styles.rowMeta}>{item.clinicalReason ?? "Pendiente"}</span>
              </div>
              <NumberInput
                key={`${item.id}-${item.priceCents ?? 0}`}
                aria-label={`Precio de ${item.label}${item.tooth ? ` en el diente ${item.tooth}` : ""}`}
                w={130}
                min={0}
                decimalScale={2}
                decimalSeparator=","
                thousandSeparator="."
                suffix=" €"
                defaultValue={(item.priceCents ?? 0) / 100}
                error={!item.priceCents}
                onBlur={(event) => {
                  const cents = eurosToCents(event.currentTarget.value);
                  if (cents === null || cents === (item.priceCents ?? 0)) return;
                  setPrice.mutate({ itemId: item.id, priceCents: cents });
                }}
              />
            </div>
          ))}
        </div>
      )}
      {unpriced ? (
        <Text size="xs" c="orange">
          {plural(unpriced, "tratamiento sin precio", "tratamientos sin precio")}. Puedes ponerlo
          aquí; si lo dejas a 0 el presupuesto no lo cobrará.
        </Text>
      ) : null}
      {setPrice.isError ? (
        <Alert color="red">{errorText(setPrice.error, "No se pudo guardar el precio.")}</Alert>
      ) : null}
    </Stack>
  );
}

interface ConsentRequirementView {
  id: string;
  consentCode: string;
  status: string;
  templateId?: string | null | undefined;
  clinicalPlanItemId?: string | null | undefined;
}

interface ConsentPatient {
  firstName: string;
  lastName: string;
  dni?: string | null | undefined;
  recordNumber?: string | null | undefined;
}

function ConsentsStep({
  patientId,
  patientName,
  patient,
  items,
  requirements,
}: {
  patientId: string;
  patientName: string;
  patient: ConsentPatient | undefined;
  items: PlanItemView[];
  requirements: ConsentRequirementView[];
}) {
  const templates = useDocumentTemplatesQuery();
  const context = useDocumentContext();
  const templateFor = (requirement: ConsentRequirementView) =>
    (templates.data?.items ?? []).find((item) => item.id === requirement.templateId) as
      { title?: string; body?: string; code?: string } | undefined;
  // "Obturación · diente 16" for the consent of a plan item.
  const treatmentFor = (requirement: ConsentRequirementView) => {
    const item = items.find((entry) => entry.id === requirement.clinicalPlanItemId);
    return item ? `${item.label}${item.tooth ? ` · diente ${item.tooth}` : ""}` : null;
  };
  const doctor = context.doctorById(context.defaultDoctorId);
  const sign = useSignConsentMutation(patientId);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(patientName);
  const [signature, setSignature] = useState<string | null>(null);
  const titleFor = (requirement: ConsentRequirementView) => {
    const template = (templates.data?.items ?? []).find(
      (item) => item.id === requirement.templateId,
    ) as { title?: string } | undefined;
    return template?.title ?? requirement.consentCode;
  };

  if (requirements.length === 0) {
    return (
      <Alert color="teal" variant="light" title="Sin consentimientos">
        Los tratamientos de este plan no necesitan consentimiento informado.
      </Alert>
    );
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        El paciente firma aquí mismo cada consentimiento que exige el plan.
      </Text>
      <div className={styles.rowList}>
        {requirements.map((requirement) => {
          const done = requirement.status === "SATISFIED";
          const open = signingId === requirement.id;
          return (
            <div className={styles.row} key={requirement.id}>
              <Stack gap="xs" w="100%">
                <Group justify="space-between">
                  <span className={styles.rowTitle}>{titleFor(requirement)}</span>
                  {done ? (
                    <Badge color="green">Firmado</Badge>
                  ) : open ? null : (
                    <Button
                      size="xs"
                      disabled={!requirement.templateId}
                      onClick={() => {
                        setSigningId(requirement.id);
                        setSignature(null);
                        sign.reset();
                      }}
                    >
                      Firmar
                    </Button>
                  )}
                </Group>
                {!requirement.templateId && !done ? (
                  <Text size="xs" c="orange">
                    Falta la plantilla {requirement.consentCode} en Documentos.
                  </Text>
                ) : null}
                {open && !done ? (
                  <Stack gap="xs">
                    {templateFor(requirement)?.body ? (
                      <div className={styles.consentText}>
                        <TemplateText
                          body={templateFor(requirement)?.body ?? ""}
                          values={documentValues({
                            patient: patient ?? null,
                            doctor,
                            clinicName: context.clinicName,
                            city: context.site?.city,
                            date: todayMadrid(),
                            treatment: treatmentFor(requirement),
                          })}
                        />
                      </div>
                    ) : null}
                    <TextInput
                      label="Nombre de quien firma"
                      value={signerName}
                      onChange={(event) => setSignerName(event.currentTarget.value)}
                    />
                    <SignaturePad onChange={setSignature} />
                    {sign.isError ? (
                      <Alert color="red">
                        {errorText(sign.error, "No se pudo firmar el consentimiento.")}
                      </Alert>
                    ) : null}
                    <Group justify="flex-end">
                      <Button variant="default" size="xs" onClick={() => setSigningId(null)}>
                        Cancelar
                      </Button>
                      {patient && templateFor(requirement)?.body ? (
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPrinter size={14} />}
                          onClick={() =>
                            printClinicalDocument({
                              title: titleFor(requirement),
                              templateCode: templateFor(requirement)?.code,
                              templateBody: templateFor(requirement)?.body ?? "",
                              patient,
                              context,
                              data: {
                                doctorId: context.defaultDoctorId,
                                tratamiento: treatmentFor(requirement),
                              },
                            })
                          }
                        >
                          Imprimir para leer
                        </Button>
                      ) : null}
                      <Button
                        size="xs"
                        loading={sign.isPending}
                        disabled={!signature || signerName.trim().length < 2}
                        onClick={() => {
                          if (!signature || !requirement.templateId) return;
                          sign.mutate(
                            {
                              templateId: requirement.templateId,
                              title: titleFor(requirement),
                              signerName: signerName.trim(),
                              signatureDataUrl: signature,
                              data: {
                                doctorId: context.defaultDoctorId,
                                tratamiento: treatmentFor(requirement),
                              },
                            },
                            { onSuccess: () => setSigningId(null) },
                          );
                        }}
                      >
                        Guardar firma
                      </Button>
                    </Group>
                  </Stack>
                ) : null}
              </Stack>
            </div>
          );
        })}
      </div>
    </Stack>
  );
}

interface BudgetView {
  id: string;
  code: string;
  status: string;
  totalCents: number;
  version?: number | undefined;
  items: Array<{
    id: string;
    description: string;
    tooth?: string | null | undefined;
    totalCents: number;
  }>;
}

function BudgetStep({
  loading,
  error,
  budget,
  signed,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  budget: BudgetView | null;
  signed: boolean;
  onRetry: () => void;
}) {
  if (signed && !budget) {
    return (
      <Alert color="green" title="Presupuesto firmado">
        El presupuesto actual ya está firmado. Sigue para dar las citas.
      </Alert>
    );
  }
  if (loading) {
    return (
      <Group gap="sm" py="md">
        <Loader size="sm" />
        <Text c="dimmed">Actualizando el presupuesto con el plan…</Text>
      </Group>
    );
  }
  if (error || !budget) {
    return (
      <Alert color="red" title="No se pudo preparar el presupuesto">
        <Stack gap="xs">
          <Text size="sm">{errorText(error, "Inténtalo de nuevo.")}</Text>
          <Button size="xs" variant="light" onClick={onRetry}>
            Reintentar
          </Button>
        </Stack>
      </Alert>
    );
  }
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={700}>Presupuesto {budget.code}</Text>
        <Badge variant="light">{budget.status === "SIGNED" ? "Firmado" : "Borrador"}</Badge>
      </Group>
      <div className={styles.rowList}>
        {budget.items.map((item) => (
          <div className={styles.row} key={item.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {item.tooth ? `Diente ${item.tooth} · ` : ""}
                {item.description}
              </span>
            </div>
            <Text fw={600}>{formatEUR(item.totalCents)}</Text>
          </div>
        ))}
      </div>
      <Group justify="flex-end">
        <Text fw={800} size="lg">
          Total {formatEUR(budget.totalCents)}
        </Text>
      </Group>
      {budget.totalCents === 0 ? (
        <Text size="xs" c="orange">
          El total es 0 €. Si no es gratuito, vuelve al plan y pon los precios.
        </Text>
      ) : null}
    </Stack>
  );
}

function SignatureStep({
  patientId,
  patientName,
  budget,
  onSigned,
}: {
  patientId: string;
  patientName: string;
  budget: BudgetView;
  onSigned: () => void;
}) {
  const signBudget = useSignBudgetMutation(patientId);
  const [signerName, setSignerName] = useState(patientName);
  const [signature, setSignature] = useState<string | null>(null);
  return (
    <Stack gap="sm">
      <Text size="sm">
        {patientName || "El paciente"} acepta el presupuesto {budget.code} por{" "}
        <strong>{formatEUR(budget.totalCents)}</strong>.
      </Text>
      <TextInput
        label="Nombre de quien firma"
        value={signerName}
        onChange={(event) => setSignerName(event.currentTarget.value)}
      />
      <SignaturePad onChange={setSignature} />
      {signBudget.isError ? (
        <Alert color="red">
          {errorText(signBudget.error, "No se pudo firmar el presupuesto.")}
        </Alert>
      ) : null}
      <Group justify="flex-end">
        <Button
          color="teal"
          loading={signBudget.isPending}
          disabled={!signature || signerName.trim().length < 2 || !budget.version}
          onClick={() => {
            if (!signature || !budget.version) return;
            signBudget.mutate(
              {
                budgetId: budget.id,
                expectedVersion: budget.version,
                signerName: signerName.trim(),
                signatureData: signature,
              },
              { onSuccess: onSigned },
            );
          }}
        >
          Firmar y continuar
        </Button>
      </Group>
    </Stack>
  );
}

function AppointmentsStep({ patientId, items }: { patientId: string; items: PlanItemView[] }) {
  return (
    <Stack gap="sm">
      <Alert color="green" variant="light" title="Presupuesto firmado">
        Da cita a cada tratamiento. La agenda se abre con el paciente y el tratamiento ya elegidos.
      </Alert>
      <div className={styles.rowList}>
        {items.map((item) => (
          <div className={styles.row} key={item.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {item.tooth ? `Diente ${item.tooth} · ` : ""}
                {item.label}
              </span>
              <span className={styles.rowMeta}>{item.clinicalReason ?? ""}</span>
            </div>
            <Button
              size="xs"
              component={Link}
              href={`/app/agenda?patientId=${encodeURIComponent(patientId)}&planItemId=${encodeURIComponent(item.id)}`}
              leftSection={<IconCalendarPlus size={14} />}
            >
              Dar cita
            </Button>
          </div>
        ))}
      </div>
    </Stack>
  );
}
