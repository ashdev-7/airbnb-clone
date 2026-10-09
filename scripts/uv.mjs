// Runs uv inside backend/, wherever uv happens to be installed.
//   node scripts/uv.mjs run pytest
// A standalone `uv` on PATH is preferred; `pip install uv` puts it behind `python -m uv`.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const BACKEND = fileURLToPath(new URL("../backend", import.meta.url));

const CANDIDATES = [
  ["uv"],
  ["python", "-m", "uv"],
  ["python3", "-m", "uv"],
  ["py", "-m", "uv"],
];

let found;

/** The command (program and leading arguments) that starts uv on this machine. */
export function uvCommand() {
  if (found) return found;
  found = CANDIDATES.find(
    ([program, ...args]) =>
      spawnSync(program, [...args, "--version"], { stdio: "ignore" }).status === 0,
  );
  if (!found) {
    console.error(
      "uv was not found. Install it (https://docs.astral.sh/uv/ or `pip install uv`) and retry.",
    );
    process.exit(1);
  }
  return found;
}

/** Runs `uv <args>` in backend/ and returns its exit code. */
export function runUv(args) {
  const [program, ...prefix] = uvCommand();
  const result = spawnSync(program, [...prefix, ...args], { cwd: BACKEND, stdio: "inherit" });
  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runUv(process.argv.slice(2)));
}
