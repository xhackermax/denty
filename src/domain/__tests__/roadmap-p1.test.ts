import { describe, expect, it } from 'vitest';
import { transitionAppointment, appointmentMetrics } from '../appointment-lifecycle';
import { findAvailableSlots } from '../availability-engine';
import { buildDocumentExportManifest } from '../document-export';
import { applyPayment } from '../payment-ledger';
import { evaluateTreatmentGate } from '../treatment-gate';

describe('roadmap P1 domain contracts', () => {
  it('enforces the appointment state machine and records timestamps', () => {
    const arrived = transitionAppointment({ status: 'scheduled' }, 'arrived', '2026-09-27T08:00:00Z');
    const waiting = transitionAppointment(arrived, 'waiting', '2026-09-27T08:02:00Z');
    const chair = transitionAppointment(waiting, 'in_chair', '2026-09-27T08:10:00Z');
    const done = transitionAppointment(chair, 'completed', '2026-09-27T08:40:00Z');
    expect(done.completedAt).toBe('2026-09-27T10:40:00+02:00');
    expect(appointmentMetrics(done)).toEqual({ waitingMinutes: 8, chairMinutes: 30 });
    expect(() => transitionAppointment({ status: 'scheduled' }, 'completed', Date.now())).toThrow();
  });

  it('offers only collision-free authorized appointment slots', () => {
    const slots = findAvailableSlots({
      windowStart: '2026-09-28T08:00:00Z', windowEnd: '2026-09-28T12:00:00Z',
      durationMinutes: 60, intervalMinutes: 30,
      busy: [{ start: '2026-09-28T09:00:00Z', end: '2026-09-28T10:00:00Z' }],
      blocks: [{ start: '2026-09-28T11:00:00Z', end: '2026-09-28T12:00:00Z' }], limit: 6,
    });
    expect(slots.map((s) => s.start)).toEqual(['2026-09-28T10:00:00+02:00','2026-09-28T12:00:00+02:00']);
  });

  it('builds a deterministic export manifest without recursively exporting exports', () => {
    const manifest = buildDocumentExportManifest('p1', [
      { id:'a', title:'Consentimiento', createdAt:'2026-09-20T10:00:00Z', status:'signed', checksum:'x' },
      { id:'b', title:'Exportación previa', createdAt:'2026-09-21T10:00:00Z', status:'final', checksum:'y', kind:'export_bundle' },
    ], ['a','b']);
    expect(manifest.documentIds).toEqual(['a']);
    expect(manifest.fingerprint).toMatch(/^p1:/);
  });

  it('supports partial payments without allowing overpayment', () => {
    const next = applyPayment({ totalCents: 100000, paidCents: 25000 }, 30000);
    expect(next).toEqual({ totalCents:100000, paidCents:55000, outstandingCents:45000, settled:false });
    expect(() => applyPayment({ totalCents:100000, paidCents:90000 }, 20000)).toThrow();
  });

  it('blocks booking until required consents and budget signature are complete', () => {
    expect(evaluateTreatmentGate({ requiredConsentCodes:['CONSENT_IMPLANT'], signedConsentCodes:[], budgetSigned:true }).canSchedule).toBe(false);
    expect(evaluateTreatmentGate({ requiredConsentCodes:['CONSENT_IMPLANT'], signedConsentCodes:['CONSENT_IMPLANT'], budgetSigned:true }).canSchedule).toBe(true);
  });
});
