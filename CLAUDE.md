# CLAUDE.md

Working rules for this repository. The full specification is `PROJECT_PLAN.md`; read it before any work and treat it as the source of truth.

## What this is

AirStay: a functional clone of the Airbnb web app for a graded full-stack assignment. Next.js (TypeScript) frontend, FastAPI backend, SQLite. Developed locally first; deployment is the last phase.

Locale: it mirrors Airbnb's India site (airbnb.co.in): English (IN), prices in ₹ stored as integer paise, business date in `Asia/Kolkata`.

## Files to know

| File | Role |
|---|---|
| `PROJECT_PLAN.md` | Scope, design, rules, phases |
| `docs/AIRBNB_REFERENCE.md` | Every verified fact about Airbnb, with its source (`REF-…`) |
| `docs/CAPTURE_GUIDE.md` | The captures (`A1`, `B1`, …) that define the visual design |
| `reference/` | The captures themselves: screenshots and measurement JSON. Git-ignored; never commit |
| `docs/parity-notes.md` | Values read from the captures and used in the build |
| `tools/measure.js` | The script that produces the measurement JSON |

## Order of authority

1. The assignment (traced in `PROJECT_PLAN.md` §2). Scope comes only from here. Where it clashes with Airbnb's current site, the assignment wins (§4.2).
2. `docs/AIRBNB_REFERENCE.md` and the captures. They decide how in-scope elements look and behave.
3. `PROJECT_PLAN.md`.

**Never fill a gap about Airbnb from your own memory.** If something is not in the reference file or a capture, build the function with existing primitives, list it as "pending capture" in the phase report, and ask.

## The loop for every phase

1. Read `PROJECT_PLAN.md` and find the first unticked phase in §15. Work on that phase only.
2. `git status` must be clean.
3. Restate the scope, list the files you will touch, and write the acceptance tests first.
4. Implement.
5. Run `npm run check`. Fix failures.
6. Verify the acceptance criteria by running the app.
7. Write the end-of-phase report (§16), including a plain-language walkthrough of the code.
8. Commit, tick the phase in §15, add a line to §19 if anything in the plan changed.
9. Stop and wait for sign-off. Do not start the next phase unasked.

## Hard rules

- Build nothing that is not in §3 of the plan. Report useful extras; do not implement them.
- One home per rule: overlap in `backend/app/bookings/availability.py`, money in `backend/app/bookings/pricing.py`, guest limits in `backend/app/bookings/guests.py`, today's date in `backend/app/core/clock.py`, page-URL parameters in `frontend/lib/search-params.ts`, date rules in `frontend/lib/dates.ts`, guest rules in `frontend/lib/guests.ts`.
- Backend layering: router → service → repository → models. Services own transactions. Every mutating request uses the write session (`BEGIN IMMEDIATE`).
- The server is authoritative for availability, prices, ownership and identity. Never trust a total, a host id or a guest id from the client.
- Frontend: no `fetch` outside `frontend/lib/api/`; no price or date arithmetic in components; search state lives in the URL.
- Do not add a dependency that is not in §7.3 without recording it in §19.
- Do not weaken or delete a test to make it pass.
- Three failed attempts at the same fix, or changes spreading outside the phase: stop, report causes and evidence, reset to the last good commit, reimplement cleanly.

## Parity rules

- Build each UI element from its capture: read the screenshot, take numbers from the measurement JSON (`style`, `rootVariables`, `fonts`, `link.target`), record the values you use in `docs/parity-notes.md`.
- Link targets, results per page, guest limits and URL parameter names are settled by the captures (plan §6.14), not assumed.
- Never copy Airbnb's source, stylesheets, fonts, icons, logo or photos into the repository.
- The product is **AirStay** (`SITE_NAME` in `frontend/lib/config.ts`). The Airbnb name and logo must not appear anywhere in the UI. Apply the substitutions in plan §5.2.
- No input anywhere may accept a real password or a real card number (plan §1, §6.1, §6.7).

## Version-sensitive facts

- Next.js 16: `params`, `searchParams`, `cookies()` and `headers()` are async; `middleware.ts` is `proxy.ts`; there is no `next lint`; remote images need `images.remotePatterns`. Read the bundled docs in `frontend/node_modules/next/dist/docs/` before using a Next.js API.
- Read the installed version's docs for react-day-picker and for SQLAlchemy's SQLite transaction handling before writing against them.

## Commands (from the repository root)

| Command | Purpose |
|---|---|
| `npm run setup` | Install backend and frontend dependencies, create `.env` files |
| `npm run seed` | Rebuild and seed the database |
| `npm run dev` | Backend on :8000, frontend on :3000 |
| `npm run test` | pytest and Vitest |
| `npm run check` | Ruff, mypy, pytest, ESLint, `tsc --noEmit`, Vitest, `next build` |
| `npm run e2e` | Playwright journeys |

These scripts are created in Phase 1.

## Commits

Conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one logical change each, only in a working state.
