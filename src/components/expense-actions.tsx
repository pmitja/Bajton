"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { deleteExpense, updateExpense } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Expense } from "@/lib/types";

type Draft = {
  vendor: string;
  amount: string;
  invoiceDate: string;
  category: Expense["categoryKey"];
  status: "received" | "approved" | "paid";
  note: string;
};

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" });

function draftFrom(expense: Expense): Draft {
  const status = expense.statusKey === "approved" || expense.statusKey === "paid" ? expense.statusKey : "received";
  return {
    vendor: expense.vendor,
    amount: String(expense.amount),
    invoiceDate: expense.invoiceDate,
    category: expense.categoryKey,
    status,
    note: expense.note,
  };
}

export function ExpenseActions({ expense }: { expense: Expense }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(expense));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openEditor() {
    setDraft(draftFrom(expense));
    setMessage("");
    setEditing(true);
  }

  function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateExpense(expense.id, draft);
        if (!result.success) {
          setMessage(result.message);
          return;
        }
        setEditing(false);
        router.refresh();
      } catch {
        setMessage("Stroška ni bilo mogoče posodobiti. Poskusi znova.");
      }
    });
  }

  function removeExpense() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteExpense(expense.id);
        if (!result.success) {
          setMessage(result.message);
          return;
        }
        setConfirmingDelete(false);
        router.refresh();
      } catch {
        setMessage("Stroška ni bilo mogoče odstraniti. Poskusi znova.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Dejanja za strošek ${expense.vendor}`} disabled={pending} />}>
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={openEditor}><Pencil />Uredi</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => { setMessage(""); setConfirmingDelete(true); }}><Trash2 />Odstrani</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={(open) => { if (!pending) setEditing(open); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={saveExpense}>
            <DialogHeader>
              <DialogTitle>Uredi strošek</DialogTitle>
              <DialogDescription>Spremeni podatke za {expense.vendor}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`vendor-${expense.id}`}>Dobavitelj</Label>
                <Input id={`vendor-${expense.id}`} value={draft.vendor} onChange={(event) => setDraft((current) => ({ ...current, vendor: event.target.value }))} required minLength={2} disabled={pending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`amount-${expense.id}`}>Znesek z DDV</Label>
                <div className="relative">
                  <Input id={`amount-${expense.id}`} type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} className="pr-9" required disabled={pending} />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`date-${expense.id}`}>Datum računa</Label>
                <DatePicker id={`date-${expense.id}`} value={draft.invoiceDate} onValueChange={(invoiceDate) => setDraft((current) => ({ ...current, invoiceDate }))} required disabled={pending} />
              </div>
              <div className="space-y-2">
                <Label>Kategorija</Label>
                <Select value={draft.category} onValueChange={(category) => setDraft((current) => ({ ...current, category: category as Draft["category"] }))} disabled={pending}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="material">Material</SelectItem><SelectItem value="construction">Konstrukcija</SelectItem><SelectItem value="electrical">Elektroinštalacije</SelectItem><SelectItem value="documentation">Dokumentacija</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(status) => setDraft((current) => ({ ...current, status: status as Draft["status"] }))} disabled={pending}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="received">Prejeto</SelectItem><SelectItem value="approved">Odobreno</SelectItem><SelectItem value="paid">Plačano</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`note-${expense.id}`}>Opomba</Label>
                <Textarea id={`note-${expense.id}`} value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} rows={3} maxLength={500} disabled={pending} />
              </div>
            </div>
            {message ? <p className="mb-4 text-sm text-destructive" role="alert">{message}</p> : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Prekliči</DialogClose>
              <Button type="submit" disabled={pending}>{pending ? "Shranjujem …" : "Shrani spremembe"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingDelete} onOpenChange={(open) => { if (!pending) setConfirmingDelete(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odstrani strošek?</DialogTitle>
            <DialogDescription>Strošek za {expense.vendor} v znesku {euro.format(expense.amount)} bo odstranjen iz projekta.</DialogDescription>
          </DialogHeader>
          {message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Prekliči</DialogClose>
            <Button type="button" variant="destructive" onClick={removeExpense} disabled={pending}>{pending ? "Odstranjujem …" : "Odstrani"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
