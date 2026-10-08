# Phisicos design guidelines

These guidelines extend **Speed & Velocity: an educational simulation game** to a consistent family of multilingual HTML5 educational simulation games. Train Track, Lift Trips, Dog Walk, Graph Rider, Galileo's Bells, Stop on the Line, Lunar Lander: Eco-Mission, Unit Pipeline, the Powers-of-Ten Probe, River Crossing, Orienteering Walk, Force Table, Loading Ramp, Lighthouse Rescue, and Ferris Wheel follow it. Preserve existing games and their physics when adding another.

## 1. Experience and teaching

Open on the working simulation. A short title and one sentence of context introduce the concept; the canvas and controls should be visible without a separate start screen. Use the sequence **explore → predict → measure → explain**.

Every game needs:

- A clear, measurable mission that illustrates the physical concept.
- Native controls for initial conditions and the quantities the learner can change during a run.
- Live numerical measurements with labels, symbols, signs, and SI units.
- Vectors on the moving object and a legend that explains each color.
- Contextual feedback that describes the current state, including counterintuitive cases.
- A Play, Pause, Reset, and Step Forward transport bar directly below the canvas.
- A compact explanation of the equations and modeling assumptions below the working area.

Do not equate a paused simulation with physical rest. Pausing freezes time; it does not set velocity to zero. Preserve the result that explains a failure or success, rather than replacing it with a cosmetic zero.

## 2. Layout

Use the shared 1440 px maximum-width shell with 34 px desktop side padding. The standard desktop workspace has a 285 px sidebar and a flexible canvas area, separated by 20 px. At intermediate sizes the sidebar may narrow to 255 px. Below 760 px, put the simulation first and controls beneath it; controls may occupy two columns when labels still fit.

Sidebar order:

1. **Prepare:** choose the environment and initial conditions.
2. **Control:** change the active motion input.
3. **Observe:** toggle vectors, guides, and explanatory overlays.

Workspace order: scene header, canvas, vector legend, optional equation strip, transport controls, metrics, contextual explanation, mission/achievements. Keep explanatory articles below this workspace. Make long translated labels wrap; do not force fixed widths that clip them.

## 3. Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Background | `#edf1f5` | Page background |
| Paper | `#ffffff` | Control and measurement panels |
| Ink | `#152938` | Main text |
| Muted | `#526574` | Secondary text on light surfaces |
| Border | `#d9e2e8` | Panel and control dividers |
| Navy | `#102637` | Simulation canvas |
| Green | `#087f63` | Primary actions and scalar values on white |
| Mint | `#75efc7` | Active motion input, trail, success on navy |
| Blue | `#245fc5` | Vector values on white |
| Sky | `#77b9ff` | Vector overlays on navy |
| Orange | `#efb958` | Opposing acceleration, warnings, targets |
| White vector | `#f2f8fc` | Instantaneous velocity |

Keep the family palette rather than introducing a new theme for every game. Color must always be backed by labels, symbols, direction, or text. Never use mint text on white for essential information; use the darker green instead.

Lunar Lander assigns orange to downward gravity, mint to upward propulsion, sky to their vector sum, and white to velocity. Use green-tinted feedback for learning/success and orange-tinted feedback for warnings. A crash must include the measured impact speed and a useful explanation.

## 4. Typography and controls

Use the existing system sans-serif stack; use a system monospace stack for changing numerical values and equations. Body explanations are 16 px or larger, regularly used labels are 14 px, and compact secondary metadata can use 12–13 px. Titles use a responsive 27–38 px range. Preserve readable line height, visible focus outlines, and browser text zoom.

Use native buttons, range inputs, checkboxes, and disclosure elements. Give all inputs associated labels. Touch controls need at least a 44 px usable height. Selected choices use `aria-pressed` or `aria-current`; transient results use a restrained live region. Do not announce rapidly changing measurements every animation frame.

Use 16 px panel radii, approximately 8–10 px control radii, and 1 px borders. Avoid unnecessary shadows and decorative cards. Canvas objects may be procedural game sprites, while geometry and arrows must follow the actual numerical state.

