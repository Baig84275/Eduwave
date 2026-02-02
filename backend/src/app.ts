import cors from "cors";
import express from "express";
import helmet from "helmet";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getEnv } from "./lib/env";
import { router } from "./routes";
import { uploadsRouter } from "./routes/uploads";

export function createApp() {
  const env = getEnv();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/uploads", uploadsRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use(router);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.issues });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "Already exists" });
      }
    }
    const status = typeof err === "object" && err && "status" in err ? (err as any).status : 500;
    const message = typeof err === "object" && err && "message" in err ? (err as any).message : "Internal Server Error";
    return res.status(status).json({ error: message });
  });

  return { app, env };
}
