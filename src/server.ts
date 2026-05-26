import env from "./config/env.ts";
import { app } from "./app.ts";

// Démarre un serveur
app.listen(env.port, () => {
  console.info(`🚀 Server started at http://localhost:${env.port}`);
});
