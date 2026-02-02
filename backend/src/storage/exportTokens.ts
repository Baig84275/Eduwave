import jwt from "jsonwebtoken";
import { getEnv } from "../lib/env";

type ExportTokenPayload = {
  typ: "export";
  kind: "quarterly_summary";
  organisationId: string;
  from: string;
  to: string;
};

export function signQuarterlySummaryToken(options: { organisationId: string; from: string; to: string; userId: string }): string {
  const env = getEnv();
  const payload: ExportTokenPayload = {
    typ: "export",
    kind: "quarterly_summary",
    organisationId: options.organisationId,
    from: options.from,
    to: options.to
  };
  return jwt.sign(payload, env.JWT_SECRET, { subject: options.userId, expiresIn: "10m" });
}

export function verifyQuarterlySummaryToken(token: string): { organisationId: string; from: string; to: string; userId: string } {
  const env = getEnv();
  const decoded = jwt.verify(token, env.JWT_SECRET) as any;
  if (
    !decoded ||
    decoded.typ !== "export" ||
    decoded.kind !== "quarterly_summary" ||
    typeof decoded.organisationId !== "string" ||
    typeof decoded.from !== "string" ||
    typeof decoded.to !== "string" ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("Invalid export token");
  }
  return { organisationId: decoded.organisationId, from: decoded.from, to: decoded.to, userId: decoded.sub };
}

