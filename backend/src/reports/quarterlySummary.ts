import { SupportNeeded, TrainingCompletionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { startOfIsoWeekUtc } from "../reports/time";
import PDFDocument from "pdfkit";

export type QuarterlySummaryData = {
  organisationId: string;
  from: string;
  to: string;
  checkIns: {
    total: number;
    avgConfidence: number | null;
    avgEmotionalLoad: number | null;
    supportNeededCounts: Record<SupportNeeded, number>;
  };
  supervision: {
    total: number;
    followUpRequiredTotal: number;
  };
  training: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  weekly: Array<{
    weekStart: string;
    avgConfidence: number | null;
    avgEmotionalLoad: number | null;
    supportFlags: number;
    trainingCompletions: number;
    supervisionSessions: number;
  }>;
};

function csvWeekKeys(from: Date, to: Date) {
  const out: string[] = [];
  let cur = startOfIsoWeekUtc(from);
  const end = startOfIsoWeekUtc(to);
  while (cur <= end) {
    out.push(cur.toISOString());
    cur = new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return out;
}

export async function buildQuarterlySummaryData(options: { organisationId: string; from: Date; to: Date }): Promise<QuarterlySummaryData> {
  const [checkIns, supervisionLogs, completions] = await Promise.all([
    prisma.facilitatorCheckIn.findMany({
      where: { createdAt: { gte: options.from, lte: options.to }, facilitator: { organisationId: options.organisationId } },
      select: { createdAt: true, confidence: true, emotionalLoad: true, supportNeeded: true }
    }),
    prisma.supervisionLog.findMany({
      where: { observationDate: { gte: options.from, lte: options.to }, facilitator: { organisationId: options.organisationId } },
      select: { observationDate: true, followUpRequired: true }
    }),
    prisma.trainingCompletion.findMany({
      where: { user: { organisationId: options.organisationId } },
      select: { status: true, completedAt: true, updatedAt: true }
    })
  ]);

  const supportNeededCounts = checkIns.reduce(
    (acc, c) => {
      acc[c.supportNeeded] = (acc[c.supportNeeded] ?? 0) + 1;
      return acc;
    },
    { NONE: 0, SOME: 0, URGENT: 0 } as Record<SupportNeeded, number>
  );

  const totalConfidence = checkIns.reduce((a, c) => a + c.confidence, 0);
  const totalEmotional = checkIns.reduce((a, c) => a + c.emotionalLoad, 0);

  const trainingCounts = completions.reduce(
    (acc, c) => {
      if (c.status === TrainingCompletionStatus.COMPLETED) acc.completed += 1;
      else if (c.status === TrainingCompletionStatus.IN_PROGRESS) acc.inProgress += 1;
      else acc.notStarted += 1;
      return acc;
    },
    { completed: 0, inProgress: 0, notStarted: 0 }
  );

  const weekKeys = csvWeekKeys(options.from, options.to);
  const weeklyIndex = new Map<string, { cSum: number; cN: number; eSum: number; eN: number; flags: number }>();
  for (const k of weekKeys) weeklyIndex.set(k, { cSum: 0, cN: 0, eSum: 0, eN: 0, flags: 0 });

  for (const c of checkIns) {
    const wk = startOfIsoWeekUtc(c.createdAt).toISOString();
    const row = weeklyIndex.get(wk);
    if (!row) continue;
    row.cSum += c.confidence;
    row.cN += 1;
    row.eSum += c.emotionalLoad;
    row.eN += 1;
    if (c.supportNeeded !== SupportNeeded.NONE) row.flags += 1;
  }

  const supervisionByWeek = new Map<string, number>();
  for (const k of weekKeys) supervisionByWeek.set(k, 0);
  for (const s of supervisionLogs) {
    const wk = startOfIsoWeekUtc(s.observationDate).toISOString();
    supervisionByWeek.set(wk, (supervisionByWeek.get(wk) ?? 0) + 1);
  }

  const trainingByWeek = new Map<string, number>();
  for (const k of weekKeys) trainingByWeek.set(k, 0);
  for (const t of completions) {
    if (t.status !== TrainingCompletionStatus.COMPLETED || !t.completedAt) continue;
    if (t.completedAt < options.from || t.completedAt > options.to) continue;
    const wk = startOfIsoWeekUtc(t.completedAt).toISOString();
    trainingByWeek.set(wk, (trainingByWeek.get(wk) ?? 0) + 1);
  }

  const weekly = weekKeys.map((weekStart) => {
    const v = weeklyIndex.get(weekStart)!;
    return {
      weekStart,
      avgConfidence: v.cN ? v.cSum / v.cN : null,
      avgEmotionalLoad: v.eN ? v.eSum / v.eN : null,
      supportFlags: v.flags,
      trainingCompletions: trainingByWeek.get(weekStart) ?? 0,
      supervisionSessions: supervisionByWeek.get(weekStart) ?? 0
    };
  });

  return {
    organisationId: options.organisationId,
    from: options.from.toISOString(),
    to: options.to.toISOString(),
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
    training: trainingCounts,
    weekly
  };
}

export async function renderQuarterlySummaryPdf(data: QuarterlySummaryData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];

  doc.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  doc.fontSize(18).text("EduWave Village — Quarterly Summary", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#334155").text(`Organisation: ${data.organisationId}`);
  doc.text(`Range: ${new Date(data.from).toDateString()} – ${new Date(data.to).toDateString()}`);
  doc.fillColor("#000000");
  doc.moveDown();

  doc.fontSize(13).text("Wellbeing Check-ins");
  doc.fontSize(11).text(`Total check-ins: ${data.checkIns.total}`);
  doc.text(`Average confidence: ${data.checkIns.avgConfidence == null ? "—" : data.checkIns.avgConfidence.toFixed(2)}`);
  doc.text(`Average emotional load: ${data.checkIns.avgEmotionalLoad == null ? "—" : data.checkIns.avgEmotionalLoad.toFixed(2)}`);
  doc.text(
    `Support needed: NONE ${data.checkIns.supportNeededCounts.NONE} · SOME ${data.checkIns.supportNeededCounts.SOME} · URGENT ${data.checkIns.supportNeededCounts.URGENT}`
  );
  doc.moveDown();

  doc.fontSize(13).text("Supervision");
  doc.fontSize(11).text(`Support sessions (logs): ${data.supervision.total}`);
  doc.text(`Follow-up required: ${data.supervision.followUpRequiredTotal}`);
  doc.moveDown();

  doc.fontSize(13).text("Training Tracking (Link-only)");
  doc.fontSize(11).text(
    `Completions: ${data.training.completed} · In progress: ${data.training.inProgress} · Not started: ${data.training.notStarted}`
  );
  doc.moveDown();

  doc.fontSize(13).text("Weekly Trends (Last 12 weeks shown)");
  doc.moveDown(0.5);

  const rows = data.weekly.slice(-12);
  doc.fontSize(9).fillColor("#334155").text("Week start | Avg confidence | Avg emotional load | Support flags | Training completions | Supervision sessions");
  doc.fillColor("#000000");
  for (const r of rows) {
    doc.text(
      `${new Date(r.weekStart).toLocaleDateString()} | ${r.avgConfidence == null ? "—" : r.avgConfidence.toFixed(2)} | ${
        r.avgEmotionalLoad == null ? "—" : r.avgEmotionalLoad.toFixed(2)
      } | ${r.supportFlags} | ${r.trainingCompletions} | ${r.supervisionSessions}`
    );
  }

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}