## 5. Motion and physical correctness

Keep a pure physics class separate from drawing and DOM updates. Store SI values at full numerical precision. Round only when formatting output. Convert world coordinates to screen coordinates at drawing time; screen y increases downward, while the scientific convention should be explicitly labeled.

Use `requestAnimationFrame` with a 1/120 s fixed simulation step. A Step command advances 0.10 s unless a terminal event occurs earlier. Hidden pages pause. Clear momentary keyboard inputs on blur or visibility changes so a held thruster cannot stick. Keep voluntary toggle settings distinct from momentary input.

Use exact event timing where crossing accuracy affects a lesson: reflection, return, catch, fuel exhaustion, or touchdown. Do not infer an event only from the final point of a long timestep. A trajectory may cross the platform and mathematically rise again within that interval.

Arrow length must represent magnitude with a stated visual scale or cap. A velocity arrow may be capped for legibility, but the numerical value must remain exact. Distinguish acceleration arrows from velocity arrows. Acceleration changes velocity over time; it does not directly set velocity.

## 6. Lunar Lander physics contract

Only vertical motion is controlled. The module starts directly above its landing platform; no horizontal input is required. Height h is measured from the landing feet to the platform. Upward is positive.

```text
a_gravity = −g
a_thrust = u × aMax       (u = 0 if fuel is empty)
a_net = a_thrust − g
v_new = v + a_net Δt
h_new = h + v Δt + ½ a_net Δt²
fuel_new = fuel − u Δt
```

The fuel allowance is measured in seconds of full-power burn. It is a teaching abstraction, not propellant mass. Keep module mass constant and omit atmospheric drag, including on Mars, to isolate the gravity/propulsion relationship. Default gravity values are approximately 1.62 m/s² on the Moon and 3.71 m/s² on Mars. The gravity slider permits controlled experiments beyond those presets.

Split integration at fuel exhaustion. Solve `h + vτ + ½aτ² = 0` for the earliest downward/tangential platform contact in the current interval. Freeze and retain the velocity and accelerations just before contact; label that snapshot. The resting module afterward would have zero velocity and zero net acceleration because the platform supports it.

Safe landing is `|v_contact| ≤ 1.5 m/s`; precision is `≤ 0.5 m/s`. These are game tolerances, not spacecraft engineering limits. Eco success requires safe landing and at least 30% of the simulated fuel remaining. Crashing cannot earn a fuel-saving score. Do not claim this score measures real environmental emissions.

The optional braking guide uses `d_stop = v² / (2a_available)` for a descending module when selected propulsion exceeds gravity. It predicts stopping at zero velocity at the selected power, assumes sufficient fuel, and warns when that assumption fails. If propulsion does not exceed gravity, show that no finite braking distance is available. Expand the altitude view when the module rises instead of silently imposing a physical ceiling.

## 6a. Unit Pipeline contract

The tank is a rectangular box with vertical walls; the pump delivers a constant volumetric flow rate Q. Store V in m³ and Q in m³/s, derived from the given everyday values; the fill time is `t = V ÷ Q`, the level is `h = V_filled ÷ A`, and the surface rises at `v = Q ÷ A`. Solve the tank-full event exactly at `t = V ÷ Q`, then stop the pump (v = 0).

Every conversion factor is an exact equality written as a fraction, so its value is 1. The learner's chain multiplies `V ÷ Q` by factors; a prediction is valid only when the units reduce to s. Never read a number with leftover units as a time: show the leftover units, and flag a factor that increases the total unit exponent. Chain edits and level changes reset elapsed time. Volumetric flow rate is a scalar, so it is labelled, not drawn as a vector; the white surface-velocity arrow states its per-level scale. Do not size the timeline from the true fill time before the tank is full.

## 6b. Powers-of-Ten Probe contract

