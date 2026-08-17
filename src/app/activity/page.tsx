import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppShell, PageContainer } from "@/components/app-shell";
import { getDashboardData } from "@/db/queries";

export default async function ActivityPage() {
  const data = await getDashboardData();
  return <AppShell data={data}><PageContainer title="Aktivnosti" description="Zgodovina sprememb in obvestila projekta."><div className="max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">{data.activity.map((item) => <div key={item.id} className="flex gap-4 border-b p-5 last:border-0"><Avatar className="size-10"><AvatarFallback className="bg-secondary text-xs">{item.initials}</AvatarFallback></Avatar><div><p><span className="font-semibold">{item.actor}</span> {item.action}</p><p className="mt-1 text-sm text-muted-foreground">{item.meta}</p></div></div>)}</div></PageContainer></AppShell>;
}
