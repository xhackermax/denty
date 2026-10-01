"use client";

import { useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/shared/supabase-browser";
import {
  createClinicContactsAPI,
  type ClinicContact,
  type ClinicContactInsert,
  type ClinicContactUpdate,
} from "@/shared/api/resources/clinic-contacts";

export function useClinicContacts(clinicId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApi = () => {
    const supabase = getSupabaseBrowserClient();
    return createClinicContactsAPI(supabase);
  };

  const api = getApi();

  const create = useCallback(
    async (data: ClinicContactInsert) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.create(clinicId, data);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error creating contact";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api, clinicId]
  );

  const list = useCallback(
    async (options?: Parameters<typeof api.list>[1]) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.list(clinicId, options);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error listing contacts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api, clinicId]
  );

  const update = useCallback(
    async (contactId: string, data: ClinicContactUpdate & { expectedVersion?: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.update(contactId, data);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error updating contact";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const delete_ = useCallback(
    async (contactId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await api.delete(contactId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error deleting contact";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const listCategories = useCallback(async () => {
    try {
      return await api.listCategories(clinicId);
    } catch (err) {
      console.error("Error listing categories:", err);
      return [];
    }
  }, [api, clinicId]);

  return {
    create,
    list,
    update,
    delete: delete_,
    listCategories,
    isLoading,
    error,
  };
}
