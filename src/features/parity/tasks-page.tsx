"use client";

import { Button, Modal, Select, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import { DEMO_TASKS } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import { PageHeader } from "@/shared/ui";

export function TasksPage() {
  const [active, setActive] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("Tarjeta");

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Botón rápido"
        title="Tareas de clínica"
        description={
          "Crear paciente, cobrar, dar cita y recibir laboratorio desde una sola pantalla."
        }
      />
      <div className={styles.cards}>
        {DEMO_TASKS.map(([title, description]) => (
          <button
            className={styles.cardLink}
            type="button"
            key={title}
            onClick={() => setActive(title)}
          >
            <span className={styles.cardLinkTitle}>{title}</span>
            <span className={styles.cardLinkDescription}>{description}</span>
          </button>
        ))}
      </div>
      <Modal opened={active !== null} onClose={() => setActive(null)} title={active ?? "Tarea"}>
        {active === "Cobrar" ? (
          <Select
            label="Forma de pago"
            value={method}
            onChange={(value) => setMethod(value ?? "Tarjeta")}
            data={["Tarjeta", "Efectivo", "Transferencia"]}
          />
        ) : null}
        <TextInput
          mt="md"
          label="Detalle"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Paciente, importe, cita o referencia"
        />
        <Text c="dimmed" size="sm" mt="md">
          En esta entrega la acción se previsualiza en demo. La persistencia real entra por el
          API V3.
        </Text>
        <Button mt="lg" onClick={() => setActive(null)}>Confirmar</Button>
      </Modal>
    </div>
  );
}
