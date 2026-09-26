"use client";

import { ActionIcon, Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import styles from "./odontogram.module.css";

export type ClinicalTab =
  | "general"
  | "periodontal"
  | "orthodontic"
  | "pediatric"
  | "endodontic"
  | "surgery"
  | "history";

const TABS: readonly { value: ClinicalTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "periodontal", label: "Periodonto" },
  { value: "orthodontic", label: "Ortodoncia" },
  { value: "pediatric", label: "Pediátrico" },
  { value: "endodontic", label: "Endodoncia" },
  { value: "surgery", label: "Cirugía" },
  { value: "history", label: "Historial" },
];

const INFINITE_TAB_COPIES = [-1, 0, 1] as const;

interface ClinicalTabsProps {
  active: ClinicalTab;
  onChange: (tab: ClinicalTab) => void;
}

export function ClinicalTabs({ active, onChange }: ClinicalTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const centerActiveTab = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      const activeButton = scroller?.querySelector<HTMLElement>(
        `[data-cycle="0"][data-tab="${active}"]`,
      );
      activeButton?.scrollIntoView?.({ behavior, block: "nearest", inline: "center" });
    },
    [active],
  );

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth === 0) return;
    scroller.scrollLeft = scroller.scrollWidth / 3;
    centerActiveTab("auto");
  }, [centerActiveTab]);

  useEffect(() => {
    centerActiveTab();
  }, [centerActiveTab]);

  const selectRelative = (direction: -1 | 1) => {
    const currentIndex = TABS.findIndex((tab) => tab.value === active);
    const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    if (nextTab) onChange(nextTab.value);
  };

  const handleInfiniteScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cycleWidth = scroller.scrollWidth / 3;
    if (!Number.isFinite(cycleWidth) || cycleWidth <= 0) return;

    if (scroller.scrollLeft < cycleWidth * 0.45) {
      scroller.scrollLeft += cycleWidth;
    } else if (scroller.scrollLeft > cycleWidth * 1.55) {
      scroller.scrollLeft -= cycleWidth;
    }
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      scroller.scrollLeft += delta;
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

      <div
        ref={scrollerRef}
        className={styles.clinicalTabs}
        onScroll={handleInfiniteScroll}
      >
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
