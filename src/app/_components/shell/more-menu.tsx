"use client";

import { Menu, type MenuProps } from "@mantine/core";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";

import type { NavigationSection } from "@/features/navigation/catalog";

import styles from "./app-shell.module.css";

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

export interface MoreMenuProps {
  sections: readonly NavigationSection[];
  pathname: string;
  position: NonNullable<MenuProps["position"]>;
  trigger: ReactElement;
}

/** “Más”: its entries are plain links, not Menu.Item, so closing on choice is handled here. */
export function MoreMenu({ sections, pathname, position, trigger }: MoreMenuProps) {
  const tNav = useTranslations("Navigation");
  const tShell = useTranslations("Shell");
  const [opened, setOpened] = useState(false);

  // Back/forward, a voice command or a redirect also land elsewhere: never leave it hanging open.
  useEffect(() => setOpened(false), [pathname]);

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      position={position}
      width={320}
      withinPortal
      shadow="lg"
    >
      <Menu.Target>{trigger}</Menu.Target>
      <Menu.Dropdown>
        <div className={styles.moreSections}>
          {sections.map((section) => (
            <section key={section.key} className={styles.moreSection}>
              <span className={styles.moreSectionLabel}>{tShell(section.key)}</span>
              <div className={styles.moreGrid}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      className={styles.moreLink}
                      data-tone={item.tone}
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      href={item.href}
                      onClick={() => setOpened(false)}
                    >
                      <Icon size={18} aria-hidden={true} />
                      <span>{tNav(item.key)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Menu.Dropdown>
    </Menu>
  );
}
