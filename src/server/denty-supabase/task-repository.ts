import { SupabaseRestError } from "../supabase/rest-client";
import type { SupabaseRestClient } from "../supabase/rest-client";
interface TaskRow {
  id: string;
  patient_id: string | null;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_staff_id: string | null;
  due_at: string | null;
  source_type: string | null;
  source_id: string | null;
  position: number;
  duration_min: number;
  archived_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
const task = (r: TaskRow) => ({
  id: r.id,
  patientId: r.patient_id,
  taskType: r.task_type,
  title: r.title,
  description: r.description,
  status: r.status,
  priority: r.priority,
  assigneeStaffId: r.assignee_staff_id,
  dueAt: r.due_at,
  sourceType: r.source_type,
  sourceId: r.source_id,
  position: r.position,
  durationMin: r.duration_min,
  archivedAt: r.archived_at,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export class TaskRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}
  async list() {
    const rows = await this.client.select<TaskRow>("tasks", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "position.asc,created_at.asc",
    });
    return { items: rows.map(task) };
  }
  async create(input: {
    title: string;
    description?: string;
    patientId?: string;
    taskType?: string;
    priority?: string;
    assigneeStaffId?: string;
    dueAt?: string;
    sourceType?: string;
    sourceId?: string;
    durationMin?: number;
  }) {
    return task(
      await this.client.rpc<TaskRow>("create_task", {
        p_clinic_id: this.clinicId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_patient_id: input.patientId ?? null,
        p_task_type: input.taskType ?? "GENERAL",
        p_priority: input.priority ?? "NORMAL",
        p_assignee_staff_id: input.assigneeStaffId ?? null,
        p_due_at: input.dueAt ?? null,
        p_source_type: input.sourceType ?? null,
        p_source_id: input.sourceId ?? null,
        p_duration_min: input.durationMin ?? null,
      }),
    );
  }
  async updateStatus(
    id: string,
    input: { status: string; expectedVersion?: number; assigneeStaffId?: string; dueAt?: string },
  ) {
    return task(
      await this.client.rpc<TaskRow>("update_task_status", {
        p_task_id: id,
        p_status: input.status,
        p_expected_version: input.expectedVersion ?? null,
        p_assignee_staff_id: input.assigneeStaffId ?? null,
        p_due_at: input.dueAt ?? null,
      }),
    );
  }
  async update(
    id: string,
    input: {
      status?: string;
      title?: string;
      priority?: string;
      durationMin?: number;
      dueAt?: string | null;
      archived?: boolean;
      expectedVersion?: number;
      assigneeStaffId?: string;
    },
  ) {
    return task(
      await this.client.rpc<TaskRow>("update_task", {
        p_task_id: id,
        p_status: input.status ?? null,
        p_title: input.title ?? null,
        p_priority: input.priority ?? null,
        p_duration_min: input.durationMin ?? null,
        p_due_at: input.dueAt ?? null,
        p_clear_due_at: input.dueAt === null,
        p_archived: input.archived ?? null,
        p_expected_version: input.expectedVersion ?? null,
        p_assignee_staff_id: input.assigneeStaffId ?? null,
      }),
    );
  }
  async reorder(orderedIds: string[]) {
    const rows = await this.client.rpc<TaskRow[]>("reorder_tasks", {
      p_clinic_id: this.clinicId,
      p_ordered_ids: orderedIds,
    });
    return { items: rows.map(task) };
  }
}

const TASK_ERRORS: ReadonlyArray<readonly [string, number, string, string]> = [
  ["VERSION_CONFLICT", 409, "TASK_VERSION_CONFLICT", "La tarea cambió antes de guardarse."],
  ["TASK_NOT_FOUND", 404, "TASK_NOT_FOUND", "Tarea no encontrada."],
  ["TASK_NOT_IN_CLINIC", 422, "TASK_NOT_IN_CLINIC", "Alguna tarea no pertenece a tu clínica."],
  ["DUPLICATE_TASK_IDS", 422, "DUPLICATE_TASK_IDS", "La lista contiene tareas repetidas."],
  ["FORBIDDEN", 403, "FORBIDDEN", "No tienes permiso para gestionar tareas."],
];

// PostgREST maps custom SQLSTATEs inconsistently, so domain errors are matched by message.
export function mapTaskRpcError(
  caught: unknown,
): { status: number; code: string; message: string } | null {
  if (!(caught instanceof SupabaseRestError)) return null;
  const details = caught.details;
  const text =
    typeof details === "string"
      ? details
      : details && typeof details === "object" && "message" in details
        ? String((details as { message: unknown }).message)
        : "";
  const hit = TASK_ERRORS.find(([token]) => text.includes(token));
  return hit ? { status: hit[1], code: hit[2], message: hit[3] } : null;
}
