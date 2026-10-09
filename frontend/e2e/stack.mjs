// Where the end-to-end stack runs. It is separate from `npm run dev` in every way: its own
// ports, its own database file and its own build folder, so the two can run side by side
// and a test run never touches development data.

export const BACKEND_PORT = 8100;
export const FRONTEND_PORT = 3100;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

/** Relative to backend/, where the backend runs. */
export const DATABASE_URL = "sqlite:///./data/e2e.db";

/** Relative to frontend/. Read by next.config.ts. */
export const DIST_DIR = ".next-e2e";

export const BACKEND_ENV = { DATABASE_URL };
export const FRONTEND_ENV = { BACKEND_URL, NEXT_DIST_DIR: DIST_DIR };
