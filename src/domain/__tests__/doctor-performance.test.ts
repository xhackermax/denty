import { describe, expect, it } from "vitest";
import { doctorScorecard } from "../doctor-performance";

describe("doctor production source-of-truth", () => {
  it("counts performed procedures and excludes unfinished visits", () => {
    const score = doctorScorecard("dr1", [
      { doctorId:"dr1", patientId:"p1", appointmentId:"a1",
        treatmentCategory:"ENDODONTICS", attributedRevenueCents:25000 },
      { doctorId:"dr1", patientId:"p1", appointmentId:"a1",
        treatmentCategory:"RESTORATION", attributedRevenueCents:null },
      { doctorId:"dr2", patientId:"p2", appointmentId:"a2",
        treatmentCategory:"IMPLANT", attributedRevenueCents:90000 },
    ], [
      { doctorId:"dr1", patientId:"p1", appointmentId:"a1", status:"COMPLETED" },
      { doctorId:"dr1", patientId:"p1", appointmentId:"a3", status:"COMPLETED" },
      { doctorId:"dr1", patientId:"p2", appointmentId:"a4", status:"IN_CHAIR" },
    ], [
      { responsibleDoctorId:"dr1", category:"REPEATED_TREATMENT",
        repeatTreatment:true, cause:"UNDETERMINED" },
    ], [
      {doctorId:"dr1",outcome:"PLACED"},
      {doctorId:"dr1",outcome:"FAILED",failureKind:"PLACEMENT_ATTEMPT"},
      {doctorId:"dr1",outcome:"DEFERRED"},
    ]);
    expect(score).toMatchObject({
      completedVisits:2, uniquePatients:1, recordedExecutions:2,
      treatmentCounts:{ENDODONTICS:1,RESTORATION:1},
      attributedRevenueCents:25000, attributedRevenueCoverage:0.5,
      averageTicketCents:25000, reportedIncidents:1,
      repeatedTreatmentIncidents:1,placedImplants:1,
      failedPlacementAttempts:1,deferredImplants:1,
    });
  });

  it("does not invent a ticket when no treatment has an attributed price", () => {
    const score = doctorScorecard("dr1", [
      { doctorId:"dr1", patientId:"p1", appointmentId:"a1",
        treatmentCategory:"ORTHODONTICS",attributedRevenueCents:null },
    ], [], [], []);
    expect(score.averageTicketCents).toBeNull();
    expect(score.attributedRevenueCoverage).toBe(0);
    expect(score.treatmentCounts.ORTHODONTICS).toBe(1);
  });
});
