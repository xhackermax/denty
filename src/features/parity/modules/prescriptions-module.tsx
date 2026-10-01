"use client";

import { prescriptionAllergyConflicts } from "@/domain/prescriptions/nsaid-allergy";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { todayMadrid } from "@/domain/dates";
import {
  emptyPrescriptionLine,
  isCompleteLine,
  type PrescriptionLine,
} from "@/domain/prescriptions/dental-vademecum";
import type { Patient, Prescription } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import { usePatientsQuery, usePatientQuery } from "@/shared/patients/patient-data";
import { PrintNotice, usePrintNotice } from "@/shared/print/print-notice";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";
import { PrescriptionLinesEditor } from "./prescription-line-editor";
import { buildPrescriptionPrintHtml, printHtml } from "./prescription-print";
import {
  useCancelPrescriptionMutation,
  useCreatePrescriptionMutation,
  useIssuePrescriptionMutation,
  usePrescriptionHistoryQuery,
  usePrescriptionSettingsQuery,
  usePrescriptionsQuery,
  useSignPrescriptionMutation,
  useUpdatePrescriptionMutation,
  useValidatePrescriptionMutation,
} from "./prescriptions-data";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "gray" },
  READY: { label: "Lista", color: "blue" },
  SIGNING: { label: "Firmada", color: "teal" },
  ISSUED: { label: "Emitida", color: "green" },
  CANCELLED: { label: "Cancelada", color: "red" },
};

type Settings = NonNullable<ReturnType<typeof usePrescriptionSettingsQuery>["data"]>;

function toItems(lines: readonly PrescriptionLine[]) {
  return lines.filter(isCompleteLine).map((line) => ({
    activeIngredient: line.activeIngredient.trim(),
    strength: line.strength.trim(),
    pharmaceuticalForm: line.pharmaceuticalForm.trim(),
    ...(line.route.trim() ? { route: line.route.trim() } : {}),
    unitsPerDose: line.unitsPerDose.trim(),
    frequency: line.frequency.trim(),
    duration: line.duration.trim(),
    packageCount: line.packageCount.trim(),
    ...(line.instructions.trim() ? { instructions: line.instructions.trim() } : {}),
  }));
}

function toLines(prescription: Prescription): PrescriptionLine[] {
  const lines = prescription.items.map((item) => ({
    activeIngredient: item.activeIngredient ?? item.brandName ?? "",
    strength: item.strength,
    pharmaceuticalForm: item.pharmaceuticalForm,
    route: item.route ?? "",
    unitsPerDose: item.unitsPerDose,
    frequency: item.frequency,
    duration: item.duration,
    packageCount: item.packageCount ?? "1 envase",
    instructions: item.instructions ?? "",
  }));
  return lines.length ? lines : [emptyPrescriptionLine()];
}

function errorText(error: unknown) {
  return error instanceof DentyApiError
    ? error.message
    : "No se pudo completar la acción de la receta.";
}

function printPrescription(input: {
  prescription: {
    id: string;
    items: Prescription["items"];
    prescriptionDate?: string | undefined;
    prescriberStaffId?: string | undefined;
    siteId?: string | undefined;
  };
  patient: Patient | undefined;
  settings: Settings | undefined;
  fallbackSiteId: string | null;
}): Promise<void> {
  const { prescription, patient, settings } = input;
  const staff = settings?.staff.find((member) => member.id === prescription.prescriberStaffId);
  const prescriber = settings?.prescribers.find(
    (entry) => entry.staffId === prescription.prescriberStaffId,
  ) as { licenseNumber?: string | null } | undefined;
  const site =
    settings?.sites.find((entry) => entry.id === (prescription.siteId ?? input.fallbackSiteId)) ??
    settings?.sites.find((entry) => entry.active !== false);
  return printHtml(
    buildPrescriptionPrintHtml({
      clinicName: settings?.clinic.name ?? "Clínica dental",
      ...(site ? { site } : {}),
      date: prescription.prescriptionDate ?? todayMadrid(),
      patient: {
        name: patient ? `${patient.firstName} ${patient.lastName}`.trim() : "",
        dni: patient?.dni ?? null,
        recordNumber: patient?.recordNumber ?? null,
        birthDate: patient?.birthDate ?? null,
      },
      prescriber: {
        name: staff?.displayName ?? "",
        collegiateNumber: staff?.collegiateNumber ?? prescriber?.licenseNumber ?? null,
      },
      items: prescription.items,
      reference: prescription.id.slice(0, 8),
    }),
  );
}

