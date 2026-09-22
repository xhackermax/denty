"use client";

import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import { IconDots, IconLogout } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/features/auth";
import { VoiceCommandBar } from "@/features/voice/voice-command-bar";
import { DemoBanner, OfflineBanner } from "@/shared/ui";

import styles from "./app-shell.module.css";
import { NAV_SECTIONS, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";
import { ShellPreferences } from "./shell-preferences";

function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

export function DentyAppShell({ children, demoMode }: { children: ReactNode; demoMode: boolean }) {
  const tNav = useTranslations("Navigation");
  const tShell = useTranslations("Shell");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();

  const renderLink = (item: (typeof PRIMARY_NAV)[number] | (typeof SECONDARY_NAV)[number]) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);

    return (
      <Tooltip key={item.href} label={tNav(item.key)} position="right">
        <Link
          className={styles.navLink}
          href={item.href}
          data-active={active}
          data-tone={item.tone}
          aria-current={active ? "page" : undefined}
        >
          <Icon size={21} stroke={1.8} aria-hidden={true} />
          <span className={styles.navLabel}>{tNav(item.key)}</span>
        </Link>
      </Tooltip>
    );
  };

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label={tShell("clinic")}>
        <Link className={styles.brand} href="/app" aria-label={tShell("brand")}>
          <Image
            className={styles.brandLogo}
            src="/assets/denty-logo.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          <span className={styles.brandCopy}>
            <span className={styles.brandText}>{tShell("brand")}</span>
            <small>{tShell("brandSubtitle")}</small>
          </span>
        </Link>
        <div className={styles.sectionLabel}>{tShell("clinic")}</div>
        <nav className={styles.nav}>{PRIMARY_NAV.map(renderLink)}</nav>
        {NAV_SECTIONS.map((section) => (
          <div key={section.key}>
            <div className={styles.sectionLabel}>{tShell(section.key)}</div>
            <nav className={styles.nav}>{section.items.map(renderLink)}</nav>
          </div>
        ))}
        <div className={styles.sidebarBottom}>
          {demoMode ? (
            <Tooltip label={tCommon("logout")} position="right">
              <span>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={tCommon("logout")}
                  disabled
                >
                  <IconLogout size={20} />
                </ActionIcon>
              </span>
            </Tooltip>
          ) : (
            <LogoutButton label={tCommon("logout")} />
          )}
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <span className={styles.mobileBrand}>{tShell("brand")}</span>
            <Text size="xs" c="dimmed" visibleFrom="sm">
              {tShell("phase")}
            </Text>
          </div>
          <div className={styles.headerActions}>
            <VoiceCommandBar />
            <ShellPreferences />
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.banners}>
            <DemoBanner enabled={demoMode} message={tShell("demo")} />
            <OfflineBanner message={tShell("offline")} />
          </div>
          {children}
        </div>
      </main>

      <nav className={styles.bottomNav} aria-label={tShell("clinic")}>
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              className={styles.bottomLink}
              href={item.href}
              data-active={active}
              data-tone={item.tone}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={21} aria-hidden={true} />
              <span>{tNav(item.key)}</span>
            </Link>
          );
        })}
        <Menu position="top-end" width={300} withinPortal>
          <Menu.Target>
            <button className={styles.bottomButton} type="button" aria-label={tNav("moreTools")}>
              <IconDots size={21} aria-hidden={true} />
              <span>{tCommon("more")}</span>
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <div className={styles.moreSections}>
              {NAV_SECTIONS.map((section) => (
                <section key={section.key} className={styles.moreSection}>
                  <span className={styles.moreSectionLabel}>{tShell(section.key)}</span>
                  <div className={styles.moreGrid}>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          className={styles.moreLink}
                          data-tone={item.tone}
                          href={item.href}
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
      </nav>
    </div>
  );
}
