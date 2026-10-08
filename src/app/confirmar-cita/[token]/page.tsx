import { ConfirmationForm } from "./confirmation-form";
import styles from "./page.module.css";

export default async function ConfirmAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className={styles.page}>
      <h1>Confirma tu cita</h1>
      <p className={styles.description}>
        Para confirmar tu cita en la clínica, pulsa el botón. Abrir este enlace no confirma
        automáticamente la asistencia.
      </p>
      <ConfirmationForm token={token} />
    </main>
  );
}
