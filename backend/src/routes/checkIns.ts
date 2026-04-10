import { Router } from "express";
import { CheckInFrequency, Role, SettingContext, SupportNeeded, TrainingCompletionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole, SUPERVISOR_ROLES } from "../middleware/rbac";
import { assertFacilitatorOrgScope } from "../permissions/facilitator";
import { encryptString, decryptString } from "../lib/crypto";
import { writeAuditEvent } from "../audit/audit";

export const checkInsRouter = Router();

checkInsRouter.use(requireAuth);

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function startOfIsoWeekUtc(d: Date) {
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday, 0, 0, 0, 0));
  return monday;
}

function periodStartForNow(frequency: CheckInFrequency) {
  const now = new Date();
  if (frequency === CheckInFrequency.DAILY) return startOfDayUtc(now);
  return startOfIsoWeekUtc(now);
}

function isoWeekNumberUtc(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function quarterForMonth(monthNumber: number): string {
  const q = Math.min(4, Math.max(1, Math.ceil(monthNumber / 3)));
  return `Q${q}`;
}


const createCheckInSchema = z.object({
  frequency: z.nativeEnum(CheckInFrequency),
  confidence: z.number().int().min(1).max(5),
  emotionalLoad: z.number().int().min(1).max(5),
  supportNeeded: z.nativeEnum(SupportNeeded),
  settingContext: z.nativeEnum(SettingContext).optional().nullable(),
  specificEvent: z.string().min(1).max(200).optional().nullable(),
  note: z.string().min(1).max(500).optional().nullable()
});

checkInsRouter.post(
  "/",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const body = createCheckInSchema.parse(req.body);
    const facilitatorId = req.user!.id;
    const periodStart = periodStartForNow(body.frequency);
    const noteEnc = body.note ? encryptString(body.note) : null;
    const now = new Date();
    const weekNumber = isoWeekNumberUtc(now);
    const monthNumber = now.getUTCMonth() + 1;
    const quarter = quarterForMonth(monthNumber);

    try {
      const checkIn = await prisma.facilitatorCheckIn.create({
        data: {
          facilitatorId,
          frequency: body.frequency,
          periodStart,
          confidence: body.confidence,
          emotionalLoad: body.emotionalLoad,
          supportNeeded: body.supportNeeded,
          settingContext: body.settingContext ?? null,
          specificEvent: body.specificEvent ?? null,
          weekNumber,
          monthNumber,
          quarter,
          noteEnc
        },
        select: {
          id: true,
          frequency: true,
          periodStart: true,
          confidence: true,
          emotionalLoad: true,
          supportNeeded: true,
          settingContext: true,
          specificEvent: true,
          weekNumber: true,
          monthNumber: true,
          quarter: true,
          createdAt: true
        }
      });
      await writeAuditEvent({
        prisma,
        req,
        actor: req.user!,
        action: "check_in.submit",
        entityType: "FacilitatorCheckIn",
        entityId: checkIn.id,
        metadata: { frequency: checkIn.frequency, supportNeeded: checkIn.supportNeeded }
      });
      res.json({ checkIn });
    } catch (e: any) {
      if (typeof e?.code === "string" && e.code === "P2002") {
        return res.status(409).json({ error: "Already submitted for this period" });
      }
      throw e;
    }
  })
);

const listMeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

checkInsRouter.get(
  "/me",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const query = listMeQuerySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const checkIns = await prisma.facilitatorCheckIn.findMany({
      where: {
        facilitatorId: userId,
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        frequency: true,
        periodStart: true,
        confidence: true,
        emotionalLoad: true,
        supportNeeded: true,
        settingContext: true,
        specificEvent: true,
        weekNumber: true,
        monthNumber: true,
        quarter: true,
        noteEnc: true,
        createdAt: true
      }
    });

    res.json({
      checkIns: checkIns.map((c) => ({
        id: c.id,
        frequency: c.frequency,
        periodStart: c.periodStart,
        confidence: c.confidence,
        emotionalLoad: c.emotionalLoad,
        supportNeeded: c.supportNeeded,
        settingContext: c.settingContext,
        specificEvent: c.specificEvent,
        weekNumber: c.weekNumber,
        monthNumber: c.monthNumber,
        quarter: c.quarter,
        note: c.noteEnc ? decryptString(c.noteEnc) : null,
        createdAt: c.createdAt
      }))
    });
  })
);

