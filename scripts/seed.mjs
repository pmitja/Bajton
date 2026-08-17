/**
 * Napolni bazo z izhodiščnimi podatki projekta (prej `src/lib/demo-data.ts`).
 * Zaženi z `pnpm db:seed`. Skripta je idempotentna: obstoječe vrstice posodobi.
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

const PROJECT_ID = "8ee9b9db-4dd7-4be7-a973-b4a31955ae36";
const MITJA_ID = "734d683c-a201-47dd-b813-754e90e4f782";
const JULIJA_ID = "0a2e6a09-1e9f-4a70-8b6f-3a54b1ff5f21";
const DARINKA_ID = "c4f0b6d1-6f2e-4f5a-9a41-2f7c8b0d5e33";

const userDefs = [
  { id: MITJA_ID, key: "mitja", name: "Mitja Pak", email: "mitja@bajton.si" },
  { id: JULIJA_ID, key: "julija", name: "Julija Pak", email: "julija@bajton.si" },
  { id: DARINKA_ID, key: "darinka", name: "Darinka Pak", email: "darinka@bajton.si" },
];
const TAX_RATE = 0.22;

const categoryDefs = [
  { key: "material", name: "Material", color: "#b5653b", budget: 90000, sortOrder: 0 },
  { key: "construction", name: "Konstrukcija", color: "#7c6a58", budget: 150000, sortOrder: 1 },
  { key: "electrical", name: "Elektroinštalacije", color: "#3b6fb5", budget: 45000, sortOrder: 2 },
  { key: "documentation", name: "Dokumentacija", color: "#5b8f6a", budget: 20000, sortOrder: 3 },
];

const vendorDefs = [
  { key: "merkur", name: "Merkur trgovina", trade: "Material", email: "info@merkur.si", phone: "+386 1 555 10 20" },
  { key: "elektro", name: "Elektro Novak", trade: "Elektroinštalacije", email: "info@elektro-novak.si", phone: "+386 41 555 012" },
  { key: "betonarna", name: "Betonarna Ljubljana", trade: "Konstrukcija", email: "narocila@betonarna.si", phone: "+386 1 555 22 10" },
  { key: "arhitektura", name: "Arhitektura K", trade: "Projektiranje", email: "studio@arhitektura-k.si", phone: "+386 31 440 218" },
  { key: "kovac", name: "Gradbeništvo Kovač", trade: "Gradbena dela", email: "info@gradbenistvo-kovac.si", phone: "+386 51 220 118" },
  { key: "okna", name: "Okna Gorenje", trade: "Stavbno pohištvo", email: "prodaja@okna-gorenje.si", phone: "+386 3 555 71 40" },
  { key: "krovstvo", name: "Krovstvo Zajc", trade: "Krovska dela", email: "info@krovstvo-zajc.si", phone: "+386 41 887 330" },
];

/** gross = neto + 22 % DDV; `paid` pomeni, da zabeležimo tudi plačilo v polni višini. */
const expenseDefs = [
  { id: "1f1d6d2a-0001-4a1e-9d21-000000000001", title: "Projektna dokumentacija PGD", vendor: "arhitektura", category: "documentation", gross: 5900, date: "2026-02-10", status: "paid", author: JULIJA_ID },
  { id: "1f1d6d2a-0002-4a1e-9d21-000000000002", title: "Beton za temelje", vendor: "betonarna", category: "construction", gross: 42500, date: "2026-03-18", status: "paid", author: MITJA_ID },
  { id: "1f1d6d2a-0003-4a1e-9d21-000000000003", title: "Izkop in temeljna plošča", vendor: "kovac", category: "construction", gross: 28900, date: "2026-04-02", status: "paid", author: MITJA_ID },
  { id: "1f1d6d2a-0004-4a1e-9d21-000000000004", title: "Armatura in gradbeni material", vendor: "merkur", category: "material", gross: 14250, date: "2026-04-21", status: "paid", author: JULIJA_ID },
  { id: "1f1d6d2a-0005-4a1e-9d21-000000000005", title: "Plošča nad pritličjem", vendor: "betonarna", category: "construction", gross: 21400, date: "2026-05-14", status: "paid", author: MITJA_ID },
  { id: "1f1d6d2a-0006-4a1e-9d21-000000000006", title: "Grobi elektro razvod", vendor: "elektro", category: "electrical", gross: 9800, date: "2026-06-05", status: "paid", author: JULIJA_ID },
  { id: "1f1d6d2a-0007-4a1e-9d21-000000000007", title: "Okna in vhodna vrata", vendor: "okna", category: "material", gross: 24300, date: "2026-07-28", status: "approved", author: MITJA_ID },
  { id: "1f1d6d2a-0008-4a1e-9d21-000000000008", title: "Streha in kritina", vendor: "krovstvo", category: "construction", gross: 11870, date: "2026-08-06", status: "received", author: MITJA_ID },
  { id: "1f1d6d2a-0009-4a1e-9d21-000000000009", title: "Projektni nadzor avgust", vendor: "arhitektura", category: "documentation", gross: 1250, date: "2026-08-04", status: "paid", author: JULIJA_ID },
  { id: "1f1d6d2a-0010-4a1e-9d21-000000000010", title: "Betonski elementi terase", vendor: "betonarna", category: "construction", gross: 8940, date: "2026-08-09", status: "received", author: DARINKA_ID },
  { id: "1f1d6d2a-0011-4a1e-9d21-000000000011", title: "Elektroinštalacije 1. nadstropje", vendor: "elektro", category: "electrical", gross: 6250, date: "2026-08-12", status: "approved", author: JULIJA_ID },
  { id: "1f1d6d2a-0012-4a1e-9d21-000000000012", title: "Zaključni material kopalnica", vendor: "merkur", category: "material", gross: 2840, date: "2026-08-14", status: "paid", author: MITJA_ID },
];

