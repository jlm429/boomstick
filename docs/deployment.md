# Deployment

The Pages workflow deploys every push to `main` and publishes Vite's `dist` directory at `https://jlm429.github.io/boomstick/`.

One repository-side setting may still be required: in **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The workflow then creates the `github-pages` environment and deploys automatically.

The Vite `base` option is `/boomstick/`; do not change it unless the repository name or hosting path changes.
