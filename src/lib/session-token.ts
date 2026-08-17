import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "bajton_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

/** Zapis gesla: scrypt$N$r$p$sol$hash (heksadecimalno). */
export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;

  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const derived = scryptSync(password.normalize("NFKC"), Buffer.from(salt, "hex"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET manjka ali je prekratek (najmanj 32 znakov).");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, now = Date.now()) {
  const payload = `${userId}.${now + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/** Vrne id uporabnika, če je podpis veljaven in seja ni potekla. */
export function readSessionToken(token: string | undefined | null) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAt, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expiresAt}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null;

  return userId;
}
