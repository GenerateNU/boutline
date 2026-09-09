# boutline

Monorepo. `frontend/` — Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Bun.
`backend/` — Go (not created yet; create it there). `docs/` — design specs and style
guides, authoritative once present.

## Commands

- Frontend, from `frontend/`: `bun run dev`, `bun run build`, `bun run lint`.
  Package manager is Bun — never npm, yarn, or pnpm.
- Backend, from `backend/` once it exists: `go build ./...`, `go test ./...`, `go vet ./...`.
- Lint and test every package you touched before reporting work as done. If a check
  fails, say so with the output rather than describing the change as complete.

## How code should look

These override defaults you would otherwise apply.

- **One responsibility per file.** A file holds one cohesive thing — a component, a
  handler, a service, a group of related types. Split it before it grows a second
  reason to change. No `utils.go` / `helpers.ts` grab bags.
- **Comments only where the code is genuinely hard.** A comment exists to save a
  reader time, so one or two sentences on *why* at the non-obvious parts. No comments
  restating the next line, no section banners, no docstrings on self-evident
  functions.
- **Concise over clever, and concise over defensive.** Delete dead branches,
  single-use wrappers, and speculative abstraction. Straightforward code wins over a
  faster version unless a bottleneck has actually been measured.
- **Pin dependencies to exact versions.** No `^`, `~`, or `latest`.
- **Tests assert observable behavior** — returned values, status codes, rendered
  output — not that a function was called. Table-driven cases over near-duplicate
  test functions.
- When this file and the surrounding code disagree on naming or structure, match the
  surrounding code and mention the conflict.

## Before writing code

- Frontend work: read `docs/design.md` first and follow it. If it does not exist yet,
  say so and ask rather than inventing a design system.
- Ask before adding a dependency, changing build/CI setup, or adding a top-level
  directory.

## Planning and delegation

Plan with the strongest model, execute in parallel with cheaper ones.

- Use `/orchestrate <task>` for anything touching more than ~3 files or both stacks:
  it plans with the `planner` subagent (Opus) and fans the plan out to `implementer`
  subagents (Sonnet) running in parallel.
- Only parallelize slices that touch disjoint files. Sequence anything sharing a file,
  a migration, or an API contract — settle the contract in the plan before either side
  starts.
- Subagents do not inherit this conversation. Every delegated task must state its
  files, its boundary, and how to verify it.

## Never

- Read or print environment variables or `.env*` contents. Refer to variables by name.
- Commit or push unless asked.

<!-- Path-scoped conventions live in .claude/rules/. Keep this file under ~80 lines. -->
