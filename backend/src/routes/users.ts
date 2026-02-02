import { Router } from "express";
import { AccessibilityMode, AdminPermission, FacilitatorStatus, LanguageCode, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditEvent } from "../audit/audit";
import { requirePermission } from "../middleware/permissions";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        accessibilityMode: true,
        language: true,
        facilitatorStatus: true,
        organisationId: true
      }
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
      select: {
        id: true,
        email: true,
        role: true,
        accessibilityMode: true,
        language: true,
        facilitatorStatus: true,
        organisationId: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "user.accessibility_mode.update",
      entityType: "User",
      entityId: userId,
      metadata: { accessibilityMode: user.accessibilityMode }
    });
    return res.json({ user });
  })
);

const updateLanguageSchema = z.object({ language: z.nativeEnum(LanguageCode) });

usersRouter.patch(
  "/me/language",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = updateLanguageSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { language: body.language },
      select: {
        id: true,
        email: true,
        role: true,
        accessibilityMode: true,
        language: true,
        facilitatorStatus: true,
        organisationId: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "user.language.update",
      entityType: "User",
      entityId: userId,
      metadata: { language: user.language }
    });
    return res.json({ user });
  })
);

const updateFacilitatorStatusSchema = z.object({ facilitatorStatus: z.nativeEnum(FacilitatorStatus) });

usersRouter.patch(
  "/me/facilitator-status",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = updateFacilitatorStatusSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { facilitatorStatus: body.facilitatorStatus },
      select: {
        id: true,
        email: true,
        role: true,
        accessibilityMode: true,
        language: true,
        facilitatorStatus: true,
        organisationId: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "user.facilitator_status.update",
      entityType: "User",
      entityId: userId,
      metadata: { facilitatorStatus: user.facilitatorStatus }
    });
    return res.json({ user });
  })
);

usersRouter.delete(
  "/:userId",
  requirePermission(AdminPermission.DELETE_USERS),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const userId = req.params.userId;
    if (userId === requester.id) return res.status(400).json({ error: "Cannot delete self" });

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, deletedAt: true }
    });
    if (!target || target.deletedAt) return res.status(404).json({ error: "Not found" });
    if (target.role === Role.SUPER_ADMIN && requester.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true }
    });

    await prisma.userPermission.deleteMany({ where: { userId } });

    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "user.delete",
      entityType: "User",
      entityId: userId
    });

    return res.json({ ok: true, deletedAt: updated.deletedAt });
  })
);

usersRouter.get(
  "/facilitators/:id/training-journey",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const facilitatorId = req.params.id;

    if (requester.role === Role.FACILITATOR && requester.id !== facilitatorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      requester.role !== Role.FACILITATOR &&
      requester.role !== Role.TRAINER_SUPERVISOR &&
      requester.role !== Role.ORG_ADMIN &&
      requester.role !== Role.ADMIN &&
      requester.role !== Role.SUPER_ADMIN
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const target = await prisma.user.findUnique({
      where: { id: facilitatorId },
      select: { id: true, role: true, organisationId: true }
    });
    if (!target || target.role !== Role.FACILITATOR) return res.status(404).json({ error: "Not found" });

    if (requester.role === Role.ORG_ADMIN || requester.role === Role.TRAINER_SUPERVISOR) {
      const reqOrg = await prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } });
      const sameOrg = Boolean(reqOrg?.organisationId && reqOrg.organisationId === target.organisationId);
      if (!sameOrg && requester.role === Role.TRAINER_SUPERVISOR) {
        const hasSupervised = await prisma.supervisionLog.findFirst({
          where: { supervisorId: requester.id, facilitatorId },
          select: { id: true }
        });
        if (!hasSupervised) return res.status(403).json({ error: "Forbidden" });
      }
      if (!sameOrg && requester.role === Role.ORG_ADMIN) return res.status(403).json({ error: "Forbidden" });
    }

    const [reflections, completions, assignments] = await Promise.all([
      prisma.trainingReflection.findMany({
        where: { facilitatorId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          courseId: true,
          moduleId: true,
          moduleName: true,
          reflectionText: true,
          applicationNote: true,
          challengesFaced: true,
          supportNeeded: true,
          wasHelpful: true,
          helpfulRating: true,
          confidenceChange: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.trainingCompletion.findMany({
        where: { userId: facilitatorId },
        select: { moduleId: true, status: true, completedAt: true, updatedAt: true }
      }),
      prisma.trainingAssignment.findMany({ where: { userId: facilitatorId }, select: { moduleId: true, assignedAt: true } })
    ]);

    const completedCount = completions.filter((c) => c.status === "COMPLETED").length;
    const assignedCount = assignments.length;
    const confidenceTrend = reflections
      .filter((r) => typeof r.confidenceChange === "number")
      .map((r) => ({ createdAt: r.createdAt, confidenceChange: r.confidenceChange as number }));

    const byCourse = new Map<string, any[]>();
    for (const r of reflections) {
      const list = byCourse.get(r.courseId) ?? [];
      list.push(r);
      byCourse.set(r.courseId, list);
    }

    res.json({
      facilitatorId,
      stats: { assignedCount, completedCount, reflectionsCount: reflections.length },
      confidenceTrend,
      courses: Array.from(byCourse.entries()).map(([courseId, items]) => ({
        courseId,
        reflections: items.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }))
    });
  })
);
