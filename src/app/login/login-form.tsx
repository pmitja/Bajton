"use client";

import { useActionState } from "react";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { message: "" };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HardHat className="size-5" /></span>
        <div>
          <p className="text-lg font-bold tracking-tight">Bajton</p>
          <p className="text-xs text-muted-foreground">Gradnja pod nadzorom</p>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Prijava</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vpiši se z e-naslovom investitorja.</p>
        <form action={formAction} className="mt-6 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">E-naslov</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" placeholder="ime@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Geslo</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
          </div>
          {state.message ? <p className="text-sm text-destructive" role="alert">{state.message}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? "Prijavljam …" : "Prijava"}</Button>
        </form>
      </div>
    </div>
  );
}
