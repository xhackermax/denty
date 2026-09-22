"use client";

import { ActionIcon, Menu, SegmentedControl, Text, useMantineColorScheme } from "@mantine/core";
import { IconAdjustments, IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useDensity } from "@/shared/ui/density-provider";

export function ShellPreferences() {
  const t = useTranslations("Shell");
  const { setColorScheme } = useMantineColorScheme();
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
        <Menu.Item leftSection={<IconSun size={16} />} onClick={() => setColorScheme("light")}>
          {t("light")}
        </Menu.Item>
        <Menu.Item leftSection={<IconMoon size={16} />} onClick={() => setColorScheme("dark")}>
          {t("dark")}
        </Menu.Item>
        <Menu.Item leftSection={<IconSunMoon size={16} />} onClick={() => setColorScheme("auto")}>
          {t("auto")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label>{t("density")}</Menu.Label>
        <Text size="xs" c="dimmed" px="sm" pb="xs">{t(density)}</Text>
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
