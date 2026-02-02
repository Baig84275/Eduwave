import jwt from "jsonwebtoken";
import { getEnv } from "../lib/env";

type UploadTokenPayload = {
  typ: "upload";
  file: string;
  role: string;
};

export function signUploadToken(options: { file: string; userId: string; role: string }): string {
  const env = getEnv();
  const payload: UploadTokenPayload = { typ: "upload", file: options.file, role: options.role };
  return jwt.sign(payload, env.JWT_SECRET, { subject: options.userId, expiresIn: "10m" });
}

export function verifyUploadToken(options: { token: string; file: string }): { userId: string; role: string } {
  const env = getEnv();
  const decoded = jwt.verify(options.token, env.JWT_SECRET) as any;
  if (!decoded || decoded.typ !== "upload" || decoded.file !== options.file || typeof decoded.sub !== "string") {
    throw new Error("Invalid upload token");
  }
  return { userId: decoded.sub, role: typeof decoded.role === "string" ? decoded.role : "UNKNOWN" };
}

