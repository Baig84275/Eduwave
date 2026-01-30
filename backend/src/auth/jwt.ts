import jwt from "jsonwebtoken";
import { getEnv } from "../lib/env";
import { Role } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  role: Role;
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getEnv().JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getEnv().JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const sub = (decoded as any).sub;
  const role = (decoded as any).role;
  if (typeof sub !== "string" || typeof role !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub, role: role as Role };
}
