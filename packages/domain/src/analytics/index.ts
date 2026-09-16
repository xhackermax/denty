export type AnalyticsEventType =
  | "treatment.completed" | "treatment.rework" | "appointment.no_show"
  | "invoice.issued" | "payment.received" | "purchase.recorded" | "lab.cost_recorded"
  | "discount.applied" | "refund.recorded" | "writeoff.recorded";
export interface AnalyticsEvent {
  occurredAt: string; type: AnalyticsEventType; category?: string; specialty?: string;
  patientId?: string; staffId?: string; siteId?: string; revenueCents?: number; costCents?: number; lossCents?: number; quantity?: number;
}
export interface AnalyticsSummary { producedCents:number; invoicedCents:number; collectedCents:number; costCents:number; lossCents:number; marginCents:number; }
export function summarizeAnalytics(events: AnalyticsEvent[]): AnalyticsSummary {
  let producedCents=0,invoicedCents=0,collectedCents=0,costCents=0,lossCents=0;
  for (const e of events) {
    if (e.type === "treatment.completed") producedCents += e.revenueCents ?? 0;
    if (e.type === "invoice.issued") invoicedCents += e.revenueCents ?? 0;
    if (e.type === "payment.received") collectedCents += e.revenueCents ?? 0;
    costCents += e.costCents ?? 0; lossCents += e.lossCents ?? 0;
  }
  return { producedCents,invoicedCents,collectedCents,costCents,lossCents,marginCents:producedCents-costCents-lossCents };
}
export function noShowOpportunityLoss(durationMinutes: number, historicalMarginCentsPerMinute: number): number {
  return Math.max(0, Math.round(durationMinutes * historicalMarginCentsPerMinute));
}
export function samePeriodPreviousYear(start: Date, end: Date): { start: Date; end: Date } {
  const s=new Date(start),e=new Date(end); s.setUTCFullYear(s.getUTCFullYear()-1); e.setUTCFullYear(e.getUTCFullYear()-1); return {start:s,end:e};
}
