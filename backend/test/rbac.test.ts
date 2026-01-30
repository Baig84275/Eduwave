import express from "express";
import request from "supertest";
import { requireRole } from "../src/middleware/rbac";
import { Role } from "@prisma/client";

describe("rbac", () => {
  test("forbids when role not allowed", async () => {
    const app = express();
    app.get(
      "/x",
      (req, _res, next) => {
        req.user = { id: "u1", role: Role.PARENT };
        next();
      },
      requireRole(Role.ADMIN),
      (_req, res) => res.json({ ok: true })
    );

    const res = await request(app).get("/x");
    expect(res.status).toBe(403);
  });
});

