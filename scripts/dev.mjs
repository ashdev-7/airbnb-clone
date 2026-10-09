// npm run dev: backend on :8000 and frontend on :3000, stopped together (plan §7.7).

import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { BACKEND, ROOT, uvCommand } from "./uv.mjs";

const [uv, ...uvPrefix] = uvCommand();

const SERVERS = [
  {
    name: "backend",
    command: uv,
    args: [...uvPrefix, "run", "uvicorn", "app.main:create_app", "--factory", "--reload", "--port", "8000"],
    cwd: BACKEND,
    shell: false,
  },
  // shell: true because npm is a .cmd file on Windows.
  { name: "frontend", command: "npm", args: ["run", "dev"], cwd: join(ROOT, "frontend"), shell: true },
];

let stopping = false;

/** Stops a server and everything it started (uvicorn's reloader, Next's workers). */
function kill(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;
  children.forEach(kill);
  process.exit(exitCode);
}

const children = SERVERS.map(({ name, command, args, cwd, shell }) => {
  const child = spawn(command, args, {
    cwd,
    shell,
    stdio: "inherit",
    // Its own process group on POSIX, so the whole group can be signalled.
    detached: process.platform !== "win32",
  });
  child.on("exit", (code) => {
    if (stopping) return;
    console.error(`\n${name} stopped (exit code ${code}); stopping the other server.`);
    stopAll(code ?? 1);
  });
  return child;
});

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
