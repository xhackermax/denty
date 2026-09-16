import { prisma, runBusinessTransaction, VersionConflictError, writeAudit, writeDomainEvent } from "@denty/db";
import type { CreatePatientRequest, UpdatePatientRequest } from "@denty/contracts";
import type { ActorContext } from "../../plugins/actor";
import { can } from "@denty/domain";

export async function ensureClinic(clinicId: string) {
  return prisma.clinic.upsert({
    where: { id: clinicId },
    create: { id: clinicId, name: "Denty" },
    update: {},
  });
}

export async function listPatients(actor: ActorContext) {
  if (!can(actor, "patients.read")) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await ensureClinic(actor.clinicId);
  const items = await prisma.patient.findMany({
    where: { clinicId: actor.clinicId, archivedAt: null },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return { items, total: items.length, page: 1, pageSize: items.length || 25 };
}

export async function getPatient(actor: ActorContext, id: string) {
  if (!can(actor, "patients.read")) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await ensureClinic(actor.clinicId);
  return prisma.patient.findFirstOrThrow({ where: { id, clinicId: actor.clinicId } });
}

export async function createPatient(actor: ActorContext, input: CreatePatientRequest, correlationId: string) {
  if (!can(actor, "patients.write_demographics")) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await ensureClinic(actor.clinicId);
  return runBusinessTransaction(prisma, async (tx) => {
    const patient = await tx.patient.create({
      data: {
        clinicId: actor.clinicId,
        ...input,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      },
    });
    await writeAudit(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      action: "patient.created",
      entityType: "patient",
      entityId: patient.id,
      correlationId,
      after: { id: patient.id, version: patient.version },
    });
    await writeDomainEvent(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      type: "patient.created",
      entityType: "patient",
      entityId: patient.id,
      correlationId,
      payload: { version: patient.version },
    });
    return patient;
  });
}

export async function updatePatient(actor: ActorContext, id: string, input: UpdatePatientRequest, correlationId: string) {
  if (!can(actor, "patients.write_demographics")) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await ensureClinic(actor.clinicId);
  return runBusinessTransaction(prisma, async (tx) => {
    const before = await tx.patient.findFirst({ where: { id, clinicId: actor.clinicId } });
    if (!before || before.version !== input.expectedVersion) {
      throw new VersionConflictError("patient", id, before as never);
    }
    const { expectedVersion, ...patch } = input;
    const patient = await tx.patient.update({
      where: { id },
      data: {
        ...patch,
        birthDate: patch.birthDate ? new Date(patch.birthDate) : undefined,
        version: { increment: 1 },
      },
    });
    await writeAudit(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      action: "patient.updated",
      entityType: "patient",
      entityId: patient.id,
      correlationId,
      before: { id: before.id, version: before.version },
      after: { id: patient.id, version: patient.version },
    });
    await writeDomainEvent(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      type: "patient.updated",
      entityType: "patient",
      entityId: patient.id,
      correlationId,
      payload: { version: patient.version },
    });
    return patient;
  });
}
