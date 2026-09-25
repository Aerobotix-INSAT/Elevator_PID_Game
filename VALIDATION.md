# Physics and browser verification

Reported case: P=0.1, I=0, D=0, two passengers, ground to floor 03 (9 m).

- Before: reaches the 12.5 m shaft stop, 38.9% measured overshoot. Reproduced by engine simulation and browser controls.
- After: 0.0% overshoot, 37.7 s settling, 100% passenger health, confirmed by playing the corrected browser game.
- Bouncy preset: browser confirmed 24.8% overshoot and 12.4 s settling. Higher gains still demonstrate underdamped motion.

Change: fixed passive drive/guide damping increased from 180 to 1000 N*s/m. The resistance force is proportional to velocity and opposes it. It is independent of PID gain and target; it vanishes at rest. No target snapping or velocity resets were added. Both cabin and matching counterweight still contribute inertia.

Tests: `node tests/check.mjs`
- P=.1 with zero I/D: all 0–6 passenger counts, four upward/downward trips, 120 simulated seconds each. Monotonic approach, no overshoot or shaft collision, final error <0.01 m.
- Zero motor effort holds arbitrary heights at every passenger count, including load changes.
- Motor-off motion retains momentum, loses kinetic energy through damping, and is not artificially stopped.
- Symmetric motor forces, three challenge solutions, blood/impact behavior, integral limits, zero-crossing reset, UI actions and canvas drawing paths pass.

The drive damping is an explicit educational model parameter, not a calibrated value from a particular physical elevator. Existing passenger animation remains a simplified model.
