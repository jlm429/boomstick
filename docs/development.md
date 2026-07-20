# Development

Install Node 22 or newer and run:

```sh
npm install
npm run dev
```

Use `npm test` for the automated suite. Before a pull request, run lint, typecheck, formatting verification, and build as listed in the README. The prototype is intentionally limited to one local arena with movement and target combat.

Inspect both `npm run dev` and `npm run preview` in a real browser. Verify the bright sky, floor,
perimeter, obstacles, orange landmark, targets, and shotgun before testing pointer lock, mouse look,
movement, firing, reload, breakable-light and surface impact audio, light restoration on restart,
pause, restart, and menu return. Development builds expose quiet live state at
`window.__BOOMSTICK_DIAGNOSTICS__`, including Canvas size, WebGL state, frame count, camera,
Rapier readiness, player position, and pressed controls. Scene helpers and diagnostics are excluded
from production builds. Automated or headless pointer-lock simulation is useful for state coverage,
but it does not replace hands-on browser verification.
