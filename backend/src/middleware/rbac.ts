import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../audit/audit";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ADMIN) {
      return next();
    }
    if (!allowed.includes(req.user.role)) {
      void writeAuditEvent({
        prisma,
        req,
        actor: req.user,
        action: "rbac.deny",
        entityType: "Route",
        entityId: `${req.method} ${req.path}`,
        metadata: { allowedRoles: allowed, role: req.user.role }
      }).catch(() => {});
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
