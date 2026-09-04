"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CircleDollarSign, Clock3, Search, WalletCards } from "lucide-react";
import { ExpensesTable } from "@/components/expenses-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ContractorOption, Expense } from "@/lib/types";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const statuses = ["Vsi", "Prejeto", "Odobreno", "Plačano"] as const;
const panelClass = "rounded-2xl border shadow-sm ring-0 [--card-spacing:--spacing(5)]";

export function ExpensesWorkspace({ expenses, projectId, contractors }: { expenses: Expense[]; projectId: string; contractors: ContractorOption[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Vsi");
  const [category, setCategory] = useState("Vse kategorije");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("sl"));
  const categories = useMemo(() => ["Vse kategorije", ...new Set(expenses.map((expense) => expense.category))], [expenses]);
  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const matchesQuery = !deferredQuery || `${expense.vendor} ${expense.category} ${expense.contractor ?? ""}`.toLocaleLowerCase("sl").includes(deferredQuery);
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
        {[{ label: "Skupaj prikazano", value: euro.format(total), icon: WalletCards }, { label: "Plačano", value: euro.format(paid), icon: CircleDollarSign }, { label: "Odprto", value: euro.format(open), icon: Clock3 }].map((metric) => (
          <Card key={metric.label} className={panelClass}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{metric.value}</p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><metric.icon className="size-5" /></span>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="rounded-2xl border shadow-sm ring-0" aria-label="Filtri stroškov">
        <CardContent>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Išči stroške" placeholder="Išči dobavitelja, izvajalca ali kategorijo …" className="h-11 pl-10" /></div>
            <Select value={category} onValueChange={(next) => setCategory(next ?? "Vse kategorije")}>
              <SelectTrigger id="expense-category" aria-label="Kategorija" className="h-11 w-full xl:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <ToggleGroup
              aria-label="Status stroška"
              spacing={0}
              value={[status]}
              onValueChange={(next) => setStatus((current) => (next[0] as (typeof statuses)[number] | undefined) ?? current)}
              className="flex-wrap bg-muted p-1"
            >
              {statuses.map((item) => <ToggleGroupItem key={item} value={item} size="lg" className="px-3 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm">{item}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{filteredExpenses.length} od {expenses.length} stroškov</p>
        </CardContent>
      </Card>
      {filteredExpenses.length ? <ExpensesTable expenses={filteredExpenses} projectId={projectId} contractors={contractors} /> : (
        <Card className="rounded-2xl border border-dashed shadow-none ring-0">
          <CardContent className="p-12 text-center">
            <p className="font-medium">Ni najdenih stroškov</p>
            <p className="mt-1 text-sm text-muted-foreground">Spremeni iskalni niz ali filtre.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
