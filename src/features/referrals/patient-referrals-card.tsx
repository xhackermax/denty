"use client";

import { Anchor, Badge, Button, Group, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import { describeReward, REFERRAL_STATUS_LABELS, REWARD_STATE_LABELS } from "@/domain/referrals";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";

import { ReferralLinkDialog } from "./referral-link-dialog";
import { usePatientReferralsQuery } from "./referrals-data";

/** "Referidos y recomendaciones" in the patient record, for authorised staff only. */
export function PatientReferralsCard({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const { permissions } = useActiveTenant();
  const canRead = permissions.includes("referrals.read");
  const canManage = permissions.includes("referrals.manage");
  const summary = usePatientReferralsQuery(patientId, canRead);
  const [linking, setLinking] = useState(false);
  if (!canRead) return null;
  const data = summary.data;
  const usable = (data?.rewards ?? []).filter(
    (reward) => reward.state === "DISPONIBLE" || reward.state === "PARCIAL",
  );
  const credit = usable.reduce((total, reward) => total + (reward.remainingCents ?? 0), 0);

  return (
    <section className={styles.summaryTile} aria-label="Recomendaciones del paciente">
      <Group justify="space-between">
        <span className={styles.summaryTileLabel}>Recomendaciones</span>
        <Anchor component={Link} href="/app/referrals" size="sm">
          Ver todas
        </Anchor>
      </Group>
      {summary.isError ? (
        <Text c="red" size="sm">
          No se pudieron cargar las recomendaciones.
        </Text>
      ) : !data ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : (
        <Stack gap={4}>
          <Text size="sm">
            {data.referredBy ? (
              <>
                Recomendado por{" "}
                <Anchor component={Link} href={`/app/patients/${data.referredBy.referrer.id}`}>
                  {data.referredBy.referrer.name}
                </Anchor>{" "}
                <Badge size="xs" variant="light">
                  {REFERRAL_STATUS_LABELS[data.referredBy.status]}
                </Badge>
              </>
            ) : (
              "Sin recomendación registrada."
            )}
          </Text>
          <Text size="sm">
            Ha recomendado a {data.referrals.length} paciente
            {data.referrals.length === 1 ? "" : "s"}
            {data.referrals.length > 0
              ? `: ${data.referrals.map((referral) => referral.referred.name).join(", ")}`
              : "."}
          </Text>
          {data.rewards ? (
            <Text size="sm">
              {usable.length === 0
                ? "Sin beneficios disponibles."
                : `${usable.length} beneficio${usable.length === 1 ? "" : "s"} disponible${usable.length === 1 ? "" : "s"}${credit > 0 ? ` · ${formatEUR(credit)} de crédito` : ""}.`}
            </Text>
          ) : null}
          {(data.rewards ?? []).slice(0, 3).map((reward) => (
            <Text key={reward.id} size="xs" c="dimmed">
              {describeReward(reward)} · {REWARD_STATE_LABELS[reward.state]}
            </Text>
          ))}
          {canManage && !data.referredBy ? (
            <Group>
              <Button size="compact-xs" variant="light" onClick={() => setLinking(true)}>
                Registrar quién le recomendó
              </Button>
            </Group>
          ) : null}
        </Stack>
      )}
      {linking ? (
        <ReferralLinkDialog
          referred={{ id: patientId, name: patientName }}
          onClose={() => setLinking(false)}
        />
      ) : null}
    </section>
  );
}
