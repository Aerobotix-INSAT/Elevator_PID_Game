# Lift Lab
A dependency-free interactive PID elevator game, inspired by William Osman's ElevatorMechanic. Original implementation with a dark control-room interface, fixed-step simulation, live PID controls, guided challenges, graphs, animated passengers and impact-driven blood effects.

Serve `dist/` with any static web server, e.g. `python3 -m http.server 8080 --directory dist`, and open http://localhost:8080. JavaScript modules require an HTTP server.

Controls: Space run/pause, R reset, 0–4 choose target floor. Reset retains gains and load; presets start a fresh ride. Challenges lock the load and destination.

Model: cabin 800 kg; passenger 75 kg; gravity 9.81 m/s²; passive drive damping 1000 N·s/m; motor ±24 kN; fixed 5 ms steps. Ideal adjustable 1:1 counterweight equals loaded cabin mass. Both masses contribute inertia: a = (Fmotor + (Mcounterweight − Mcabin)g − 1000v)/(Mcabin + Mcounterweight). No motor gravity feedforward, positional locking, or forced velocity reset (except existing shaft end-stop collisions). At rest with zero PID force the cabin remains at any height for every passenger count; while moving it coasts and needs braking. Passenger animations do not feed back into the lumped-mass plant. displayed gains scaled by 1000; derivative on measured velocity; conditional integration and bounded integral. Passenger dynamics and health are stylized educational gameplay, not a safety model. No tracking or remote dependencies.

Optional Zero I on error sign change clears accumulated error exactly on a nonzero sign reversal (including target changes and crossings through zero). It remains off by default and survives ride resets. The reset sample outputs zero I; accumulation resumes next step. Desktop workspace uses three columns at widths >=1100px and heights >=680px; smaller windows use an accessible scrolling layout. Aerobotix logo supplied by the user.

Integral accumulation max is tunable from 0 to 200 m·s (default 60), applies symmetrically, clamps immediately on reduction, and survives resets/presets. The live readout shows the stored integral before Ki multiplication.

Damping correction: increasing passive drive damping from 180 to 1000 N·s/m removes the excessive low-P ringing. This is a fixed plant parameter, independent of gains, target and velocity direction. The 0.1/0/0 case approaches monotonically for all supported passenger counts. Higher P still permits overshoot; D adds controller braking. Browser preview: npm install, then npm run dev. Runtime game still needs only a static HTTP server.
