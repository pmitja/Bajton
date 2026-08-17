import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/types";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead><tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground"><th className="px-5 py-3 font-medium">Dobavitelj</th><th className="px-4 py-3 font-medium">Kategorija</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Znesek</th></tr></thead>
          <tbody>{expenses.map((expense) => <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/35"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-secondary text-[10px]">{expense.initials}</AvatarFallback></Avatar><div><p className="font-medium">{expense.vendor}</p><p className="text-xs text-muted-foreground">{expense.date} · dodal {expense.initials}</p></div></div></td><td className="px-4 py-3.5 text-muted-foreground">{expense.category}</td><td className="px-4 py-3.5"><Badge variant="outline" className={expense.status === "Plačano" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{expense.status}</Badge></td><td className="px-4 py-3.5 text-right font-semibold">{euro.format(expense.amount)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
