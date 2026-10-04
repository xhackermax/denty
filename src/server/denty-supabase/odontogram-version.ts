import type { SupabaseRestClient } from "../supabase/rest-client";

/**
 * The chart's version is the highest version any of its rows ever carried, deactivated rows
 * included: save_odontogram_batch stamps the rows it deactivates with the new version, so an
 * emptied chart still advances and the next save does not conflict with itself.
 */
export async function currentOdontogramVersion(
  client: Pick<SupabaseRestClient, "select">,
  patientId: string,
): Promise<number> {
  const rows = await client.select<{ version: number }>("dental_entities", {
    select: "version",
    patient_id: `eq.${patientId}`,
    order: "version.desc",
    limit: 1,
  });
  return Math.max(1, rows[0]?.version ?? 1);
}
