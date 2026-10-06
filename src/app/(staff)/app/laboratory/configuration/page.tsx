import { LaboratoryConfigurationModule } from "@/features/parity/modules/laboratory-configuration-module";
import { PageHeader } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

export default function LaboratoryConfigurationPage() {
  return (
    <div className={styles.grid}>
      <PageHeader
        title="Configuración de laboratorios"
        description="Laboratorios, procedimientos y tarifas."
      />
      <LaboratoryConfigurationModule />
    </div>
  );
}
