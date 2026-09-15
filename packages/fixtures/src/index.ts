import { calculateFinanceSummary, type ClinicSnapshot } from "@denty/domain";

export function createDemoClinic(): ClinicSnapshot {
  const financeItems = [
    { total: 1450, paid: 900 },
    { total: 380, paid: 120 }
  ];

  return {
    patients: [
      { id: "p-1", firstName: "Maria", lastName: "Lopez", phone: "600111222", recordNumber: "D-001" },
      { id: "p-2", firstName: "Juan", lastName: "Garcia", phone: "600333444", recordNumber: "D-002" },
      { id: "p-3", firstName: "Sara", lastName: "Navarro", phone: "600555777", recordNumber: "D-003" }
    ],
    staff: [
      { id: "u-admin", name: "Administrador clinico", role: "admin", siteId: "s-1" },
      { id: "u-1", name: "Dr. Isaac", role: "operational", siteId: "s-2" },
      { id: "u-2", name: "Dra. Seneida", role: "operational", siteId: "s-1" }
    ],
    sites: [
      { id: "s-1", name: "Avenida Navarra", address: "Avenida Navarra 17, Zaragoza" },
      { id: "s-2", name: "Paseo Damas", address: "Paseo Damas, Zaragoza" }
    ],
    appointments: [
      { id: "a-1", patientId: "p-1", clinicianId: "u-1", siteId: "s-2", startsAt: "2026-09-15T10:00:00", endsAt: "2026-09-15T10:40:00", status: "confirmed" },
      { id: "a-2", patientId: "p-2", clinicianId: "u-2", siteId: "s-1", startsAt: "2026-09-15T12:00:00", endsAt: "2026-09-15T12:45:00", status: "planned" }
    ],
    labWorks: [
      { id: "l-1", patientId: "p-1", title: "Corona zirconio 16", labName: "Laboratorio principal", status: "sent" },
      { id: "l-2", patientId: "p-2", title: "Ferula descarga", labName: "Laboratorio principal", status: "received" }
    ],
    consentTemplates: [
      { id: "ci-endo", title: "CI Endodoncia", version: 3, active: true, body: "Consentimiento informado para tratamiento endodontico." },
      { id: "ci-implantes", title: "CI Implantes", version: 3, active: true, body: "Consentimiento informado para cirugia implantologica." }
    ],
    consentDocuments: [],
    payments: financeItems,
    finance: calculateFinanceSummary(financeItems)
  };
}
