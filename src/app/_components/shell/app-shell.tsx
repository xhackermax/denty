"use client";

import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import { IconChecklist, IconDots, IconLogout, IconSettings } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { LogoutButton } from "@/features/auth";
import { VoiceCommandBar } from "@/features/voice/voice-command-bar";
import { MotionAmbientBackdrop, MotionPage } from "@/shared/motion";
import { resolveRouteTransition } from "@/shared/motion/route-transition";
import { DemoBanner, OfflineBanner } from "@/shared/ui";
import { DemoAccountSwitcher } from "@/shared/ui/demo-account-switcher";
import { DevicePermissions } from "@/shared/ui/device-permissions";

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
  const previousPathnameRef = useRef(pathname);
  const routeTransition = useMemo(
    () => resolveRouteTransition(previousPathnameRef.current, pathname),
    [pathname],
  );

  useEffect(() => {
    previousPathnameRef.current = pathname;
  }, [pathname]);

  const currentItem = [...PRIMARY_NAV, ...SECONDARY_NAV]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => isActive(pathname, item.href));

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

  const moreMenuContents = (
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
                  data-active={isActive(pathname, item.href)}
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
  );

  return (
    <div className={styles.root}>
      <MotionAmbientBackdrop />
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

        <nav className={styles.nav}>{PRIMARY_NAV.map(renderLink)}</nav>

        <Menu position="right-start" width={320} withinPortal shadow="lg">
          <Menu.Target>
            <button className={`${styles.navLink} ${styles.moreNavButton}`} type="button">
              <IconDots size={20} stroke={1.8} aria-hidden={true} />
              <span className={styles.navLabel}>{tCommon("more")}</span>
            </button>
          </Menu.Target>
          <Menu.Dropdown>{moreMenuContents}</Menu.Dropdown>
        </Menu>

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
                  <IconLogout size={19} />
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
          <div className={styles.headerTitleBlock}>
            <span className={styles.mobileBrand}>{tShell("brand")}</span>
            <Text className={styles.currentSection} fw={720} visibleFrom="sm">
              {currentItem ? tNav(currentItem.key) : tShell("brand")}
            </Text>
          </div>

          <div className={styles.headerActions}>
            {demoMode ? <DemoAccountSwitcher compact /> : null}
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
            <DemoBanner enabled={demoMode} message={tShell("demo")} />
            <OfflineBanner message={tShell("offline")} />
          </div>
          <div className={styles.routeStage} data-transition-kind={routeTransition.kind}>
            <AnimatePresence mode="popLayout" initial={false}>
              <MotionPage
                key={pathname}
                transitionKind={routeTransition.kind}
                transitionDirection={routeTransition.direction}
              >
                {children}
              </MotionPage>
            </AnimatePresence>
          </div>
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
        <Menu position="top-end" width={320} withinPortal>
          <Menu.Target>
            <button className={styles.bottomButton} type="button" aria-label={tNav("moreTools")}>
              <IconDots size={20} aria-hidden={true} />
              <span>{tCommon("more")}</span>
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <div className={styles.moreSections}>{moreMenuContents}</div>
          </Menu.Dropdown>
        </Menu>
      </nav>
    </div>
  );
}
