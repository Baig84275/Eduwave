import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { Role, ProgressUpdateStatus, ProgressUpdateType, MediaKind } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { decryptString, encryptString } from "../lib/crypto";
import { assertChildReadAccessOrThrow, assertChildWriteAccessOrThrow } from "../permissions/children";
import { getUploadsDir, toSignedUploadUrl, toUploadKey } from "../storage/uploads";
import { writeAuditEvent } from "../audit/audit";

export const progressRouter = Router();

progressRouter.use(requireAuth);

function toUpdateResponse(
  user: { id: string; role: Role },
  update: {
    id: string;
    childId: string;
    type: ProgressUpdateType;
    status: ProgressUpdateStatus;
    createdById: string;
    createdByRole: Role;
    milestoneTitleEnc: string | null;
    noteEnc: string | null;
    createdAt: Date;
    updatedAt: Date;
    decidedAt: Date | null;
    media: { id: string; kind: MediaKind; url: string; mimeType: string | null; fileName: string | null; size: number | null }[];
  }
) {
  const canSeeCreator = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
  const canDecrypt =
    user.role === Role.ADMIN ||
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.PARENT ||
    update.createdById === user.id;

  return {
    id: update.id,
    childId: update.childId,
    type: update.type,
    status: update.status,
    createdBy: canSeeCreator ? { id: update.createdById, role: update.createdByRole } : null,
    milestoneTitle: update.milestoneTitleEnc && canDecrypt ? decryptString(update.milestoneTitleEnc) : null,
    note: update.noteEnc && canDecrypt ? decryptString(update.noteEnc) : null,
    decidedAt: update.decidedAt,
    createdAt: update.createdAt,
    updatedAt: update.updatedAt,
    media: update.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      url: toSignedUploadUrl({ uploadKey: toUploadKey(m.url), userId: user.id, role: user.role }),
      mimeType: m.mimeType,
      fileName: m.fileName,
      size: m.size
    }))
  };
}

const createUpdateSchema = z.object({
  type: z.enum([ProgressUpdateType.MILESTONE, ProgressUpdateType.NOTE]),
  milestoneTitle: z.string().min(1).optional(),
  note: z.string().min(1).optional()
});

progressRouter.post(
  "/:childId",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const childId = req.params.childId;
    await assertChildWriteAccessOrThrow(user, childId);

    const body = createUpdateSchema.parse(req.body);

    if (body.type === ProgressUpdateType.MILESTONE && !body.milestoneTitle) {
      return res.status(400).json({ error: "milestoneTitle is required" });
    }
    if (body.type === ProgressUpdateType.NOTE && !body.note) {
      return res.status(400).json({ error: "note is required" });
    }

    const status =
      user.role === Role.FACILITATOR ? ProgressUpdateStatus.PENDING_PARENT_APPROVAL : ProgressUpdateStatus.APPROVED;

    const update = await prisma.progressUpdate.create({
      data: {
        childId,
        createdById: user.id,
        createdByRole: user.role,
        type: body.type,
        status,
        milestoneTitleEnc: body.milestoneTitle ? encryptString(body.milestoneTitle) : null,
        noteEnc: body.note ? encryptString(body.note) : null
      },
      include: { media: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "progress.update.create",
      entityType: "ProgressUpdate",
      entityId: update.id,
      metadata: { childId, type: update.type, status: update.status }
    });

    res.json({ update: toUpdateResponse(user, update) });
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

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const createMediaSchema = z.object({
  kind: z.enum([MediaKind.IMAGE, MediaKind.VIDEO, MediaKind.DOCUMENT]),
  note: z.string().min(1).optional(),
  milestoneTitle: z.string().min(1).optional()
});

progressRouter.post(
  "/:childId/media",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const childId = req.params.childId;
    await assertChildWriteAccessOrThrow(user, childId);

    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }

    const body = createMediaSchema.parse(req.body);
    const status =
      user.role === Role.FACILITATOR ? ProgressUpdateStatus.PENDING_PARENT_APPROVAL : ProgressUpdateStatus.APPROVED;

    const relativePath = req.file.filename;
    const update = await prisma.progressUpdate.create({
      data: {
        childId,
        createdById: user.id,
        createdByRole: user.role,
        type: ProgressUpdateType.MEDIA,
        status,
        milestoneTitleEnc: body.milestoneTitle ? encryptString(body.milestoneTitle) : null,
        noteEnc: body.note ? encryptString(body.note) : null,
        media: {
          create: {
            kind: body.kind,
            url: relativePath,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            size: req.file.size
          }
        }
      },
      include: { media: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "progress.media.upload",
      entityType: "ProgressUpdate",
      entityId: update.id,
      metadata: { childId, mediaKind: body.kind, file: relativePath, status: update.status }
    });

    res.json({ update: toUpdateResponse(user, update) });
  })
);

progressRouter.get(
  "/:childId",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const childId = req.params.childId;
    await assertChildReadAccessOrThrow(user, childId);

    if (user.role === Role.PARENT) {
      const child = await prisma.child.findUnique({ where: { id: childId }, select: { parentId: true } });
      if (!child || child.parentId !== user.id) return res.status(404).json({ error: "Not found" });

      const updates = await prisma.progressUpdate.findMany({
        where: { childId, OR: [{ status: ProgressUpdateStatus.APPROVED }, { status: ProgressUpdateStatus.PENDING_PARENT_APPROVAL }] },
        include: { media: true },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ updates: updates.map((u) => toUpdateResponse(user, u)) });
    }

    if (user.role === Role.FACILITATOR) {
      const updates = await prisma.progressUpdate.findMany({
        where: {
          childId,
          OR: [
            { status: ProgressUpdateStatus.APPROVED },
            { createdById: user.id }
          ]
        },
        include: { media: true },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ updates: updates.map((u) => toUpdateResponse(user, u)) });
    }

    const updates = await prisma.progressUpdate.findMany({
      where: { childId },
      include: { media: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ updates: updates.map((u) => toUpdateResponse(user, u)) });
  })
);

const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]) });

progressRouter.post(
  "/update/:updateId/decision",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== Role.PARENT && user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const updateId = req.params.updateId;
    const body = decisionSchema.parse(req.body);

    const update = await prisma.progressUpdate.findUnique({
      where: { id: updateId },
      include: { child: { select: { parentId: true } }, media: true }
    });
    if (!update) return res.status(404).json({ error: "Not found" });

    if (user.role === Role.PARENT && update.child.parentId !== user.id) {
      return res.status(404).json({ error: "Not found" });
    }
    if (update.status !== ProgressUpdateStatus.PENDING_PARENT_APPROVAL) {
      return res.status(400).json({ error: "Update is not pending approval" });
    }

    const nextStatus = body.decision === "approve" ? ProgressUpdateStatus.APPROVED : ProgressUpdateStatus.REJECTED;
    const decided = await prisma.progressUpdate.update({
      where: { id: updateId },
      data: {
        status: nextStatus,
        decidedAt: new Date(),
        decidedById: user.id
      },
      include: { media: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "progress.update.decision",
      entityType: "ProgressUpdate",
      entityId: decided.id,
      metadata: { decision: body.decision, status: decided.status, childId: decided.childId }
    });

    res.json({ update: toUpdateResponse(user, decided) });
  })
);
