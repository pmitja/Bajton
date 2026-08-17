"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, FileText, HardHat, ReceiptText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SearchEntry } from "@/lib/types";

const destinations = [
  { label: "Vsi stroški", description: "Računi, statusi in zneski", href: "/expenses", icon: ReceiptText },
  { label: "Opravila", description: "Odprta in zaključena opravila", href: "/tasks", icon: ClipboardList },
  { label: "Izvajalci", description: "Kontakti izvajalcev", href: "/contractors", icon: HardHat },
  { label: "Dokumenti", description: "Projektne datoteke", href: "/documents", icon: FileText },
  { label: "Analitika", description: "Pregled porabe", href: "/analytics", icon: BarChart3 },
];

const kindIcons = { expense: ReceiptText, task: ClipboardList, contractor: HardHat, phase: CalendarDays } as const;

export function ProjectSearch({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("sl"));
  const navigation = destinations.map((item) => ({ ...item, id: item.href }));
  const projectEntries = entries.map((entry) => ({ ...entry, icon: kindIcons[entry.kind] }));
  const results = deferredQuery
    ? [...projectEntries, ...navigation].filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase("sl").includes(deferredQuery)).slice(0, 24)
    : navigation;

  return (
    <div className="max-w-3xl">
      <div className="relative"><Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Išči po projektu" placeholder="Išči stroške, opravila, izvajalce, faze …" className="h-12 bg-card pl-12" /></div>
      {results.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{results.map((item) => <Link key={item.id} href={item.href} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"><span className="grid size-10 place-items-center rounded-lg bg-accent"><item.icon className="size-5" /></span><span><span className="block font-medium">{item.label}</span><span className="text-sm text-muted-foreground">{item.description}</span></span></Link>)}</div> : <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Za “{query}” ni rezultatov.</div>}
    </div>
  );
}
