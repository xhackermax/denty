import { useMemo, useState } from 'react';
import {
  calculateFinanceSummary,
  canRoleAccess,
  createConsentDocument,
  fullPatientName,
  type Permission,
  type Role,
} from '@denty/domain';
import { createDemoClinic } from '@denty/fixtures';
import { mainNavigation } from '@denty/ui';
import { parseLocalCommand } from '@denty/voice';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  operational: 'Usuario clinico',
};

const permissionLabels: Record<Permission, string> = {
  managePatients: 'Pacientes',
  manageAgenda: 'Agenda',
  manageLabs: 'Laboratorios',
  manageFinance: 'Finanzas',
  manageClinicalDocs: 'Documentacion clinica',
  manageSettings: 'Ajustes administracion',
  manageUsers: 'Usuarios y roles',
  viewAuditLog: 'Auditoria',
};

export function App() {
  const clinic = useMemo(() => createDemoClinic(), []);
  const [role, setRole] = useState<Role>('operational');
  const [commandText, setCommandText] = useState('buscar paciente Ana');
  const finance = calculateFinanceSummary(clinic.payments);
  const patient = clinic.patients[0];
  const doctor = clinic.staff.find((member) => member.role === 'admin') ?? clinic.staff[0];
  const site = clinic.sites[0];
  const consent = createConsentDocument({
    template: clinic.consentTemplates[0],
    patient,
    doctor,
    site,
    date: '2026-09-15',
  });
  const command = parseLocalCommand(commandText);

  return (
    <div className="appShell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand">
          <div className="brandMark">D</div>
          <div>
            <strong>Denty</strong>
            <span>Clinica dental</span>
          </div>
        </div>
        <nav>
          {mainNavigation.map((item) => {
            const enabled = canRoleAccess(role, item.permission);
            return (
              <button className={enabled ? 'navItem' : 'navItem disabled'} key={item.id} type="button" disabled={!enabled}>
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel operativo</p>
            <h1>Gestion diaria de la clinica</h1>
          </div>
          <label className="roleSwitch">
            Rol
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="operational">Usuario clinico</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </header>

        <section className="metricGrid" aria-label="Indicadores principales">
          <Metric label="Pacientes activos" value={clinic.patients.length.toString()} />
          <Metric label="Citas proximas" value={clinic.appointments.length.toString()} />
          <Metric label="Trabajos de laboratorio" value={clinic.labWorks.length.toString()} />
          <Metric label="Pendiente de cobro" value={`${finance.pending.toLocaleString('es-ES')} EUR`} />
        </section>

        <section className="contentGrid">
          <article className="panel">
            <div className="panelHeader">
              <h2>Agenda de hoy</h2>
              <span>{site.name}</span>
            </div>
            <div className="timeline">
              {clinic.appointments.map((appointment) => (
                <div className="timelineRow" key={appointment.id}>
                  <time>{appointment.startsAt.slice(11, 16)}</time>
                  <div>
                    <strong>{fullPatientName(clinic.patients.find((item) => item.id === appointment.patientId) ?? patient)}</strong>
              <span>{appointment.endsAt.slice(11, 16)}</span>
                  </div>
                  <small>{appointment.status}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <h2>Permisos de cuenta</h2>
              <span>{roleLabels[role]}</span>
            </div>
            <div className="permissionList">
              {(Object.keys(permissionLabels) as Permission[]).map((permission) => (
                <span className={canRoleAccess(role, permission) ? 'permission active' : 'permission'} key={permission}>
                  {permissionLabels[permission]}
                </span>
              ))}
            </div>
          </article>

          <article className="panel wide">
            <div className="panelHeader">
              <h2>Consentimiento preparado</h2>
              <span>Listo para firma</span>
            </div>
            <div className="consentPreview">
              <p>{consent.body}</p>
              <div className="signatureLine">Firma pendiente</div>
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <h2>Comando por voz</h2>
              <span>{Math.round(command.confidence * 100)}%</span>
            </div>
            <input value={commandText} onChange={(event) => setCommandText(event.target.value)} aria-label="Comando por voz" />
            <p className="muted">Intencion: {command.intent}</p>
          </article>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
