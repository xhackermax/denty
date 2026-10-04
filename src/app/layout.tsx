import "@mantine/core/styles.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { ES_MESSAGES } from "@/i18n/messages";
import { APP_NAME, APP_VIEWPORT } from "@/shared/lib/app-meta";
import "@/styles/global.css";

import { Providers } from "./providers";

const timeColorSchemeScript = `
(function () {
  try {
    var preference = localStorage.getItem("denty-appearance");
    var scheme = preference === "light" || preference === "dark" ? preference : null;
    if (!scheme) {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date());
      var hourPart = parts.find(function (part) { return part.type === "hour"; });
      var hour = Number(hourPart && hourPart.value);
      scheme = hour >= 7 && hour < 21 ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-mantine-color-scheme", scheme);
  } catch {
    document.documentElement.setAttribute("data-mantine-color-scheme", "light");
  }
})();`;

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: ES_MESSAGES.Shell.brandSubtitle,
  icons: { icon: "/assets/denty-logo.png" },
};

export const viewport: Viewport = APP_VIEWPORT;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" data-density="comfortable" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <script dangerouslySetInnerHTML={{ __html: timeColorSchemeScript }} />
      </head>
      <body className={inter.variable}>
        <Providers messages={ES_MESSAGES}>{children}</Providers>
      </body>
    </html>
  );
}
