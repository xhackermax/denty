"use client";

import { ActionIcon, Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import styles from "./odontogram.module.css";

export type ClinicalTab =
  "general" | "periodontal" | "orthodontic" | "pediatric" | "endodontic" | "surgery" | "history";

const TABS: readonly { value: ClinicalTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "periodontal", label: "Periodonto" },
  { value: "orthodontic", label: "Ortodoncia" },
  { value: "pediatric", label: "Pediátrico" },
  { value: "endodontic", label: "Endodoncia" },
  { value: "surgery", label: "Cirugía" },
  { value: "history", label: "Historial" },
];

// Five copies of the tabs: the view is kept on the middle one, so there is a
// full copy of room on each side however fast the user scrolls.
const INFINITE_TAB_COPIES = [-2, -1, 0, 1, 2] as const;
const MIDDLE_COPY_INDEX = INFINITE_TAB_COPIES.indexOf(0);
const SCROLL_IDLE_MS = 140;

interface ClinicalTabsProps {
  active: ClinicalTab;
  onChange: (tab: ClinicalTab) => void;
}

export function ClinicalTabs({ active, onChange }: ClinicalTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycleWidth = () => {
    const scroller = scrollerRef.current;
    const width = scroller ? scroller.scrollWidth / INFINITE_TAB_COPIES.length : 0;
    return Number.isFinite(width) && width > 0 ? width : 0;
  };

  /**
   * Moves the view by whole copies so it sits on the middle one again. The
   * copies are identical, so an instant jump of exactly one cycle is invisible;
   * it only runs once scrolling has stopped, never in the middle of an animation.
   */
  const recenter = useCallback(() => {
    const scroller = scrollerRef.current;
    const cycle = cycleWidth();
    if (!scroller || !cycle) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    const offset = Math.floor((center - MIDDLE_COPY_INDEX * cycle) / cycle);
    if (offset === 0) return;
    scroller.scrollTo({ left: scroller.scrollLeft - offset * cycle, behavior: "instant" });
  }, []);

  /** Centers the copy of the active tab closest to what is on screen. */
  const centerActiveTab = useCallback(
    (behavior: ScrollBehavior) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const viewport = scroller.getBoundingClientRect();
      const viewportCenter = viewport.left + viewport.width / 2;
      let target: { left: number; distance: number } | null = null;
      for (const button of scroller.querySelectorAll<HTMLElement>(`[data-tab="${active}"]`)) {
        const rect = button.getBoundingClientRect();
        const distance = rect.left + rect.width / 2 - viewportCenter;
        if (!target || Math.abs(distance) < Math.abs(target.distance)) {
          target = { left: scroller.scrollLeft + distance, distance };
        }
      }
      if (target && Math.abs(target.distance) > 1) {
        scroller.scrollTo({ left: target.left, behavior });
      }
    },
    [active],
  );

  // First paint: middle copy, active tab centered, no animation.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const cycle = cycleWidth();
    if (!scroller || !cycle) return;
    scroller.scrollTo({ left: MIDDLE_COPY_INDEX * cycle, behavior: "instant" });
    centerActiveTab("instant");
    // Only on mount; later changes animate from wherever the view is.
  }, []);

  useEffect(() => {
    centerActiveTab("smooth");
  }, [centerActiveTab]);

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  const selectRelative = (direction: -1 | 1) => {
    const currentIndex = TABS.findIndex((tab) => tab.value === active);
    const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    if (nextTab) onChange(nextTab.value);
  };

  const handleInfiniteScroll = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(recenter, SCROLL_IDLE_MS);
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      scroller.scrollBy({ left: delta, behavior: "instant" });
    };

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={styles.clinicalWheel} aria-label="Selector de odontogramas clínicos">
      <ActionIcon
        type="button"
        variant="subtle"
        size="lg"
        radius="xl"
        aria-label="Odontograma anterior"
        onClick={() => selectRelative(-1)}
      >
        <IconChevronLeft size={18} />
      </ActionIcon>

      <div ref={scrollerRef} className={styles.clinicalTabs} onScroll={handleInfiniteScroll}>
        {INFINITE_TAB_COPIES.flatMap((cycle) =>
          TABS.map((tab) => {
            const centralCopy = cycle === 0;
            return (
              <Button
                key={`${cycle}-${tab.value}`}
                type="button"
                size="xs"
                variant={active === tab.value ? "filled" : "light"}
                data-cycle={cycle}
                data-tab={tab.value}
                data-active={active === tab.value}
                aria-hidden={centralCopy ? undefined : true}
                tabIndex={centralCopy ? 0 : -1}
                onClick={() => onChange(tab.value)}
              >
                {tab.label}
              </Button>
            );
          }),
        )}
      </div>

      <ActionIcon
        type="button"
        variant="subtle"
        size="lg"
        radius="xl"
        aria-label="Odontograma siguiente"
        onClick={() => selectRelative(1)}
      >
        <IconChevronRight size={18} />
      </ActionIcon>
    </div>
  );
}
