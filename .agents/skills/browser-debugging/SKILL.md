# Browser graphics troubleshooting skill

## Use before code changes

Before changing React Three Fiber, Three.js, Rapier, WebGL, rendering, input, or scene lifecycle for a browser-visible issue, rule out environment causes. Confirm the repository, worktree, branch, commit, development server URL, and current build first. Make sure the browser is loading current assets rather than a cached page or an old Vite server.

Use the lightest checks first:

1. Reload with cache disabled or clear the site cache, then confirm the Network panel serves current HTML and module assets without failures.
2. Inspect Console and Network for JavaScript, asset, MIME, and failed-module errors. Check that the Canvas has nonzero dimensions and that the UI is not merely overlaying it.
3. Compare the same local build in current Chrome and Firefox. Restart the browser and reproduce again.
4. Inspect WebGL context creation or loss, renderer initialization, camera, lighting, and asset readiness. In development, inspect `window.__BOOMSTICK_DIAGNOSTICS__` for Canvas size, WebGL status, frames, camera, physics readiness, player position, and input.
5. If Chrome alone fails, inspect Chrome graphics status before editing application code.

## Chrome graphics-acceleration incident

In one reported incident, the game area was black while surrounding HTML UI remained visible. Firefox rendered correctly, Chrome did not, and no obvious JavaScript error identified the cause. Chrome graphics acceleration was disabled. This is an environment failure, not proof that React, R3F, Three.js, Rapier, input, or scene code is broken.

Manual Chrome verification:

1. Open `chrome://settings/system`.
2. Enable **Use graphics acceleration when available**.
3. Completely quit Chrome with `Cmd+Q`.
4. Reopen Chrome and open `chrome://gpu`.
5. Verify hardware and WebGL acceleration are active, then test the application again.

Normal automation and DevTools may not access Chrome internal pages. Agents may inspect and report browser conditions when tooling permits, but enabling a browser-wide setting or restarting the user’s browser requires explicit authorization or manual user action. DevTools cannot normally enable hardware acceleration for the user.

## Interpreting a black canvas

Visible HTML with a black game area can mean a disabled GPU or WebGL, but it can also mean a failed context, lost context, renderer setup issue, missing assets, camera or lighting issue, unreadable materials, scene error, or a real empty scene. Do not infer the cause from the color alone. `GameViewport` registers `webglcontextlost` and `webglcontextrestored`; inspect those diagnostics before rewriting scene code.

The current scene deliberately keeps `ArenaVisuals` outside the `Physics` boundary. If visuals are present but physics is waiting, investigate physics separately. Confirm a nonzero Canvas, healthy context, advancing frames, finite camera and player values, and loaded resources before treating the issue as a rendering regression.

Report which browser, build, cache state, GPU state, diagnostics, and manual checks were used. Escalate to a focused code change only after these checks identify or reasonably exclude environment causes.
