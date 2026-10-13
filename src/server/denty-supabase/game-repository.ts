import type { SupabaseRestClient } from "../supabase/rest-client";

export class GameRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  dashboard(patientId: string) {
    return this.client.rpc<Record<string, unknown>>("get_patient_game_dashboard", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
    });
  }

  start(patientId: string, gameId: string) {
    return this.client.rpc<Record<string, unknown>>("start_patient_game_play", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_game_id: gameId,
    });
  }

  finish(patientId: string, playId: string, input: { score?: number }) {
    return this.client.rpc<Record<string, unknown>>("finish_patient_game_play", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_play_id: playId,
      p_score: input.score ?? null,
    });
  }

  createVoucher(patientId: string) {
    return this.client.rpc<Record<string, unknown>>("create_patient_game_voucher", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
    });
  }

  applyVoucher(voucherId: string) {
    return this.client.rpc<Record<string, unknown>>("apply_patient_game_voucher", {
      p_clinic_id: this.clinicId,
      p_voucher_id: voucherId,
    });
  }
}
