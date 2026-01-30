import dotenv from "dotenv";
import path from "node:path";
import { createApp } from "./app";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), override: true });

const { app, env } = createApp();

app.listen(env.PORT, () => {
  console.log(`EduWave backend listening on ${env.PORT}`);
});
