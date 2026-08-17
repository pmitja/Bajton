import { randomBytes, scryptSync } from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** Isti zapis kot `src/lib/session-token.ts`: scrypt$N$r$p$sol$hash. */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}
