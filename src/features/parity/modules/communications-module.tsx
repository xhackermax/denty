"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";
import { ActionErrorAlert } from "./action-error-alert";

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function CommunicationsModule() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS" | "EMAIL">("WHATSAPP");
  const [category, setCategory] = useState("ADMINISTRATIVE");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const communications = useQuery({
    queryKey: dentyQueryKeys.communications.all,
    queryFn: () => getBrowserApi().engagement.communications.list(),
  });
  const patients = useQuery({
    queryKey: dentyQueryKeys.patients.all,
    queryFn: () => getBrowserApi().patients.list(),
  });
  const consents = useQuery({
    queryKey: dentyQueryKeys.communications.consents(patientId),
    queryFn: () => getBrowserApi().engagement.communications.consents(patientId),
    enabled: Boolean(patientId),
  });

  const marketingGranted = useMemo(() => {
    const latest = (consents.data?.items ?? []).find((entry) => {
      const row = entry as Record<string, unknown>;
      return (
        row.channel === channel && (row.purpose === "MARKETING" || row.category === "MARKETING")
      );
    }) as Record<string, unknown> | undefined;
    return latest?.status === "GRANTED" || latest?.granted === true;
  }, [channel, consents.data]);

  const send = useMutation({
    mutationFn: () =>
      getBrowserApi().engagement.communications.create(patientId, {
        channel,
        category: category as never,
        subject: subject.trim() || undefined,
        body: body.trim(),
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      setBody("");
      setSubject("");
      void qc.invalidateQueries({ queryKey: dentyQueryKeys.communications.root });
    },
  });

  const setConsent = useMutation({
    mutationFn: (granted: boolean) =>
      getBrowserApi().engagement.communications.setConsent(patientId, {
        channel,
        category: "MARKETING",
        granted,
        source: "STAFF_UI",
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: dentyQueryKeys.communications.consents(patientId) }),
  });

  if (communications.isError || patients.isError) {
    return <Alert color="red">No se pudieron cargar las comunicaciones persistidas.</Alert>;
  }

  return (
    <Stack gap="md">
      <ActionErrorAlert errors={[send.error, setConsent.error]} />
      <section className={styles.section}>
        <Text fw={700}>Nueva comunicación</Text>
        <Group mt="sm" align="end" grow>
          <Select
            label="Paciente"
            searchable
            data={(patients.data?.items ?? []).map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName} · ${patient.recordNumber}`,
            }))}
            value={patientId || null}
            onChange={(value) => setPatientId(value ?? "")}
          />
          <Select
            label="Canal"
            data={["WHATSAPP", "SMS", "EMAIL"]}
            value={channel}
            onChange={(value) => setChannel((value ?? "WHATSAPP") as typeof channel)}
          />
          <Select
            label="Categoría"
            data={[
              "ADMINISTRATIVE",
              "APPOINTMENT_REMINDER",
              "APPOINTMENT_CHANGE",
              "PAYMENT_REMINDER",
              "DOCUMENT_AVAILABLE",
              "MARKETING",
            ]}
            value={category}
            onChange={(value) => setCategory(value ?? "ADMINISTRATIVE")}
          />
        </Group>
        <TextInput
          mt="sm"
          label="Asunto"
          value={subject}
          onChange={(event) => setSubject(event.currentTarget.value)}
        />
        <Textarea
          mt="sm"
          label="Mensaje"
          minRows={3}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        <Group mt="sm" justify="space-between">
          <Switch
            disabled={!patientId}
            checked={marketingGranted}
            label={`Consentimiento marketing por ${channel}`}
            onChange={(event) => setConsent.mutate(event.currentTarget.checked)}
          />
          <Button
            disabled={!patientId || !body.trim() || (category === "MARKETING" && !marketingGranted)}
            loading={send.isPending}
            onClick={() => send.mutate()}
          >
            Encolar envío
          </Button>
        </Group>
        {category === "MARKETING" && !marketingGranted ? (
          <Alert mt="sm" color="yellow">
            El marketing queda bloqueado hasta que exista consentimiento persistente para este
            canal.
          </Alert>
        ) : null}
      </section>

      <div className={styles.rowList}>
        {(communications.data?.items ?? []).map((item) => {
          const row = item as Record<string, unknown>;
          return (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{asText(row.subject, "Comunicación")}</span>
                <span className={styles.rowMeta}>
                  {asText(row.body, asText(row.category, "Sin contenido"))} ·{" "}
                  {asText(row.status, "QUEUED")}
                </span>
              </div>
              <Badge variant="light">{asText(row.channel, "—")}</Badge>
            </div>
          );
        })}
        {!communications.isLoading && (communications.data?.items.length ?? 0) === 0 ? (
          <Text c="dimmed">No hay comunicaciones.</Text>
        ) : null}
      </div>
    </Stack>
  );
}
