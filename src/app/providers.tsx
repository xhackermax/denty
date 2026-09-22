"use client";

import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import type { DentyMessages } from "@/i18n/messages";
import { DentyQueryProvider } from "@/shared/query";
import { DensityProvider } from "@/shared/ui/density-provider";
import { dentyTheme } from "@/styles/theme";

interface ProvidersProps {
  children: ReactNode;
  messages: DentyMessages;
}

export function Providers({ children, messages }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <MantineProvider defaultColorScheme="auto" theme={dentyTheme}>
        <DentyQueryProvider>
          <NuqsAdapter>
            <DensityProvider>{children}</DensityProvider>
          </NuqsAdapter>
        </DentyQueryProvider>
      </MantineProvider>
    </NextIntlClientProvider>
  );
}
