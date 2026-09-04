"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { activityEvents, categories, contractors, expenseAttachments, expenses, payments, projectPhases, tasks, users, vendors } from "@/db/schema";
import { getProjectContext, type ProjectContext } from "@/db/queries";
import { expenseStatusLabels, formatDueLabel, formatFileSize, formatShortDate, initialsOf, priorityLabels, priorityValues } from "@/lib/format";
import { getFileUrl, getUtApi } from "@/lib/utapi";
import type { InvoiceAttachment, Task } from "@/lib/types";

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
  category: z.string().trim().min(2, "Vnesi kategorijo.").max(60, "Kategorija je predolga.").transform((value) => value.replace(/\s+/g, " ")),
  contractorId: z.union([z.uuid(), z.literal("none")]).transform((value) => value === "none" ? null : value),
  status: z.enum(["received", "approved", "paid"]),
  note: z.string().trim().max(500, "Opomba je predolga.").optional(),
});

async function findOrCreateCategory({ db, project }: ProjectContext, name: string) {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.projectId, project.id), sql`lower(${categories.name}) = lower(${name})`, isNull(categories.deletedAt)))
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

async function resolveContractorId({ db, project }: ProjectContext, contractorId: string | null) {
  if (!contractorId) return null;

  const [contractor] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(and(eq(contractors.id, contractorId), eq(contractors.projectId, project.id), isNull(contractors.deletedAt)))
    .limit(1);
  return contractor?.id;
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

  const { expenseId, vendor, amount, invoiceDate, category, contractorId, status, note } = parsed.data;
  const context = await getProjectContext();
  const [categoryId, vendorId, selectedContractorId] = await Promise.all([
    findOrCreateCategory(context, category),
    findOrCreateVendor(context, vendor),
    resolveContractorId(context, contractorId),
  ]);
  if (contractorId && !selectedContractorId) {
    return { success: false, message: "Izbrani izvajalec ne obstaja.", revision: previousState.revision, errors: { contractorId: ["Izberi veljavnega izvajalca."] } };
  }

  const net = Number((amount / (1 + TAX_RATE)).toFixed(2));
  const tax = Number((amount - net).toFixed(2));

  await context.db.insert(expenses).values({
    id: expenseId,
    projectId: context.project.id,
    categoryId,
    vendorId,
    contractorId: selectedContractorId,
    title: `${category} – ${vendor}`,
    invoiceDate,
    netAmount: net.toFixed(2),
    taxAmount: tax.toFixed(2),
    grossAmount: amount.toFixed(2),
    status,
    notes: note || null,
    createdBy: context.currentUser.id,
    updatedBy: context.currentUser.id,
  });

  // Račune, naložene pred shranjevanjem, zdaj vežemo na strošek.
  const linkedAttachments = await context.db
    .update(expenseAttachments)
    .set({ expenseId, pendingExpenseId: null })
    .where(and(
      eq(expenseAttachments.projectId, context.project.id),
      eq(expenseAttachments.pendingExpenseId, expenseId),
      isNull(expenseAttachments.expenseId),
      isNull(expenseAttachments.deletedAt),
    ))
    .returning({ name: expenseAttachments.originalName });

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

  if (linkedAttachments.length) {
    await logActivity(context, {
      entityType: "expense",
      entityId: expenseId,
      action: "uploaded",
      afterData: { files: linkedAttachments.map((attachment) => attachment.name) },
    });
  }

  revalidateProject();
  return { success: true, message: "Strošek je shranjen.", revision: previousState.revision + 1 };
}

export type ExpenseInput = Omit<z.input<typeof expenseSchema>, "expenseId">;

