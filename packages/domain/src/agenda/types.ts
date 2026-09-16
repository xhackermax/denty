export type AppointmentStatus =
  | "PLANNED"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_CHAIR"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export interface AppointmentRecord {
  id: string;
  clinicId: string;
  patientId: string;
  staffId: string;
  siteId: string;
  cabinetId?: string | null;
  clinicalPlanItemId?: string | null;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  title: string;
  reason?: string | null;
  confirmedAt?: Date | null;
  arrivedAt?: Date | null;
  chairAt?: Date | null;
  absentAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
