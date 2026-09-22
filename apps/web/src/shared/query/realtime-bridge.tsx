"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { DentyEvent } from "@/shared/api";
import { openBrowserDentyEventStream } from "@/shared/api/browser";
import { publicEnv } from "@/shared/config/env";

const ROOT_KEYS = {
  patient: ["patients"],
  appointment: ["appointments"],
  clinical: ["clinical"],
  odontogram: ["clinical"],
  treatment: ["clinical"],
  document: ["documents"],
  lab: ["laboratory"],
} as const;

function eventRoot(event: DentyEvent): readonly unknown[] | null {
  const prefix = event.type.split(".")[0] ?? "";
  return ROOT_KEYS[prefix as keyof typeof ROOT_KEYS] ?? null;
}

export function DentyRealtimeBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (publicEnv.NEXT_PUBLIC_DENTY_REALTIME !== "true") return undefined;
    const stream = openBrowserDentyEventStream({
      onEvent: (event) => {
        const queryKey = eventRoot(event);
        if (queryKey) void queryClient.invalidateQueries({ queryKey });
      },
    });
    return () => stream.close();
  }, [queryClient]);

  return null;
}
