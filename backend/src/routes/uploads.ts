import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { asyncHandler } from "../lib/http";
import { getUploadsDir } from "../storage/uploads";
import { verifyUploadToken } from "../storage/uploadTokens";

export const uploadsRouter = Router();

uploadsRouter.get(
  "/:file",
  asyncHandler(async (req, res) => {
    const raw = req.params.file;
    const file = path.basename(raw);
    if (!file || file !== raw) {
      return res.status(400).json({ error: "Invalid file" });
    }

    const token = typeof req.query.t === "string" ? req.query.t : "";
    if (!token) return res.status(401).json({ error: "Missing token" });
    try {
      verifyUploadToken({ token, file });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const fullPath = path.join(getUploadsDir(), file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Not found" });
    }

    res.sendFile(fullPath);
  })
);

