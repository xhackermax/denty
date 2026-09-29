"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";

import { ROTA_WEEKDAYS, describeRota, findRotaOverlap, type RotaShift } from "@/domain";
import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import type { AdminSite, AdminSitesOverview, AdminStaffMember } from "@/shared/api/schemas/admin";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

type StaffRole = AdminStaffMember["role"];

const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: "DENTIST", label: "Doctor/a" },
  { value: "ASSISTANT", label: "Auxiliar / higienista" },
  { value: "RECEPTION", label: "Recepción" },
  { value: "ADMIN", label: "Administrador" },
];

const SERVER_MESSAGES: Record<string, string> = {
  SCHEDULE_OVERLAP: "Hay dos turnos que se solapan el mismo día.",
  INVALID_SCHEDULE: "Revisa las horas: la salida debe ser posterior a la entrada.",
  CABINET_IN_USE: "No se puede quitar un gabinete que ya tiene citas.",
  SITE_NOT_FOUND: "La sede ya no existe.",
  STAFF_NOT_FOUND: "El profesional ya no existe.",
};

function messageFromError(error: unknown) {
  if (error instanceof DentyApiError) {
    const code = Object.keys(SERVER_MESSAGES).find((key) => error.message.includes(key));
    return code ? SERVER_MESSAGES[code] : error.message;
  }
  return "No se pudo guardar.";
}

