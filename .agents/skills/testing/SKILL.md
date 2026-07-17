# Testing and validation skill

## Repository commands

This project uses npm, Vite, Vitest 4, React Testing Library, jsdom, ESLint, TypeScript, and Prettier. CI on Node 22 runs:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

For local development, use `npm run dev`; use `npm run preview` to inspect the production build. Run one focused Vitest file with:

```sh
npx vitest run src/game/store.test.ts
```

Replace the path with the affected test file. `npm test` runs the full suite.

## What to test

- Test pure game utilities in adjacent `src/game/*.test.ts` files.
- Test Zustand phase and pointer-lock invariants in `src/game/store.test.ts`.
- Test UI transitions in `src/App.test.tsx`; mock `GameViewport` there rather than requiring WebGL in jsdom.
- Keep tests deterministic. Do not use WebGL image snapshots, timing-sensitive waits, or a test weakened merely to hide a failure.
- Add regression coverage when a bug can be expressed at the utility, store, or UI-transition layer. State clearly when the bug is browser or GPU specific and cannot be covered by jsdom.

## Required validation discipline

Run the smallest relevant test first, then the applicable broader suite. Run lint, typecheck, format check, and build before handoff when code changes warrant full validation. CI validates the same automated checks but does not prove a remote browser or GPU result.

For visible behavior, inspect `npm run dev` and, when relevant, `npm run preview` in a real browser. Verify the bright arena, pointer-lock entry, mouse look, movement, pause, resume, restart, and menu return for affected flows. For scene or lifecycle changes, also test resize, tab background and return, remount, context recovery, and input clearing where relevant. Use the browser-debugging skill for cache and Chrome-versus-Firefox checks.

Do not claim success from compilation, a clean console, or passing unit tests alone. Report exact commands and runtime checks performed, skipped checks, and remaining risks.
