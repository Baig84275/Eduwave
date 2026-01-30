import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { decryptString, encryptString } from "../lib/crypto";
import { assertChildReadAccessOrThrow } from "../permissions/children";
import { getUploadsDir, toPublicUploadUrl } from "../storage/uploads";

export const childrenRouter = Router();

childrenRouter.use(requireAuth);

const createChildSchema = z.object({
  name: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  healthStatus: z.string().min(1).optional(),
  profilePictureUrl: z.string().url().optional()
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
        profilePictureUrl: body.profilePictureUrl ?? null
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
    res.json({ child });
  })
);

childrenRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === Role.PARENT) {
      const children = await prisma.child.findMany({
        where: { parentId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
      });
      return res.json({ children });
    }
    if (user.role === Role.FACILITATOR) {
      const assignments = await prisma.facilitatorAssignment.findMany({
        where: { facilitatorId: user.id },
        include: {
          child: {
            select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ children: assignments.map((a) => a.child) });
    }
    const children = await prisma.child.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, dateOfBirth: true, profilePictureUrl: true, createdAt: true, updatedAt: true }
    });
    return res.json({ children });
  })
);

childrenRouter.get(
  "/:childId",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const childId = req.params.childId;
    await assertChildReadAccessOrThrow(user, childId);

    const child = await prisma.child.findUnique({
      where: { id: childId },
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
        profilePictureUrl: child.profilePictureUrl,
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
    const childId = req.params.childId;
    const body = assignSchema.parse(req.body);
    const assignment = await prisma.facilitatorAssignment.create({
      data: { childId, facilitatorId: body.facilitatorId },
      select: { id: true, childId: true, facilitatorId: true, createdAt: true }
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

    const url = toPublicUploadUrl(req.file.filename);
    const child = await prisma.child.update({
      where: { id: childId },
      data: { profilePictureUrl: url },
      select: { id: true, profilePictureUrl: true, updatedAt: true }
    });
    res.json({ child });
  })
);
