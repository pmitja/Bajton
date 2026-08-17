"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CircleDollarSign, Clock3, Search, WalletCards } from "lucide-react";
import { ExpensesTable } from "@/components/expenses-table";
import { Input } from "@/components/ui/input";
import type { Expense } from "@/lib/types";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const statuses = ["Vsi", "Prejeto", "Odobreno", "Plačano"] as const;

export function ExpensesWorkspace({ expenses }: { expenses: Expense[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Vsi");
  const [category, setCategory] = useState("Vse kategorije");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("sl"));
  const categories = useMemo(() => ["Vse kategorije", ...new Set(expenses.map((expense) => expense.category))], [expenses]);
  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const matchesQuery = !deferredQuery || `${expense.vendor} ${expense.category}`.toLocaleLowerCase("sl").includes(deferredQuery);
    const matchesStatus = status === "Vsi" || expense.status === status;
    const matchesCategory = category === "Vse kategorije" || expense.category === category;
    return matchesQuery && matchesStatus && matchesCategory;
  }), [category, deferredQuery, expenses, status]);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paid = expenses.filter((expense) => expense.status === "Plačano").reduce((sum, expense) => sum + expense.amount, 0);
  const open = total - paid;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Povzetek stroškov">
        {[{ label: "Skupaj prikazano", value: euro.format(total), icon: WalletCards }, { label: "Plačano", value: euro.format(paid), icon: CircleDollarSign }, { label: "Odprto", value: euro.format(open), icon: Clock3 }].map((metric) => <div key={metric.label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{metric.value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><metric.icon className="size-5" /></span></div></div>)}
      </section>
      <section className="rounded-2xl border bg-card p-4 shadow-sm" aria-label="Filtri stroškov">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Išči stroške" placeholder="Išči dobavitelja ali kategorijo …" className="h-11 pl-10" /></div>
          <label className="sr-only" htmlFor="expense-category">Kategorija</label>
          <select id="expense-category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 xl:w-56">{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" aria-label="Status stroška">{statuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${status === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{filteredExpenses.length} od {expenses.length} stroškov</p>
      </section>
      {filteredExpenses.length ? <ExpensesTable expenses={filteredExpenses} /> : <div className="rounded-2xl border border-dashed bg-card p-12 text-center"><p className="font-medium">Ni najdenih stroškov</p><p className="mt-1 text-sm text-muted-foreground">Spremeni iskalni niz ali filtre.</p></div>}
    </div>
  );
}
