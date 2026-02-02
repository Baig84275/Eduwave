import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const directoryRouter = Router();

directoryRouter.use(requireAuth);

const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  q: z.string().min(1).optional(),
  organisationId: z.string().min(1).optional()
});

directoryRouter.get(
  "/users",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = listUsersQuerySchema.parse(req.query);

    let organisationId = query.organisationId ?? undefined;
    if (requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) {
      const u = await prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } });
      organisationId = u?.organisationId ?? undefined;
      if (!organisationId) return res.status(400).json({ error: "User is not assigned to an organisation" });
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(query.role ? { role: query.role } : {}),
        ...(organisationId ? { organisationId } : {}),
        ...(query.q ? { email: { contains: query.q, mode: "insensitive" } } : {})
      },
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true, organisationId: true, createdAt: true }
    });

    res.json({ users });
  })
);
