import fs from "node:fs";
import path from "node:path";
import { getEnv } from "../lib/env";

export function getUploadsDir(): string {
  const dir = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function toPublicUploadUrl(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/").replaceAll(/^\/+/, "");
  return `${getEnv().UPLOADS_PUBLIC_BASE_URL}/${normalized}`;
}
