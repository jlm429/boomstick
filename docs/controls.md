# Controls

Select **Enter Arena** from the main menu, then select **Enter Arena** to capture the pointer. The prompt
explains mouse capture before the run starts. The browser's pointer-lock event is authoritative:
movement and mouse look begin only after capture succeeds. If pointer lock is released, the game
pauses and clears held input. Select **Resume** to capture the pointer again from that click.

From the pause dialog, select **Restart** to return to the arena spawn and begin a fresh training
run with full health, a restored weapon, restored lights and targets, and no zombie, or select
**Return to Main Menu** to return to the landing page. After the zombie's corpse is removed, the
game pauses and shows **Training Complete**. Select **Restart Training** to reset the full encounter
and capture the pointer for a fresh run.

| Input                | Action                                |
| -------------------- | ------------------------------------- |
| Enter Arena / Resume | Capture pointer and enable mouse look |
| `W` `A` `S` `D`      | Move                                  |
| Mouse                | Look                                  |
| Left click           | Fire the shotgun                      |
| `R`                  | Reload the shotgun magazine           |
| `Space`              | Jump                                  |
| `Esc`                | Pause and release pointer lock        |

The player starts each run with 100 health. The health module immediately left of ammunition is
green above 60 health, amber from 31 through 60, red from 1 through 30, and disabled at zero. Damage
briefly pulses the module. While the player is alive at 1 through 5 health, a red edge vignette warns
of critical health. At zero health, movement, mouse look, firing, and reload stop during a roughly
one-second camera drop and fade. The defeat screen then offers **Retry**, which restores a fresh run
and captures the pointer, or **Return to Main Menu**.

The shotgun starts each run with 10 rounds. Each valid shot consumes one round, and firing is
disabled while the magazine is empty or a reload is in progress. Press `R` with a partially empty
magazine to begin a fixed 1.15-second reload that refills all 10 rounds. At zero rounds, the HUD
shows **R to Reload** until reloading begins or ammunition is restored; firing while empty pulses
the reminder again without adding another message. A successful shot plays the shotgun blast once,
and each trigger press while empty plays the empty-trigger sound once. A valid reload plays its sound
once when reloading begins; rate-limited shots, shots during reload, and ignored reload attempts are
silent.

Shots play an impact sound when their nearest pellet collisions hit arena walls, obstacles, or
targets. Each target's visible meter updates as hits reduce its health. Pellet damage scales smoothly
with distance from the shot origin and accuracy on the target face. A depleted target remains visible,
dims, and no longer reacts to hits. Depleting every target starts one 3, 2, 1 countdown, after which
their collision is removed and one zombie appears. The zombie pursues the player, attacks while
facing the player within the 0.80-unit bite range, and immediately resumes chasing beyond that
range. A valid bite lands after a 240-millisecond windup, deals 5 damage, produces a brief subtle red
burst, and begins a 1.25-second cooldown. Leaving range or ending active play cancels a pending hit.
The zombie reacts to shotgun hits and stops moving and colliding when killed. Arena lights hit from
at most 18 units away visibly break, stop illuminating the arena, and play their destruction sound
once. Later hits on the same light use the normal surface impact sound until Restart restores it.

The main menu and pause dialog work without pointer lock. Mouse and keyboard are recommended for this prototype.
