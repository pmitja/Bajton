export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
};

export type MonthlySpending = {
  month: string;
  label: string;
  amount: number;
};

export type SearchEntry = {
  id: string;
  kind: "expense" | "task" | "contractor" | "phase";
  label: string;
  description: string;
  href: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  location: string;
  currency: string;
  budget: number;
  spent: number;
  committed: number;
  progress: number;
};

export type Task = {
  id: string;
  title: string;
  dueLabel: string;
  priority: "visoka" | "srednja" | "nizka";
  assignee: string;
  completed: boolean;
};

export type Expense = {
  id: string;
  vendor: string;
  category: string;
  categoryKey: "material" | "construction" | "electrical" | "documentation";
  amount: number;
  date: string;
  invoiceDate: string;
  status: string;
  statusKey: "draft" | "received" | "approved" | "partially_paid" | "paid" | "cancelled";
  note: string;
  initials: string;
  attachmentCount: number;
};

export type InvoiceAttachment = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  uploadedBy: string;
};

export type PhaseItem = {
  id: string;
  name: string;
  status: "done" | "active" | "next";
  date: string;
  progress: number;
  completed: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  meta: string;
  initials: string;
};

export type Contractor = {
  id: string;
  name: string;
  trade: string;
  phone: string;
  email: string;
  status: "Aktiven" | "Ponudba";
};

export type Investor = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
};

export type ProjectDocument = {
  id: string;
  name: string;
  type: string;
  status: string;
  updated: string;
  owner: string;
};

export type DashboardData = {
  project: ProjectSummary;
  currentUser: CurrentUser;
  tasks: Task[];
  expenses: Expense[];
  phases: PhaseItem[];
  activity: ActivityItem[];
  monthlySpending: MonthlySpending[];
};
