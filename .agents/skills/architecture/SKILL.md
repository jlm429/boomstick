# Architecture and interaction skill

## Read before changing

Read this skill before changing `src/App.tsx`, `src/ui`, `src/game`, pointer lock, keyboard or mouse input, application phases, restart, or menu behavior. Read the rendering or physics skill as well when the change reaches `src/scene`.

## Current ownership

| Concern                                                    | Owner                | Key paths                                           |
| ---------------------------------------------------------- | -------------------- | --------------------------------------------------- |
| React entry and screen composition                         | React                | `src/main.tsx`, `src/App.tsx`, `src/ui/`            |
| Coarse run state and pointer-lock phase machine            | Zustand              | `src/game/store.ts`                                 |
| Pure movement, input mapping, arena description, constants | TypeScript utilities | `src/game/`                                         |
| Canvas, camera, visuals, renderer diagnostics              | R3F and Three.js     | `src/scene/GameViewport.tsx`, `src/scene/Arena.tsx` |
| Rigid bodies, colliders, player runtime loop               | Rapier with R3F      | `src/scene/Player.tsx`, `src/scene/Arena.tsx`       |

`src/game/arena.ts` is the shared procedural arena source. Its blocks produce both visual meshes and matching fixed colliders. Keep gameplay rules independent of Three.js presentation.

## Phase and input invariants

`App` owns browser pointer-lock requests and listens for `pointerlockchange`. The event is authoritative: `playing` requires the registered Canvas to own pointer lock, and any other phase must not claim it. Do not mark play active merely because a lock request was made.

`runId` remounts `Player` on restart. A restart must return to a safe entry state, reset the body through the new player mount, and request lock only from the restart click. Lock loss pauses the run. Input is active only while the Canvas owns lock; held keys are cleared on pause, blur, and hidden-tab transitions.

Keep coarse UI state in Zustand. Keep transient key state, mouse look, camera transforms, and frame values in refs or the render loop. Do not put per-frame state in React state. Effects that attach browser listeners must clean them up and preserve correct dependencies.

## Change workflow

1. Trace the state transition from its initiating click or browser event through `App`, `store.ts`, and affected scene code.
2. Preserve pointer-lock, phase, and reset invariants. For behavior changes, extend the store, utility, or `App` tests at the narrowest layer that proves the behavior.
3. Verify menu, entry, play, pause, resume, restart, and return-to-menu flows if any of them are affected. Browser pointer lock still needs manual verification.

Use [docs/architecture.md](../../../docs/architecture.md) for the fuller current design and the testing skill for commands.
