/**
 * Rules for choosing a colleague as the person responsible for a task.
 * The database repeats these rules in a BEFORE trigger, including legacy RPC callers.
 */
export interface AssignableStaffMember {
  id: string;
  name: string;
  role: string;
}

export function canAssignTaskTo(
  actorRole: string,
  currentStaffId: string | null,
  target: Pick<AssignableStaffMember, "id" | "role">,
): boolean {
  if (actorRole === "ADMIN") return true;
  if (currentStaffId === target.id) return true;
  return actorRole === "DENTIST" &&
    (target.role === "RECEPTION" || target.role === "ASSISTANT");
}

export function taskAssignmentChoices<T extends AssignableStaffMember>(
  actorRole: string,
  currentStaffId: string | null,
  staff: readonly T[],
): T[] {
  if (actorRole === "PATIENT") return [];
  return staff.filter((person) => canAssignTaskTo(actorRole, currentStaffId, person));
}
