import "server-only";

import { UTApi } from "uploadthing/server";

let cached: UTApi | null = null;

/**
 * UploadThing API klient za podpisane URL-je in brisanje datotek.
 * Instanco ustvarimo lenobno, da manjkajoč token ne razbije buildov,
 * kjer nalaganje ni aktivno.
 */
export function getUtApi() {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error("UPLOADTHING_TOKEN ni nastavljen.");
  }
  cached ??= new UTApi();
  return cached;
}
