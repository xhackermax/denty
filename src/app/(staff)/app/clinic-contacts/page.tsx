"use client";
import { Skeleton, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicContactsList } from "@/features/admin/clinic-contacts/clinic-contacts-list";
import { createClinicContactsHttpAPI, type ClinicContact } from "@/shared/api/resources/clinic-contacts";
import { sessionResponseSchema } from "@/shared/api/contracts";
import { ErrorState, PageHeader } from "@/shared/ui";

export default function ClinicContactsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ clinicId: string; contacts: ClinicContact[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(null);
    async function load() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) {
          router.replace("/login?next=%2Fapp%2Fclinic-contacts");
          return;
        }
        if (!response.ok) throw new Error("No se pudo validar la sesión.");
        const session = sessionResponseSchema.parse(await response.json());
        const result = await createClinicContactsHttpAPI().list(session.actor.clinicId, { limit: 20, offset: 0 });
        if (!cancelled) setData({ clinicId: session.actor.clinicId, contacts: result.data, total: result.totalCount });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los contactos.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router, attempt]);
  if (data) return <ClinicContactsList clinicId={data.clinicId} initialContacts={data.contacts} initialTotalCount={data.total} />;
  return (
    <div>
      <PageHeader eyebrow="Directorio de la clínica" title="Contactos especiales" description="Laboratorios, proveedores y servicios, siempre a mano." />
      {error ? <ErrorState title="No se pudieron cargar los contactos" description={error} retryLabel="Volver a intentar" onRetry={() => setAttempt(value => value + 1)} /> :
        <Stack role="status" aria-label="Cargando contactos" gap="md"><Skeleton height={84} radius="lg" /><Skeleton height={110} radius="lg" /><Skeleton height={110} radius="lg" /></Stack>}
    </div>
  );
}