const taskDefs = [
  { id: "2f1d6d2a-0001-4a1e-9d21-000000000001", title: "Potrdi ponudbo za okna", priority: "high", status: "todo", dueOffset: 0, assignedTo: MITJA_ID },
  { id: "2f1d6d2a-0002-4a1e-9d21-000000000002", title: "Pošlji mere električarju", priority: "medium", status: "todo", dueOffset: 1, assignedTo: JULIJA_ID },
  { id: "2f1d6d2a-0003-4a1e-9d21-000000000003", title: "Preveri dobavo strešnikov", priority: "medium", status: "in_progress", dueOffset: 4, assignedTo: DARINKA_ID },
  { id: "2f1d6d2a-0004-4a1e-9d21-000000000004", title: "Plačaj račun za armaturo", priority: "low", status: "done", dueOffset: -3, assignedTo: JULIJA_ID },
];

const phaseDefs = [
  { id: "3f1d6d2a-0001-4a1e-9d21-000000000001", name: "Temelji", sortOrder: 0, progress: 100, completed: true, startsAt: "2026-03-02", endsAt: "2026-06-21" },
  { id: "3f1d6d2a-0002-4a1e-9d21-000000000002", name: "Konstrukcija", sortOrder: 1, progress: 55, completed: false, startsAt: "2026-06-22", endsAt: "2026-08-30" },
  { id: "3f1d6d2a-0003-4a1e-9d21-000000000003", name: "Streha", sortOrder: 2, progress: 8, completed: false, startsAt: "2026-09-02", endsAt: "2026-09-18" },
  { id: "3f1d6d2a-0004-4a1e-9d21-000000000004", name: "Okna", sortOrder: 3, progress: 5, completed: false, startsAt: "2026-10-01", endsAt: "2026-10-31" },
];

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

  await sql`
    insert into projects (id, name, location, currency, total_budget, created_by)
    values (${PROJECT_ID}, 'Hiša Podutik', 'Ljubljana, Slovenija', 'EUR', 350000, ${MITJA_ID})
    on conflict (id) do update set name = excluded.name, location = excluded.location, total_budget = excluded.total_budget, updated_at = now()
  `;

  for (const userId of userDefs.map((user) => user.id)) {
    await sql`insert into project_members (project_id, user_id) values (${PROJECT_ID}, ${userId}) on conflict do nothing`;
  }

  const categoryIds = {};
  for (const category of categoryDefs) {
    const existing = await sql`select id from categories where project_id = ${PROJECT_ID} and name = ${category.name} limit 1`;
    if (existing[0]) {
      await sql`update categories set color = ${category.color}, budget = ${category.budget}, sort_order = ${category.sortOrder}, updated_at = now() where id = ${existing[0].id}`;
      categoryIds[category.key] = existing[0].id;
      continue;
    }
    const [row] = await sql`
      insert into categories (project_id, name, color, budget, sort_order)
      values (${PROJECT_ID}, ${category.name}, ${category.color}, ${category.budget}, ${category.sortOrder})
      returning id
    `;
    categoryIds[category.key] = row.id;
  }

  const vendorIds = {};
  for (const vendor of vendorDefs) {
    const existing = await sql`select id from vendors where project_id = ${PROJECT_ID} and name = ${vendor.name} limit 1`;
    if (existing[0]) {
      await sql`update vendors set email = ${vendor.email}, phone = ${vendor.phone}, notes = ${vendor.trade}, updated_at = now() where id = ${existing[0].id}`;
      vendorIds[vendor.key] = existing[0].id;
      continue;
    }
    const [row] = await sql`
      insert into vendors (project_id, name, email, phone, notes, created_by)
      values (${PROJECT_ID}, ${vendor.name}, ${vendor.email}, ${vendor.phone}, ${vendor.trade}, ${MITJA_ID})
      returning id
    `;
    vendorIds[vendor.key] = row.id;
  }

  for (const expense of expenseDefs) {
    const net = Number((expense.gross / (1 + TAX_RATE)).toFixed(2));
    const tax = Number((expense.gross - net).toFixed(2));
    await sql`
      insert into expenses (id, project_id, category_id, vendor_id, title, invoice_number, invoice_date, due_date, net_amount, tax_amount, gross_amount, status, created_by, updated_by)
      values (${expense.id}, ${PROJECT_ID}, ${categoryIds[expense.category]}, ${vendorIds[expense.vendor]}, ${expense.title},
              ${`RN-${expense.date.replaceAll("-", "")}`}, ${expense.date}, ${expense.date}, ${net}, ${tax}, ${expense.gross},
              ${expense.status}, ${expense.author}, ${expense.author})
      on conflict (id) do update set
        title = excluded.title, category_id = excluded.category_id, vendor_id = excluded.vendor_id,
        invoice_date = excluded.invoice_date, net_amount = excluded.net_amount, tax_amount = excluded.tax_amount,
        gross_amount = excluded.gross_amount, status = excluded.status, updated_at = now()
    `;

    await sql`delete from payments where expense_id = ${expense.id}`;
    if (expense.status === "paid") {
      await sql`
        insert into payments (expense_id, amount, paid_at, note, created_by)
        values (${expense.id}, ${expense.gross}, ${expense.date}, 'Plačano po računu', ${expense.author})
      `;
    }
  }

  for (const task of taskDefs) {
    const completed = task.status === "done";
    await sql`
      insert into tasks (id, project_id, title, status, priority, assigned_to, due_date, created_by, updated_by, completed_by, completed_at)
      values (${task.id}, ${PROJECT_ID}, ${task.title}, ${task.status}, ${task.priority}, ${task.assignedTo},
              current_date + ${task.dueOffset}::int, ${MITJA_ID}, ${MITJA_ID},
              ${completed ? task.assignedTo : null}, ${completed ? new Date().toISOString() : null})
      on conflict (id) do update set
        title = excluded.title, status = excluded.status, priority = excluded.priority,
        assigned_to = excluded.assigned_to, due_date = excluded.due_date, updated_at = now()
    `;
  }

  for (const phase of phaseDefs) {
    await sql`
      insert into project_phases (id, project_id, name, sort_order, progress, starts_at, ends_at, completed, updated_by)
      values (${phase.id}, ${PROJECT_ID}, ${phase.name}, ${phase.sortOrder}, ${phase.progress}, ${phase.startsAt}, ${phase.endsAt}, ${phase.completed}, ${MITJA_ID})
      on conflict (id) do update set
        name = excluded.name, sort_order = excluded.sort_order, progress = excluded.progress,
        starts_at = excluded.starts_at, ends_at = excluded.ends_at, completed = excluded.completed, updated_at = now()
    `;
  }

  await sql`delete from activity_events where project_id = ${PROJECT_ID}`;
  await sql`
    insert into activity_events (project_id, actor_id, entity_type, entity_id, action, before_data, after_data, created_at) values
      (${PROJECT_ID}, ${JULIJA_ID}, 'expense', ${"1f1d6d2a-0011-4a1e-9d21-000000000011"}, 'created', null,
       ${JSON.stringify({ vendor: "Elektro Novak", amount: 6250 })}, now() - interval '28 minutes'),
      (${PROJECT_ID}, ${MITJA_ID}, 'task', ${"2f1d6d2a-0004-4a1e-9d21-000000000004"}, 'completed', null,
       ${JSON.stringify({ title: "Plačaj račun za armaturo" })}, now() - interval '2 hours'),
      (${PROJECT_ID}, ${JULIJA_ID}, 'phase', ${"3f1d6d2a-0003-4a1e-9d21-000000000003"}, 'updated',
       ${JSON.stringify({ name: "Streha", endsAt: "2026-09-12" })},
       ${JSON.stringify({ name: "Streha", endsAt: "2026-09-18" })}, now() - interval '1 day')
  `;

  const [totals] = await sql`
    select
      (select coalesce(sum(gross_amount), 0) from expenses where project_id = ${PROJECT_ID} and deleted_at is null and status <> 'cancelled') as committed,
      (select coalesce(sum(p.amount), 0) from payments p join expenses e on e.id = p.expense_id where e.project_id = ${PROJECT_ID}) as spent,
      (select round(avg(progress)) from project_phases where project_id = ${PROJECT_ID}) as progress
  `;
  console.log(`Seed končan. Dogovorjeno: ${totals.committed} €, plačano: ${totals.spent} €, napredek: ${totals.progress} %`);
  console.log(`Uporabniki: ${userDefs.map((user) => user.email).join(", ")}`);
}

await main();
