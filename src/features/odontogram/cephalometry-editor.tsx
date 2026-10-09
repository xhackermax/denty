"use client";

import { Button, Group, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DentalEntity } from "@/domain";
import styles from "./cephalometry-editor.module.css";

interface CephalometryEditorProps {
  patientId: string;
  entities: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Patient-bound host for the supplied lateral cephalometry worksheet.
 * Message origin and iframe source are both checked, preventing cross-frame edits.
 */
export function CephalometryEditor({
  patientId,
  entities,
  readOnly,
  onCommit,
}: CephalometryEditorProps) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const savedEntity = useMemo(
    () => entities.find((entry) => entry.active && entry.entityType === "ORTHODONTIC" && entry.status === "cephalometry" && entry.attributes?.assessmentType === "LATERAL_CEPHALOMETRY"),
    [entities, patientId],
  );
  const savedRef = useRef<unknown>(null);
  savedRef.current = savedEntity?.attributes?.cephalometry ?? null;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const entityIdRef = useRef<string>(savedEntity?.id ?? `cephalometry-${patientId}`);
  if (savedEntity?.id) entityIdRef.current = savedEntity.id;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const hydrate = useCallback(() => {
    iframe.current?.contentWindow?.postMessage(
      { type: "denty:ceph:hydrate", state: savedRef.current },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    setLoaded(false);
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow) return;
      if (!isRecord(event.data)) return;
      if (event.data.type === "denty:ceph:ready") {
        setLoaded(true);
        hydrate();
      } else if (
        event.data.type === "denty:ceph:changed" &&
        !readOnlyRef.current &&
        isRecord(event.data.state) &&
        isRecord(event.data.state.rows)
      ) {
        commitRef.current({
          id: entityIdRef.current,
          entityType: "ORTHODONTIC",
          status: "cephalometry",
          active: true,
          attributes: {
            cephalometry: event.data.state,
            assessmentType: "LATERAL_CEPHALOMETRY",
          },
        });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [hydrate, patientId]);

  return (
    <section aria-label="Cefalometría lateral por paciente">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={750}>Cefalometría lateral · tabla y trazado</Text>
          <Text size="xs" c="dimmed">
            Los valores se guardan en la ficha clínica de este paciente. Las normas son orientativas.
          </Text>
        </div>
        <Group gap="xs">
          <Text size="xs" c="dimmed">{loaded ? "Plantilla lista" : "Cargando plantilla…"}</Text>
          <Button size="xs" variant="light" onClick={hydrate} disabled={!loaded}>
            Recuperar datos guardados
          </Button>
        </Group>
      </Group>
      <iframe
        ref={iframe}
        src="/cephalometry-lateral.html"
        title="Tabla editable y plantilla cefalométrica lateral"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        className={styles.frame}
      />
      {readOnly ? (
        <Text c="orange" size="xs">
          Estás consultando una versión histórica. Los cambios en la plantilla no se guardarán.
        </Text>
      ) : null}
    </section>
  );
}
