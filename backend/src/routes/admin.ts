import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { hashPassword } from "../auth/password";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole(Role.ADMIN, Role.SUPER_ADMIN));

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.json({ users });
  })
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role)
});

adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = createUserSchema.parse(req.body);
    if (body.role === Role.SUPER_ADMIN && requester.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { email: body.email.toLowerCase(), passwordHash, role: body.role },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.json({ user });
  })
);

const changeRoleSchema = z.object({ role: z.nativeEnum(Role) });

adminRouter.patch(
  "/users/:userId/role",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const body = changeRoleSchema.parse(req.body);
    const userId = req.params.userId;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.json({ user });
  })
);

