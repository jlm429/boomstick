# Architecture and interaction skill

## Read before changing

Read this skill before changing `src/App.tsx`, `src/ui`, `src/game`, application phase or life state, pointer-lock ownership, input semantics, settings persistence, restart or retry state, menus, or HUD behavior. Read rendering or physics only when those layers are also in scope.

## Stable ownership

React owns screens and accessible UI. Zustand owns coarse run, phase, pointer-lock, health, and life state. Rendering-independent rules belong in `src/game`; frame-driven presentation, physics, combat presentation, audio, and entity runtime behavior belong in `src/scene`.

`src/game/arena.ts` is the shared procedural arena source. Its blocks produce both visual meshes and matching fixed colliders. Keep gameplay rules independent of Three.js presentation.

Use [docs/architecture.md](../../../docs/architecture.md) for the current component, entity, combat, and lifecycle topology. Do not copy that mutable inventory into this skill.

## Phase and input invariants

`App` owns browser pointer-lock requests, explicit touch sessions, and the listeners that validate them. For desktop control mode, `pointerlockchange` is authoritative: `playing` requires the registered Canvas to own pointer lock, and any other phase must not claim it. Do not mark desktop play active merely because a lock request was made. Touch control mode may enter `playing` without pointer lock only from the touch entry or resume action.

Player actions require `playing`, the active control mode, and an alive life state. Lock loss pauses a desktop run. The visible pause control pauses a touch run. Held keys and touch state are cleared on pause, blur, hidden-tab transitions, death, reset, and unmount.

`runId` keys `RunScene`. Restart and retry must return to a safe entry state and remount all run-owned state, including the player body, combat state, targets, zombies, attack coordination, timers, effects, and audio. Request pointer lock only from the initiating user action.

Keep coarse UI state in Zustand. Keep transient key state, mouse look, camera transforms, and frame values in refs or the render loop. Do not put per-frame state in React state. Effects that attach browser listeners must clean them up and preserve correct dependencies.

## Change workflow

1. Trace the state transition from its initiating click or browser event through `App`, `store.ts`, and affected scene code.
2. Preserve pointer-lock, phase, and reset invariants. For behavior changes, extend the store, utility, or `App` tests at the narrowest layer that proves the behavior.
3. Verify menu, entry, play, pause, resume, restart, and return-to-menu flows if any of them are affected. Browser pointer lock still needs manual verification.

Use the testing skill for commands and proportional validation.
