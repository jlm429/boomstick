# Deployment skill

Boomstick publishes the Vite `dist` output to GitHub Pages at `/boomstick/`. `vite.config.ts` sets `base: '/boomstick/'`; change it only with an intentional repository or hosting-path change.

`.github/workflows/ci.yml` validates every push and pull request on Node 22. `.github/workflows/deploy-pages.yml` deploys pushes to `main` and manual dispatches with the minimum Pages permissions currently needed. Treat both workflows as production infrastructure: preserve least privilege, do not add expensive browser tests without checking CI constraints, and distinguish local checks from remote CI results.

Read [docs/deployment.md](../../../docs/deployment.md) before a hosting or workflow change. Build with `npm run build` before deployment-related handoff. Do not push, deploy, modify remotes, or change repository settings unless explicitly authorized.
