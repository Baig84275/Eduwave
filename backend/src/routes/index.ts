import { Router } from "express";
import { authRouter } from "./auth";
import { childrenRouter } from "./children";
import { progressRouter } from "./progress";
import { adminRouter } from "./admin";
import { usersRouter } from "./users";

export const router = Router();

router.use("/auth", authRouter);
router.use("/children", childrenRouter);
router.use("/progress", progressRouter);
router.use("/admin", adminRouter);
router.use("/users", usersRouter);
