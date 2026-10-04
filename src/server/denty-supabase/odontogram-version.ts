/** The one read this needs, so tests can supply rows without a full REST client. */
export interface VersionRowReader {
  select(table: string, query: Record<string, string | number | undefined>): Promise<unknown[]>;
}

/**
 * The chart's version is the highest version any of its rows ever carried, deactivated rows
 * included: save_odontogram_batch stamps the rows it deactivates with the new version, so an
 * emptied chart still advances and the next save does not conflict with itself.
 */
export async function currentOdontogramVersion(
  client: VersionRowReader,
  patientId: string,
): Promise<number> {
  const rows = await client.select("dental_entities", {
    select: "version",
    patient_id: `eq.${patientId}`,
    order: "version.desc",
    limit: 1,
  });
  const latest = rows[0] as { version?: number } | undefined;
  return Math.max(1, latest?.version ?? 1);
}
