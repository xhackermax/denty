import assert from "node:assert/strict";
import {
  buildFiscalChainEntry,
  verifyFiscalChain,
} from "../../src/domain/fiscal/verifactu-chain.ts";
import { reconcileTransactions } from "../../src/domain/finance/reconciliation.ts";
import { evaluateRadiographicAiResult } from "../../src/domain/ai/radiographic-review.ts";
import { createKioskCheckIn } from "../../src/domain/reception/kiosk-checkin.ts";
import { buildPrescriptionDispatch } from "../../src/domain/prescriptions/provider-contract.ts";

const first = await buildFiscalChainEntry(
  {
    invoiceId: "F-1",
    issuedAt: "2026-09-27T08:00:00+02:00",
    totalCents: 12000,
    taxId: "B12345678",
  },
  null,
);
const second = await buildFiscalChainEntry(
  { invoiceId: "F-2", issuedAt: "2026-09-27T08:01:00+02:00", totalCents: 5000, taxId: "B12345678" },
  first,
);
assert.equal(await verifyFiscalChain([first, second]), true);
assert.equal(await verifyFiscalChain([{ ...first, totalCents: 999 }, second]), false);

const rec = reconcileTransactions(
  [{ id: "p1", amountCents: 45000, occurredAt: "2026-09-27T10:00:00+02:00", reference: "ABC" }],
  [{ id: "b1", amountCents: 45000, occurredAt: "2026-09-27T10:01:00+02:00", reference: "ABC" }],
);
assert.equal(rec.matches.length, 1);
assert.equal(rec.unmatchedPayments.length, 0);

const ai = evaluateRadiographicAiResult({
  findings: [{ code: "possible-caries", confidence: 0.91 }],
  modelVersion: "x",
});
assert.equal(ai.clinicalStatus, "requires_human_review");
assert.equal(ai.canAutoWriteDiagnosis, false);

const kiosk = createKioskCheckIn({
  appointmentId: "a1",
  patientId: "p1",
  token: "secret",
  expectedToken: "secret",
});
assert.equal(kiosk.nextStatus, "arrived");
const rx = buildPrescriptionDispatch({
  prescriptionId: "rx1",
  patientId: "p1",
  prescriberId: "u1",
  medicationName: "Amoxicilina",
  signed: true,
});
assert.equal(rx.ready, true);
assert.throws(
  () =>
    buildPrescriptionDispatch({
      prescriptionId: "rx2",
      patientId: "p1",
      prescriberId: "u1",
      medicationName: "X",
      signed: false,
    }),
  /SIGNED/,
);
console.log("P3 contract: OK");
