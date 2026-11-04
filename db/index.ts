import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      break;
    } catch {
      // file may not exist
    }
  }
}

const connectionString = process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env/.env.local and restart the server.",
  );
}

function createDb() {
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
  });
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  __leadmDb?: Database;
  __leadmDbUrl?: string;
};

const cachedDb =
  globalForDb.__leadmDb && globalForDb.__leadmDbUrl === connectionString
    ? globalForDb.__leadmDb
    : createDb();

export const db = cachedDb;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__leadmDb = db;
  globalForDb.__leadmDbUrl = connectionString;
}

export * as schema from "./schema";
