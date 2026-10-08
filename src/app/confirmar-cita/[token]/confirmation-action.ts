"use server";

import { confirmAppointmentByToken } from "@/server/denty-supabase/appointment-confirmation";
import type { ConfirmationState } from "./confirmation-state";

const errors: Record<string, string> = {
  TOKEN_NOT_FOUND: "El enlace no es válido.",
  TOKEN_EXPIRED: "El enlace ha caducado. Llama a la clínica para confirmar la cita.",
  APPOINTMENT_NOT_FOUND: "No hemos encontrado la cita asociada a este enlace.",
  APPOINTMENT_CLOSED: "Esta cita ya no se puede confirmar desde el enlace.",
  SUPABASE_ADMIN_NOT_CONFIGURED: "La confirmación automática todavía no está configurada.",
};

export async function confirmAppointmentAction(
  _previous: ConfirmationState,
  formData: FormData,
): Promise<ConfirmationState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length < 10 || token.length > 512) {
    return { status: "error", message: errors.TOKEN_NOT_FOUND };
  }
  try {
    const result = await confirmAppointmentByToken(token);
    return result.ok
      ? { status: "success", message: "Gracias. Tu cita ha quedado confirmada." }
      : {
          status: "error",
          message: errors[result.code ?? ""] ?? "No se pudo confirmar la cita con este enlace.",
        };
  } catch {
    return {
      status: "error",
      message: "No se pudo confirmar la cita. Inténtalo de nuevo o llama a la clínica.",
    };
  }
}
