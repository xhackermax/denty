import type { ReactNode } from "react";
import { DentyAppShell } from "@/app/_components/shell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <DentyAppShell>{children}</DentyAppShell>;
}
