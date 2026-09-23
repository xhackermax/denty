"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import styles from "@/shared/ui/parity.module.css";

type CampaignProvider = "META" | "GOOGLE" | "INTERNAL";
type CampaignStatus = "ACTIVE" | "PAUSED" | "DRAFT";

interface CampaignRow {
  id: string;
  name: string;
  provider: CampaignProvider;
  status: CampaignStatus;
  budgetCents: number;
  spendCents: number;
  leads: number;
}

const INITIAL_CAMPAIGNS: readonly CampaignRow[] = [
  {
    id: "CMP-91",
    name: "Implantes verano",
    provider: "META",
    status: "ACTIVE",
    budgetCents: 50000,
    spendCents: 36400,
    leads: 18,
  },
  {
    id: "CMP-92",
    name: "Ortodoncia -20%",
    provider: "GOOGLE",
    status: "ACTIVE",
    budgetCents: 32000,
    spendCents: 24100,
    leads: 11,
  },
  {
    id: "CMP-93",
    name: "Higiene YUDIGAR",
    provider: "INTERNAL",
    status: "PAUSED",
    budgetCents: 0,
    spendCents: 0,
    leads: 34,
  },
];

const CONNECTIONS = [
  { provider: "META", label: "Meta · Facebook + Instagram", connected: false },
  { provider: "GOOGLE", label: "Google Ads", connected: false },
  { provider: "INTERNAL", label: "Campañas internas", connected: true },
] as const;

function euros(cents: number): string {
  return `${(cents / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
}

export function CampaignsModule() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(() => [...INITIAL_CAMPAIGNS]);
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<CampaignProvider>("INTERNAL");
  const [budgetEuros, setBudgetEuros] = useState<number | string>(0);

  const createCampaign = () => {
    if (!name.trim()) return;
    setCampaigns((current) => [
      {
        id: `CMP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        name: name.trim(),
        provider,
        status: "DRAFT",
        budgetCents: Math.max(0, Math.round(Number(budgetEuros || 0) * 100)),
        spendCents: 0,
        leads: 0,
      },
      ...current,
    ]);
    setName("");
    setBudgetEuros(0);
    setOpened(false);
  };

  const toggle = (id: string) => {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === id
          ? { ...campaign, status: campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }
          : campaign,
      ),
    );
  };

  return (
    <>
      <Alert color="yellow" title="Canales sin conectar" mb="md">
        Meta y Google se muestran con su estado real de conexión. Denty no inventa gasto ni
        resultados de proveedores no conectados.
      </Alert>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Conexiones</h2>
            <p className={styles.sectionDescription}>
              Las credenciales viven únicamente en servidor.
            </p>
          </div>
        </div>
        <div className={styles.rowList}>
          {CONNECTIONS.map((connection) => (
            <div className={styles.row} key={connection.provider}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{connection.label}</span>
                <span className={styles.rowMeta}>
                  {connection.connected ? "Sincronización disponible" : "No conectado"}
                </span>
              </div>
              <Badge color={connection.connected ? "green" : "gray"} variant="light">
                {connection.connected ? "Conectado" : "No conectado"}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Campañas</h2>
            <p className={styles.sectionDescription}>
              Presupuesto, gasto, leads y estado por proveedor.
            </p>
          </div>
          <Button size="xs" onClick={() => setOpened(true)}>
            Nueva campaña
          </Button>
        </div>
        <div className={styles.rowList}>
          {campaigns.map((campaign) => (
            <div className={styles.row} key={campaign.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{campaign.name}</span>
                <span className={styles.rowMeta}>
                  {campaign.provider} · Presupuesto {euros(campaign.budgetCents)} · Gasto{" "}
                  {euros(campaign.spendCents)} · {campaign.leads} leads
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge color={campaign.status === "ACTIVE" ? "green" : "gray"} variant="light">
                  {campaign.status}
                </Badge>
                <Button size="xs" variant="light" onClick={() => toggle(campaign.id)}>
                  {campaign.status === "ACTIVE" ? "Pausar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nueva campaña">
        <Stack>
          <TextInput
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Select
            label="Proveedor"
            value={provider}
            onChange={(value) => setProvider((value as CampaignProvider) ?? "INTERNAL")}
            data={[
              { value: "META", label: "Meta" },
              { value: "GOOGLE", label: "Google" },
              { value: "INTERNAL", label: "Interna" },
            ]}
          />
          <NumberInput
            label="Presupuesto"
            min={0}
            decimalScale={2}
            value={budgetEuros}
            onChange={setBudgetEuros}
          />
          <Text size="xs" c="dimmed">
            Una campaña externa creada sin conexión permanecerá en borrador hasta que backend
            confirme el proveedor.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={createCampaign}>Crear</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
