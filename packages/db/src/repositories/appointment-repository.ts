import type { AppointmentRecord, AppointmentStatus } from "@denty/domain";

import type { PrismaClient } from "../../generated/client/index.js";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type DbClient = PrismaClient | PrismaTransaction;

export class VersionConflictError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly current: AppointmentRecord | null,
  ) {
    super(`${entityType} ${entityId} has a newer version`);
    this.name = "VersionConflictError";
  }
}

export interface CreateAppointmentInput {
  clinicId: string;
  patientId: string;
  staffId: string;
  siteId: string;
  cabinetId?: string | null;
  startsAt: Date;
  endsAt: Date;
  title: string;
  reason?: string | null;
}

export interface UpdateAppointmentPatch {
  staffId?: string;
  siteId?: string;
  cabinetId?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  status?: AppointmentStatus;
  title?: string;
  reason?: string | null;
}

export class AppointmentRepository {
  constructor(private readonly db: DbClient) {}

  async listForDay(clinicId: string, date: string): Promise<AppointmentRecord[]> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return this.db.appointment.findMany({
      where: {
        clinicId,
        startsAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    });
  }

  async create(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    return this.db.appointment.create({
      data: {
        ...input,
        status: "PLANNED",
      },
    });
  }

  async update(id: string, expectedVersion: number, patch: UpdateAppointmentPatch): Promise<AppointmentRecord> {
    const timestampPatch = statusTimestampPatch(patch.status);
    const result = await this.db.appointment.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...patch,
        ...timestampPatch,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await this.db.appointment.findUnique({ where: { id } });
      throw new VersionConflictError("appointment", id, current);
    }

    return this.db.appointment.findUniqueOrThrow({ where: { id } });
  }
}

function statusTimestampPatch(status?: AppointmentStatus) {
  const now = new Date();
  switch (status) {
    case "CONFIRMED":
      return { confirmedAt: now };
    case "ARRIVED":
      return { arrivedAt: now };
    case "IN_CHAIR":
      return { chairAt: now };
    case "NO_SHOW":
      return { absentAt: now };
    case "COMPLETED":
      return { completedAt: now };
    default:
      return {};
  }
}
