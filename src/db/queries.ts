import "server-only";

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { activityEvents, categories, expenseAttachments, expenses, payments, projectMembers, projectPhases, projects, tasks, users, vendors } from "@/db/schema";
import { expenseStatusLabels, formatDueLabel, formatMoney, formatPhaseDate, formatRelativeTime, formatShortDate, initialsOf, priorityLabels, toNumber } from "@/lib/format";
import type { ActivityItem, Contractor, CurrentUser, DashboardData, Expense, Investor, MonthlySpending, PhaseItem, ProjectDocument, ProjectSummary, SearchEntry, Task } from "@/lib/types";

export type ProjectContext = {
  db: ReturnType<typeof getDb>;
  project: typeof projects.$inferSelect;
  currentUser: CurrentUser;
};

/**
 * Aktivni projekt in prijavljeni uporabnik. Brez veljavne seje uporabnika
 * preusmerimo na prijavo; projekt izberemo prek BAJTON_PROJECT_ID ali prvega v bazi.
 */
export async function getProjectContext(): Promise<ProjectContext> {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const projectId = process.env.BAJTON_PROJECT_ID;
  const [project] = await db
    .select()
    .from(projects)
    .where(projectId ? and(eq(projects.id, projectId), isNull(projects.deletedAt)) : isNull(projects.deletedAt))
    .orderBy(asc(projects.createdAt))
    .limit(1);

  if (!project) throw new Error("V bazi ni projekta. Zaženi `pnpm db:seed`.");

  return {
    db,
    project,
    currentUser: {
      ...user,
      role: user.id === project.createdBy ? "Lastnik projekta" : "Investitor",
    },
  };
}

async function getProjectSummary({ db, project }: ProjectContext): Promise<ProjectSummary> {
  const [[committedRow], [spentRow], [progressRow]] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${expenses.grossAmount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.projectId, project.id), isNull(expenses.deletedAt), ne(expenses.status, "cancelled"))),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(expenses, eq(payments.expenseId, expenses.id))
      .where(and(eq(expenses.projectId, project.id), isNull(expenses.deletedAt))),
    db
      .select({ average: sql<string>`coalesce(avg(${projectPhases.progress}), 0)` })
      .from(projectPhases)
      .where(and(eq(projectPhases.projectId, project.id), isNull(projectPhases.deletedAt))),
  ]);

  return {
    id: project.id,
    name: project.name,
    location: project.location ?? "—",
    currency: project.currency,
    budget: toNumber(project.totalBudget),
    spent: toNumber(spentRow?.total),
    committed: toNumber(committedRow?.total),
    progress: Math.round(toNumber(progressRow?.average)),
  };
}

async function getExpenses({ db, project }: ProjectContext): Promise<Expense[]> {
  const rows = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      vendor: vendors.name,
      category: categories.name,
      grossAmount: expenses.grossAmount,
      status: expenses.status,
      invoiceDate: expenses.invoiceDate,
      createdAt: expenses.createdAt,
      authorName: users.name,
      attachmentCount: sql<number>`(select count(*)::int from ${expenseAttachments} a where a.expense_id = ${expenses.id} and a.deleted_at is null)`,
    })
    .from(expenses)
    .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(users, eq(expenses.createdBy, users.id))
    .where(and(eq(expenses.projectId, project.id), isNull(expenses.deletedAt)))
    .orderBy(desc(sql`coalesce(${expenses.invoiceDate}, ${expenses.createdAt}::date)`), desc(expenses.createdAt));

  return rows.map((row) => ({
    id: row.id,
    vendor: row.vendor ?? row.title,
    category: row.category ?? "Nerazporejeno",
    amount: toNumber(row.grossAmount),
    date: formatShortDate(row.invoiceDate ?? row.createdAt),
    status: expenseStatusLabels[row.status],
    initials: initialsOf(row.authorName ?? "?"),
    attachmentCount: row.attachmentCount,
  }));
}

async function getTasks({ db, project }: ProjectContext): Promise<Task[]> {
  const assignee = sql<string>`coalesce(${users.name}, '')`;
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      assigneeName: assignee,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(and(eq(tasks.projectId, project.id), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.status), sql`${tasks.dueDate} asc nulls last`, desc(tasks.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueLabel: formatDueLabel(row.dueDate, row.status === "done"),
    priority: priorityLabels[row.priority],
    assignee: row.assigneeName ? initialsOf(row.assigneeName) : "—",
    completed: row.status === "done",
  }));
}

