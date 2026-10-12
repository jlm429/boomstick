# Performance

Boomstick keeps rendering and physics frame data outside React state. The Canvas retains its 1.5
device pixel ratio cap for desktop and uses a conservative 1.25 cap only on the existing coarse-touch
path. Shadows use one 512-pixel PCF-filtered shadow map for the compact arena. Player, shot, and enemy
updates reuse their core Three.js objects, and touch joystick movement updates CSS custom properties
directly instead of rerendering the control tree for every pointer move. Zombie model preparation
consolidates fragmented FBX material groups once, then shares the optimized immutable geometry among
per-entity skeleton clones. Shotgun pellet offsets are configured once and each raycast examines its
nearest collision using a reused intersection array without constructing a second mapped collision list.
Industrial obstacle details are merged into one presentation mesh per block. Surface finishes use
small procedural bump and roughness textures, with optional color tint, cached CPU tiles, and
component-owned GPU textures. The beveled weapon uses low-segment geometry without postprocessing.
Blood and surface effects use fixed particle pools whose limits are defined in
`src/scene/particlePool.ts` and `src/game/bloodParticles.ts`; overload replaces existing slots
instead of growing storage.

## Mobile stabilization evidence

The 2026-08 stabilization pass used headless Chrome development builds with coarse-touch emulation
at 390 by 844 CSS pixels, device scale factor 3, and the existing 1.25 Canvas DPR cap. The resulting
Canvas buffer was 487 by 1055 pixels. Static training measured 84 draw calls, 56 top-level scene
children, and 18 Rapier bodies and colliders. With all five zombies active, the unmodified baseline
reached 981 draw calls. Asset inspection found 99 material groups per zombie across three skinned
meshes. The group-consolidation counterfactual reduced that to 7 groups per zombie, or 495 to 35
forward-pass groups across five zombies. The implemented encounter measured 150 to 162 draw calls,
62 scene children, and the expected 19 bodies and colliders. After every corpse cleared it measured
14 bodies and colliders, and Restart restored one HUD, one control overlay, 56 scene children, and
18 bodies and colliders.

Three-second frame-counter samples on the host were about 112 FPS for static training, 112 FPS for
the baseline encounter, and 113 FPS for the optimized encounter. Those nearly identical values show
that this headless host was not limited by the same draw submission path as a phone. JavaScript heap
samples also moved with garbage collection and did not support a memory claim. The deterministic
group and draw-call reductions are the useful evidence. Headless emulation cannot establish
physical-device thermals, GPU timing, browser-chrome behavior, or perceived smoothness, so a real
coarse-touch device remains required for final performance validation.

When changing the scene, test in a real browser on a typical laptop. Watch frame pacing while moving,
jumping, pausing, and repeatedly entering pointer lock. Prefer simple instanced or shared geometry
for any future repeated environment detail.
