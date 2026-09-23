"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconDots, IconFileCertificate, IconPrinter, IconSignature } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { canTransitionDocument, type DocumentState } from "@/domain/state-machines";
import { DEMO_PATIENTS, DEMO_STAFF } from "@/shared/demo/demo-data";
import { SignaturePad } from "@/shared/ui/signature-pad";
import { HorizontalSnapNav } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

interface DocumentRow {
  id: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  patientDni: string;
  title: string;
  type: string;
  state: DocumentState;
  createdAt: string;
  sourceUrl?: string;
  templateCode?: string;
  doctorId?: string;
  doctorName?: string;
  clinicSite?: string;
  patientSignerName?: string;
  patientSignedAt?: string;
  patientSignatureDataUrl?: string;
  doctorSignedAt?: string;
  doctorSignatureDataUrl?: string;
}

const STORAGE_KEY = "denty:clinical-documents:v3";
const ARAGON_BASE = "https://www.dentistasaragon.es";
const ARAGON_PDF_BASE = `${ARAGON_BASE}/images/archivosPDF/documentacion`;

const TEMPLATES = [
  {
    value: "CONSENT_IMAGES",
    label: "CI Tratamiento de imágenes",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/TRATAMIENTO_DE_IMAGENES.pdf`,
  },
  {
    value: "CONSENT_ANESTHESIA",
    label: "CI Anestesia",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-ANESTESIA.pdf`,
  },
  {
    value: "CONSENT_ENDO",
    label: "CI Endodoncia",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-ENDODONCIA.pdf`,
  },
  {
    value: "CONSENT_EXTRACTION",
    label: "CI Extracción simple",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-EXTRACCION-SIMPLE.pdf`,
  },
  {
    value: "CONSENT_IMPLANT",
    label: "CI Implantes",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-IMPLANTES.pdf`,
  },
  {
    value: "CONSENT_FILLINGS",
    label: "CI Obturaciones",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-OBTURACIONES.pdf`,
  },
  {
    value: "CONSENT_ANTIRESORPTIVE",
    label: "CI Antirresortivos / bifosfonatos",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-ANTIRRESORTIVOS-BIFOSFONATOS.pdf`,
  },
  {
    value: "CONSENT_PERIO",
    label: "CI Periodoncia",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-PERIODONCIA.pdf`,
  },
  {
    value: "CONSENT_PLASMA",
    label: "CI Plasma",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-PLASMA.pdf`,
  },
  {
    value: "CONSENT_HA",
    label: "CI Procedimiento ácido hialurónico",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-PROCEDIMIENTO-ACIDO-HIALURONICO.pdf`,
  },
  {
    value: "CONSENT_PROSTHESIS",
    label: "CI Prótesis",
    type: "CONSENT",
    sourceUrl: `${ARAGON_BASE}/documentacion/consentimientos-informados/ci-protesis.html`,
  },
  {
    value: "CONSENT_LYOPHILIZED",
    label: "CI Tejido liofilizado",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-TEJIDO-LIOFILIZADO.pdf`,
  },
  {
    value: "CONSENT_PERIAPICAL",
    label: "CI Cirugía periapical",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-CIRIGIA-PERIAPICAL.pdf`,
  },
  {
    value: "CONSENT_WISDOM",
    label: "CI Extracción tercer molar",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-EXTRACCION-TERCER-MOLAR-CORDALES.pdf`,
  },
  {
    value: "CONSENT_CLEANING",
    label: "CI Tartrectomía / limpieza dental",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-TARTRECTOMIA.pdf`,
  },
  {
    value: "CONSENT_OVERDENTURE",
    label: "CI Sobredentaduras",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-SOBREDENTADURAS.pdf`,
  },
  {
    value: "CONSENT_WHITEN_EXT",
    label: "CI Blanqueamiento dental externo",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-BLANQUEAMIENTO-DENTAL-EXTERNO.pdf`,
  },
  {
    value: "CONSENT_WHITEN_INT",
    label: "CI Blanqueamiento dental interno",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-BLANQUEAMIENTO-DENTAL-INTERNO.pdf`,
  },
  {
    value: "CONSENT_VENEERS",
    label: "CI Carillas directas de composite",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-CARILLAS.pdf`,
  },
  {
    value: "CONSENT_GUM_GRAFT",
    label: "CI Injerto de encía",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-INJERTO-DE-ENCIA.pdf`,
  },
  {
    value: "CONSENT_BONE_GRAFT",
    label: "CI Injertos óseos",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-PARA-INJERTOS-OSEOS.pdf`,
  },
  {
    value: "CONSENT_BONE_REGEN",
    label: "CI Regeneración ósea",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-REGENERACION-OSEA.pdf`,
  },
  {
    value: "CONSENT_SEDATION",
    label: "CI Sedación consciente",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-SEDACION-CONSCIENTE.pdf`,
  },
  {
    value: "CONSENT_BIOPSY",
    label: "CI Biopsia",
    type: "CONSENT",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-BIOPSIA.pdf`,
  },
  { value: "BUDGET", label: "Presupuesto", type: "BUDGET" },
  { value: "ATTENDANCE", label: "Justificante de asistencia", type: "ATTENDANCE_CERTIFICATE" },
] as const;

const INITIAL_DOCUMENTS: readonly DocumentRow[] = [
  {
    id: "DOC-778",
    patientId: "juan-perez",
    patientName: "Juan Pérez",
    patientRecordNumber: "000104",
    patientDni: "12345678Z",
    title: "CI Implantes",
    type: "CONSENT",
    state: "FINALIZED",
    createdAt: "2026-09-22T10:00:00+02:00",
    sourceUrl: `${ARAGON_PDF_BASE}/CI-IMPLANTES.pdf`,
    templateCode: "CONSENT_IMPLANT",
    doctorId: "maximo",
    doctorName: "Máximo Tiburcio",
    clinicSite: "Av. Navarra",
  },
  {
    id: "DOC-779",
    patientId: "carlos-garcia",
    patientName: "Carlos García",
    patientRecordNumber: "000451",
    patientDni: "34567890V",
    title: "Presupuesto rehabilitación",
    type: "BUDGET",
    state: "DELIVERED",
    createdAt: "2026-09-20T12:00:00+02:00",
  },
];

function stateLabel(state: DocumentState): string {
  return {
    DRAFT: "Borrador",
    FINALIZED: "Listo para firmar",
    SIGNED: "Firmado",
    DELIVERED: "Entregado",
    ARCHIVED: "Archivado",
  }[state];
}

function stateColor(state: DocumentState): string {
  if (["SIGNED", "DELIVERED"].includes(state)) return "green";
  if (state === "ARCHIVED") return "gray";
  if (state === "FINALIZED") return "blue";
  return "yellow";
}

function nextDocumentState(state: DocumentState): DocumentState | null {
  const ordered: readonly DocumentState[] = [
    "DRAFT",
    "FINALIZED",
    "SIGNED",
    "DELIVERED",
    "ARCHIVED",
  ];
  const index = ordered.indexOf(state);
  return index >= 0 && index < ordered.length - 1 ? (ordered[index + 1] ?? null) : null;
}

function isCompleteSignedConsent(document: DocumentRow): boolean {
  return (
    document.type === "CONSENT" &&
    Boolean(
      document.patientSignatureDataUrl &&
      document.doctorSignatureDataUrl &&
      document.patientSignedAt &&
      document.doctorName &&
      document.clinicSite,
    )
  );
}

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

function printSignedConsent(document: DocumentRow): void {
  if (!isCompleteSignedConsent(document)) return;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  const signedAt = document.patientSignedAt
    ? new Date(document.patientSignedAt).toLocaleString("es-ES")
    : "";
  const doctorSignature = document.doctorSignatureDataUrl ?? "";
  const patientSignature = document.patientSignatureDataUrl ?? "";
  win.document
    .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${escapeHtml(document.title)} · ${escapeHtml(document.id)}</title><style>
    body{font-family:Arial,sans-serif;color:#162235;margin:36px;line-height:1.45}h1{font-size:22px;margin:0 0 6px}.muted{color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0}.box{border:1px solid #d0d5dd;border-radius:10px;padding:12px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}.signature{border-top:1px solid #98a2b3;padding-top:10px}.signature img{max-width:100%;height:120px;object-fit:contain}.footer{margin-top:32px;font-size:11px;color:#667085}@media print{button{display:none}}</style></head><body>
    <h1>Consentimiento firmado · ${escapeHtml(document.title)}</h1><div class="muted">Documento ${escapeHtml(document.id)} · firmado ${escapeHtml(signedAt)}</div>
    <div class="grid"><div class="box"><strong>Paciente</strong><br/>${escapeHtml(document.patientName)}<br/>Ficha ${escapeHtml(document.patientRecordNumber)} · DNI ${escapeHtml(document.patientDni)}</div><div class="box"><strong>Profesional y sede</strong><br/>${escapeHtml(document.doctorName ?? "")}<br/>${escapeHtml(document.clinicSite ?? "")}</div></div>
    <p>Esta copia identifica el consentimiento informado utilizado, el paciente, el profesional responsable, la sede y las dos evidencias de firma asociadas al acto.</p>
    <div class="signatures"><div class="signature"><strong>Firma del odontólogo</strong><br/><img src="${doctorSignature}" alt="Firma del odontólogo"/><br/>${escapeHtml(document.doctorName ?? "")}</div><div class="signature"><strong>Firma del paciente</strong><br/><img src="${patientSignature}" alt="Firma del paciente"/><br/>${escapeHtml(document.patientSignerName ?? document.patientName)}</div></div>
    <div class="footer">Denty · registro clínico ${escapeHtml(document.id)}. La plantilla de consentimiento utilizada queda asociada al registro.</div><script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}

export function DocumentsModule() {
  const [documents, setDocuments] = useState<DocumentRow[]>(() => [...INITIAL_DOCUMENTS]);
  const [storageReady, setStorageReady] = useState(false);
  const [createOpened, setCreateOpened] = useState(false);
  const [signOpened, setSignOpened] = useState(false);
  const [viewOpened, setViewOpened] = useState(false);
  const [documentTab, setDocumentTab] = useState<string | null>("signed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [patientFilterId, setPatientFilterId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("juan-perez");
  const [templateId, setTemplateId] = useState("CONSENT_IMPLANT");
  const [title, setTitle] = useState("CI Implantes");
  const [doctorId, setDoctorId] = useState("maximo");
  const [clinicSite, setClinicSite] = useState("Av. Navarra");
  const [patientSignatureDataUrl, setPatientSignatureDataUrl] = useState<string | null>(null);
  const [doctorSignatureDataUrl, setDoctorSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DocumentRow[];
        if (Array.isArray(parsed)) setDocuments(parsed);
      }
      const fromPatient = new URLSearchParams(window.location.search).get("patientId");
      if (fromPatient && DEMO_PATIENTS.some((patient) => patient.id === fromPatient)) {
        setPatientId(fromPatient);
        setPatientFilterId(fromPatient);
      }
    } catch {
      // Si el navegador bloquea storage, la sesión actual sigue siendo funcional.
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      // Las firmas pueden superar la cuota del navegador; el estado en memoria se conserva.
    }
  }, [documents, storageReady]);

  const sites = useMemo(() => Array.from(new Set(DEMO_STAFF.map((staff) => staff.site))), []);
  const selectedDocument = selectedId
    ? (documents.find((document) => document.id === selectedId) ?? null)
    : null;
  const viewingDocument = viewingId
    ? (documents.find((document) => document.id === viewingId) ?? null)
    : null;
  const visibleDocuments = patientFilterId
    ? documents.filter((document) => document.patientId === patientFilterId)
    : documents;
  const archivedDocuments = visibleDocuments.filter((document) => document.state === "ARCHIVED");
  const signedConsents = visibleDocuments
    .filter((document) => document.state !== "ARCHIVED" && isCompleteSignedConsent(document))
    .sort((a, b) => (b.patientSignedAt ?? "").localeCompare(a.patientSignedAt ?? ""));
  const workingDocuments = visibleDocuments.filter(
    (document) => document.state !== "ARCHIVED" && !isCompleteSignedConsent(document),
  );

  const resetSignatureState = () => {
    setPatientSignatureDataUrl(null);
    setDoctorSignatureDataUrl(null);
  };

  const createDocument = () => {
    const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
    const template = TEMPLATES.find((item) => item.value === templateId);
    const doctor = DEMO_STAFF.find((item) => item.id === doctorId);
    if (!patient || !template || !title.trim()) return;

    const isConsent = template.type === "CONSENT";
    const document: DocumentRow = {
      id: `DOC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientRecordNumber: patient.recordNumber,
      patientDni: patient.dni,
      title: title.trim(),
      type: template.type,
      state: isConsent ? "FINALIZED" : "DRAFT",
      createdAt: new Date().toISOString(),
      templateCode: template.value,
      ...(doctor ? { doctorId: doctor.id, doctorName: doctor.displayName } : {}),
      ...(clinicSite ? { clinicSite } : {}),
      ...("sourceUrl" in template ? { sourceUrl: template.sourceUrl } : {}),
    };

    setDocuments((current) => [document, ...current]);
    setCreateOpened(false);
  };

  const advance = (id: string) => {
    setDocuments((current) =>
      current.map((document) => {
        if (document.id !== id) return document;
        const next = nextDocumentState(document.state);
        if (!next || next === "SIGNED" || !canTransitionDocument(document.state, next))
          return document;
        return { ...document, state: next };
      }),
    );
  };

  const openSigning = (document: DocumentRow) => {
    const defaultDoctor =
      DEMO_STAFF.find((staff) => staff.id === document.doctorId) ?? DEMO_STAFF[0];
    if (defaultDoctor) {
      setDoctorId(defaultDoctor.id);
      setClinicSite(document.clinicSite ?? defaultDoctor.site);
    }
    setSelectedId(document.id);
    resetSignatureState();
    setSignOpened(true);
  };

  const sign = () => {
    if (!selectedDocument || !patientSignatureDataUrl || !doctorSignatureDataUrl) return;
    const doctor = DEMO_STAFF.find((item) => item.id === doctorId);
    if (!doctor || !clinicSite) return;
    const signedAt = new Date().toISOString();

    setDocuments((current) =>
      current.map((document) => {
        if (document.id !== selectedDocument.id || !canTransitionDocument(document.state, "SIGNED"))
          return document;
        return {
          ...document,
          state: "SIGNED",
          doctorId: doctor.id,
          doctorName: doctor.displayName,
          clinicSite,
          doctorSignedAt: signedAt,
          doctorSignatureDataUrl,
          patientSignerName: document.patientName,
          patientSignedAt: signedAt,
          patientSignatureDataUrl,
        };
      }),
    );

    resetSignatureState();
    setSelectedId(null);
    setSignOpened(false);
  };

  const openSignedCopy = (document: DocumentRow) => {
    setViewingId(document.id);
    setViewOpened(true);
  };

  return (
    <>
      <HorizontalSnapNav
        ariaLabel="Documentos"
        value={documentTab ?? "signed"}
        onChange={setDocumentTab}
        items={[
          { value: "signed", label: "Firmados", badge: signedConsents.length },
          { value: "pending", label: "Pendientes", badge: workingDocuments.length },
          { value: "archive", label: "Archivo", badge: archivedDocuments.length },
        ]}
      />
      <Tabs
        value={documentTab}
        onChange={setDocumentTab}
        className={styles.moduleTabs}
        keepMounted={false}
      >
        <Tabs.Panel value="signed" pt="md">
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h2 className={styles.sectionTitle}>Firmados</h2>
                <p className={styles.sectionDescription}>Copias firmadas y datos clínicos.</p>
              </div>
              <Group gap="xs">
                {patientFilterId ? (
                  <Button size="xs" variant="default" onClick={() => setPatientFilterId(null)}>
                    Ver todos
                  </Button>
                ) : null}
                <Button size="xs" onClick={() => setCreateOpened(true)}>
                  Nuevo
                </Button>
              </Group>
            </div>

            {signedConsents.length === 0 ? (
              <Alert color="blue" title="Sin consentimientos firmados">
                Aparecerán aquí tras la firma de ambos.
              </Alert>
            ) : (
              <div className={styles.rowList}>
                {signedConsents.map((document) => (
                  <div className={styles.row} key={document.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {document.patientName} · {document.title}
                      </span>
                      <span className={styles.rowMeta}>
                        Ficha {document.patientRecordNumber} · {document.doctorName} ·{" "}
                        {document.clinicSite} ·{" "}
                        {document.patientSignedAt
                          ? new Date(document.patientSignedAt).toLocaleString("es-ES")
                          : ""}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge color="green" variant="light">
                        Firmado por ambos
                      </Badge>
                      <Button
                        size="xs"
                        leftSection={<IconFileCertificate size={14} />}
                        onClick={() => openSignedCopy(document)}
                      >
                        Ver firmado
                      </Button>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                            <IconDots size={16} />
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPrinter size={14} />}
                            onClick={() => printSignedConsent(document)}
                          >
                            Imprimir / PDF
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="md">
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h2 className={styles.sectionTitle}>Pendientes</h2>
                <p className={styles.sectionDescription}>Borradores y firmas pendientes.</p>
              </div>
            </div>

            <div className={styles.rowList}>
              {workingDocuments.map((document) => {
                const next = nextDocumentState(document.state);
                return (
                  <div className={styles.row} key={document.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {document.patientName} · {document.title}
                      </span>
                      <span className={styles.rowMeta}>
                        Ficha {document.patientRecordNumber} · {document.id}
                        {document.doctorName ? ` · ${document.doctorName}` : ""}
                        {document.clinicSite ? ` · ${document.clinicSite}` : ""}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge color={stateColor(document.state)} variant="light">
                        {stateLabel(document.state)}
                      </Badge>
                      {document.type === "CONSENT" && document.state === "FINALIZED" ? (
                        <Button
                          size="xs"
                          leftSection={<IconSignature size={14} />}
                          onClick={() => openSigning(document)}
                        >
                          Firmar ambos
                        </Button>
                      ) : null}
                      {next && next !== "SIGNED" ? (
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                              <IconDots size={16} />
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item onClick={() => advance(document.id)}>
                              {next === "FINALIZED"
                                ? "Finalizar"
                                : next === "DELIVERED"
                                  ? "Entregar"
                                  : "Archivar"}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel value="archive" pt="md">
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h2 className={styles.sectionTitle}>Archivo</h2>
                <p className={styles.sectionDescription}>Documentos cerrados.</p>
              </div>
            </div>
            {archivedDocuments.length ? (
              <div className={styles.rowList}>
                {archivedDocuments.map((document) => (
                  <div className={styles.row} key={document.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {document.patientName} · {document.title}
                      </span>
                      <span className={styles.rowMeta}>
                        Ficha {document.patientRecordNumber} · {document.id}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge color="gray" variant="light">
                        Archivado
                      </Badge>
                      {isCompleteSignedConsent(document) ? (
                        <Button size="xs" variant="light" onClick={() => openSignedCopy(document)}>
                          Ver firmado
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text size="sm" c="dimmed">
                No hay documentos archivados.
              </Text>
            )}
          </section>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Nuevo" size="lg">
        <Stack>
          <Select
            searchable
            label="Paciente"
            value={patientId}
            onChange={(value) => setPatientId(value ?? "")}
            data={DEMO_PATIENTS.map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName} · ficha ${patient.recordNumber}`,
            }))}
          />
          <Select
            searchable
            label="Plantilla"
            value={templateId}
            onChange={(value) => {
              const nextValue = value ?? "";
              const template = TEMPLATES.find((item) => item.value === nextValue);
              setTemplateId(nextValue);
              if (template) setTitle(template.label);
            }}
            data={TEMPLATES.map((template) => ({ value: template.value, label: template.label }))}
          />
          <TextInput
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Select
            searchable
            label="Odontólogo"
            value={doctorId}
            onChange={(value) => {
              const nextId = value ?? "";
              setDoctorId(nextId);
              const doctor = DEMO_STAFF.find((staff) => staff.id === nextId);
              if (doctor) setClinicSite(doctor.site);
            }}
            data={DEMO_STAFF.map((staff) => ({
              value: staff.id,
              label: `${staff.displayName} · ${staff.site}`,
            }))}
          />
          <Select
            label="Sede"
            value={clinicSite}
            onChange={(value) => setClinicSite(value ?? "")}
            data={sites}
          />
          <Text size="xs" c="dimmed">
            Tras firmar ambos, se archiva automáticamente.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={createDocument}>Crear</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={signOpened}
        onClose={() => setSignOpened(false)}
        title="Firmar consentimiento"
        size="xl"
      >
        <Stack>
          {selectedDocument ? (
            <Alert color="blue" title={selectedDocument.title}>
              {selectedDocument.patientName} · ficha {selectedDocument.patientRecordNumber} · DNI{" "}
              {selectedDocument.patientDni}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              searchable
              label="Odontólogo"
              value={doctorId}
              onChange={(value) => {
                const nextId = value ?? "";
                setDoctorId(nextId);
                const doctor = DEMO_STAFF.find((staff) => staff.id === nextId);
                if (doctor) setClinicSite(doctor.site);
              }}
              data={DEMO_STAFF.map((staff) => ({ value: staff.id, label: staff.displayName }))}
            />
            <Select
              label="Sede"
              value={clinicSite}
              onChange={(value) => setClinicSite(value ?? "")}
              data={sites}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <SignaturePad label="Firma del odontólogo" onChange={setDoctorSignatureDataUrl} />
            <SignaturePad label="Firma del paciente" onChange={setPatientSignatureDataUrl} />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Se guardan ambas firmas, fecha, profesional y sede.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSignOpened(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !doctorSignatureDataUrl || !patientSignatureDataUrl || !doctorId || !clinicSite
              }
              onClick={sign}
            >
              Firmar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewOpened}
        onClose={() => setViewOpened(false)}
        title="Consentimiento firmado"
        size="xl"
      >
        {viewingDocument && isCompleteSignedConsent(viewingDocument) ? (
          <Stack>
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3}>{viewingDocument.title}</Title>
                <Text size="sm" c="dimmed">
                  {viewingDocument.id} · firmado{" "}
                  {viewingDocument.patientSignedAt
                    ? new Date(viewingDocument.patientSignedAt).toLocaleString("es-ES")
                    : ""}
                </Text>
              </div>
              <Badge color="green" variant="light">
                Firmado por ambos
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Alert color="gray" title="Paciente">
                {viewingDocument.patientName}
                <br />
                Ficha {viewingDocument.patientRecordNumber} · DNI {viewingDocument.patientDni}
              </Alert>
              <Alert color="gray" title="Odontólogo">
                {viewingDocument.doctorName}
                <br />
                {viewingDocument.clinicSite}
              </Alert>
            </SimpleGrid>

            {viewingDocument.sourceUrl ? (
              <div>
                <Text fw={700} size="sm" mb="xs">
                  Contenido firmado
                </Text>
                <iframe
                  src={viewingDocument.sourceUrl}
                  title={`Contenido de ${viewingDocument.title}`}
                  style={{
                    width: "100%",
                    height: 520,
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: 12,
                    background: "white",
                  }}
                />
              </div>
            ) : null}

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <div>
                <Text fw={700} size="sm">
                  Firma del odontólogo
                </Text>
                <img
                  src={viewingDocument.doctorSignatureDataUrl}
                  alt="Firma del odontólogo"
                  style={{
                    width: "100%",
                    maxHeight: 170,
                    objectFit: "contain",
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: 12,
                    marginTop: 8,
                    background: "white",
                  }}
                />
                <Text size="sm" mt="xs">
                  {viewingDocument.doctorName}
                </Text>
              </div>
              <div>
                <Text fw={700} size="sm">
                  Firma del paciente
                </Text>
                <img
                  src={viewingDocument.patientSignatureDataUrl}
                  alt="Firma del paciente"
                  style={{
                    width: "100%",
                    maxHeight: 170,
                    objectFit: "contain",
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: 12,
                    marginTop: 8,
                    background: "white",
                  }}
                />
                <Text size="sm" mt="xs">
                  {viewingDocument.patientSignerName ?? viewingDocument.patientName}
                </Text>
              </div>
            </SimpleGrid>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setViewOpened(false)}>
                Cerrar
              </Button>
              <Button
                leftSection={<IconPrinter size={15} />}
                onClick={() => printSignedConsent(viewingDocument)}
              >
                PDF / imprimir
              </Button>
            </Group>
          </Stack>
        ) : (
          <Alert color="yellow" title="Firma incompleta">
            Faltan firmas o datos.
          </Alert>
        )}
      </Modal>
    </>
  );
}
