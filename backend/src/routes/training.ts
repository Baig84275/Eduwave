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

async function assertFacilitatorOrgScope(requester: { id: string; role: Role }, facilitatorId: string) {
  if (requester.role !== Role.TRAINER_SUPERVISOR && requester.role !== Role.ORG_ADMIN) return;
  const [reqUser, facUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } }),
    prisma.user.findUnique({ where: { id: facilitatorId }, select: { organisationId: true, role: true } })
  ]);
  if (!facUser || facUser.role !== Role.FACILITATOR) {
    const err: any = new Error("Not found");
    err.status = 404;
    throw err;
  }
  if (!reqUser?.organisationId || reqUser.organisationId !== facUser.organisationId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

const createModuleSchema = z.object({
  courseId: z.string().min(1),
  moduleName: z.string().min(1),
  lmsUrl: z.string().min(1)
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

const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  levelNumber: z.number().int().min(1),
  description: z.string().max(1000).optional().nullable(),
  learnworldsUrl: z.string().min(1).optional().nullable()
});

trainingRouter.post(
  "/courses",
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const body = createCourseSchema.parse(req.body);
    const course = await prisma.trainingCourse.create({
      data: {
        title: body.title,
        levelNumber: body.levelNumber,
        description: body.description ?? null,
        learnworldsUrl: body.learnworldsUrl ?? "",
        active: true
      },
      select: { id: true, title: true, levelNumber: true, description: true, learnworldsUrl: true, active: true, createdAt: true, updatedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.course.create",
      entityType: "TrainingCourse",
      entityId: course.id,
      metadata: { title: course.title, levelNumber: course.levelNumber }
    });
    res.status(201).json({ course });
  })
);

const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  levelNumber: z.number().int().min(1).optional(),
  description: z.string().max(1000).optional().nullable(),
  learnworldsUrl: z.string().min(1).optional(),
  active: z.boolean().optional()
});

trainingRouter.patch(
  "/courses/:courseId",
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const body = updateCourseSchema.parse(req.body);
    const existing = await prisma.trainingCourse.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: "Course not found" });
    const course = await prisma.trainingCourse.update({
      where: { id: courseId },
      data: body,
      select: { id: true, title: true, levelNumber: true, description: true, learnworldsUrl: true, active: true, createdAt: true, updatedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.course.update",
      entityType: "TrainingCourse",
      entityId: course.id,
      metadata: { changes: Object.keys(body) }
    });
    res.json({ course });
  })
);

trainingRouter.get(
  "/courses",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const includeInactive =
      (req.query.includeInactive === "true" || req.query.includeInactive === "1") &&
      (req.user!.role === Role.ADMIN || req.user!.role === Role.SUPER_ADMIN);
    const courses = await prisma.trainingCourse.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { levelNumber: "asc" },
      select: { id: true, title: true, levelNumber: true, description: true, learnworldsUrl: true, active: true }
    });
    res.json({ courses });
  })
);

trainingRouter.get(
  "/courses/:courseId/modules",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, levelNumber: true, description: true, learnworldsUrl: true, active: true }
    });
    if (!course) return res.status(404).json({ error: "Course not found" });
    const modules = await prisma.trainingModule.findMany({
      where: { courseId },
      orderBy: { moduleName: "asc" },
      select: { id: true, courseId: true, moduleName: true, lmsUrl: true, createdAt: true, updatedAt: true }
    });
    res.json({ course, modules });
  })
);

trainingRouter.delete(
  "/courses/:courseId",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const existing = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: { id: true, title: true }
    });
    if (!existing) return res.status(404).json({ error: "Course not found" });

    // Delete modules, assignments, completions, then the course (cascade via Prisma)
    await prisma.$transaction([
      prisma.trainingCompletion.deleteMany({
        where: { module: { courseId } }
      }),
      prisma.trainingAssignment.deleteMany({
        where: { module: { courseId } }
      }),
      prisma.trainingModule.deleteMany({ where: { courseId } }),
      prisma.trainingCourse.delete({ where: { id: courseId } })
    ]);

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.course.delete",
      entityType: "TrainingCourse",
      entityId: courseId,
      metadata: { title: existing.title }
    });

    res.json({ ok: true });
  })
);

trainingRouter.delete(
  "/modules/:moduleId",
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const moduleId = req.params.moduleId;
    const existing = await prisma.trainingModule.findUnique({ where: { id: moduleId }, select: { id: true, moduleName: true, courseId: true } });
    if (!existing) return res.status(404).json({ error: "Module not found" });
    await prisma.trainingModule.delete({ where: { id: moduleId } });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.module.delete",
      entityType: "TrainingModule",
      entityId: moduleId,
      metadata: { moduleName: existing.moduleName, courseId: existing.courseId }
    });
    res.json({ ok: true });
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

