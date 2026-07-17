# React Three Fiber and Three.js rendering skill

## Entry points and ownership

`src/scene/GameViewport.tsx` owns the persistent R3F `Canvas`, camera defaults, DPR cap, renderer configuration, diagnostics, visible arena, and paused Rapier boundary. `src/scene/Arena.tsx` renders procedural blocks from `src/game/arena.ts`. `src/scene/Player.tsx` owns runtime camera following and orientation. `App` receives the native Canvas only to request and verify pointer lock.

Keep `ArenaVisuals` outside `Physics`. Physics startup must not remove the sky, lights, floor, walls, landmark, or other visual level. Preserve the current Canvas unless the task specifically requires a lifecycle change: it is configured with an opaque renderer, `dpr={[1, 1.5]}`, basic shadows, sRGB output, no tone mapping, and the arena clear color.

## Frame and resource rules

- Keep `useFrame` bounded and use refs or module-level reusable Three.js objects for transient vectors, Euler angles, and diagnostics. Do not drive per-frame transforms through React state or allocate scene objects each frame.
- React owns component lifecycle. Do not manually duplicate Canvas or scene lifecycle outside R3F.
- The arena currently creates JSX geometries and materials per mesh. If manually creating shared Three.js resources later, make ownership and disposal explicit. Do not dispose loader-cached or shared resources while another component can use them.
- Preserve camera, resize, DPR, renderer, lighting, and color-space behavior unless the requested visual result requires a deliberate change.
- Keep development diagnostics and scene helpers development-only through `runtimeDiagnostics.ts`.

## Rendering changes

Define the expected visible result first. Trace the change from `src/game/arena.ts` through both `ArenaVisuals` and `ArenaColliders` when level geometry changes. For camera, pointer lock, player movement, or physics-adjacent work, also read the architecture and physics skills.

Check a real browser after changing rendering: scene visibility, Canvas resize, tab background and return, pointer-lock entry, pause, restart, and remount where affected. A black canvas is not enough information: use the browser-debugging skill to check GPU configuration, context loss, renderer initialization, camera, lighting, and assets before changing scene code. Do not silence renderer warnings without diagnosis.

Run focused automated tests first, then the applicable validation in the testing skill. Unit tests do not replace real-browser visual verification, and WebGL image snapshots are not part of this project’s test strategy.
