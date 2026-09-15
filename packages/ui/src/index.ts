import type { Permission } from "@denty/domain";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  permission: Permission;
  section: "clinical" | "operations" | "admin";
}

export const mainNavigation: NavItem[] = [
  { id: "today", label: "Hoy", icon: "H", permission: "manageAgenda", section: "operations" },
  { id: "patients", label: "Pacientes", icon: "P", permission: "managePatients", section: "clinical" },
  { id: "agenda", label: "Agenda", icon: "A", permission: "manageAgenda", section: "operations" },
  { id: "lab", label: "Laboratorio", icon: "L", permission: "manageLabs", section: "operations" },
  { id: "finance", label: "Finanzas", icon: "F", permission: "manageFinance", section: "operations" },
  { id: "documents", label: "Documentos", icon: "D", permission: "manageClinicalDocs", section: "clinical" },
  { id: "settings", label: "Ajustes", icon: "S", permission: "manageSettings", section: "admin" },
  { id: "users", label: "Usuarios", icon: "U", permission: "manageUsers", section: "admin" }
];
