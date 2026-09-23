"use client";

import { useEffect, useMemo, useRef } from "react";

import styles from "./horizontal-snap-nav.module.css";

export interface HorizontalSnapItem {
  value: string;
  label: string;
  badge?: string | number;
}

interface HorizontalSnapNavProps {
  items: readonly HorizontalSnapItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

export function HorizontalSnapNav({ items, value, onChange, ariaLabel }: HorizontalSnapNavProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const index = useMemo(
    () =>
      Math.max(
        0,
        items.findIndex((item) => item.value === value),
      ),
    [items, value],
  );

  useEffect(() => {
    const target = refs.current.get(value);
    if (!target || typeof target.scrollIntoView !== "function") return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [value]);

  const focusAt = (next: number) => {
    const item = items[(next + items.length) % items.length];
    if (!item) return;
    onChange(item.value);
    refs.current.get(item.value)?.focus();
  };

  return (
    <div className={styles.scroller} role="tablist" aria-label={ariaLabel}>
      {items.map((item, itemIndex) => (
        <button
          key={item.value}
          ref={(node) => {
            if (node) refs.current.set(item.value, node);
            else refs.current.delete(item.value);
          }}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          tabIndex={item.value === value ? 0 : -1}
          className={styles.item}
          data-active={item.value === value}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              focusAt(itemIndex + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusAt(itemIndex - 1);
            }
            if (event.key === "Home") {
              event.preventDefault();
              focusAt(0);
            }
            if (event.key === "End") {
              event.preventDefault();
              focusAt(items.length - 1);
            }
          }}
        >
          <span>{item.label}</span>
          {item.badge !== undefined ? <small>{item.badge}</small> : null}
        </button>
      ))}
    </div>
  );
}