Each trip is straight-line motion at constant speed from prefixed givens converted to SI (`t = d ÷ v`). Arrival is solved exactly at `t = d ÷ v`. Keep the SI values of d and v hidden until launch, because that conversion is the learner's task. Predictions are entered as `a × 10ⁿ s`; accept any positive a, but credit scientific notation only for `1 ≤ a < 10`. The right power of ten means `|log₁₀(prediction ÷ actual)| < 0.5`; accuracy means within 2%.

Playback is scaled by a stated power of ten (`k` physical seconds per playback second), chosen so each trip lasts 3–15 s. For both measurement games, a Step advances 0.10 s of playback, which equals 0.10 s × the playback factor of simulated time; at ×1 this matches the family rule. The ruler uses one prefix per view, chosen from the view width; the velocity arrow shows the distance covered in 1 s of playback on the same ruler and is labelled when capped. Landmarks are drawn to scale only when they are between 4% and 95% of the view width.

## 6c. Vector games contract

**River Crossing.** x points downstream and y across the river; heading θ is measured from straight across, positive upstream, limited to ±75°. The ground velocity is `v = v_b + v_w` with `v_b = s(−sin θ, cos θ)` and `v_w = (u, 0)`. The landing is solved exactly at `t = W ÷ v_y`. Draw v_b and v_w tip to tail with their sum v, at a stated arrow scale. The least-drift mission uses `x_min = W·√(u² − s²) ÷ s` when the current is faster than the boat. Playback runs ×5.

**Orienteering Walk.** Legs are (distance, bearing clockwise from north); components are (east, north). The hiker walks at a constant 1.5 m/s with every corner and the finish solved exactly from the path length. Always show the scalar distance walked next to the displacement vector. A zero displacement has no direction: never display a bearing for it. Reversing the leg order must not change the displacement; multiplying by −1 reverses every leg. Playback runs ×60.

**Force Table.** Angles are counter-clockwise from 0°. Forces are constant during the short slide. The ring (0.2 kg) is held by static friction while `|ΣF| ≤ 0.05 N`; otherwise it accelerates along ΣF at `(|ΣF| − 0.04 N) ÷ m` until it reaches the stop pin 4 cm from the centre, solved exactly. A balanced ring must hold for 0.5 s. Keep the net force hidden until release, show Σ|F| as a contrasting scalar, and label any arrow exaggeration (ΣF is drawn ×3). Playback runs ×0.1 (slow motion).

## 6d. Trigonometry games contract

All three use one scale for both axes, so every angle on screen is drawn at its true size. Answers are typed; Play stays disabled until an answer is valid, and the unknown is never revealed by the scene before launch. Sides are named relative to the marked angle (opposite, adjacent, hypotenuse), never relative to a fixed corner. Spanish and Portuguese write sine as `sen`; every other language uses `sin`.

**Loading Ramp.** x along the ground from the foot of the ramp, y up. The exact triangle is solved from two givens; the learner's answer sets the platform height, the platform distance, or the ramp length. A winch pulls the box at a constant 0.5 m/s along the ramp; the end is reached exactly at `t = length ÷ speed`. The ramp fits when the answer is within 1% of the exact side. Playback runs ×2.

**Lighthouse Rescue.** x out to sea from the foot of the lighthouse, y up from sea level; the lamp is at (0, H). The drone flies in a straight line at a constant 10 m/s, from the lamp to sea level or from the ship to x = 0, solved exactly from the path length. A hit is within 5 m of the ship or the lamp; precision is within 1% of the exact answer. Playback runs ×4.

**Ferris Wheel.** θ counter-clockwise from 3 o'clock, x right and y up from the hub; R = 10 m, hub height C = 12 m, ω = 1.5°/s. The cabin stops exactly at `t = θ ÷ ω`. Predictions accept decimals and exact forms built from whole numbers, fractions, and square roots, and must lie in [−1, 1]. Both values within 0.01 find the cabin; exact forms equal to the true values earn the bonus. Playback runs ×20.

## 6e. Position games contract

