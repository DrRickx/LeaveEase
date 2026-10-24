// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts", // adjust to your path
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL!,
  },
});

console.log(
  "migrate host:",
  new URL(process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL!).host,
  new URL(process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL!).port,
);
