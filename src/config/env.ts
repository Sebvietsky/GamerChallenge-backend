import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const env = {
  port: parseInt(process.env.PORT || "1234"),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  nodeEnv: requireEnv("NODE_ENV"),
  // Liste d'origines separees par des virgules. On retire les slashs finaux :
  // un navigateur envoie toujours son Origin sans slash, alors qu'une URL
  // copiee depuis la barre d'adresse en porte un, ce qui ferait echouer la
  // comparaison. Le || "*" precedent etait mort : requireEnv leve deja si vide.
  allowedOrigins: requireEnv("ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  igdbClientId: requireEnv("IGDB_CLIENT_ID"),
  igdbClientSecret: requireEnv("IGDB_CLIENT_SECRET"),
};

export default env;
