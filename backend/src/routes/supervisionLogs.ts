import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { decryptString, encryptString } from "../lib/crypto";
import { writeAuditEvent } from "../audit/audit";

export const supervisionLogsRouter = Router();

supervisionLogsRouter.use(requireAuth);

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

const createSchema = z.object({
  facilitatorId: z.string().min(1),
  childId: z.string().min(1).optional().nullable(),
  observationDate: z.string().datetime(),
  strengths: z.string().min(1).max(2000).optional().nullable(),
  challenges: z.string().min(1).max(2000).optional().nullable(),
  strategies: z.string().min(1).max(2000).optional().nullable(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  previousLogId: z.string().min(1).optional().nullable()
});

supervisionLogsRouter.post(
  "/",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const body = createSchema.parse(req.body);
    const supervisorId = req.user!.id;
    const childId = body.childId ?? null;

    await assertFacilitatorOrgScope(requester, body.facilitatorId);

    if (childId) {
      const assignment = await prisma.facilitatorAssignment.findFirst({
        where: { childId, facilitatorId: body.facilitatorId }
      });
      if (!assignment) {
        return res.status(400).json({ error: "Facilitator is not assigned to this child" });
      }
    }

    if (body.previousLogId) {
      const prev = await prisma.supervisionLog.findUnique({
        where: { id: body.previousLogId },
        select: { id: true, facilitatorId: true }
      });
      if (!prev || prev.facilitatorId !== body.facilitatorId) {
        return res.status(400).json({ error: "previousLogId is invalid" });
      }
    }

    const log = await prisma.supervisionLog.create({
      data: {
        facilitatorId: body.facilitatorId,
        supervisorId,
        childId,
        observationDate: new Date(body.observationDate),
        strengthsEnc: body.strengths ? encryptString(body.strengths) : null,
        challengesEnc: body.challenges ? encryptString(body.challenges) : null,
        strategiesEnc: body.strategies ? encryptString(body.strategies) : null,
        followUpRequired: body.followUpRequired ?? false,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        previousLogId: body.previousLogId ?? null
      },
      select: {
        id: true,
        facilitatorId: true,
        supervisorId: true,
        childId: true,
        observationDate: true,
        strengthsEnc: true,
        challengesEnc: true,
        strategiesEnc: true,
        followUpRequired: true,
        followUpDate: true,
        followUpCompleted: true,
        facilitatorResponseEnc: true,
        actionsTakenEnc: true,
        outcomeNotesEnc: true,
        previousLogId: true,
        acknowledgedAt: true,
        createdAt: true
      }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "supervision.log.create",
      entityType: "SupervisionLog",
      entityId: log.id,
      metadata: { facilitatorId: log.facilitatorId, childId: log.childId, followUpRequired: log.followUpRequired }
    });

    res.json({
      log: {
        id: log.id,
        facilitatorId: log.facilitatorId,
        supervisorId: log.supervisorId,
        childId: log.childId,
        observationDate: log.observationDate,
        strengths: log.strengthsEnc ? decryptString(log.strengthsEnc) : null,
        challenges: log.challengesEnc ? decryptString(log.challengesEnc) : null,
        strategies: log.strategiesEnc ? decryptString(log.strategiesEnc) : null,
        followUpRequired: log.followUpRequired,
        followUpDate: log.followUpDate,
        followUpCompleted: log.followUpCompleted,
        facilitatorResponse: log.facilitatorResponseEnc ? decryptString(log.facilitatorResponseEnc) : null,
        actionsTaken: log.actionsTakenEnc ? decryptString(log.actionsTakenEnc) : null,
        outcomeNotes: log.outcomeNotesEnc ? decryptString(log.outcomeNotesEnc) : null,
        previousLogId: log.previousLogId,
        acknowledgedAt: log.acknowledgedAt,
        createdAt: log.createdAt
      }
    });
  })
);

