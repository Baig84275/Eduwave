import { Prisma, PrismaClient, Role } from "@prisma/client";
import { Request } from "express";

export async function writeAuditEvent(options: {
  prisma: PrismaClient;
  req: Request;
  actor: { id: string; role: Role } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const ip = options.req.ip;
  const userAgent = options.req.header("user-agent") ?? undefined;
  await options.prisma.auditEvent.create({
    data: {
      actorId: options.actor?.id ?? null,
      actorRole: options.actor?.role ?? null,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ?? null,
      metadata: options.metadata ?? undefined,
      ip,
      userAgent
    }
  });
}
