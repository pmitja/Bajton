"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task } from "@/lib/types";
import { createTask, deleteTask as deleteTaskAction, toggleTask as toggleTaskAction, updateTask as updateTaskAction } from "@/app/actions";

const priorityStyle = {
  visoka: "border-red-200 bg-red-50 text-red-700",
  srednja: "border-amber-200 bg-amber-50 text-amber-700",
  nizka: "border-stone-200 bg-stone-50 text-stone-600",
};

export function TaskList({ initialTasks, showAllLink = true, full = false }: { initialTasks: Task[]; showAllLink?: boolean; full?: boolean }) {
  const [items, setItems] = useState(initialTasks);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("all");
  // Ključ obrazca; ob uspešnem dodajanju ponastavi izbirnik datuma.
  const [formKey, setFormKey] = useState(0);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const openCount = useMemo(() => items.filter((item) => !item.completed).length, [items]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("sl");
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || item.title.toLocaleLowerCase("sl").includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || (statusFilter === "done" ? item.completed : !item.completed);
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  function toggleTask(id: string) {
    const previous = items;
    setItems((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
    setMessage("");
    startTransition(async () => {
      try {
        const result = await toggleTaskAction(id);
        if (!result.success) {
          setItems(previous);
          setMessage(result.message);
          return;
        }
        router.refresh();
      } catch {
        setItems(previous);
        setMessage("Opravila ni bilo mogoče posodobiti. Poskusi znova.");
      }
    });
  }

  function addTask(input: { title: string; dueDate: string; priority: Task["priority"] }, form: HTMLFormElement) {
    const title = input.title.trim();
    if (!title) return;
    setDraft("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createTask({ ...input, title });
        if (!result.success) {
          setDraft(title);
          setMessage(result.message);
          return;
        }
        setQuery("");
        setStatusFilter("all");
        form.reset();
        setFormKey((current) => current + 1);
        setItems((current) => [result.task, ...current]);
        setMessage("Opravilo je dodano.");
        router.refresh();
      } catch {
        setDraft(title);
        setMessage("Opravila ni bilo mogoče dodati. Poskusi znova.");
      }
    });
  }

  function removeTask() {
    if (!taskToDelete) return;
    const task = taskToDelete;
    const previous = items;
    setTaskToDelete(null);
    setItems((current) => current.filter((item) => item.id !== task.id));
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteTaskAction(task.id);
        if (!result.success) {
          setItems(previous);
          setMessage(result.message);
          return;
        }
        setMessage("Opravilo je odstranjeno.");
        router.refresh();
      } catch {
        setItems(previous);
        setMessage("Opravila ni bilo mogoče odstraniti. Poskusi znova.");
      }
    });
  }

  function editTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskToEdit) return;

    const formData = new FormData(event.currentTarget);
    const input = {
      title: String(formData.get("title") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      priority: String(formData.get("priority") ?? "srednja") as Task["priority"],
    };
    setEditMessage("");
    startTransition(async () => {
      try {
        const result = await updateTaskAction(taskToEdit.id, input);
        if (!result.success) {
          setEditMessage(result.message);
          return;
        }
        setItems((current) => current.map((item) => item.id === taskToEdit.id ? { ...item, ...result.task } : item));
        setTaskToEdit(null);
        setMessage("Opravilo je posodobljeno.");
        router.refresh();
      } catch {
        setEditMessage("Opravila ni bilo mogoče posodobiti. Poskusi znova.");
      }
    });
  }

  return (
    <section className="rounded-2xl border bg-card shadow-sm" aria-labelledby="tasks-title">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 id="tasks-title" className="font-semibold tracking-tight">Opravila</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{openCount} odprta · vsi investitorji</p>
        </div>
        {showAllLink ? <Button render={<Link href="/tasks" />} nativeButton={false} variant="ghost" size="sm" className="text-primary">Prikaži vsa</Button> : null}
      </div>
      {full ? <div className="grid gap-3 border-b p-4 sm:grid-cols-2"><div className="relative"><Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Išči opravila …" aria-label="Išči opravila" className="h-11 bg-background pl-10" /></div><ToggleGroup aria-label="Filter opravil" spacing={0} value={[statusFilter]} onValueChange={(next) => setStatusFilter((current) => (next[0] as "all" | "open" | "done" | undefined) ?? current)} className="w-full bg-muted p-1">{[{ value: "all", label: "Vsa" }, { value: "open", label: "Odprta" }, { value: "done", label: "Končana" }].map((filter) => <ToggleGroupItem key={filter.value} value={filter.value} size="lg" className="flex-1 px-3 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm">{filter.label}</ToggleGroupItem>)}</ToggleGroup></div> : null}
      {full ? <div className="grid grid-cols-2 gap-3 border-b p-4"><div className="flex items-center gap-3 rounded-xl bg-muted/45 p-4"><CircleDashed className="size-5 text-primary" /><div><p className="text-xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">Odprta</p></div></div><div className="flex items-center gap-3 rounded-xl bg-muted/45 p-4"><CheckCircle2 className="size-5 text-emerald-600" /><div><p className="text-xl font-bold">{items.length - openCount}</p><p className="text-xs text-muted-foreground">Končana</p></div></div></div> : null}
      <form className={`border-b p-4 ${full ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.5rem_9rem_auto]" : "flex gap-2"}`} onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); addTask({ title: String(formData.get("title") ?? ""), dueDate: String(formData.get("dueDate") ?? ""), priority: (formData.get("priority") ?? "srednja") as Task["priority"] }, event.currentTarget); }}>
        <Input
          name="title"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Hitro dodaj opravilo …"
          aria-label="Novo opravilo"
          className="h-11 bg-background"
          disabled={pending}
        />
        {full ? <><div><DatePicker key={formKey} id="task-due-date" name="dueDate" placeholder="Rok opravila" aria-label="Rok opravila" className="h-11 bg-background" disabled={pending} /></div><div><Select name="priority" defaultValue="srednja" disabled={pending} itemToStringLabel={(value) => ({ nizka: "Nizka", srednja: "Srednja", visoka: "Visoka" })[value] ?? value}><SelectTrigger id="task-priority" aria-label="Prioriteta" className="h-11 w-full bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nizka">Nizka</SelectItem><SelectItem value="srednja">Srednja</SelectItem><SelectItem value="visoka">Visoka</SelectItem></SelectContent></Select></div></> : null}
        <Button type="submit" size={full ? "lg" : "icon"} className={full ? "h-11 shrink-0 px-4" : "size-11 shrink-0"} aria-label="Dodaj opravilo" disabled={pending || draft.trim().length < 2}>
          <Plus className="size-4" />{full ? <span>Dodaj</span> : null}
        </Button>
      </form>
      {message ? <p className={`border-b px-5 py-2 text-sm ${["Opravilo je dodano.", "Opravilo je posodobljeno.", "Opravilo je odstranjeno."].includes(message) ? "text-emerald-700" : "text-destructive"}`} role="status" aria-live="polite">{message}</p> : null}
      <div className="divide-y">
        {visibleItems.map((task) => (
          <div key={task.id} className="group flex min-h-17 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/45">
            <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} aria-label={`Označi ${task.title} kot opravljeno`} disabled={pending} />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{task.dueLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1"><UserRound className="size-3" />{task.assignee}</span>
              </div>
            </div>
            <Badge variant="outline" className={priorityStyle[task.priority]}>{task.priority}</Badge>
            {full ? <div className="flex items-center"><Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => { setEditMessage(""); setTaskToEdit(task); }} aria-label={`Uredi opravilo ${task.title}`} disabled={pending}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setTaskToDelete(task)} aria-label={`Odstrani opravilo ${task.title}`} disabled={pending}><Trash2 className="size-4" /></Button></div> : null}
          </div>
        ))}
        {visibleItems.length === 0 ? <div className="p-10 text-center"><p className="font-medium">Ni najdenih opravil</p><p className="mt-1 text-sm text-muted-foreground">Spremeni iskanje ali izbrani filter.</p></div> : null}
      </div>
      <Dialog open={Boolean(taskToEdit)} onOpenChange={(open) => { if (!open && !pending) setTaskToEdit(null); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={editTask}>
            <DialogHeader><DialogTitle>Uredi opravilo</DialogTitle><DialogDescription>Spremeni naslov, rok ali prioriteto opravila.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><label htmlFor="edit-task-title" className="text-sm font-medium">Naslov</label><Input id="edit-task-title" name="title" defaultValue={taskToEdit?.title} minLength={2} maxLength={160} required disabled={pending} /></div>
              <div className="space-y-2"><label htmlFor="edit-task-due-date" className="text-sm font-medium">Rok</label><DatePicker key={taskToEdit?.id} id="edit-task-due-date" name="dueDate" defaultValue={taskToEdit?.dueDate} placeholder="Brez roka" disabled={pending} /></div>
              <div className="space-y-2"><label htmlFor="edit-task-priority" className="text-sm font-medium">Prioriteta</label><Select key={taskToEdit?.id} name="priority" defaultValue={taskToEdit?.priority ?? "srednja"} disabled={pending} itemToStringLabel={(value) => ({ nizka: "Nizka", srednja: "Srednja", visoka: "Visoka" })[value] ?? value}><SelectTrigger id="edit-task-priority" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nizka">Nizka</SelectItem><SelectItem value="srednja">Srednja</SelectItem><SelectItem value="visoka">Visoka</SelectItem></SelectContent></Select></div>
            </div>
            {editMessage ? <p className="mb-4 text-sm text-destructive" role="alert">{editMessage}</p> : null}
            <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Prekliči</DialogClose><Button type="submit" disabled={pending}>{pending ? "Shranjujem …" : "Shrani spremembe"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(taskToDelete)} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Odstrani opravilo?</DialogTitle><DialogDescription>Opravilo “{taskToDelete?.title}” bo trajno odstranjeno s projekta.</DialogDescription></DialogHeader>
          <DialogFooter><DialogClose render={<Button variant="outline" />}>Prekliči</DialogClose><Button type="button" variant="destructive" onClick={removeTask} disabled={pending}>Odstrani</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