export function AdminSitesPanel() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: dentyQueryKeys.settings.sitesOverview,
    queryFn: () => getBrowserApi().admin.sites.overview(),
  });
  const [editingSite, setEditingSite] = useState<AdminSite | "new" | null>(null);
  const [editingStaff, setEditingStaff] = useState<AdminStaffMember | "new" | null>(null);
  const [rotaStaff, setRotaStaff] = useState<AdminStaffMember | null>(null);

  const sites = overview.data?.sites ?? [];
  const staff = overview.data?.staff ?? [];
  const siteNames = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites]);

  // Every change refreshes the agenda too: its site selector and columns come from here.
  const applyOverview = (data: AdminSitesOverview) => {
    queryClient.setQueryData(dentyQueryKeys.settings.sitesOverview, data);
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.context });
  };

  return (
    <Stack>
      {overview.isError ? <Alert color="red">{messageFromError(overview.error)}</Alert> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <Title order={3} className={styles.sectionTitle}>
              Sedes
            </Title>
            <Text className={styles.sectionDescription}>
              Cada sede tiene su agenda y sus gabinetes. Una sede cerrada no aparece en la agenda.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditingSite("new")}>
            Nueva sede
          </Button>
        </div>
        <div className={styles.rowList}>
          {sites.map((site) => (
            <div className={styles.row} key={site.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{site.name}</span>
                <span className={styles.rowMeta}>
                  {[site.address, site.city, site.phone].filter(Boolean).join(" · ") ||
                    "Sin dirección"}
                  {` · ${site.cabinetCount} ${site.cabinetCount === 1 ? "gabinete" : "gabinetes"}`}
                </span>
              </div>
              <Group gap="xs">
                <Badge color={site.active ? "green" : "gray"}>
                  {site.active ? "Abierta" : "Cerrada"}
                </Badge>
                <Button size="xs" variant="light" onClick={() => setEditingSite(site)}>
                  Editar
                </Button>
              </Group>
            </div>
          ))}
          {!sites.length && overview.isSuccess ? (
            <Text c="dimmed">Todavía no hay sedes. Crea la primera.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <Title order={3} className={styles.sectionTitle}>
              Doctores y horarios por sede
            </Title>
            <Text className={styles.sectionDescription}>
              Un mismo doctor puede trabajar en varias sedes: indica qué días (y en qué horario)
              está en cada una. La agenda de cada sede muestra solo a quien trabaja allí ese día.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditingStaff("new")}>
            Nuevo profesional
          </Button>
        </div>
        <div className={styles.rowList}>
          {staff.map((member) => (
            <div className={styles.row} key={member.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{member.displayName}</span>
                <span className={styles.rowMeta}>
                  {ROLE_OPTIONS.find((option) => option.value === member.role)?.label}
                  {member.collegiateNumber ? ` · Col. ${member.collegiateNumber}` : ""}
                  {` · ${describeRota(member.schedules, siteNames)}`}
                </span>
              </div>
              <Group gap="xs">
                {!member.active ? <Badge color="gray">Inactivo</Badge> : null}
                {!member.hasLogin ? (
                  <Badge color="yellow" variant="light">
                    Sin acceso
                  </Badge>
                ) : null}
                <Button size="xs" variant="light" onClick={() => setRotaStaff(member)}>
                  Horario
                </Button>
                <Button size="xs" variant="default" onClick={() => setEditingStaff(member)}>
                  Editar
                </Button>
              </Group>
            </div>
          ))}
        </div>
      </section>

      {editingSite ? (
        <SiteModal
          site={editingSite === "new" ? null : editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={(data) => {
            applyOverview(data);
            setEditingSite(null);
          }}
        />
      ) : null}
      {editingStaff ? (
        <StaffModal
          member={editingStaff === "new" ? null : editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={(data) => {
            applyOverview(data);
            setEditingStaff(null);
          }}
        />
      ) : null}
      {rotaStaff ? (
        <RotaModal
          member={rotaStaff}
          sites={sites}
          onClose={() => setRotaStaff(null)}
          onSaved={(data) => {
            applyOverview(data);
            setRotaStaff(null);
          }}
        />
      ) : null}
    </Stack>
  );
}

function SiteModal({
  site,
  onClose,
  onSaved,
}: {
  site: AdminSite | null;
  onClose: () => void;
  onSaved: (data: AdminSitesOverview) => void;
}) {
  const [name, setName] = useState(site?.name ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [city, setCity] = useState(site?.city ?? "");
  const [phone, setPhone] = useState(site?.phone ?? "");
  const [cabinetCount, setCabinetCount] = useState<number | string>(site?.cabinetCount ?? 1);
  const [active, setActive] = useState(site?.active ?? true);
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        address: address || null,
        city: city || null,
        phone: phone || null,
        active,
        cabinetCount: Number(cabinetCount) || 0,
      };
      const api = getBrowserApi().admin.sites;
      return site ? api.update(site.id, payload) : api.create(payload);
    },
    onSuccess: onSaved,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <Modal opened onClose={onClose} title={site ? `Editar ${site.name}` : "Nueva sede"}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Nombre"
            placeholder="Av. Navarra"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Dirección"
            placeholder="Avenida de Navarra 17, local bajo, 50010"
            value={address}
            onChange={(event) => setAddress(event.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="Ciudad"
              value={city}
              onChange={(event) => setCity(event.currentTarget.value)}
            />
            <TextInput
              label="Teléfono"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
            />
          </Group>
          <NumberInput
            label="Gabinetes"
            description="Se crean como «Gabinete 1», «Gabinete 2»…"
            min={0}
            max={30}
            value={cabinetCount}
            onChange={setCabinetCount}
          />
          <Switch
            label="Sede abierta (visible en la agenda)"
            checked={active}
            onChange={(event) => setActive(event.currentTarget.checked)}
          />
          {save.isError ? <Alert color="red">{messageFromError(save.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function StaffModal({
  member,
  onClose,
  onSaved,
}: {
  member: AdminStaffMember | null;
  onClose: () => void;
  onSaved: (data: AdminSitesOverview) => void;
}) {
  const [displayName, setDisplayName] = useState(member?.displayName ?? "");
  const [role, setRole] = useState<StaffRole>(member?.role ?? "DENTIST");
  const [collegiateNumber, setCollegiateNumber] = useState(member?.collegiateNumber ?? "");
  const [active, setActive] = useState(member?.active ?? true);
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        displayName,
        role,
        active,
        collegiateNumber: collegiateNumber || null,
      };
      const api = getBrowserApi().admin.sites;
      return member ? api.updateStaff(member.id, payload) : api.createStaff(payload);
    },
    onSuccess: onSaved,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={member ? `Editar ${member.displayName}` : "Nuevo profesional"}
    >
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Nombre en la agenda"
            placeholder="Dra. Seneida Adames Torres"
            value={displayName}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            required
          />
          <Group grow>
            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              value={role}
              onChange={(value) => setRole((value as StaffRole | null) ?? "DENTIST")}
            />
            <TextInput
              label="Nº de colegiado"
              value={collegiateNumber}
              onChange={(event) => setCollegiateNumber(event.currentTarget.value)}
            />
          </Group>
          <Switch
            label="Activo en la agenda"
            checked={active}
            onChange={(event) => setActive(event.currentTarget.checked)}
          />
          {!member?.hasLogin ? (
            <Text size="sm" c="dimmed">
              Para que pueda entrar en Denty, créale un usuario en Usuarios y roles y vincúlalo a
              este profesional.
            </Text>
          ) : null}
          {save.isError ? <Alert color="red">{messageFromError(save.error)}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface DraftShift extends RotaShift {
  key: number;
}

function RotaModal({
  member,
  sites,
  onClose,
  onSaved,
}: {
  member: AdminStaffMember;
  sites: readonly AdminSite[];
  onClose: () => void;
  onSaved: (data: AdminSitesOverview) => void;
}) {
  const openSites = sites.filter((site) => site.active);
  const siteOptions = sites.map((site) => ({
    value: site.id,
    label: site.active ? site.name : `${site.name} (cerrada)`,
  }));
  const [nextKey, setNextKey] = useState(member.schedules.length);
  const [shifts, setShifts] = useState<DraftShift[]>(() =>
    member.schedules.map((shift, index) => ({ ...shift, key: index })),
  );
  const overlap = findRotaOverlap(shifts);
  const incomplete = shifts.some((shift) => !shift.siteId || shift.endsAt <= shift.startsAt);

  const save = useMutation({
    mutationFn: () =>
      getBrowserApi().admin.sites.setSchedule(member.id, {
        entries: shifts.map(({ siteId, weekday, startsAt, endsAt }) => ({
          siteId,
          weekday,
          startsAt,
          endsAt,
        })),
      }),
    onSuccess: onSaved,
  });

  const update = (key: number, patch: Partial<RotaShift>) =>
    setShifts((current) =>
      current.map((shift) => (shift.key === key ? { ...shift, ...patch } : shift)),
    );
  const addShift = (weekday: number) => {
    const sameDay = shifts.filter((shift) => shift.weekday === weekday);
    const previous = sameDay.at(-1);
    setShifts((current) => [
      ...current,
      {
        key: nextKey,
        weekday,
        siteId: previous?.siteId ?? openSites[0]?.id ?? "",
        // A second shift the same day defaults to the afternoon.
        startsAt: previous ? "16:00" : "09:00",
        endsAt: previous ? "20:00" : "14:00",
      },
    ]);
    setNextKey((key) => key + 1);
  };

  return (
    <Modal opened onClose={onClose} size="lg" title={`Horario de ${member.displayName}`}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Añade un turno por cada día y sede. Si un día trabaja en dos sedes (mañana en una, tarde
          en otra), añade dos turnos.
        </Text>
        {ROTA_WEEKDAYS.map((day) => {
          const dayShifts = shifts.filter((shift) => shift.weekday === day.weekday);
          return (
            <div key={day.weekday} className={styles.row}>
              <div className={styles.rowMain}>
                <Group justify="space-between">
                  <span className={styles.rowTitle}>{day.label}</span>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => addShift(day.weekday)}
                    disabled={!openSites.length}
                  >
                    Turno
                  </Button>
                </Group>
                {!dayShifts.length ? (
                  <Text size="xs" c="dimmed">
                    No trabaja
                  </Text>
                ) : null}
                {dayShifts.map((shift) => (
                  <Group key={shift.key} gap="xs" wrap="nowrap" align="end">
                    <Select
                      aria-label={`Sede ${day.label}`}
                      size="xs"
                      data={siteOptions}
                      value={shift.siteId || null}
                      onChange={(value) => update(shift.key, { siteId: value ?? "" })}
                      className={styles.flexField}
                    />
                    <TextInput
                      aria-label={`Entrada ${day.label}`}
                      size="xs"
                      type="time"
                      value={shift.startsAt}
                      onChange={(event) =>
                        update(shift.key, { startsAt: event.currentTarget.value })
                      }
                    />
                    <TextInput
                      aria-label={`Salida ${day.label}`}
                      size="xs"
                      type="time"
                      value={shift.endsAt}
                      onChange={(event) => update(shift.key, { endsAt: event.currentTarget.value })}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Quitar turno del ${day.label}`}
                      onClick={() =>
                        setShifts((current) => current.filter((item) => item.key !== shift.key))
                      }
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </div>
            </div>
          );
        })}
        {overlap ? (
          <Alert color="orange">
            Dos turnos del{" "}
            {ROTA_WEEKDAYS.find((day) => day.weekday === overlap[0].weekday)?.label.toLowerCase()}{" "}
            se solapan.
          </Alert>
        ) : null}
        {save.isError ? <Alert color="red">{messageFromError(save.error)}</Alert> : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={Boolean(overlap) || incomplete}
          >
            Guardar horario
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
