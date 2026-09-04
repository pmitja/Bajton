import { AppShell, PageContainer } from "@/components/app-shell";
import { AddContractorDialog } from "@/components/add-contractor-dialog";
import { ContractorsWorkspace } from "@/components/contractors-workspace";
import { getContractors, getDashboardData } from "@/db/queries";

export default async function ContractorsPage() {
  const [data, contractors] = await Promise.all([getDashboardData(), getContractors()]);
  return <AppShell data={data}><PageContainer title="Izvajalci" description="Kontakti izvajalcev na projektu." action={<AddContractorDialog />}><ContractorsWorkspace contractors={contractors} /></PageContainer></AppShell>;
}
