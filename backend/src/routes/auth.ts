import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { hashPassword, verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/jwt";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([Role.PARENT, Role.FACILITATOR]).optional()
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const role = body.role ?? Role.PARENT;

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        role
      },
      select: { id: true, email: true, role: true, accessibilityMode: true }
    });

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
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role, accessibilityMode: user.accessibilityMode }
    });
  })
);
