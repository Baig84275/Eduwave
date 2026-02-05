import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { Role } from "@prisma/client";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { prisma } from "../lib/prisma";
import { getUploadsDir, toSignedUploadUrl } from "../storage/uploads";
import { writeAuditEvent } from "../audit/audit";

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadsDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    cb(null, `${base}${ext || ""}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/webp";
    if (!ok) return cb(new Error("Unsupported file type"));
    cb(null as any, true);
  }
});

uploadRouter.post(
  "/resource-image",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file" });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "upload.resource_image",
      entityType: "Upload",
      entityId: file.filename,
      metadata: { mimeType: file.mimetype, size: file.size }
    });

    const signedUrl = toSignedUploadUrl({ uploadKey: file.filename, userId: user.id, role: user.role });
    res.json({ key: file.filename, url: signedUrl });
  })
);
