import express from "express";
import { type Express } from "express";
import mainRouter from "./routes/index.routes";

export const app: Express = express();

app.use(express.json());

app.use("/api", mainRouter);
