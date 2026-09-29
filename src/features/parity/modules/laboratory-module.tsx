"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { clinicalPipelineHref } from "@/domain";
import { formatEUR } from "@/domain/money";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
import {
  useAllocateSupplierPaymentMutation,
  useCreateLaboratoryMutation,
  useCreateLabWorkMutation,
  useLabAttachmentMutation,
  useLaboratoriesQuery,
  useLaboratoryBalancesQuery,
  useLaboratoryQuery,
  useLabReworkMutation,
  useLabTransitionMutation,
  usePatientClinicalPlanQuery,
  useRecordSupplierInvoiceMutation,
  useRecordSupplierPaymentMutation,
  useSupplierInvoicesQuery,
  useUpdateLaboratoryMutation,
} from "./laboratory-data";

function centsFromEuros(value: number | string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

function nextLabStatus(status: string): "SENT" | "IN_PRODUCTION" | "RECEIVED" | "PLACED" | null {
  if (["PLANNED", "IMPRESSION_TAKEN", "SCANNED"].includes(status)) return "SENT";
  if (status === "SENT") return "IN_PRODUCTION";
  if (["IN_PRODUCTION", "TRIAL", "INCIDENT"].includes(status)) return "RECEIVED";
  if (status === "RECEIVED") return "PLACED";
  return null;
}

export function LaboratoryModule() {
  const searchParams = useSearchParams();
  const { permissions } = useActiveTenant();
  const canReadFinance = permissions.includes("finance.read");
  const canWriteFinance = permissions.includes("finance.write");
  const deepLinkedPatientId = searchParams.get("patientId");
  const deepLinkedPlanItemId = searchParams.get("planItemId");
  const works = useLaboratoryQuery();
  const laboratories = useLaboratoriesQuery();
  const balances = useLaboratoryBalancesQuery(canReadFinance);
  const supplierInvoices = useSupplierInvoicesQuery(canReadFinance);
  const patients = usePatientsQuery();
  const createWork = useCreateLabWorkMutation();
  const transition = useLabTransitionMutation();
  const rework = useLabReworkMutation();
  const addAttachment = useLabAttachmentMutation();
  const createLaboratory = useCreateLaboratoryMutation();
  const updateLaboratory = useUpdateLaboratoryMutation();
  const recordInvoice = useRecordSupplierInvoiceMutation();
  const recordPayment = useRecordSupplierPaymentMutation();
  const allocatePayment = useAllocateSupplierPaymentMutation();

  const [patientId, setPatientId] = useState<string | null>(deepLinkedPatientId);
  const patientPlan = usePatientClinicalPlanQuery(patientId);
  const [laboratoryId, setLaboratoryId] = useState<string | null>(null);
  const [clinicalPlanItemId, setClinicalPlanItemId] = useState<string | null>(deepLinkedPlanItemId);
  const [title, setTitle] = useState("");
  const [workCostEuros, setWorkCostEuros] = useState<number | string>(0);
  const [reworkWorkId, setReworkWorkId] = useState<string | null>(null);
  const [reworkReason, setReworkReason] = useState("");
  const [reworkCostEuros, setReworkCostEuros] = useState<number | string>(0);

  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labName, setLabName] = useState("");
  const [labTaxId, setLabTaxId] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [labEmail, setLabEmail] = useState("");
  const [labTurnaround, setLabTurnaround] = useState<number | string>(7);

  const [invoiceLabId, setInvoiceLabId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceTotalEuros, setInvoiceTotalEuros] = useState<number | string>(0);
  const [paymentLabId, setPaymentLabId] = useState<string | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentEuros, setPaymentEuros] = useState<number | string>(0);

  const hasError =
    works.isError ||
    laboratories.isError ||
    patients.isError ||
    (canReadFinance && (balances.isError || supplierInvoices.isError));
  const labOptions = (laboratories.data?.items ?? [])
    .filter((lab) => lab.active)
    .map((lab) => ({ value: lab.id, label: lab.name }));
  const planOptions = (patientPlan.data?.items ?? []).map((item) => ({
    value: item.id,
    label: `${item.tooth ? `${item.tooth} · ` : ""}${item.label}`,
  }));
  const invoiceOptions = (supplierInvoices.data?.items ?? [])
    .filter((invoice) => !paymentLabId || invoice.laboratoryId === paymentLabId)
    .filter((invoice) => invoice.status !== "PAID" && invoice.status !== "VOID")
    .map((invoice) => ({
      value: invoice.id,
      label: `${invoice.invoiceNumber} · ${formatEUR(invoice.totalCents)}`,
    }));

  const clearLabForm = () => {
    setEditingLabId(null);
    setLabName("");
    setLabTaxId("");
    setLabPhone("");
    setLabEmail("");
    setLabTurnaround(7);
  };

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">No se pudieron cargar todos los datos de laboratorio.</Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Laboratorios</h3>
            <p className={styles.sectionDescription}>
              Maestro persistente de la clínica. Los laboratorios desactivados conservan su
              histórico.
            </p>
          </div>
          <Badge variant="light">{laboratories.data?.items.length ?? 0}</Badge>
        </Group>
        <Group grow align="end">
          <TextInput
            label="Nombre"
            value={labName}
            onChange={(event) => setLabName(event.currentTarget.value)}
          />
          <TextInput
            label="NIF/CIF"
            value={labTaxId}
            onChange={(event) => setLabTaxId(event.currentTarget.value)}
          />
          <TextInput
            label="Teléfono"
            value={labPhone}
            onChange={(event) => setLabPhone(event.currentTarget.value)}
          />
          <TextInput
            label="Email"
            value={labEmail}
            onChange={(event) => setLabEmail(event.currentTarget.value)}
          />
          <NumberInput
            label="Plazo habitual (días)"
            min={0}
            max={365}
            value={labTurnaround}
            onChange={setLabTurnaround}
          />
          <Button
            disabled={!labName.trim()}
            loading={createLaboratory.isPending || updateLaboratory.isPending}
            onClick={() => {
              const payload = {
                name: labName.trim(),
                taxId: labTaxId,
                phone: labPhone,
                email: labEmail,
                defaultTurnaroundDays: Number(labTurnaround) || 0,
              };
              if (editingLabId) {
                const current = laboratories.data?.items.find((lab) => lab.id === editingLabId);
                if (!current) return;
                updateLaboratory.mutate(
                  { id: editingLabId, payload: { ...payload, expectedVersion: current.version } },
                  { onSuccess: clearLabForm },
                );
              } else {
                createLaboratory.mutate(payload, { onSuccess: clearLabForm });
              }
            }}
          >
            {editingLabId ? "Guardar" : "Crear laboratorio"}
          </Button>
          {editingLabId ? (
            <Button variant="subtle" onClick={clearLabForm}>
              Cancelar
            </Button>
          ) : null}
        </Group>
        <div className={styles.rowList}>
          {(laboratories.data?.items ?? []).map((lab) => (
            <div className={styles.row} key={lab.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{lab.name}</span>
                <span className={styles.rowMeta}>
                  {lab.taxId || "Sin NIF/CIF"} · {lab.defaultTurnaroundDays} días ·{" "}
                  {lab.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setEditingLabId(lab.id);
                    setLabName(lab.name);
                    setLabTaxId(lab.taxId ?? "");
                    setLabPhone(lab.phone ?? "");
                    setLabEmail(lab.email ?? "");
                    setLabTurnaround(lab.defaultTurnaroundDays);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() =>
                    updateLaboratory.mutate({
                      id: lab.id,
                      payload: { expectedVersion: lab.version, active: !lab.active },
                    })
                  }
                >
                  {lab.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Nuevo trabajo</h3>
            <p className={styles.sectionDescription}>
              Conecta paciente, laboratorio y, cuando existe, el item del plan clínico.
            </p>
          </div>
          <Badge variant="light">Servidor</Badge>
        </Group>
        <Group grow align="end">
          <Select
            searchable
            clearable
            label="Paciente"
            value={patientId}
            onChange={(value) => {
              setPatientId(value);
              setClinicalPlanItemId(null);
            }}
            data={(patients.data?.items ?? []).map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName}`,
            }))}
          />
          <Select
            searchable
            clearable
            label="Laboratorio"
            value={laboratoryId}
            onChange={setLaboratoryId}
            data={labOptions}
          />
          <Select
            searchable
            clearable={!deepLinkedPlanItemId}
            label="Tratamiento del plan"
            value={clinicalPlanItemId}
            onChange={setClinicalPlanItemId}
            data={planOptions}
            disabled={!patientId || Boolean(deepLinkedPlanItemId)}
          />
          <TextInput
            label="Trabajo"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <NumberInput
            label="Coste previsto (€)"
            min={0}
            decimalScale={2}
            value={workCostEuros}
            onChange={setWorkCostEuros}
          />
          <Button
            disabled={!patientId || !laboratoryId || !title.trim()}
            loading={createWork.isPending}
            onClick={() => {
              if (!patientId || !laboratoryId) return;
              createWork.mutate(
                {
                  patientId,
                  laboratoryId,
                  clinicalPlanItemId: clinicalPlanItemId ?? undefined,
                  title: title.trim(),
                  costCents: centsFromEuros(workCostEuros),
                },
                {
                  onSuccess: () => {
                    setTitle("");
                    setClinicalPlanItemId(null);
                    setWorkCostEuros(0);
                  },
                },
              );
            }}
          >
            Crear trabajo
          </Button>
        </Group>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Trabajos</h3>
            <p className={styles.sectionDescription}>
              Timeline persistente y adjuntos privados en Storage.
            </p>
          </div>
          <Badge>{works.data?.items.length ?? 0}</Badge>
        </div>
        <div className={styles.rowList}>
          {(works.data?.items ?? []).map((work) => {
            const nextStatus = nextLabStatus(work.status);
            return (
              <div className={styles.row} key={work.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{work.title}</span>
                  <span className={styles.rowMeta}>
                    {work.patient ? (
                      <Link href={`/app/patients/${work.patient.id}`}>
                        {work.patient.firstName} {work.patient.lastName}
                      </Link>
                    ) : (
                      "Paciente"
                    )}
                    {" · "}
                    {work.lab?.name ?? "Sin laboratorio"} · {formatEUR(work.costCents)}
                    {work.clinicalPlanItemId && work.patient ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={clinicalPipelineHref("plan", work.patient.id)}>
                          Plan clínico
                        </Link>
                      </>
                    ) : null}
                    {work.appointmentId ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link
                          href={`/app/agenda?appointmentId=${encodeURIComponent(work.appointmentId)}`}
                        >
                          Cita vinculada
                        </Link>
                      </>
                    ) : null}
                  </span>
                  {(work.attachments?.length ?? 0) > 0 ? (
                    <span className={styles.rowMeta}>{work.attachments.length} adjunto(s)</span>
                  ) : null}
                  {(work.statusEvents?.length ?? 0) > 0 ? (
                    <span className={styles.rowMeta}>
                      Timeline: {work.statusEvents.map((event) => event.toStatus).join(" → ")}
                    </span>
                  ) : null}
                  {(work.reworks?.length ?? 0) > 0 ? (
                    <span className={styles.rowMeta}>
                      {work.reworks.length} repetición(es) · coste adicional{" "}
                      {formatEUR(work.reworks.reduce((sum, rework) => sum + rework.costCents, 0))}
                    </span>
                  ) : null}
                </div>
                <div className={styles.rowActions}>
                  <Badge variant="light">{work.status}</Badge>
                  {nextStatus ? (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() =>
                        transition.mutate({
                          id: work.id,
                          payload: { status: nextStatus, expectedVersion: work.version },
                        })
                      }
                    >
                      {nextStatus === "RECEIVED"
                        ? "Marcar recibido"
                        : nextStatus === "PLACED"
                          ? "Marcar colocado"
                          : nextStatus === "SENT"
                            ? "Marcar enviado"
                            : "En producción"}
                    </Button>
                  ) : null}
                  {!["CANCELLED"].includes(work.status) ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                        setReworkWorkId(work.id);
                        setReworkReason("");
                        setReworkCostEuros(0);
                      }}
                    >
                      Repetición
                    </Button>
                  ) : null}
                  <Button size="xs" variant="subtle" component="label">
                    Adjuntar archivo
                    <input
                      hidden
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.zip,.stl"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) addAttachment.mutate({ id: work.id, file });
                        event.currentTarget.value = "";
                      }}
                    />
                  </Button>
                </div>
              </div>
            );
          })}
          {!works.isLoading && (works.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin trabajos.</Text>
          ) : null}
        </div>
        {reworkWorkId ? (
          <Group mt="md" grow align="end">
            <TextInput
              label="Motivo de repetición"
              value={reworkReason}
              onChange={(event) => setReworkReason(event.currentTarget.value)}
            />
            <NumberInput
              label="Coste adicional (€)"
              min={0}
              decimalScale={2}
              value={reworkCostEuros}
              onChange={setReworkCostEuros}
            />
            <Button
              disabled={!reworkReason.trim()}
              loading={rework.isPending}
              onClick={() =>
                rework.mutate(
                  {
                    id: reworkWorkId,
                    reason: reworkReason.trim(),
                    costCents: centsFromEuros(reworkCostEuros),
                  },
                  {
                    onSuccess: () => {
                      setReworkWorkId(null);
                      setReworkReason("");
                      setReworkCostEuros(0);
                    },
                  },
                )
              }
            >
              Registrar repetición
            </Button>
            <Button variant="subtle" onClick={() => setReworkWorkId(null)}>
              Cancelar
            </Button>
          </Group>
        ) : null}
      </section>

      {canReadFinance ? (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Saldo por laboratorio</h3>
            <Text size="sm" c="dimmed">
              Saldo pendiente = facturas de proveedor confirmadas − pagos imputados.
            </Text>
            <div className={styles.rowList}>
              {(balances.data?.items ?? []).map((balance) => (
                <div className={styles.row} key={balance.labId}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{balance.name}</span>
                    <span className={styles.rowMeta}>
                      {balance.workCount} trabajos · cargos {formatEUR(balance.accruedCents)} ·
                      pagado {formatEUR(balance.paidCents)}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Badge color={balance.outstandingCents > 0 ? "orange" : "green"}>
                      Saldo pendiente {formatEUR(balance.outstandingCents)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {canWriteFinance ? (
            <>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Registrar factura de laboratorio</h3>
                <Group grow align="end">
                  <Select
                    label="Laboratorio"
                    value={invoiceLabId}
                    onChange={setInvoiceLabId}
                    data={labOptions}
                  />
                  <TextInput
                    label="N.º factura"
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
                  />
                  <NumberInput
                    label="Total (€)"
                    min={0}
                    decimalScale={2}
                    value={invoiceTotalEuros}
                    onChange={setInvoiceTotalEuros}
                  />
                  <Button
                    disabled={
                      !invoiceLabId ||
                      !invoiceNumber.trim() ||
                      centsFromEuros(invoiceTotalEuros) <= 0
                    }
                    loading={recordInvoice.isPending}
                    onClick={() => {
                      if (!invoiceLabId) return;
                      recordInvoice.mutate(
                        {
                          laboratoryId: invoiceLabId,
                          invoiceNumber: invoiceNumber.trim(),
                          issuedAt: new Date().toISOString(),
                          totalCents: centsFromEuros(invoiceTotalEuros),
                          items: [],
                        },
                        {
                          onSuccess: () => {
                            setInvoiceNumber("");
                            setInvoiceTotalEuros(0);
                          },
                        },
                      );
                    }}
                  >
                    Registrar factura
                  </Button>
                </Group>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Registrar pago a laboratorio</h3>
                <Group grow align="end">
                  <Select
                    label="Laboratorio"
                    value={paymentLabId}
                    onChange={(value) => {
                      setPaymentLabId(value);
                      setPaymentInvoiceId(null);
                    }}
                    data={labOptions}
                  />
                  <Select
                    label="Factura a imputar"
                    value={paymentInvoiceId}
                    onChange={setPaymentInvoiceId}
                    data={invoiceOptions}
                    disabled={!paymentLabId}
                  />
                  <NumberInput
                    label="Importe (€)"
                    min={0}
                    decimalScale={2}
                    value={paymentEuros}
                    onChange={setPaymentEuros}
                  />
                  <Button
                    disabled={
                      !paymentLabId || !paymentInvoiceId || centsFromEuros(paymentEuros) <= 0
                    }
                    loading={recordPayment.isPending || allocatePayment.isPending}
                    onClick={async () => {
                      if (!paymentLabId || !paymentInvoiceId) return;
                      const amountCents = centsFromEuros(paymentEuros);
                      const payment = await recordPayment.mutateAsync({
                        laboratoryId: paymentLabId,
                        amountCents,
                        method: "BANK_TRANSFER",
                        idempotencyKey: `lab-${crypto.randomUUID()}`,
                      });
                      await allocatePayment.mutateAsync({
                        paymentId: payment.id,
                        invoiceId: paymentInvoiceId,
                        amountCents,
                      });
                      setPaymentEuros(0);
                    }}
                  >
                    Registrar pago
                  </Button>
                </Group>
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