async function getPhases({ db, project }: ProjectContext): Promise<PhaseItem[]> {
  const rows = await db
    .select()
    .from(projectPhases)
    .where(and(eq(projectPhases.projectId, project.id), isNull(projectPhases.deletedAt)))
    .orderBy(asc(projectPhases.sortOrder));

  const activeIndex = rows.findIndex((row) => !row.completed);
  return rows.map((row, index) => {
    const status: PhaseItem["status"] = row.completed ? "done" : index === activeIndex ? "active" : "next";
    return {
      id: row.id,
      name: row.name,
      status,
      date: formatPhaseDate({ status, startsAt: row.startsAt, endsAt: row.endsAt }),
      progress: row.progress,
      completed: row.completed,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      sortOrder: row.sortOrder,
    };
  });
}

type EventPayload = { vendor?: string; title?: string; name?: string; amount?: number; endsAt?: string } | null;

function describeEvent(entityType: string, action: string, after: EventPayload) {
  const label = after?.vendor ?? after?.title ?? after?.name ?? "";

  if (entityType === "expense" && action === "created") return `je dodal(a) račun ${label}`;
  if (entityType === "expense" && action === "paid") return `je plačal(a) račun ${label}`;
  if (entityType === "expense" && action === "updated") return `je posodobil(a) račun ${label}`;
  if (entityType === "task" && action === "created") return `je dodal(a) opravilo ${label}`;
  if (entityType === "task" && action === "completed") return `je zaključil(a) opravilo ${label}`;
  if (entityType === "task" && action === "deleted") return `je odstranil(a) opravilo ${label}`;
  if (entityType === "phase") return `je spremenil(a) fazo ${label}`;
  if (action === "uploaded") return `je naložil(a) dokument ${label}`;
  return `je posodobil(a) ${label || "projekt"}`;
}

async function getActivity({ db, project }: ProjectContext): Promise<ActivityItem[]> {
  const rows = await db
    .select({
      id: activityEvents.id,
      entityType: activityEvents.entityType,
      action: activityEvents.action,
      beforeData: activityEvents.beforeData,
      afterData: activityEvents.afterData,
      createdAt: activityEvents.createdAt,
      actorName: users.name,
    })
    .from(activityEvents)
    .innerJoin(users, eq(activityEvents.actorId, users.id))
    .where(eq(activityEvents.projectId, project.id))
    .orderBy(desc(activityEvents.createdAt))
    .limit(20);

  return rows.map((row) => {
    const after = row.afterData as EventPayload;
    const before = row.beforeData as EventPayload;
    const parts = [
      after?.amount ? formatMoney(after.amount) : null,
      before?.endsAt && after?.endsAt ? `${formatShortDate(before.endsAt)} → ${formatShortDate(after.endsAt)}` : null,
      formatRelativeTime(row.createdAt),
    ].filter(Boolean);

    return {
      id: row.id,
      actor: row.actorName.split(" ")[0] ?? row.actorName,
      action: describeEvent(row.entityType, row.action, after),
      meta: parts.join(" · "),
      initials: initialsOf(row.actorName),
    };
  });
}

/** Plačila po mesecih za zadnjih 6 mesecev, vključno s praznimi meseci. */
async function getMonthlySpending({ db, project }: ProjectContext): Promise<MonthlySpending[]> {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'YYYY-MM')`,
      total: sql<string>`sum(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(expenses, eq(payments.expenseId, expenses.id))
    .where(
      and(
        eq(expenses.projectId, project.id),
        isNull(expenses.deletedAt),
        gte(payments.paidAt, sql`(date_trunc('month', current_date) - interval '5 months')::date`),
      ),
    )
    .groupBy(sql`date_trunc('month', ${payments.paidAt})`);

  const totals = new Map(rows.map((row) => [row.month, toNumber(row.total)]));
  const monthLabel = new Intl.DateTimeFormat("sl-SI", { month: "short" });
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month,
      label: monthLabel.format(date).replace(".", "").replace(/^./, (letter) => letter.toLocaleUpperCase("sl")),
      amount: totals.get(month) ?? 0,
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const context = await getProjectContext();
  const [project, expenseRows, taskRows, phaseRows, activityRows, monthlySpending] = await Promise.all([
    getProjectSummary(context),
    getExpenses(context),
    getTasks(context),
    getPhases(context),
    getActivity(context),
    getMonthlySpending(context),
  ]);

  return {
    project,
    currentUser: context.currentUser,
    expenses: expenseRows,
    tasks: taskRows,
    phases: phaseRows,
    activity: activityRows,
    monthlySpending,
  };
}

