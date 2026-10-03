"use client";

import { ActionIcon, Alert, Button, Group, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_PINNED,
  MAX_PINNED,
  MOBILE_BAR_SIZE,
  NAVIGATION_KEYS,
  moveKey,
  resolvePinned,
  togglePinned,
  type NavigationKey,
} from "@/domain/navigation";
import { dentyQueryKeys } from "@/shared/query/keys";

import { NAV_ITEMS } from "./catalog";
import styles from "./navigation-layout-editor.module.css";
import {
  browserNavigationApi,
  useNavigationLayouts,
  type NavigationLayoutApi,
} from "./use-navigation-layout";

export interface NavigationLayoutEditorProps {
  scope: "me" | "clinic";
  api?: NavigationLayoutApi;
}

const SOURCE_LABELS = {
  user: "Estás usando tu propio orden.",
  clinic: "Estás usando el orden de la clínica.",
  default: "Estás usando el orden predeterminado de Denty.",
} as const;

export function NavigationLayoutEditor({
  scope,
  api = browserNavigationApi,
}: NavigationLayoutEditorProps) {
  const tNav = useTranslations("Navigation");
  const queryClient = useQueryClient();
  const layouts = useNavigationLayouts(api);
  const saved = useMemo(() => {
    const data = layouts.data;
    if (scope === "clinic") return resolvePinned({ user: null, clinic: data?.clinic ?? null });
    return resolvePinned({ user: data?.user ?? null, clinic: data?.clinic ?? null });
  }, [layouts.data, scope]);
  const [draft, setDraft] = useState<NavigationKey[]>([...DEFAULT_PINNED]);
  useEffect(() => setDraft(saved.pinned), [saved]);

  const save = useMutation({
    mutationFn: (pinned: readonly NavigationKey[] | null) =>
      scope === "clinic" ? api.saveClinic(pinned) : api.saveMine(pinned),
    onSuccess: (next) => queryClient.setQueryData(dentyQueryKeys.navigation.layout, next),
  });

  const available = layouts.data?.available ?? false;
  const changed = draft.join() !== saved.pinned.join();
  const disabled = !available || save.isPending;
  const rest = NAVIGATION_KEYS.filter((key) => !draft.includes(key));
  const canReset = scope === "clinic" ? saved.source === "clinic" : saved.source === "user";

  if (layouts.isPending)
    return (
      <Text size="sm" c="dimmed">
        Cargando el menú…
      </Text>
    );

  return (
    <div className={styles.editor}>
      {layouts.isSuccess && !available ? (
        <Alert color="yellow" variant="light">
          La personalización del menú se activará cuando se aplique la actualización de la base de
          datos. Mientras tanto se usa el orden predeterminado.
        </Alert>
      ) : null}
      {layouts.isError ? (
        <Alert color="red" variant="light">
          No se pudo cargar el orden del menú.
        </Alert>
      ) : null}
      {scope === "me" && layouts.isSuccess ? (
        <Text size="sm" c="dimmed">
          {SOURCE_LABELS[saved.source]}
        </Text>
      ) : null}

      <ol className={styles.list} aria-label="Orden del menú">
        {draft.map((key, index) => {
          const item = NAV_ITEMS[key];
          const Icon = item.icon;
          const label = tNav(key);
          return (
            <li key={key} className={styles.row} data-key={key} data-tone={item.tone}>
              <span className={styles.position}>{index + 1}</span>
              <Icon size={18} aria-hidden={true} />
              <span className={styles.label}>
                <span className={styles.name}>{label}</span>
                {index >= MOBILE_BAR_SIZE ? (
                  <span className={styles.hint}>En el móvil aparece en “Más”</span>
                ) : null}
              </span>
              <Group gap={2} wrap="nowrap" className={styles.actions}>
                <ActionIcon
                  variant="subtle"
                  aria-label={`Subir ${label}`}
                  disabled={disabled || index === 0}
                  onClick={() => setDraft((current) => moveKey(current, key, -1))}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  aria-label={`Bajar ${label}`}
                  disabled={disabled || index === draft.length - 1}
                  onClick={() => setDraft((current) => moveKey(current, key, 1))}
                >
                  <IconArrowDown size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={`Quitar ${label} del menú`}
                  disabled={disabled || draft.length === 1}
                  onClick={() => setDraft((current) => togglePinned(current, key))}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            </li>
          );
        })}
      </ol>
      <Text size="xs" c="dimmed">
        Hasta {MAX_PINNED} apartados. En el móvil se ven los {MOBILE_BAR_SIZE} primeros; el resto
        sigue en “Más”.
      </Text>

      {rest.length > 0 ? (
        <div className={styles.rest}>
          <Text size="sm" fw={650}>
            En “Más”
          </Text>
          <div className={styles.chips}>
            {rest.map((key) => {
              const label = tNav(key);
              return (
                <Button
                  key={key}
                  size="compact-sm"
                  variant="default"
                  radius="xl"
                  leftSection={<IconPlus size={14} />}
                  aria-label={`Añadir ${label} al menú`}
                  disabled={disabled || draft.length >= MAX_PINNED}
                  onClick={() => setDraft((current) => togglePinned(current, key))}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {save.isError ? (
        <Alert color="red" variant="light" role="alert">
          No se pudo guardar el orden del menú. Inténtalo de nuevo.
        </Alert>
      ) : null}
      <Group gap="xs">
        <Button
          size="sm"
          disabled={disabled || !changed}
          loading={save.isPending}
          onClick={() => save.mutate(draft)}
        >
          {scope === "clinic" ? "Guardar menú de la clínica" : "Guardar mi menú"}
        </Button>
        {canReset ? (
          <Button size="sm" variant="subtle" disabled={disabled} onClick={() => save.mutate(null)}>
            {scope === "clinic" ? "Volver al predeterminado" : "Usar el de la clínica"}
          </Button>
        ) : null}
      </Group>
    </div>
  );
}
