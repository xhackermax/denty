export interface ActorContext {
  userId: string;
  clinicId: string;
  role: "admin" | "operational";
  permissions: string[];
  sessionId: string;
}

export async function getActor(): Promise<ActorContext> {
  return {
    userId: "test-user",
    clinicId: "test-clinic",
    role: "admin",
    permissions: ["managePatients", "manageAgenda"],
    sessionId: "test-session",
  };
}
