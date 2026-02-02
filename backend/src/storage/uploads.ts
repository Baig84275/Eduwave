import fs from "node:fs";
import path from "node:path";
import { getEnv } from "../lib/env";
import { signUploadToken } from "./uploadTokens";

export function getUploadsDir(): string {
  const dir = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function toPublicUploadUrl(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/").replaceAll(/^\/+/, "");
  return `${getEnv().UPLOADS_PUBLIC_BASE_URL}/${normalized}`;
}

export function toUploadKey(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : value;
}

export function toSignedUploadUrl(options: { uploadKey: string; userId: string; role: string }): string {
  const base = getEnv().UPLOADS_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const token = signUploadToken({ file: options.uploadKey, userId: options.userId, role: options.role });
  return `${base}/${encodeURIComponent(options.uploadKey)}?t=${encodeURIComponent(token)}`;
}
