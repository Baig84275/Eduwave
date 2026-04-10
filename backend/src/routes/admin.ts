import { Router } from "express";
import { AdminPermission, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole, requireSuperAdmin } from "../middleware/rbac";
import { hashPassword } from "../auth/password";
import { writeAuditEvent } from "../audit/audit";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole(Role.ADMIN, Role.SUPER_ADMIN));

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = z
      .object({ includeDeleted: z.string().optional().transform((v) => v === "true") })
      .parse(req.query);
    const users = await prisma.user.findMany({
      where: query.includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, organisationId: true, deletedAt: true, createdAt: true }
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
      select: { id: true, email: true, role: true, organisationId: true, createdAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.user.create",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, role: user.role }
    });
    res.json({ user });
  })
);

const changeRoleSchema = z.object({ role: z.nativeEnum(Role) });

adminRouter.patch(
  "/users/:userId/role",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = changeRoleSchema.parse(req.body);
    const userId = req.params.userId;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
      select: { id: true, email: true, role: true, organisationId: true, createdAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.user.role_change",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role }
    });
    res.json({ user });
  })
);

const createOrganisationSchema = z.object({
  name: z.string().min(1),
  province: z.string().min(1).optional().nullable(),
  city: z.string().min(1).optional().nullable()
});

adminRouter.get(
  "/organisations",
  asyncHandler(async (_req, res) => {
    const organisations = await prisma.organisation.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, province: true, city: true, createdAt: true }
    });
    res.json({ organisations });
  })
);

adminRouter.post(
  "/organisations",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = createOrganisationSchema.parse(req.body);
    const organisation = await prisma.organisation.create({
      data: { name: body.name, province: body.province ?? null, city: body.city ?? null },
      select: { id: true, name: true, province: true, city: true, createdAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.organisation.create",
      entityType: "Organisation",
      entityId: organisation.id,
      metadata: { name: organisation.name }
    });
    res.json({ organisation });
  })
);

const setOrganisationSchema = z.object({ organisationId: z.string().min(1).nullable() });

adminRouter.patch(
  "/users/:userId/organisation",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const userId = req.params.userId;
    const body = setOrganisationSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { organisationId: body.organisationId },
      select: { id: true, email: true, role: true, organisationId: true, createdAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.user.organisation_set",
      entityType: "User",
      entityId: user.id,
      metadata: { organisationId: user.organisationId }
    });
    res.json({ user });
  })
);

const permissionSchema = z.object({
  userId: z.string().min(1),
  permission: z.nativeEnum(AdminPermission)
});

adminRouter.get(
  "/users/:userId/permissions",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const perms = await prisma.userPermission.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
      select: { permission: true, grantedAt: true, grantedById: true }
    });
    res.json({ permissions: perms });
  })
);

adminRouter.post(
  "/permissions/grant",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = permissionSchema.parse(req.body);
    if (body.userId === requester.id) {
      return res.status(400).json({ error: "Cannot grant permissions to self" });
    }

    const perm = await prisma.userPermission.upsert({
      where: { userId_permission: { userId: body.userId, permission: body.permission } },
      create: { userId: body.userId, permission: body.permission, grantedById: requester.id },
      update: { grantedById: requester.id }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.permission.grant",
      entityType: "UserPermission",
      entityId: perm.id,
      metadata: { userId: body.userId, permission: body.permission }
    });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/permissions/revoke",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = permissionSchema.parse(req.body);
    if (body.userId === requester.id) {
      return res.status(400).json({ error: "Cannot revoke permissions from self" });
    }

    await prisma.userPermission
      .delete({ where: { userId_permission: { userId: body.userId, permission: body.permission } } })
      .catch(() => null);
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "admin.permission.revoke",
      entityType: "UserPermission",
      entityId: null,
      metadata: { userId: body.userId, permission: body.permission }
    });
    res.json({ ok: true });
  })
);
