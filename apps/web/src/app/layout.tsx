import "@mantine/core/styles.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { ES_MESSAGES } from "@/i18n/messages";
import { APP_NAME } from "@/shared/lib/app-meta";
import "@/styles/global.css";

import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: ES_MESSAGES.Shell.brandSubtitle,
  icons: { icon: "/assets/denty-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" data-density="comfortable" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={inter.variable}>
        <Providers messages={ES_MESSAGES}>{children}</Providers>
      </body>
    </html>
  );
}
