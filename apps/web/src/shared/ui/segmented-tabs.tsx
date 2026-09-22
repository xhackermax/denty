"use client";

import { SegmentedControl } from "@mantine/core";
import { useQueryState } from "nuqs";

interface TabItem {
  value: string;
  label: string;
}

interface SegmentedTabsProps {
  items: readonly TabItem[];
  param?: string;
}

export function SegmentedTabs({ items, param = "tab" }: SegmentedTabsProps) {
  const defaultValue = items[0]?.value ?? "";
  const [value, setValue] = useQueryState(param, { defaultValue });

  return (
    <SegmentedControl
      data={[...items]}
      value={value}
      onChange={(next) => void setValue(next)}
    />
  );
}
