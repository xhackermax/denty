"use client";
import { useEffect, useState, type ReactNode } from "react";
export function RetainedFlowStep({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return active || visited ? <div hidden={!active}>{children}</div> : null;
}
