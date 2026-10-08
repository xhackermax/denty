import { getServerEnv } from "@/shared/config/env";
import { resolveSupabaseAdminCredentials } from "../supabase/credentials";
import { SupabaseRestClient } from "../supabase/rest-client";

export interface AppointmentConfirmationResult {
  ok: boolean;
  code?: string;
  appointmentId?: string;
  patientId?: string;
  startsAt?: string;
  status?: string;
}

export async function confirmAppointmentByToken(
  token: string,
): Promise<AppointmentConfirmationResult> {
  const credentials = resolveSupabaseAdminCredentials(getServerEnv());
  if (!credentials) return { ok: false, code: "SUPABASE_ADMIN_NOT_CONFIGURED" };
  const client = new SupabaseRestClient(credentials);
  return client.rpc<AppointmentConfirmationResult>("confirm_appointment_by_token", {
    p_token: token,
  });
}
