import "dotenv/config";
import { app } from "./app.ts";

const port = process.env.PORT || "3000";

// Démarre un serveur
app.listen(port, () => {
  console.info(`🚀 Server started at http://localhost:${port}`);
});
