"use client";

import { Text } from "@mantine/core";

import {
  TRADEOFF_CATALOG_VERSION,
  type PlanTradeoffContext,
  type TradeoffEntry,
} from "@/domain/plan";
import styles from "./plan-tradeoff-reference.module.css";

function PhraseList({ entry }: { entry: TradeoffEntry }) {
  return (
    <div className={styles.option}>
      <Text size="sm" fw={700}>
        {entry.name}
      </Text>
      <ul className={styles.list} aria-label={`Ventajas de ${entry.name}`}>
        {entry.advantages.map((phrase) => (
          <li key={phrase.id}>{phrase.text}</li>
        ))}
      </ul>
      <ul
        className={styles.list}
        aria-label={`Desventajas de ${entry.name}`}
        data-kind="disadvantage"
      >
        {entry.disadvantages.map((phrase) => (
          <li key={phrase.id}>{phrase.text}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Chairside reference from the clinical catalog, folded by default so the comparison stays
 * short: what happens if the patient postpones, which reference scenario applies, and the
 * cautions the dentist checks before explaining.
 */
export function PlanTradeoffReference({ context }: { context: PlanTradeoffContext }) {
  const { scenarios, deferral, guards, notes } = context;
  const postponing = deferral.options.length + deferral.consequences.length;
  if (!postponing && !scenarios.length && !guards.length) return null;
  return (
    <details className={styles.reference}>
      <summary>
        <strong>Si se pospone o no se trata</strong>
        <small>Consecuencias, comparación de referencia y avisos clínicos</small>
      </summary>
      <div className={styles.body}>
        {postponing ? (
          <section aria-label="No tratar o posponer">
            <Text fw={800} size="sm">
              No tratar o posponer
            </Text>
            {deferral.options.map((entry) => (
              <PhraseList key={entry.id} entry={entry} />
            ))}
            {deferral.consequences.length ? (
              <ul className={styles.list} aria-label="Consecuencias de posponer">
                {deferral.consequences.map((item) => (
                  <li key={item.id}>
                    <strong>{item.decision}:</strong> {item.consequence.toLowerCase()}.{" "}
                    <Text span size="xs" c="dimmed">
                      {item.action}.
                    </Text>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        {scenarios.length ? (
          <section aria-label="Comparación de referencia">
            <Text fw={800} size="sm">
              Comparación de referencia
            </Text>
            <ul className={styles.list}>
              {scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <strong>{scenario.title}.</strong> Comprobar: {scenario.check}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {guards.length ? (
          <section aria-label="Avisos clínicos" className={styles.guards}>
            <Text fw={800} size="sm">
              Avisos para el odontólogo
            </Text>
            <ul className={styles.list}>
              {guards.map((guard) => (
                <li key={guard.id}>
                  <strong>{guard.finding}:</strong>{" "}
                  {`${guard.behaviour.toLowerCase()}. ${guard.control}.`}
                </li>
              ))}
              {notes.flatMap((specialty) =>
                specialty.notes.map((note) => <li key={`${specialty.id}-${note}`}>{note}</li>),
              )}
            </ul>
          </section>
        ) : null}
        <Text size="xs" c="dimmed">
          Catálogo clínico v{TRADEOFF_CATALOG_VERSION}, pendiente de revisión profesional. Las
          frases son posibles, no garantías, y no sustituyen el consentimiento informado.
        </Text>
      </div>
    </details>
  );
}
