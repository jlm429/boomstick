# Browser game performance skill

Keep the Canvas mounted through gameplay. Avoid allocations, subscriptions, and state updates in `useFrame`; reuse vectors and refs. Use bounded device pixel ratio and profile real-browser input and frame pacing after substantial scene changes.
