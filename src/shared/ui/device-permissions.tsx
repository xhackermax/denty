"use client";
import { ActionIcon, Alert, Badge, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconCamera, IconMicrophone, IconSettings } from "@tabler/icons-react";
import { useEffect, useState } from "react";
export type PermissionStateLike = "granted" | "denied" | "prompt" | "unsupported";
export type MediaKind = "microphone" | "camera";

export async function queryMediaPermission(kind: MediaKind): Promise<PermissionStateLike> {
  if (!("permissions" in navigator)) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
}
function mediaFeatureAllowed(kind: MediaKind): boolean {
  if (typeof document === "undefined") return true;
  const policyDocument = document as Document & {
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
    featurePolicy?: { allowsFeature: (feature: string) => boolean };
  };
  const policy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
  if (!policy) return true;
  try {
    return policy.allowsFeature(kind);
  } catch {
    return true;
  }
}

export function mediaPermissionErrorMessage(kind: MediaKind, cause: unknown): string {
  const label = kind === "microphone" ? "micrófono" : "cámara";
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return kind === "microphone"
      ? "El micrófono está bloqueado para Denty. En Chrome, Edge u Opera, pulsa el icono a la izquierda de la dirección, cambia Micrófono a Permitir y recarga la página."
      : "La cámara está bloqueada para Denty. Permítela desde los ajustes del sitio del navegador y recarga la página.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return `No se detecta ningún ${label} disponible en este equipo.`;
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return kind === "microphone"
      ? "El micrófono existe, pero Windows u otra aplicación está impidiendo usarlo. Cierra otras apps que estén usando el micro y revisa Privacidad > Micrófono en Windows."
      : "La cámara existe, pero otra aplicación o el sistema está impidiendo usarla.";
  }
  if (name === "AbortError") {
    return `El navegador interrumpió el acceso al ${label}. Vuelve a intentarlo.`;
  }
  return cause instanceof Error ? cause.message : `No se pudo acceder al ${label}.`;
}

function badgeColor(state: PermissionStateLike): string {
  if (state === "granted") return "green";
  if (state === "denied") return "red";
  if (state === "prompt") return "yellow";
  return "gray";
}
function stateLabel(state: PermissionStateLike): string {
  if (state === "granted") return "Permitido";
  if (state === "denied") return "Bloqueado";
  if (state === "prompt") return "Sin decidir";
  return "No consultable";
}
/** With `keepStream` the caller owns the live stream and must stop its tracks. */
export async function requestMediaPermission(
  kind: MediaKind,
  options: { keepStream?: boolean } = {},
): Promise<MediaStream | undefined> {
  if (!window.isSecureContext) {
    throw new Error("El micrófono y la cámara solo funcionan por HTTPS o localhost.");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este navegador no ofrece acceso a dispositivos multimedia.");
  }
  if (!mediaFeatureAllowed(kind)) {
    throw new Error(
      kind === "microphone"
        ? "Esta ventana no permite usar el micrófono. Abre Denty directamente en una pestaña del navegador, no dentro de una vista incrustada."
        : "Esta ventana no permite usar la cámara. Abre Denty directamente en una pestaña del navegador.",
    );
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: kind === "microphone",
    video: kind === "camera",
  });
  if (options.keepStream) return stream;
  stream.getTracks().forEach((track) => track.stop());
  return undefined;
}
export function DevicePermissions() {
  const [opened, setOpened] = useState(false);
  const [microphone, setMicrophone] = useState<PermissionStateLike>("prompt");
  const [camera, setCamera] = useState<PermissionStateLike>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const [secureContext, setSecureContext] = useState(true);
  const refresh = async () => {
    const [mic, cam] = await Promise.all([
      queryMediaPermission("microphone"),
      queryMediaPermission("camera"),
    ]);
    setMicrophone(mic);
    setCamera(cam);
  };
  useEffect(() => {
    setSecureContext(window.isSecureContext);
    if (opened) void refresh();
  }, [opened]);
  const request = async (kind: MediaKind) => {
    setBusy(kind);
    setError(null);
    try {
      await requestMediaPermission(kind);
      await refresh();
    } catch (cause) {
      setError(mediaPermissionErrorMessage(kind, cause));
      await refresh();
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <ActionIcon
        variant="light"
        size="lg"
        aria-label="Cámara y micrófono"
        onClick={() => setOpened(true)}
      >
        <IconSettings size={18} />
      </ActionIcon>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Cámara y micrófono">
        <Stack>
          {!secureContext ? (
            <Alert color="red" title="Contexto no seguro">
              Abre Denty por HTTPS o localhost para que el navegador permita solicitar dispositivos.
            </Alert>
          ) : null}
          {error ? <Alert color="red">{error}</Alert> : null}
          <Group justify="space-between">
            <Group gap="xs">
              <IconMicrophone size={20} />
              <Text fw={700}>Micrófono</Text>
            </Group>
            <Badge color={badgeColor(microphone)}>{stateLabel(microphone)}</Badge>
          </Group>
          <Button loading={busy === "microphone"} onClick={() => void request("microphone")}>
            Solicitar micrófono
          </Button>
          <Group justify="space-between" mt="sm">
            <Group gap="xs">
              <IconCamera size={20} />
              <Text fw={700}>Cámara</Text>
            </Group>
            <Badge color={badgeColor(camera)}>{stateLabel(camera)}</Badge>
          </Group>
          <Button loading={busy === "camera"} onClick={() => void request("camera")}>
            Solicitar cámara
          </Button>
          <Text size="xs" c="dimmed">
            El navegador muestra su propio diálogo de permiso. Denty abre el dispositivo solo para
            validar acceso y detiene el stream inmediatamente.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
