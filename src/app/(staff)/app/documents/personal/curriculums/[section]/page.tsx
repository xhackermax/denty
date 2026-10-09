import { notFound } from "next/navigation";
import { Anchor, Group, Text } from "@mantine/core";
import Link from "next/link";

import { CvArchive } from "@/features/documents/cv-archive";
import { DocumentsBreadcrumb } from "@/features/documents/documents-navigation";
import { StaffDocuments } from "@/features/documents/staff-documents";
import { PageHeader } from "@/shared/ui";

interface PageProps { params: Promise<{ section: string }> }

export default async function CurriculumSectionPage({ params }: PageProps) {
  const { section } = await params;
  if (section !== "personal" && section !== "archivo") notFound();
  const archive = section === "archivo";
  return (
    <>
      <DocumentsBreadcrumb personnel />
      <Group gap="xs" mb="md">
        <Text size="sm" c="dimmed">/</Text>
        <Anchor component={Link} size="sm" href="/app/documents/personal/curriculums">
          Currículums
        </Anchor>
      </Group>
      <PageHeader
        title={archive ? "Archivo de currículums" : "Currículums del personal"}
        description={archive
          ? "Candidaturas recibidas en PDF. Archivo privado por clínica en Supabase."
          : "Currículums vinculados a los integrantes del equipo, activos e inactivos."}
      />
      {archive ? <CvArchive /> : <StaffDocuments kind="CV" />}
    </>
  );
}
