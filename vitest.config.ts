import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Configuration globale des tests
    globals: true,
    environment: "node", // Très important pour Express
  },
});
