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
      order: "status.asc,due_at.asc.nullslast,created_at.desc",
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

  async delete(id: string, expectedVersion?: number) {
    await this.client.rpc("delete_task", {
      p_task_id: id,
      p_expected_version: expectedVersion ?? null,
    });
  }
}
