# Development

Install Node 22 or newer and run:

```sh
npm install
npm run dev
```

Use `npm test` for the automated suite. Before a pull request, run lint, typecheck, formatting verification, and build as listed in the README. The prototype is intentionally limited to one local arena with movement and target combat.

Inspect both `npm run dev` and `npm run preview` in a real browser. Verify the bright sky, floor,
perimeter, obstacles, orange landmark, targets, and shotgun before testing pointer lock, mouse look,
movement, firing, reload, target health meters, range and face-accuracy damage scaling, target
depletion, the single 3, 2, 1 zombie transition, all five concealed zombie spawns, simultaneous
zombie pursuit with distinct run phases and subtly varied speeds, exclusive attack positions,
stable position settlement without steering jitter, the 0.80-unit chase-to-attack boundary, timed
bite damage and cancellation, synchronized bite audio and impact bursts, stable frame pacing during
clustered bites, player health HUD bands and damage feedback, the reduced-motion-safe
critical-health vignette, player death camera and fade, disabled controls and weapon actions during
death, Retry and menu actions, zombie hit and death animations, zombie collision, completion after
all five corpses are removed, hidden completion HUD, and full encounter restoration from Restart,
Restart Training, and Retry. Also verify pause and menu return. On a coarse touch device, also
verify entry without pointer lock; the simultaneous and rejected touch gesture cases in
[Controls](controls.md); held input clearing on pause, tab return, restart, and menu return; no
overlap between the HUD and controls; hidden touch crosshair; center and off-center tap aim without
camera movement; and usable portrait, landscape, and safe-area layouts. Repeat
the desktop pointer-lock, keyboard, and mouse checks with touch emulation disabled.
Development builds expose quiet live state at `window.__BOOMSTICK_DIAGNOSTICS__`, including Canvas
size, WebGL state, frame count, camera, Rapier readiness, player position, pressed controls, and the
latest successful shot coordinates and direction.
Scene helpers and diagnostics are excluded from production builds. Automated or headless
pointer-lock simulation is useful for state coverage, but it does not replace hands-on browser
verification.
