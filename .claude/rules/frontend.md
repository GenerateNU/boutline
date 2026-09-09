---
paths:
  - "frontend/**"
---

# Frontend conventions

## Design source of truth

Read `docs/design.md` before writing or changing any UI, and follow it for tokens,
spacing, typography, and component anatomy. Do not introduce ad-hoc hex colors or
one-off spacing values. If `docs/design.md` is missing, stop and ask instead of
improvising a visual language.

## Next.js

`frontend/AGENTS.md` warns that this Next.js version differs from training data.
Take it literally: check `frontend/node_modules/next/dist/docs/` before using an App
Router API you have not already seen used in this repo.

Server Components by default. Add `"use client"` only for a component that needs
state, effects, or browser APIs, and push it down to the leaf that needs it.

## Layout under `frontend/src/`

- `app/` — routes only (`page.tsx`, `layout.tsx`, `route.ts`). No business logic.
- `components/<name>/` — one component per file, with its props type and test
  colocated.
- `lib/` — framework-free logic, one module per concern.

## TypeScript and styling

- Type the boundaries: props, API responses, route params. No `any`; use `unknown`
  plus a narrowing check.
- Tailwind utilities for styling. Reach for an existing token or a CSS variable in
  `globals.css` before writing an arbitrary value like `w-[437px]`.
- Run `bun run lint` on what you changed.