/** Iskalni indeks: stroški, opravila, izvajalci in faze aktivnega projekta. */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const context = await getProjectContext();
  const [expenseRows, taskRows, contractorRows, phaseRows] = await Promise.all([
    getExpenses(context),
    getTasks(context),
    getContractorsFor(context),
    getPhases(context),
  ]);

  return [
    ...expenseRows.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: "expense" as const,
      label: expense.vendor,
      description: `${expense.category} · ${formatMoney(expense.amount)} · ${expense.status}`,
      href: "/expenses",
    })),
    ...taskRows.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      label: task.title,
      description: `${task.dueLabel} · prioriteta ${task.priority}`,
      href: "/tasks",
    })),
    ...contractorRows.map((contractor) => ({
      id: `contractor-${contractor.id}`,
      kind: "contractor" as const,
      label: contractor.name,
      description: `${contractor.trade} · ${contractor.status}`,
      href: "/contractors",
    })),
    ...phaseRows.map((phase) => ({
      id: `phase-${phase.id}`,
      kind: "phase" as const,
      label: phase.name,
      description: `${phase.date} · ${phase.progress} %`,
      href: "/timeline",
    })),
  ];
}

function fileTypeLabel(mimeType: string, name: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return mimeType.replace("image/", "").toUpperCase();
  const extension = name.split(".").pop();
  return extension ? extension.toUpperCase() : "Datoteka";
}

async function getContractorsFor({ db, project }: ProjectContext): Promise<Contractor[]> {
  const rows = await db
    .select({
      id: vendors.id,
      name: vendors.name,
      email: vendors.email,
      phone: vendors.phone,
      notes: vendors.notes,
      expenseCount: sql<number>`count(${expenses.id})::int`,
      trade: sql<string | null>`max(${categories.name})`,
    })
    .from(vendors)
    .leftJoin(expenses, and(eq(expenses.vendorId, vendors.id), isNull(expenses.deletedAt)))
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(and(eq(vendors.projectId, project.id), isNull(vendors.deletedAt)))
    .groupBy(vendors.id)
    .orderBy(desc(sql`count(${expenses.id})`), asc(vendors.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    trade: row.notes ?? row.trade ?? "Izvajalec",
    phone: row.phone ?? "—",
    email: row.email ?? "—",
    status: row.expenseCount > 0 ? "Aktiven" : "Ponudba",
  }));
}

export async function getContractors(): Promise<Contractor[]> {
  return getContractorsFor(await getProjectContext());
}

export async function getDocuments(): Promise<ProjectDocument[]> {
  const { db, project } = await getProjectContext();
  const rows = await db
    .select({
      id: expenseAttachments.id,
      name: expenseAttachments.originalName,
      mimeType: expenseAttachments.mimeType,
      uploadedAt: expenseAttachments.uploadedAt,
      expenseStatus: expenses.status,
      ownerName: users.name,
    })
    .from(expenseAttachments)
    .leftJoin(expenses, and(eq(expenseAttachments.expenseId, expenses.id), isNull(expenses.deletedAt)))
    .innerJoin(users, eq(expenseAttachments.uploadedBy, users.id))
    .where(and(eq(expenseAttachments.projectId, project.id), isNull(expenseAttachments.deletedAt)))
    .orderBy(desc(expenseAttachments.uploadedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: fileTypeLabel(row.mimeType, row.name),
    status: row.expenseStatus === null
      ? "Brez stroška"
      : row.expenseStatus === "paid" || row.expenseStatus === "approved"
        ? "Potrjeno"
        : "V pregledu",
    updated: formatShortDate(row.uploadedAt),
    owner: initialsOf(row.ownerName),
  }));
}

export async function getInvestors(): Promise<Investor[]> {
  const { db, project } = await getProjectContext();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, joinedAt: projectMembers.joinedAt })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, project.id))
    .orderBy(asc(projectMembers.joinedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    initials: initialsOf(row.name),
    role: row.id === project.createdBy ? "Lastnik projekta" : "Investitor",
    email: row.email,
  }));
}
