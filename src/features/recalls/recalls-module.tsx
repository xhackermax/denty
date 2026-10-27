"use client";

import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Group,
  Menu,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ActionIcon,
  Pagination,
} from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import {
  RECALL_CATEGORY_LABELS,
  RECALL_STATE_LABELS,
  RECALL_STATES,
  RECALL_UNIT_LABELS,
  type RecallState,
} from "@/domain/recalls";
import type {
  RecallAction,
  RecallActionRequest,
  RecallBulkRequest,
  RecallItem,
  RecallListFilters,
  RecallTemplate,
} from "@/shared/api";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { ConfirmDialog, DateText, EmptyState, KpiCard } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

import { availableRecallActions, RECALL_ACTION_LABELS } from "./recall-actions";
import {
  RecallPatientPicker,
  type AssignmentMode,
  type PickedPatient,
} from "./recall-patient-picker";
import { RecallTemplateWizard, type WizardOpening } from "./recall-template-wizard";
import {
  useArchiveRecallTemplateMutation,
  useAssignRecallMutation,
  useRecallActionMutation,
  useRecallBulkMutation,
  useRecallHistoryQuery,
  useRecallListQuery,
  useRecallStaffAndSitesQuery,
  useRecallTemplatesQuery,
} from "./recalls-data";

const PAGE_SIZE = 25;

// Clearing a filter passes undefined, which setFilter then drops from the query.
type FilterPatch = { [K in keyof RecallListFilters]?: RecallListFilters[K] | undefined };

const STATE_COLORS: Record<RecallState, string> = {
  PROGRAMADO: "gray",
  PROXIMO: "yellow",
  VENCIDO: "red",
  CONTACTADO: "blue",
  CITA_PROGRAMADA: "teal",
  COMPLETADO: "green",
  POSPUESTO: "grape",
  CANCELADO: "gray",
  REEMPLAZADO: "gray",
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Creado",
  CONTACTED: "Contactado",
  POSTPONED: "Pospuesto",
  RESCHEDULED: "Fecha cambiada",
  ASSIGNED: "Responsable cambiado",
  APPOINTMENT_LINKED: "Cita vinculada",
  COMPLETED: "Realizado",
  CANCELLED: "Cancelado",
  REOPENED: "Reabierto",
  UPDATED: "Actualizado",
};

// Actions that need a date, and those whose effect is worth a second look.
type DateAction = "POSTPONE" | "RESCHEDULE";
const CONFIRM_ACTIONS = new Set<RecallAction>(["COMPLETE", "CANCEL"]);
type BulkAction = "CONTACT" | "POSTPONE" | "CANCEL";

type Pending =
  | { kind: "single"; recall: RecallItem; action: RecallAction }
  | { kind: "bulk"; action: BulkAction };

