# Architecture skill

Keep React UI in `src/ui`, coarse app state in `src/game/store.ts`, reusable gameplay math in `src/game`, and rendering plus Rapier components in `src/scene`. Gameplay rules must not depend on Three.js presentation. Per-frame values stay in refs or the render loop, never React state.
