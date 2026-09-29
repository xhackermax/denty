export function makeIdempotencyKey(scope: string, eventId: string) {
  return `${scope}:${eventId}`.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 200);
}
export function shouldProcessEvent(key: string, processed: ReadonlySet<string>) {
  return !processed.has(key);
}
