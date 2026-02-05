import { Router } from "express";
import { Role, SupportNeeded, TrainingCompletionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const orgRouter = Router();

orgRouter.use(requireAuth);

const overviewQuerySchema = z.object({
  orgId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

orgRouter.get(
  "/overview",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const query = overviewQuerySchema.parse(req.query);
    const requester = req.user!;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    let organisationId: string | undefined = query.orgId ?? undefined;
    if (requester.role === Role.ORG_ADMIN) {
      const orgAdmin = await prisma.user.findUnique({
        where: { id: requester.id },
        select: { organisationId: true }
      });
      organisationId = orgAdmin?.organisationId ?? undefined;
      if (!organisationId) {
        return res
          .status(400)
          .json({ error: "Organisation admin is not assigned to an organisation" });
      }
    }

    const dateFilter = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

    const checkInWhere = {
      ...dateFilter,
      ...(organisationId ? { facilitator: { organisationId } } : {})
    } as const;

    const [checkInAggregate, supportGroups, supervisionAggregate, followUpAggregate, completionGroups] =
      await Promise.all([
        prisma.facilitatorCheckIn.aggregate({
          where: checkInWhere,
          _count: { _all: true },
          _avg: { confidence: true, emotionalLoad: true }
        }),
        prisma.facilitatorCheckIn.groupBy({
          by: ["supportNeeded"],
          where: checkInWhere,
          _count: { _all: true }
        }),
        prisma.supervisionLog.aggregate({
          where: {
            ...dateFilter,
            ...(organisationId ? { facilitator: { organisationId } } : {})
          },
          _count: { _all: true }
        }),
        prisma.supervisionLog.aggregate({
          where: {
            ...dateFilter,
            followUpRequired: true,
            ...(organisationId ? { facilitator: { organisationId } } : {})
          },
          _count: { _all: true }
        }),
        prisma.trainingCompletion.groupBy({
          by: ["status"],
          where: {
            ...(organisationId ? { user: { organisationId } } : {})
          },
          _count: { _all: true }
        })
      ]);

    const supportNeededCounts: Record<SupportNeeded, number> = {
      NONE: 0,
      SOME: 0,
      URGENT: 0
    };
    for (const g of supportGroups) {
      supportNeededCounts[g.supportNeeded] = g._count._all;
    }

    const trainingCompletionCounts: Record<TrainingCompletionStatus, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0
    };
    for (const g of completionGroups) {
      trainingCompletionCounts[g.status] = g._count._all;
    }

    res.json({
      overview: {
        organisationId: organisationId ?? null,
        checkIns: {
          total: checkInAggregate._count._all,
          avgConfidence: checkInAggregate._avg.confidence ?? null,
          avgEmotionalLoad: checkInAggregate._avg.emotionalLoad ?? null,
          supportNeededCounts
        },
        supervision: {
          total: supervisionAggregate._count._all,
          followUpRequiredTotal: followUpAggregate._count._all
        },
        training: {
          completionCounts: trainingCompletionCounts
        }
      }
    });
  })
);
