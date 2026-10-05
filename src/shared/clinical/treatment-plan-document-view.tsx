"use client";

import { Badge, Button, Group, List, Modal, Stack, Text, Title } from "@mantine/core";
import { IconFileText, IconPrinter } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { dateDMY, todayMadrid } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import {
  buildTreatmentPlanDocument,
  type TreatmentPlanItem,
} from "@/domain/plan/treatment-plan-document";
import { useDocumentContext } from "@/shared/documents/document-context";
import { buildTreatmentPlanPrintHtml } from "@/shared/documents/treatment-plan-print";
import { PrintNotice, usePrintNotice } from "@/shared/print/print-notice";
import { printHtml } from "@/shared/print/print-html";
import styles from "@/shared/ui/parity.module.css";

/**
 * "Documento del plan": the plan explained to the patient in plain language, phase by phase,
 * with why each treatment is needed, its pros and cons, the alternatives and why it comes in that
 * order. Shown on screen to talk it through and printed to take home.
 */
export function TreatmentPlanDocumentButton({
  items,
  patient,
}: {
  items: readonly TreatmentPlanItem[];
  patient: { firstName: string; lastName: string; recordNumber?: string | null } | undefined;
}) {
  const [opened, setOpened] = useState(false);
  const context = useDocumentContext();
  const printNotice = usePrintNotice();
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "";
  const document = useMemo(
    () => buildTreatmentPlanDocument(items, { patientName }),
    [items, patientName],
  );

  return (
    <>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconFileText size={14} />}
        disabled={!document.phases.length}
        onClick={() => setOpened(true)}
      >
        Documento del plan
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Tu plan de tratamiento"
        size="xl"
        centered
      >
        <Stack gap="md">
          <Text>{document.intro}</Text>
          <div>
            <Text fw={700}>Cómo lo hemos ordenado</Text>
            <List type="ordered" size="sm" spacing={2}>
              {document.orderSummary.map((line) => (
                <List.Item key={line}>{line}</List.Item>
              ))}
            </List>
          </div>
          {document.phases.map((phase) => (
            <section key={phase.phase} className={styles.section} aria-label={phase.title}>
              <Group justify="space-between">
                <Title order={3}>{phase.title}</Title>
                <Badge variant="light">{formatEUR(phase.totalCents)}</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {phase.purpose}
              </Text>
              {phase.steps.map((step) => (
                <article key={step.family} className={styles.row} style={{ display: "block" }}>
                  <Text fw={700}>
                    {step.order}. {step.guide.name}
                    {step.teeth.length ? ` · dientes ${step.teeth.join(", ")}` : ""}
                  </Text>
                  <Text size="sm">
                    <strong>Qué es.</strong> {step.guide.what}
                  </Text>
                  <Text size="sm">
                    <strong>Por qué lo necesitas.</strong> {step.guide.why}
                  </Text>
                  <Group align="flex-start" grow mt={4}>
                    <div>
                      <Text size="sm" fw={600}>
                        Ventajas
                      </Text>
                      <List size="sm">
                        {step.guide.benefits.map((line) => (
                          <List.Item key={line}>{line}</List.Item>
                        ))}
                      </List>
                    </div>
                    <div>
                      <Text size="sm" fw={600}>
                        Inconvenientes y riesgos
                      </Text>
                      <List size="sm">
                        {step.guide.drawbacks.map((line) => (
                          <List.Item key={line}>{line}</List.Item>
                        ))}
                      </List>
                    </div>
                  </Group>
                  <Text size="sm">
                    <strong>Otras opciones.</strong> {step.guide.alternatives}
                  </Text>
                  <Text size="sm">
                    <strong>Si no se hace.</strong> {step.guide.ifNotDone}
                  </Text>
                  <Text size="xs" c="dimmed">
                    <strong>Por qué en este orden.</strong> {step.orderReason} · {step.guide.visits}
                  </Text>
                </article>
              ))}
            </section>
          ))}
          <Text fw={800} ta="right">
            Total del plan {formatEUR(document.totalCents)}
          </Text>
          <Text size="sm">{document.maintenance}</Text>
          <Text size="xs" c="dimmed">
            {document.closing}
          </Text>
          <PrintNotice error={printNotice.error} onClose={printNotice.clear} />
          <Group justify="flex-end">
            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={() =>
                void printNotice.run(() =>
                  printHtml(
                    buildTreatmentPlanPrintHtml(document, {
                      clinicName: context.clinicName,
                      patientName,
                      recordNumber: patient?.recordNumber ?? null,
                      date: dateDMY(todayMadrid()),
                    }),
                  ),
                )
              }
            >
              Imprimir para el paciente
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
