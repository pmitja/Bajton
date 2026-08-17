import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/db/queries";

export default async function Home() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
