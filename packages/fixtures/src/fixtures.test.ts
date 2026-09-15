import { describe, expect, it } from 'vitest';
import { createDemoClinic } from './index';

describe('createDemoClinic', () => {
  it('creates a connected clinic snapshot', () => {
    const clinic = createDemoClinic();
    expect(clinic.patients.length).toBeGreaterThan(0);
    expect(clinic.appointments[0]?.patientId).toBe(clinic.patients[0]?.id);
    expect(clinic.consentTemplates.length).toBeGreaterThan(0);
  });
});
