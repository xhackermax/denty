import type { ReactNode } from "react";

import { DentyAppShell } from "@/app/_components/shell";
import { publicEnv } from "@/shared/config/env";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <DentyAppShell demoMode={publicEnv.NEXT_PUBLIC_DEMO_MODE === "true"}>{children}</DentyAppShell>
  );
}
