/**
 * Migracije in seed na produkcijski bazi.
 *
 *   pnpm db:migrate:prod   # uveljavi migracije iz drizzle/
 *   pnpm db:reset:prod     # izprazni vse tabele in na novo napolni (nepovratno!)
 *
 * Povezavo prebere iz PROD_DATABASE_URL (v .env.local, nikoli v repozitorij).
 */
import { spawnSync } from "node:child_process";

const [command] = process.argv.slice(2);
const url = process.env.PROD_DATABASE_URL;

if (!url) {
  console.error("PROD_DATABASE_URL ni nastavljen. Dodaj ga v .env.local, nato ponovi ukaz.");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "neznan gostitelj";
  }
})();

if (command === "migrate") {
  console.log(`Migracije na produkciji (${host}) …`);
  const result = spawnSync("node", ["node_modules/drizzle-kit/bin.cjs", "migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  process.exit(result.status ?? 1);
}

if (command === "reset") {
  if (!process.env.PROD_RESET_CONFIRM) {
    console.error(`Varovalka: ta ukaz izprazni VSE tabele na ${host}.`);
    console.error("Če to res želiš, poženi: PROD_RESET_CONFIRM=1 pnpm db:reset:prod");
    process.exit(1);
  }

  console.log(`Izpraznitev in seed produkcije (${host}) …`);
  const result = spawnSync("node", ["scripts/seed.mjs", "--reset"], {
    stdio: "inherit",
    env: { ...process.env, SEED_DATABASE_URL: url },
  });
  process.exit(result.status ?? 1);
}

console.error("Uporaba: node scripts/prod-db.mjs <migrate|reset>");
process.exit(1);
