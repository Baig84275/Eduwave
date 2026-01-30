import request from "supertest";
import { createApp } from "../src/app";
import { Role } from "@prisma/client";

const users: { id: string; email: string; passwordHash: string; role: Role }[] = [];

jest.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      user: {
        create: jest.fn(async ({ data, select }: any) => {
          const id = `u_${users.length + 1}`;
          const user = { id, email: data.email, passwordHash: data.passwordHash, role: data.role };
          users.push(user);
          if (select) {
            const picked: any = {};
            for (const k of Object.keys(select)) {
              picked[k] = (user as any)[k];
            }
            return picked;
          }
          return user;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return users.find((u) => u.email === where.email) ?? null;
        })
      }
    }
  };
});

describe("auth", () => {
  beforeEach(() => {
    users.length = 0;
  });

  test("register then login", async () => {
    process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.DATABASE_URL = "postgresql://example";
    process.env.ENCRYPTION_KEY_BASE64 = Buffer.alloc(32).toString("base64");

    const { app } = createApp();

    const reg = await request(app)
      .post("/auth/register")
      .send({ email: "parent@example.com", password: "password123", role: "PARENT" });
    expect(reg.status).toBe(200);
    expect(reg.body.accessToken).toBeTruthy();
    expect(reg.body.user.email).toBe("parent@example.com");

    const login = await request(app).post("/auth/login").send({ email: "parent@example.com", password: "password123" });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
  });
});

