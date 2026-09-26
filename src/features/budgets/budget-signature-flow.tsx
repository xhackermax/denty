"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconDownload, IconFileCheck, IconSignature } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { budgetSignatureFingerprint, type BudgetSignatureSource } from "@/domain";
import { formatEUR } from "@/domain/money";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { SignaturePad } from "@/shared/ui/signature-pad";
import styles from "@/shared/ui/parity.module.css";

import { saveDemoBudgetSignature } from "./budget-signature-storage";

export interface BudgetSignatureLine {
  id: string;
  description: string;
  tooth?: string | null;
  phase?: number | null;
  quantity?: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface BudgetSignaturePatient {
  id: string;
  name: string;
  recordNumber?: string | null;
  dni?: string | null;
}

export interface BudgetSignatureBudget {
  id: string;
  code: string;
  status: string;
  totalCents: number;
  sourcePlanVersion?: number | null;
  createdAt?: string | null;
}

interface BudgetSignatureFlowProps {
  opened: boolean;
  onClose: () => void;
  demoMode: boolean;
  patient: BudgetSignaturePatient;
  budget: BudgetSignatureBudget;
  lines: readonly BudgetSignatureLine[];
  onSigned?: (fingerprint: string) => void;
}

const ACCEPTANCE_TEXT =
  "Declaro haber recibido información suficiente sobre el plan de tratamiento y acepto el presupuesto descrito en este documento.";

const CONDITIONS =
  "El presupuesto corresponde al plan clínico y precios reflejados en esta versión. Cualquier modificación del plan o del importe exige una nueva versión para su aceptación.";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function openDemoPrintableCopy(input: {
  patient: BudgetSignaturePatient;
  budget: BudgetSignatureBudget;
  lines: readonly BudgetSignatureLine[];
  signerName: string;
  signatureDataUrl: string;
  signedAt: string;
}): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  const rows = input.lines
    .map(
      (line) => `<tr><td>${escapeHtml(line.phase ? `Fase ${line.phase}` : "—")}</td><td>${escapeHtml(
        line.tooth ? `Diente ${line.tooth}` : "General",
      )}</td><td>${escapeHtml(line.description)}</td><td>${escapeHtml(
        formatEUR(line.unitPriceCents),
      )}</td><td>${escapeHtml(formatEUR(line.totalCents))}</td></tr>`,
    )
    .join("");
  const signedAt = new Date(input.signedAt).toLocaleString("es-ES");
  const printStyles = [
    "body{font-family:Arial,sans-serif;color:#142033;margin:36px;line-height:1.45}",
    "h1{font-size:24px;margin:0 0 6px}.muted{color:#667085}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}",
    ".box{border:1px solid #d0d5dd;border-radius:10px;padding:12px}",
    "table{width:100%;border-collapse:collapse;margin:22px 0}",
    "th,td{border-bottom:1px solid #e4e7ec;padding:9px;text-align:left;font-size:12px}",
    "th{background:#f8fafc}.total{text-align:right;font-size:22px;font-weight:700;margin-top:14px}",
    ".acceptance{border:1px solid #98a2b3;border-radius:10px;padding:14px;margin-top:24px}",
    ".signature{margin-top:28px;border-top:1px solid #98a2b3;padding-top:10px;width:48%}",
    ".signature img{width:100%;height:130px;object-fit:contain}",
    ".footer{margin-top:32px;font-size:11px;color:#667085}@media print{body{margin:18mm}}",
  ].join("");
  const patientMeta = `Ficha ${escapeHtml(input.patient.recordNumber ?? "—")} · DNI ${escapeHtml(
    input.patient.dni ?? "—",
  )}`;
  const planMeta = `Plan v${escapeHtml(String(input.budget.sourcePlanVersion ?? "—"))}`;
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/>
    <title>${escapeHtml(input.budget.code)} · presupuesto firmado</title>
    <style>${printStyles}</style></head><body>
    <h1>Presupuesto de tratamiento · ${escapeHtml(input.budget.code)}</h1>
    <div class="muted">Documento firmado · ${escapeHtml(signedAt)}</div>
    <div class="grid">
      <div class="box"><strong>Paciente</strong><br/>${escapeHtml(input.patient.name)}<br/>${patientMeta}</div>
      <div class="box"><strong>Versión clínica</strong><br/>${planMeta}<br/>Estado ${escapeHtml(input.budget.status)}</div>
    </div>
    <table><thead><tr><th>Fase</th><th>Zona</th><th>Tratamiento</th><th>Precio</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="total">Total: ${escapeHtml(formatEUR(input.budget.totalCents))}</div>
    <div class="acceptance"><strong>Aceptación</strong><p>${escapeHtml(ACCEPTANCE_TEXT)}</p>
      <p>${escapeHtml(CONDITIONS)}</p></div>
    <div class="signature"><strong>Firma del paciente</strong><br/>
      <img src="${input.signatureDataUrl}" alt="Firma del paciente"/><br/>
      ${escapeHtml(input.signerName)} · ${escapeHtml(signedAt)}</div>
    <div class="footer">Denty · ${escapeHtml(input.budget.code)}. La firma queda vinculada a esta versión e importe del presupuesto.</div>
    <script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function BudgetSignatureFlow({
  opened,
  onClose,
  demoMode,
  patient,
  budget,
  lines,
  onSigned,
}: BudgetSignatureFlowProps) {
  const queryClient = useQueryClient();
  const [signerName, setSignerName] = useState(patient.name);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setSignerName(patient.name);
    setSignatureDataUrl(null);
    setAccepted(false);
    setError(null);
  }, [opened, patient.name]);

  const source = useMemo<BudgetSignatureSource>(
    () => ({
      budgetId: budget.id,
      totalCents: budget.totalCents,
      sourcePlanVersion: budget.sourcePlanVersion,
    }),
    [budget.id, budget.sourcePlanVersion, budget.totalCents],
  );
  const fingerprint = useMemo(() => budgetSignatureFingerprint(source), [source]);

  const signAndGenerate = async () => {
    if (!accepted || !signatureDataUrl || signerName.trim().length < 2) return;
    setWorking(true);
    setError(null);
    const signedAt = new Date().toISOString();
    try {
      if (demoMode) {
        const documentId = `BUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        saveDemoBudgetSignature(source, {
          documentId,
          signedAt,
          signerName: signerName.trim(),
          signatureDataUrl,
        });
        openDemoPrintableCopy({
          patient,
          budget,
          lines,
          signerName: signerName.trim(),
          signatureDataUrl,
          signedAt,
        });
      } else {
        const api = getBrowserApi();
        const created = await api.documents.create({
          patientId: patient.id,
          type: "BUDGET",
          title: `Presupuesto ${budget.code} · v${budget.sourcePlanVersion ?? 0} · ${formatEUR(budget.totalCents)}`,
          data: {
            budgetId: budget.id,
            budgetCode: budget.code,
            totalCents: budget.totalCents,
            sourcePlanVersion: budget.sourcePlanVersion ?? 0,
            fingerprint,
            itemsJson: JSON.stringify(lines),
            acceptanceText: ACCEPTANCE_TEXT,
            conditions: CONDITIONS,
          },
        });
        const finalized = await api.documents.finalize(created.id);
        await api.documents.sign(finalized.id, {
          signerName: signerName.trim(),
          signatureData: signatureDataUrl,
        });
        await api.portal.respondToBudget(budget.id, { termsVersion: fingerprint });
        const pdf = await api.documents.download(finalized.id);
        downloadBlob(pdf, `${budget.code}-firmado.pdf`);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: dentyQueryKeys.documents.patient(patient.id),
          }),
          queryClient.invalidateQueries({
            queryKey: dentyQueryKeys.finance.budgets,
          }),
          queryClient.invalidateQueries({
            queryKey: dentyQueryKeys.clinical.sync(patient.id),
          }),
        ]);
      }
      onSigned?.(fingerprint);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo firmar el presupuesto.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Presupuesto · firma del paciente" size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>{budget.code}</Title>
            <Text size="sm" c="dimmed">
              {patient.name} · ficha {patient.recordNumber ?? "—"}
            </Text>
          </div>
          <Badge color="blue" variant="light">
            {formatEUR(budget.totalCents)}
          </Badge>
        </Group>

        <Alert color="blue" icon={<IconFileCheck size={18} />} title="Vista previa del documento">
          Revisa tratamientos, zonas e importe antes de recoger la firma. La firma queda asociada a
          esta versión del plan y no se reutiliza si cambia el presupuesto.
        </Alert>

        <div className={styles.rowList}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fase</Table.Th>
                <Table.Th>Diente / zona</Table.Th>
                <Table.Th>Tratamiento</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Subtotal</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>{line.phase ? `Fase ${line.phase}` : "—"}</Table.Td>
                  <Table.Td>{line.tooth ? `Diente ${line.tooth}` : "General"}</Table.Td>
                  <Table.Td>{line.description}</Table.Td>
                  <Table.Td>{formatEUR(line.unitPriceCents)}</Table.Td>
                  <Table.Td>{formatEUR(line.totalCents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <Group justify="flex-end">
          <Text fw={800} size="xl">
            Total {formatEUR(budget.totalCents)}
          </Text>
        </Group>

        <Alert color="gray" title="Condiciones y aceptación">
          <Text size="sm">{ACCEPTANCE_TEXT}</Text>
          <Text size="sm" mt="xs">
            {CONDITIONS}
          </Text>
        </Alert>

        <TextInput
          label="Nombre del firmante"
          value={signerName}
          onChange={(event) => setSignerName(event.currentTarget.value)}
          required
        />
        <SignaturePad label="Firma del paciente" onChange={setSignatureDataUrl} />
        <Checkbox
          checked={accepted}
          onChange={(event) => setAccepted(event.currentTarget.checked)}
          label="He revisado el presupuesto y confirmo la aceptación de esta versión."
        />

        {error ? (
          <Alert color="red" title="No se pudo completar la firma">
            {error}
          </Alert>
        ) : null}

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {demoMode
              ? "Demo: se abrirá una copia imprimible para guardar como PDF."
              : "El servidor generará y descargará el PDF firmado definitivo."}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose} disabled={working}>
              Cancelar
            </Button>
            <Button
              leftSection={demoMode ? <IconSignature size={16} /> : <IconDownload size={16} />}
              loading={working}
              disabled={!accepted || !signatureDataUrl || signerName.trim().length < 2}
              onClick={() => void signAndGenerate()}
            >
              Firmar y generar PDF
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
