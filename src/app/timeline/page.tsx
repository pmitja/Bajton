import { AppShell, PageContainer } from "@/components/app-shell";
import { CalendarCheck2, CalendarClock, Flag, TrendingUp } from "lucide-react";
import { TimelineWorkspace } from "@/components/timeline-workspace";
import { getDashboardData } from "@/db/queries";

export default async function TimelinePage() {
  const data = await getDashboardData();
  const phases = data.phases;
  const completed = phases.filter((phase) => phase.status === "done").length;
  const activeIndex = phases.findIndex((phase) => phase.status === "active");
  return <AppShell data={data}><PageContainer title="Timeline" description="Časovni potek gradnje in naslednji mejniki."><div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Povzetek časovnice">{[
    { label: "Skupni napredek", value: `${data.project.progress} %`, icon: TrendingUp },
    { label: "Aktivna faza", value: phases[activeIndex]?.name ?? "—", icon: Flag },
    { label: "Zaključene faze", value: `${completed} / ${phases.length}`, icon: CalendarCheck2 },
    { label: "Naslednji mejnik", value: phases[activeIndex]?.date.replace(/^Do /, "") ?? "—", icon: CalendarClock },
  ].map((metric) => <div key={metric.label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-xl font-bold">{metric.value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-accent"><metric.icon className="size-5" /></span></div></div>)}</section><TimelineWorkspace phases={phases} projectProgress={data.project.progress} /></div></PageContainer></AppShell>;
}
