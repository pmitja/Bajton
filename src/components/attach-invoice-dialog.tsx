"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { UploadDropzone, dropzoneAppearance, uploadDisabledNotice, uploadEnabled } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteInvoiceAttachment, getInvoiceDownloadUrl, listInvoiceAttachments, refreshAfterInvoiceUpload } from "@/app/actions";
import type { InvoiceAttachment } from "@/lib/types";

type AttachInvoiceDialogProps = {
  expenseId: string;
  projectId: string;
  vendor: string;
  attachmentCount: number;
};

export function AttachInvoiceDialog({ expenseId, projectId, vendor, attachmentCount }: AttachInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setAttachments(await listInvoiceAttachments(expenseId));
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  // Seznam naložimo šele ob odprtju, da tabela stroškov ne dela N poizvedb.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) return;
    setError(null);
    void reload();
  }, [reload]);

  const handleUploadComplete = useCallback(async () => {
    setError(null);
    await refreshAfterInvoiceUpload();
    await reload();
    router.refresh();
  }, [reload, router]);

  const handleDownload = useCallback((attachmentId: string) => {
    setBusyId(attachmentId);
    startTransition(async () => {
      const result = await getInvoiceDownloadUrl(attachmentId);
      setBusyId(null);
      if (!result.success) {
        setError(result.message);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }, []);

  const handleDelete = useCallback((attachmentId: string) => {
    setBusyId(attachmentId);
    startTransition(async () => {
      const result = await deleteInvoiceAttachment(attachmentId);
      setBusyId(null);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setError(null);
      await reload();
      router.refresh();
    });
  }, [reload, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            aria-label={attachmentCount ? `Računi za ${vendor} (${attachmentCount})` : `Dodaj račun za ${vendor}`}
          />
        }
      >
        <Paperclip className="size-4" />
        {attachmentCount ? <span className="text-xs font-medium tabular-nums">{attachmentCount}</span> : <span className="text-xs">Dodaj račun</span>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Računi</DialogTitle>
          <DialogDescription>{vendor}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Nalagam …</p>
        ) : attachments.length ? (
          <ul className="divide-y rounded-xl border">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">{attachment.sizeLabel} · {attachment.uploadedAt} · {attachment.uploadedBy}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={`Prenesi ${attachment.name}`}
                  disabled={pending && busyId === attachment.id}
                  onClick={() => handleDownload(attachment.id)}
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Izbriši ${attachment.name}`}
                  disabled={pending && busyId === attachment.id}
                  onClick={() => handleDelete(attachment.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">Za ta strošek še ni priloženega računa.</p>
        )}

        <div className="rounded-xl border border-dashed bg-muted/35 p-3">
          {uploadEnabled ? (
            <UploadDropzone
              endpoint="invoiceAttachment"
              input={{ expenseId, projectId }}
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(uploadError) => setError(uploadError.message)}
              appearance={dropzoneAppearance}
            />
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <span className="mb-3 grid size-11 place-items-center rounded-full bg-background shadow-sm"><UploadCloud className="size-5 text-primary" /></span>
              <p className="text-sm font-medium">Povleci račun sem ali izberi datoteko</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG ali HEIC · največ 16 MB</p>
              <p className="mt-3 text-xs text-amber-700">{uploadDisabledNotice}</p>
            </div>
          )}
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
