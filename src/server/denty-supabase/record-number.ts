const SEQUENTIAL = /^(?:DNT-)?(\d{1,9})$/;

// Only plain sequence numbers count; legacy date/UUID-style ficha numbers are ignored.
export function nextRecordNumber(existing: readonly string[]): string {
  let max = 0;
  for (const value of existing) {
    const match = SEQUENTIAL.exec(value.trim());
    if (match?.[1]) max = Math.max(max, Number(match[1]));
  }
  return `DNT-${String(max + 1).padStart(6, "0")}`;
}
