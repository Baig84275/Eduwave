import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../audit/audit";

// ─── Role group constants ─────────────────────────────────────────────────────
// Use these in requireRole() calls instead of repeating the full list each time.

/** All authenticated staff — everyone except PARENT. */
export const STAFF_ROLES = [
  Role.FACILITATOR,
  Role.TEACHER,
  Role.THERAPIST,
  Role.TRAINER_SUPERVISOR,
  Role.ORG_ADMIN,
  Role.ADMIN,
  Role.SUPER_ADMIN,
] as const;

/** Supervisory and admin roles — can manage facilitators and org data. */
export const MANAGER_ROLES = [
  Role.TRAINER_SUPERVISOR,
  Role.ORG_ADMIN,
  Role.ADMIN,
  Role.SUPER_ADMIN,
] as const;

/** Platform admins only. */
export const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN] as const;

/** Supervisor-level roles — can review check-ins, supervision logs, training. */
export const SUPERVISOR_ROLES = [
  Role.TRAINER_SUPERVISOR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
] as const;

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Allow the given roles through. ADMIN and SUPER_ADMIN always pass — they are
 * superusers for all normal routes. Use `requireSuperAdmin` where strictly only
 * SUPER_ADMIN should be allowed.
 */
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
        metadata: { allowedRoles: allowed, role: req.user.role },
      }).catch(() => {});
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

/**
 * Strictly SUPER_ADMIN only — does NOT grant ADMIN access.
 * Use for permission management and role escalation endpoints.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== Role.SUPER_ADMIN) {
    void writeAuditEvent({
      prisma,
      req,
      actor: req.user ?? { id: "anonymous", role: Role.PARENT },
      action: "rbac.deny",
      entityType: "Route",
      entityId: `${req.method} ${req.path}`,
      metadata: { requiredRole: "SUPER_ADMIN", role: req.user?.role ?? null },
    }).catch(() => {});
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}
