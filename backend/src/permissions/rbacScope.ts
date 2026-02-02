import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

// These helpers centralize query scoping decisions so routes can apply consistent filtering
// based on the authenticated user's role and organisation assignment.
export async function getOrganisationScope(user: { id: string; role: Role }): Promise<string | null> {
  if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) return null;
  if (user.role === Role.ORG_ADMIN || user.role === Role.TRAINER_SUPERVISOR) {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { organisationId: true } });
    return u?.organisationId ?? null;
  }
  return null;
}

export function userOrganisationWhere(organisationId: string | null): Prisma.UserWhereInput {
  return organisationId ? { organisationId } : {};
}