export async function updateExpense(expenseId: string, input: ExpenseInput) {
  const parsedId = z.string().uuid().safeParse(expenseId);
  const parsed = expenseSchema.omit({ expenseId: true }).safeParse(input);
  if (!parsedId.success) return { success: false, message: "Stroška ni bilo mogoče posodobiti." } as const;
  if (!parsed.success) return { success: false, message: "Preveri vnesene podatke." } as const;

  const context = await getProjectContext();
  const [expense] = await context.db
    .select({
      id: expenses.id,
      title: expenses.title,
      grossAmount: expenses.grossAmount,
      status: expenses.status,
      invoiceDate: expenses.invoiceDate,
    })
    .from(expenses)
    .where(and(eq(expenses.id, parsedId.data), eq(expenses.projectId, context.project.id), isNull(expenses.deletedAt)))
    .limit(1);

  if (!expense) return { success: false, message: "Strošek ne obstaja." } as const;

  const { vendor, amount, invoiceDate, category, contractorId, status, note } = parsed.data;
  const [categoryId, vendorId, selectedContractorId] = await Promise.all([
    findOrCreateCategory(context, category),
    findOrCreateVendor(context, vendor),
    resolveContractorId(context, contractorId),
  ]);
  if (contractorId && !selectedContractorId) return { success: false, message: "Izbrani izvajalec ne obstaja." } as const;
  const net = Number((amount / (1 + TAX_RATE)).toFixed(2));
  const tax = Number((amount - net).toFixed(2));

  await context.db
    .update(expenses)
    .set({
      categoryId,
      vendorId,
      contractorId: selectedContractorId,
      title: `${category} – ${vendor}`,
      invoiceDate,
      netAmount: net.toFixed(2),
      taxAmount: tax.toFixed(2),
      grossAmount: amount.toFixed(2),
      status,
      notes: note || null,
      updatedBy: context.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, expense.id));

  if (status === "paid") {
    await context.db.delete(payments).where(eq(payments.expenseId, expense.id));
    await context.db.insert(payments).values({
      expenseId: expense.id,
      amount: amount.toFixed(2),
      paidAt: invoiceDate,
      note: "Usklajeno ob urejanju stroška",
      createdBy: context.currentUser.id,
    });
  } else if (expense.status === "paid") {
    await context.db.delete(payments).where(eq(payments.expenseId, expense.id));
  }

  await logActivity(context, {
    entityType: "expense",
    entityId: expense.id,
    action: "updated",
    beforeData: { title: expense.title, amount: Number(expense.grossAmount), status: expenseStatusLabels[expense.status], invoiceDate: expense.invoiceDate },
    afterData: { vendor, amount, status: expenseStatusLabels[status], invoiceDate },
  });

  revalidateProject();
  return { success: true, message: "Strošek je posodobljen." } as const;
}

export async function deleteExpense(expenseId: string) {
  const parsedId = z.string().uuid().safeParse(expenseId);
  if (!parsedId.success) return { success: false, message: "Stroška ni bilo mogoče odstraniti." } as const;

  const context = await getProjectContext();
  const [expense] = await context.db
    .select({ id: expenses.id, title: expenses.title, grossAmount: expenses.grossAmount })
    .from(expenses)
    .where(and(eq(expenses.id, parsedId.data), eq(expenses.projectId, context.project.id), isNull(expenses.deletedAt)))
    .limit(1);

  if (!expense) return { success: false, message: "Strošek ne obstaja." } as const;

  await context.db
    .update(expenses)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: context.currentUser.id })
    .where(eq(expenses.id, expense.id));

  await logActivity(context, {
    entityType: "expense",
    entityId: expense.id,
    action: "deleted",
    afterData: { title: expense.title, amount: Number(expense.grossAmount) },
  });

  revalidateProject();
  return { success: true, message: "Strošek je odstranjen." } as const;
}

export type ContractorActionState = {
  success: boolean;
  message: string;
  revision: number;
  errors?: Record<string, string[] | undefined>;
};

