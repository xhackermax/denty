"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

/**
 * Stage 13: fiscal identity + VERI*FACTU mode per clinic (docs/guias/VERIFACTU.md).
 * The API existed since Stage 8 but no screen exposed it.
 */
export function BillingSettingsSection() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: dentyQueryKeys.finance.billingSettings,
    queryFn: () => getBrowserApi().billing.settings.get(),
  });
  const verifactu = useQuery({
    queryKey: dentyQueryKeys.finance.verifactu,
    queryFn: () => getBrowserApi().billing.verifactu.status(),
  });

  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [fiscalMode, setFiscalMode] = useState<"VERIFACTU" | "NO_VERIFACTU">("VERIFACTU");
  const [environment, setEnvironment] = useState<"test" | "production">("test");
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [dueDays, setDueDays] = useState<number | string>(0);

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setLegalName(data.fiscalLegalName ?? "");
    setTaxId(data.fiscalTaxId ?? "");
    setAddress(data.fiscalAddress ?? "");
    setFiscalMode(data.fiscalMode);
    setEnvironment(data.verifactuEnvironment);
    setAutoSubmit(data.autoSubmitVerifactu);
    setDueDays(data.defaultDueDays);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      getBrowserApi().billing.settings.update({
        fiscalMode,
        verifactuEnvironment: environment,
        autoSubmitVerifactu: autoSubmit,
        defaultDueDays: Number(dueDays) || 0,
        fiscalLegalName: legalName.trim() || null,
        fiscalTaxId: taxId.trim().toUpperCase() || null,
        fiscalAddress: address.trim() || null,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.finance.root }),
  });

  const certificate = verifactu.data?.provider.certificateConfigured ?? false;

  return (
    <section className={styles.section} aria-label="Facturación y VERI*FACTU">
      <Group justify="space-between">
        <div>
          <h3 className={styles.sectionTitle}>Facturación y VERI*FACTU</h3>
          <p className={styles.sectionDescription}>
            Datos fiscales de la empresa que factura. Revísalos con tu asesoría.
          </p>
        </div>
        <Badge color={certificate ? "green" : "orange"} variant="light">
          {certificate ? "Certificado cargado" : "Sin certificado"}
        </Badge>
      </Group>
      {settings.isError ? (
        <Alert color="red" mt="sm">
          Solo administración puede ver la configuración fiscal.
        </Alert>
      ) : null}
      <Stack mt="md">
        <TextInput
          label="Nombre fiscal / razón social"
          value={legalName}
          onChange={(event) => setLegalName(event.currentTarget.value)}
        />
        <Group grow>
          <TextInput
            label="NIF / CIF"
            value={taxId}
            onChange={(event) => setTaxId(event.currentTarget.value)}
          />
          <NumberInput
            label="Vencimiento (días)"
            min={0}
            max={365}
            value={dueDays}
            onChange={setDueDays}
          />
        </Group>
        <TextInput
          label="Domicilio fiscal"
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
        />
        <SegmentedControl
          value={fiscalMode}
          onChange={(value) => setFiscalMode(value as "VERIFACTU" | "NO_VERIFACTU")}
          data={[
            { value: "VERIFACTU", label: "VERI*FACTU (envío a AEAT)" },
            { value: "NO_VERIFACTU", label: "No VERI*FACTU (conservación)" },
          ]}
        />
        <SegmentedControl
          value={environment}
          onChange={(value) => setEnvironment(value as "test" | "production")}
          data={[
            { value: "test", label: "Entorno de pruebas" },
            { value: "production", label: "Producción" },
          ]}
        />
        <Switch
          label="Enviar automáticamente al emitir la factura"
          checked={autoSubmit}
          onChange={(event) => setAutoSubmit(event.currentTarget.checked)}
        />
        {environment === "production" && !certificate ? (
          <Text size="xs" c="orange">
            Falta el certificado (VERIFACTU_CERTIFICATE_PEM en Vercel) para producción.
          </Text>
        ) : null}
        {save.isError ? (
          <Alert color="red">
            {save.error instanceof Error ? save.error.message : "No se pudo guardar."}
          </Alert>
        ) : null}
        {save.isSuccess ? <Alert color="green">Configuración fiscal guardada.</Alert> : null}
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Guardar datos fiscales
        </Button>
      </Stack>
    </section>
  );
}
