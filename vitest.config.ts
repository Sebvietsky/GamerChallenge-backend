import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Les specs partagent la même base de données de test :
    // on désactive la parallélisation pour éviter les conflits entre fichiers.
    fileParallelism: false,
    // Nettoyage global de la DB avant le démarrage de la suite de tests.
    globalSetup: ["src/tests/globalSetup.ts"],
  },
});