supervisionLogsRouter.get(
  "/me",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const facilitatorId = req.user!.id;
    const logs = await prisma.supervisionLog.findMany({
      where: { facilitatorId },
      orderBy: { observationDate: "desc" },
      select: {
        id: true,
        facilitatorId: true,
        supervisorId: true,
        childId: true,
        observationDate: true,
        strengthsEnc: true,
        challengesEnc: true,
        strategiesEnc: true,
        followUpRequired: true,
        followUpDate: true,
        followUpCompleted: true,
        facilitatorResponseEnc: true,
        actionsTakenEnc: true,
        outcomeNotesEnc: true,
        previousLogId: true,
        acknowledgedAt: true,
        createdAt: true
      }
    });

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        facilitatorId: l.facilitatorId,
        supervisorId: l.supervisorId,
        childId: l.childId,
        observationDate: l.observationDate,
        strengths: l.strengthsEnc ? decryptString(l.strengthsEnc) : null,
        challenges: l.challengesEnc ? decryptString(l.challengesEnc) : null,
        strategies: l.strategiesEnc ? decryptString(l.strategiesEnc) : null,
        followUpRequired: l.followUpRequired,
        followUpDate: l.followUpDate,
        followUpCompleted: l.followUpCompleted,
        facilitatorResponse: l.facilitatorResponseEnc ? decryptString(l.facilitatorResponseEnc) : null,
        actionsTaken: l.actionsTakenEnc ? decryptString(l.actionsTakenEnc) : null,
        outcomeNotes: l.outcomeNotesEnc ? decryptString(l.outcomeNotesEnc) : null,
        previousLogId: l.previousLogId,
        acknowledgedAt: l.acknowledgedAt,
        createdAt: l.createdAt
      }))
    });
  })
);

const listSchema = z.object({
  facilitatorId: z.string().min(1),
  followUpRequired: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true"))
});

supervisionLogsRouter.get(
  "/",
  requireRole(Role.TRAINER_SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = listSchema.parse(req.query);
    await assertFacilitatorOrgScope(requester, query.facilitatorId);

    const logs = await prisma.supervisionLog.findMany({
      where: {
        facilitatorId: query.facilitatorId,
        ...(query.followUpRequired === undefined ? {} : { followUpRequired: query.followUpRequired })
      },
      orderBy: { observationDate: "desc" },
      select: {
        id: true,
        facilitatorId: true,
        supervisorId: true,
        childId: true,
        observationDate: true,
        strengthsEnc: true,
        challengesEnc: true,
        strategiesEnc: true,
        followUpRequired: true,
        followUpDate: true,
        followUpCompleted: true,
        facilitatorResponseEnc: true,
        actionsTakenEnc: true,
        outcomeNotesEnc: true,
        previousLogId: true,
        acknowledgedAt: true,
        createdAt: true
      }
    });

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        facilitatorId: l.facilitatorId,
        supervisorId: l.supervisorId,
        childId: l.childId,
        observationDate: l.observationDate,
        strengths: l.strengthsEnc ? decryptString(l.strengthsEnc) : null,
        challenges: l.challengesEnc ? decryptString(l.challengesEnc) : null,
        strategies: l.strategiesEnc ? decryptString(l.strategiesEnc) : null,
        followUpRequired: l.followUpRequired,
        followUpDate: l.followUpDate,
        followUpCompleted: l.followUpCompleted,
        facilitatorResponse: l.facilitatorResponseEnc ? decryptString(l.facilitatorResponseEnc) : null,
        actionsTaken: l.actionsTakenEnc ? decryptString(l.actionsTakenEnc) : null,
        outcomeNotes: l.outcomeNotesEnc ? decryptString(l.outcomeNotesEnc) : null,
        previousLogId: l.previousLogId,
        acknowledgedAt: l.acknowledgedAt,
        createdAt: l.createdAt
      }))
    });
  })
);

