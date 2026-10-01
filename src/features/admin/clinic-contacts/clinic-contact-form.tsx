"use client";

import { ActionIcon, Alert, Autocomplete, Button, Group, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { IconAlertCircle, IconPlus, IconX } from "@tabler/icons-react";
import { useRef, useState, type FormEvent } from "react";
import type { ClinicContact, ClinicContactInsert, PhoneEntry } from "@/shared/api/resources/clinic-contacts";
import styles from "./clinic-contacts.module.css";

interface Props {
  contact: ClinicContact | null;
  categories: string[];
  onSave: (data: ClinicContactInsert) => Promise<void>;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
}

export function ClinicContactForm({ contact, categories, onSave, onCancel, onPendingChange }: Props) {
  const [name, setName] = useState(contact?.name ?? "");
  const [category, setCategory] = useState(contact?.category ?? "");
  const [hours, setHours] = useState(contact?.hours ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [phones, setPhones] = useState(() => (contact?.phones.length ? contact.phones : [""]).map((p, i) => ({
    key: "phone-" + i,
    number: typeof p === "string" ? p : p.number,
    type: (typeof p === "string" ? "mobile" : p.type ?? "mobile") as NonNullable<PhoneEntry["type"]>,
  })));
  const [emails, setEmails] = useState(() => (contact?.emails.length ? contact.emails : [""]).map((value, i) => ({ key: "email-" + i, value })));
  const nextKey = useRef(1000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!name.trim() || !category.trim()) {
      setError("Completa el nombre y la categoría.");
      return;
    }
    setError(null);
    setPending(true);
    onPendingChange(true);
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        hours: hours.trim(),
        notes: notes.trim(),
        phones: phones.filter(p => p.number.trim()).map(p => ({ number: p.number.trim(), type: p.type })),
        emails: emails.map(e => e.value.trim()).filter(Boolean),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el contacto.");
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <Text c="dimmed" size="sm">Los datos de contacto estarán disponibles para el equipo de tu clínica.</Text>
      {error && <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">{error}</Alert>}
      <fieldset className={styles.fieldset} disabled={pending}>
        <Stack gap="lg">
          <section className={styles.formSection} aria-label="Datos del contacto">
            <h3>Datos del contacto</h3>
            <Stack gap="sm">
              <TextInput label="Nombre" withAsterisk required value={name} onChange={e => setName(e.currentTarget.value)} placeholder="Ej. Laboratorio Norte" data-autofocus />
              <Autocomplete label="Categoría" withAsterisk required value={category} onChange={setCategory} data={categories} placeholder="Ej. Laboratorios, mantenimiento…" />
            </Stack>
          </section>
          <section className={styles.formSection} aria-label="Teléfonos y correos">
            <h3>Teléfonos y correos</h3>
            <Stack gap="sm">
              {phones.map((phone, index) => (
                <div className={styles.entry} key={phone.key}>
                  <TextInput label={"Teléfono " + (index + 1)} type="tel" value={phone.number} onChange={e => {
                    const value = e.currentTarget.value;
                    setPhones(rows => rows.map(p => p.key === phone.key ? { ...p, number: value } : p));
                  }} placeholder="+34 600 000 000" />
                  <ActionIcon type="button" variant="subtle" color="gray" aria-label={"Quitar teléfono " + (index + 1)} disabled={phones.length === 1} onClick={() => setPhones(rows => rows.filter(p => p.key !== phone.key))}><IconX size={16} /></ActionIcon>
                </div>
              ))}
              <Button type="button" variant="subtle" size="compact-sm" className={styles.addEntry} leftSection={<IconPlus size={15} />} onClick={() => setPhones(rows => [...rows, { key: "phone-" + nextKey.current++, number: "", type: "mobile" }])}>Añadir teléfono</Button>
              {emails.map((email, index) => (
                <div className={styles.entry} key={email.key}>
                  <TextInput label={"Correo electrónico " + (index + 1)} type="email" value={email.value} onChange={e => {
                    const value = e.currentTarget.value;
                    setEmails(rows => rows.map(p => p.key === email.key ? { ...p, value } : p));
                  }} placeholder="contacto@ejemplo.es" />
                  <ActionIcon type="button" variant="subtle" color="gray" aria-label={"Quitar correo " + (index + 1)} disabled={emails.length === 1} onClick={() => setEmails(rows => rows.filter(p => p.key !== email.key))}><IconX size={16} /></ActionIcon>
                </div>
              ))}
              <Button type="button" variant="subtle" size="compact-sm" className={styles.addEntry} leftSection={<IconPlus size={15} />} onClick={() => setEmails(rows => [...rows, { key: "email-" + nextKey.current++, value: "" }])}>Añadir correo</Button>
            </Stack>
          </section>
          <section className={styles.formSection} aria-label="Información adicional">
            <h3>Información adicional</h3>
            <Stack gap="sm">
              <TextInput label="Horario" value={hours} onChange={e => setHours(e.currentTarget.value)} placeholder="Ej. L–V de 09:00 a 18:00" />
              <Textarea label="Notas" value={notes} onChange={e => setNotes(e.currentTarget.value)} placeholder="Persona de referencia, recogidas, indicaciones…" minRows={3} autosize />
            </Stack>
          </section>
        </Stack>
      </fieldset>
      <Group className={styles.formFooter} justify="space-between">
        <Button type="button" variant="default" onClick={onCancel} disabled={pending}>Cancelar</Button>
        <Button type="submit" loading={pending}>{contact ? "Guardar cambios" : "Guardar contacto"}</Button>
      </Group>
    </form>
  );
}
