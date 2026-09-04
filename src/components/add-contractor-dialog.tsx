"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createContractor, type ContractorActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContractorActionState = { success: false, message: "", revision: 0 };

export function AddContractorDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submitContractor = useCallback(async (previousState: ContractorActionState, formData: FormData) => {
    const result = await createContractor(previousState, formData);
    if (result.success) {
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
    return result;
  }, [router]);
  const [state, formAction, pending] = useActionState(submitContractor, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-11 gap-2 px-4 shadow-sm" />}><Plus className="size-4" />Dodaj izvajalca</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form ref={formRef} action={formAction}>
          <DialogHeader>
            <DialogTitle>Nov izvajalec</DialogTitle>
            <DialogDescription>Dodaj kontakt, ki ga bo mogoče povezati s stroški.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="contractor-name">Naziv ali ime</Label><Input id="contractor-name" name="name" placeholder="npr. Elektro Novak" minLength={2} maxLength={100} required aria-invalid={Boolean(state.errors?.name)} />{state.errors?.name ? <p className="text-xs text-destructive">{state.errors.name[0]}</p> : null}</div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="contractor-trade">Stroka</Label><Input id="contractor-trade" name="trade" placeholder="npr. Elektroinštalacije" minLength={2} maxLength={80} required aria-invalid={Boolean(state.errors?.trade)} />{state.errors?.trade ? <p className="text-xs text-destructive">{state.errors.trade[0]}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="contractor-phone">Telefon</Label><Input id="contractor-phone" name="phone" type="tel" maxLength={40} placeholder="041 123 456" aria-invalid={Boolean(state.errors?.phone)} />{state.errors?.phone ? <p className="text-xs text-destructive">{state.errors.phone[0]}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="contractor-email">E-pošta</Label><Input id="contractor-email" name="email" type="email" placeholder="ime@podjetje.si" aria-invalid={Boolean(state.errors?.email)} />{state.errors?.email ? <p className="text-xs text-destructive">{state.errors.email[0]}</p> : null}</div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="contractor-notes">Opomba</Label><Textarea id="contractor-notes" name="notes" rows={3} maxLength={500} placeholder="Dodatne informacije o izvajalcu" /></div>
          </div>
          {state.message && !state.success ? <p className="mb-4 text-sm text-destructive" role="alert">{state.message}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Prekliči</DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Dodajam …" : "Dodaj izvajalca"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