const listQuerySchema = z.object({
  facilitatorId: z.string().min(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

checkInsRouter.get(
  "/",
  requireRole(...SUPERVISOR_ROLES),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = listQuerySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    await assertFacilitatorOrgScope(requester, query.facilitatorId);

    const checkIns = await prisma.facilitatorCheckIn.findMany({
      where: {
        facilitatorId: query.facilitatorId,
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        facilitatorId: true,
        frequency: true,
        periodStart: true,
        confidence: true,
        emotionalLoad: true,
        supportNeeded: true,
        settingContext: true,
        specificEvent: true,
        weekNumber: true,
        monthNumber: true,
        quarter: true,
        noteEnc: true,
        createdAt: true
      }
    });

    res.json({
      checkIns: checkIns.map((c) => ({
        id: c.id,
        facilitatorId: c.facilitatorId,
        frequency: c.frequency,
        periodStart: c.periodStart,
        confidence: c.confidence,
        emotionalLoad: c.emotionalLoad,
        supportNeeded: c.supportNeeded,
        settingContext: c.settingContext,
        specificEvent: c.specificEvent,
        weekNumber: c.weekNumber,
        monthNumber: c.monthNumber,
        quarter: c.quarter,
        note: c.noteEnc ? decryptString(c.noteEnc) : null,
        createdAt: c.createdAt
      }))
    });
  })
);

async function buildJourney(facilitatorId: string) {
  const [facilitator, checkIns, trainingCompletedCount, supportSessionsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: facilitatorId },
      select: { id: true, facilitatorStatus: true }
    }),
    prisma.facilitatorCheckIn.findMany({
      where: { facilitatorId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, confidence: true, emotionalLoad: true, supportNeeded: true }
    }),
    prisma.trainingCompletion.count({
      where: { userId: facilitatorId, status: TrainingCompletionStatus.COMPLETED }
    }),
    prisma.supervisionLog.count({
      where: { facilitatorId }
    })
  ]);

  const byWeek = new Map<string, { weekStart: Date; confidenceSum: number; emotionalLoadSum: number; count: number }>();
  const supportFlagsHistory: Array<{ createdAt: Date; supportNeeded: SupportNeeded }> = [];

  for (const c of checkIns) {
    const weekStart = startOfIsoWeekUtc(c.createdAt);
    const key = weekStart.toISOString();
    const cur = byWeek.get(key) ?? { weekStart, confidenceSum: 0, emotionalLoadSum: 0, count: 0 };
    cur.confidenceSum += c.confidence;
    cur.emotionalLoadSum += c.emotionalLoad;
    cur.count += 1;
    byWeek.set(key, cur);

    if (c.supportNeeded !== SupportNeeded.NONE) {
      supportFlagsHistory.push({ createdAt: c.createdAt, supportNeeded: c.supportNeeded });
    }
  }

  const weeks = Array.from(byWeek.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  const confidenceTrend = weeks.map((w) => ({ weekStart: w.weekStart, value: w.count ? w.confidenceSum / w.count : 0 }));
  const emotionalLoadTrend = weeks.map((w) => ({ weekStart: w.weekStart, value: w.count ? w.emotionalLoadSum / w.count : 0 }));

  return {
    weeksActive: weeks.length,
    totalCheckIns: checkIns.length,
    trainingCompletedCount,
    supportSessionsCount,
    confidenceTrend,
    emotionalLoadTrend,
    supportFlagsHistory,
    currentStatus: facilitator?.facilitatorStatus ?? null
  };
}

checkInsRouter.get(
  "/journey/me",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const journey = await buildJourney(req.user!.id);
    res.json({ journey });
  })
);

checkInsRouter.get(
  "/journey/:facilitatorId",
  requireRole(...SUPERVISOR_ROLES),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const facilitatorId = req.params.facilitatorId;
    await assertFacilitatorOrgScope(requester, facilitatorId);
    const journey = await buildJourney(facilitatorId);
    res.json({ journey });
  })
);
