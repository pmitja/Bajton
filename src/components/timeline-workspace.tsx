"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { createPhase, deletePhase, updatePhase, type PhaseInput } from "@/app/actions";
import type { PhaseItem } from "@/lib/types";

const statusLabels = { done: "Zaključeno", active: "V teku", next: "Načrtovano" } as const;

const emptyDraft: PhaseInput = { name: "", startsAt: "", endsAt: "", progress: 0, completed: false };

function PhaseFields({ draft, onChange, idPrefix }: { draft: PhaseInput; onChange: (draft: PhaseInput) => void; idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Ime faze</Label>
        <Input id={`${idPrefix}-name`} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="npr. Fasada" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-starts`}>Začetek</Label>
        <Input id={`${idPrefix}-starts`} type="date" value={draft.startsAt} onChange={(event) => onChange({ ...draft, startsAt: event.target.value })} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ends`}>Zaključek</Label>
        <Input id={`${idPrefix}-ends`} type="date" value={draft.endsAt} onChange={(event) => onChange({ ...draft, endsAt: event.target.value })} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-progress`}>Napredek (%)</Label>
        <Input
          id={`${idPrefix}-progress`}
          type="number"
          min={0}
          max={100}
          step={5}
          value={draft.completed ? 100 : draft.progress}
          disabled={draft.completed}
          onChange={(event) => onChange({ ...draft, progress: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
          className="h-11"
        />
      </div>
      <div className="flex items-end gap-3 pb-2">
        <Checkbox id={`${idPrefix}-completed`} checked={draft.completed} onCheckedChange={(checked) => onChange({ ...draft, completed: checked === true })} />
        <Label htmlFor={`${idPrefix}-completed`} className="font-normal">Faza je zaključena</Label>
      </div>
    </div>
  );
}

export function TimelineWorkspace({ phases, projectProgress }: { phases: PhaseItem[]; projectProgress: number }) {
  const [draft, setDraft] = useState<PhaseInput>(emptyDraft);
  const [editing, setEditing] = useState<{ phase: PhaseItem; draft: PhaseInput } | null>(null);
  const [phaseToDelete, setPhaseToDelete] = useState<PhaseItem | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const activeIndex = phases.findIndex((phase) => phase.status === "active");

  function run(action: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage({ text: result.message, ok: result.success });
        if (result.success) {
          onSuccess?.();
          router.refresh();
        }
      } catch {
        setMessage({ text: "Spremembe ni bilo mogoče shraniti. Poskusi znova.", ok: false });
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold">Faze projekta</h2>
          <p className="mt-1 text-sm text-muted-foreground">{phases.length ? `Aktivna je faza ${activeIndex + 1} od ${phases.length}` : "Dodaj prvo fazo gradnje"}</p>
        </div>
        <p className="text-2xl font-bold text-primary">{projectProgress} %</p>
      </div>
      <Progress value={projectProgress} className="mb-8 h-2" />

      <form
        className="mb-6 rounded-xl border border-dashed bg-muted/35 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => createPhase(draft), () => setDraft(emptyDraft));
        }}
      >
        <p className="mb-4 text-sm font-medium">Nova faza</p>
        <PhaseFields draft={draft} onChange={setDraft} idPrefix="new-phase" />
        <div className="mt-4 flex justify-end">
          <Button type="submit" className="h-11 gap-2 px-4" disabled={pending || draft.name.trim().length < 2}>
            <Plus className="size-4" />Dodaj fazo
          </Button>
        </div>
      </form>

      {message ? <p className={`mb-4 text-sm ${message.ok ? "text-emerald-700" : "text-destructive"}`} role="status" aria-live="polite">{message.text}</p> : null}

      {phases.length ? (
        <ol className="relative space-y-0 before:absolute before:bottom-7 before:left-[1.15rem] before:top-7 before:w-px before:bg-border">
          {phases.map((phase, index) => (
            <li key={phase.id} className="relative flex gap-4 py-3">
              <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-4 border-card text-xs font-bold ${phase.status === "done" ? "bg-emerald-600 text-white" : phase.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
              <div className={`flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${phase.status === "active" ? "border-primary/35 bg-accent/35" : "bg-background"}`}>
                <div className="min-w-0">
                  <p className="font-semibold">{phase.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{statusLabels[phase.status]} · {phase.progress} %</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="mr-1 text-sm text-muted-foreground">{phase.date}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Uredi fazo ${phase.name}`}
                    disabled={pending}
                    onClick={() => setEditing({
                      phase,
                      draft: { name: phase.name, startsAt: phase.startsAt ?? "", endsAt: phase.endsAt ?? "", progress: phase.progress, completed: phase.completed },
                    })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={`Odstrani fazo ${phase.name}`} disabled={pending} onClick={() => setPhaseToDelete(phase)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed bg-background p-12 text-center">
          <p className="font-medium">Časovnica je še prazna</p>
          <p className="mt-1 text-sm text-muted-foreground">Dodaj faze gradnje in spremljaj napredek projekta.</p>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi fazo</DialogTitle>
            <DialogDescription>Spremembe napredka takoj vplivajo na skupni napredek projekta.</DialogDescription>
          </DialogHeader>
          {editing ? <PhaseFields draft={editing.draft} onChange={(next) => setEditing({ ...editing, draft: next })} idPrefix="edit-phase" /> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Prekliči</DialogClose>
            <Button
              type="button"
              disabled={pending || !editing || editing.draft.name.trim().length < 2}
              onClick={() => {
                if (!editing) return;
                const { phase, draft: edited } = editing;
                run(() => updatePhase(phase.id, edited), () => setEditing(null));
              }}
            >
              Shrani
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(phaseToDelete)} onOpenChange={(open) => { if (!open) setPhaseToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odstrani fazo?</DialogTitle>
            <DialogDescription>Faza “{phaseToDelete?.name}” bo odstranjena s časovnice projekta.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Prekliči</DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!phaseToDelete) return;
                const phase = phaseToDelete;
                setPhaseToDelete(null);
                run(() => deletePhase(phase.id));
              }}
            >
              Odstrani
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
