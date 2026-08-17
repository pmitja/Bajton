import { AppShell, PageContainer } from "@/components/app-shell";
import { DocumentsWorkspace } from "@/components/documents-workspace";
import { getDashboardData, getDocuments } from "@/db/queries";

export default async function DocumentsPage() {
  const [data, documents] = await Promise.all([getDashboardData(), getDocuments()]);
  return <AppShell data={data}><PageContainer title="Dokumenti" description="Projektna dokumentacija in zadnje različice."><DocumentsWorkspace documents={documents} /></PageContainer></AppShell>;
}
