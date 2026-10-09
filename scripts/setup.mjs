// npm run setup: install both halves and create the local .env files (plan §7.7).
// Safe to run again: existing .env files, and the SECRET_KEY inside, are left alone.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BACKEND, ROOT, runUv } from "./uv.mjs";

const FRONTEND = join(ROOT, "frontend");

function step(title) {
  console.log(`\n== ${title}`);
}

function createEnvFile(directory, name, transform = (text) => text) {
  const target = join(directory, name);
  if (existsSync(target)) {
    console.log(`${target} already exists, left unchanged`);
    return;
  }
  writeFileSync(target, transform(readFileSync(join(directory, ".env.example"), "utf8")));
  console.log(`created ${target}`);
}

step("Backend dependencies (uv sync)");
if (runUv(["sync"]) !== 0) process.exit(1);

step("Frontend dependencies (npm install)");
// shell: true because npm is a .cmd file on Windows.
const npm = spawnSync("npm", ["install"], { cwd: FRONTEND, stdio: "inherit", shell: true });
if (npm.status !== 0) process.exit(npm.status ?? 1);

step("Environment files");
createEnvFile(BACKEND, ".env", (text) =>
  text.replace(/^SECRET_KEY=.*$/m, `SECRET_KEY=${randomBytes(32).toString("hex")}`),
);
createEnvFile(FRONTEND, ".env.local");

console.log("\nSetup complete. Start both servers with: npm run dev");
