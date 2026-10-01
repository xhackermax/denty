export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

// Forma mínima que necesita la línea de tiempo; el Task real del API la satisface estructuralmente.
export interface TimelineTask {
  id: string;
  title: string;
  description?: string | null | undefined;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null | undefined;
  version: number;
  position: number;
  durationMin?: number | null | undefined;
  archivedAt?: string | null | undefined;
  assigneeStaffId?: string | null | undefined;
  // 'YYYY-MM-DD' sin hora; null/ausente = sin día programado (Bandeja) salvo que dueAt lo fije.
  scheduledOn?: string | null | undefined;
}

export interface TaskCreateInput {
  title: string;
  priority?: TaskPriority;
  durationMin?: number;
  dueAt?: string;
  description?: string;
  scheduledOn?: string;
  assigneeStaffId?: string;
}

export interface TaskUpdateInput {
  status?: TaskStatus;
  title?: string;
  priority?: TaskPriority;
  durationMin?: number;
  dueAt?: string | null;
  scheduledOn?: string | null;
  archived?: boolean;
  assigneeStaffId?: string | null;
  expectedVersion?: number;
}

export interface TaskLister {
  list(): Promise<{ items: TimelineTask[] }>;
}
export interface TaskWriter {
  create(input: TaskCreateInput): Promise<unknown>;
  update(id: string, input: TaskUpdateInput): Promise<unknown>;
}
export interface TaskReorderer {
  reorder(orderedIds: string[]): Promise<unknown>;
}
export interface TasksApi extends TaskLister, TaskWriter, TaskReorderer {}
