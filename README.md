# Boomstick

Modern browser FPS built with React Three Fiber.

**Play:** https://jlm429.github.io/boomstick/ (becomes active after deployment if GitHub Pages has not yet been enabled).

Boomstick is an original, single-player first-person movement prototype. It pairs a polished React interface with a compact React Three Fiber and Rapier arena. The initial milestone deliberately focuses on movement, atmosphere, and a clean foundation rather than combat systems.

## What is included

- Full-screen menu, About screen, accessible pause menu, HUD, and pointer-lock guidance
- Original indoor sci-fi arena with fog, lighting, shadows, collision, and gravity
- WASD movement, mouse look, jumping, pause, restart, and return-to-menu flows
- React 19, TypeScript, Vite, Three.js, React Three Fiber, Rapier, Zustand, Vitest, ESLint, and Prettier
- GitHub Actions validation and Pages deployment

## Local development

```sh
npm install
npm run dev
```

Open the local address Vite prints. Select **Play**, then click **Enter arena** to capture the pointer. Use `WASD` to move, mouse to look, `Space` to jump, and `Esc` to pause.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

See [docs/development.md](docs/development.md), [docs/architecture.md](docs/architecture.md), and [docs/deployment.md](docs/deployment.md) for project details.
