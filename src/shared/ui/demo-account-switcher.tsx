"use client";
import { Menu, Button } from "@mantine/core";
import { IconChevronDown, IconShield, IconUser } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const CHANNEL_NAME = "denty-demo-account";
type DemoAccount = "ADMIN" | "PATIENT";
function routeFor(account: DemoAccount): string {
  return account === "ADMIN" ? "/app" : "/patient/juan-perez";
}
export function DemoAccountSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState<DemoAccount>(() =>
    pathname.startsWith("/patient/") ? "PATIENT" : "ADMIN",
  );
  useEffect(() => {
    setAccount(pathname.startsWith("/patient/") ? "PATIENT" : "ADMIN");
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    channel?.addEventListener("message", (event: MessageEvent<DemoAccount>) => {
      if (event.data === "ADMIN" || event.data === "PATIENT") {
        setAccount(event.data);
      }
    });
    return () => channel?.close();
  }, [pathname]);
  const choose = (next: DemoAccount) => {
    setAccount(next);
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(next);
      channel.close();
    }
    router.push(routeFor(next));
  };
  return (
    <Menu position="bottom-end" width={220} withinPortal>
      <Menu.Target>
        <Button
          size="xs"
          variant="light"
          leftSection={account === "ADMIN" ? <IconShield size={16} /> : <IconUser size={16} />}
          rightSection={<IconChevronDown size={14} />}
          aria-label="Cambiar cuenta demo"
        >
          {compact
            ? account === "ADMIN"
              ? "Admin"
              : "Paciente"
            : `Demo · ${account === "ADMIN" ? "Administrador" : "Paciente"}`}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Cambiar experiencia de prueba</Menu.Label>
        <Menu.Item leftSection={<IconShield size={16} />} onClick={() => choose("ADMIN")}>
          Administrador
        </Menu.Item>
        <Menu.Item leftSection={<IconUser size={16} />} onClick={() => choose("PATIENT")}>
          Paciente · Juan Pérez
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
