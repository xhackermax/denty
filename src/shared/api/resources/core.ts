import { z } from "zod";

import type { ApiClient } from "../client";
import {
  appointmentSchema,
  archivePatientSchema,
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
  resetPasswordSchema,
  restorePatientSchema,
  loginResponseSchema,
  pageSchema,
  patientSchema,
  sessionResponseSchema,
  authSessionsSchema,
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
  type ResetPassword,
  type UpdateAppointment,
  type UpdatePatient,
} from "../contracts";
import {
  absenceSchema,
  absencesSchema,
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
  labAttachmentSchema,
  labReworkSchema,
  labWorksSchema,
  laboratoriesSchema,
  laboratorySchema,
  createLaboratorySchema,
  updateLaboratorySchema,
  laboratoryBalancesSchema,
  supplierInvoicesSchema,
  supplierInvoiceSchema,
  recordSupplierInvoiceSchema,
  supplierPaymentsSchema,
  supplierPaymentSchema,
  recordSupplierPaymentSchema,
  allocateSupplierPaymentSchema,
  tasksSchema,
  taskSchema,
  createTaskSchema,
  updateTaskSchema,
} from "../schemas/core";
import { encodeId, withQuery } from "./shared";

const okSchema = z.object({ ok: z.literal(true) });

export function createCoreResource(client: ApiClient) {
  return {
    auth: {
      session: () => client.request("/api/auth/session", sessionResponseSchema),
      login: (payload: LoginRequest) =>
        client.mutation("/api/auth/login", loginResponseSchema, loginRequestSchema.parse(payload)),
      requestPasswordReset: (payload: PasswordResetRequest) =>
        client.mutation(
          "/api/auth/request-password-reset",
          okSchema,
          passwordResetRequestSchema.parse(payload),
        ),
      resetPassword: (payload: ResetPassword) =>
        client.mutation("/api/auth/reset-password", okSchema, resetPasswordSchema.parse(payload)),
      changePassword: (payload: ChangePassword) =>
        client.mutation("/api/auth/change-password", okSchema, changePasswordSchema.parse(payload)),
      sessions: () => client.request("/api/auth/sessions", authSessionsSchema),
      revokeSession: (id: string) =>
        client.mutation(`/api/auth/sessions/${encodeId(id)}/revoke`, okSchema, {}),
      logout: () => client.mutation("/api/auth/logout", okSchema, {}),
    },
    patients: {
      list: (
        options: {
          includeArchived?: boolean;
          search?: string;
          page?: number;
          pageSize?: number;
        } = {},
      ) =>
        client.request(
          withQuery("/api/patients", {
            includeArchived: options.includeArchived ? "true" : undefined,
            search: options.search || undefined,
            page: options.page ? String(options.page) : undefined,
            pageSize: options.pageSize ? String(options.pageSize) : undefined,
          }),
          pageSchema(patientSchema),
        ),
      get: (id: string) => client.request(`/api/patients/${encodeId(id)}`, patientSchema),
      create: (payload: CreatePatient) =>
        client.mutation("/api/patients", patientSchema, createPatientSchema.parse(payload)),
      update: (id: string, payload: UpdatePatient) =>
        client.mutation(
          `/api/patients/${encodeId(id)}`,
          patientSchema,
          updatePatientSchema.parse(payload),
          { method: "PATCH" },
        ),
      archive: (id: string, payload: z.input<typeof archivePatientSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(id)}/archive`,
          patientSchema,
          archivePatientSchema.parse(payload),
        ),
      restore: (id: string, payload: z.input<typeof restorePatientSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(id)}/restore`,
          patientSchema,
          restorePatientSchema.parse(payload),
        ),
      uploadPhoto: (id: string, file: File) => {
        const form = new FormData();
        form.set("file", file);
        return client.upload(`/api/patients/${encodeId(id)}/patient-photo`, patientSchema, form);
      },
      photo: (id: string) =>
        client.requestBlob(`/api/patients/${encodeId(id)}/photo`, {
          headers: { accept: "image/*" },
        }),
    },
    appointments: {
      list: (date?: string, siteId?: string) =>
        client.request(withQuery("/api/appointments", { date, siteId }), appointmentsSchema),
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
        client.mutation(`/api/appointments/${encodeId(id)}/arrive`, appointmentSchema, {
          expectedVersion,
        }),
      waiting: (id: string, expectedVersion: number) =>
        client.mutation(`/api/appointments/${encodeId(id)}/waiting`, appointmentSchema, {
          expectedVersion,
        }),
      chair: (id: string, expectedVersion: number) =>
        client.mutation(`/api/appointments/${encodeId(id)}/chair`, appointmentSchema, {
          expectedVersion,
        }),
      noShow: (id: string, expectedVersion: number) =>
        client.mutation(`/api/appointments/${encodeId(id)}/no-show`, appointmentSchema, {
          expectedVersion,
        }),
      complete: (id: string, expectedVersion: number) =>
        client.mutation(`/api/appointments/${encodeId(id)}/complete`, appointmentSchema, {
          expectedVersion,
        }),
      cancel: (id: string, expectedVersion: number, reason: string) =>
        client.mutation(`/api/appointments/${encodeId(id)}/cancel`, appointmentSchema, {
          expectedVersion,
          reason,
        }),
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
        client.mutation("/api/lab-works", labWorkSchema, createLabWorkSchema.parse(payload)),
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
        client.request(`/api/lab-works/${encodeId(id)}/agenda-warning`, labAgendaWarningSchema),
      addAttachment: (id: string, file: File) => {
        const form = new FormData();
        form.set("file", file, file.name);
        return client.upload(
          `/api/lab-works/${encodeId(id)}/attachments`,
          labAttachmentSchema,
          form,
        );
      },
      downloadAttachment: (id: string, attachmentId: string) =>
        client.requestBlob(`/api/lab-works/${encodeId(id)}/attachments/${encodeId(attachmentId)}`, {
          headers: { accept: "application/octet-stream" },
        }),
      listLaboratories: () => client.request("/api/laboratories", laboratoriesSchema),
      createLaboratory: (payload: z.input<typeof createLaboratorySchema>) =>
        client.mutation(
          "/api/laboratories",
          laboratorySchema,
          createLaboratorySchema.parse(payload),
        ),
      updateLaboratory: (id: string, payload: z.input<typeof updateLaboratorySchema>) =>
        client.mutation(
          `/api/laboratories/${encodeId(id)}`,
          laboratorySchema,
          updateLaboratorySchema.parse(payload),
          { method: "PATCH" },
        ),
      balances: () => client.request("/api/laboratories/balances", laboratoryBalancesSchema),
      supplierInvoices: {
        list: () => client.request("/api/supplier-invoices", supplierInvoicesSchema),
        create: (payload: z.input<typeof recordSupplierInvoiceSchema>) =>
          client.mutation(
            "/api/supplier-invoices",
            supplierInvoiceSchema,
            recordSupplierInvoiceSchema.parse(payload),
          ),
      },
      supplierPayments: {
        list: () => client.request("/api/supplier-payments", supplierPaymentsSchema),
        create: (payload: z.input<typeof recordSupplierPaymentSchema>) =>
          client.mutation(
            "/api/supplier-payments",
            supplierPaymentSchema,
            recordSupplierPaymentSchema.parse(payload),
          ),
        allocate: (id: string, payload: z.input<typeof allocateSupplierPaymentSchema>) =>
          client.mutation(
            `/api/supplier-payments/${encodeId(id)}/allocate`,
            z.object({ id: z.string().min(1) }).passthrough(),
            allocateSupplierPaymentSchema.parse(payload),
          ),
      },
    },
    documents: {
      templates: {
        list: (options: { includeInactive?: boolean } = {}) =>
          client.request(
            withQuery("/api/document-templates", {
              includeInactive: options.includeInactive ? "true" : undefined,
            }),
            documentTemplatesSchema,
          ),
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
        client.request(withQuery("/api/documents", { patientId }), documentsSchema),
      create: (payload: z.input<typeof createDocumentSchema>) =>
        client.mutation("/api/documents", documentSchema, createDocumentSchema.parse(payload)),
      attendanceCertificate: (payload: z.input<typeof attendanceCertificateSchema>) =>
        client.mutation(
          "/api/documents/attendance-certificate",
          documentSchema,
          attendanceCertificateSchema.parse(payload),
        ),
      finalize: (id: string) =>
        client.mutation(`/api/documents/${encodeId(id)}/finalize`, documentSchema, {}),
      sign: (id: string, payload: z.input<typeof signDocumentSchema>) => {
        const parsed = signDocumentSchema.parse(payload);
        const [header = "", encoded = ""] = parsed.signatureDataUrl.split(",", 2);
        const mimeType = header.includes("image/jpeg") ? "image/jpeg" : "image/png";
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1)
          bytes[index] = binary.charCodeAt(index);
        const form = new FormData();
        form.set(
          "file",
          new File([bytes], mimeType === "image/jpeg" ? "firma.jpg" : "firma.png", {
            type: mimeType,
          }),
        );
        form.set("signerName", parsed.signerName);
        return client.upload(`/api/documents/${encodeId(id)}/sign`, documentSchema, form);
      },
      deliver: (id: string, payload: z.input<typeof deliverDocumentSchema>) =>
        client.mutation(
          `/api/documents/${encodeId(id)}/deliver`,
          documentSchema,
          deliverDocumentSchema.parse(payload),
        ),
      archive: (id: string) =>
        client.mutation(`/api/documents/${encodeId(id)}/archive`, documentSchema, {}),
      uploadFile: (id: string, file: File) => {
        const form = new FormData();
        form.set("file", file);
        return client.upload(`/api/documents/${encodeId(id)}/file`, documentSchema, form, {
          method: "POST",
        });
      },
      download: (id: string) =>
        client.requestBlob(`/api/documents/${encodeId(id)}/file`, {
          headers: { accept: "application/pdf" },
        }),
    },
    tasks: {
      list: () => client.request("/api/tasks", tasksSchema),
      create: (payload: z.input<typeof createTaskSchema>) =>
        client.mutation("/api/tasks", taskSchema, createTaskSchema.parse(payload)),
      update: (id: string, payload: z.input<typeof updateTaskSchema>) =>
        client.mutation(`/api/tasks/${encodeId(id)}`, taskSchema, updateTaskSchema.parse(payload), {
          method: "PATCH",
        }),
    },
    attendance: {
      me: (date?: string) =>
        client.request(withQuery("/api/attendance/me", { date }), attendanceMeSchema),
      punch: () => client.mutation("/api/attendance/punch", attendancePunchResultSchema, {}),
      correct: (id: string, payload: z.input<typeof attendanceCorrectionSchema>) =>
        client.mutation(
          `/api/attendance/punches/${encodeId(id)}`,
          z.object({ id: z.string().min(1) }).passthrough(),
          attendanceCorrectionSchema.parse(payload),
          { method: "PATCH" },
        ),
      daily: (date?: string) =>
        client.request(withQuery("/api/attendance/daily", { date }), attendanceDailySchema),
      listAbsences: () => client.request("/api/attendance/absences", absencesSchema),
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
