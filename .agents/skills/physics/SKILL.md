# Rapier physics and simulation skill

## Read before changing

Read this skill before changing Rapier world settings, bodies or colliders, player or zombie physical motion, collision, physical spawn or reset behavior, or simulation timing. A general restart, UI, or animation change does not trigger this skill unless physical state changes.

Use [docs/architecture.md](../../../docs/architecture.md) for current physics composition and entity ownership. World settings are authoritative in `GameViewport`, not in this skill.

## Body and reset authority

The Rapier body is authoritative for player position. Camera position follows that body at `CAMERA_EYE_OFFSET`; do not create a competing React or Three.js transform source. `src/game/arena.ts` and `src/game/constants.ts` own level, spawn, speed, jump, and escape-reset rules, while `src/game/movement.ts` keeps diagonal input normalized.

Arena and active training-target bodies are fixed. Each live zombie owns a dynamic body and its matching collider; death removes collision and transitions that body out of live simulation. Keep entity visual, animation, attack-slot, and gameplay state coordinated with the body without treating them as competing transform authorities.

`runId` keys `RunScene`, so restart and retry remount player, target, and zombie bodies together with the rest of the run-owned simulation. Unmount and death must not leave active input, stale bodies, attack ownership, or timers behind.

## Rules

- Preserve the configured fixed timestep and paused-outside-play policy unless the task specifically changes simulation timing. Do not hide localized defects by broadly changing gravity, damping, mass, CCD, collision layout, or timestep.
- Keep movement frame-rate safe. `Player` clears held input and horizontal velocity after invalid or oversized frame deltas, and resets non-finite or escaped bodies. Preserve or deliberately update those safety behaviors.
- Do not mutate a body before it exists. Keep body and collider ownership inside the mounted Rapier scene.
- When changing arena blocks, keep visual geometry and matching collider geometry aligned. Confirm scale and coordinate-space assumptions explicitly.

## Verification

For movement, collision, timing, spawn, or physical reset changes, define the gameplay invariant and test pure rules or focused scene behavior where possible. Use the testing skill to select only the applicable player, target, zombie, restart, death, and frame-rate runtime checks.
