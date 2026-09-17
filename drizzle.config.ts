import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Allowed at config-parse time so `db:generate` works without a live DB.
  // `db:migrate` and `db:push` will fail fast if this is still unset.
  console.warn("[drizzle.config] DATABASE_URL is not set — generate-only mode");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder/placeholder",
  },
  verbose: true,
  strict: true,
});
