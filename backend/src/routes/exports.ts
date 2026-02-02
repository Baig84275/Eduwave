import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { buildQuarterlySummaryData, renderQuarterlySummaryPdf } from "../reports/quarterlySummary";
import { signQuarterlySummaryToken, verifyQuarterlySummaryToken } from "../storage/exportTokens";

export const exportsRouter = Router();

const exportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  organisationId: z.string().min(1).optional()
});

async function getScopedOrganisationId(requester: { id: string; role: Role }, queryOrgId?: string) {
  if (requester.role === Role.ADMIN || requester.role === Role.SUPER_ADMIN) {
    return queryOrgId;
  }
  if (requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) {
    const u = await prisma.user.findUnique({ where: { id: requester.id }, select: { organisationId: true } });
    if (!u?.organisationId) return null;
    return u.organisationId;
  }
  return null;
}

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

exportsRouter.get(
  "/check-ins",
  requireAuth,
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = exportQuerySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const organisationId = await getScopedOrganisationId(requester, query.organisationId);
    if ((requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) && !organisationId) {
      return res.status(400).json({ error: "User is not assigned to an organisation" });
    }

    const checkIns = await prisma.facilitatorCheckIn.findMany({
      where: {
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(organisationId ? { facilitator: { organisationId } } : {})
      },
      orderBy: { createdAt: "asc" },
      select: {
        facilitatorId: true,
        frequency: true,
        periodStart: true,
        confidence: true,
        emotionalLoad: true,
        supportNeeded: true,
        createdAt: true
      }
    });

    const anonymise = requester.role === Role.ORG_ADMIN;
    const rows = checkIns.map((c) => ({
      ...(anonymise ? {} : { facilitatorId: c.facilitatorId }),
      frequency: c.frequency,
      periodStart: c.periodStart.toISOString(),
      confidence: c.confidence,
      emotionalLoad: c.emotionalLoad,
      supportNeeded: c.supportNeeded,
      createdAt: c.createdAt.toISOString()
    }));

    if ((query.format ?? "json") === "csv") {
      res.type("text/csv").send(toCsv(rows));
    } else {
      res.json({ generatedAt: new Date().toISOString(), rows });
    }
  })
);

exportsRouter.get(
  "/supervision-logs",
  requireAuth,
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = exportQuerySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const organisationId = await getScopedOrganisationId(requester, query.organisationId);
    if ((requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) && !organisationId) {
      return res.status(400).json({ error: "User is not assigned to an organisation" });
    }

    const logs = await prisma.supervisionLog.findMany({
      where: {
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(organisationId ? { facilitator: { organisationId } } : {})
      },
      orderBy: { observationDate: "asc" },
      select: {
        facilitatorId: true,
        supervisorId: true,
        childId: true,
        observationDate: true,
        followUpRequired: true,
        acknowledgedAt: true,
        createdAt: true
      }
    });

    const anonymise = requester.role === Role.ORG_ADMIN;
    const rows = logs.map((l) => ({
      ...(anonymise ? {} : { facilitatorId: l.facilitatorId, supervisorId: l.supervisorId }),
      ...(anonymise ? {} : { childId: l.childId ?? "" }),
      observationDate: l.observationDate.toISOString(),
      followUpRequired: l.followUpRequired,
      acknowledgedAt: l.acknowledgedAt ? l.acknowledgedAt.toISOString() : "",
      createdAt: l.createdAt.toISOString()
    }));

    if ((query.format ?? "json") === "csv") {
      res.type("text/csv").send(toCsv(rows));
    } else {
      res.json({ generatedAt: new Date().toISOString(), rows });
    }
  })
);

const quarterlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000),
  quarter: z.coerce.number().int().min(1).max(4),
  organisationId: z.string().min(1).optional()
});

function quarterRangeUtc(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const toExclusive = new Date(Date.UTC(year, startMonth + 3, 1, 0, 0, 0, 0));
  const to = new Date(toExclusive);
  to.setUTCMilliseconds(to.getUTCMilliseconds() - 1);
  return { from, to, toExclusive };
}

function getBaseUrl(req: any) {
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  return `${proto}://${req.get("host")}`;
}

exportsRouter.get(
  "/quarterly-summary",
  requireAuth,
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = quarterlyQuerySchema.parse(req.query);
    const { from, to } = quarterRangeUtc(query.year, query.quarter);

    const organisationId = await getScopedOrganisationId(requester, query.organisationId);
    if ((requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) && !organisationId) {
      return res.status(400).json({ error: "User is not assigned to an organisation" });
    }
    if (!organisationId) return res.status(400).json({ error: "Organisation required" });

    const data = await buildQuarterlySummaryData({ organisationId, from, to });
    const pdf = await renderQuarterlySummaryPdf(data);
    res.type("application/pdf").send(pdf);
  })
);

exportsRouter.get(
  "/quarterly-summary-link",
  requireAuth,
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = quarterlyQuerySchema.parse(req.query);
    const { from, to } = quarterRangeUtc(query.year, query.quarter);

    const organisationId = await getScopedOrganisationId(requester, query.organisationId);
    if ((requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) && !organisationId) {
      return res.status(400).json({ error: "User is not assigned to an organisation" });
    }
    if (!organisationId) return res.status(400).json({ error: "Organisation required" });

    const token = signQuarterlySummaryToken({
      organisationId,
      from: from.toISOString(),
      to: to.toISOString(),
      userId: requester.id
    });
    const url = `${getBaseUrl(req)}/exports/public/quarterly-summary.pdf?t=${encodeURIComponent(token)}`;
    res.json({ url, expiresInSeconds: 600 });
  })
);

exportsRouter.get(
  "/public/quarterly-summary.pdf",
  asyncHandler(async (req, res) => {
    const token = typeof req.query.t === "string" ? req.query.t : "";
    if (!token) return res.status(401).json({ error: "Missing token" });
    let decoded: { organisationId: string; from: string; to: string; userId: string };
    try {
      decoded = verifyQuarterlySummaryToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    const from = new Date(decoded.from);
    const to = new Date(decoded.to);
    const data = await buildQuarterlySummaryData({ organisationId: decoded.organisationId, from, to });
    const pdf = await renderQuarterlySummaryPdf(data);
    res.type("application/pdf").send(pdf);
  })
);

exportsRouter.get(
  "/training-completions",
  requireAuth,
  requireRole(Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const query = exportQuerySchema.parse(req.query);

    const organisationId = await getScopedOrganisationId(requester, query.organisationId);
    if ((requester.role === Role.TRAINER_SUPERVISOR || requester.role === Role.ORG_ADMIN) && !organisationId) {
      return res.status(400).json({ error: "User is not assigned to an organisation" });
    }

    const completions = await prisma.trainingCompletion.findMany({
      where: {
        ...(organisationId ? { user: { organisationId } } : {})
      },
      orderBy: { updatedAt: "asc" },
      select: {
        userId: true,
        module: { select: { courseId: true, moduleName: true } },
        status: true,
        completedAt: true,
        updatedAt: true
      }
    });

    const anonymise = requester.role === Role.ORG_ADMIN;
    const rows = completions.map((c) => ({
      ...(anonymise ? {} : { userId: c.userId }),
      courseId: c.module.courseId,
      moduleName: c.module.moduleName,
      status: c.status,
      completedAt: c.completedAt ? c.completedAt.toISOString() : "",
      updatedAt: c.updatedAt.toISOString()
    }));

    if ((query.format ?? "json") === "csv") {
      res.type("text/csv").send(toCsv(rows));
    } else {
      res.json({ generatedAt: new Date().toISOString(), rows });
    }
  })
);