trainingRouter.get(
  "/my-courses",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const [assignments, completions, courses] = await Promise.all([
      prisma.trainingAssignment.findMany({
        where: { userId },
        orderBy: { assignedAt: "desc" },
        select: { assignedAt: true, module: { select: { id: true, courseId: true, moduleName: true, lmsUrl: true } } }
      }),
      prisma.trainingCompletion.findMany({
        where: { userId },
        select: { moduleId: true, status: true, completedAt: true }
      }),
      prisma.trainingCourse.findMany({
        where: { active: true },
        select: { id: true, title: true, levelNumber: true, description: true, learnworldsUrl: true, active: true }
      })
    ]);

    const completionByModule = new Map(completions.map((c) => [c.moduleId, c]));
    const courseById = new Map(courses.map((c) => [c.id, c]));

    const byCourseId = new Map<
      string,
      {
        courseId: string;
        course: any;
        modules: Array<{
          id: string;
          moduleName: string;
          externalUrl: string;
          assignedAt: Date;
          completionStatus: TrainingCompletionStatus;
          completionDate: Date | null;
        }>;
      }
    >();

    for (const a of assignments) {
      const courseId = a.module.courseId;
      const course = courseById.get(courseId) ?? {
        id: courseId,
        title: courseId,
        levelNumber: 0,
        description: null,
        learnworldsUrl: a.module.lmsUrl,
        active: true
      };
      const entry = byCourseId.get(courseId) ?? { courseId, course, modules: [] as any[] };
      const comp = completionByModule.get(a.module.id);
      entry.modules.push({
        id: a.module.id,
        moduleName: a.module.moduleName,
        externalUrl: a.module.lmsUrl,
        assignedAt: a.assignedAt,
        completionStatus: comp?.status ?? TrainingCompletionStatus.NOT_STARTED,
        completionDate: comp?.completedAt ?? null
      });
      byCourseId.set(courseId, entry);
    }

    const result = Array.from(byCourseId.values())
      .map((c) => ({
        course: c.course,
        modules: c.modules.slice().sort((a, b) => a.moduleName.localeCompare(b.moduleName))
      }))
      .sort((a, b) => (a.course.levelNumber ?? 0) - (b.course.levelNumber ?? 0));

    res.json({ courses: result });
  })
);

const completeModuleSchema = z.object({ moduleId: z.string().min(1) });

trainingRouter.post(
  "/complete-module",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = completeModuleSchema.parse(req.body);

    const assigned = await prisma.trainingAssignment.findUnique({
      where: { moduleId_userId: { moduleId: body.moduleId, userId } },
      select: { id: true }
    });
    if (!assigned) return res.status(403).json({ error: "Forbidden" });

    const completion = await prisma.trainingCompletion.upsert({
      where: { moduleId_userId: { moduleId: body.moduleId, userId } },
      create: { moduleId: body.moduleId, userId, status: TrainingCompletionStatus.COMPLETED, completedAt: new Date() },
      update: { status: TrainingCompletionStatus.COMPLETED, completedAt: new Date() },
      select: { moduleId: true, userId: true, status: true, completedAt: true, updatedAt: true }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "training.complete_module",
      entityType: "TrainingCompletion",
      entityId: `${completion.moduleId}:${completion.userId}`,
      metadata: { moduleId: completion.moduleId }
    });

    res.json({ completion });
  })
);

const assignCourseSchema = z.object({
  facilitatorId: z.string().min(1),
  courseId: z.string().min(1)
});

trainingRouter.post(
  "/assign-course",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = assignCourseSchema.parse(req.body);
    await assertFacilitatorOrgScope(requester, body.facilitatorId);

    const modules = await prisma.trainingModule.findMany({
      where: { courseId: body.courseId },
      select: { id: true }
    });
    if (!modules.length) return res.status(404).json({ error: "Course has no modules" });

    const created = await prisma.trainingAssignment.createMany({
      data: modules.map((m) => ({ moduleId: m.id, userId: body.facilitatorId, assignedById: requester.id })),
      skipDuplicates: true
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "training.assign_course",
      entityType: "TrainingCourse",
      entityId: body.courseId,
      metadata: { facilitatorId: body.facilitatorId, modulesAssigned: created.count }
    });

    res.json({ ok: true, assignedModules: created.count });
  })
);

