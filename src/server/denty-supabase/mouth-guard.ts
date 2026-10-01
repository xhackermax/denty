import { deriveMouthState, isProbeable, type MouthState } from "@/domain/odontogram/mouth-state";
import type { DentalEntity } from "@/domain/odontogram";
import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
interface EntityRow {
  id: string;
  tooth?: string;
  entity_type: DentalEntity["entityType"];
  status: string;
  active: boolean;
  attributes_json?: Record<string, unknown>;
}
export async function loadMouthState(
  client: SupabaseRestClient,
  clinicId: string,
  patientId: string,
): Promise<MouthState> {
  const patients = await client.select<{ birth_date: string | null }>("patients", {
    select: "birth_date",
    id: `eq.${patientId}`,
    clinic_id: `eq.${clinicId}`,
    limit: 1,
  });
  if (!patients[0]) throw new SupabaseRestError("Paciente no encontrado.", 404, {});
  const rows = await client.select<EntityRow>("dental_entities", {
    select: "id,tooth,entity_type,status,active,attributes_json",
    patient_id: `eq.${patientId}`,
    clinic_id: `eq.${clinicId}`,
    active: "eq.true",
  });
  return deriveMouthState(
    rows.map((r) => ({
      id: r.id,
      ...(r.tooth ? { tooth: r.tooth } : {}),
      entityType: r.entity_type,
      status: r.status,
      active: r.active,
      ...(r.attributes_json ? { attributes: r.attributes_json } : {}),
    })),
    patients[0].birth_date ? { birthDate: patients[0].birth_date } : {},
  );
}
export async function assertProbeable(
  client: SupabaseRestClient,
  clinicId: string,
  patientId: string,
  sites: readonly { tooth: string }[],
) {
  const state = await loadMouthState(client, clinicId, patientId);
  const invalid = sites.find((s) => !isProbeable(state, s.tooth));
  if (invalid)
    throw new SupabaseRestError(`El diente ${invalid.tooth} está ausente o no es sondeable.`, 422, {
      code: "TOOTH_UNAVAILABLE",
      tooth: invalid.tooth,
    });
}
