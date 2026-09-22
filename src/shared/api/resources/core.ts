import { z } from "zod";

import type { ApiClient } from "../client";
import {
  appointmentSchema,
  createAppointmentSchema,
  createDocumentSchema,
  createLabWorkSchema,
  createPatientSchema,
  changePasswordSchema,
  documentSchema,
  labTransitionSchema,
  labWorkSchema,
  loginRequestSchema,
  passwordResetRequestSchema,
  pinLoginRequestSchema,
  resetPasswordSchema,
  loginResponseSchema,
  pageSchema,
  patientSchema,
  sessionResponseSchema,
  signDocumentSchema,
  updateAppointmentSchema,
  updatePatientSchema,
  type CreateAppointment,
  type CreateLabWork,
  type CreatePatient,
  type ChangePassword,
  type LabTransition,
  type LoginRequest,
  type PasswordResetRequest,
  type PinLoginRequest,
  type ResetPassword,
  type UpdateAppointment,
  type UpdatePatient,
} from "../contracts";
import {
  absenceSchema,
  appointmentsSchema,
  attendanceCertificateSchema,
  attendanceCorrectionSchema,
  attendanceDailySchema,
  attendanceMeSchema,
  attendancePunchResultSchema,
  createAbsenceSchema,
  createDocumentTemplateSchema,
  createDocumentTemplateVersionSchema,
  deliverDocumentSchema,
  documentsSchema,
  documentTemplateSchema,
  documentTemplatesSchema,
  labAgendaWarningSchema,
  labAttachmentInputSchema,
  labAttachmentSchema,
  labReworkSchema,
  labWorksSchema,
} from "../schemas/core";
import { encodeId, withQuery } from "./shared";

const okSchema = z.object({ ok: z.literal(true) });

