import { Router } from "express";
import { ResourceCategory, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditEvent } from "../audit/audit";
import { toSignedUploadUrl, toUploadKey } from "../storage/uploads";

export const resourcesRouter = Router();

resourcesRouter.use(requireAuth);

const listQuerySchema = z.object({
  q: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  town: z.string().min(1).optional(),
  category: z.nativeEnum(ResourceCategory).optional(),
  tags: z.string().min(1).optional()
});

const nearQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(200).default(50),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  town: z.string().min(1).optional(),
  category: z.nativeEnum(ResourceCategory).optional()
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sLat1 = Math.sin(dLat / 2);
  const sLng1 = Math.sin(dLng / 2);
  const aa =
    sLat1 * sLat1 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sLng1 * sLng1;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(aa)));
}

function toSignedAssetUrl(value: string | null, user: { id: string; role: Role }): string | null {
  if (!value) return null;
  const uploadKey = toUploadKey(value);
  return toSignedUploadUrl({ uploadKey, userId: user.id, role: user.role });
}

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(200).default(50),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  town: z.string().min(1).optional(),
  category: z.nativeEnum(ResourceCategory).optional()
});

resourcesRouter.get(
  "/near",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const query = nearQuerySchema.parse(req.query);
    const latDelta = query.radiusKm / 111;
    const lngDelta = query.radiusKm / (111 * Math.max(0.2, Math.cos((query.lat * Math.PI) / 180)));

    const candidates = await prisma.resource.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.province ? { province: { equals: query.province, mode: "insensitive" } } : {}),
        ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
        ...(query.town ? { town: { equals: query.town, mode: "insensitive" } } : {}),
        latitude: { not: null, gte: query.lat - latDelta, lte: query.lat + latDelta },
        longitude: { not: null, gte: query.lng - lngDelta, lte: query.lng + lngDelta }
      },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true
      }
    });

    const resources = candidates
      .map((r) => ({
        ...r,
        imageUrl: toSignedAssetUrl(r.imageUrl ?? null, user),
        logoUrl: toSignedAssetUrl(r.logoUrl ?? null, user),
        distanceKm: haversineKm({ lat: query.lat, lng: query.lng }, { lat: r.latitude!, lng: r.longitude! })
      }))
      .filter((r) => r.distanceKm <= query.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ resources });
  })
);

resourcesRouter.get(
  "/nearby",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const query = nearbyQuerySchema.parse(req.query);
    const latDelta = query.radius / 111;
    const lngDelta = query.radius / (111 * Math.max(0.2, Math.cos((query.lat * Math.PI) / 180)));

    const candidates = await prisma.resource.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.province ? { province: { equals: query.province, mode: "insensitive" } } : {}),
        ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
        ...(query.town ? { town: { equals: query.town, mode: "insensitive" } } : {}),
        latitude: { not: null, gte: query.lat - latDelta, lte: query.lat + latDelta },
        longitude: { not: null, gte: query.lng - lngDelta, lte: query.lng + lngDelta }
      },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true
      }
    });

    const resources = candidates
      .map((r) => {
        const distance = haversineKm({ lat: query.lat, lng: query.lng }, { lat: r.latitude!, lng: r.longitude! });
        return {
          ...r,
          imageUrl: toSignedAssetUrl(r.imageUrl ?? null, user),
          logoUrl: toSignedAssetUrl(r.logoUrl ?? null, user),
          distance,
          distanceKm: distance
        };
      })
      .filter((r) => r.distance <= query.radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({ resources });
  })
);

resourcesRouter.get(
  "/",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const query = listQuerySchema.parse(req.query);
    const tags = query.tags ? query.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    const resources = await prisma.resource.findMany({
      where: {
        ...(query.province ? { province: { equals: query.province, mode: "insensitive" } } : {}),
        ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
        ...(query.town ? { town: { equals: query.town, mode: "insensitive" } } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(tags.length ? { tags: { hasEvery: tags } } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { city: { contains: query.q, mode: "insensitive" } },
                { town: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      resources: resources.map((r) => ({
        ...r,
        imageUrl: toSignedAssetUrl(r.imageUrl ?? null, user),
        logoUrl: toSignedAssetUrl(r.logoUrl ?? null, user)
      }))
    });
  })
);

const townsQuerySchema = z.object({
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  q: z.string().min(1).optional()
});

resourcesRouter.get(
  "/towns",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const query = townsQuerySchema.parse(req.query);
    const rows = await prisma.resource.findMany({
      where: {
        town: { not: null },
        ...(query.province ? { province: { equals: query.province, mode: "insensitive" } } : {}),
        ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
        ...(query.q ? { town: { contains: query.q, mode: "insensitive" } } : {})
      },
      distinct: ["town"],
      select: { town: true },
      orderBy: { town: "asc" }
    });
    res.json({ towns: rows.map((r) => r.town).filter((t): t is string => typeof t === "string" && t.length > 0) });
  })
);

const geocodeQuerySchema = z.object({ address: z.string().min(5) });

