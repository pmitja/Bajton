"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { activityEvents, categories, expenses, payments, projectPhases, tasks, vendors } from "@/db/schema";
import { getProjectContext, type ProjectContext } from "@/db/queries";
import { expenseStatusLabels, formatDueLabel, initialsOf, priorityLabels, priorityValues } from "@/lib/format";
import type { Task } from "@/lib/types";

export type ExpenseActionState = {
  success: boolean;
  message: string;
  revision: number;
  errors?: Record<string, string[] | undefined>;
};

const TAX_RATE = 0.22;

const expenseSchema = z.object({
  expenseId: z.string().uuid(),
  vendor: z.string().trim().min(2, "Vnesi dobavitelja."),
  amount: z.string().trim().transform((value) => Number(value.replace(",", "."))).pipe(z.number().positive("Znesek mora biti večji od 0.")),
  invoiceDate: z.iso.date("Izberi veljaven datum."),
  category: z.enum(["material", "construction", "electrical", "documentation"], "Izberi kategorijo."),
  status: z.enum(["received", "approved", "paid"]),
  note: z.string().trim().max(500, "Opomba je predolga.").optional(),
});

const categoryNames = {
  material: "Material",
  construction: "Konstrukcija",
  electrical: "Elektroinštalacije",
  documentation: "Dokumentacija",
} as const;

async function findOrCreateCategory({ db, project }: ProjectContext, name: string) {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.projectId, project.id), eq(categories.name, name), isNull(categories.deletedAt)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(categories).values({ projectId: project.id, name }).returning({ id: categories.id });
  return created.id;
}

async function findOrCreateVendor({ db, project, currentUser }: ProjectContext, name: string) {
  const [existing] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(eq(vendors.projectId, project.id), eq(vendors.name, name), isNull(vendors.deletedAt)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(vendors)
    .values({ projectId: project.id, name, createdBy: currentUser.id })
    .returning({ id: vendors.id });
  return created.id;
}

async function logActivity(
  { db, project, currentUser }: ProjectContext,
  event: {
    entityType: string;
    entityId: string;
    action: typeof activityEvents.$inferInsert.action;
    beforeData?: unknown;
    afterData?: unknown;
  },
) {
  await db.insert(activityEvents).values({
    projectId: project.id,
    actorId: currentUser.id,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    beforeData: event.beforeData ?? null,
    afterData: event.afterData ?? null,
  });
}

function revalidateProject() {
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/tasks");
  revalidatePath("/analytics");
  revalidatePath("/activity");
  revalidatePath("/contractors");
  revalidatePath("/timeline");
}

export async function createExpense(previousState: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Preveri označena polja.",
      revision: previousState.revision,
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { expenseId, vendor, amount, invoiceDate, category, status, note } = parsed.data;
  const context = await getProjectContext();
  const [categoryId, vendorId] = await Promise.all([
    findOrCreateCategory(context, categoryNames[category]),
    findOrCreateVendor(context, vendor),
  ]);

  const net = Number((amount / (1 + TAX_RATE)).toFixed(2));
  const tax = Number((amount - net).toFixed(2));

  await context.db.insert(expenses).values({
    id: expenseId,
    projectId: context.project.id,
    categoryId,
    vendorId,
    title: `${categoryNames[category]} – ${vendor}`,
    invoiceDate,
    netAmount: net.toFixed(2),
    taxAmount: tax.toFixed(2),
    grossAmount: amount.toFixed(2),
    status,
    notes: note || null,
    createdBy: context.currentUser.id,
    updatedBy: context.currentUser.id,
  });

  if (status === "paid") {
    await context.db.insert(payments).values({
      expenseId,
      amount: amount.toFixed(2),
      paidAt: invoiceDate,
      note: "Zabeleženo ob vnosu računa",
      createdBy: context.currentUser.id,
    });
  }

  await logActivity(context, {
    entityType: "expense",
    entityId: expenseId,
    action: status === "paid" ? "paid" : "created",
    afterData: { vendor, amount, status: expenseStatusLabels[status] },
  });

  revalidateProject();
  return { success: true, message: "Strošek je shranjen.", revision: previousState.revision + 1 };
}

const taskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  priority: z.enum(["nizka", "srednja", "visoka"]),
});

export async function createTask(input: { title: string; dueDate: string; priority: Task["priority"] }) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Vnesi veljaven naslov opravila." } as const;

  const context = await getProjectContext();
  const [created] = await context.db
    .insert(tasks)
    .values({
      projectId: context.project.id,
      title: parsed.data.title,
      priority: priorityValues[parsed.data.priority],
      dueDate: parsed.data.dueDate || null,
      assignedTo: context.currentUser.id,
      createdBy: context.currentUser.id,
      updatedBy: context.currentUser.id,
    })
    .returning({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, priority: tasks.priority });

  await logActivity(context, { entityType: "task", entityId: created.id, action: "created", afterData: { title: created.title } });

  revalidateProject();
  return {
    success: true,
    task: {
      id: created.id,
      title: created.title,
      dueLabel: formatDueLabel(created.dueDate),
      priority: priorityLabels[created.priority],
      assignee: initialsOf(context.currentUser.name),
      completed: false,
    } satisfies Task,
  } as const;
}

