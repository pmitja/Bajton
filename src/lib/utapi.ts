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

/**
 * Javni URL naložene datoteke. Priloge so javne (zasebne zahtevajo plačljiv
 * UploadThing paket), zato URL sestavimo iz appId-ja v tokenu in ključa datoteke.
 */
export function getFileUrl(fileKey: string) {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) throw new Error("UPLOADTHING_TOKEN ni nastavljen.");

  const { appId } = JSON.parse(Buffer.from(token, "base64").toString()) as { appId: string };
  return `https://${appId}.ufs.sh/f/${fileKey}`;
}
