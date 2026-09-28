"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, UploadCloud } from "lucide-react";
import { UploadDropzone, dropzoneAppearance, dropzoneConfig, uploadDisabledNotice, uploadEnabled } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { DatePicker, toIsoDate } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createExpense, type ExpenseActionState } from "@/app/actions";
import { expenseCategorySuggestions } from "@/lib/format";
import type { ContractorOption, FundingSourceOption, MemberOption } from "@/lib/types";

const initialState: ExpenseActionState = { success: false, message: "", revision: 0 };

type AddExpenseSheetProps = {
  projectId: string;
  contractors: ContractorOption[];
  fundingSources: FundingSourceOption[];
  members: MemberOption[];
  currentUserId: string;
};

export function AddExpenseSheet({ projectId, contractors, fundingSources, members, currentUserId }: AddExpenseSheetProps) {
  const fundingSourceNames = Object.fromEntries(fundingSources.map((source) => [source.id, source.name]));
  const memberNames = Object.fromEntries(members.map((member) => [member.id, member.name]));
  const [fundingSourceId, setFundingSourceId] = useState(fundingSources[0]?.id ?? "");
  const paidFromOwnFunds = fundingSources.find((source) => source.id === fundingSourceId)?.kind === "own";
  const [open, setOpen] = useState(false);
  const [expenseId, setExpenseId] = useState(() => crypto.randomUUID());
  // Datum računa je privzeto današnji dan; ob vsakem novem obrazcu ga osvežimo.
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submitExpense = useCallback(async (previousState: ExpenseActionState, formData: FormData) => {
    const result = await createExpense(previousState, formData);
    if (result.success) {
      formRef.current?.reset();
      // Nov UUID, da se naslednje priloge ne vežejo na pravkar shranjeni strošek.
      setExpenseId(crypto.randomUUID());
      setToday(toIsoDate(new Date()));
      setFundingSourceId(fundingSources[0]?.id ?? "");
      setUploadedCount(0);
      setUploadError(null);
      setOpen(false);
      router.refresh();
    }
    return result;
  }, [fundingSources, router]);
  const [state, formAction, pending] = useActionState(submitExpense, initialState);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="h-11 gap-2 px-4 shadow-sm" />}>
        <Plus className="size-4" />Dodaj strošek
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle className="text-xl">Nov strošek</SheetTitle>
          <SheetDescription>Naloži račun in zabeleži osnovne podatke. Sprememba bo pripisana tvojemu profilu.</SheetDescription>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="space-y-6 px-6 py-6">
          <input type="hidden" name="expenseId" value={expenseId} />
          <div className="rounded-xl border border-dashed bg-muted/35 p-3">
            {uploadEnabled ? (
              <UploadDropzone
                endpoint="invoiceAttachment"
                input={{ expenseId, projectId }}
                onClientUploadComplete={(files) => setUploadedCount((count) => count + files.length)}
                onUploadError={(error) => setUploadError(error.message)}
                appearance={dropzoneAppearance}
                config={dropzoneConfig}
              />
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <span className="mb-3 grid size-11 place-items-center rounded-full bg-background shadow-sm"><UploadCloud className="size-5 text-primary" /></span>
                <p className="text-sm font-medium">Povleci račun sem ali izberi datoteko</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG ali HEIC · največ 16 MB</p>
                <p className="mt-3 text-xs text-amber-700">{uploadDisabledNotice}</p>
              </div>
            )}
            {uploadedCount ? <p className="mt-2 text-xs text-emerald-700">{uploadedCount} {uploadedCount === 1 ? "račun pripravljen" : "računov pripravljenih"} — pripnemo jih ob shranjevanju stroška.</p> : null}
            {uploadError ? <p className="mt-2 text-xs text-destructive" role="alert">{uploadError}</p> : null}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="vendor">Dobavitelj</Label><Input id="vendor" name="vendor" placeholder="npr. Merkur trgovina" required aria-invalid={Boolean(state.errors?.vendor)} />{state.errors?.vendor ? <p className="text-xs text-destructive">{state.errors.vendor[0]}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="amount">Znesek z DDV</Label><div className="relative"><Input id="amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00" className="pr-10" required aria-invalid={Boolean(state.errors?.amount)} /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">€</span></div>{state.errors?.amount ? <p className="text-xs text-destructive">{state.errors.amount[0]}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="invoiceDate">Datum računa</Label><DatePicker key={expenseId} id="invoiceDate" name="invoiceDate" defaultValue={today} required aria-invalid={Boolean(state.errors?.invoiceDate)} />{state.errors?.invoiceDate ? <p className="text-xs text-destructive">{state.errors.invoiceDate[0]}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="category">Kategorija</Label><Input id="category" name="category" list="expense-category-suggestions" placeholder="npr. Stavbno pohištvo" minLength={2} maxLength={60} required aria-invalid={Boolean(state.errors?.category)} /><datalist id="expense-category-suggestions">{expenseCategorySuggestions.map((category) => <option key={category} value={category} />)}</datalist>{state.errors?.category ? <p className="text-xs text-destructive">{state.errors.category[0]}</p> : <p className="text-xs text-muted-foreground">Izberi predlog ali vpiši svojo kategorijo.</p>}</div>
            <div className="space-y-2"><Label>Izvajalec</Label><Select name="contractorId" defaultValue="none"><SelectTrigger className="w-full" aria-invalid={Boolean(state.errors?.contractorId)}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Brez izvajalca</SelectItem>{contractors.map((contractor) => <SelectItem key={contractor.id} value={contractor.id}>{contractor.name} · {contractor.trade}</SelectItem>)}</SelectContent></Select>{state.errors?.contractorId ? <p className="text-xs text-destructive">{state.errors.contractorId[0]}</p> : null}</div>
            <div className="space-y-2"><Label>Vir financiranja</Label><Select name="fundingSourceId" value={fundingSourceId} onValueChange={(next) => setFundingSourceId((next as string | null) ?? fundingSourceId)} itemToStringLabel={(value) => fundingSourceNames[value as string] ?? String(value)}><SelectTrigger className="w-full" aria-invalid={Boolean(state.errors?.fundingSourceId)}><SelectValue /></SelectTrigger><SelectContent>{fundingSources.map((source) => <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>)}</SelectContent></Select>{state.errors?.fundingSourceId ? <p className="text-xs text-destructive">{state.errors.fundingSourceId[0]}</p> : <p className="text-xs text-muted-foreground">Iz katerega denarja se plača račun.</p>}</div>
            {paidFromOwnFunds ? <div className="space-y-2"><Label>Plačal</Label><Select key={expenseId} name="paidBy" defaultValue={currentUserId} itemToStringLabel={(value) => memberNames[value as string] ?? String(value)}><SelectTrigger className="w-full" aria-invalid={Boolean(state.errors?.paidBy)}><SelectValue placeholder="Izberi osebo" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select>{state.errors?.paidBy ? <p className="text-xs text-destructive">{state.errors.paidBy[0]}</p> : <p className="text-xs text-muted-foreground">Kdo je plačal iz svojega žepa.</p>}</div> : null}
            <div className="space-y-2"><Label>Status</Label><Select name="status" defaultValue="received" itemToStringLabel={(value) => ({ received: "Prejeto", approved: "Odobreno", paid: "Plačano" })[value] ?? value}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="received">Prejeto</SelectItem><SelectItem value="approved">Odobreno</SelectItem><SelectItem value="paid">Plačano</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="note">Opomba</Label><Textarea id="note" name="note" rows={3} placeholder="Kratek kontekst za ostale investitorje" /></div>
          </div>
          <div className="rounded-xl bg-accent/65 p-4 text-sm text-accent-foreground">
            <div className="flex gap-3"><FileText className="mt-0.5 size-4 shrink-0" /><p>Po shranjevanju bomo zabeležili, kdo je strošek ustvaril, in vse poznejše spremembe.</p></div>
          </div>
          {state.message && !state.success ? <p className="text-sm text-destructive" role="alert">{state.message}</p> : null}
          <SheetFooter className="gap-2 px-0"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Prekliči</Button><Button type="submit" disabled={pending}>{pending ? "Shranjujem …" : "Shrani strošek"}</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
