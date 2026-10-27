"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
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
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import {
  describeReward,
  REWARD_STATE_LABELS,
  REWARD_STATES,
  type RewardState,
} from "@/domain/referrals";
import type { ReferralReward, ReferralRewardListFilters } from "@/shared/api";
import { DateText, EmptyState, KpiCard } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

import {
  availableRewardActions,
  REWARD_ACTION_LABELS,
  type RewardAction,
} from "./referral-actions";
import {
  useReferralRedemptionsQuery,
  useReferralRewardsQuery,
  useRewardChangeMutation,
} from "./referrals-data";

const PAGE_SIZE = 25;

export const REWARD_STATE_COLORS: Record<RewardState, string> = {
  PENDIENTE: "yellow",
  DISPONIBLE: "teal",
  PARCIAL: "blue",
  USADO: "gray",
  VENCIDO: "red",
  CANCELADO: "gray",
};

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `redeem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Benefits ledger: validate, redeem and review movements; balances are never edited. */
export function ReferralRewardsSection({ permissions }: { permissions: ReadonlySet<string> }) {
  const [filters, setFilters] = useState<ReferralRewardListFilters>({ page: 1 });
  const [pending, setPending] = useState<{ reward: ReferralReward; action: RewardAction } | null>(
    null,
  );
  const [movementsOf, setMovementsOf] = useState<ReferralReward | null>(null);
  const rewards = useReferralRewardsQuery(filters);
  const kpis = rewards.data?.kpis;
  const items = rewards.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((rewards.data?.total ?? 0) / PAGE_SIZE));

  return (
    <Stack gap="sm">
      {kpis ? (
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
          <KpiCard label="Pendientes" value={kpis.pending} />
          <KpiCard label="Disponibles" value={kpis.earned} />
          <KpiCard label="Usados" value={kpis.used} />
          <KpiCard label="Vencidos" value={kpis.expired} />
          <KpiCard label="Crédito restante" value={formatEUR(kpis.creditRemainingCents)} />
        </SimpleGrid>
      ) : null}
      <Group grow align="flex-end">
        <TextInput
          label="Beneficiario"
          placeholder="Nombre o NHC"
          value={filters.search ?? ""}
          onChange={(event) => {
            const search = event.currentTarget.value;
            setFilters(({ search: _old, ...rest }) => ({
              ...rest,
              page: 1,
              ...(search ? { search } : {}),
            }));
          }}
        />
        <Select
          label="Estado"
          clearable
          data={REWARD_STATES.map((state) => ({ value: state, label: REWARD_STATE_LABELS[state] }))}
          value={filters.state ?? null}
          onChange={(value) =>
            setFilters(({ state: _old, ...rest }) => ({
              ...rest,
              page: 1,
              ...(value ? { state: value as RewardState } : {}),
            }))
          }
        />
      </Group>
      {rewards.isError ? (
        <Alert color="red">No se pudieron cargar los beneficios.</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          title="No hay beneficios"
          description="Se generan al confirmar un referido de un programa activo."
        />
      ) : (
        <div className={styles.rowList}>
          {items.map((reward) => {
            const actions = availableRewardActions(reward, permissions);
            return (
              <div key={reward.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {reward.beneficiary.name}{" "}
                    <Badge size="xs" color={REWARD_STATE_COLORS[reward.state]}>
                      {REWARD_STATE_LABELS[reward.state]}
                    </Badge>
                  </span>
                  <span className={styles.rowMeta}>
                    {describeReward(reward)}
                    {reward.remainingCents !== null && reward.appliedCount > 0
                      ? ` · quedan ${formatEUR(reward.remainingCents)}`
                      : ""}
                    {` · ${reward.beneficiaryRole === "REFERRER" ? "por recomendar a" : "recomendado por"} ${reward.origin.name}`}
                    {reward.programName ? ` · ${reward.programName}` : ""}
                    {reward.expiresAt ? (
                      <>
                        {" · vence "}
                        <DateText value={reward.expiresAt} />
                      </>
                    ) : null}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Acciones del beneficio de ${reward.beneficiary.name}`}
                      >
                        <IconDots size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {actions.map((action) => (
                        <Menu.Item
                          key={action}
                          {...(action === "cancel" ? { color: "red" as const } : {})}
                          onClick={() => setPending({ reward, action })}
                        >
                          {REWARD_ACTION_LABELS[action]}
                        </Menu.Item>
                      ))}
                      <Menu.Item onClick={() => setMovementsOf(reward)}>Movimientos</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 ? (
        <Pagination
          total={totalPages}
          value={filters.page ?? 1}
          onChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      ) : null}
      {pending ? (
        <RewardActionDialog
          reward={pending.reward}
          action={pending.action}
          onClose={() => setPending(null)}
        />
      ) : null}
      <RewardMovementsDrawer
        reward={movementsOf}
        canReverse={permissions.has("referral_rewards.reverse")}
        onClose={() => setMovementsOf(null)}
      />
    </Stack>
  );
}

