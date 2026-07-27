# Boomstick agent guide

## Project

Boomstick is a browser-only, single-player arena combat prototype built with React, TypeScript, React Three Fiber, Three.js, Rapier, and Zustand. There is no application server, API, authentication, or remote asset pipeline. The only persistent state is the Invert Y setting in browser local storage.

- `src/ui` owns accessible menus, HUD, and pause UI.
- `src/game` owns the phase store and rendering-independent arena, input, movement, combat, encounter, and health rules.
- `src/scene` owns the Canvas, Three.js presentation, Rapier world, combat presentation, and entity runtime behavior.
- The `playing` phase is valid only while the R3F Canvas owns pointer lock. Player actions also require an alive life state. Arena visuals stay available outside the asynchronous physics boundary.

Read [docs/architecture.md](docs/architecture.md) for the current event and lifecycle flow.

## Operating principles

- Work from the current repository, worktree, and affected code path. State assumptions only when they materially affect behavior, scope, or architecture.
- Implement the smallest complete change. Do not add speculative features, abstractions, configuration, fallbacks, or unrelated refactors.
- Preserve user changes and architectural boundaries. Remove only artifacts made obsolete by your own change. Review the final diff so every changed line serves the task.
- For meaningful work, define observable success before coding. Reproduce bugs when practical, trace the relevant flow, and add or identify regression coverage.
- For a browser-visible failure, follow the browser-debugging skill before changing code.
- Do not make irreversible or environment-wide changes without explicit approval.

## Safety and completion

- Never read, expose, summarize, or commit secrets, `.env` contents, credentials, private keys, or authenticated URLs. Do not expose unnecessary absolute personal filesystem paths in public artifacts; prefer repository-relative or `~`-normalized paths when a local path is needed. If a secret is exposed, stop and notify the user.
- Treat browser URLs, future imported data, and user-controlled text as untrusted. Do not use unsafe HTML, `dangerouslySetInnerHTML`, `eval`, generated code, or casually add dependencies. Review the relevant OWASP risks for any future network, persistence, URL, HTML, upload, or dependency change.
- Do not commit, push, rebase, rewrite history, modify remotes, or delete Git refs unless explicitly asked. Treat workflow changes as production infrastructure.
- A task is complete only when requested behavior, relevant tests, and applicable browser or lifecycle checks pass; the final diff contains only intended changes; and skipped validation or uncertainty is reported plainly. A build, clean console, or unit test alone does not prove a WebGL, input, scene, or physics fix.

## Skill routing

Before acting, read each row whose change area or diagnostic rule is actually in scope. Load multiple skills only when the task crosses those boundaries.

| Change area                                                                                              | Read first                                                                             |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `App`, UI, game rules or state, phases, life state, pointer lock, input, settings, restart, or HUD       | [.agents/skills/architecture/SKILL.md](.agents/skills/architecture/SKILL.md)           |
| Diagnosing stale builds, cache, browser-only failures, WebGL, blank or black Canvas, or GPU state        | [.agents/skills/browser-debugging/SKILL.md](.agents/skills/browser-debugging/SKILL.md) |
| Canvas, R3F, Three.js, camera, materials, lights, raycasting, animation assets, frame loop, or resources | [.agents/skills/rendering/SKILL.md](.agents/skills/rendering/SKILL.md)                 |
| Rapier world settings, bodies, colliders, physical motion, collision, physical reset, or timing          | [.agents/skills/physics/SKILL.md](.agents/skills/physics/SKILL.md)                     |
| Tests, CI failures, validation selection, or verification evidence                                       | [.agents/skills/testing/SKILL.md](.agents/skills/testing/SKILL.md)                     |
| Planning slices, CHANGELOG, handoff, pull requests, or resource limits                                   | [.agents/skills/workflow/SKILL.md](.agents/skills/workflow/SKILL.md)                   |
| Vite base, CI or Pages workflow, hosting path, or deployment                                             | [.agents/skills/deployment/SKILL.md](.agents/skills/deployment/SKILL.md)               |

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
