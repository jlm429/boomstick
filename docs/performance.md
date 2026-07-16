# Performance

Boomstick keeps rendering and physics frame data outside React state. The Canvas caps device pixel ratio to reduce high-density display cost, enables shadows only for the compact arena, and reuses temporary player vectors.

When changing the scene, test in a real browser on a typical laptop. Watch frame pacing while moving, jumping, pausing, and repeatedly entering pointer lock. Prefer simple instanced or shared geometry for any future repeated environment detail.
