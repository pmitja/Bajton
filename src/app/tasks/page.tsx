import { AppShell, PageContainer } from "@/components/app-shell";
import { TaskList } from "@/components/dashboard/task-list";
import { getDashboardData } from "@/db/queries";

export default async function TasksPage() {
  const data = await getDashboardData();
  return <AppShell data={data}><PageContainer title="Opravila" description="Odprta in zaključena opravila vseh investitorjev."><div className="max-w-4xl"><TaskList initialTasks={data.tasks} showAllLink={false} full /></div></PageContainer></AppShell>;
}