resourcesRouter.get(
  "/geocode",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const query = geocodeQuerySchema.parse(req.query);
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query.address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const r = await fetch(url.toString(), {
      headers: { "user-agent": "eduwave-village/1.0 (geocoding)" }
    });
    if (!r.ok) {
      return res.status(502).json({ error: "Geocoding service unavailable" });
    }
    const json: any = await r.json().catch(() => []);
    const first = Array.isArray(json) ? json[0] : null;
    if (!first?.lat || !first?.lon) return res.status(404).json({ error: "No result" });
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(404).json({ error: "No result" });
    res.json({ latitude, longitude });
  })
);

resourcesRouter.get(
  "/:resourceId",
  requireRole(Role.FACILITATOR, Role.TRAINER_SUPERVISOR, Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const resourceId = req.params.resourceId;
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!resource) return res.status(404).json({ error: "Not found" });
    res.json({
      resource: {
        ...resource,
        imageUrl: toSignedAssetUrl(resource.imageUrl ?? null, user),
        logoUrl: toSignedAssetUrl(resource.logoUrl ?? null, user)
      }
    });
  })
);

const upsertResourceSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(ResourceCategory),
  province: z.string().min(1),
  city: z.string().min(1),
  town: z.string().min(1).optional().nullable(),
  address: z.string().min(1).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  logoUrl: z.string().min(1).optional().nullable(),
  iconCategory: z.string().min(1).optional().nullable(),
  contactInfo: z.string().min(1).optional().nullable(),
  description: z.string().min(1).optional().nullable(),
  tags: z.array(z.string().min(1)).optional()
});

const patchResourceSchema = upsertResourceSchema.partial();

resourcesRouter.post(
  "/",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const body = upsertResourceSchema.parse(req.body);
    const userId = user.id;
    const resource = await prisma.resource.create({
      data: {
        name: body.name,
        category: body.category,
        province: body.province,
        city: body.city,
        town: body.town ?? null,
        address: body.address ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        imageUrl: body.imageUrl ?? null,
        logoUrl: body.logoUrl ?? null,
        iconCategory: body.iconCategory ?? null,
        contactInfo: body.contactInfo ?? null,
        description: body.description ?? null,
        tags: body.tags ?? [],
        createdById: userId
      },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "resource.create",
      entityType: "Resource",
      entityId: resource.id,
      metadata: { category: resource.category, province: resource.province, city: resource.city, town: resource.town ?? null }
    });
    res.json({ resource: { ...resource, imageUrl: toSignedAssetUrl(resource.imageUrl ?? null, user), logoUrl: toSignedAssetUrl(resource.logoUrl ?? null, user) } });
  })
);

resourcesRouter.put(
  "/:resourceId",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const resourceId = req.params.resourceId;
    const body = upsertResourceSchema.parse(req.body);
    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: body.name,
        category: body.category,
        province: body.province,
        city: body.city,
        town: body.town ?? null,
        address: body.address ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        imageUrl: body.imageUrl ?? null,
        logoUrl: body.logoUrl ?? null,
        iconCategory: body.iconCategory ?? null,
        contactInfo: body.contactInfo ?? null,
        description: body.description ?? null,
        tags: body.tags ?? []
      },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });
    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "resource.update",
      entityType: "Resource",
      entityId: resource.id,
      metadata: { category: resource.category, province: resource.province, city: resource.city, town: resource.town ?? null }
    });
    res.json({ resource: { ...resource, imageUrl: toSignedAssetUrl(resource.imageUrl ?? null, user), logoUrl: toSignedAssetUrl(resource.logoUrl ?? null, user) } });
  })
);

resourcesRouter.delete(
  "/:resourceId",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const resourceId = req.params.resourceId;
    await prisma.resource.delete({ where: { id: resourceId } });
    await writeAuditEvent({
      prisma,
      req,
      actor: req.user!,
      action: "resource.delete",
      entityType: "Resource",
      entityId: resourceId
    });
    res.json({ ok: true });
  })
);

resourcesRouter.patch(
  "/:resourceId",
  requireRole(Role.ORG_ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const resourceId = req.params.resourceId;
    const body = patchResourceSchema.parse(req.body);
    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.province !== undefined ? { province: body.province } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.town !== undefined ? { town: body.town ?? null } : {}),
        ...(body.address !== undefined ? { address: body.address ?? null } : {}),
        ...(body.latitude !== undefined ? { latitude: body.latitude ?? null } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude ?? null } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ?? null } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl ?? null } : {}),
        ...(body.iconCategory !== undefined ? { iconCategory: body.iconCategory ?? null } : {}),
        ...(body.contactInfo !== undefined ? { contactInfo: body.contactInfo ?? null } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.tags !== undefined ? { tags: body.tags ?? [] } : {})
      },
      select: {
        id: true,
        name: true,
        category: true,
        province: true,
        city: true,
        town: true,
        address: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        logoUrl: true,
        iconCategory: true,
        contactInfo: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await writeAuditEvent({
      prisma,
      req,
      actor: user,
      action: "resource.patch",
      entityType: "Resource",
      entityId: resource.id
    });
    res.json({ resource: { ...resource, imageUrl: toSignedAssetUrl(resource.imageUrl ?? null, user), logoUrl: toSignedAssetUrl(resource.logoUrl ?? null, user) } });
  })
);
