# Architecture

Boomstick is a browser-first, single-player arena combat prototype.

| Area                                            | Ownership                                |
| ----------------------------------------------- | ---------------------------------------- |
| Application screens, menu, HUD, pause dialog    | React                                    |
| Authoritative application phase and run state   | Zustand                                  |
| Scene graph, camera, lighting, visual animation | React Three Fiber / Three.js             |
| Gravity, colliders, player rigid body           | Rapier                                   |
| Movement input mapping                          | Rendering-independent TypeScript utility |

`App` switches between React screens using one phase machine: `main-menu`, `about`, `arena-entry`, `playing`, and `paused`. The native Canvas is passed directly to `App`; Enter Arena, Resume, and Restart request pointer lock from their click handlers. The browser's `pointerlockchange` event alone confirms active play, and lock loss pauses the run. Store transitions preserve the invariant that `playing` always has pointer lock and every other phase does not.

`GameViewport` keeps arena and combat presentation outside Rapier's asynchronous boundary. The rendering-independent layouts in `src/game/arena.ts` and `src/game/targets.ts` supply arena geometry, repeated light-fixture placement, and fixed targets; the arena blocks and targets have matching colliders inside Rapier, while the fixtures remain visual dressing. `CombatScene` owns transient weapon state, delegates ammunition and reload rules to `src/game/shooting.ts`, and reports that state to the React HUD. It accepts fire and reload input only during pointer-locked play and raycasts each fired pellet against rendered scene geometry so the nearest collision controls hit feedback. Remounting it for a new `runId` resets the weapon along with the run. A Rapier startup delay therefore cannot remove the sky, lighting, visible level, targets, or weapon. The fixed-step physics world is paused outside play. `Player` installs keyboard and mouse listeners once per mount, clears held input on pause, blur, and visibility loss, and uses refs for transient controls. The render loop guards transforms, resets escaped bodies, clamps unsafe frame transitions, and follows the rigid body at eye height.

The reproduced black-screen report was a rendered but unreadable scene rather than a missing Canvas or a player escaping the level. Browser inspection found a nonzero native Canvas, a healthy WebGL2 context, advancing frames, initialized Rapier, and a finite player at the configured spawn. The old near-black background, fog, and low-contrast geometry looked black once the entry panel disappeared, while any pointer-lock loss correctly disabled movement. The fix uses an opaque renderer, a bright background, readable standard materials and lighting, direct pointer-lock ownership, and visible geometry that no longer depends on physics startup.

This boundary keeps gameplay additions testable and prevents UI work from coupling to physics presentation.