function RewardActionDialog({
  reward,
  action,
  onClose,
}: {
  reward: ReferralReward;
  action: RewardAction;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // One key per dialog: a double click or a retry cannot redeem twice.
  const [idempotencyKey] = useState(newIdempotencyKey);
  const change = useRewardChangeMutation();
  const isCredit = reward.kind === "CREDIT";
  const amountCents = Math.round(Number(amountEuros.replace(",", ".")) * 100);
  const needsReference = action === "approve" && reward.qualification !== "APROBACION_MANUAL";

  const problem = (() => {
    if (action === "cancel" && text.trim().length < 3) return "Indica el motivo.";
    if (needsReference && !text.trim()) return "Indica la cita, el pago o el documento.";
    if (action === "redeem" && isCredit) {
      if (!Number.isFinite(amountCents) || amountCents <= 0) return "Indica el importe.";
      if (amountCents > (reward.remainingCents ?? 0)) return "Supera el crédito disponible.";
    }
    return null;
  })();

  const submit = () => {
    setSubmitted(true);
    if (problem || change.isPending) return;
    const done = { onSuccess: onClose };
    if (action === "approve") {
      change.mutate(
        {
          action,
          rewardId: reward.id,
          expectedVersion: reward.version,
          reference: text.trim() || null,
        },
        done,
      );
    } else if (action === "cancel") {
      change.mutate(
        { action, rewardId: reward.id, expectedVersion: reward.version, reason: text.trim() },
        done,
      );
    } else {
      change.mutate(
        {
          action,
          rewardId: reward.id,
          input: {
            amountCents: isCredit ? amountCents : null,
            reason: text.trim() || null,
            idempotencyKey,
          },
        },
        done,
      );
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={`${REWARD_ACTION_LABELS[action]} · ${reward.beneficiary.name}`}
    >
      <Stack gap="sm">
        <Text size="sm">{describeReward(reward)}</Text>
        {action === "redeem" && isCredit ? (
          <TextInput
            label={`Importe a usar (disponible ${formatEUR(reward.remainingCents ?? 0)})`}
            inputMode="decimal"
            rightSection="€"
            value={amountEuros}
            onChange={(event) => setAmountEuros(event.currentTarget.value)}
          />
        ) : null}
        <TextInput
          label={
            action === "approve"
              ? needsReference
                ? "Prueba de cumplimiento"
                : "Referencia (opcional)"
              : action === "cancel"
                ? "Motivo"
                : "Nota (opcional)"
          }
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        {action === "redeem" ? (
          <Text size="xs" c="dimmed">
            El canje queda anotado; aplica el descuento en el presupuesto o la factura nueva. Las
            facturas emitidas no se modifican.
          </Text>
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
            {...(action === "cancel" ? { color: "red" as const } : {})}
          >
            {REWARD_ACTION_LABELS[action]}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RewardMovementsDrawer({
  reward,
  canReverse,
  onClose,
}: {
  reward: ReferralReward | null;
  canReverse: boolean;
  onClose: () => void;
}) {
  const movements = useReferralRedemptionsQuery(reward?.id ?? null);
  const change = useRewardChangeMutation();
  const [reversing, setReversing] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <Drawer
      opened={reward !== null}
      onClose={onClose}
      position="right"
      title={reward ? `Movimientos · ${reward.beneficiary.name}` : "Movimientos"}
    >
      {movements.isError ? (
        <Alert color="red">No se pudieron cargar los movimientos.</Alert>
      ) : (movements.data?.items ?? []).length === 0 ? (
        <Text c="dimmed" size="sm">
          Todavía no se ha usado.
        </Text>
      ) : (
        <Stack gap="sm">
          {(movements.data?.items ?? []).map((movement) => (
            <Stack key={movement.id} gap={2}>
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {movement.amountCents === null ? "Canje" : formatEUR(movement.amountCents)}
                  {movement.status === "REVERSED" ? " · revertido" : ""}
                </Text>
                {canReverse && movement.status === "APPLIED" ? (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      setReason("");
                      setReversing(movement.id);
                    }}
                  >
                    Revertir
                  </Button>
                ) : null}
              </Group>
              <Text size="xs" c="dimmed">
                <DateText value={movement.createdAt} />
                {movement.actorName ? ` · ${movement.actorName}` : ""}
                {movement.reason ? ` · ${movement.reason}` : ""}
                {movement.reversalReason ? ` · revertido: ${movement.reversalReason}` : ""}
              </Text>
              {reversing === movement.id ? (
                <Group align="flex-end" gap="xs">
                  <TextInput
                    label="Motivo de la reversión"
                    size="xs"
                    value={reason}
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />
                  <Button
                    size="xs"
                    color="red"
                    disabled={reason.trim().length < 3}
                    loading={change.isPending}
                    onClick={() =>
                      change.mutate(
                        { action: "reverse", redemptionId: movement.id, reason: reason.trim() },
                        { onSuccess: () => setReversing(null) },
                      )
                    }
                  >
                    Confirmar
                  </Button>
                </Group>
              ) : null}
            </Stack>
          ))}
          {change.error ? (
            <Alert color="red">
              {change.error instanceof Error ? change.error.message : "No se pudo revertir."}
            </Alert>
          ) : null}
        </Stack>
      )}
    </Drawer>
  );
}
