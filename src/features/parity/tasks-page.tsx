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
      <PageHeader eyebrow="Rápido" title="Tareas" description={"Acciones frecuentes."} />
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
            label="Pago"
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
          placeholder="Paciente o referencia"
        />
        <Text c="dimmed" size="sm" mt="md">
          Vista previa en modo demo.
        </Text>
        <Button mt="lg" onClick={() => setActive(null)}>
          Confirmar
        </Button>
      </Modal>
    </div>
  );
}
