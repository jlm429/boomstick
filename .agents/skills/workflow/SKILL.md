# Delivery workflow skill

## Prefer vertical slices

Plan meaningful work as small, end-to-end slices that deliver a complete outcome. Include the behavior, appropriate automated coverage, applicable runtime validation, and user-facing documentation in the same slice.

When practical, complete, validate, and merge one meaningful feature before beginning the next. This is a preference, not a rigid rule. Shared prerequisites or tightly coupled work may cross slices, but keep the repository in a coherent, reviewable state and avoid leaving several features partially implemented.

## CHANGELOG and completion summaries

Write CHANGELOG entries and completion summaries around user-visible features and meaningful project progress. Prefer outcome-focused entries such as:

- Added a reload mechanic.
- Added an ammo system.
- Added ambient arena audio.
- Added a settings menu.

Omit minor refactors, internal cleanup, formatting-only changes, and small bug fixes unless they materially affect users. Mention implementation details only when they are necessary to explain behavior, validation, risk, or a follow-up. Do not create a CHANGELOG entry merely because files changed.

## Pull request readiness

Read the testing skill before a pull request. When manual verification applies, its human validation gate is required. A pull request may proceed only after the user explicitly confirms the requested validation. Existing repository rules still govern authorization to commit, push, or create the pull request.

## Quota or resource exhaustion

If execution quota or resource limits prevent completion, stop cleanly instead of lowering quality, skipping required validation, or presenting partial work as complete. Preserve the current work and provide:

1. A summary of completed work and validation already performed.
2. A clear list of remaining work, including unresolved risks or required human checks.
3. A ready-to-use continuation prompt with the goal, current state, relevant files, next actions, constraints, and validation or pull request status.

Then wait for the user. Do not attempt a degraded implementation or continue into a pull request with incomplete work.
