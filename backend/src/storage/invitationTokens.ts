import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { getEnv } from "../lib/env";

// Signed tokens are used to carry invitation context through email deep links.
// They prevent exposing raw invitation identifiers without proof-of-possession.
type InvitationTokenPayload = {
  typ: "invitation";
  invitationId: string;
  inviteeEmail: string;
  inviteeRole: Role;
};

export function signInvitationToken(options: { invitationId: string; inviteeEmail: string; inviteeRole: Role }): string {
  const env = getEnv();
  const payload: InvitationTokenPayload = {
    typ: "invitation",
    invitationId: options.invitationId,
    inviteeEmail: options.inviteeEmail,
    inviteeRole: options.inviteeRole
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.INVITATION_EXPIRY_DAYS}d` });
}

export function verifyInvitationToken(token: string): InvitationTokenPayload {
  const env = getEnv();
  const decoded = jwt.verify(token, env.JWT_SECRET) as any;
  if (
    !decoded ||
    decoded.typ !== "invitation" ||
    typeof decoded.invitationId !== "string" ||
    typeof decoded.inviteeEmail !== "string" ||
    typeof decoded.inviteeRole !== "string"
  ) {
    throw new Error("Invalid invitation token");
  }
  return decoded as InvitationTokenPayload;
}

