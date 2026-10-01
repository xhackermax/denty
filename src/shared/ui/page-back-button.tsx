"use client";
import { ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useContext } from "react";
import { NavigationContext } from "@/shared/navigation/navigation-provider";
export function PageBackButton({ fallbackHref }: { fallbackHref?: string }) {
  const context = useContext(NavigationContext);
  const path = context?.pathname ?? "/app";
  const fallback =
    fallbackHref ?? (path.includes("/patients/") ? path.replace(/\/[^/]+$/, "") : "/app");
  if (!context)
    return (
      <ActionIcon component="a" href={fallback} variant="subtle" aria-label="Volver">
        <IconArrowLeft size={20} />
      </ActionIcon>
    );
  return (
    <ActionIcon variant="subtle" aria-label="Volver" onClick={() => context.goBack(fallback)}>
      <IconArrowLeft size={20} />
    </ActionIcon>
  );
}
