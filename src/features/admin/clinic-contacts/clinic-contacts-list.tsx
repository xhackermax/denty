"use client";

import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconAddressBook,
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconMail,
  IconPencil,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ClinicContact, ClinicContactInsert } from "@/shared/api/resources/clinic-contacts";
import { EmptyState, PageHeader } from "@/shared/ui";
import { ClinicContactForm } from "./clinic-contact-form";
import { useClinicContacts } from "./use-clinic-contacts";
import styles from "./clinic-contacts.module.css";

interface Props {
  clinicId: string;
  initialContacts: ClinicContact[];
  initialTotalCount: number;
}
const PAGE_SIZE = 20;

export function ClinicContactsList({ clinicId, initialContacts, initialTotalCount }: Props) {
  const {
    create,
    list,
    update,
    delete: deleteContact,
    listCategories,
  } = useClinicContacts(clinicId);
  const [contacts, setContacts] = useState(initialContacts.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState(initialTotalCount);
  const [matchTotal, setMatchTotal] = useState(initialTotalCount);
  const [categories, setCategories] = useState(() => [
    ...new Set(initialContacts.map((c) => c.category)),
  ]);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const firstQuery = useRef(true);
  const [queryPending, setQueryPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [editorOpened, setEditorOpened] = useState(false);
  const [editing, setEditing] = useState<ClinicContact | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [deleting, setDeleting] = useState<ClinicContact | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listCategories()
      .then((values) => {
        if (!cancelled) setCategories(values.sort((a, b) => a.localeCompare(b, "es")));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listCategories, reload]);

  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    let cancelled = false;
    setQueryPending(true);
    void list({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(category ? { category } : {}),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) {
          setContacts(result.data);
          setMatchTotal(result.totalCount);
          if (!debouncedSearch && !category) setTotal(result.totalCount);
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setNotice({
            kind: "error",
            message:
              cause instanceof Error ? cause.message : "No se pudieron cargar los contactos.",
          });
      })
      .finally(() => {
        if (!cancelled) setQueryPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [list, debouncedSearch, category, page, reload]);

  function openEditor(contact: ClinicContact | null) {
    setEditing(contact);
    setEditorOpened(true);
  }
  function closeEditor() {
    if (!savePending) setEditorOpened(false);
  }
  async function save(data: ClinicContactInsert) {
    if (editing) await update(editing.id, { ...data, expectedVersion: editing.version });
    else {
      await create(data);
      setTotal((value) => value + 1);
    }
    setEditorOpened(false);
    setNotice({ kind: "success", message: editing ? "Cambios guardados." : "Contacto creado." });
    setReload((value) => value + 1);
  }
  async function remove() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteContact(deleting.id);
      setTotal((value) => Math.max(0, value - 1));
      if (contacts.length === 1 && page > 1) setPage((value) => value - 1);
      setDeleting(null);
      setNotice({ kind: "success", message: "Contacto eliminado." });
      setReload((value) => value + 1);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "No se pudo eliminar el contacto.");
    } finally {
      setDeletePending(false);
    }
  }
  const filtered = Boolean(search.trim() || category);
  const pages = Math.max(1, Math.ceil(matchTotal / PAGE_SIZE));

  return (
    <div className={styles.page}>
      <Link href="/app/settings" className={styles.back}>
        <IconArrowLeft size={15} /> Ajustes
      </Link>
      <PageHeader
        eyebrow="Directorio de la clínica"
        title="Contactos especiales"
        description="Laboratorios, proveedores y servicios. Los contactos que tu equipo necesita, siempre a mano."
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => openEditor(null)}>
            Nuevo contacto
          </Button>
        }
      />
      {notice && (
        <Alert
          role={notice.kind === "error" ? "alert" : "status"}
          color={notice.kind === "error" ? "red" : "green"}
          icon={notice.kind === "error" ? <IconAlertCircle size={18} /> : <IconCheck size={18} />}
          withCloseButton
          closeButtonLabel="Cerrar aviso"
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}
      <section className={styles.directory} aria-label="Directorio de contactos">
        <div className={styles.toolbar}>
          <TextInput
            className={styles.search}
            label="Buscar contactos"
            placeholder="Busca por nombre o notas"
            leftSection={<IconSearch size={18} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            rightSection={
              search ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
          />
          <Select
            className={styles.category}
            label="Filtrar por categoría"
            placeholder="Todas las categorías"
            value={category}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
            data={[...new Set([...categories, ...(category ? [category] : [])])].map((value) => ({
              value,
              label: value,
            }))}
            clearable
            searchable
            nothingFoundMessage="Sin categorías"
          />
        </div>
        <div className={styles.summary}>
          <span>
            <IconAddressBook size={17} />{" "}
            <strong>
              {total} {total === 1 ? "contacto" : "contactos"}
            </strong>
          </span>
          {filtered ? (
            <span>{matchTotal} resultados</span>
          ) : (
            <span>
              {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
            </span>
          )}
          {queryPending && <Loader size={15} aria-label="Actualizando contactos" />}
        </div>
        {contacts.length > 0 ? (
          <div className={styles.rows} aria-busy={queryPending}>
            <div className={styles.columns} aria-hidden="true">
              <span>Contacto</span>
              <span>Teléfono y correo</span>
              <span>Horario</span>
              <span />
            </div>
            {contacts.map((contact) => (
              <article key={contact.id} className={styles.row} aria-label={contact.name}>
                <div className={styles.identity}>
                  <Avatar size={42} radius="md" color="dentyBlue">
                    {contact.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </Avatar>
                  <div className={styles.identityText}>
                    <h2>{contact.name}</h2>
                    <Badge className={styles.categoryBadge} variant="light" color="gray" size="sm">
                      {contact.category}
                    </Badge>
                  </div>
                </div>
                <div className={styles.communication}>
                  {contact.phones.map((phone, index) => {
                    const number = typeof phone === "string" ? phone : phone.number;
                    return (
                      <a key={"phone-" + index} href={"tel:" + number.replace(/[^\d+*#;,]/g, "")}>
                        <IconPhone size={16} aria-hidden="true" />
                        <span>{number}</span>
                      </a>
                    );
                  })}
                  {contact.emails.map((email, index) => (
                    <a key={"email-" + index} href={"mailto:" + email}>
                      <IconMail size={16} aria-hidden="true" />
                      <span>{email}</span>
                    </a>
                  ))}
                  {!contact.phones.length && !contact.emails.length && (
                    <Text c="dimmed" size="sm">
                      Sin teléfono ni correo
                    </Text>
                  )}
                </div>
                <div className={styles.hours}>
                  <IconClock size={16} aria-hidden="true" />
                  <span>{contact.hours || "Horario sin indicar"}</span>
                </div>
                <Group gap={4} className={styles.actions} wrap="nowrap">
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    color="gray"
                    aria-label={"Editar " + contact.name}
                    onClick={() => openEditor(contact)}
                  >
                    <IconPencil size={17} />
                  </ActionIcon>
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    color="red"
                    aria-label={"Eliminar " + contact.name}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(contact);
                    }}
                  >
                    <IconTrash size={17} />
                  </ActionIcon>
                </Group>
                {contact.notes && <p className={styles.notes}>{contact.notes}</p>}
              </article>
            ))}
          </div>
        ) : queryPending ? (
          <Stack p="lg" role="status" aria-label="Cargando contactos">
            <Skeleton height={65} />
            <Skeleton height={65} />
          </Stack>
        ) : (
          <div className={styles.empty}>
            <EmptyState
              title={filtered ? "No encontramos contactos" : "Todavía no hay contactos"}
              description={
                filtered
                  ? "Prueba otro nombre o cambia la categoría."
                  : "Añade tu primer laboratorio, proveedor o servicio para tener sus datos siempre a mano."
              }
              action={
                filtered ? (
                  <Button
                    variant="light"
                    onClick={() => {
                      setSearch("");
                      setCategory(null);
                      setPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                ) : (
                  <Button leftSection={<IconPlus size={16} />} onClick={() => openEditor(null)}>
                    Crear primer contacto
                  </Button>
                )
              }
            />
          </div>
        )}
        {pages > 1 && (
          <footer className={styles.pagination}>
            <Text size="sm" c="dimmed">
              Página {page} de {pages}
            </Text>
            <Pagination total={pages} value={page} onChange={setPage} size="sm" withControls />
          </footer>
        )}
      </section>
      <Drawer
        opened={editorOpened}
        onClose={closeEditor}
        title={editing ? "Editar contacto" : "Nuevo contacto"}
        position="right"
        size="md"
        closeButtonProps={{ "aria-label": "Cerrar formulario", disabled: savePending }}
        closeOnEscape={!savePending}
        closeOnClickOutside={!savePending}
        classNames={{
          content: styles.drawer,
          header: styles.drawerHeader,
          body: styles.drawerBody,
        }}
      >
        {editorOpened && (
          <ClinicContactForm
            key={editing?.id ?? "new"}
            contact={editing}
            categories={categories}
            onSave={save}
            onCancel={closeEditor}
            onPendingChange={setSavePending}
          />
        )}
      </Drawer>
      <Modal
        opened={Boolean(deleting)}
        onClose={() => {
          if (!deletePending) setDeleting(null);
        }}
        title="Eliminar contacto"
        centered
        closeOnEscape={!deletePending}
        closeOnClickOutside={!deletePending}
        closeButtonProps={{ "aria-label": "Cerrar confirmación", disabled: deletePending }}
      >
        <Stack gap="md">
          <Text>
            ¿Quieres eliminar <strong>{deleting?.name}</strong>? El equipo dejará de verlo en el
            directorio.
          </Text>
          {deleteError && (
            <Alert role="alert" color="red">
              {deleteError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" disabled={deletePending} onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={deletePending} onClick={() => void remove()}>
              Eliminar contacto
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
