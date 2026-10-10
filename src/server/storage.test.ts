import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, deleteUpload, readUpload, saveUpload } from "./storage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const PDF = new TextEncoder().encode("%PDF-1.4\n%âãÏÓ\n");
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "repairdesk-uploads-"));
  process.env.UPLOAD_DIR = dir;
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function file(bytes: Uint8Array, name: string, type: string) {
  return new File([new Uint8Array(bytes).buffer], name, { type });
}

describe("saveUpload", () => {
  it("stores a real image under a random disk name and returns metadata", async () => {
    const saved = await saveUpload(file(PNG, "receipt.png", "image/png"));
    expect(saved.mimeType).toBe("image/png");
    expect(saved.size).toBe(PNG.length);
    expect(saved.fileName).toBe("receipt.png");
    expect(saved.storedName).toMatch(/^[0-9a-f-]{36}\.png$/);
    const bytes = await readUpload(saved.storedName);
    expect(bytes && new Uint8Array(bytes)).toEqual(PNG);
    await deleteUpload(saved.storedName);
    expect(await readUpload(saved.storedName)).toBeNull();
  });

  it("accepts PDF, WEBP and JPEG magic signatures", async () => {
    for (const [bytes, type, ext] of [
      [PDF, "application/pdf", "pdf"],
      [WEBP, "image/webp", "webp"],
      [JPEG, "image/jpeg", "jpg"],
    ] as const) {
      const saved = await saveUpload(file(bytes, `a.${ext}`, type));
      expect(saved.storedName.endsWith("." + ext)).toBe(true);
      await deleteUpload(saved.storedName);
    }
  });

  it("rejects a disallowed mime type", async () => {
    await expect(saveUpload(file(PNG, "notes.txt", "text/plain"))).rejects.toThrow("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF");
  });

  it("rejects bytes that do not match the claimed type", async () => {
    const fake = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(saveUpload(file(fake, "fake.png", "image/png"))).rejects.toThrow("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF");
  });

  it("rejects an empty file", async () => {
    await expect(saveUpload(file(new Uint8Array(0), "empty.png", "image/png"))).rejects.toThrow("ไฟล์ว่าง");
  });

  it("rejects a file larger than 10 MB", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.png", { type: "image/png" });
    await expect(saveUpload(big)).rejects.toThrow("ไฟล์ใหญ่เกิน 10MB");
  });
});

describe("readUpload", () => {
  it("refuses unsafe or unknown disk names", async () => {
    expect(await readUpload("../../etc/passwd")).toBeNull();
    expect(await readUpload("missing.png")).toBeNull();
  });
});
