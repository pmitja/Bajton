import { and, eq, isNull } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { activityEvents, expenseAttachments, expenses, projectMembers } from "@/db/schema";

const f = createUploadthing();

export const ourFileRouter = {
  invoiceAttachment: f({
    // Brez `acl: "private"`: zasebne datoteke zahtevajo plačljiv UploadThing paket,
    // brezplačni pa nalaganje zavrne z "Private files are not allowed for free apps".
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .input(z.object({ expenseId: z.string().uuid(), projectId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const sessionUser = await getSessionUser();
      if (!sessionUser) throw new UploadThingError("Za nalaganje moraš biti prijavljen.");

      const db = getDb();
      const [membership] = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, sessionUser.id)))
        .limit(1);
      if (!membership) throw new UploadThingError("Do tega projekta nimaš dostopa.");

      const [expense] = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(eq(expenses.id, input.expenseId), eq(expenses.projectId, input.projectId), isNull(expenses.deletedAt)))
        .limit(1);

      // Račun se lahko naloži pred shranjevanjem stroška. Takrat expense še ne
      // obstaja; prilogo shranimo kot čakajočo in jo `createExpense` poveže po
      // istem UUID-ju. Če expense obstaja, gre za naknadno dodan račun.
      return {
        userId: sessionUser.id,
        projectId: input.projectId,
        expenseId: expense?.id ?? null,
        pendingExpenseId: expense ? null : input.expenseId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Keep file.key: it is required for building the file URL and for deletion.
      const db = getDb();
      const [inserted] = await db
        .insert(expenseAttachments)
        .values({
          projectId: metadata.projectId,
          expenseId: metadata.expenseId,
          pendingExpenseId: metadata.pendingExpenseId,
          fileKey: file.key,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          uploadedBy: metadata.userId,
        })
        .onConflictDoNothing({ target: expenseAttachments.fileKey })
        .returning({ id: expenseAttachments.id });

      // Naknadno dodan račun zabeležimo takoj; priloge pred shranjevanjem
      // stroška zabeleži `createExpense`, ko jih poveže.
      if (inserted && metadata.expenseId) {
        await db.insert(activityEvents).values({
          projectId: metadata.projectId,
          actorId: metadata.userId,
          entityType: "expense",
          entityId: metadata.expenseId,
          action: "uploaded",
          afterData: { file: file.name },
        });
      }

      return {
        fileKey: file.key,
        uploadedBy: metadata.userId,
        expenseId: metadata.expenseId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
