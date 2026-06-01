import express from "express";
import { type Express } from "express";
import mainRouter from "./routes/index.routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import cors from "cors";
import env from "./config/env";
import cookieParser from "cookie-parser";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";

export const app: Express = express();

app.use(express.json());

app.use(
  cors({
    origin: env.allowedOrigins,
    // => Autorise les cookies cross origin (back -> front car origin différent)
    // On a besoin d'ajouter credentials dans fetch => fetch(url, { credentials: 'include' });
    // Ce qui permet d'envoyer les cookies d'autorisation au serveur
    // Le back renvoie un header Access-Control-Allow-Credentials
    // Ce qui autorise le front à exposer le JS
    credentials: true,
  }),
);

app.use(cookieParser());

app.use("/api", mainRouter);

app.use(notFoundMiddleware);
app.use(globalErrorHandler);
