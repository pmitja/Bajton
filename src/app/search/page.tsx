import { AppShell, PageContainer } from "@/components/app-shell";
import { ProjectSearch } from "@/components/project-search";
import { getDashboardData, getSearchIndex } from "@/db/queries";

export default async function SearchPage() {
  const [data, entries] = await Promise.all([getDashboardData(), getSearchIndex()]);
  return <AppShell data={data}><PageContainer title="Iskanje" description="Išči po stroških, opravilih, izvajalcih in fazah projekta."><ProjectSearch entries={entries} /></PageContainer></AppShell>;
}