All three are one-dimensional. Position is always a signed number measured from a stated origin along a stated positive direction; distance is never negative and only grows; displacement is final minus initial position. Never display a value that lets the learner read the answer before predicting. Play stays disabled until every prediction is entered.

**Train Track.** Stations sit at fixed track coordinates u (m east of A); a frame turns them into positions, x = dir · (u − u_origin). The train runs at a constant 20 m/s and arrives exactly at |Δu| ÷ v. Predictions are judged in the mission's frame. The frame can be explored only after arrival and never moves the train; Reset restores the mission frame. Playback runs ×5.

**Lift Trips.** y is the height of the lift floor above the ground floor, up positive; floors are 3 m apart. The trip is an exact schedule of moving legs at 2 m/s and 1 s dwells with zero velocity at intermediate stops, so position, velocity, and distance follow analytically at any time. The distance counter only grows; the trip log's total ink equals the distance. Playback runs ×3.

**Dog Walk.** x is measured from the bench, +x toward the lake. A walk is a list of constant-velocity legs, so x(t) is piecewise linear and every answer (positions, differences, sums of |Δx|, the first return to x = 0, the maximum |x|) is computed exactly from the breakpoints. The path and the graph share one vertical scale. A first-try bonus counts completed walks. Playback runs in real time.

## 6f. Acceleration games contract

All three are one-dimensional with constant acceleration on each piece of the motion, so position and velocity are evaluated in closed form (`v = v₀ + a·t`, `x = x₀ + v₀·t + ½·a·t²`) rather than integrated. Velocity is always continuous; only the acceleration may change instantly. Acceleration arrows are drawn separately from velocity arrows, with a stated scale. Playback runs in real time.

**Graph Rider.** x along a straight track from the start, +x right. A target is v₀ and legs of (duration, constant acceleration); the learner's plan keeps the legs and chooses one acceleration per leg, from −3 to +3 m/s² in 0.5 m/s² steps. Play is always enabled because every plan is complete. The run ends exactly at the end of the last leg and keeps its final velocity (it does not stop). The planned line is drawn only as far as the cart has driven, so the slopes cannot be matched by eye before playing. Area under the learner's trace is shaded as the displacement; area below the axis is negative. A match needs every leg's acceleration to equal the target's.

**Galileo's Bells.** x down the ramp from the release point; the ball starts from rest at t = 0 and keeps one constant acceleration along the ramp (rolling and friction are folded into a) until the end stop at x = L, solved exactly at `t = √(2L ÷ a)`. Each bell rings exactly at `t = √(2d ÷ a)`, never at the end of a timestep. Rings are sorted by time and compared with beats 1–4; a steady beat needs every ring within 0.05 s of its beat. Each ramp is a little more than twice the last bell's distance so that the a·t² slip still fits on it. The ramp is drawn at a fixed slope, stated on the canvas, with distances along it to scale. Sound is optional, synthesized with Web Audio, and silently absent where Web Audio is missing.

**Stop on the Line.** x is the front bumper's position from the stop line, +x in the direction of travel. The car starts at a fixed x₀ per mission and cruises at v₀; braking starts at the learner's distance d before the line (after a 1 s reaction time on the reaction mission, where the light turns red at d), with constant deceleration a until v = 0, solved exactly at `t_brake + v₀ ÷ a`. At rest, velocity and acceleration are both zero. Valid answers are 0 < d ≤ |x₀| and 1 ≤ a ≤ 10 m/s². The road view is fixed per mission so that it never hints at the answer; a car that overruns the view is labelled with its exact position. Stopping within 0.5 m of the line succeeds. If the car crosses the line, report the crossing speed from `v² = v₀² − 2·a·s`. The values are teaching examples, not road-safety limits.

## 6g. Free-fall games contract

All three are one-dimensional with g = 9.8 m/s² (1.62 m/s² on the Moon), constant over the motion, and no air resistance, so position and velocity are evaluated in closed form. State the axis and its positive direction on the page and keep the sign of g consistent with it. A typed answer is right within 2% (Drop Test, Straight Up) or within 0.005 s or 0.5 cm (Reaction Ruler).

