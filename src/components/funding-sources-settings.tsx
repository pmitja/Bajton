"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createFundingSource, deleteFundingSource, updateFundingSource, type FundingSourceInput } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fundingSourceKindLabels } from "@/lib/format";
import type { FundingSource, FundingSourceKind } from "@/lib/types";

const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const emptyDraft: FundingSourceInput = { name: "", kind: "capital", amount: "" };

export function FundingSourcesSettings({ sources }: { sources: FundingSource[] }) {
  // null = zaprto, "new" = nov vir, sicer id vira v urejanju.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<FundingSourceInput>(emptyDraft);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openEditor(source?: FundingSource) {
    setDraft(source ? { name: source.name, kind: source.kind, amount: source.amount === null ? "" : String(source.amount) } : emptyDraft);
    setMessage("");
    setEditing(source?.id ?? "new");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = editing === "new" ? await createFundingSource(draft) : await updateFundingSource(editing ?? "", draft);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(source: FundingSource) {
    setMessage("");
    startTransition(async () => {
      const result = await deleteFundingSource(source.id);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm md:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Viri financiranja</h2>
          <p className="mt-1 text-sm text-muted-foreground">Viri z zneskom sestavljajo proračun projekta. Vir brez zneska (npr. lastna sredstva) nima omejitve.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openEditor()}><Plus className="size-4" />Dodaj vir</Button>
      </div>
      <ul className="mt-5 divide-y rounded-xl border">
        {sources.map((source) => (
          <li key={source.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{source.name}</p>
              <p className="text-xs text-muted-foreground">{source.kindLabel} · {source.expenseCount} {source.expenseCount === 1 ? "strošek" : "stroškov"}</p>
            </div>
            <p className="text-sm font-semibold">{source.amount === null ? <span className="font-normal text-muted-foreground">Brez omejitve</span> : euro.format(source.amount)}</p>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Uredi ${source.name}`} onClick={() => openEditor(source)} disabled={pending}><Pencil /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Odstrani ${source.name}`} onClick={() => remove(source)} disabled={pending || source.expenseCount > 0} title={source.expenseCount > 0 ? "Vir je uporabljen pri stroških" : undefined}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      {message && editing === null ? <p className="mt-3 text-sm text-destructive" role="alert">{message}</p> : null}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!pending && !open) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>{editing === "new" ? "Nov vir financiranja" : "Uredi vir financiranja"}</DialogTitle>
              <DialogDescription>Npr. Kredit, Kapital #2 ali Lastna sredstva.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="funding-source-name">Ime</Label>
                <Input id="funding-source-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required minLength={2} maxLength={60} disabled={pending} />
              </div>
              <div className="space-y-2">
                <Label>Vrsta</Label>
                <Select value={draft.kind} onValueChange={(kind) => setDraft((current) => ({ ...current, kind: (kind as FundingSourceKind | null) ?? current.kind }))} itemToStringLabel={(value) => fundingSourceKindLabels[value as FundingSourceKind] ?? String(value)} disabled={pending}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(fundingSourceKindLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="funding-source-amount">Znesek</Label>
                <div className="relative">
                  <Input id="funding-source-amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Brez omejitve" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} className="pr-9" disabled={pending} />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground">Pusti prazno, če vir nima zgornje meje.</p>
              </div>
            </div>
            {message ? <p className="mb-4 text-sm text-destructive" role="alert">{message}</p> : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Prekliči</DialogClose>
              <Button type="submit" disabled={pending}>{pending ? "Shranjujem …" : "Shrani"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
