export function createKioskCheckIn(input: {
  appointmentId: string;
  patientId: string;
  token: string;
  expectedToken: string;
}) {
  if (!input.token || input.token !== input.expectedToken) throw new Error("INVALID_CHECKIN_TOKEN");
  return {
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    nextStatus: "arrived" as const,
    auditAction: "kiosk_check_in" as const,
  };
}
