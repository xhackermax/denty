"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import type {
  PaymentTerminal,
  PaymentTerminalsOverview,
  TerminalProvider,
} from "@/shared/api/schemas/admin";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

const PROVIDER_NAMES: Record<TerminalProvider, string> = {
  sumup: "SumUp",
  stripe: "Stripe Terminal",
};

/** Where each provider shows the code Denty needs, in the reader itself. */
const PAIRING_STEPS: Record<TerminalProvider, string[]> = {
  sumup: [
    "Enciende el SumUp Solo y conéctalo a la wifi de la clínica.",
    "En el lector: Menú › Conexiones › API › Conectar.",
    "Escribe aquí el código que aparece en la pantalla.",
  ],
  stripe: [
    "Enciende el lector (WisePOS E o S700) y conéctalo a la wifi de la clínica.",
    "En el lector: desliza desde la izquierda › Ajustes › Generar código de emparejamiento.",
    "Escribe aquí el código de tres palabras que aparece (p. ej. «manzana-gato-sol»).",
  ],
};

const STATUS: Record<PaymentTerminal["status"], { label: string; color: string }> = {
  online: { label: "Conectado", color: "green" },
  offline: { label: "Sin conexión", color: "orange" },
  unknown: { label: "Sin comprobar", color: "gray" },
};

function messageFromError(error: unknown) {
  return error instanceof DentyApiError ? error.message : "No se pudo completar la operación.";
}

