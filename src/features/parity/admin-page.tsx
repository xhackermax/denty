import { SimpleGrid } from "@mantine/core";
import Link from "next/link";

import styles from "@/shared/ui/parity.module.css";
import { PageHeader } from "@/shared/ui";
import { AdminUsersPanel } from "./admin-users-panel";
import { AdminTreatmentCatalogPanel } from "./admin-treatment-catalog-panel";

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
      {section === "users" ? <AdminUsersPanel /> : null}
      {section === "catalog" ? <AdminTreatmentCatalogPanel /> : null}
    </div>
  );
}
