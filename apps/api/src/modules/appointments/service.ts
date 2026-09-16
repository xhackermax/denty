import { AppointmentRepository, prisma, runBusinessTransaction, VersionConflictError, writeAudit, writeDomainEvent } from "@denty/db";
import type { AppointmentStatus } from "@denty/domain";
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from "@denty/contracts";
import type { ActorContext } from "../../plugins/actor";
import { ensureClinic } from "../patients/service";

export async function listAppointments(actor: ActorContext, date: string) {
  await ensureClinic(actor.clinicId);
  const repository = new AppointmentRepository(prisma);
  return repository.listForDay(actor.clinicId, date);
}

export async function createAppointment(actor: ActorContext, input: CreateAppointmentRequest, correlationId: string) {
  await ensureClinic(actor.clinicId);
  return runBusinessTransaction(prisma, async (tx) => {
    const repository = new AppointmentRepository(tx);
    const appointment = await repository.create({
      clinicId: actor.clinicId,
      patientId: input.patientId,
      staffId: input.staffId,
      siteId: input.siteId,
      cabinetId: input.cabinetId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      title: input.title,
      reason: input.reason,
    });
    await writeAudit(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      action: "appointment.created",
      entityType: "appointment",
      entityId: appointment.id,
      correlationId,
      after: { id: appointment.id, version: appointment.version },
    });
    await writeDomainEvent(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      type: "appointment.created",
      entityType: "appointment",
      entityId: appointment.id,
      correlationId,
      payload: { version: appointment.version },
    });
    return appointment;
  });
}

export async function updateAppointment(
  actor: ActorContext,
  id: string,
  input: UpdateAppointmentRequest,
  correlationId: string,
  statusOverride?: AppointmentStatus,
) {
  await ensureClinic(actor.clinicId);
  return runBusinessTransaction(prisma, async (tx) => {
    const repository = new AppointmentRepository(tx);
    const { expectedVersion, startsAt, endsAt, status, ...patch } = input;
    const appointment = await repository.update(id, expectedVersion, {
      ...patch,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      status: statusOverride ?? status,
    });
    await writeAudit(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      action: `appointment.${appointment.status.toLowerCase()}`,
      entityType: "appointment",
      entityId: appointment.id,
      correlationId,
      after: { id: appointment.id, version: appointment.version },
    });
    await writeDomainEvent(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      type: `appointment.${appointment.status.toLowerCase()}`,
      entityType: "appointment",
      entityId: appointment.id,
      correlationId,
      payload: { version: appointment.version },
    });
    return appointment;
  });
}

export { VersionConflictError };
