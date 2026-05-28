import express from "express";
import { type Express } from "express";
import mainRouter from "./routes/index.routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";

export const app: Express = express();

app.use(express.json());

app.use("/api", mainRouter);

app.use(globalErrorHandler);
