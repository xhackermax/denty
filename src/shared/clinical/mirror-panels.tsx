"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { Fragment, useId, useState, type CSSProperties, type ReactNode } from "react";

import styles from "./mirror-panels.module.css";

export interface MirrorColumn {
  key: string;
  /** Accessible name of the column, e.g. "Plan B". */
  label: string;
  /** How a cell names its column, e.g. "del Plan B" in "Ventajas del Plan B". */
  ofLabel: string;
  selected?: boolean;
}

export interface MirrorSection<C extends MirrorColumn> {
  id: string;
  title: string;
  hint?: ReactNode;
  /** Shown per column on the toggle, so a closed section still says what it holds. */
  summary?: (column: C) => ReactNode;
  render: (column: C) => ReactNode;
}

/**
 * Options side by side, with every section folded at the same height in all columns. A
 * single toggle opens a section for every option, so the patient always compares the same
 * aspect across the row instead of scrolling separate cards.
 */
export function MirrorPanels<C extends MirrorColumn>({
  label,
  columns,
  header,
  sections,
  defaultOpen = [],
}: {
  label: string;
  columns: readonly C[];
  header: (column: C) => ReactNode;
  sections: ReadonlyArray<MirrorSection<C>>;
  defaultOpen?: readonly string[];
}) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(defaultOpen));
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The column count is data, not styling: every row spans the same number of tracks.
  const columnCount = { "--mirror-columns": columns.length } as CSSProperties;

  return (
    <div className={styles.scroller} role="region" aria-label={label} tabIndex={0}>
      <div className={styles.grid} style={columnCount}>
        {columns.map((column) => (
          <article
            key={column.key}
            className={styles.header}
            aria-label={column.label}
            data-selected={column.selected || undefined}
          >
            {header(column)}
          </article>
        ))}
        {sections.map((section) => {
          const expanded = open.has(section.id);
          const bodyId = `${baseId}-${section.id}`;
          return (
            <Fragment key={section.id}>
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={() => toggle(section.id)}
              >
                <span className={styles.toggleTitle}>
                  <IconChevronDown
                    size={16}
                    aria-hidden
                    className={styles.chevron}
                    data-open={expanded || undefined}
                  />
                  {section.title}
                </span>
                {section.summary
                  ? columns.map((column) => (
                      <span key={column.key} className={styles.summary}>
                        {section.summary?.(column)}
                      </span>
                    ))
                  : null}
              </button>
              <div id={bodyId} className={styles.body} hidden={!expanded}>
                {expanded ? (
                  <>
                    {section.hint ? <div className={styles.hint}>{section.hint}</div> : null}
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        role="group"
                        aria-label={`${section.title} ${column.ofLabel}`}
                        className={styles.cell}
                      >
                        {section.render(column)}
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
