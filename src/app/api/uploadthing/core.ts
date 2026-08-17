import { and, eq, isNull } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { expenseAttachments, expenses } from "@/db/schema";

const f = createUploadthing();

export const ourFileRouter = {
  invoiceAttachment: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5, acl: "private" },
    image: { maxFileSize: "16MB", maxFileCount: 5, acl: "private" },
  })
    .input(z.object({ expenseId: z.string().uuid(), projectId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const sessionUser = await getSessionUser();
      if (!sessionUser) throw new UploadThingError("Za nalaganje moraš biti prijavljen.");

      const db = getDb();
      const [expense] = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(eq(expenses.id, input.expenseId), eq(expenses.projectId, input.projectId), isNull(expenses.deletedAt)))
        .limit(1);

      // Račun se lahko naloži pred shranjevanjem stroška; takrat priloge še ne moremo vezati.
      return {
        userId: sessionUser.id,
        expenseId: expense ? expense.id : null,
        projectId: input.projectId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Keep file.key: it is required for private signed URLs and deletion.
      if (metadata.expenseId) {
        await getDb()
          .insert(expenseAttachments)
          .values({
            expenseId: metadata.expenseId,
            fileKey: file.key,
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            uploadedBy: metadata.userId,
          })
          .onConflictDoNothing({ target: expenseAttachments.fileKey });
      }

      return {
        fileKey: file.key,
        uploadedBy: metadata.userId,
        expenseId: metadata.expenseId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
