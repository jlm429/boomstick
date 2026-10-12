# Changelog

All notable changes are documented here.

## Unreleased

- Made zombie encounters more visceral with uneven upper-body motion, stronger attack poses, directional recoil, and more visible blood spray while preserving combat balance and bounded effects.
- Polished zombie materials, animation blending, foot contact cues, and hit feedback; added restrained arena and weapon wear and refined muzzle flashes, impacts, sparks, and blood with bounded particle counts and lifetimes.
- Refined the training arena with beveled industrial cover, surface grain, softer shadows, and more balanced lighting, alongside a detailed shotgun and refreshed HUD and touch controls.
- Moved short sound effects to shared decoded Web Audio playback with active-session recovery after focus or tab return, preserving the existing clips and combat triggers. See [next-pass work](docs/roadmap.md) for outstanding verification.

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
- Tightened the zombie's bite range, added subtle impact-timed bite feedback, and added a polished training completion screen with a full encounter restart.
- Added player health, a compact industrial HUD, timed zombie bite damage, critical-health edge feedback, and a death and retry sequence.
- Expanded the training encounter to five simultaneous concealed zombies and accelerated their existing hit-reaction animation.
- Varied zombie movement and run timing while coordinating stable, exclusive attack positions around the player.
- Added coarse-touch mobile browser controls for movement, look, fire, jump, reload, pause, and lifecycle-safe resume and reset while preserving the desktop input path.
- Added tap-to-shoot to the mobile look area, kept movement and action controls within safe-area-aware viewport margins, and removed bite-effect remounts that caused intermittent frame gaps.
- Added touch-position shotgun aiming and reduced high-density mobile rendering and joystick update work while keeping desktop aiming and quality unchanged.
- Stabilized mobile tap aim around the authoritative camera, increased drag-look sensitivity, preserved concurrent touch ownership, and reduced fragmented zombie draw work without changing encounter behavior.
- Kept mobile shotgun firing responsive during zombie combat by reusing exact skinned-mesh raycast work, batching hit reactions, warming reusable encounter assets after arena entry, and releasing replay-only skeleton resources.
