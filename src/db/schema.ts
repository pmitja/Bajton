import { boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const expenseStatus = pgEnum("expense_status", ["draft", "received", "approved", "partially_paid", "paid", "cancelled"]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);
export const activityAction = pgEnum("activity_action", ["created", "updated", "completed", "deleted", "uploaded", "paid"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  ...auditColumns,
}, (table) => [uniqueIndex("users_email_idx").on(table.email)]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  currency: text("currency").default("EUR").notNull(),
  totalBudget: numeric("total_budget", { precision: 14, scale: 2 }).default("0").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  ...auditColumns,
});

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.userId] })]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  color: text("color").default("#b5653b").notNull(),
  budget: numeric("budget", { precision: 14, scale: 2 }).default("0").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...auditColumns,
}, (table) => [index("categories_project_idx").on(table.projectId)]);

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  taxNumber: text("tax_number"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  ...auditColumns,
}, (table) => [index("vendors_project_idx").on(table.projectId)]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  title: text("title").notNull(),
  invoiceNumber: text("invoice_number"),
  invoiceDate: date("invoice_date"),
  dueDate: date("due_date"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull(),
  status: expenseStatus("status").default("received").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  ...auditColumns,
}, (table) => [index("expenses_project_date_idx").on(table.projectId, table.invoiceDate), index("expenses_project_status_idx").on(table.projectId, table.status)]);

export const expenseAttachments = pgTable("expense_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }).notNull(),
  fileKey: text("file_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paidAt: date("paid_at").notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").default("todo").notNull(),
  priority: taskPriority("priority").default("medium").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  dueDate: date("due_date"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  completedBy: uuid("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...auditColumns,
}, (table) => [index("tasks_project_status_due_idx").on(table.projectId, table.status, table.dueDate)]);

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  actorId: uuid("actor_id").references(() => users.id).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: activityAction("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("activity_project_created_idx").on(table.projectId, table.createdAt), index("activity_entity_idx").on(table.entityType, table.entityId)]);

export const projectPhases = pgTable("project_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  progress: integer("progress").default(0).notNull(),
  startsAt: date("starts_at"),
  endsAt: date("ends_at"),
  completed: boolean("completed").default(false).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  ...auditColumns,
}, (table) => [index("phases_project_order_idx").on(table.projectId, table.sortOrder)]);
