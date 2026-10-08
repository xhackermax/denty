"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicContactsList } from "@/features/admin/clinic-contacts/clinic-contacts-list";
import {
  createClinicContactsHttpAPI,
  type ClinicContact,
} from "@/shared/api/resources/clinic-contacts";
import { sessionResponseSchema } from "@/shared/api/contracts";

export default function ClinicContactsPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    clinicId: string;
    contacts: ClinicContact[];
    total: number;
    canManage: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/login?next=%2Fapp%2Fclinic-contacts");
          return;
        }
        if (!response.ok) throw new Error("No se pudo validar la sesión.");
        const session = sessionResponseSchema.parse(await response.json());
        const result = await createClinicContactsHttpAPI().list(session.actor.clinicId);
        if (!cancelled)
          setData({
            clinicId: session.actor.clinicId,
            contacts: result.data,
            total: result.totalCount,
            canManage: session.actor.role === "ADMIN",
          });
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los contactos.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Cargando contactos…</p>;
  return (
    <ClinicContactsList
      clinicId={data.clinicId}
      initialContacts={data.contacts}
      initialTotalCount={data.total}
      canManage={data.canManage}
    />
  );
}
