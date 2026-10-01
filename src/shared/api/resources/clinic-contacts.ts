import type { SupabaseClient } from "@supabase/supabase-js";

export interface PhoneEntry {
  number: string;
  type?: "mobile" | "fixed" | "other";
}

export interface ClinicContact {
  id: string;
  clinic_id: string;
  name: string;
  category: string;
  phones: PhoneEntry[] | string[];
  emails: string[];
  notes: string | null;
  hours: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export type ClinicContactInsert = {
  name: string;
  category: string;
  phones?: PhoneEntry[] | string[];
  emails?: string[];
  notes?: string | null;
  hours?: string | null;
};

export type ClinicContactUpdate = Partial<
  Omit<ClinicContact, "id" | "clinic_id" | "created_by" | "created_at" | "updated_at" | "version">
>;

export interface ListClinicContactsResponse {
  data: ClinicContact[];
  totalCount: number;
}

export interface ClinicContactsAPI {
  create(clinicId: string, data: ClinicContactInsert): Promise<ClinicContact>;
  list(
    clinicId: string,
    options?: {
      search?: string;
      category?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ListClinicContactsResponse>;
  update(
    contactId: string,
    data: ClinicContactUpdate & { expectedVersion?: number },
  ): Promise<ClinicContact>;
  delete(contactId: string): Promise<void>;
  listCategories(clinicId: string): Promise<string[]>;
}

export const createClinicContactsAPI = (
  client: Pick<SupabaseClient, "rpc">,
): ClinicContactsAPI => ({
  async create(clinicId: string, data: ClinicContactInsert) {
    const { data: result, error } = await client.rpc("create_clinic_contact", {
      p_clinic_id: clinicId,
      p_name: data.name,
      p_category: data.category,
      p_phones: data.phones || null,
      p_emails: data.emails || null,
      p_notes: data.notes || null,
      p_hours: data.hours || null,
    });

    if (error) throw error;
    return result;
  },

  async list(clinicId: string, options = {}) {
    const { search = null, category = null, limit = 100, offset = 0 } = options;

    const { data, error } = await client.rpc("list_clinic_contacts", {
      p_clinic_id: clinicId,
      p_search: search,
      p_category: category,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;

    const totalCount = data?.[0]?.total_count || 0;
    return {
      data: data || [],
      totalCount,
    };
  },

  async update(contactId: string, data: ClinicContactUpdate & { expectedVersion?: number }) {
    const { expectedVersion, ...updateData } = data;

    const { data: result, error } = await client.rpc("update_clinic_contact", {
      p_contact_id: contactId,
      p_name: updateData.name || null,
      p_category: updateData.category || null,
      p_phones: updateData.phones || null,
      p_emails: updateData.emails || null,
      p_notes: updateData.notes ?? null,
      p_hours: updateData.hours ?? null,
      p_expected_version: expectedVersion || null,
    });

    if (error) throw error;
    return result;
  },

  async delete(contactId: string) {
    const { error } = await client.rpc("delete_clinic_contact", {
      p_contact_id: contactId,
    });

    if (error) throw error;
  },

  async listCategories(clinicId: string) {
    const { data, error } = await client.rpc("list_clinic_contacts", {
      p_clinic_id: clinicId,
      p_limit: 1000,
      p_offset: 0,
    });
    if (error) throw error;
    return [...new Set((data ?? []).map((row: ClinicContact) => row.category))] as string[];
  },
});

export function createClinicContactsHttpAPI(fetchImpl: typeof fetch = fetch): ClinicContactsAPI {
  const client = {
    async rpc(operation: string, parameters: Record<string, unknown>) {
      const response = await fetchImpl("/api/clinic-contacts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, parameters }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const envelope = data as { error?: { message?: string } };
        throw new Error(envelope.error?.message ?? "No se pudieron cargar los contactos.");
      }
      return { data, error: null };
    },
  };
  return createClinicContactsAPI(client as unknown as Pick<SupabaseClient, "rpc">);
}
