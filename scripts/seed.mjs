/**
 * Napolni bazo z izhodiščnimi podatki: uporabniki, projekt in članstva.
 * Zaženi z `pnpm db:seed`. Skripta je idempotentna in namenoma NE ustvarja
 * vsebine projekta (stroški, opravila, izvajalci, faze) — to vnašaš v aplikaciji.
 *
 * Obstoječega projekta ne preimenuje in ne podvaja: če projekt že obstaja,
 * ga prevzame in samo poskrbi, da so vsi uporabniki njegovi člani.
 */
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "./password.mjs";

const connectionString = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (!connectionString) {
  console.error("DATABASE_URL (ali SEED_DATABASE_URL) ni nastavljen.");
  process.exit(1);
}

const seedPassword = process.env.SEED_PASSWORD;
if (!seedPassword) {
  console.error("SEED_PASSWORD ni nastavljen. Nastavi ga v .env.local (nikoli v repozitorij).");
  process.exit(1);
}

const sql = neon(connectionString);
const reset = process.argv.includes("--reset");

const TABLES = [
  "activity_events", "expense_attachments", "payments", "expenses", "tasks",
  "project_phases", "vendors", "categories", "project_members", "projects", "users",
];

const MITJA_ID = "734d683c-a201-47dd-b813-754e90e4f782";
const JULIJA_ID = "0a2e6a09-1e9f-4a70-8b6f-3a54b1ff5f21";
const DARINKA_ID = "c4f0b6d1-6f2e-4f5a-9a41-2f7c8b0d5e33";

const userDefs = [
  { id: MITJA_ID, key: "mitja", name: "Mitja Pak", email: "mitja@bajton.si" },
  { id: JULIJA_ID, key: "julija", name: "Julija Pak", email: "julija@bajton.si" },
  { id: DARINKA_ID, key: "darinka", name: "Darinka Pak", email: "darinka@bajton.si" },
];

/** Uporabi se samo, kadar v bazi še ni nobenega projekta. */
const newProject = {
  name: process.env.SEED_PROJECT_NAME ?? "Nov projekt",
  location: process.env.SEED_PROJECT_LOCATION ?? null,
  budget: Number(process.env.SEED_PROJECT_BUDGET ?? 0),
};

async function main() {
  if (reset) {
    await sql.query(`truncate table ${TABLES.map((table) => `"${table}"`).join(", ")} restart identity cascade`);
    console.log("Vse tabele izpraznjene.");
  }

  for (const user of userDefs) {
    const passwordHash = hashPassword(seedPassword);
    await sql`
      insert into users (id, auth_user_id, name, email, password_hash, avatar_url)
      values (${user.id}, ${`local|${user.key}`}, ${user.name}, ${user.email}, ${passwordHash}, null)
      on conflict (id) do update set
        auth_user_id = excluded.auth_user_id, name = excluded.name, email = excluded.email,
        password_hash = excluded.password_hash, updated_at = now()
    `;
  }

  // Obstoječi projekt prevzamemo, da seed ne ustvari dvojnika in ne povozi
  // imena, ki si ga nastavil v aplikaciji.
  const preferredId = process.env.BAJTON_PROJECT_ID;
  const [existing] = preferredId
    ? await sql`select id, name from projects where id = ${preferredId} and deleted_at is null limit 1`
    : await sql`select id, name from projects where deleted_at is null order by created_at limit 1`;

  let project = existing;
  if (!project) {
    [project] = await sql`
      insert into projects (name, location, currency, total_budget, created_by)
      values (${newProject.name}, ${newProject.location}, 'EUR', ${newProject.budget}, ${MITJA_ID})
      returning id, name
    `;
    console.log(`Ustvarjen projekt: ${project.name}`);
  }

  for (const user of userDefs) {
    await sql`insert into project_members (project_id, user_id) values (${project.id}, ${user.id}) on conflict do nothing`;
  }

  console.log(`Seed končan. Projekt: ${project.name} (${project.id})`);
  console.log(`Uporabniki: ${userDefs.map((user) => user.email).join(", ")}`);
}

await main();