**Drop Test.** y is the height of the bottom of the ball above the ground, up positive. The ball is released from rest at y = h and lands exactly at `t = √(2h ÷ g)`; the velocity just before contact is kept. On the heavy-or-light mission, two balls of different mass fall side by side. A strobe image every 0.1 s shows the growing spacing. Playback runs in real time.

**Straight Up.** y is the height above the throwing hand, up positive. The ball leaves the hand at +v₀ and has a = −g the whole time, at the top too. The top (`t = v₀ ÷ g`) and the catch (`t = 2v₀ ÷ g`) are solved exactly; only the catch ends the run, and the velocity just before the catch is kept. Signed answers (acceleration, return velocity) accept either sign as input and judge it. The view and graph use the same scales for every throw so they never give the answer away. Playback runs in real time.

**Reaction Ruler.** d is how far the 30 cm ruler has fallen through the open fingers, down positive. It falls from rest with d = ½·g·t² until the catch, or until it slips through at `t = √(2L ÷ g)`, both solved exactly. Scored drops play ×0.1 (slow motion). The test-yourself drop plays in real time after a random 1–3 s wait; a catch before the drop is reported as too early, and the result is not scored.

## 6h. Formula games contract

The unknown and every given carry the values of one real situation, so each rearrangement can be checked as numbers. Formulas and letters stay the same in every language; only explanations are translated.

**Formula Balance.** Each side is a coefficient times letters raised to powers. Allowed steps are × or ÷ by a letter, × 2, ÷ 2, a square, and a square root, applied to both sides, the left only, or the right only, at most 12 steps, with undo and restart. The target is isolated when it stands alone with power 1. Weighing swings the beam with a damped motion toward an angle set by the difference between the sides (at most 0.35 rad), ending exactly after 4 s. All values are positive, so a square root is always allowed.

**Undo Machine.** A formula is a forward chain of single operations on the unknown; the learner builds a reverse chain of up to six boxes from the inverses (+/−, ×/÷, square/√), applied in order to the known value. A token spends 0.8 s on each stretch of pipe, so a run lasts 0.8 s × (boxes + 1). A square root of a negative value stops the run with its own feedback. A result is right when it equals the true value within rounding.

**Formula Test Drive.** x is measured from the goal line, +x in the direction of travel. Each situation offers four rearrangements: one right and three common mistakes; from the second situation on, at least one wrong option has the right units, so a unit check alone is not enough. The car moves with the chosen value, with constant acceleration on each piece, computed exactly. Success is within 0.5 m of the line or 0.05 m/s of the target speed. Runs longer than 8 s play faster, and the factor is shown. The units shown with each formula are derived from the units of the givens.

## 6i. Projectile games contract

All three use g = 9.8 m/s², no air resistance, x horizontal and y up, and evaluate the motion in closed form: x = x₀ + vₓ·t with constant vₓ, and y = y₀ + v_y0·t − ½·g·t². Every view uses one scale for both axes, so paths are true parabolas, and the view is fixed per mission or for the whole game, so it never gives an answer away. The top and the landing are solved exactly inside long steps; the velocity just before landing is kept. Velocity arrows show v in white and its components in blue, at a stated scale. A typed answer is right within 2%, or within 0.5° for an angle. Playback runs in real time.

**Air Drop.** The crate leaves a plane in level flight at (x_r, h) with velocity (v, 0). With a target, x is measured from the target and the answer sets the release point (a lead of 0 is allowed, to show the overshoot) or the altitude; without one, x is measured from the release point and nothing on screen measures the answer. The plane keeps flying at v, so it stays exactly above the crate. A ball dropped from rest at the release point falls level with the crate. Strobe images every 0.25 s.

