import env from "./config/env.ts";
import { app } from "./app.ts";

app.listen(env.port, () => {
  console.info(`🚀 Server started at http://localhost:${env.port}`);
});
