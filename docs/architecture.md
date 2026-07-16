# Architecture

Boomstick is a browser-first, single-player movement prototype.

| Area                                            | Ownership                                |
| ----------------------------------------------- | ---------------------------------------- |
| Application screens, menu, HUD, pause dialog    | React                                    |
| Coarse screen and run state                     | Zustand                                  |
| Scene graph, camera, lighting, visual animation | React Three Fiber / Three.js             |
| Gravity, colliders, player rigid body           | Rapier                                   |
| Movement input mapping                          | Rendering-independent TypeScript utility |

`App` switches between React screens. The Zustand store owns one game phase: `entry`, `playing`, or `paused`. Pointer-lock acquisition moves the game into `playing`; losing it pauses the game. This prevents the UI, physics, and input from disagreeing about whether a run is active. `GameViewport` owns the Canvas, and scene components never update React state per frame. The player reads input through refs, drives its Rapier body, and updates the Three camera in the render loop.

This boundary keeps gameplay additions testable and prevents UI work from coupling to physics presentation.
