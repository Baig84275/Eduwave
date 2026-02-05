import { Router } from "express";
import { Role, SupportNeeded, TrainingCompletionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const trainerDashboardRouter = Router();

trainerDashboardRouter.use(requireAuth);

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  organisationId: z.string().min(1).optional()
});

function startOfIsoWeekUtc(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weeksBetween(from: Date, to: Date) {
  const out: Date[] = [];
  let cur = startOfIsoWeekUtc(from);
  const end = startOfIsoWeekUtc(to);
  while (cur <= end) {
    out.push(new Date(cur));
    cur = new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return out;
}

async function resolveOrganisationId(requester: { id: string; role: Role }, queryOrgId?: string) {
  if (requester.role === Role.ADMIN || requester.role === Role.SUPER_ADMIN) {
    return queryOrgId ?? null;
  }
  const u = await prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } });
  return u?.organisationId ?? null;
}

trainerDashboardRouter.get(
  "/dashboard",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = querySchema.parse(req.query);

    const now = new Date();
    const to = query.to ? new Date(query.to) : now;
    const from = query.from ? new Date(query.from) : new Date(new Date(to).setUTCDate(to.getUTCDate() - 56));

    const organisationId = await resolveOrganisationId(requester, query.organisationId);
    if (!organisationId) return res.status(400).json({ error: "Organisation required" });

    const [checkIns, supervisionLogs, trainingCompletions] = await Promise.all([
      prisma.facilitatorCheckIn.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          facilitator: { organisationId }
        },
        select: {
          createdAt: true,
          confidence: true,
          emotionalLoad: true,
          supportNeeded: true
        }
      }),
      prisma.supervisionLog.findMany({
        where: {
          observationDate: { gte: from, lte: to },
          facilitator: { organisationId }
        },
        select: {
          observationDate: true,
          followUpRequired: true
        }
      }),
      prisma.trainingCompletion.findMany({
        where: {
          status: TrainingCompletionStatus.COMPLETED,
          completedAt: { not: null, gte: from, lte: to },
          user: { organisationId }
        },
        select: {
          completedAt: true
        }
      })
    ]);

    const weeklyIndex = new Map<string, { cSum: number; cN: number; eSum: number; eN: number; flags: number; support: Record<string, number> }>();
    for (const w of weeksBetween(from, to)) {
      weeklyIndex.set(w.toISOString(), { cSum: 0, cN: 0, eSum: 0, eN: 0, flags: 0, support: { NONE: 0, SOME: 0, URGENT: 0 } });
    }

    for (const c of checkIns) {
      const wk = startOfIsoWeekUtc(c.createdAt).toISOString();
      const row = weeklyIndex.get(wk);
      if (!row) continue;
      row.cSum += c.confidence;
      row.cN += 1;
      row.eSum += c.emotionalLoad;
      row.eN += 1;
      row.support[c.supportNeeded] = (row.support[c.supportNeeded] ?? 0) + 1;
      if (c.supportNeeded !== SupportNeeded.NONE) row.flags += 1;
    }

    const supervisionByWeek = new Map<string, { total: number; followUp: number }>();
    for (const w of weeklyIndex.keys()) supervisionByWeek.set(w, { total: 0, followUp: 0 });
    for (const s of supervisionLogs) {
      const wk = startOfIsoWeekUtc(s.observationDate).toISOString();
      const row = supervisionByWeek.get(wk);
      if (!row) continue;
      row.total += 1;
      if (s.followUpRequired) row.followUp += 1;
    }

    const trainingByWeek = new Map<string, number>();
    for (const w of weeklyIndex.keys()) trainingByWeek.set(w, 0);
    for (const t of trainingCompletions) {
      const wk = startOfIsoWeekUtc(t.completedAt as Date).toISOString();
      trainingByWeek.set(wk, (trainingByWeek.get(wk) ?? 0) + 1);
    }

    const totalConfidence = checkIns.reduce((a, c) => a + c.confidence, 0);
    const totalEmotional = checkIns.reduce((a, c) => a + c.emotionalLoad, 0);
    const supportNeededCounts = checkIns.reduce(
      (acc, c) => {
        acc[c.supportNeeded] = (acc[c.supportNeeded] ?? 0) + 1;
        return acc;
      },
      { NONE: 0, SOME: 0, URGENT: 0 } as Record<SupportNeeded, number>
    );

    const trends = Array.from(weeklyIndex.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, v]) => ({
        weekStart,
        avgConfidence: v.cN ? v.cSum / v.cN : null,
        avgEmotionalLoad: v.eN ? v.eSum / v.eN : null,
        supportFlags: v.flags,
        supportNeededCounts: v.support,
        trainingCompletions: trainingByWeek.get(weekStart) ?? 0,
        supervisionSessions: supervisionByWeek.get(weekStart)?.total ?? 0,
        supervisionFollowUps: supervisionByWeek.get(weekStart)?.followUp ?? 0
      }));

    res.json({
      organisationId,
      range: { from: from.toISOString(), to: to.toISOString() },
      checkIns: {
        total: checkIns.length,
        avgConfidence: checkIns.length ? totalConfidence / checkIns.length : null,
        avgEmotionalLoad: checkIns.length ? totalEmotional / checkIns.length : null,
        supportNeededCounts
      },
      supervision: {
        total: supervisionLogs.length,
        followUpRequiredTotal: supervisionLogs.filter((s) => s.followUpRequired).length
      },
      training: {
        completions: trainingCompletions.length
      },
      trends
    });
  })
);

