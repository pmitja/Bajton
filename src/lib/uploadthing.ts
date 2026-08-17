import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

/** Nalaganje je aktivno le z veljavnim UploadThing tokenom v okolju. */
export const uploadEnabled = process.env.NEXT_PUBLIC_UPLOADTHING_ENABLED === "true";

export const uploadDisabledNotice = "Upload se aktivira po nastavitvi svežega UploadThing tokena (NEXT_PUBLIC_UPLOADTHING_ENABLED=true).";

export const dropzoneAppearance = {
  container: "ut-label:text-foreground ut-button:bg-primary min-h-40 border-0 bg-transparent",
  label: "text-sm font-medium",
  allowedContent: "text-xs text-muted-foreground",
} as const;
