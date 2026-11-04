import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_TEST_DATABASE_URL,
  prepareTestDatabase,
} from "./prepare-test-db.mjs";

const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
const database = await prepareTestDatabase(url);
console.log(`Prepared test database "${database}".`);

const result = spawnSync(
  process.execPath,
  [path.resolve("node_modules/vitest/vitest.mjs"), "run"],
  {
    stdio: "inherit",
    env: { ...process.env, TEST_DATABASE_URL: url },
  },
);

process.exit(result.status ?? 1);