**Two Shadows.** The ball is launched from the floor at v₀ and θ. The floor shadow shows x(t), a uniform motion; the wall shadow, on a wall at x = −5 m, shows y(t), a vertical throw. The view is fixed at −8 to 50 m for every throw. Velocity values and arrows appear only once the ball is in the air, and vₓ stays hidden until landing when it is the answer. Strobe marks every 0.2 s on the floor, the wall, and the path.

**Range Cannon.** Launch and landing are at ground level, so R = v₀²·sin(2θ) ÷ g. An angle or speed answer aims the cannon, and a range answer plants a flag; speed answers are limited to 60 m/s, so a shot lasts at most about 9 s. For an angle that hits a target, either root counts. The field is fixed at 0 to 80 m. The range–angle graph shows R(θ) for the shot's speed only after landing, so it never reveals an answer before the shot.

## 7. Multilingual behavior

Support the existing eleven languages: English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, Danish, Brazilian Portuguese (`pt`, `pt_BR`), Hindi (`hi`, `hi_IN`), and Japanese (`ja`, `ja_JP`). Hindi is written in Devanagari with Latin digits and a decimal point; unit symbols (m, s, m/s) and sin, cos, and tan stay in Latin script, as in Indian textbooks, and its URL slugs are transliterated into ASCII. Japanese (`ja`, `ja_JP`) follows the same rules for digits, unit symbols, sin/cos/tan, and romanized slugs; its headings use `word-break: auto-phrase`, and its meta descriptions may be shorter (over 50 characters) because each character carries more content. Translate visible UI, canvas labels, dynamic explanations, accessibility labels, errors, mission feedback, page titles, descriptions, and instructions. Keep physics identifiers and formulas independent of language.

Use stable translation keys and named interpolation fields such as `{v}` and `{fuel}`. Build validation must reject missing translations or changed interpolation fields. Format numbers with the selected locale; keep numeric form values and internal physics state language-independent. Use semicolons for vector components in decimal-comma locales where needed.

Language links go to the equivalent game, not the homepage. For every template-driven game, a one-time session transfer pauses and restores the current state (flight, tank and chain, or trip, prediction and zoom) on language navigation; it does not save a leaderboard or student record. If storage is unavailable, keep navigation functional without claiming state preservation.

## 8. Game catalog and delivery

Every game belongs to exactly one topic (Motion, Measurement, Formulas, Vectors, Trigonometry, Projectile motion) and lives at `<games index>/<topic>/<game>/`. A new game appears on its topic page, in the topic's group on the homepage, and in the topic's section of the Games menu; breadcrumbs follow the URL. Never move a published route without adding its old path to `locales/legacy-routes.cjs`, which the hosting build turns into a 301 redirect. To group games across topics (for example uniform linear motion), add a collection in `locales/tags.cjs` instead of moving games: the games keep their routes, gain an "Also in" link, and appear on the collection page. Add a homepage card only when the new game route works. Use localized navigation, equivalent language links, a unique heading, and useful instructions in the initial HTML. Retain the existing canonical/hreflang build convention. Local preview builds remain `noindex`; publishing uses the existing explicit public-origin requirement.

Runtime implementation is HTML, CSS, Canvas, and vanilla JavaScript. Do not add runtime frameworks, remote fonts, translation services, or image dependencies for these simulations. The Node build script only generates static files; it is not a game runtime requirement. Do not edit generated `dist/` files directly.

Keep previous physics engines and saved versions intact. A source change does not imply authorization to publish externally. The existing local server may continue serving the rebuilt static output.

## 9. Verification

Check the physical model with meaningful numerical examples: free fall, positive net acceleration during descent, balanced accelerations, fuel exhaustion during a step, tangential contact, and a ground crossing missed by endpoint-only detection. Confirm terminal measurements cannot change by stepping again.

Check UI controls, reset semantics, momentary-key release, automatic pauses, translated feedback, and language-state transfer. Verify that all existing games still pass their tests and that every localized game appears in the catalog and sitemap. Clearly distinguish automated DOM/Canvas-adapter checks from actual visual browser QA.

Gravity references: [NASA Glenn — Moon](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/moon/) and [NASA JPL — planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html).
