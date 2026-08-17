import { AttachInvoiceDialog } from "@/components/attach-invoice-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Expense } from "@/lib/types";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function ExpensesTable({ expenses, projectId }: { expenses: Expense[]; projectId: string }) {
  return (
    <Card className="gap-0 rounded-2xl border py-0 shadow-sm ring-0">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="bg-muted/35 text-xs text-muted-foreground hover:bg-muted/35">
            <TableHead className="h-auto px-5 py-3 text-muted-foreground">Dobavitelj</TableHead>
            <TableHead className="h-auto px-4 py-3 text-muted-foreground">Kategorija</TableHead>
            <TableHead className="h-auto px-4 py-3 text-muted-foreground">Status</TableHead>
            <TableHead className="h-auto px-4 py-3 text-muted-foreground">Račun</TableHead>
            <TableHead className="h-auto px-4 py-3 text-right text-muted-foreground">Znesek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id} className="hover:bg-muted/35">
              <TableCell className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8"><AvatarFallback className="bg-secondary text-[10px]">{expense.initials}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium">{expense.vendor}</p>
                    <p className="text-xs text-muted-foreground">{expense.date} · dodal {expense.initials}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3.5 text-muted-foreground">{expense.category}</TableCell>
              <TableCell className="px-4 py-3.5"><Badge variant="outline" className={expense.status === "Plačano" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{expense.status}</Badge></TableCell>
              <TableCell className="px-4 py-3.5"><AttachInvoiceDialog expenseId={expense.id} projectId={projectId} vendor={expense.vendor} attachmentCount={expense.attachmentCount} /></TableCell>
              <TableCell className="px-4 py-3.5 text-right font-semibold">{euro.format(expense.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
