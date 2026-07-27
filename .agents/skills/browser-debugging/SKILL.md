# Browser graphics troubleshooting skill

## Read for diagnosis

Read this skill when diagnosing a browser-only or runtime-visible failure, including stale assets, cache divergence, console or network errors, WebGL loss, a blank or black Canvas, GPU state, or Chrome-versus-Firefox differences. Do not load it solely because ordinary feature work is visible in a browser.

Before changing application code for one of these failures, confirm the repository, worktree, branch, commit, development server URL, and current build. Make sure the browser is loading current assets rather than a cached page or an old Vite server.

Use the lightest checks first:

1. Reload with cache disabled or clear the site cache, then confirm the Network panel serves current HTML and module assets without failures.
2. Inspect Console and Network for JavaScript, asset, MIME, and failed-module errors. Check that the Canvas has nonzero dimensions and that the UI is not merely overlaying it.
3. Compare the same local build in current Chrome and Firefox. Restart the browser and reproduce again.
4. Inspect WebGL context creation or loss, renderer initialization, camera, lighting, and asset readiness. In development, inspect `window.__BOOMSTICK_DIAGNOSTICS__` for Canvas size, WebGL status, frames, camera, physics readiness, player position, and input.
5. If Chrome alone fails, inspect Chrome graphics status before editing application code.

## Known failure branches

- Chrome-only failure with disabled graphics acceleration can leave surrounding HTML visible while the Canvas is black.
- A healthy WebGL context, advancing frames, initialized physics, and finite transforms can still produce an unreadable scene because of camera, lighting, fog, material, or contrast choices.

For the Chrome GPU branch:

1. Open `chrome://settings/system`.
2. Enable **Use graphics acceleration when available**.
3. Completely quit Chrome with `Cmd+Q`.
4. Reopen Chrome and open `chrome://gpu`.
5. Verify hardware and WebGL acceleration are active, then test the application again.

Normal automation and DevTools may not access Chrome internal pages. Agents may inspect and report browser conditions when tooling permits, but enabling a browser-wide setting or restarting the user’s browser requires explicit authorization or manual user action. DevTools cannot normally enable hardware acceleration for the user.

Do not infer the cause from Canvas color alone. `GameViewport` registers `webglcontextlost` and `webglcontextrestored`; inspect those diagnostics before rewriting scene code.

The current scene deliberately keeps `ArenaVisuals` outside the `Physics` boundary. If visuals are present but physics is waiting, investigate physics separately. Confirm a nonzero Canvas, healthy context, advancing frames, finite camera and player values, and loaded resources before treating the issue as a rendering regression.

Report which browser, build, cache state, GPU state, diagnostics, and manual checks were used. Escalate to a focused code change only after these checks identify or reasonably exclude environment causes.
