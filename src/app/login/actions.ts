"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithPassword, signOutCurrentUser } from "@/lib/auth";

export type LoginState = { message: string };

const loginSchema = z.object({
  email: z.email("Vnesi veljaven e-naslov."),
  password: z.string().min(8, "Geslo mora imeti vsaj 8 znakov."),
  next: z.string().optional(),
});

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Preveri e-naslov in geslo." };

  const user = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (!user) return { message: "Napačen e-naslov ali geslo." };

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  await signOutCurrentUser();
  redirect("/login");
}
