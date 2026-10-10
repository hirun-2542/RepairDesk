import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "./errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const SAFE_STORED_NAME = /^[A-Za-z0-9-]+\.(jpg|png|webp|pdf)$/;

/** Rejects content that only claims a mime type; the bytes must actually be that format. */
function matchesSignature(mime: string, bytes: Uint8Array): boolean {
  switch (mime) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": {
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return bytes.length >= sig.length && sig.every((byte, index) => bytes[index] === byte);
    }
    case "image/webp":
      return (
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
    case "application/pdf":
      return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
    default:
      return false;
  }
}

export type SavedUpload = { storedName: string; mimeType: string; size: number; fileName: string };

/** Validates a browser File, stores it under a random disk name, and returns its metadata. */
export async function saveUpload(file: File): Promise<SavedUpload> {
  const mimeType = (file.type || "").toLowerCase();
  const extension = ALLOWED[mimeType];
  if (!extension) throw new DomainError("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF");
  if (file.size <= 0) throw new DomainError("ไฟล์ว่าง ไม่สามารถอัปโหลดได้");
  if (file.size > MAX_UPLOAD_BYTES) throw new DomainError("ไฟล์ใหญ่เกิน 10MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) throw new DomainError("ไฟล์ว่าง ไม่สามารถอัปโหลดได้");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new DomainError("ไฟล์ใหญ่เกิน 10MB");
  if (!matchesSignature(mimeType, bytes)) throw new DomainError("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF");
  const storedName = randomUUID() + extension;
  const directory = process.env.UPLOAD_DIR ?? "./uploads";
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedName), bytes);
  return { storedName, mimeType, size: bytes.length, fileName: file.name };
}

/** Reads stored bytes by disk name. Returns null for missing files or unsafe names. */
export async function readUpload(storedName: string): Promise<Buffer | null> {
  if (!SAFE_STORED_NAME.test(storedName)) return null;
  try {
    return await readFile(path.join(process.env.UPLOAD_DIR ?? "./uploads", storedName));
  } catch {
    return null;
  }
}

/** Best-effort removal used to roll back a save when the database write fails. */
export async function deleteUpload(storedName: string): Promise<void> {
  if (!SAFE_STORED_NAME.test(storedName)) return;
  try {
    await unlink(path.join(process.env.UPLOAD_DIR ?? "./uploads", storedName));
  } catch {
    /* already gone */
  }
}
