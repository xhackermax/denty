import { SimpleGrid } from "@mantine/core";
import Link from "next/link";

import styles from "@/shared/ui/parity.module.css";
import { PageHeader } from "@/shared/ui";

import { AdminExportPanel } from "./admin-export-panel";
import { AdminUsersPanel } from "./admin-users-panel";
import { AdminPaymentTerminalsPanel } from "./admin-payment-terminals-panel";
import { AdminSitesPanel } from "./admin-sites-panel";
import { AdminTreatmentCatalogPanel } from "./admin-treatment-catalog-panel";
import { AdminClinicalArgumentsPanel } from "./admin-clinical-arguments-panel";
import { AdminLaboratoriesPanel } from "./admin-laboratories-panel";
import { AdminCommunicationsPanel } from "./admin-communications-panel";
import { AdminBudgetDiscountsPanel } from "./admin-budget-discounts-panel";

export function AdminPage({
  section = "home",
}: {
  section?:
    | "home"
    | "users"
    | "catalog"
    | "clinical-arguments"
    | "laboratories"
    | "sites"
    | "payments"
    | "finance"
    | "communications"
    | "export";
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
                  : section === "finance"
                    ? "Finanzas · descuentos"
                    : section === "communications"
                      ? "Comunicaciones"
                      : section === "laboratories"
                        ? "Laboratorios"
                        : section === "export"
                          ? "Exportar datos"
                          : section === "clinical-arguments"
                            ? "Ventajas y desventajas"
                            : "Catálogo"
        }
        description="Usuarios, sedes y configuración."
      />
      {section === "home" ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
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
          <Link className={styles.cardLink} href="/app/admin/finance">
            <span className={styles.cardLinkTitle}>Finanzas · descuentos</span>
            <span className={styles.cardLinkDescription}>
              Pronto pago y descuentos que se aplican en los presupuestos
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/catalog">
            <span className={styles.cardLinkTitle}>Catálogo clínico</span>
            <span className={styles.cardLinkDescription}>Tratamientos, costes y precios</span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/clinical-arguments">
            <span className={styles.cardLinkTitle}>Ventajas y desventajas</span>
            <span className={styles.cardLinkDescription}>
              Frases que se explican al paciente al comparar planes
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/laboratories">
            <span className={styles.cardLinkTitle}>Laboratorios</span>
            <span className={styles.cardLinkDescription}>
              Datos fiscales, contacto, trabajos realizados, costes y tiempos
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/communications">
            <span className={styles.cardLinkTitle}>Comunicaciones</span>
            <span className={styles.cardLinkDescription}>
              Confirmación de citas por enlace, WhatsApp y SMS
            </span>
          </Link>
          <Link className={styles.cardLink} href="/app/admin/export">
            <span className={styles.cardLinkTitle}>Exportar datos</span>
            <span className={styles.cardLinkDescription}>Pacientes, citas y tratamientos</span>
          </Link>
        </SimpleGrid>
      ) : null}
      {section === "users" ? <AdminUsersPanel /> : null}
      {section === "catalog" ? <AdminTreatmentCatalogPanel /> : null}
      {section === "clinical-arguments" ? <AdminClinicalArgumentsPanel /> : null}
      {section === "laboratories" ? <AdminLaboratoriesPanel /> : null}
      {section === "sites" ? <AdminSitesPanel /> : null}
      {section === "payments" ? <AdminPaymentTerminalsPanel /> : null}
      {section === "finance" ? <AdminBudgetDiscountsPanel /> : null}
      {section === "communications" ? <AdminCommunicationsPanel /> : null}
      {section === "export" ? <AdminExportPanel /> : null}
    </div>
  );
}
