import { Router } from "express";
import { AccessibilityMode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { writeAuditEvent } from "../audit/audit";

export const accessibilityRouter = Router();

// Granular accessibility settings are stored as JSON on the User record.
// They are applied in addition to the selected primary accessibilityMode.
const accessibilityConfigSchema = z.object({
  fontSize: z.enum(["small", "medium", "large", "extra-large"]),
  lineSpacing: z.enum(["compact", "normal", "relaxed", "extra-relaxed"]),
  iconSize: z.enum(["default", "large", "extra-large"]),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  colorScheme: z.enum(["default", "warm", "cool", "monochrome"])
});

type AccessibilityConfig = z.infer<typeof accessibilityConfigSchema>;

const patchSchema = accessibilityConfigSchema.partial();

function defaultConfigForMode(mode: AccessibilityMode | null | undefined): AccessibilityConfig {
  switch (mode) {
    case "VISUAL_SUPPORT":
      return {
        fontSize: "large",
        lineSpacing: "normal",
        iconSize: "large",
        reducedMotion: false,
        highContrast: true,
        colorScheme: "default"
      };
    case "HEARING_SUPPORT":
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
    case "MOBILITY_SUPPORT":
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "extra-large",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
    case "NEURODIVERSE":
      return {
        fontSize: "medium",
        lineSpacing: "relaxed",
        iconSize: "large",
        reducedMotion: true,
        highContrast: false,
        colorScheme: "warm"
      };
    case "READING_DYSLEXIA":
      return {
        fontSize: "medium",
        lineSpacing: "relaxed",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "warm"
      };
    default:
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
  }
}

function normalizeStoredConfig(raw: unknown, mode: AccessibilityMode | null | undefined): AccessibilityConfig {
  const defaults = defaultConfigForMode(mode);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return defaults;
  return { ...defaults, ...parsed.data };
}

accessibilityRouter.use(requireAuth);

accessibilityRouter.get(
  "/config",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessibilityMode: true, accessibilityConfig: true }
    });
    const mode = user?.accessibilityMode ?? null;
    const config = normalizeStoredConfig(user?.accessibilityConfig, mode);
    res.json({ mode, config });
  })
);

accessibilityRouter.patch(
  "/config",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const patch = patchSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accessibilityMode: true, accessibilityConfig: true } });
    const mode = user?.accessibilityMode ?? null;
    const next = { ...normalizeStoredConfig(user?.accessibilityConfig, mode), ...patch };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { accessibilityConfig: next as any },
      select: { accessibilityMode: true, accessibilityConfig: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "accessibility.config.update",
      entityType: "User",
      entityId: userId
    });

    res.json({ mode: updated.accessibilityMode ?? null, config: normalizeStoredConfig(updated.accessibilityConfig, updated.accessibilityMode) });
  })
);

accessibilityRouter.post(
  "/reset",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const mode = z.object({ mode: z.nativeEnum(AccessibilityMode) }).parse(req.query).mode;
    const defaults = defaultConfigForMode(mode);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { accessibilityMode: mode, accessibilityConfig: defaults as any },
      select: { accessibilityMode: true, accessibilityConfig: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "accessibility.config.reset",
      entityType: "User",
      entityId: userId,
      metadata: { mode }
    });

    res.json({ mode: updated.accessibilityMode ?? null, config: normalizeStoredConfig(updated.accessibilityConfig, updated.accessibilityMode) });
  })
);

