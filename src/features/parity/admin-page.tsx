import { Badge, Button, SimpleGrid, Text, Title } from "@mantine/core";
import Link from "next/link";

import { DEMO_STAFF } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import { PageHeader } from "@/shared/ui";

export function AdminPage({ section = "home" }: { section?: "home" | "users" | "catalog" }) {
  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Administración"
        title={
          section === "home" ? "Centro operativo" : section === "users" ? "Usuarios" : "Catálogo"
        }
        description="Usuarios, sedes y configuración."
      />
      {section === "home" ? (
        <SimpleGrid cols={{ base: 1, md: 4 }}>
          <Link className={styles.cardLink} href="/app/patients">
            <span className={styles.cardLinkTitle}>Pacientes</span>
            <span className={styles.cardLinkDescription}>
              Búsqueda visual, última visita y próxima cita
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/users">
            <span className={styles.cardLinkTitle}>Usuarios y roles</span>
            <span className={styles.cardLinkDescription}>
              ADMIN · RECEPTION · DENTIST · ASSISTANT · PATIENT
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/catalog">
            <span className={styles.cardLinkTitle}>Catálogo clínico</span>
            <span className={styles.cardLinkDescription}>Tratamientos, costes y precios</span>
          </Link>
          <Link className={styles.cardLink} href="/app/settings">
            <span className={styles.cardLinkTitle}>Seguridad y privacidad</span>
            <span className={styles.cardLinkDescription}>Sesiones, RGPD, copias y receta</span>
          </Link>
        </SimpleGrid>
      ) : null}
      {section === "users" ? (
        <section className={styles.section}>
          <div className={styles.rowList}>
            {DEMO_STAFF.map((staff) => (
              <div className={styles.row} key={staff.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{staff.displayName}</span>
                  <span className={styles.rowMeta}>
                    {staff.role} · {staff.site}
                  </span>
                </div>
                <Badge color="green">Activo</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {section === "catalog" ? (
        <section className={styles.section}>
          <Title order={3}>Tratamientos y costes base</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Catálogo recuperado para alimentar plan, presupuesto, factura y analítica de margen.
          </Text>
          <div className={styles.rowList}>
            {["Implante", "Corona zirconio", "Endodoncia", "Férula", "Higiene"].map((item) => (
              <div className={styles.row} key={item}>
                <span className={styles.rowTitle}>{item}</span>
                <Button size="xs" variant="light">
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
