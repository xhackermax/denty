import type { ReactNode } from "react";
import { DentyAppShell } from "@/app/_components/shell";
import { AssistantProvider } from "@/features/assistant/assistant-provider";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <AssistantProvider>
      <DentyAppShell>{children}</DentyAppShell>
    </AssistantProvider>
  );
}
