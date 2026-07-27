# Testing and validation skill

## Read when

Read this skill when adding or updating tests, selecting validation for a code change, diagnosing test or CI failure, or preparing verification evidence.

## Repository commands

The package scripts and CI workflow are authoritative. CI currently runs:

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
- Test isolated scene-component ownership and lifecycle with focused component tests when behavior does not require a real WebGL renderer.
- Keep tests deterministic. Do not use WebGL image snapshots, timing-sensitive waits, or a test weakened merely to hide a failure.
- Add regression coverage when a bug can be expressed at the utility, store, or UI-transition layer. State clearly when the bug is browser or GPU specific and cannot be covered by jsdom.

## Required validation discipline

Run the smallest relevant test first, then the applicable broader suite. Run lint, typecheck, format check, and build before handoff when code changes warrant full validation. CI validates the same automated checks but does not prove a remote browser or GPU result.

For visible behavior, inspect `npm run dev` and, when relevant, `npm run preview` in a real browser. Use [docs/development.md](../../../docs/development.md) as the current runtime checklist and select only checks affected by the change. Scene or lifecycle work may require resize, tab return, remount, cleanup, and input-clearing checks; localized rule changes may not.

Do not claim success from compilation, a clean console, or passing unit tests alone. Report exact commands and runtime checks performed, skipped checks, and remaining risks.

## Human validation gate

When the task, delivery workflow, or residual risk explicitly requires human verification, stop before opening a pull request and ask the user to validate it. Provide concise reproduction and validation steps, state what automated or agent-run checks have already passed, and identify the expected result.

Do not assume the user has tested the change or treat agent-run automation as user confirmation. Wait for explicit confirmation before creating the pull request. If the user reports a problem, resume the work, revalidate it, and request human validation again before proceeding.
