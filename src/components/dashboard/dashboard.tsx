import Link from "next/link";
import { Activity, ChevronDown, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AddExpenseSheet } from "./add-expense-sheet";
import { TaskList } from "./task-list";
import type { DashboardData, MonthlySpending } from "@/lib/types";
import { AppShell } from "@/components/app-shell";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const today = new Intl.DateTimeFormat("sl-SI", { weekday: "long", day: "numeric", month: "long" });

function SpendingChart({ months }: { months: MonthlySpending[] }) {
  const width = 620;
  const height = 190;
  const top = 20;
  const bottom = 168;
  const maximum = Math.max(...months.map((month) => month.amount), 1);
  const points = months.map((month, index) => ({
    ...month,
    x: 18 + index * ((width - 36) / Math.max(months.length - 1, 1)),
    y: bottom - (month.amount / maximum) * (bottom - top),
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1)?.x.toFixed(1)} ${bottom} L${points[0]?.x.toFixed(1)} ${bottom} Z`;

  return (
    <div className="mt-5" aria-label={`Graf mesečne porabe: ${months.map((month) => `${month.label} ${euro.format(month.amount)}`).join(", ")}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-48 w-full overflow-visible">
        <defs><linearGradient id="spending" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity=".24"/><stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0"/></linearGradient></defs>
        {[35, 80, 125, 170].map((y) => <line key={y} x1="12" x2="608" y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" />)}
        <path d={area} fill="url(#spending)" />
        <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <circle key={point.month} cx={point.x} cy={point.y} r="4" fill="var(--card)" stroke="var(--chart-1)" strokeWidth="2.5"><title>{`${point.label}: ${euro.format(point.amount)}`}</title></circle>)}
        {points.map((point) => <text key={`${point.month}-label`} x={point.x} y="189" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{point.label}</text>)}
      </svg>
    </div>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const { project, expenses, tasks, phases, activity, currentUser, monthlySpending } = data;
  const recentExpenses = expenses.slice(0, 5);
  const activePhaseIndex = phases.findIndex((phase) => phase.status === "active");
  const available = project.budget - project.committed;
  const shownExpenses = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const openTaskCount = tasks.filter((task) => !task.completed).length;
  return (
    <AppShell data={data}>
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="mb-2 text-sm font-medium text-primary">{today.format(new Date()).replace(/^./, (letter) => letter.toLocaleUpperCase("sl"))}</p><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Dobrodošel nazaj, {currentUser.name.split(" ")[0]}.</h1><p className="mt-2 text-muted-foreground">{project.name} je {project.progress} % dokončana. Trenutno je odprtih {openTaskCount} opravil.</p></div>
            <AddExpenseSheet projectId={project.id} />
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ključne metrike">
            {[
              { label: "Celotni proračun", value: euro.format(project.budget), note: "Potrjen načrt", icon: WalletCards },
              { label: "Porabljeno", value: euro.format(project.spent), note: `${Math.round(project.spent/project.budget*100)} % proračuna`, icon: TrendingUp },
              { label: "Dogovorjeni stroški", value: euro.format(project.committed), note: "Vključuje odprte ponudbe", icon: ReceiptText },
              { label: "Še na voljo", value: euro.format(available), note: `${Math.round(available/project.budget*100)} % proračuna`, icon: Activity },
            ].map((metric) => <div key={metric.label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{metric.label}</p><span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><metric.icon className="size-4" /></span></div><p className="text-2xl font-bold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.note}</p></div>)}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-labelledby="spending-title"><div className="flex items-start justify-between"><div><h2 id="spending-title" className="font-semibold tracking-tight">Poraba skozi čas</h2><p className="mt-1 text-sm text-muted-foreground">Plačila v zadnjih 6 mesecih · skupaj {euro.format(monthlySpending.reduce((sum, month) => sum + month.amount, 0))}</p></div><span className="inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium">6 mesecev<ChevronDown className="size-3.5" /></span></div><SpendingChart months={monthlySpending} /></section>
            <TaskList initialTasks={tasks} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="expenses-title">
              <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="expenses-title" className="font-semibold tracking-tight">Zadnji stroški</h2><p className="mt-0.5 text-sm text-muted-foreground">Prikazano {euro.format(shownExpenses)}</p></div><Button render={<Link href="/expenses" />} nativeButton={false} variant="ghost" size="sm" className="text-primary">Vsi stroški</Button></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground"><th className="px-5 py-3 font-medium">Dobavitelj</th><th className="px-4 py-3 font-medium">Kategorija</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Znesek</th></tr></thead><tbody>{recentExpenses.map((expense) => <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/35"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-secondary text-[10px]">{expense.initials}</AvatarFallback></Avatar><div><p className="font-medium">{expense.vendor}</p><p className="text-xs text-muted-foreground">{expense.date} · dodal {expense.initials}</p></div></div></td><td className="px-4 py-3.5 text-muted-foreground">{expense.category}</td><td className="px-4 py-3.5"><Badge variant="outline" className={expense.status === "Plačano" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{expense.status}</Badge></td><td className="px-4 py-3.5 text-right font-semibold">{euro.format(expense.amount)}</td></tr>)}</tbody></table></div>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-labelledby="progress-title"><div className="flex items-start justify-between"><div><h2 id="progress-title" className="font-semibold tracking-tight">Napredek gradnje</h2><p className="mt-1 text-sm text-muted-foreground">Faza {activePhaseIndex + 1} od {phases.length}</p></div><span className="text-2xl font-bold text-primary">{project.progress} %</span></div><Progress value={project.progress} className="mt-4 h-2" /><div className="mt-6 space-y-5">{phases.map((phase, index) => <div key={phase.id} className="relative flex gap-3"><div className="flex flex-col items-center"><span className={`mt-0.5 size-3 rounded-full border-2 ${phase.status === "done" ? "border-emerald-600 bg-emerald-600" : phase.status === "active" ? "border-primary bg-primary" : "border-border bg-card"}`} />{index < phases.length - 1 ? <span className="mt-1 h-9 w-px bg-border" /> : null}</div><div className="-mt-0.5 flex flex-1 justify-between gap-4"><p className={`text-sm font-medium ${phase.status === "next" ? "text-muted-foreground" : ""}`}>{phase.name}</p><p className="text-xs text-muted-foreground">{phase.date}</p></div></div>)}</div></section>
          </div>

          <section className="mt-5 rounded-2xl border bg-card p-5 shadow-sm" aria-labelledby="activity-title"><div className="mb-4 flex items-center justify-between"><div><h2 id="activity-title" className="font-semibold tracking-tight">Zadnje aktivnosti</h2><p className="mt-1 text-sm text-muted-foreground">Vsaka sprememba ima svojega avtorja</p></div><Button render={<Link href="/activity" />} nativeButton={false} variant="ghost" size="sm">Celotna zgodovina</Button></div><div className="grid gap-3 md:grid-cols-3">{activity.slice(0, 3).map((item) => <div key={item.id} className="flex gap-3 rounded-xl bg-muted/45 p-4"><Avatar className="size-9"><AvatarFallback className="bg-secondary text-xs">{item.initials}</AvatarFallback></Avatar><div><p className="text-sm"><span className="font-semibold">{item.actor}</span> {item.action}</p><p className="mt-1 text-xs text-muted-foreground">{item.meta}</p></div></div>)}</div></section>
        </div>
    </AppShell>
  );
}
