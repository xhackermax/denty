"use client";

import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import {
  describeReward,
  REFERRAL_QUALIFICATION_LABELS,
  REFERRAL_SOURCE_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUSES,
  type ReferralStatus,
} from "@/domain/referrals";
import type { Referral, ReferralListFilters, ReferralProgram } from "@/shared/api";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { DateText, EmptyState, KpiCard } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

import { PatientSearchSelect, type PatientOption } from "./patient-search-select";
import {
  availableReferralActions,
  REFERRAL_ACTION_LABELS,
  type ReferralAction,
} from "./referral-actions";
import { ReferralLinkDialog } from "./referral-link-dialog";
import { ReferralProgramForm } from "./referral-program-form";
import { ReferralRewardsSection } from "./referral-rewards-section";
import {
  useReferralChangeMutation,
  useReferralListQuery,
  useReferralProgramsQuery,
  useReferralSitesQuery,
} from "./referrals-data";

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<ReferralStatus, string> = {
  PENDING: "yellow",
  CONFIRMED: "teal",
  VOID: "gray",
};

// Clearing a filter passes undefined, which setFilter then drops from the query.
type FilterPatch = { [K in keyof ReferralListFilters]?: ReferralListFilters[K] | undefined };

/** Pacientes asociados: who recommended whom, their benefits and the programs behind them. */
export function ReferralsModule() {
  const { permissions } = useActiveTenant();
  const granted = new Set<string>(permissions);
  const canManage = granted.has("referrals.manage");
  const canSeeRewards = granted.has("referral_rewards.read");
  const canPrograms = granted.has("referral_programs.manage");
  const [filters, setFilters] = useState<ReferralListFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [linking, setLinking] = useState(false);
  const [pending, setPending] = useState<{ referral: Referral; action: ReferralAction } | null>(
    null,
  );
  const [editing, setEditing] = useState<ReferralProgram | "new" | null>(null);
  const list = useReferralListQuery(filters);
  const programs = useReferralProgramsQuery();
  const sites = useReferralSitesQuery();

  const setFilter = (patch: FilterPatch) =>
    setFilters((current) => {
      const merged: FilterPatch = { ...current, ...patch, page: patch.page ?? 1 };
      for (const key of Object.keys(merged) as (keyof ReferralListFilters)[]) {
        if (merged[key] === undefined || merged[key] === "") delete merged[key];
      }
      return merged as ReferralListFilters;
    });

  const kpis = list.data?.kpis;
  const items = list.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));

  return (
    <Stack gap="md">
      {kpis ? (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
          <KpiCard label="Referidores con actividad" value={kpis.activeReferrers} />
          <KpiCard label="Pacientes referidos" value={kpis.referred} />
          <KpiCard label="Referidos confirmados" value={kpis.confirmed} />
          <KpiCard label="Citas obtenidas" value={kpis.withAppointments} />
          <KpiCard label="Beneficios pendientes" value={kpis.rewardsPending} />
          <KpiCard label="Beneficios utilizados" value={kpis.rewardsUsed} />
        </SimpleGrid>
      ) : null}

      <Accordion multiple variant="separated" defaultValue={["referrals"]}>
        <Accordion.Item value="filters">
          <Accordion.Control>Filtros</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              <TextInput
                label="Paciente"
                placeholder="Nombre o NHC de cualquiera de los dos"
                value={filters.search ?? ""}
                onChange={(event) => setFilter({ search: event.currentTarget.value })}
              />
              <Select
                label="Estado"
                placeholder="Activas"
                clearable
                data={REFERRAL_STATUSES.map((status) => ({
                  value: status,
                  label: REFERRAL_STATUS_LABELS[status],
                }))}
                value={filters.status ?? null}
                onChange={(value) =>
                  setFilter({ status: (value as ReferralStatus | null) ?? undefined })
                }
              />
              <Select
                label="Programa"
                clearable
                data={(programs.data?.items ?? []).map((program) => ({
                  value: program.id,
                  label: program.name,
                }))}
                value={filters.programId ?? null}
                onChange={(value) => setFilter({ programId: value ?? undefined })}
              />
              <Select
                label="Sede"
                clearable
                data={(sites.data ?? []).map((site) => ({ value: site.id, label: site.name }))}
                value={filters.siteId ?? null}
                onChange={(value) => setFilter({ siteId: value ?? undefined })}
              />
              <TextInput
                type="date"
                label="Recomendado desde"
                value={filters.from ?? ""}
                onChange={(event) => setFilter({ from: event.currentTarget.value })}
              />
              <TextInput
                type="date"
                label="Recomendado hasta"
                value={filters.to ?? ""}
                onChange={(event) => setFilter({ to: event.currentTarget.value })}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="referrals">
          <Accordion.Control>Asociaciones</Accordion.Control>
          <Accordion.Panel>
            {canManage ? (
              <Group justify="flex-end" mb="sm">
                <Button size="sm" onClick={() => setLinking(true)}>
                  Asociar pacientes
                </Button>
              </Group>
            ) : null}
            {list.isError ? (
              <Alert color="red">No se pudieron cargar las asociaciones.</Alert>
            ) : list.isLoading ? (
              <Text c="dimmed" size="sm">
                Cargando…
              </Text>
            ) : items.length === 0 ? (
              <EmptyState
                title="Aún no hay pacientes asociados"
                description="Registra aquí quién ha recomendado la clínica a un paciente nuevo."
              />
            ) : (
              <div className={styles.rowList}>
                {items.map((referral) => (
                  <ReferralRow
                    key={referral.id}
                    referral={referral}
                    actions={availableReferralActions(referral, granted)}
                    onAction={(action) => setPending({ referral, action })}
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

        {canSeeRewards ? (
          <Accordion.Item value="rewards">
            <Accordion.Control>Beneficios</Accordion.Control>
            <Accordion.Panel>
              <ReferralRewardsSection permissions={granted} />
            </Accordion.Panel>
          </Accordion.Item>
        ) : null}

        <Accordion.Item value="programs">
          <Accordion.Control>Programas</Accordion.Control>
          <Accordion.Panel>
            {canPrograms ? (
              <Group justify="flex-end" mb="sm">
                <Button size="sm" onClick={() => setEditing("new")}>
                  Nuevo programa
                </Button>
              </Group>
            ) : null}
            {(programs.data?.items ?? []).length === 0 ? (
              <EmptyState
                title="No hay programas"
                description="Sin programa activo las asociaciones se registran sin beneficios."
              />
            ) : (
              <div className={styles.rowList}>
                {(programs.data?.items ?? []).map((program) => (
                  <div key={program.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {program.name}{" "}
                        <Badge size="xs" color={program.active ? "teal" : "gray"}>
                          {program.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </span>
                      <span className={styles.rowMeta}>
                        Quien recomienda: {describeReward(program.referrerReward)} · Paciente nuevo:{" "}
                        {describeReward(program.referredReward)} ·{" "}
                        {REFERRAL_QUALIFICATION_LABELS[program.qualification]} ·{" "}
                        {program.referralCount} asociaciones
                      </span>
                    </div>
                    {canPrograms ? (
                      <div className={styles.rowActions}>
                        <Button
                          size="compact-sm"
                          variant="light"
                          onClick={() => setEditing(program)}
                        >
                          Editar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {linking ? <ReferralLinkDialog onClose={() => setLinking(false)} /> : null}
      {pending ? (
        <ReferralActionDialog
          referral={pending.referral}
          action={pending.action}
          onClose={() => setPending(null)}
        />
      ) : null}
      {editing ? (
        <ReferralProgramForm
          program={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Stack>
  );
}

function ReferralRow({
  referral,
  actions,
  onAction,
}: {
  referral: Referral;
  actions: ReferralAction[];
  onAction: (action: ReferralAction) => void;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>
          <Anchor component={Link} href={`/app/patients/${referral.referrer.id}`}>
            {referral.referrer.name}
          </Anchor>
          {" → "}
          <Anchor component={Link} href={`/app/patients/${referral.referred.id}`}>
            {referral.referred.name}
          </Anchor>{" "}
          <Badge size="xs" color={STATUS_COLORS[referral.status]}>
            {REFERRAL_STATUS_LABELS[referral.status]}
          </Badge>
        </span>
        <span className={styles.rowMeta}>
          NHC {referral.referrer.recordNumber ?? "—"} → {referral.referred.recordNumber ?? "—"} ·{" "}
          <DateText value={referral.reportedAt} /> · {REFERRAL_SOURCE_LABELS[referral.source]}
          {referral.siteName ? ` · ${referral.siteName}` : ""}
          {referral.programName ? ` · ${referral.programName}` : ""}
          {referral.rewardCount > 0 ? ` · ${referral.rewardCount} beneficios` : ""}
          {referral.voidReason ? ` · anulada: ${referral.voidReason}` : ""}
        </span>
      </div>
      {actions.length > 0 ? (
        <div className={styles.rowActions}>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                aria-label={`Acciones para ${referral.referrer.name} → ${referral.referred.name}`}
              >
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {actions.map((action) => (
                <Menu.Item
                  key={action}
                  {...(action === "void" ? { color: "red" as const } : {})}
                  onClick={() => onAction(action)}
                >
                  {REFERRAL_ACTION_LABELS[action]}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>
      ) : null}
    </div>
  );
}

function ReferralActionDialog({
  referral,
  action,
  onClose,
}: {
  referral: Referral;
  action: ReferralAction;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [newReferrer, setNewReferrer] = useState<PatientOption | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const change = useReferralChangeMutation();
  const needsReason = action !== "confirm";
  const problem =
    needsReason && reason.trim().length < 3
      ? "Indica el motivo."
      : action === "reassign" && !newReferrer
        ? "Elige quién recomienda."
        : null;

  const submit = () => {
    setSubmitted(true);
    if (problem || change.isPending) return;
    const base = { referralId: referral.id, expectedVersion: referral.version };
    const done = { onSuccess: onClose };
    if (action === "confirm") change.mutate({ ...base, action }, done);
    else if (action === "void") change.mutate({ ...base, action, reason: reason.trim() }, done);
    else if (newReferrer) {
      change.mutate(
        { ...base, action, reason: reason.trim(), newReferrerPatientId: newReferrer.id },
        done,
      );
    }
  };

  return (
    <Modal opened onClose={onClose} title={REFERRAL_ACTION_LABELS[action]}>
      <Stack gap="sm">
        <Text size="sm">
          {referral.referrer.name} recomendó a {referral.referred.name}.
          {action === "confirm"
            ? referral.programName
              ? " Si el programa está activo se generarán sus beneficios pendientes de validar."
              : " No tiene programa, así que no genera beneficios."
            : action === "void"
              ? referral.status === "CONFIRMED"
                ? " Se cancelarán sus beneficios no usados."
                : ""
              : " La relación actual se anula con este motivo y se crea una nueva."}
        </Text>
        {action === "reassign" ? (
          <PatientSearchSelect
            label="Quién recomienda en realidad"
            required
            value={newReferrer}
            onChange={setNewReferrer}
            excludeId={referral.referred.id}
          />
        ) : null}
        {needsReason ? (
          <TextInput
            label="Motivo"
            required
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
        ) : null}
        {submitted && problem ? <Alert color="yellow">{problem}</Alert> : null}
        {change.error ? (
          <Alert color="red">
            {change.error instanceof Error ? change.error.message : "No se pudo completar."}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Volver
          </Button>
          <Button
            onClick={submit}
            loading={change.isPending}
            {...(action === "void" ? { color: "red" as const } : {})}
          >
            {REFERRAL_ACTION_LABELS[action]}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
