import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { AdminPermission, Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { requirePermission } from "../middleware/permissions";
import { decryptString, encryptString } from "../lib/crypto";
import { assertChildReadAccessOrThrow } from "../permissions/children";
import { getUploadsDir, toSignedUploadUrl, toUploadKey } from "../storage/uploads";
import { writeAuditEvent } from "../audit/audit";

export const childrenRouter = Router();

childrenRouter.use(requireAuth);

const createChildSchema = z.object({
  name: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  healthStatus: z.string().min(1).optional()
});

childrenRouter.post(
  "/",
  requireRole(Role.PARENT),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const body = createChildSchema.parse(req.body);
    const child = await prisma.child.create({
      data: {
        parentId: user.id,
        name: body.name,
        dateOfBirth: new Date(body.dateOfBirth),
        healthStatusEnc: body.healthStatus ? encryptString(body.healthStatus) : null,
        profilePictureUrl: null
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        dateOfBirth: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "child.create",
      entityType: "Child",
      entityId: child.id
    });
    res.json({ child });
  })
);

childrenRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === Role.PARENT) {
      const children = await prisma.child.findMany({
        where: { parentId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
      });
      return res.json({
        children: children.map((c) => ({
          ...c,
          profilePictureUrl: c.profilePictureUrl
            ? toSignedUploadUrl({ uploadKey: toUploadKey(c.profilePictureUrl), userId: user.id, role: user.role })
            : null
        }))
      });
    }
    if (user.role === Role.FACILITATOR) {
      const assignments = await prisma.facilitatorAssignment.findMany({
        where: { facilitatorId: user.id, child: { deletedAt: null } },
        include: {
          child: {
            select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.json({
        children: assignments.map((a) => ({
          ...a.child,
          profilePictureUrl: a.child.profilePictureUrl
            ? toSignedUploadUrl({ uploadKey: toUploadKey(a.child.profilePictureUrl), userId: user.id, role: user.role })
            : null
        }))
      });
    }
    const children = await prisma.child.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
    });
    return res.json({
      children: children.map((c) => ({
        ...c,
        profilePictureUrl: c.profilePictureUrl
          ? toSignedUploadUrl({ uploadKey: toUploadKey(c.profilePictureUrl), userId: user.id, role: user.role })
          : null
      }))
    });
  })
);

childrenRouter.get(
  "/:childId",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const childId = req.params.childId;
    await assertChildReadAccessOrThrow(user, childId);

    const child = await prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: {
        id: true,
        parentId: true,
        name: true,
        dateOfBirth: true,
        healthStatusEnc: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!child) {
      return res.status(404).json({ error: "Not found" });
    }

    const healthStatus =
      child.healthStatusEnc && (user.role === Role.PARENT || user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN)
        ? decryptString(child.healthStatusEnc)
        : null;

    return res.json({
      child: {
        id: child.id,
        parentId: child.parentId,
        name: child.name,
        dateOfBirth: child.dateOfBirth,
        healthStatus,
        profilePictureUrl: child.profilePictureUrl
          ? toSignedUploadUrl({ uploadKey: toUploadKey(child.profilePictureUrl), userId: user.id, role: user.role })
          : null,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      }
    });
  })
);

const assignSchema = z.object({ facilitatorId: z.string().min(1) });

childrenRouter.post(
  "/:childId/assign-facilitator",
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const childId = req.params.childId;
    const body = assignSchema.parse(req.body);
    const assignment = await prisma.facilitatorAssignment.create({
      data: { childId, facilitatorId: body.facilitatorId },
      select: { id: true, childId: true, facilitatorId: true, createdAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor,
      action: "child.assign_facilitator",
      entityType: "FacilitatorAssignment",
      entityId: assignment.id,
      metadata: { childId: assignment.childId, facilitatorId: assignment.facilitatorId }
    });
    res.json({ assignment });
  })
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadsDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    cb(null, `${base}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

childrenRouter.post(
  "/:childId/profile-picture",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === Role.FACILITATOR) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const childId = req.params.childId;
    await assertChildReadAccessOrThrow(user, childId);

    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }

    const url = req.file.filename;
    const updated = await prisma.child.updateMany({
      where: { id: childId, deletedAt: null },
      data: { profilePictureUrl: url }
    });
    if (!updated.count) {
      return res.status(404).json({ error: "Not found" });
    }
    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, profilePictureUrl: true, updatedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "child.profile_picture.upload",
      entityType: "Child",
      entityId: childId,
      metadata: { file: url }
    });
    res.json({
      child: {
        ...(child ?? { id: childId, profilePictureUrl: url, updatedAt: new Date() }),
        profilePictureUrl: url ? toSignedUploadUrl({ uploadKey: toUploadKey(url), userId: user.id, role: user.role }) : null
      }
    });
  })
);

childrenRouter.delete(
  "/:childId",
  requirePermission(AdminPermission.DELETE_CHILDREN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const childId = req.params.childId;

    const child = await prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { id: true }
    });
    if (!child) return res.status(404).json({ error: "Not found" });

    const updated = await prisma.child.update({
      where: { id: childId },
      data: { deletedAt: new Date() },
      select: { deletedAt: true }
    });

    await prisma.facilitatorAssignment.deleteMany({ where: { childId } });

    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "child.delete",
      entityType: "Child",
      entityId: childId
    });

    res.json({ ok: true, deletedAt: updated.deletedAt });
  })
);
