# Rapier physics and simulation skill

## Current physics design

`GameViewport` creates `Physics` with gravity `[0, -20, 0]`, `timeStep={1 / 60}`, `maxCcdSubsteps={2}`, and `paused={!active}`. `ArenaColliders` maps every `ARENA_BLOCKS` entry into a fixed `RigidBody` plus `CuboidCollider`. `Player` owns a dynamic capsule body, keyboard and mouse translation, velocity updates, camera following, invalid-transform recovery, and its own remount through `runId`.

The Rapier body is authoritative for player position. Camera position follows that body at `CAMERA_EYE_OFFSET`; do not create a competing React or Three.js transform source. `src/game/arena.ts` and `src/game/constants.ts` own level, spawn, speed, jump, and escape-reset rules, while `src/game/movement.ts` keeps diagonal input normalized.

## Rules

- Preserve the fixed timestep and current paused-outside-play policy unless the task specifically changes simulation timing. Do not hide localized defects by broadly changing gravity, damping, mass, CCD, collision layout, or timestep.
- Keep movement frame-rate safe. `Player` clears held input and horizontal velocity after invalid or oversized frame deltas, and resets non-finite or escaped bodies. Preserve or deliberately update those safety behaviors.
- Do not mutate a body before it exists. Keep body and collider ownership inside the mounted Rapier scene and ensure restart or unmount cannot leave active input or stale simulation behavior.
- When changing arena blocks, keep visual geometry and matching collider geometry aligned. Confirm scale and coordinate-space assumptions explicitly.
- Collision callbacks and sensors are not currently used. Add them only with a clear gameplay owner and targeted tests.

## Verification

For movement, collision, timing, or spawn changes, define the gameplay invariant and test the pure/store configuration where possible. Then manually verify entering play, movement, diagonal speed, jump, pause, resume, restart, tab blur or hide recovery, and escaped-body recovery as applicable. Test more than one frame-rate condition when timing or movement changes. Read the browser-debugging skill before treating a failed scene as a physics issue.
