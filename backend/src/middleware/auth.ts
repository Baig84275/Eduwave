import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization header" });
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, deletedAt: true }
    });
    if (!user || user.deletedAt) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});