export function AdminPaymentTerminalsPanel() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: dentyQueryKeys.finance.terminalsOverview,
    queryFn: () => getBrowserApi().admin.paymentTerminals.overview(),
  });
  const sitesOverview = useQuery({
    queryKey: dentyQueryKeys.settings.sitesOverview,
    queryFn: () => getBrowserApi().admin.sites.overview(),
  });
  const [adding, setAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ color: string; text: string } | null>(null);

  const sites = sitesOverview.data?.sites ?? [];
  const siteOptions = sites.map((site) => ({
    value: site.id,
    label: site.active ? site.name : `${site.name} (cerrada)`,
  }));

  const apply = (data: PaymentTerminalsOverview) => {
    queryClient.setQueryData(dentyQueryKeys.finance.terminalsOverview, data);
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.finance.terminals });
  };

  const test = useMutation({
    mutationFn: (provider: TerminalProvider) =>
      getBrowserApi().admin.paymentTerminals.test({ provider }),
    onSuccess: (result) => setNotice({ color: "green", text: result.message }),
    onError: (error) => setNotice({ color: "red", text: messageFromError(error) }),
  });
  const update = useMutation({
    mutationFn: (input: { id: string; siteId: string | null }) =>
      getBrowserApi().admin.paymentTerminals.update(input.id, { siteId: input.siteId }),
    onSuccess: apply,
    onError: (error) => setNotice({ color: "red", text: messageFromError(error) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => getBrowserApi().admin.paymentTerminals.remove(id),
    onSuccess: (data) => {
      apply(data);
      setConfirmingId(null);
      setNotice({ color: "green", text: "Datáfono desvinculado." });
    },
    onError: (error) => setNotice({ color: "red", text: messageFromError(error) }),
  });

  const providers = overview.data?.providers ?? [];
  const terminals = overview.data?.terminals ?? [];
  const anyConfigured = providers.some((provider) => provider.configured);

  return (
    <Stack>
      {overview.isError ? <Alert color="red">{messageFromError(overview.error)}</Alert> : null}
      {notice ? (
        <Alert color={notice.color} withCloseButton onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <Title order={3} className={styles.sectionTitle}>
              Proveedores
            </Title>
            <Text className={styles.sectionDescription}>
              El datáfono del banco no necesita configuración: se cobra en él y se registra en
              Denty. Para que Denty envíe el importe al datáfono, conecta SumUp o Stripe.
            </Text>
          </div>
        </div>
        <div className={styles.rowList}>
          {providers.map((provider) => (
            <div className={styles.row} key={provider.provider}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{PROVIDER_NAMES[provider.provider]}</span>
                {provider.configured ? (
                  <span className={styles.rowMeta}>
                    {provider.error ?? "Claves configuradas en el servidor."}
                  </span>
                ) : (
                  <Text size="sm" c="dimmed">
                    Una sola vez: en Vercel › Settings › Environment Variables añade{" "}
                    <b>{provider.missing.join(" y ")}</b> marcadas como «Sensitive» y vuelve a
                    publicar. Las claves se sacan de{" "}
                    {provider.provider === "sumup"
                      ? "SumUp › Perfil › Desarrolladores › Claves API (el código de comercio aparece en tu perfil)"
                      : "Stripe › Desarrolladores › Claves API (clave secreta «sk_live_…»)"}
                    . Nunca las pegues en un chat.
                  </Text>
                )}
              </div>
              <Group gap="xs">
                <Badge color={provider.configured ? (provider.error ? "orange" : "green") : "gray"}>
                  {provider.configured ? (provider.error ? "Revisar" : "Listo") : "Faltan claves"}
                </Badge>
                <Button
                  size="xs"
                  variant="light"
                  disabled={!provider.configured}
                  loading={test.isPending && test.variables === provider.provider}
                  onClick={() => test.mutate(provider.provider)}
                >
                  Probar conexión
                </Button>
              </Group>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <Title order={3} className={styles.sectionTitle}>
              Datáfonos por sede
            </Title>
            <Text className={styles.sectionDescription}>
              Al cobrar, Denty propone el datáfono de la sede en la que estás.
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            disabled={!anyConfigured || !sites.length}
            onClick={() => setAdding(true)}
          >
            Añadir datáfono
          </Button>
        </div>
        <div className={styles.rowList}>
          {terminals.map((terminal) => (
            <div className={styles.row} key={terminal.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{terminal.label}</span>
                <span className={styles.rowMeta}>
                  {PROVIDER_NAMES[terminal.provider]}
                  {terminal.model ? ` · ${terminal.model}` : ""}
                </span>
              </div>
              <Group gap="xs" wrap="nowrap">
                <Select
                  size="xs"
                  aria-label={`Sede de ${terminal.label}`}
                  data={siteOptions}
                  value={terminal.siteId}
                  placeholder="Sin sede"
                  onChange={(value) => update.mutate({ id: terminal.id, siteId: value })}
                  clearable
                />
                <Badge color={STATUS[terminal.status].color}>{STATUS[terminal.status].label}</Badge>
                {confirmingId === terminal.id ? (
                  <>
                    <Button size="xs" variant="default" onClick={() => setConfirmingId(null)}>
                      No
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      loading={remove.isPending && remove.variables === terminal.id}
                      onClick={() => remove.mutate(terminal.id)}
                    >
                      Sí, desvincular
                    </Button>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    title="Habrá que emparejarlo de nuevo para volver a usarlo"
                    onClick={() => setConfirmingId(terminal.id)}
                  >
                    Quitar
                  </Button>
                )}
              </Group>
            </div>
          ))}
          {!terminals.length && overview.isSuccess ? (
            <Text c="dimmed" size="sm">
              {anyConfigured
                ? "Todavía no hay datáfonos. Pulsa «Añadir datáfono» con el lector encendido."
                : "Configura primero las claves de SumUp o Stripe."}
            </Text>
          ) : null}
        </div>
      </section>

      {adding ? (
        <AddTerminalModal
          providers={providers.filter((provider) => provider.configured).map((p) => p.provider)}
          siteOptions={siteOptions}
          defaultSiteId={sites.find((site) => site.active)?.id ?? sites[0]?.id ?? null}
          onClose={() => setAdding(false)}
          onAdded={(data) => {
            apply(data);
            setAdding(false);
            setNotice({ color: "green", text: "Datáfono añadido y listo para cobrar." });
          }}
        />
      ) : null}
    </Stack>
  );
}

function AddTerminalModal({
  providers,
  siteOptions,
  defaultSiteId,
  onClose,
  onAdded,
}: {
  providers: TerminalProvider[];
  siteOptions: Array<{ value: string; label: string }>;
  defaultSiteId: string | null;
  onClose: () => void;
  onAdded: (data: PaymentTerminalsOverview) => void;
}) {
  const [provider, setProvider] = useState<TerminalProvider>(providers[0] ?? "sumup");
  const [siteId, setSiteId] = useState<string | null>(defaultSiteId);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const add = useMutation({
    mutationFn: () =>
      getBrowserApi().admin.paymentTerminals.add({
        provider,
        siteId: siteId ?? "",
        label:
          label || `Datáfono ${siteOptions.find((site) => site.value === siteId)?.label ?? ""}`,
        code,
      }),
    onSuccess: onAdded,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add.mutate();
  }

  return (
    <Modal opened onClose={onClose} title="Añadir datáfono" size="lg">
      <form onSubmit={submit}>
        <Stack>
          {providers.length > 1 ? (
            <SegmentedControl
              value={provider}
              onChange={(value) => setProvider(value as TerminalProvider)}
              data={providers.map((value) => ({ value, label: PROVIDER_NAMES[value] }))}
            />
          ) : (
            <Text fw={700}>{PROVIDER_NAMES[provider]}</Text>
          )}
          <List type="ordered" size="sm" spacing={4}>
            {PAIRING_STEPS[provider].map((step) => (
              <List.Item key={step}>{step}</List.Item>
            ))}
          </List>
          <Group grow>
            <Select
              label="Sede"
              data={siteOptions}
              value={siteId}
              onChange={setSiteId}
              allowDeselect={false}
              required
            />
            <TextInput
              label="Nombre"
              placeholder="Recepción Av. Navarra"
              value={label}
              onChange={(event) => setLabel(event.currentTarget.value)}
              maxLength={60}
            />
          </Group>
          <TextInput
            label={provider === "sumup" ? "Código del SumUp Solo" : "Código de emparejamiento"}
            placeholder={provider === "sumup" ? "p. ej. 4F7K2QXZ" : "p. ej. manzana-gato-sol"}
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            required
            autoComplete="off"
          />
          {add.isError ? <Alert color="red">{messageFromError(add.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={add.isPending}
              disabled={!siteId || code.trim().length < 4}
            >
              Emparejar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
