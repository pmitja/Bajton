import { Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppShell, PageContainer } from "@/components/app-shell";
import { getDashboardData, getInvestors } from "@/db/queries";

export default async function InvestorsPage() {
  const [data, investors] = await Promise.all([getDashboardData(), getInvestors()]);
  return <AppShell data={data}><PageContainer title="Investitorji" description="Člani, ki imajo dostop do projekta."><div className="grid max-w-4xl gap-4 sm:grid-cols-2">{investors.map((investor) => <article key={investor.id} className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm"><Avatar className="size-12"><AvatarFallback className="bg-primary text-primary-foreground">{investor.initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 font-semibold">{investor.name}{investor.role === "Lastnik projekta" ? <Crown className="size-4 text-primary" /> : null}</h2><p className="text-sm text-muted-foreground">{investor.role}</p><a href={`mailto:${investor.email}`} className="mt-1 block truncate text-sm hover:text-primary">{investor.email}</a></div></article>)}</div></PageContainer></AppShell>;
}
