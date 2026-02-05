import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { hashPassword, verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/jwt";
import { writeAuditEvent } from "../audit/audit";
import { verifyInvitationToken } from "../storage/invitationTokens";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([Role.PARENT, Role.FACILITATOR, Role.TEACHER, Role.THERAPIST]).optional(),
  invitationToken: z.string().min(1).optional()
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);
    let role: Role = body.role ?? Role.PARENT;

    let invitation: { id: string; invitedById: string; inviteeEmail: string; inviteeRole: Role; status: string; expiresAt: Date } | null =
      null;
    if (body.invitationToken) {
      const payload = verifyInvitationToken(body.invitationToken);
      invitation = await prisma.professionalInvitation.findUnique({
        where: { id: payload.invitationId },
        select: { id: true, invitedById: true, inviteeEmail: true, inviteeRole: true, status: true, expiresAt: true }
      });
      if (!invitation) return res.status(404).json({ error: "Invitation not found" });
      if (invitation.status !== "PENDING") return res.status(400).json({ error: "Invitation is not pending" });
      if (invitation.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Invitation expired" });
      if (invitation.inviteeEmail.toLowerCase() !== body.email.toLowerCase()) return res.status(400).json({ error: "Email does not match invitation" });
      if (invitation.inviteeRole !== payload.inviteeRole) return res.status(400).json({ error: "Invitation token mismatch" });
      role = invitation.inviteeRole;
    }

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        accessibilityMode: true,
        accessibilityConfig: true,
        language: true,
        facilitatorStatus: true,
        organisationId: true
      }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: null,
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role }
    });

    if (invitation) {
      await prisma.professionalInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() }
      });
      await prisma.professionalConnection.upsert({
        where: { parentId_professionalId: { parentId: invitation.invitedById, professionalId: user.id } },
        create: { parentId: invitation.invitedById, professionalId: user.id },
        update: {}
      });
      await writeAuditEvent({
        prisma,
        req,
        actor: null,
        action: "invitation.accept_via_register",
        entityType: "ProfessionalInvitation",
        entityId: invitation.id
      });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    res.json({ accessToken, user });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() }
    });
    if (!user || (user as any).deletedAt) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    await writeAuditEvent({
      prisma,
      req,
      actor: null,
      action: "auth.login",
      entityType: "User",
      entityId: user.id
    });
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accessibilityMode: user.accessibilityMode,
        accessibilityConfig: user.accessibilityConfig,
        language: user.language,
        facilitatorStatus: user.facilitatorStatus,
        organisationId: user.organisationId
      }
    });
  })
);
