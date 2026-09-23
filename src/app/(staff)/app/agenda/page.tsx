import { AgendaPage } from "@/features/agenda/agenda-page";
import { Suspense } from "react";

export default function AgendaRoute() {
  return (
    <Suspense fallback={null}>
      <AgendaPage />
    </Suspense>
  );
}