trainingRouter.get(
  "/facilitator/:id/progress",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const facilitatorId = req.params.id;
    await assertFacilitatorOrgScope(requester, facilitatorId);

    const [assignments, completions, courses] = await Promise.all([
      prisma.trainingAssignment.findMany({
        where: { userId: facilitatorId },
        select: { assignedAt: true, module: { select: { id: true, courseId: true, moduleName: true } } }
      }),
      prisma.trainingCompletion.findMany({
        where: { userId: facilitatorId },
        select: { moduleId: true, status: true, completedAt: true }
      }),
      prisma.trainingCourse.findMany({
        where: { active: true },
        select: { id: true, title: true, levelNumber: true }
      })
    ]);

    const completionByModule = new Map(completions.map((c) => [c.moduleId, c]));
    const courseById = new Map(courses.map((c) => [c.id, c]));

    const byCourse = new Map<
      string,
      { courseId: string; title: string; levelNumber: number; total: number; completed: number; modules: Array<{ id: string; moduleName: string; status: TrainingCompletionStatus; completedAt: Date | null }> }
    >();

    for (const a of assignments) {
      const courseId = a.module.courseId;
      const courseMeta = courseById.get(courseId);
      const entry =
        byCourse.get(courseId) ??
        {
          courseId,
          title: courseMeta?.title ?? courseId,
          levelNumber: courseMeta?.levelNumber ?? 0,
          total: 0,
          completed: 0,
          modules: [] as any[]
        };
      const comp = completionByModule.get(a.module.id);
      const status = comp?.status ?? TrainingCompletionStatus.NOT_STARTED;
      entry.total += 1;
      if (status === TrainingCompletionStatus.COMPLETED) entry.completed += 1;
      entry.modules.push({ id: a.module.id, moduleName: a.module.moduleName, status, completedAt: comp?.completedAt ?? null });
      byCourse.set(courseId, entry);
    }

    const coursesProgress = Array.from(byCourse.values())
      .map((c) => ({ ...c, modules: c.modules.slice().sort((a, b) => a.moduleName.localeCompare(b.moduleName)) }))
      .sort((a, b) => a.levelNumber - b.levelNumber);

    res.json({
      facilitatorId,
      summary: {
        assignedModules: assignments.length,
        completedModules: completions.filter((c) => c.status === TrainingCompletionStatus.COMPLETED).length
      },
      courses: coursesProgress
    });
  })
);

trainingRouter.get(
  "/org-stats",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const orgId =
      requester.role === Role.ORG_ADMIN
        ? (await prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } }))?.organisationId
        : (typeof req.query.organisationId === "string" ? req.query.organisationId : undefined);

    if (!orgId) return res.status(400).json({ error: "organisationId is required" });

    const facilitators = await prisma.user.findMany({
      where: { organisationId: orgId, role: Role.FACILITATOR },
      select: { id: true }
    });
    const facilitatorIds = facilitators.map((f) => f.id);
    if (!facilitatorIds.length) return res.json({ organisationId: orgId, courses: [] });

    const [assignments, completions, courses] = await Promise.all([
      prisma.trainingAssignment.findMany({
        where: { userId: { in: facilitatorIds } },
        select: { userId: true, module: { select: { id: true, courseId: true } } }
      }),
      prisma.trainingCompletion.findMany({
        where: { userId: { in: facilitatorIds } },
        select: { userId: true, moduleId: true, status: true }
      }),
      prisma.trainingCourse.findMany({
        where: { active: true },
        select: { id: true, title: true, levelNumber: true }
      })
    ]);

    const courseById = new Map(courses.map((c) => [c.id, c]));
    const completionKey = new Set(completions.filter((c) => c.status === TrainingCompletionStatus.COMPLETED).map((c) => `${c.userId}:${c.moduleId}`));

    const byCourse = new Map<string, { courseId: string; title: string; levelNumber: number; assignedModules: number; completedModules: number }>();
    for (const a of assignments) {
      const courseId = a.module.courseId;
      const meta = courseById.get(courseId);
      const entry =
        byCourse.get(courseId) ??
        { courseId, title: meta?.title ?? courseId, levelNumber: meta?.levelNumber ?? 0, assignedModules: 0, completedModules: 0 };
      entry.assignedModules += 1;
      if (completionKey.has(`${a.userId}:${a.module.id}`)) entry.completedModules += 1;
      byCourse.set(courseId, entry);
    }

    res.json({
      organisationId: orgId,
      courses: Array.from(byCourse.values()).sort((a, b) => a.levelNumber - b.levelNumber)
    });
  })
);
