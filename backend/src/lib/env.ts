import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY_BASE64: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  UPLOADS_PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000/uploads"),
  INVITATION_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  MOBILE_INVITE_DEEP_LINK_BASE: z.string().min(1).default("eduwave://invite"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional()
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

let cachedEncryptionKey: Buffer | null = null;

export function getEncryptionKeyBytes(): Buffer {
  if (!cachedEncryptionKey) {
    const env = getEnv();
    const raw = Buffer.from(env.ENCRYPTION_KEY_BASE64, "base64");
    if (raw.length !== 32) {
      throw new Error("ENCRYPTION_KEY_BASE64 must be 32 bytes when base64-decoded");
    }
    cachedEncryptionKey = raw;
  }
  return cachedEncryptionKey;
}
