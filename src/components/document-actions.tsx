"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInvoiceAttachment, getInvoiceDownloadUrl } from "@/app/actions";

/** Prenos in brisanje priloge; uporablja iste akcije kot dialog na stroških. */
export function DocumentActions({ attachmentId, name }: { attachmentId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDownload = useCallback(() => {
    startTransition(async () => {
      const result = await getInvoiceDownloadUrl(attachmentId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setError(null);
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }, [attachmentId]);

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      const result = await deleteInvoiceAttachment(attachmentId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setError(null);
      router.refresh();
    });
  }, [attachmentId, router]);

  return (
    <div className="flex items-center gap-1">
      {error ? <span className="mr-2 text-xs text-destructive" role="alert">{error}</span> : null}
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Prenesi ${name}`} disabled={pending} onClick={handleDownload}>
        <Download className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Izbriši ${name}`} disabled={pending} onClick={handleDelete}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
