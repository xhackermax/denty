"use client";

import { Accordion, Alert, Badge, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useMemo } from "react";

import {
  clinicalGuards,
  hasPhrase,
  togglePhrase,
  tradeoffEntriesForPlan,
  type TradeoffClassifiable,
  type TreatmentArgument,
} from "@/domain/plan";
import styles from "./tradeoff-phrase-picker.module.css";

function PhraseChecks({
  title,
  label,
  phrases,
  text,
  onChange,
}: {
  title: string;
  label: string;
  phrases: readonly TreatmentArgument[];
  text: string;
  onChange: (text: string) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <Text size="xs" fw={700} mb={4}>
        {title}
      </Text>
      <Stack gap={4}>
        {phrases.map((phrase) => (
          <Checkbox
            key={phrase.id}
            size="xs"
            label={phrase.text}
            checked={hasPhrase(text, phrase.text)}
            onChange={() => onChange(togglePhrase(text, phrase.text))}
          />
        ))}
      </Stack>
    </div>
  );
}

/**
 * Lets the dentist tick catalog phrases for the treatments that make this plan different.
 * Ticks only edit the free text below, which stays the single record of what was explained.
 */
export function TradeoffPhrasePicker({
  treatments,
  advantages,
  disadvantages,
  onAdvantagesChange,
  onDisadvantagesChange,
}: {
  treatments: readonly TradeoffClassifiable[];
  advantages: string;
  disadvantages: string;
  onAdvantagesChange: (text: string) => void;
  onDisadvantagesChange: (text: string) => void;
}) {
  const entries = useMemo(() => tradeoffEntriesForPlan(treatments), [treatments]);
  const guards = useMemo(() => (entries.length ? clinicalGuards(entries) : []), [entries]);
  if (!entries.length) return null;
  return (
    <Stack gap="xs" className={styles.picker}>
      <Text size="xs" c="dimmed">
        Marca las frases del catálogo que quieras explicar. Se añaden al texto de abajo y puedes
        editarlas; solo se muestran al paciente las que queden escritas.
      </Text>
      <Alert color="orange" variant="light" title="Antes de explicar" p="xs">
        <ul className={styles.guards}>
          {guards.map((guard) => (
            <li key={guard.id}>
              <strong>{guard.finding}:</strong>{" "}
              {`${guard.behaviour.toLowerCase()}. ${guard.control}.`}
            </li>
          ))}
        </ul>
      </Alert>
      <Accordion multiple defaultValue={[entries[0]!.id]} variant="separated" radius="md">
        {entries.map((entry) => {
          const chosen = [...entry.advantages, ...entry.disadvantages].filter((phrase) =>
            hasPhrase(phrase.kind === "advantage" ? advantages : disadvantages, phrase.text),
          ).length;
          return (
            <Accordion.Item key={entry.id} value={entry.id}>
              <Accordion.Control>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={600}>
                    {entry.name}
                  </Text>
                  {chosen ? (
                    <Badge size="xs" variant="light" color="teal">
                      {chosen} elegidas
                    </Badge>
                  ) : null}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <div className={styles.columns}>
                  <PhraseChecks
                    title="Ventajas"
                    label={`Ventajas · ${entry.name}`}
                    phrases={entry.advantages}
                    text={advantages}
                    onChange={onAdvantagesChange}
                  />
                  <PhraseChecks
                    title="Desventajas"
                    label={`Desventajas · ${entry.name}`}
                    phrases={entry.disadvantages}
                    text={disadvantages}
                    onChange={onDisadvantagesChange}
                  />
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
