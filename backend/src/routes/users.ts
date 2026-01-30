import { Router } from "express";
import { AccessibilityMode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, accessibilityMode: true }
    });
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json({ user });
  })
);

const updateAccessibilityModeSchema = z.object({
  accessibilityMode: z.enum([
    AccessibilityMode.STANDARD,
    AccessibilityMode.VISUAL_SUPPORT,
    AccessibilityMode.READING_DYSLEXIA,
    AccessibilityMode.HEARING_SUPPORT,
    AccessibilityMode.MOBILITY_SUPPORT,
    AccessibilityMode.NEURODIVERSE
  ])
});

usersRouter.patch(
  "/me/accessibility-mode",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = updateAccessibilityModeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { accessibilityMode: body.accessibilityMode },
      select: { id: true, email: true, role: true, accessibilityMode: true }
    });
    return res.json({ user });
  })
);

