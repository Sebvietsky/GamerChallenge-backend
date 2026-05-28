import express from "express";
import { type Express } from "express";
import mainRouter from "./routes/index.routes";
import cors from "cors";
import env from "./config/env";
import cookieParser from "cookie-parser";

export const app: Express = express();

app.use(express.json());

app.use(
  cors({
    origin: env.allowedOrigins,
    // => Autorise les cookies cross origin (back -> front car port différent)
    // Import un header dans fetch => fetch(url, { credentials: 'include' });
    credentials: true,
  }),
);

app.use(cookieParser());

app.use("/api", mainRouter);
