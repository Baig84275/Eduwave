import { AdminPermission, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";

export function requirePermission(permission: AdminPermission) {
  return asyncHandler(async (req, res, next) => {
    const user = req.user!;
    if (user.role === Role.SUPER_ADMIN) return next();

    const found = await prisma.userPermission.findUnique({
      where: { userId_permission: { userId: user.id, permission } },
      select: { id: true }
    });
    if (!found) return res.status(403).json({ error: "Forbidden" });
    return next();
  });
}

