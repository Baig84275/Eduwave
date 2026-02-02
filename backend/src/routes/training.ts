import { Router } from "express";
import { Role, TrainingCompletionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditEvent } from "../audit/audit";

export const trainingRouter = Router();

trainingRouter.use(requireAuth);

const createModuleSchema = z.object({
  courseId: z.string().min(1),
  moduleName: z.string().min(1),
  lmsUrl: z.string().url()
});

trainingRouter.post(
  "/modules",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const body = createModuleSchema.parse(req.body);
    const module = await prisma.trainingModule.upsert({
      where: { courseId_moduleName: { courseId: body.courseId, moduleName: body.moduleName } },
      create: { courseId: body.courseId, moduleName: body.moduleName, lmsUrl: body.lmsUrl },
      update: { lmsUrl: body.lmsUrl },
      select: { id: true, courseId: true, moduleName: true, lmsUrl: true, createdAt: true, updatedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.module.upsert",
      entityType: "TrainingModule",
      entityId: module.id,
      metadata: { courseId: module.courseId, moduleName: module.moduleName }
    });
    res.json({ module });
  })
);

trainingRouter.get(
  "/modules",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const modules = await prisma.trainingModule.findMany({
      orderBy: [{ courseId: "asc" }, { moduleName: "asc" }],
      select: { id: true, courseId: true, moduleName: true, lmsUrl: true, createdAt: true, updatedAt: true }
    });
    res.json({ modules });
  })
);

const assignSchema = z.object({
  moduleId: z.string().min(1),
  userId: z.string().min(1)
});

trainingRouter.post(
  "/assignments",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const body = assignSchema.parse(req.body);
    const requester = req.user!;
    if (requester.role === Role.TRAINER_SUPERVISOR) {
      const [reqUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } }),
        prisma.user.findUnique({ where: { id: body.userId }, select: { organisationId: true } })
      ]);
      if (!reqUser?.organisationId || reqUser.organisationId !== targetUser?.organisationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const assignment = await prisma.trainingAssignment.upsert({
      where: { moduleId_userId: { moduleId: body.moduleId, userId: body.userId } },
      create: { moduleId: body.moduleId, userId: body.userId, assignedById: req.user!.id },
      update: { assignedById: req.user!.id },
      select: { id: true, moduleId: true, userId: true, assignedById: true, assignedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.assignment.upsert",
      entityType: "TrainingAssignment",
      entityId: assignment.id,
      metadata: { moduleId: assignment.moduleId, userId: assignment.userId }
    });
    res.json({ assignment });
  })
);

trainingRouter.get(
  "/my-modules",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const assignments = await prisma.trainingAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: "desc" },
      select: {
        module: { select: { id: true, courseId: true, moduleName: true, lmsUrl: true } },
        assignedAt: true
      }
    });

    const completions = await prisma.trainingCompletion.findMany({
      where: { userId },
      select: { moduleId: true, status: true, completedAt: true }
    });
    const completionByModule = new Map(completions.map((c) => [c.moduleId, c]));

    res.json({
      modules: assignments.map((a) => {
        const completion = completionByModule.get(a.module.id);
        return {
          module: a.module,
          assignedAt: a.assignedAt,
          status: completion?.status ?? TrainingCompletionStatus.NOT_STARTED,
          completedAt: completion?.completedAt ?? null
        };
      })
    });
  })
);

const completeSchema = z.object({
  moduleId: z.string().min(1),
  status: z.nativeEnum(TrainingCompletionStatus)
});

trainingRouter.post(
  "/completions",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = completeSchema.parse(req.body);
    const completedAt = body.status === TrainingCompletionStatus.COMPLETED ? new Date() : null;

    const completion = await prisma.trainingCompletion.upsert({
      where: { moduleId_userId: { moduleId: body.moduleId, userId } },
      create: { moduleId: body.moduleId, userId, status: body.status, completedAt },
      update: { status: body.status, completedAt },
      select: { moduleId: true, userId: true, status: true, completedAt: true, updatedAt: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.completion.upsert",
      entityType: "TrainingCompletion",
      entityId: `${completion.moduleId}:${completion.userId}`,
      metadata: { moduleId: completion.moduleId, status: completion.status }
    });

    res.json({ completion });
  })
);

const reflectionSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1).optional().nullable(),
  moduleName: z.string().min(1),
  reflectionText: z.string().min(1).max(500),
  applicationNote: z.string().min(1).max(500),
  challengesFaced: z.string().min(1).max(300).optional().nullable(),
  supportNeeded: z.string().min(1).max(300).optional().nullable(),
  helpfulRating: z.number().int().min(1).max(5).optional().nullable(),
  confidenceChange: z.number().int().min(-5).max(5).optional().nullable()
});

trainingRouter.post(
  "/reflections",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const body = reflectionSchema.parse(req.body);

    let moduleId = body.moduleId ?? null;
    if (!moduleId) {
      const m = await prisma.trainingModule.findUnique({
        where: { courseId_moduleName: { courseId: body.courseId, moduleName: body.moduleName } },
        select: { id: true }
      });
      moduleId = m?.id ?? null;
    }
    if (moduleId) {
      const completion = await prisma.trainingCompletion.findUnique({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        select: { status: true }
      });
      if (!completion || completion.status !== TrainingCompletionStatus.COMPLETED) {
        return res.status(400).json({ error: "Reflection can only be submitted for completed modules" });
      }
    }

    const reflection =
      moduleId !== null
        ? await prisma.trainingReflection.upsert({
            where: { facilitatorId_moduleId: { facilitatorId: user.id, moduleId } },
            create: {
              facilitatorId: user.id,
              courseId: body.courseId,
              moduleId,
              moduleName: body.moduleName,
              reflectionText: body.reflectionText,
              applicationNote: body.applicationNote,
              challengesFaced: body.challengesFaced ?? null,
              supportNeeded: body.supportNeeded ?? null,
              helpfulRating: body.helpfulRating ?? null,
              wasHelpful: body.helpfulRating != null ? body.helpfulRating >= 4 : null,
              confidenceChange: body.confidenceChange ?? null
            },
            update: {
              courseId: body.courseId,
              moduleName: body.moduleName,
              reflectionText: body.reflectionText,
              applicationNote: body.applicationNote,
              challengesFaced: body.challengesFaced ?? null,
              supportNeeded: body.supportNeeded ?? null,
              helpfulRating: body.helpfulRating ?? null,
              wasHelpful: body.helpfulRating != null ? body.helpfulRating >= 4 : null,
              confidenceChange: body.confidenceChange ?? null
            }
          })
        : await prisma.trainingReflection.create({
            data: {
              facilitatorId: user.id,
              courseId: body.courseId,
              moduleId: null,
              moduleName: body.moduleName,
              reflectionText: body.reflectionText,
              applicationNote: body.applicationNote,
              challengesFaced: body.challengesFaced ?? null,
              supportNeeded: body.supportNeeded ?? null,
              helpfulRating: body.helpfulRating ?? null,
              wasHelpful: body.helpfulRating != null ? body.helpfulRating >= 4 : null,
              confidenceChange: body.confidenceChange ?? null
            }
          });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "training.reflection.upsert",
      entityType: "TrainingReflection",
      entityId: reflection.id,
      metadata: { courseId: reflection.courseId, moduleId: reflection.moduleId, helpfulRating: reflection.helpfulRating }
    });

    res.json({ reflection });
  })
);

const reflectionsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});

trainingRouter.get(
  "/reflections",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const query = reflectionsListQuerySchema.parse(req.query);
    const reflections = await prisma.trainingReflection.findMany({
      where: { facilitatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        facilitatorId: true,
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
    });
    res.json({ reflections, pagination: { limit: query.limit, offset: query.offset } });
  })
);