export async function toggleTask(taskId: string) {
  const parsedId = z.string().uuid().safeParse(taskId);
  if (!parsedId.success) return { success: false, message: "Opravila ni bilo mogoče posodobiti." } as const;

  const context = await getProjectContext();
  const [task] = await context.db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, parsedId.data), eq(tasks.projectId, context.project.id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!task) return { success: false, message: "Opravilo ne obstaja." } as const;

  const completed = task.status !== "done";
  await context.db
    .update(tasks)
    .set({
      status: completed ? "done" : "todo",
      completedBy: completed ? context.currentUser.id : null,
      completedAt: completed ? new Date() : null,
      updatedBy: context.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, task.id));

  await logActivity(context, {
    entityType: "task",
    entityId: task.id,
    action: completed ? "completed" : "updated",
    beforeData: { status: task.status },
    afterData: { title: task.title, status: completed ? "done" : "todo" },
  });

  revalidateProject();
  return { success: true } as const;
}

const phaseSchema = z.object({
  name: z.string().trim().min(2, "Vnesi ime faze.").max(80, "Ime faze je predolgo."),
  startsAt: z.union([z.literal(""), z.iso.date()]),
  endsAt: z.union([z.literal(""), z.iso.date()]),
  progress: z.number().int().min(0).max(100),
  completed: z.boolean(),
});

function checkPhaseRange(input: { startsAt: string; endsAt: string }) {
  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    return "Začetek faze mora biti pred zaključkom.";
  }
  return null;
}

export type PhaseInput = z.input<typeof phaseSchema>;

export async function createPhase(input: PhaseInput) {
  const parsed = phaseSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: z.prettifyError(parsed.error) } as const;

  const rangeError = checkPhaseRange(parsed.data);
  if (rangeError) return { success: false, message: rangeError } as const;

  const context = await getProjectContext();
  const [last] = await context.db
    .select({ sortOrder: projectPhases.sortOrder })
    .from(projectPhases)
    .where(and(eq(projectPhases.projectId, context.project.id), isNull(projectPhases.deletedAt)))
    .orderBy(desc(projectPhases.sortOrder))
    .limit(1);

  const [created] = await context.db
    .insert(projectPhases)
    .values({
      projectId: context.project.id,
      name: parsed.data.name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      progress: parsed.data.completed ? 100 : parsed.data.progress,
      completed: parsed.data.completed,
      startsAt: parsed.data.startsAt || null,
      endsAt: parsed.data.endsAt || null,
      updatedBy: context.currentUser.id,
    })
    .returning({ id: projectPhases.id });

  await logActivity(context, {
    entityType: "phase",
    entityId: created.id,
    action: "created",
    afterData: { name: parsed.data.name, endsAt: parsed.data.endsAt || null },
  });

  revalidateProject();
  return { success: true, message: "Faza je dodana." } as const;
}

export async function updatePhase(phaseId: string, input: PhaseInput) {
  const parsedId = z.string().uuid().safeParse(phaseId);
  const parsed = phaseSchema.safeParse(input);
  if (!parsedId.success) return { success: false, message: "Faze ni bilo mogoče posodobiti." } as const;
  if (!parsed.success) return { success: false, message: z.prettifyError(parsed.error) } as const;

  const rangeError = checkPhaseRange(parsed.data);
  if (rangeError) return { success: false, message: rangeError } as const;

  const context = await getProjectContext();
  const [phase] = await context.db
    .select()
    .from(projectPhases)
    .where(and(eq(projectPhases.id, parsedId.data), eq(projectPhases.projectId, context.project.id), isNull(projectPhases.deletedAt)))
    .limit(1);

  if (!phase) return { success: false, message: "Faza ne obstaja." } as const;

  await context.db
    .update(projectPhases)
    .set({
      name: parsed.data.name,
      progress: parsed.data.completed ? 100 : parsed.data.progress,
      completed: parsed.data.completed,
      startsAt: parsed.data.startsAt || null,
      endsAt: parsed.data.endsAt || null,
      updatedBy: context.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(projectPhases.id, phase.id));

  await logActivity(context, {
    entityType: "phase",
    entityId: phase.id,
    action: "updated",
    beforeData: { name: phase.name, endsAt: phase.endsAt },
    afterData: { name: parsed.data.name, endsAt: parsed.data.endsAt || null },
  });

  revalidateProject();
  return { success: true, message: "Faza je posodobljena." } as const;
}

export async function deletePhase(phaseId: string) {
  const parsedId = z.string().uuid().safeParse(phaseId);
  if (!parsedId.success) return { success: false, message: "Faze ni bilo mogoče odstraniti." } as const;

  const context = await getProjectContext();
  const [phase] = await context.db
    .select({ id: projectPhases.id, name: projectPhases.name })
    .from(projectPhases)
    .where(and(eq(projectPhases.id, parsedId.data), eq(projectPhases.projectId, context.project.id), isNull(projectPhases.deletedAt)))
    .limit(1);

  if (!phase) return { success: false, message: "Faza ne obstaja." } as const;

  await context.db
    .update(projectPhases)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: context.currentUser.id })
    .where(eq(projectPhases.id, phase.id));

  await logActivity(context, { entityType: "phase", entityId: phase.id, action: "deleted", afterData: { name: phase.name } });

  revalidateProject();
  return { success: true, message: "Faza je odstranjena." } as const;
}

export async function deleteTask(taskId: string) {
  const parsedId = z.string().uuid().safeParse(taskId);
  if (!parsedId.success) return { success: false, message: "Opravila ni bilo mogoče odstraniti." } as const;

  const context = await getProjectContext();
  const [task] = await context.db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.id, parsedId.data), eq(tasks.projectId, context.project.id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!task) return { success: false, message: "Opravilo ne obstaja." } as const;

  await context.db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: context.currentUser.id })
    .where(eq(tasks.id, task.id));

  await logActivity(context, { entityType: "task", entityId: task.id, action: "deleted", afterData: { title: task.title } });

  revalidateProject();
  return { success: true } as const;
}
