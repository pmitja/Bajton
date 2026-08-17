import "server-only";

import { cookies } from "next/headers";
import { eq, isNull, and } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSessionToken, readSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, verifyPassword } from "@/lib/session-token";
import { initialsOf } from "@/lib/format";

export type SessionUser = { id: string; name: string; email: string; initials: string };

export async function signInWithPassword(email: string, password: string) {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, email.trim().toLowerCase()), isNull(users.deletedAt)))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) return null;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return { id: user.id, name: user.name, email: user.email, initials: initialsOf(user.name) } satisfies SessionUser;
}

export async function signOutCurrentUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Prijavljeni uporabnik ali null; podpis piškotka preveri `readSessionToken`. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const [user] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return user ? { ...user, initials: initialsOf(user.name) } : null;
}
