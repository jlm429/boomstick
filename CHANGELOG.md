# Changelog

All notable changes are documented here.

## [0.1.0] - 2026-07-16

- Initial playable Boomstick movement prototype.
- Repaired the arena entry and pointer-lock lifecycle so input and physics only run during an active locked session.
- Improved the landing identity, arena visibility, entry guidance, and pause/resume flow.
- Rebuilt the arena with a bright procedural level, matching visual and physics boundaries, readable obstacles, and a landmark facing the spawn.
- Unified menu, entry, play, and pause transitions around authoritative pointer-lock events.
- Stabilized player input, camera following, restart behavior, invalid transform recovery, and large frame-delta handling.
- Added development-only runtime diagnostics for Canvas, WebGL, Rapier, camera, player, input, and frame-loop inspection.
- Added breakable arena lights that reset on restart, with one-time destruction audio and distance-attenuated impact sounds for arena surfaces and targets.
- Added target health meters and smoothly scaled shotgun damage based on range and face accuracy.
- Added a one-time training countdown and first zombie encounter after every target is depleted, including pursuit, shotgun hit reactions, death, and full restart reset.
- Polished the first zombie encounter with impact-point blood bursts, collider-aware obstacle steering, close-range attack animation and bite audio, hit recovery, and timed corpse cleanup.
