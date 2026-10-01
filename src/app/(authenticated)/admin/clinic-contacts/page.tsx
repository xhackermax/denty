"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClinicContactsList } from "@/features/admin/clinic-contacts/clinic-contacts-list";
import { getSupabaseBrowserClient } from "@/shared/supabase-browser";

export default function ClinicContactsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [initialContacts, setInitialContacts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user's clinic
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        const { data: staffMember, error: staffError } = await supabase
          .from("staff_members")
          .select("clinic_id")
          .eq("id", user.id)
          .single();

        if (staffError || !staffMember) {
          router.push("/");
          return;
        }

        setClinicId(staffMember.clinic_id);

        // Load initial contacts
        const { data: initialData, error: contactsError } = await supabase.rpc(
          "list_clinic_contacts",
          {
            p_clinic_id: staffMember.clinic_id,
            p_search: null,
            p_category: null,
            p_limit: 100,
            p_offset: 0,
          }
        );

        if (!contactsError && initialData) {
          setInitialContacts(initialData);
          setTotalCount(initialData[0]?.total_count || 0);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  if (isLoading || !clinicId) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container py-8">
      <ClinicContactsList
        clinicId={clinicId}
        initialContacts={initialContacts}
        initialTotalCount={totalCount}
      />
    </div>
  );
}
