import { Router } from "express";
import { InvitationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { getEnv } from "../lib/env";
import { sendEmail } from "../lib/email";
import { signInvitationToken, verifyInvitationToken } from "../storage/invitationTokens";
import { writeAuditEvent } from "../audit/audit";

export const invitationsRouter = Router();

const createSchema = z.object({
  inviteeEmail: z.string().email(),
  inviteeRole: z.enum([Role.FACILITATOR, Role.TEACHER, Role.THERAPIST]),
  message: z.string().min(1).max(800).optional()
});

function nowPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function getRequesterEmail(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return u?.email ?? null;
}

async function expireIfNeeded(invitationId: string) {
  const inv = await prisma.professionalInvitation.findUnique({ where: { id: invitationId } });
  if (!inv) return null;
  if (inv.status === InvitationStatus.PENDING && inv.expiresAt.getTime() < Date.now()) {
    return prisma.professionalInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.EXPIRED }
    });
  }
  return inv;
}

// This route is used by email deep links before a user is authenticated.
// It provides only minimal invitation context, protected by a signed token.
invitationsRouter.get(
  "/public",
  asyncHandler(async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) return res.status(400).json({ error: "token is required" });

    let payload: { invitationId: string; inviteeEmail: string; inviteeRole: Role };
    try {
      payload = verifyInvitationToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const inv = await expireIfNeeded(payload.invitationId);
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (inv.inviteeEmail.toLowerCase() !== payload.inviteeEmail.toLowerCase()) return res.status(401).json({ error: "Invalid token" });
    if (inv.inviteeRole !== payload.inviteeRole) return res.status(401).json({ error: "Invalid token" });

    const user = await prisma.user.findUnique({ where: { email: payload.inviteeEmail.toLowerCase() }, select: { id: true } });
    res.json({
      invitation: {
        id: inv.id,
        inviteeEmail: inv.inviteeEmail,
        inviteeRole: inv.inviteeRole,
        status: inv.status,
        message: inv.message,
        expiresAt: inv.expiresAt
      },
      userExists: Boolean(user)
    });
  })
);

invitationsRouter.use(requireAuth);

invitationsRouter.post(
  "/",
  requireRole(Role.PARENT),
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const requesterEmail = await getRequesterEmail(requester.id);
    if (!requesterEmail) return res.status(401).json({ error: "Invalid session" });
    const body = createSchema.parse(req.body);
    const inviteeEmail = body.inviteeEmail.toLowerCase();

    if (inviteeEmail === requesterEmail.toLowerCase()) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: inviteeEmail }, select: { id: true, role: true } });
    if (existingUser) {
      if (existingUser.role !== body.inviteeRole) {
        return res.status(400).json({ error: "A user already exists with that email but has a different role" });
      }

      const connection = await prisma.professionalConnection.upsert({
        where: { parentId_professionalId: { parentId: requester.id, professionalId: existingUser.id } },
        create: { parentId: requester.id, professionalId: existingUser.id },
        update: {},
        select: { id: true, parentId: true, professionalId: true, createdAt: true }
      });

      await writeAuditEvent({
        prisma,
        req,
        actor: requester,
        action: "invitation.auto_link",
        entityType: "ProfessionalConnection",
        entityId: connection.id,
        metadata: { inviteeEmail, inviteeRole: body.inviteeRole }
      });

      return res.json({ linked: true, connection });
    }

    const pending = await prisma.professionalInvitation.findFirst({
      where: {
        invitedById: requester.id,
        inviteeEmail,
        inviteeRole: body.inviteeRole,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      select: { id: true, status: true, expiresAt: true }
    });
    if (pending) {
      return res.status(409).json({ error: "An invitation is already pending for this email and role" });
    }

    const expiresAt = nowPlusDays(getEnv().INVITATION_EXPIRY_DAYS);
    const invitation = await prisma.professionalInvitation.create({
      data: {
        invitedById: requester.id,
        inviteeEmail,
        inviteeRole: body.inviteeRole,
        message: body.message ?? null,
        expiresAt
      },
      select: { id: true, inviteeEmail: true, inviteeRole: true, status: true, message: true, expiresAt: true, createdAt: true }
    });

    const token = signInvitationToken({
      invitationId: invitation.id,
      inviteeEmail: invitation.inviteeEmail,
      inviteeRole: invitation.inviteeRole
    });
    const link = `${getEnv().MOBILE_INVITE_DEEP_LINK_BASE}?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: invitation.inviteeEmail,
      subject: `You've been invited to join a support team on EduWave Village`,
      text: `You have been invited to join a support team on EduWave Village.\n\nRole: ${invitation.inviteeRole}\nExpires: ${invitation.expiresAt.toDateString()}\n\nOpen: ${link}\n`
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "invitation.create",
      entityType: "ProfessionalInvitation",
      entityId: invitation.id,
      metadata: { inviteeEmail, inviteeRole: invitation.inviteeRole }
    });

    res.json({ invitation, link });
  })
);

invitationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const requesterEmail = await getRequesterEmail(requester.id);
    if (!requesterEmail) return res.status(401).json({ error: "Invalid session" });
    const type = typeof req.query.type === "string" ? req.query.type : "received";

    if (type === "sent") {
      const invitations = await prisma.professionalInvitation.findMany({
        where: { invitedById: requester.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, inviteeEmail: true, inviteeRole: true, status: true, message: true, expiresAt: true, createdAt: true, updatedAt: true }
      });
      return res.json({ invitations });
    }

    if (type === "received") {
      const invitations = await prisma.professionalInvitation.findMany({
        where: { inviteeEmail: requesterEmail.toLowerCase() },
        orderBy: { createdAt: "desc" },
        select: { id: true, inviteeEmail: true, inviteeRole: true, status: true, message: true, expiresAt: true, createdAt: true, updatedAt: true }
      });
      return res.json({ invitations });
    }

    if (type === "all" && requester.role === Role.SUPER_ADMIN) {
      const invitations = await prisma.professionalInvitation.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, invitedById: true, inviteeEmail: true, inviteeRole: true, status: true, expiresAt: true, createdAt: true, updatedAt: true }
      });
      return res.json({ invitations });
    }

    return res.status(400).json({ error: "Invalid type" });
  })
);

invitationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const requesterEmail = await getRequesterEmail(requester.id);
    if (!requesterEmail) return res.status(401).json({ error: "Invalid session" });
    const id = req.params.id;
    const invitation = await prisma.professionalInvitation.findUnique({
      where: { id },
      select: {
        id: true,
        invitedById: true,
        inviteeEmail: true,
        inviteeRole: true,
        status: true,
        message: true,
        expiresAt: true,
        acceptedAt: true,
        rejectedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!invitation) return res.status(404).json({ error: "Not found" });
    if (
      requester.role !== Role.SUPER_ADMIN &&
      invitation.invitedById !== requester.id &&
      invitation.inviteeEmail.toLowerCase() !== requesterEmail.toLowerCase()
    ) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ invitation });
  })
);

async function acceptOrReject(req: any, res: any, decision: "accept" | "reject") {
  const requester = req.user!;
  const requesterEmail = await getRequesterEmail(requester.id);
  if (!requesterEmail) return res.status(401).json({ error: "Invalid session" });
  const id = req.params.id;
  const inv = await expireIfNeeded(id);
  if (!inv) return res.status(404).json({ error: "Not found" });

  if (inv.inviteeEmail.toLowerCase() !== requesterEmail.toLowerCase()) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (inv.status !== InvitationStatus.PENDING) {
    return res.status(400).json({ error: "Invitation is not pending" });
  }
  if (requester.role !== inv.inviteeRole) {
    return res.status(400).json({ error: "Your role does not match the invitation role" });
  }

  const nextStatus = decision === "accept" ? InvitationStatus.ACCEPTED : InvitationStatus.REJECTED;
  const updated = await prisma.professionalInvitation.update({
    where: { id },
    data: {
      status: nextStatus,
      acceptedAt: decision === "accept" ? new Date() : null,
      rejectedAt: decision === "reject" ? new Date() : null
    },
    select: { id: true, invitedById: true, inviteeEmail: true, inviteeRole: true, status: true, acceptedAt: true, rejectedAt: true }
  });

  if (decision === "accept") {
    await prisma.professionalConnection.upsert({
      where: { parentId_professionalId: { parentId: updated.invitedById, professionalId: requester.id } },
      create: { parentId: updated.invitedById, professionalId: requester.id },
      update: {}
    });
  }

  await writeAuditEvent({
    prisma,
    req,
    actor: requester,
    action: decision === "accept" ? "invitation.accept" : "invitation.reject",
    entityType: "ProfessionalInvitation",
    entityId: updated.id
  });

  res.json({ invitation: updated });
}

invitationsRouter.patch(
  "/:id/accept",
  asyncHandler(async (req, res) => acceptOrReject(req, res, "accept"))
);

invitationsRouter.patch(
  "/:id/reject",
  asyncHandler(async (req, res) => acceptOrReject(req, res, "reject"))
);

invitationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const requester = req.user!;
    const id = req.params.id;
    const inv = await expireIfNeeded(id);
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (inv.invitedById !== requester.id && requester.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (inv.status !== InvitationStatus.PENDING) {
      return res.status(400).json({ error: "Only pending invitations can be cancelled" });
    }
    const cancelled = await prisma.professionalInvitation.update({
      where: { id },
      data: { status: InvitationStatus.EXPIRED, expiresAt: new Date() },
      select: { id: true, status: true, expiresAt: true }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: requester,
      action: "invitation.cancel",
      entityType: "ProfessionalInvitation",
      entityId: cancelled.id
    });
    res.json({ invitation: cancelled });
  })
);
