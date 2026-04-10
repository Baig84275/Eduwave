import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * For TRAINER_SUPERVISOR and ORG_ADMIN, asserts that the target facilitator
 * belongs to the same organisation as the requester.
 *
 * ADMIN and SUPER_ADMIN are not restricted by org scope and pass through.
 * Throws a 403 or 404 error (with `.status` set) on failure.
 */
export async function assertFacilitatorOrgScope(
  requester: { id: string; role: Role },
  facilitatorId: string
): Promise<void> {
  if (
    requester.role !== Role.TRAINER_SUPERVISOR &&
    requester.role !== Role.ORG_ADMIN
  ) {
    return;
  }

  const [reqUser, facUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } }),
    prisma.user.findUnique({ where: { id: facilitatorId }, select: { organisationId: true, role: true } }),
  ]);

  if (!facUser || facUser.role !== Role.FACILITATOR) {
    const err: any = new Error("Not found");
    err.status = 404;
    throw err;
  }

  if (!reqUser?.organisationId || reqUser.organisationId !== facUser.organisationId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}
