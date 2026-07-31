# Performance

Boomstick keeps rendering and physics frame data outside React state. The Canvas retains its 1.5
device pixel ratio cap for desktop and uses a conservative 1.25 cap only on the existing coarse-touch
path. Shadows use one 512-pixel basic shadow map for the compact arena. Player, shot, and enemy
updates reuse their core Three.js objects, and touch joystick movement updates CSS custom properties
directly instead of rerendering the control tree for every pointer move.

When changing the scene, test in a real browser on a typical laptop. Watch frame pacing while moving, jumping, pausing, and repeatedly entering pointer lock. Prefer simple instanced or shared geometry for any future repeated environment detail.