const contractorSchema = z.object({
  name: z.string().trim().min(2, "Vnesi ime izvajalca.").max(100, "Ime izvajalca je predolgo."),
  trade: z.string().trim().min(2, "Vnesi stroko.").max(80, "Stroka je predolga."),
  phone: z.string().trim().max(40, "Telefonska številka je predolga."),
  email: z.union([z.literal(""), z.email("Vnesi veljaven e-poštni naslov.")]),
  notes: z.string().trim().max(500, "Opomba je predolga."),
});

export async function createContractor(previousState: ContractorActionState, formData: FormData): Promise<ContractorActionState> {
  const parsed = contractorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Preveri označena polja.",
      revision: previousState.revision,
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const context = await getProjectContext();
  const [existing] = await context.db
    .select({ id: contractors.id })
    .from(contractors)
    .where(and(
      eq(contractors.projectId, context.project.id),
      sql`lower(${contractors.name}) = lower(${parsed.data.name})`,
      isNull(contractors.deletedAt),
    ))
    .limit(1);
  if (existing) {
    return {
      success: false,
      message: "Izvajalec s tem imenom že obstaja.",
      revision: previousState.revision,
      errors: { name: ["Izvajalec s tem imenom že obstaja."] },
    };
  }

  const [created] = await context.db
    .insert(contractors)
    .values({
      projectId: context.project.id,
      name: parsed.data.name,
      trade: parsed.data.trade,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      createdBy: context.currentUser.id,
    })
    .returning({ id: contractors.id, name: contractors.name });

  await logActivity(context, {
    entityType: "contractor",
    entityId: created.id,
    action: "created",
    afterData: { name: created.name },
  });
  revalidateProject();
  return { success: true, message: "Izvajalec je dodan.", revision: previousState.revision + 1 };
}

/**
 * Osveži strani po uspešnem nalaganju računa. Priloga se zapiše v UploadThing
 * webhooku (`onUploadComplete`), ki nima dostopa do sejnega konteksta, zato
 * revalidacijo sproži client, ko je nalaganje končano.
 */
export async function refreshAfterInvoiceUpload() {
  await getProjectContext();
  revalidateProject();
}

/**
 * Priloga, omejena na aktivni projekt. Uporablja se kot skupna avtorizacijska
 * točka za prenos in brisanje — projekt preverimo tu, ne pri klicatelju.
 */
async function findAttachment(context: ProjectContext, attachmentId: string) {
  const [attachment] = await context.db
    .select({
      id: expenseAttachments.id,
      fileKey: expenseAttachments.fileKey,
      originalName: expenseAttachments.originalName,
      expenseId: expenseAttachments.expenseId,
    })
    .from(expenseAttachments)
    .where(and(
      eq(expenseAttachments.id, attachmentId),
      eq(expenseAttachments.projectId, context.project.id),
      isNull(expenseAttachments.deletedAt),
    ))
    .limit(1);
  return attachment ?? null;
}

export async function listInvoiceAttachments(expenseId: string): Promise<InvoiceAttachment[]> {
  const parsedId = z.string().uuid().safeParse(expenseId);
  if (!parsedId.success) return [];

  const context = await getProjectContext();
  const rows = await context.db
    .select({
      id: expenseAttachments.id,
      name: expenseAttachments.originalName,
      fileSize: expenseAttachments.fileSize,
      uploadedAt: expenseAttachments.uploadedAt,
      uploaderName: users.name,
    })
    .from(expenseAttachments)
    .leftJoin(users, eq(expenseAttachments.uploadedBy, users.id))
    .where(and(
      eq(expenseAttachments.projectId, context.project.id),
      eq(expenseAttachments.expenseId, parsedId.data),
      isNull(expenseAttachments.deletedAt),
    ))
    .orderBy(desc(expenseAttachments.uploadedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sizeLabel: formatFileSize(row.fileSize),
    uploadedAt: formatShortDate(row.uploadedAt),
    uploadedBy: initialsOf(row.uploaderName ?? "?"),
  }));
}

