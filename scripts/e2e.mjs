// npm run e2e: the Playwright journeys against a freshly seeded stack (plan §7.7, §13).
//
// 1. Seeds the end-to-end database (its own file, not the development one).
// 2. Builds the frontend into its own folder, pointed at the end-to-end backend.
// 3. Runs Playwright, which starts both servers, runs the tests and stops the servers.
//
// Extra arguments go to Playwright:  npm run e2e -- e2e/search.spec.ts --headed

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { BACKEND_ENV, FRONTEND_ENV } from "../frontend/e2e/stack.mjs";
import { BACKEND, ROOT, uvCommand } from "./uv.mjs";

const FRONTEND = join(ROOT, "frontend");

function run(title, command, args, cwd, env, shell = false) {
  console.log(`\n── ${title}`);
  const result = spawnSync(command, args, {
    cwd,
    shell,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const [uv, ...uvPrefix] = uvCommand();

run("Seeding the end-to-end database", uv, [...uvPrefix, "run", "python", "-m", "app.seed"], BACKEND, BACKEND_ENV);
// shell: true because npx is a .cmd file on Windows.
run("Building the frontend", "npx", ["next", "build"], FRONTEND, FRONTEND_ENV, true);
run("Running Playwright", "npx", ["playwright", "test", ...process.argv.slice(2)], FRONTEND, {}, true);
