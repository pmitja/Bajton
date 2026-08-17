import { AppShell, PageContainer } from "@/components/app-shell";
import { AddExpenseSheet } from "@/components/dashboard/add-expense-sheet";
import { ExpensesWorkspace } from "@/components/expenses-workspace";
import { getDashboardData } from "@/db/queries";

export default async function ExpensesPage() {
  const data = await getDashboardData();
  return <AppShell data={data}><PageContainer title="Stroški" description="Vsi računi in dogovorjeni stroški projekta." action={<AddExpenseSheet projectId={data.project.id} />}><ExpensesWorkspace expenses={data.expenses} projectId={data.project.id} /></PageContainer></AppShell>;
}
