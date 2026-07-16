# Boomstick agent guide

## Architecture

- `src/ui` contains React screens, menus, HUD, and accessible controls.
- `src/game` contains rendering-independent gameplay utilities and Zustand app state.
- `src/scene` contains React Three Fiber scene presentation and Rapier physics.
- Keep coarse UI state in Zustand. Do not place per-frame values in React state.

## Commands

Run `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` before handoff.

## Conventions

Use TypeScript, named exports where practical, Prettier formatting, and small focused modules. Preserve the separation between UI, game rules, rendering, and physics. Keep browser-only APIs behind effects or event handlers.

## Testing

Write Vitest and React Testing Library tests for state, UI transitions, configuration, and pure utilities. Do not use WebGL image snapshots.

## Deployment

Vite builds under `/boomstick/`. GitHub Actions publishes `dist` to GitHub Pages. See `docs/deployment.md` for the one-time repository setting.

## Performance

Avoid allocations and React rerenders in frame loops. Prefer refs and the render loop for transient camera and physics data.

## Documentation and workflow

Update relevant docs and `CHANGELOG.md` for user-visible changes. Work on feature branches, keep commits focused, and review for accessibility, mobile fallback copy, performance, and unintended scope expansion.

Repository-specific guides are under `.agents/skills/`.

## Maintaining this file

Keep this guide concise and project-wide. Point to authoritative source files and documentation instead of duplicating details.
