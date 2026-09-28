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
  /** Preostanek po virih z omejitvijo; stroški iz virov brez omejitve ga ne zmanjšujejo. */
  available: number;
  progress: number;
};

export type FundingSourceKind = "loan" | "capital" | "own";

export type FundingSource = {
  id: string;
  name: string;
  kind: FundingSourceKind;
  kindLabel: string;
  /** NULL pomeni vir brez zgornje meje. */
  amount: number | null;
  committed: number;
  spent: number;
  remaining: number | null;
  expenseCount: number;
  /** Razčlenitev po osebah, ki so plačale iz tega vira (samo lastna sredstva). */
  payers: { name: string; committed: number }[];
};

export type FundingSourceOption = Pick<FundingSource, "id" | "name" | "kind">;

export type MemberOption = { id: string; name: string };

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  dueLabel: string;
  priority: "visoka" | "srednja" | "nizka";
  assignee: string;
  completed: boolean;
};

export type Expense = {
  id: string;
  vendor: string;
  contractorId: string | null;
  contractor: string | null;
  fundingSourceId: string | null;
  fundingSource: string | null;
  paidById: string | null;
  paidBy: string | null;
  category: string;
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

export type ContractorOption = Pick<Contractor, "id" | "name" | "trade">;

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
  contractorOptions: ContractorOption[];
  fundingSources: FundingSource[];
  memberOptions: MemberOption[];
  phases: PhaseItem[];
  activity: ActivityItem[];
  monthlySpending: MonthlySpending[];
};
