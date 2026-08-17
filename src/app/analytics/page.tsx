import { AppShell, PageContainer } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/db/queries";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function AnalyticsPage() {
  const data = await getDashboardData();
  const categories = Array.from(Map.groupBy(data.expenses, (expense) => expense.category), ([name, expenses]) => ({ name, amount: expenses.reduce((sum, expense) => sum + expense.amount, 0) })).toSorted((a, b) => b.amount - a.amount);
  const maximum = Math.max(...categories.map((category) => category.amount), 1);
  const paid = data.expenses.filter((expense) => expense.status === "Plačano").reduce((sum, expense) => sum + expense.amount, 0);
  const shownTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const available = data.project.budget - data.project.committed;
  return <AppShell data={data}><PageContainer title="Analitika" description="Poraba po kategorijah in stanje proračuna."><div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Finančni povzetek">{[
    { label: "Proračun", value: euro.format(data.project.budget), note: "Potrjen načrt" },
    { label: "Dogovorjeno", value: euro.format(data.project.committed), note: `${Math.round(data.project.committed / data.project.budget * 100)} % proračuna` },
    { label: "Razpoložljivo", value: euro.format(available), note: `${Math.round(available / data.project.budget * 100)} % proračuna` },
    { label: "Plačano v prikazu", value: euro.format(paid), note: `${shownTotal ? Math.round(paid / shownTotal * 100) : 0} % prikazanih stroškov` },
  ].map((metric) => <div key={metric.label} className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.note}</p></div>)}</section><div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="font-semibold">Poraba po kategorijah</h2><p className="mt-1 text-sm text-muted-foreground">Primerjava trenutno prikazanih stroškov</p><div className="mt-6 space-y-5">{categories.map((category) => <div key={category.name}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{category.name}</span><strong>{euro.format(category.amount)}</strong></div><Progress value={category.amount / maximum * 100} /></div>)}</div></section><section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="font-semibold">Stanje proračuna</h2><div className="mt-6 flex justify-center"><div className="grid size-44 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${data.project.committed / data.project.budget * 100}%, var(--muted) 0)` }}><div className="grid size-32 place-items-center rounded-full bg-card text-center"><div><p className="text-3xl font-bold">{Math.round(data.project.committed / data.project.budget * 100)} %</p><p className="text-xs text-muted-foreground">dogovorjeno</p></div></div></div></div><div className="mt-6 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Dogovorjeno</p><p className="mt-1 font-semibold">{euro.format(data.project.committed)}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Na voljo</p><p className="mt-1 font-semibold">{euro.format(available)}</p></div></div></section></div></div></PageContainer></AppShell>;
}