export function PrescriptionsModule() {
  const prescriptions = usePrescriptionsQuery();
  const settings = usePrescriptionSettingsQuery();
  const patients = usePatientsQuery();
  const { activeSiteId } = useActiveTenant();
  const session = useQuery({
    queryKey: dentyQueryKeys.session,
    queryFn: () => getBrowserApi().auth.session(),
    staleTime: 60_000,
  });
  const create = useCreatePrescriptionMutation();
  const cancel = useCancelPrescriptionMutation();
  const update = useUpdatePrescriptionMutation();
  const validate = useValidatePrescriptionMutation();
  const sign = useSignPrescriptionMutation();
  const issue = useIssuePrescriptionMutation();

  // Composer.
  const printNotice = usePrintNotice();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriberChoice, setPrescriberChoice] = useState<string | null>(null);
  const [siteChoice, setSiteChoice] = useState<string | null>(null);
  const [date, setDate] = useState(todayMadrid());
  const [lines, setLines] = useState<PrescriptionLine[]>(() => [emptyPrescriptionLine()]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Existing prescriptions.
  const [editing, setEditing] = useState<Prescription | null>(null);
  const selectedPatient = usePatientQuery(patientId ?? "");
  const editedPatient = usePatientQuery(editing?.patientId ?? "");
  const [editLines, setEditLines] = useState<PrescriptionLine[]>([]);
  const [signing, setSigning] = useState<Prescription | null>(null);
  const [cancelling, setCancelling] = useState<Prescription | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const history = usePrescriptionHistoryQuery(historyId);
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const hasError = prescriptions.isError || settings.isError || patients.isError;

  const patientList = useMemo(() => patients.data?.items ?? [], [patients.data]);
  const patientsById = useMemo(
    () => new Map(patientList.map((patient) => [patient.id, patient])),
    [patientList],
  );
  const staff = settings.data?.staff ?? [];
  const sites = (settings.data?.sites ?? []).filter((site) => site.active !== false);
  // Defaults: the doctor who is signed in (or the first dentist) and the current site.
  const actorStaffId = session.data?.actor.staffId;
  const defaultPrescriber =
    staff.find((member) => member.id === actorStaffId && member.role === "DENTIST")?.id ??
    staff.find((member) => member.role === "DENTIST")?.id ??
    staff[0]?.id ??
    null;
  const prescriberId = prescriberChoice ?? defaultPrescriber;
  const siteId = siteChoice ?? activeSiteId ?? sites[0]?.id ?? null;
  const items = toItems(lines);
  const incomplete = lines.some((line) => line.activeIngredient.trim() && !isCompleteLine(line));
  const canSave = Boolean(
    patientId &&
    prescriberId &&
    items.length &&
    !incomplete &&
    selectedPatient.isSuccess &&
    !prescriptionAllergyConflicts(
      selectedPatient.data?.medicalProfile,
      lines.map((l) => l.activeIngredient),
    ).length,
  );

  const resetComposer = () => {
    setPatientId(null);
    setLines([emptyPrescriptionLine()]);
    setDate(todayMadrid());
  };

  const saveComposer = async (andPrint: boolean) => {
    if (!patientId || !prescriberId || !canSave) return;
    setSaving(true);
    setComposerError(null);
    try {
      const created = await create.mutateAsync({
        patientId,
        prescriberStaffId: prescriberId,
        prescriptionDate: date,
        ...(siteId ? { siteId } : {}),
        items,
      });
      if (andPrint) {
        // Ready to print and sign by hand; without signing permission it stays a draft.
        await validate.mutateAsync(created).catch(() => undefined);
        void printNotice.run(() =>
          printPrescription({
            prescription: {
              ...created,
              prescriptionDate: date,
              prescriberStaffId: prescriberId,
              ...(siteId ? { siteId } : {}),
            },
            patient: patientsById.get(patientId),
            settings: settings.data,
            fallbackSiteId: siteId,
          }),
        );
      }
      resetComposer();
    } catch (error) {
      setComposerError(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const describe = (prescription: Prescription) => {
    const patient = patientsById.get(prescription.patientId);
    return {
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Paciente",
      medicines: prescription.items
        .map((item) => `${item.activeIngredient ?? item.brandName ?? ""} ${item.strength}`.trim())
        .join(", "),
      date: String((prescription as { prescriptionDate?: string }).prescriptionDate ?? "")
        .split("-")
        .reverse()
        .join("/"),
    };
  };

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">No se pudieron cargar todos los datos de recetas.</Alert>
      ) : null}
      <PrintNotice error={printNotice.error} onClose={printNotice.clear} />
      {validate.isError ? <Alert color="red">{errorText(validate.error)}</Alert> : null}
      {issue.isError ? <Alert color="red">{errorText(issue.error)}</Alert> : null}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Nueva receta</h3>
        <Stack gap="sm" mt="sm">
          <Group grow align="end">
            <Select
              searchable
              label="Paciente"
              placeholder="Buscar paciente"
              value={patientId}
              onChange={setPatientId}
              data={patientList.map((patient) => ({
                value: patient.id,
                label: `${patient.firstName} ${patient.lastName}${patient.recordNumber ? ` · ${patient.recordNumber}` : ""}`,
              }))}
            />
            <Select
              label="Doctor que receta"
              value={prescriberId}
              onChange={setPrescriberChoice}
              allowDeselect={false}
              data={staff.map((member) => ({
                value: member.id,
                label: member.collegiateNumber
                  ? `${member.displayName} · Col. ${member.collegiateNumber}`
                  : member.displayName,
              }))}
            />
            {sites.length > 1 ? (
              <Select
                label="Sede"
                value={siteId}
                onChange={setSiteChoice}
                allowDeselect={false}
                data={sites.map((site) => ({ value: site.id, label: site.name }))}
              />
            ) : null}
            <TextInput
              label="Fecha"
              type="date"
              value={date}
              onChange={(event) => setDate(event.currentTarget.value || todayMadrid())}
            />
          </Group>
          <PrescriptionLinesEditor
            medicalProfile={selectedPatient.data?.medicalProfile}
            lines={lines}
            onChange={setLines}
          />
          {incomplete ? (
            <Text size="sm" c="orange">
              Completa dosis, forma, toma, posología y duración de cada medicamento.
            </Text>
          ) : null}
          {composerError ? <Alert color="red">{composerError}</Alert> : null}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!canSave}
              loading={saving}
              onClick={() => void saveComposer(false)}
            >
              Guardar borrador
            </Button>
            <Button
              leftSection={<IconPrinter size={16} />}
              disabled={!canSave}
              loading={saving}
              onClick={() => void saveComposer(true)}
            >
              Guardar e imprimir
            </Button>
          </Group>
        </Stack>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recetas</h3>
        <div className={styles.rowList}>
          {(prescriptions.data?.items ?? []).map((prescription) => {
            const info = describe(prescription);
            const status = STATUS_LABELS[prescription.status] ?? {
              label: prescription.status,
              color: "gray",
            };
            return (
              <div className={styles.row} key={prescription.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {info.patientName}
                    {info.date ? ` · ${info.date}` : ""}
                  </span>
                  <span className={styles.rowMeta}>{info.medicines || "Sin medicamentos"}</span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={status.color} variant="light">
                    {status.label}
                  </Badge>
                  {prescription.items.length && prescription.status !== "CANCELLED" ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPrinter size={14} />}
                      onClick={() =>
                        void printNotice.run(() =>
                          printPrescription({
                            prescription,
                            patient: patientsById.get(prescription.patientId),
                            settings: settings.data,
                            fallbackSiteId: activeSiteId,
                          }),
                        )
                      }
                    >
                      Imprimir
                    </Button>
                  ) : null}
                  {prescription.status === "DRAFT" ? (
                    <>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setEditing(prescription);
                          setEditLines(toLines(prescription));
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        disabled={prescription.items.length === 0}
                        onClick={() => validate.mutate(prescription)}
                      >
                        Validar
                      </Button>
                    </>
                  ) : null}
                  {prescription.status === "READY" ? (
                    <Button
                      size="xs"
                      onClick={() => {
                        setSigning(prescription);
                        setSignerName("");
                        setSignatureDataUrl(null);
                      }}
                    >
                      Firmar
                    </Button>
                  ) : null}
                  {prescription.status === "SIGNING" ? (
                    <Button size="xs" onClick={() => issue.mutate(prescription)}>
                      Emitir
                    </Button>
                  ) : null}
                  <Button size="xs" variant="subtle" onClick={() => setHistoryId(prescription.id)}>
                    Historial
                  </Button>
                  {prescription.status !== "CANCELLED" ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        setCancelling(prescription);
                        setCancelReason("");
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!prescriptions.isLoading && (prescriptions.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin recetas.</Text>
          ) : null}
        </div>
      </section>

      <Modal
        opened={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Medicación de la receta"
        size="xl"
        centered
      >
        <Stack gap="sm">
          <PrescriptionLinesEditor
            medicalProfile={editedPatient.data?.medicalProfile}
            lines={editLines}
            onChange={setEditLines}
          />
          {update.isError ? <Alert color="red">{errorText(update.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !editedPatient.isSuccess ||
                prescriptionAllergyConflicts(
                  editedPatient.data?.medicalProfile,
                  editLines.map((l) => l.activeIngredient),
                ).length > 0 ||
                !toItems(editLines).length ||
                editLines.some((line) => line.activeIngredient.trim() && !isCompleteLine(line))
              }
              loading={update.isPending}
              onClick={() => {
                if (!editing) return;
                update.mutate(
                  { id: editing.id, payload: { items: toItems(editLines) } },
                  { onSuccess: () => setEditing(null) },
                );
              }}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(signing)}
        onClose={() => setSigning(null)}
        title="Firmar receta"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Nombre del firmante"
            value={signerName}
            onChange={(event) => setSignerName(event.currentTarget.value)}
            required
          />
          <SignaturePad label="Firma del prescriptor" onChange={setSignatureDataUrl} />
          {sign.isError ? <Alert color="red">{errorText(sign.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSigning(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!signing || !signerName.trim() || !signatureDataUrl}
              loading={sign.isPending}
              onClick={() => {
                if (!signing || !signatureDataUrl) return;
                sign.mutate(
                  { id: signing.id, payload: { signerName: signerName.trim(), signatureDataUrl } },
                  { onSuccess: () => setSigning(null) },
                );
              }}
            >
              Guardar firma
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Cancelar receta"
        centered
      >
        <Stack gap="sm">
          <Textarea
            label="Motivo de cancelación"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
            required
          />
          {cancel.isError ? <Alert color="red">{errorText(cancel.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelling(null)}>
              Volver
            </Button>
            <Button
              color="red"
              disabled={!cancelling || !cancelReason.trim()}
              loading={cancel.isPending}
              onClick={() => {
                if (!cancelling) return;
                cancel.mutate(
                  { id: cancelling.id, reason: cancelReason.trim() },
                  { onSuccess: () => setCancelling(null) },
                );
              }}
            >
              Confirmar cancelación
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
        title="Historial de receta"
        centered
      >
        <Stack gap="sm">
          {history.isLoading ? <Text c="dimmed">Cargando historial…</Text> : null}
          {history.isError ? <Alert color="red">No se pudo cargar el historial.</Alert> : null}
          {(history.data?.items ?? []).map((version) => (
            <div className={styles.row} key={version.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>Versión {version.version}</span>
                <span className={styles.rowMeta}>
                  {version.status} · {version.createdAt}
                </span>
              </div>
              <Badge variant="light">{version.contentHash.slice(0, 10)}…</Badge>
            </div>
          ))}
          {(history.data?.signatures ?? []).map((signature) => (
            <Text size="sm" key={signature.id}>
              Firma: {signature.signerName} · {signature.signedAt}
            </Text>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
}
