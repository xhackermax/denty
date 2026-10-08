"use client";

import { ActionIcon, Menu, SegmentedControl, Text } from "@mantine/core";
import { IconAdjustments, IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useDensity } from "@/shared/ui/density-provider";

import { useDentyAppearance } from "./time-color-scheme-provider";

export function ShellPreferences() {
  const t = useTranslations("Shell");
  const { setPreference } = useDentyAppearance();
  const { density, setDensity } = useDensity();

  return (
    <Menu position="bottom-end" width={280} withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" aria-label={`${t("theme")} · ${t("density")}`}>
          <IconAdjustments size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("theme")}</Menu.Label>
        <Menu.Item leftSection={<IconSun size={16} />} onClick={() => setPreference("light")}>
          {t("light")}
        </Menu.Item>
        <Menu.Item leftSection={<IconMoon size={16} />} onClick={() => setPreference("dark")}>
          {t("dark")}
        </Menu.Item>
        <Menu.Item leftSection={<IconSunMoon size={16} />} onClick={() => setPreference("time")}>
          {t("auto")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item component={Link} href="/app/settings#personalizacion">
          Personalizar colores, fondos y animaciones
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label>{t("density")}</Menu.Label>
        <Text size="xs" c="dimmed" px="sm" pb="xs">
          {t(density)}
        </Text>
        <div>
          <SegmentedControl
            fullWidth
            value={density}
            onChange={(value) => setDensity(value === "compact" ? "compact" : "comfortable")}
            data={[
              { label: t("comfortable"), value: "comfortable" },
              { label: t("compact"), value: "compact" },
            ]}
          />
        </div>
      </Menu.Dropdown>
    </Menu>
  );
}
