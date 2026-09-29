"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DentalEntity } from "@/domain";

import styles from "./odontogram.module.css";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  system: "sistema",
  diameterMm: "diámetro",
  lengthMm: "longitud",
  placementDate: "fecha de colocación",
  insertionTorqueNcm: "torque",
  primaryIsq: "ISQ",
};

function entityTitle(entity: DentalEntity): string {
  if (entity.entityType === "IMPLANT") {
    return entity.attributes?.lifecycle === "REALIZADO"
      ? "Implante realizado"
      : "Implante planificado";
  }
  return String(entity.attributes?.label ?? entity.status);
}

export function SurgeryLegend({
  selectedTooth,
  entities,
  requiredFields,
}: {
  selectedTooth: string;
  entities: readonly DentalEntity[];
  requiredFields: readonly string[];
}) {
  const relevant = useMemo(
    () => entities.filter((entity) => entity.active && entity.tooth === selectedTooth),
    [entities, selectedTooth],
  );
  const [open, setOpen] = useState(requiredFields.length > 0);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!requiredFields.length) return;
    setOpen(true);
    summaryRef.current?.focus();
  }, [requiredFields]);

  return (
    <details
      className={styles.surgeryLegend}
      data-testid="surgery-legend"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary ref={summaryRef} role="button" tabIndex={0}>
        <span>Detalles quirúrgicos de {selectedTooth}</span>
        <small>{relevant.length ? entityTitle(relevant[0]!) : "Sin datos avanzados"}</small>
      </summary>
      {open ? (
        <div className={styles.surgeryLegendBody}>
          {requiredFields.length ? (
            <p>Faltan: {requiredFields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}</p>
          ) : null}
          {relevant.map((entity) => (
            <article key={entity.id}>
              <strong>{entityTitle(entity)}</strong>
              <span>Estado: {String(entity.attributes?.lifecycle ?? entity.status)}</span>
              {entity.entityType === "IMPLANT" ? (
                <>
                  <span>
                    Sistema: {String(entity.attributes?.system ?? "Pendiente de cirugía")}
                  </span>
                  <span>Diámetro: {String(entity.attributes?.diameterMm ?? "Pendiente")}</span>
                  <span>Longitud: {String(entity.attributes?.lengthMm ?? "Pendiente")}</span>
                </>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </details>
  );
}
