import path from "node:path";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres@localhost:5433/leadm_test";

export async function prepareTestDatabase(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to reset "${database}": the test database name must end with _test.`,
    );
  }

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    await admin.unsafe(`drop database if exists "${database}" with (force)`);
    await admin.unsafe(`create database "${database}"`);
  } finally {
    await admin.end();
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, {
      migrationsFolder: path.resolve("db/migrations"),
    });
  } finally {
    await client.end();
  }

  return database;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const database = await prepareTestDatabase(url);
  console.log(`Prepared test database "${database}".`);
}
