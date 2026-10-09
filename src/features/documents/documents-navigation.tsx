"use client";

import { Anchor, Badge, Group, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getBrowserApi } from "@/shared/api/browser";
import {
  IconFileInvoice, IconFileCheck, IconFileDescription, IconPill,
  IconUsers, IconFileText, IconFileCertificate, IconArrowRight,
} from "@tabler/icons-react";
import Link from "next/link";

import styles from "@/shared/ui/parity.module.css";

const categories = [
  { href: "/app/documents/facturas", title: "Facturas", description: "Consultar, emitir y descargar facturas.", icon: IconFileInvoice },
  { href: "/app/documents/consentimientos", title: "Consentimientos", description: "Pendientes de firma y consentimientos firmados.", icon: IconFileCheck },
  { href: "/app/documents/presupuestos", title: "Presupuestos", description: "Revisiones, importes y firmas del plan.", icon: IconFileDescription },
  { href: "/app/documents/recetas", title: "Recetas", description: "Recetas clínicas y su historial.", icon: IconPill },
  { href: "/app/documents/personal", title: "Personal", description: "Currículums y contratos del equipo. Acceso restringido.", icon: IconUsers },
] as const;

const personnel = [
  { href: "/app/documents/personal/curriculums", title: "Currículums", description: "CV de profesionales activos e inactivos.", icon: IconFileText },
  { href: "/app/documents/personal/contratos", title: "Contratos", description: "Contratos del equipo, asociados a cada empleado.", icon: IconFileCertificate },
] as const;

export function DocumentCards({ personnelOnly = false }: { personnelOnly?: boolean }) {
  const session = useQuery({
    queryKey: ["documents", "access"],
    queryFn: () => getBrowserApi().auth.session(),
    staleTime: 0,
    gcTime: 0,
  });
  const items = personnelOnly
    ? personnel
    : categories.filter((item) =>
        item.href !== "/app/documents/personal" ||
        session.data?.actor.permissions.includes("users.manage"),
      );
  return (
    <Stack gap="md">
      {personnelOnly ? (
        <Badge variant="light" color="gray">Solo administración de la clínica</Badge>
      ) : null}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {items.map((item) => (
          <Link className={styles.cardLink} href={item.href} key={item.href}>
            <Group justify="space-between" mb="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <item.icon size={21} aria-hidden="true" />
              </ThemeIcon>
              <IconArrowRight size={18} aria-hidden="true" />
            </Group>
            <span className={styles.cardLinkTitle}>{item.title}</span>
            <span className={styles.cardLinkDescription}>{item.description}</span>
          </Link>
        ))}
      </SimpleGrid>
      {!personnelOnly ? (
        <Text size="sm" c="dimmed">
          ¿Necesitas un justificante u otro archivo clínico?{" "}
          <Anchor component={Link} href="/app/documents/archivo">
            Abrir archivo clínico
          </Anchor>
          .
        </Text>
      ) : null}
    </Stack>
  );
}

export function DocumentsBreadcrumb({ personnel = false }: { personnel?: boolean }) {
  return (
    <Group gap="xs" mb="md">
      <Anchor size="sm" component={Link} href="/app/documents">Documentos</Anchor>
      {personnel ? (
        <>
          <Text c="dimmed" size="sm">/</Text>
          <Anchor size="sm" component={Link} href="/app/documents/personal">Personal</Anchor>
        </>
      ) : null}
    </Group>
  );
}