/** URL naložene datoteke. Sestavimo ga ob prenosu iz ključa datoteke. */
export async function getInvoiceDownloadUrl(attachmentId: string) {
  const parsedId = z.string().uuid().safeParse(attachmentId);
  if (!parsedId.success) return { success: false, message: "Priloga ne obstaja." } as const;

  const context = await getProjectContext();
  const attachment = await findAttachment(context, parsedId.data);
  if (!attachment) return { success: false, message: "Priloga ne obstaja." } as const;

  try {
    return { success: true, url: getFileUrl(attachment.fileKey), name: attachment.originalName } as const;
  } catch {
    return { success: false, message: "Povezave do datoteke ni bilo mogoče pripraviti." } as const;
  }
}

export async function deleteInvoiceAttachment(attachmentId: string) {
  const parsedId = z.string().uuid().safeParse(attachmentId);
  if (!parsedId.success) return { success: false, message: "Priloge ni bilo mogoče odstraniti." } as const;

  const context = await getProjectContext();
  const attachment = await findAttachment(context, parsedId.data);
  if (!attachment) return { success: false, message: "Priloga ne obstaja." } as const;

  // Najprej datoteka v UploadThing: če to spodleti, zapis pustimo pri miru,
  // da priloga ne izgine iz aplikacije, medtem ko datoteka ostane v hrambi.
  try {
    await getUtApi().deleteFiles([attachment.fileKey]);
  } catch {
    return { success: false, message: "Datoteke ni bilo mogoče izbrisati iz hrambe." } as const;
  }

  await context.db
    .update(expenseAttachments)
    .set({ deletedAt: new Date() })
    .where(eq(expenseAttachments.id, attachment.id));

  if (attachment.expenseId) {
    await logActivity(context, {
      entityType: "expense",
      entityId: attachment.expenseId,
      action: "deleted",
      beforeData: { file: attachment.originalName },
    });
  }

  revalidateProject();
  return { success: true, message: "Račun je odstranjen." } as const;
}

const taskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  priority: z.enum(["nizka", "srednja", "visoka"]),
});

export type TaskInput = z.input<typeof taskSchema>;

export async function createTask(input: TaskInput) {
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
      dueDate: created.dueDate ?? "",
      dueLabel: formatDueLabel(created.dueDate),
      priority: priorityLabels[created.priority],
      assignee: initialsOf(context.currentUser.name),
      completed: false,
    } satisfies Task,
  } as const;
}

export async function updateTask(taskId: string, input: TaskInput) {
  const parsedId = z.string().uuid().safeParse(taskId);
  const parsed = taskSchema.safeParse(input);
  if (!parsedId.success) return { success: false, message: "Opravila ni bilo mogoče posodobiti." } as const;
  if (!parsed.success) return { success: false, message: "Preveri naslov, rok in prioriteto." } as const;

  const context = await getProjectContext();
  const [task] = await context.db
    .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, priority: tasks.priority, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, parsedId.data), eq(tasks.projectId, context.project.id), isNull(tasks.deletedAt)))
    .limit(1);
  if (!task) return { success: false, message: "Opravilo ne obstaja." } as const;

  const dueDate = parsed.data.dueDate || null;
  const priority = priorityValues[parsed.data.priority];
  await context.db
    .update(tasks)
    .set({
      title: parsed.data.title,
      dueDate,
      priority,
      updatedBy: context.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, task.id));

  await logActivity(context, {
    entityType: "task",
    entityId: task.id,
    action: "updated",
    beforeData: { title: task.title, dueDate: task.dueDate, priority: priorityLabels[task.priority] },
    afterData: { title: parsed.data.title, dueDate, priority: parsed.data.priority },
  });

  revalidateProject();
  return {
    success: true,
    task: {
      title: parsed.data.title,
      dueDate: dueDate ?? "",
      dueLabel: formatDueLabel(dueDate, task.status === "done"),
      priority: parsed.data.priority,
    },
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
