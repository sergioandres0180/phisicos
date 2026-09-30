# Motion Lab design guidelines

These guidelines extend **Speed & Velocity: a physics videogame** to a consistent family of multilingual HTML5 physics games. Lunar Lander: Eco-Mission is the second game. Preserve existing games and their physics when adding another.

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

## 7. Multilingual behavior

Support the existing eight languages: English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, and Danish. Translate visible UI, canvas labels, dynamic explanations, accessibility labels, errors, mission feedback, page titles, descriptions, and instructions. Keep physics identifiers and formulas independent of language.

Use stable translation keys and named interpolation fields such as `{v}` and `{fuel}`. Build validation must reject missing translations or changed interpolation fields. Format numbers with the selected locale; keep numeric form values and internal physics state language-independent. Use semicolons for vector components in decimal-comma locales where needed.

Language links go to the equivalent game, not the homepage. For Lunar Lander, a one-time session transfer pauses and restores the current flight on language navigation; it does not save a leaderboard or student record. If storage is unavailable, keep navigation functional without claiming state preservation.

## 8. Game catalog and delivery

Add a homepage card only when the new game route works. Use localized navigation, equivalent language links, a unique heading, and useful instructions in the initial HTML. Retain the existing canonical/hreflang build convention. Local preview builds remain `noindex`; publishing uses the existing explicit public-origin requirement.

Runtime implementation is HTML, CSS, Canvas, and vanilla JavaScript. Do not add runtime frameworks, remote fonts, translation services, or image dependencies for these simulations. The Node build script only generates static files; it is not a game runtime requirement. Do not edit generated `dist/` files directly.

Keep previous physics engines and saved versions intact. A source change does not imply authorization to publish externally. The existing local server may continue serving the rebuilt static output.

## 9. Verification

Check the physical model with meaningful numerical examples: free fall, positive net acceleration during descent, balanced accelerations, fuel exhaustion during a step, tangential contact, and a ground crossing missed by endpoint-only detection. Confirm terminal measurements cannot change by stepping again.

Check UI controls, reset semantics, momentary-key release, automatic pauses, translated feedback, and language-state transfer. Verify that all existing games still pass their tests and that every localized game appears in the catalog and sitemap. Clearly distinguish automated DOM/Canvas-adapter checks from actual visual browser QA.

Gravity references: [NASA Glenn — Moon](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/moon/) and [NASA JPL — planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html).