export function createCoreResource(client: ApiClient) {
  return {
    auth: {
      session: () => client.request("/api/auth/session", sessionResponseSchema),
      login: (payload: LoginRequest) =>
        client.mutation(
          "/api/auth/login",
          loginResponseSchema,
          loginRequestSchema.parse(payload),
        ),
      pinLogin: (payload: PinLoginRequest) =>
        client.mutation(
          "/api/auth/pin-login",
          okSchema,
          pinLoginRequestSchema.parse(payload),
        ),
      requestPasswordReset: (payload: PasswordResetRequest) =>
        client.mutation(
          "/api/auth/request-password-reset",
          okSchema,
          passwordResetRequestSchema.parse(payload),
        ),
      resetPassword: (payload: ResetPassword) =>
        client.mutation(
          "/api/auth/reset-password",
          okSchema,
          resetPasswordSchema.parse(payload),
        ),
      changePassword: (payload: ChangePassword) =>
        client.mutation(
          "/api/auth/change-password",
          okSchema,
          changePasswordSchema.parse(payload),
        ),
      logout: () => client.mutation("/api/auth/logout", okSchema, {}),
    },
    patients: {
      list: () => client.request("/api/patients", pageSchema(patientSchema)),
      get: (id: string) =>
        client.request(`/api/patients/${encodeId(id)}`, patientSchema),
      create: (payload: CreatePatient) =>
        client.mutation(
          "/api/patients",
          patientSchema,
          createPatientSchema.parse(payload),
        ),
      update: (id: string, payload: UpdatePatient) =>
        client.mutation(
          `/api/patients/${encodeId(id)}`,
          patientSchema,
          updatePatientSchema.parse(payload),
          { method: "PATCH" },
        ),
    },
    appointments: {
      list: (date?: string) =>
        client.request(withQuery("/api/appointments", { date }), appointmentsSchema),
      create: (payload: CreateAppointment) =>
        client.mutation(
          "/api/appointments",
          appointmentSchema,
          createAppointmentSchema.parse(payload),
        ),
      update: (id: string, payload: UpdateAppointment) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}`,
          appointmentSchema,
          updateAppointmentSchema.parse(payload),
          { method: "PATCH" },
        ),
      arrive: (id: string, expectedVersion: number) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}/arrive`,
          appointmentSchema,
          { expectedVersion },
        ),
      chair: (id: string, expectedVersion: number) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}/chair`,
          appointmentSchema,
          { expectedVersion },
        ),
      noShow: (id: string, expectedVersion: number) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}/no-show`,
          appointmentSchema,
          { expectedVersion },
        ),
      complete: (id: string, expectedVersion: number) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}/complete`,
          appointmentSchema,
          { expectedVersion },
        ),
      confirmWaitingRoom: (id: string, expectedVersion: number) =>
        client.mutation(
          `/api/appointments/${encodeId(id)}/confirm-waiting-room`,
          appointmentSchema,
          { expectedVersion },
        ),
    },
    laboratory: {
      list: () => client.request("/api/lab-works", labWorksSchema),
      create: (payload: CreateLabWork) =>
        client.mutation(
          "/api/lab-works",
          labWorkSchema,
          createLabWorkSchema.parse(payload),
        ),
      transition: (id: string, payload: LabTransition) =>
        client.mutation(
          `/api/lab-works/${encodeId(id)}/transition`,
          labWorkSchema,
          labTransitionSchema.parse(payload),
        ),
      rework: (id: string, payload: z.input<typeof labReworkSchema>) =>
        client.mutation(
          `/api/lab-works/${encodeId(id)}/rework`,
          labWorkSchema,
          labReworkSchema.parse(payload),
        ),
      agendaWarning: (id: string) =>
        client.request(
          `/api/lab-works/${encodeId(id)}/agenda-warning`,
          labAgendaWarningSchema,
        ),
      addAttachment: (
        id: string,
        payload: z.input<typeof labAttachmentInputSchema>,
      ) =>
        client.mutation(
          `/api/lab-works/${encodeId(id)}/attachments`,
          labAttachmentSchema,
          labAttachmentInputSchema.parse(payload),
        ),
      downloadAttachment: (id: string, attachmentId: string) =>
        client.requestBlob(
          `/api/lab-works/${encodeId(id)}/attachments/${encodeId(attachmentId)}`,
          { headers: { accept: "application/octet-stream" } },
        ),
    },
    documents: {
      templates: {
        list: () => client.request("/api/document-templates", documentTemplatesSchema),
        create: (payload: z.input<typeof createDocumentTemplateSchema>) =>
          client.mutation(
            "/api/document-templates",
            documentTemplateSchema,
            createDocumentTemplateSchema.parse(payload),
          ),
        createVersion: (
          templateId: string,
          payload: z.input<typeof createDocumentTemplateVersionSchema>,
        ) =>
          client.mutation(
            `/api/document-templates/${encodeId(templateId)}/versions`,
            z.object({ id: z.string().min(1) }).passthrough(),
            createDocumentTemplateVersionSchema.parse(payload),
          ),
      },
      list: (patientId?: string) =>
        client.request(
          withQuery("/api/documents", { patientId }),
          documentsSchema,
        ),
      create: (payload: z.input<typeof createDocumentSchema>) =>
        client.mutation(
          "/api/documents",
          documentSchema,
          createDocumentSchema.parse(payload),
        ),
      attendanceCertificate: (
        payload: z.input<typeof attendanceCertificateSchema>,
      ) =>
        client.mutation(
          "/api/documents/attendance-certificate",
          documentSchema,
          attendanceCertificateSchema.parse(payload),
        ),
      finalize: (id: string) =>
        client.mutation(
          `/api/documents/${encodeId(id)}/finalize`,
          documentSchema,
          {},
        ),
      sign: (id: string, payload: z.input<typeof signDocumentSchema>) =>
        client.mutation(
          `/api/documents/${encodeId(id)}/sign`,
          z.object({ id: z.string().min(1) }).passthrough(),
          signDocumentSchema.parse(payload),
        ),
      deliver: (id: string, payload: z.input<typeof deliverDocumentSchema>) =>
        client.mutation(
          `/api/documents/${encodeId(id)}/deliver`,
          documentSchema,
          deliverDocumentSchema.parse(payload),
        ),
      archive: (id: string) =>
        client.mutation(
          `/api/documents/${encodeId(id)}/archive`,
          documentSchema,
          {},
        ),
      download: (id: string) =>
        client.requestBlob(`/api/documents/${encodeId(id)}/file`, {
          headers: { accept: "application/pdf" },
        }),
    },
    attendance: {
      me: (date?: string) =>
        client.request(withQuery("/api/attendance/me", { date }), attendanceMeSchema),
      punch: () =>
        client.mutation("/api/attendance/punch", attendancePunchResultSchema, {}),
      correct: (
        id: string,
        payload: z.input<typeof attendanceCorrectionSchema>,
      ) =>
        client.mutation(
          `/api/attendance/punches/${encodeId(id)}`,
          z.object({ id: z.string().min(1) }).passthrough(),
          attendanceCorrectionSchema.parse(payload),
          { method: "PATCH" },
        ),
      daily: (date?: string) =>
        client.request(
          withQuery("/api/attendance/daily", { date }),
          attendanceDailySchema,
        ),
      createAbsence: (payload: z.input<typeof createAbsenceSchema>) =>
        client.mutation(
          "/api/attendance/absences",
          absenceSchema,
          createAbsenceSchema.parse(payload),
        ),
      deleteAbsence: (id: string) =>
        client.mutation(
          `/api/attendance/absences/${encodeId(id)}`,
          okSchema,
          {},
          { method: "DELETE" },
        ),
    },
  } as const;
}
