import { confirmAppointmentByToken } from "@/server/denty-supabase/appointment-confirmation";

const messages: Record<string, string> = {
  TOKEN_NOT_FOUND: "El enlace no es válido.",
  TOKEN_EXPIRED: "El enlace ha caducado. Llama a la clínica para confirmar la cita.",
  APPOINTMENT_NOT_FOUND: "No hemos encontrado la cita asociada a este enlace.",
  APPOINTMENT_CLOSED: "Esta cita ya no se puede confirmar desde el enlace.",
  SUPABASE_ADMIN_NOT_CONFIGURED: "La confirmación automática todavía no está configurada.",
};

export default async function ConfirmAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await confirmAppointmentByToken(token);
  const title = result.ok ? "Cita confirmada" : "No se pudo confirmar la cita";
  const detail = result.ok
    ? "Gracias. Hemos confirmado tu cita automáticamente."
    : (messages[result.code ?? ""] ?? "No se pudo confirmar la cita con este enlace.");

  return (
    <main style={{ maxWidth: 560, margin: "12vh auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  );
}
