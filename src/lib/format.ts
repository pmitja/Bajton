import type { PhaseItem, Task } from "@/lib/types";

const shortDate = new Intl.DateTimeFormat("sl-SI", { day: "numeric", month: "short" });
const monthOnly = new Intl.DateTimeFormat("sl-SI", { month: "long" });
const relative = new Intl.RelativeTimeFormat("sl", { numeric: "auto" });
const euro = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const expenseStatusLabels = {
  draft: "Osnutek",
  received: "Prejeto",
  approved: "Odobreno",
  partially_paid: "Delno plačano",
  paid: "Plačano",
  cancelled: "Preklicano",
} as const;

export const priorityLabels = { low: "nizka", medium: "srednja", high: "visoka" } as const;
export const priorityValues = { nizka: "low", srednja: "medium", visoka: "high" } as const;

export function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(`${value}T12:00:00`);
}

export function toNumber(value: string | number | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function formatMoney(amount: number) {
  return euro.format(amount);
}

export function formatShortDate(value: Date | string | null | undefined) {
  const date = toDate(value);
  return date ? shortDate.format(date) : "—";
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("sl") ?? "")
    .join("") || "?";
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDueLabel(dueDate: Date | string | null | undefined, completed = false) {
  if (completed) return "Opravljeno";
  const due = toDate(dueDate);
  if (!due) return "Brez roka";

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (dayKey(due) === dayKey(today)) return "Danes";
  if (dayKey(due) === dayKey(tomorrow)) return "Jutri";
  return shortDate.format(due);
}

export function formatRelativeTime(value: Date | string) {
  const date = toDate(value);
  if (!date) return "—";

  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const absolute = Math.abs(diffMinutes);
  if (absolute < 60) return relative.format(diffMinutes, "minute");
  if (absolute < 60 * 24) return relative.format(Math.round(diffMinutes / 60), "hour");
  if (absolute < 60 * 24 * 30) return relative.format(Math.round(diffMinutes / (60 * 24)), "day");
  return shortDate.format(date);
}

export function formatPhaseDate(phase: { status: PhaseItem["status"]; startsAt: Date | string | null; endsAt: Date | string | null }) {
  const starts = toDate(phase.startsAt);
  const ends = toDate(phase.endsAt);

  if (phase.status === "done") return ends ? `Končano ${shortDate.format(ends)}` : "Zaključeno";
  if (phase.status === "active") return ends ? `Do ${shortDate.format(ends)}` : "V teku";
  if (!starts && !ends) return "Načrtovano";
  if (starts && ends && starts.getMonth() === ends.getMonth()) return `${starts.getDate()}.–${shortDate.format(ends)}`;
  if (starts && ends) return `${shortDate.format(starts)} – ${shortDate.format(ends)}`;
  const single = starts ?? ends;
  return single ? monthOnly.format(single).replace(/^./, (letter) => letter.toLocaleUpperCase("sl")) : "Načrtovano";
}

export function taskPriorityLabel(priority: keyof typeof priorityLabels): Task["priority"] {
  return priorityLabels[priority];
}
