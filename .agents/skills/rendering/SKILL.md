# React Three Fiber and Three.js rendering skill

## Read before changing

Read this skill before changing the R3F Canvas or scene graph, Three.js camera, materials, lights, raycasting, animation assets, `useFrame`, scene resource ownership, disposal, or rendering performance.

Use [docs/architecture.md](../../../docs/architecture.md) for current scene and component ownership. Renderer settings are authoritative in `GameViewport` and arena render configuration, not in this skill.

Keep `ArenaVisuals` outside `Physics`. Physics startup must not remove the sky, lights, floor, walls, landmark, or other visible level. Preserve the Canvas lifecycle unless the task deliberately changes it.

## Frame and resource rules

- Keep `useFrame` bounded and use refs or module-level reusable Three.js objects for transient vectors, Euler angles, and diagnostics. Do not drive per-frame transforms through React state or allocate scene objects each frame.
- React owns component lifecycle. Do not manually duplicate Canvas or scene lifecycle outside R3F.
- Make ownership and disposal explicit for manually created Three.js resources. Do not dispose loader-cached or shared resources while another component can use them.
- Treat loader-cached FBX data as shared source assets. Clone mutable models and own animation mixers and actions per entity so one zombie cannot alter another.
- Stop and release entity-owned mixers, actions, timers, audio, and transient effects on death, run reset, or unmount as applicable. Do not hoist run-owned resources across the keyed `RunScene` boundary without a deliberate lifecycle design.
- Preserve camera, resize, DPR, renderer, lighting, and color-space behavior unless the requested visual result requires a deliberate change.
- Keep development diagnostics and scene helpers development-only through `runtimeDiagnostics.ts`.

## Rendering changes

Define the expected visible result first. Trace a level-geometry change from `src/game/arena.ts` through both `ArenaVisuals` and `ArenaColliders`, and read the physics skill. Read architecture when a rendering change also affects pointer lock, input, phase, or reset behavior.

Run focused automated tests first, then use the testing skill to select proportional real-browser checks for the affected rendering behavior. Unit tests do not replace real-browser visual verification, and WebGL image snapshots are not part of this project's test strategy.