/** Recall centre: recalls to work today, and the recall types that create them. */
export function RecallsModule() {
  const { permissions } = useActiveTenant();
  const canManage = permissions.includes("recalls.manage");
  const canTemplates = permissions.includes("recalls.templates.manage");
  const [filters, setFilters] = useState<RecallListFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingDate, setPendingDate] = useState("");
  const [bulkReport, setBulkReport] = useState<{ updated: number; failed: number } | null>(null);
  const [historyFor, setHistoryFor] = useState<RecallItem | null>(null);
  const [wizard, setWizard] = useState<WizardOpening | null>(null);
  const [assignTo, setAssignTo] = useState<RecallTemplate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<RecallTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const list = useRecallListQuery(filters);
  const templates = useRecallTemplatesQuery(showArchived);
  const options = useRecallStaffAndSitesQuery();
  const act = useRecallActionMutation();
  const bulk = useRecallBulkMutation();
  const archive = useArchiveRecallTemplateMutation();

  const setFilter = (patch: FilterPatch) => {
    setSelected(new Set());
    setFilters((current) => {
      const merged: FilterPatch = { ...current, ...patch, page: patch.page ?? 1 };
      for (const key of Object.keys(merged) as (keyof RecallListFilters)[]) {
        if (merged[key] === undefined || merged[key] === "") delete merged[key];
      }
      return merged as RecallListFilters;
    });
  };

  const runSingle = (recall: RecallItem, action: RecallAction, date?: string) => {
    const base = { expectedVersion: recall.version };
    const request: RecallActionRequest =
      action === "POSTPONE"
        ? { ...base, action, payload: { until: date ?? "" } }
        : action === "RESCHEDULE"
          ? { ...base, action, payload: { dueDate: date ?? "" } }
          : action === "LINK_APPOINTMENT"
            ? { ...base, action, payload: { appointmentId: recall.nextAppointment?.id ?? "" } }
            : {
                ...base,
                action: action as "CONTACT" | "COMPLETE" | "CANCEL" | "REOPEN",
                payload: {},
              };
    act.mutate({ recallId: recall.id, request }, { onSettled: () => setPending(null) });
  };

  const choose = (recall: RecallItem, action: RecallAction) => {
    if (action === "POSTPONE" || action === "RESCHEDULE" || CONFIRM_ACTIONS.has(action)) {
      setPendingDate("");
      setPending({ kind: "single", recall, action });
      return;
    }
    runSingle(recall, action);
  };

  const runBulk = (action: BulkAction, date: string) => {
    const ids = [...selected];
    const request: RecallBulkRequest =
      action === "POSTPONE"
        ? { ids, action, payload: { until: date } }
        : { ids, action, payload: {} };
    bulk.mutate(request, {
      onSuccess: (result) => {
        setBulkReport({ updated: result.updated, failed: result.failed.length });
        setSelected(new Set(result.failed.map((failure) => failure.id)));
      },
      onSettled: () => setPending(null),
    });
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === "single") runSingle(pending.recall, pending.action, pendingDate);
    else runBulk(pending.action, pendingDate);
  };

  const items = list.data?.items ?? [];
  const kpis = list.data?.kpis;
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const needsDate =
    pending !== null && (pending.action === "POSTPONE" || pending.action === "RESCHEDULE");
  const actionError = [act.error, bulk.error, archive.error].find(Boolean);

  return (
    <Stack gap="md">
      {kpis ? (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
          <KpiCard label="Pendientes" value={kpis.pending} />
          <KpiCard label="Próximos" value={kpis.upcoming} />
          <KpiCard label="Vencidos" value={kpis.overdue} />
          <KpiCard label="Contactados" value={kpis.contacted} />
          <KpiCard label="Con cita" value={kpis.booked} />
          <KpiCard label="Completados" value={kpis.completed} />
        </SimpleGrid>
      ) : null}

      {actionError ? (
        <Alert color="red">
          {actionError instanceof Error ? actionError.message : "No se pudo completar la acción."}
        </Alert>
      ) : null}
      {bulkReport ? (
        <Alert
          color={bulkReport.failed > 0 ? "yellow" : "teal"}
          withCloseButton
          onClose={() => setBulkReport(null)}
        >
          {bulkReport.updated} actualizado{bulkReport.updated === 1 ? "" : "s"}.
          {bulkReport.failed > 0
            ? ` ${bulkReport.failed} no se pudieron cambiar por su estado; siguen seleccionados.`
            : ""}
        </Alert>
      ) : null}

      <Accordion multiple variant="separated" defaultValue={["list"]}>
        <Accordion.Item value="filters">
          <Accordion.Control>Filtros</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
              <TextInput
                label="Paciente"
                placeholder="Nombre o NHC"
                value={filters.search ?? ""}
                onChange={(event) => setFilter({ search: event.currentTarget.value })}
              />
              <Select
                label="Estado"
                clearable
                data={RECALL_STATES.filter((state) => state !== "REEMPLAZADO").map((state) => ({
                  value: state,
                  label: RECALL_STATE_LABELS[state],
                }))}
                value={filters.state ?? null}
                onChange={(value) =>
                  setFilter({
                    state: (value as RecallState | null) ?? undefined,
                    ...(value === "COMPLETADO" || value === "CANCELADO"
                      ? { includeClosed: true }
                      : {}),
                  })
                }
              />
              <Select
                label="Tipo de recall"
                clearable
                data={(templates.data?.items ?? []).map((template) => ({
                  value: template.id,
                  label: template.name,
                }))}
                value={filters.templateId ?? null}
                onChange={(value) => setFilter({ templateId: value ?? undefined })}
              />
              <Select
                label="Origen"
                clearable
                data={[
                  { value: "TEMPLATE", label: "Tipos de recall" },
                  { value: "AUTOMATIC", label: "Automáticos (no asistió…)" },
                ]}
                value={filters.source ?? null}
                onChange={(value) =>
                  setFilter({ source: (value as RecallListFilters["source"]) ?? undefined })
                }
              />
              <Select
                label="Sede"
                clearable
                data={(options.data?.sites ?? []).map((site) => ({
                  value: site.id,
                  label: site.name,
                }))}
                value={filters.siteId ?? null}
                onChange={(value) => setFilter({ siteId: value ?? undefined })}
              />
              <Select
                label="Responsable"
                clearable
                data={(options.data?.staff ?? []).map((member) => ({
                  value: member.id,
                  label: member.displayName,
                }))}
                value={filters.staffId ?? null}
                onChange={(value) => setFilter({ staffId: value ?? undefined })}
              />
              <TextInput
                type="date"
                label="Fecha desde"
                value={filters.dueFrom ?? ""}
                onChange={(event) => setFilter({ dueFrom: event.currentTarget.value })}
              />
              <TextInput
                type="date"
                label="Fecha hasta"
                value={filters.dueTo ?? ""}
                onChange={(event) => setFilter({ dueTo: event.currentTarget.value })}
              />
            </SimpleGrid>
            <Switch
              mt="sm"
              label="Incluir completados y cancelados"
              checked={filters.includeClosed ?? false}
              onChange={(event) => setFilter({ includeClosed: event.currentTarget.checked })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="list">
          <Accordion.Control>Recalls de pacientes</Accordion.Control>
          <Accordion.Panel>
            {canManage && selected.size > 0 ? (
              <Group gap="xs" mb="sm" aria-label="Acciones sobre la selección">
                <Text size="sm" fw={600}>
                  {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
                </Text>
                {(["CONTACT", "POSTPONE", "CANCEL"] as const).map((action) => (
                  <Button
                    key={action}
                    size="compact-sm"
                    variant="light"
                    {...(action === "CANCEL" ? { color: "red" as const } : {})}
                    onClick={() => {
                      setPendingDate("");
                      setPending({ kind: "bulk", action });
                    }}
                  >
                    {RECALL_ACTION_LABELS[action]}
                  </Button>
                ))}
                <Button size="compact-sm" variant="subtle" onClick={() => setSelected(new Set())}>
                  Quitar selección
                </Button>
              </Group>
            ) : null}
            {list.isError ? (
              <Alert color="red">No se pudieron cargar los recalls.</Alert>
            ) : list.isLoading ? (
              <Text c="dimmed" size="sm">
                Cargando…
              </Text>
            ) : items.length === 0 ? (
              <EmptyState
                title="No hay recalls con estos filtros"
                description="Crea un tipo de recall y asígnale pacientes para empezar."
              />
            ) : (
              <div className={styles.rowList}>
                {items.map((recall) => (
                  <RecallRow
                    key={recall.id}
                    recall={recall}
                    canManage={canManage}
                    selected={selected.has(recall.id)}
                    onSelect={(checked) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (checked) next.add(recall.id);
                        else next.delete(recall.id);
                        return next;
                      })
                    }
                    onAction={(action) => choose(recall, action)}
                    onHistory={() => setHistoryFor(recall)}
                  />
                ))}
              </div>
            )}
            {totalPages > 1 ? (
              <Pagination
                mt="sm"
                total={totalPages}
                value={filters.page ?? 1}
                onChange={(page) => setFilter({ page })}
              />
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="templates">
          <Accordion.Control>Tipos de recall</Accordion.Control>
          <Accordion.Panel>
            <Group justify="space-between" mb="sm">
              <Switch
                label="Ver archivados"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.currentTarget.checked)}
              />
              {canTemplates ? (
                <Button size="sm" onClick={() => setWizard({ mode: "create" })}>
                  Nuevo tipo de recall
                </Button>
              ) : null}
            </Group>
            {templates.isError ? (
              <Alert color="red">No se pudieron cargar los tipos de recall.</Alert>
            ) : (templates.data?.items ?? []).length === 0 ? (
              <EmptyState
                title="Aún no hay tipos de recall"
                description="Por ejemplo: higiene cada 6 meses o revisión de implantes cada año."
              />
            ) : (
              <div className={styles.rowList}>
                {(templates.data?.items ?? []).map((template) => (
                  <div key={template.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {template.name}{" "}
                        {template.archivedAt ? (
                          <Badge size="xs" color="gray">
                            Archivado
                          </Badge>
                        ) : !template.active ? (
                          <Badge size="xs" color="gray">
                            Inactivo
                          </Badge>
                        ) : null}
                      </span>
                      <span className={styles.rowMeta}>
                        {RECALL_CATEGORY_LABELS[template.category]} · cada {template.intervalValue}{" "}
                        {RECALL_UNIT_LABELS[template.intervalUnit]} · {template.openCount} abiertos
                        {template.overdueCount > 0 ? ` · ${template.overdueCount} vencidos` : ""}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      {canManage && !template.archivedAt && template.active ? (
                        <Button
                          size="compact-sm"
                          variant="light"
                          onClick={() => setAssignTo(template)}
                        >
                          Asignar pacientes
                        </Button>
                      ) : null}
                      {canTemplates ? (
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon
                              variant="subtle"
                              aria-label={`Opciones de ${template.name}`}
                            >
                              <IconDots size={18} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {!template.archivedAt ? (
                              <Menu.Item onClick={() => setWizard({ mode: "edit", template })}>
                                Editar
                              </Menu.Item>
                            ) : null}
                            <Menu.Item onClick={() => setWizard({ mode: "duplicate", template })}>
                              Duplicar
                            </Menu.Item>
                            {template.archivedAt ? (
                              <Menu.Item
                                onClick={() =>
                                  archive.mutate({ templateId: template.id, archive: false })
                                }
                              >
                                Restaurar
                              </Menu.Item>
                            ) : (
                              <Menu.Item color="red" onClick={() => setArchiveTarget(template)}>
                                Archivar
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {needsDate && pending ? (
        <Modal
          opened
          centered
          onClose={() => setPending(null)}
          title={
            pending.kind === "bulk"
              ? `Posponer ${selected.size} recalls`
              : RECALL_ACTION_LABELS[pending.action]
          }
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (pendingDate) confirmPending();
            }}
          >
            <TextInput
              type="date"
              required
              data-autofocus
              label={pending.action === "POSTPONE" ? "Volver a mostrar el" : "Nueva fecha"}
              value={pendingDate}
              onChange={(event) => setPendingDate(event.currentTarget.value)}
            />
            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!pendingDate}
                loading={act.isPending || bulk.isPending}
              >
                Guardar
              </Button>
            </Group>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        opened={pending !== null && !needsDate}
        title={
          pending?.kind === "bulk"
            ? `${RECALL_ACTION_LABELS[pending.action]}: ${selected.size} recalls`
            : pending
              ? RECALL_ACTION_LABELS[pending.action]
              : ""
        }
        body={
          pending?.kind === "single"
            ? pending.action === "COMPLETE"
              ? `Se cierra el recall de ${pending.recall.patientName}${pending.recall.templateId ? " y, si el tipo se repite, se programa el siguiente" : ""}.`
              : `Se cancela el recall de ${pending.recall.patientName}. Podrás reabrirlo.`
            : pending?.action === "CANCEL"
              ? "Se cancelan los recalls seleccionados. Los que no se puedan cambiar se indicarán."
              : "Se marcan como contactados los recalls seleccionados."
        }
        confirmLabel="Confirmar"
        cancelLabel="Volver"
        destructive={pending?.action === "CANCEL"}
        loading={act.isPending || bulk.isPending}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />

      <ConfirmDialog
        opened={archiveTarget !== null}
        title="Archivar tipo de recall"
        body={`«${archiveTarget?.name ?? ""}» deja de usarse para nuevas asignaciones. Los ${archiveTarget?.openCount ?? 0} recalls abiertos se mantienen.`}
        confirmLabel="Archivar"
        cancelLabel="Volver"
        destructive
        loading={archive.isPending}
        onConfirm={() =>
          archiveTarget &&
          archive.mutate(
            { templateId: archiveTarget.id, archive: true },
            { onSettled: () => setArchiveTarget(null) },
          )
        }
        onClose={() => setArchiveTarget(null)}
      />

      <RecallHistoryDrawer recall={historyFor} onClose={() => setHistoryFor(null)} />
      {wizard ? <RecallTemplateWizard opening={wizard} onClose={() => setWizard(null)} /> : null}
      {assignTo ? <AssignDialog template={assignTo} onClose={() => setAssignTo(null)} /> : null}
    </Stack>
  );
}

interface RecallRowProps {
  recall: RecallItem;
  canManage: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onAction: (action: RecallAction) => void;
  onHistory: () => void;
}

function RecallRow({ recall, canManage, selected, onSelect, onAction, onHistory }: RecallRowProps) {
  const actions = canManage ? availableRecallActions(recall) : [];
  const selectable = canManage && (recall.status === "pending" || recall.status === "contacted");
  return (
    <div className={styles.row}>
      {selectable ? (
        <Checkbox
          aria-label={`Seleccionar a ${recall.patientName}`}
          checked={selected}
          onChange={(event) => onSelect(event.currentTarget.checked)}
        />
      ) : null}
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>
          <Anchor component={Link} href={`/app/patients/${recall.patientId}`}>
            {recall.patientName}
          </Anchor>{" "}
          <Badge size="xs" color={STATE_COLORS[recall.state]}>
            {RECALL_STATE_LABELS[recall.state]}
          </Badge>
        </span>
        <span className={styles.rowMeta}>
          {recall.templateName ?? "Automático"} · <DateText value={recall.dueAt} />
          {recall.staffName ? ` · ${recall.staffName}` : ""}
          {recall.contactAttempts > 0
            ? ` · ${recall.contactAttempts}${recall.maxAttempts ? `/${recall.maxAttempts}` : ""} intentos`
            : ""}
          {recall.bookedAppointmentAt ? (
            <>
              {" · cita "}
              <DateText value={recall.bookedAppointmentAt} />
            </>
          ) : null}
        </span>
      </div>
      <div className={styles.rowActions}>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label={`Acciones para ${recall.patientName}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component={Link} href={`/app/patients/${recall.patientId}`}>
              Ver ficha
            </Menu.Item>
            {canManage && !recall.nextAppointment && actions.length > 0 ? (
              <Menu.Item component={Link} href={`/app/agenda?patientId=${recall.patientId}`}>
                Crear cita
              </Menu.Item>
            ) : null}
            {actions.map((action) => (
              <Menu.Item
                key={action}
                {...(action === "CANCEL" ? { color: "red" as const } : {})}
                onClick={() => onAction(action)}
              >
                {RECALL_ACTION_LABELS[action]}
              </Menu.Item>
            ))}
            <Menu.Item onClick={onHistory}>Historial</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
}

function RecallHistoryDrawer({
  recall,
  onClose,
}: {
  recall: RecallItem | null;
  onClose: () => void;
}) {
  const history = useRecallHistoryQuery(recall?.id ?? null);
  return (
    <Drawer
      opened={recall !== null}
      onClose={onClose}
      position="right"
      title={recall ? `Historial · ${recall.patientName}` : "Historial"}
    >
      {history.isError ? (
        <Alert color="red">No se pudo cargar el historial.</Alert>
      ) : (history.data?.items ?? []).length === 0 ? (
        <Text c="dimmed" size="sm">
          Sin movimientos registrados.
        </Text>
      ) : (
        <Stack gap="xs">
          {(history.data?.items ?? []).map((event) => (
            <div key={event.id}>
              <Text size="sm" fw={600}>
                {EVENT_LABELS[event.eventType] ?? event.eventType}
              </Text>
              <Text size="xs" c="dimmed">
                <DateText value={event.createdAt} />
                {event.actorName ? ` · ${event.actorName}` : ""}
              </Text>
            </div>
          ))}
        </Stack>
      )}
    </Drawer>
  );
}

function AssignDialog({ template, onClose }: { template: RecallTemplate; onClose: () => void }) {
  const [mode, setMode] = useState<AssignmentMode>("MANUAL");
  const [picked, setPicked] = useState<PickedPatient[]>([]);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `assign-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const assign = useAssignRecallMutation();
  const result = assign.data;

  return (
    <Modal opened onClose={onClose} title={`Asignar pacientes · ${template.name}`} size="lg">
      {result ? (
        <Stack>
          <Alert color={result.skipped.length > 0 ? "yellow" : "teal"}>
            {result.added} recall{result.added === 1 ? "" : "s"} creado
            {result.added === 1 ? "" : "s"}.
            {result.skipped.length > 0
              ? ` ${result.skipped.length} paciente${result.skipped.length === 1 ? "" : "s"} ya tenía${result.skipped.length === 1 ? "" : "n"} uno abierto o no está activo.`
              : ""}
          </Alert>
          <Group justify="flex-end">
            <Button onClick={onClose}>Cerrar</Button>
          </Group>
        </Stack>
      ) : (
        <Stack>
          <RecallPatientPicker
            mode={mode}
            onModeChange={setMode}
            picked={picked}
            onPickedChange={setPicked}
            excludeTemplateId={template.id}
            allowAutomatic={false}
          />
          {assign.error ? (
            <Alert color="red">
              {assign.error instanceof Error ? assign.error.message : "No se pudo asignar."}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              disabled={picked.length === 0 || mode === "NINGUNO"}
              loading={assign.isPending}
              onClick={() =>
                !assign.isPending &&
                assign.mutate({
                  templateId: template.id,
                  patientIds: picked.map((patient) => patient.id),
                  dueOverrides: Object.fromEntries(
                    picked.filter((p) => p.dueDate).map((p) => [p.id, p.dueDate]),
                  ),
                  idempotencyKey,
                })
              }
            >
              Asignar {picked.length > 0 ? picked.length : ""}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
