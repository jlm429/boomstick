# Boomstick

Modern browser FPS built with React Three Fiber.

**Play:** https://jlm429.github.io/boomstick/ (becomes active after deployment if GitHub Pages has not yet been enabled).

Boomstick is an original, single-player first-person arena combat prototype. It pairs a polished React interface with a compact React Three Fiber and Rapier arena.

## What is included

- Full-screen menu, About screen, accessible pause menu, HUD, and pointer-lock guidance
- Procedural, high-contrast arena with a visible sky, landmark, lighting, conservative shadows, matching collision, and gravity
- WASD movement, mouse look, jumping, pause, restart, and an authoritative pointer-lock lifecycle
- A retro shotgun with multi-pellet hitscan fire, fixed targets, hit feedback, and line-of-sight occlusion
- React 19, TypeScript, Vite, Three.js, React Three Fiber, Rapier, Zustand, Vitest, ESLint, and Prettier
- GitHub Actions validation and Pages deployment

## Local development

```sh
npm install
npm run dev
```

Open the local address Vite prints. See [docs/controls.md](docs/controls.md) to enter the arena and
learn the controls.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [docs/development.md](docs/development.md), [docs/architecture.md](docs/architecture.md), and [docs/deployment.md](docs/deployment.md) for project details.
