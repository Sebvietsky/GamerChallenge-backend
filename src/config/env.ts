import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const env = {
  port: parseInt(process.env.PORT || "1234"),
  databaseUrl: requireEnv("DATABASE_URL"),
};

export default env;
