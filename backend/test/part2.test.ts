import request from "supertest";
import { Role } from "@prisma/client";
import { createApp } from "../src/app";

jest.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      user: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn() },
      resource: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      facilitatorCheckIn: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
      },
      facilitatorAssignment: { findFirst: jest.fn() },
      supervisionLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn()
      },
      trainingModule: { upsert: jest.fn(), findMany: jest.fn() },
      trainingAssignment: { upsert: jest.fn(), findMany: jest.fn() },
      trainingCompletion: { upsert: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() }
    }
  };
});

import { prisma } from "../src/lib/prisma";

const prismaMock = prisma as any;

jest.mock("../src/middleware/auth", () => {
  return {
    requireAuth: (req: any, res: any, next: any) => {
      const role = req.header("x-test-role");
      const id = req.header("x-test-user-id") ?? "u_test";
      if (!role) return res.status(401).json({ error: "Unauthenticated" });
      req.user = { id, role };
      return next();
    }
  };
});

describe("part2 modules", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((model: any) => {
      Object.values(model).forEach((fn: any) => {
        if (typeof fn?.mockReset === "function") fn.mockReset();
      });
    });
  });

  test("resources: forbids parent, allows facilitator", async () => {
    prismaMock.resource.findMany.mockResolvedValueOnce([]);
    const { app } = createApp();

    const forbidden = await request(app).get("/resources").set("x-test-role", Role.PARENT);
    expect(forbidden.status).toBe(403);

    const ok = await request(app).get("/resources").set("x-test-role", Role.FACILITATOR);
    expect(ok.status).toBe(200);
    expect(ok.body.resources).toEqual([]);
  });

  test("check-ins: second submission in same period returns 409", async () => {
    prismaMock.facilitatorCheckIn.create
      .mockResolvedValueOnce({
        id: "c1",
        frequency: "DAILY",
        periodStart: new Date(),
        confidence: 3,
        emotionalLoad: 3,
        supportNeeded: "NONE",
        createdAt: new Date()
      })
      .mockRejectedValueOnce({ code: "P2002" });

    const { app } = createApp();

    const first = await request(app)
      .post("/check-ins")
      .set("x-test-role", Role.FACILITATOR)
      .send({ frequency: "DAILY", confidence: 3, emotionalLoad: 3, supportNeeded: "NONE" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/check-ins")
      .set("x-test-role", Role.FACILITATOR)
      .send({ frequency: "DAILY", confidence: 3, emotionalLoad: 3, supportNeeded: "NONE" });
    expect(second.status).toBe(409);
  });

  test("supervision acknowledge: forbids acknowledging someone else's log", async () => {
    prismaMock.supervisionLog.findUnique.mockResolvedValueOnce({
      id: "s1",
      facilitatorId: "u_owner",
      acknowledgedAt: null
    });

    const { app } = createApp();

    const res = await request(app)
      .post("/supervision-logs/s1/acknowledge")
      .set("x-test-role", Role.FACILITATOR)
      .set("x-test-user-id", "u_other")
      .send({});

    expect(res.status).toBe(403);
  });

  test("org overview: org admin without organisation returns 400", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ organisationId: null });

    const { app } = createApp();
    const res = await request(app).get("/org/overview").set("x-test-role", Role.ORG_ADMIN).set("x-test-user-id", "u_org");
    expect(res.status).toBe(400);
  });

  test("training: forbids parent access to training hub", async () => {
    const { app } = createApp();
    const res = await request(app).get("/training/my-modules").set("x-test-role", Role.PARENT);
    expect(res.status).toBe(403);
  });
});
