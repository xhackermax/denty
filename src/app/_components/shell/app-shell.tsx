"use client";

import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import { IconChecklist, IconDots, IconSettings } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MOBILE_BAR_SIZE, splitForBar } from "@/domain/navigation";
import { LogoutButton } from "@/features/auth";
import {
  NAV_ITEMS,
  moreSections,
  navItemsFor,
  type NavigationItem,
} from "@/features/navigation/catalog";
import { useResolvedNavigation } from "@/features/navigation/use-navigation-layout";
import { VoiceCommandBar } from "@/features/voice/voice-command-bar";
import { MotionPage } from "@/shared/motion";
import { OfflineBanner } from "@/shared/ui";
import { DevicePermissions } from "@/shared/ui/device-permissions";

import styles from "./app-shell.module.css";
import { MoreMenu, isActive } from "./more-menu";
import { ShellPreferences } from "./shell-preferences";

export function DentyAppShell({ children }: { children: ReactNode }) {
  const tNav = useTranslations("Navigation");
  const tShell = useTranslations("Shell");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();

  const { pinned } = useResolvedNavigation();
  const sidebarItems = navItemsFor(pinned);
  const mobileBar = splitForBar(pinned, MOBILE_BAR_SIZE).bar;
  const mobileItems = navItemsFor(mobileBar);

  const currentItem = Object.values(NAV_ITEMS)
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => isActive(pathname, item.href));

  const renderLink = (item: NavigationItem) => {
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
          // Tablets show the icon rail with labels hidden; the name must not depend on them.
          aria-label={tNav(item.key)}
        >
          {active ? (
            <motion.span
              className={styles.navIndicator}
              layoutId="denty-desktop-nav-indicator"
              transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.68 }}
              aria-hidden="true"
            />
          ) : null}
          <motion.span
            className={styles.navLinkContent}
            animate={active ? { scale: 1.05, y: -1 } : { scale: 1, y: 0 }}
            whileTap={{ scale: 0.965 }}
            transition={{ type: "spring", stiffness: 440, damping: 34 }}
          >
            <Icon size={20} stroke={1.8} aria-hidden={true} />
            <span className={styles.navLabel}>{tNav(item.key)}</span>
          </motion.span>
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

        <nav className={styles.nav}>{sidebarItems.map(renderLink)}</nav>

        <MoreMenu
          sections={moreSections(pinned)}
          pathname={pathname}
          position="right-start"
          trigger={
            <button
              className={`${styles.navLink} ${styles.moreNavButton}`}
              type="button"
              aria-label={tCommon("more")}
            >
              <IconDots size={20} stroke={1.8} aria-hidden={true} />
              <span className={styles.navLabel}>{tCommon("more")}</span>
            </button>
          }
        />

        <div className={styles.sidebarBottom}>
          <LogoutButton label={tCommon("logout")} />
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleBlock}>
            <span className={styles.mobileBrand}>{tShell("brand")}</span>
            <Text className={styles.currentSection} fw={720} visibleFrom="sm">
              {currentItem ? tNav(currentItem.key) : tShell("brand")}
            </Text>
          </div>

          <div className={styles.headerActions}>
            <Tooltip label="Tareas rápidas">
              <ActionIcon
                component={Link}
                href="/app/tasks"
                variant="light"
                size="lg"
                aria-label="Tareas rápidas"
              >
                <IconChecklist size={18} />
              </ActionIcon>
            </Tooltip>
            <VoiceCommandBar />
            <Menu position="bottom-end" width={240} withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg" aria-label="Ajustes rápidos">
                  <IconSettings size={19} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Dispositivo y apariencia</Menu.Label>
                <div className={styles.utilityActions}>
                  <DevicePermissions />
                  <ShellPreferences />
                </div>
              </Menu.Dropdown>
            </Menu>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.banners}>
            <OfflineBanner message={tShell("offline")} />
          </div>
          <MotionPage key={pathname}>{children}</MotionPage>
        </div>
      </main>

      <nav className={styles.bottomNav} aria-label={tShell("clinic")}>
        {mobileItems.map((item) => {
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
              {active ? (
                <motion.span
                  className={styles.bottomIndicator}
                  layoutId="denty-mobile-nav-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.68 }}
                  aria-hidden="true"
                />
              ) : null}
              <motion.span
                className={styles.bottomLinkContent}
                animate={active ? { scale: 1.06, y: -1 } : { scale: 1, y: 0 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 440, damping: 34 }}
              >
                <Icon size={20} aria-hidden={true} />
                <span>{tNav(item.key)}</span>
              </motion.span>
            </Link>
          );
        })}
        <MoreMenu
          sections={moreSections(mobileBar)}
          pathname={pathname}
          position="top-end"
          trigger={
            <button className={styles.bottomButton} type="button" aria-label={tNav("moreTools")}>
              <IconDots size={20} aria-hidden={true} />
              <span>{tCommon("more")}</span>
            </button>
          }
        />
      </nav>
    </div>
  );
}
