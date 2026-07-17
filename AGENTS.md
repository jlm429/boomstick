# Boomstick agent guide

## Project

Boomstick is a browser-only, single-player first-person movement prototype built with React 19, TypeScript, Vite, React Three Fiber, Three.js, Rapier, and Zustand. There is no application server, API, authentication, persistent storage, or remote asset pipeline in the current codebase.

- `src/ui` owns accessible menus, HUD, and pause UI.
- `src/game` owns the phase store and rendering-independent arena, input, and movement rules.
- `src/scene` owns the Canvas, Three.js presentation, Rapier world, and player runtime behavior.
- The `playing` phase is valid only while the R3F Canvas owns pointer lock. Arena visuals stay available outside the asynchronous physics boundary.

Read [docs/architecture.md](docs/architecture.md) for the current event and lifecycle flow.

## Operating principles

- Work from the current repository, worktree, and affected code path. State assumptions only when they materially affect behavior, scope, or architecture.
- Implement the smallest complete change. Do not add speculative features, abstractions, configuration, fallbacks, or unrelated refactors.
- Preserve user changes and architectural boundaries. Remove only artifacts made obsolete by your own change. Review the final diff so every changed line serves the task.
- For meaningful work, define observable success before coding. Reproduce bugs when practical, trace the relevant flow, and add or identify regression coverage.
- Before changing browser, input, WebGL, scene lifecycle, rendering, or physics code, rule out environment and stale-build causes. When Firefox works but Chrome fails, rule out Chrome graphics configuration before altering application code.
- Do not make irreversible or environment-wide changes without explicit approval.

## Safety and completion

- Never read, expose, summarize, or commit secrets, `.env` contents, credentials, private keys, authenticated URLs, or personal filesystem paths. If a secret is exposed, stop and notify the user.
- Treat browser URLs, future imported data, and user-controlled text as untrusted. Do not use unsafe HTML, `dangerouslySetInnerHTML`, `eval`, generated code, or casually add dependencies. Review the relevant OWASP risks for any future network, persistence, URL, HTML, upload, or dependency change.
- Do not commit, push, rebase, rewrite history, modify remotes, or delete Git refs unless explicitly asked. Treat workflow changes as production infrastructure.
- A task is complete only when requested behavior, relevant tests, and applicable browser or lifecycle checks pass; the final diff contains only intended changes; and skipped validation or uncertainty is reported plainly. A build, clean console, or unit test alone does not prove a WebGL, input, scene, or physics fix.

## Skill routing

Read every skill that crosses a task boundary.

| Change area                                                                  | Read first                                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| UI, Zustand phases, pointer lock, input, or game rules                       | [.agents/skills/architecture/SKILL.md](.agents/skills/architecture/SKILL.md)           |
| Chrome, Firefox, cache, WebGL, black canvas, or runtime diagnosis            | [.agents/skills/browser-debugging/SKILL.md](.agents/skills/browser-debugging/SKILL.md) |
| Canvas, React Three Fiber, Three.js, scene resources, or performance         | [.agents/skills/rendering/SKILL.md](.agents/skills/rendering/SKILL.md)                 |
| Rapier bodies, colliders, movement, collision, restart, or simulation timing | [.agents/skills/physics/SKILL.md](.agents/skills/physics/SKILL.md)                     |
| Tests, CI, or validation                                                     | [.agents/skills/testing/SKILL.md](.agents/skills/testing/SKILL.md)                     |
| Pages hosting or deployment workflow                                         | [.agents/skills/deployment/SKILL.md](.agents/skills/deployment/SKILL.md)               |