const followUpSchema = z.object({
  facilitatorResponse: z.string().min(1).max(2000).optional().nullable(),
  actionsTaken: z.string().min(1).max(2000).optional().nullable(),
  outcomeNotes: z.string().min(1).max(2000).optional().nullable(),
  followUpCompleted: z.boolean().optional()
});

supervisionLogsRouter.patch(
  "/:logId/follow-up",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const logId = req.params.logId;
    const body = followUpSchema.parse(req.body);

    const log = await prisma.supervisionLog.findUnique({
      where: { id: logId },
      select: { id: true, facilitatorId: true, supervisorId: true, followUpDate: true }
    });
    if (!log) return res.status(404).json({ error: "Not found" });

    if (requester.role === Role.FACILITATOR && requester.id !== log.facilitatorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (requester.role === Role.TRAINER_SUPERVISOR) {
      await assertFacilitatorOrgScope(requester, log.facilitatorId);
      if (log.supervisorId !== requester.id) return res.status(403).json({ error: "Forbidden" });
    }
    if (requester.role === Role.ORG_ADMIN) {
      await assertFacilitatorOrgScope(requester, log.facilitatorId);
    }

    const updated = await prisma.supervisionLog.update({
      where: { id: logId },
      data: {
        facilitatorResponseEnc:
          body.facilitatorResponse !== undefined ? (body.facilitatorResponse ? encryptString(body.facilitatorResponse) : null) : undefined,
        actionsTakenEnc: body.actionsTaken !== undefined ? (body.actionsTaken ? encryptString(body.actionsTaken) : null) : undefined,
        outcomeNotesEnc: body.outcomeNotes !== undefined ? (body.outcomeNotes ? encryptString(body.outcomeNotes) : null) : undefined,
        followUpCompleted: body.followUpCompleted ?? true
      },
      select: {
        id: true,
        facilitatorId: true,
        supervisorId: true,
        followUpRequired: true,
        followUpDate: true,
        followUpCompleted: true,
        facilitatorResponseEnc: true,
        actionsTakenEnc: true,
        outcomeNotesEnc: true,
        acknowledgedAt: true,
        createdAt: true
      }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "supervision.log.follow_up",
      entityType: "SupervisionLog",
      entityId: logId,
      metadata: { followUpDate: log.followUpDate }
    });

    res.json({
      log: {
        id: updated.id,
        facilitatorId: updated.facilitatorId,
        supervisorId: updated.supervisorId,
        followUpRequired: updated.followUpRequired,
        followUpDate: updated.followUpDate,
        followUpCompleted: updated.followUpCompleted,
        facilitatorResponse: updated.facilitatorResponseEnc ? decryptString(updated.facilitatorResponseEnc) : null,
        actionsTaken: updated.actionsTakenEnc ? decryptString(updated.actionsTakenEnc) : null,
        outcomeNotes: updated.outcomeNotesEnc ? decryptString(updated.outcomeNotesEnc) : null,
        acknowledgedAt: updated.acknowledgedAt,
        createdAt: updated.createdAt
      }
    });
  })
);

supervisionLogsRouter.post(
  "/:logId/acknowledge",
  requireRole(Role.FACILITATOR),
  asyncHandler(async (req, res) => {
    const logId = req.params.logId;
    const userId = req.user!.id;

    const log = await prisma.supervisionLog.findUnique({
      where: { id: logId },
      select: { id: true, facilitatorId: true, acknowledgedAt: true }
    });
    if (!log) return res.status(404).json({ error: "Not found" });
    if (log.facilitatorId !== userId) return res.status(403).json({ error: "Forbidden" });
    if (log.acknowledgedAt) return res.json({ ok: true, acknowledgedAt: log.acknowledgedAt });

    const updated = await prisma.supervisionLog.update({
      where: { id: logId },
      data: { acknowledgedAt: new Date() },
      select: { acknowledgedAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "supervision.log.acknowledge",
      entityType: "SupervisionLog",
      entityId: logId
    });
    res.json({ ok: true, acknowledgedAt: updated.acknowledgedAt });
  })
);
