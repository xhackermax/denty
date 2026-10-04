import { SimpleGrid } from "@mantine/core";
import Link from "next/link";

import styles from "@/shared/ui/parity.module.css";
import { PageHeader } from "@/shared/ui";
import { NavigationLayoutEditor } from "@/features/navigation/navigation-layout-editor";

import { AdminExportPanel } from "./admin-export-panel";
import { AdminUsersPanel } from "./admin-users-panel";
import { AdminPaymentTerminalsPanel } from "./admin-payment-terminals-panel";
import { AdminSitesPanel } from "./admin-sites-panel";
import { AdminTreatmentCatalogPanel } from "./admin-treatment-catalog-panel";

export function AdminPage({
  section = "home",
}: {
  section?: "home" | "users" | "catalog" | "sites" | "payments" | "export" | "navigation";
}) {
  return (
    <div className={styles.grid}>
      <PageHeader
        title={
          section === "home"
            ? "Centro operativo"
            : section === "users"
              ? "Usuarios"
              : section === "sites"
                ? "Sedes y doctores"
                : section === "payments"
                  ? "Cobros y datáfonos"
                  : section === "export"
                    ? "Exportar datos"
                    : section === "navigation"
                      ? "Menú de la clínica"
                      : "Catálogo"
        }
        description="Usuarios, sedes y configuración."
      />
      {section === "home" ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
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
          <Link className={styles.cardLink} href="/app/admin/sites">
            <span className={styles.cardLinkTitle}>Sedes y doctores</span>
            <span className={styles.cardLinkDescription}>
              Sedes, gabinetes y qué días trabaja cada doctor en cada sede
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/payments">
            <span className={styles.cardLinkTitle}>Cobros y datáfonos</span>
            <span className={styles.cardLinkDescription}>
              SumUp y Stripe: emparejar lectores y asignarlos a cada sede
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/catalog">
            <span className={styles.cardLinkTitle}>Catálogo clínico</span>
            <span className={styles.cardLinkDescription}>Tratamientos, costes y precios</span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/export">
            <span className={styles.cardLinkTitle}>Exportar datos</span>
            <span className={styles.cardLinkDescription}>Pacientes, citas y tratamientos</span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/navigation">
            <span className={styles.cardLinkTitle}>Menú de la clínica</span>
            <span className={styles.cardLinkDescription}>
              Orden del menú lateral por defecto; cada usuario puede personalizar el suyo
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/settings">
            <span className={styles.cardLinkTitle}>Seguridad y privacidad</span>
            <span className={styles.cardLinkDescription}>Sesiones, RGPD, copias y receta</span>
          </Link>
        </SimpleGrid>
      ) : null}
      {section === "users" ? <AdminUsersPanel /> : null}
      {section === "catalog" ? <AdminTreatmentCatalogPanel /> : null}
      {section === "sites" ? <AdminSitesPanel /> : null}
      {section === "payments" ? <AdminPaymentTerminalsPanel /> : null}
      {section === "export" ? <AdminExportPanel /> : null}
      {section === "navigation" ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Orden por defecto</h3>
          <p className={styles.sectionDescription}>
            Lo verá todo el equipo salvo quien haya personalizado su menú en Ajustes.
          </p>
          <NavigationLayoutEditor scope="clinic" />
        </section>
      ) : null}
    </div>
  );
}
