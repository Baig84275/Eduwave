import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function assertChildReadAccessOrThrow(user: { id: string; role: Role }, childId: string) {
  if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
    return;
  }
  if (user.role === Role.PARENT) {
    const exists = await prisma.child.findFirst({ where: { id: childId, parentId: user.id }, select: { id: true } });
    if (!exists) throw Object.assign(new Error("Not found"), { status: 404 });
    return;
  }
  if (user.role === Role.FACILITATOR) {
    const exists = await prisma.facilitatorAssignment.findFirst({
      where: { childId, facilitatorId: user.id },
      select: { id: true }
    });
    if (!exists) throw Object.assign(new Error("Not found"), { status: 404 });
    return;
  }
  throw Object.assign(new Error("Forbidden"), { status: 403 });
}

export async function assertChildWriteAccessOrThrow(user: { id: string; role: Role }, childId: string) {
  if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
    return;
  }
  if (user.role === Role.PARENT) {
    const exists = await prisma.child.findFirst({ where: { id: childId, parentId: user.id }, select: { id: true } });
    if (!exists) throw Object.assign(new Error("Not found"), { status: 404 });
    return;
  }
  if (user.role === Role.FACILITATOR) {
    const exists = await prisma.facilitatorAssignment.findFirst({
      where: { childId, facilitatorId: user.id },
      select: { id: true }
    });
    if (!exists) throw Object.assign(new Error("Not found"), { status: 404 });
    return;
  }
  throw Object.assign(new Error("Forbidden"), { status: 403 });
}

