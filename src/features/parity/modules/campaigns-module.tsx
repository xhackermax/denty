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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
import { ActionErrorAlert } from "./action-error-alert";

export function CampaignsModule() {
  const qc = useQueryClient();
  const { permissions } = useActiveTenant();
  const canManageCampaigns = permissions.includes("marketing.manage");
  const [provider, setProvider] = useState<"META" | "GOOGLE" | "INTERNAL">("INTERNAL");
  const [name, setName] = useState("");
  const [dailyBudgetCents, setDailyBudgetCents] = useState(0);
  const campaigns = useQuery({
    queryKey: dentyQueryKeys.campaigns.all,
    queryFn: () => getBrowserApi().engagement.marketing.campaigns(),
  });
  const createCampaign = useMutation({
    mutationFn: () =>
      getBrowserApi().engagement.marketing.createCampaign({
        provider,
        name: name.trim(),
        dailyBudgetCents,
      }),
    onSuccess: () => {
      setName("");
      setDailyBudgetCents(0);
      void qc.invalidateQueries({ queryKey: dentyQueryKeys.campaigns.root });
    },
  });
  const status = useMutation({
    mutationFn: (input: { provider: string; externalId: string; next: "ACTIVE" | "PAUSED" }) =>
      getBrowserApi().engagement.marketing.setStatus(input.provider, input.externalId, {
        status: input.next,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: dentyQueryKeys.campaigns.root }),
  });
  if (campaigns.isError)
    return <Alert color="red">No se pudieron cargar las campañas reales.</Alert>;
  return (
    <Stack gap="md">
      <ActionErrorAlert errors={[createCampaign.error, status.error]} />
      {canManageCampaigns ? (
        <section className={styles.section}>
          <Text fw={700}>Nueva campaña</Text>
          <Group mt="sm" align="end" grow>
            <Select
              label="Proveedor"
              data={["INTERNAL", "META", "GOOGLE"]}
              value={provider}
              onChange={(v) => setProvider((v ?? "INTERNAL") as typeof provider)}
            />
            <TextInput
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <NumberInput
              label="Presupuesto diario"
              min={0}
              value={dailyBudgetCents / 100}
              onChange={(v) =>
                setDailyBudgetCents(Math.round((typeof v === "number" ? v : 0) * 100))
              }
              suffix=" €"
            />
            <Button
              disabled={!name.trim()}
              loading={createCampaign.isPending}
              onClick={() => createCampaign.mutate()}
            >
              Crear
            </Button>
          </Group>
        </section>
      ) : null}
      <div className={styles.rowList}>
        {(campaigns.data?.items ?? []).map((campaign) => {
          const row = campaign as typeof campaign & {
            attributedPatients?: number;
            signedBudgets?: number;
            invoicedCents?: number;
            collectedCents?: number;
            dailyBudgetCents?: number;
          };
          return (
            <div className={styles.row} key={`${campaign.provider}:${campaign.externalId}`}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{campaign.name}</span>
                <span className={styles.rowMeta}>
                  {campaign.provider} · {row.attributedPatients ?? 0} pacientes ·{" "}
                  {row.signedBudgets ?? 0} presupuestos · facturado{" "}
                  {((row.invoicedCents ?? 0) / 100).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}{" "}
                  · cobrado{" "}
                  {((row.collectedCents ?? 0) / 100).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <Group>
                <Badge variant="light">{campaign.status}</Badge>
                {canManageCampaigns ? (
                  <Button
                    size="xs"
                    variant="light"
                    loading={status.isPending}
                    onClick={() =>
                      status.mutate({
                        provider: campaign.provider,
                        externalId: campaign.id ?? campaign.externalId,
                        next: campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                      })
                    }
                  >
                    {campaign.status === "ACTIVE" ? "Pausar" : "Activar"}
                  </Button>
                ) : null}
              </Group>
            </div>
          );
        })}
        {!campaigns.isLoading && (campaigns.data?.items.length ?? 0) === 0 ? (
          <Text c="dimmed">No hay campañas.</Text>
        ) : null}
      </div>
    </Stack>
  );
}
