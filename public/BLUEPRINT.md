# Motion Lab: speed and velocity

## Purpose and learning outcomes

Audience: introductory physics students learning one- and two-dimensional kinematics. After exploring, students should be able to:

1. Distinguish total distance (a scalar) from displacement (a vector).
2. Calculate average speed and average velocity from the same trip.
3. Distinguish average quantities from instantaneous quantities.
4. Explain how a turn changes velocity without necessarily changing speed.
5. Interpret zero average velocity after a nonzero round trip.

**Terminology correction:** `d/t` is **average speed**, and `Δr/t` is **average velocity**. The arrow attached to the particle represents **instantaneous velocity**. Instantaneous speed is its magnitude. A complete circle gives zero average velocity, even when instantaneous velocity is nonzero.

## UX and layout

The desktop layout has a 285-pixel control sidebar and a fluid experiment workspace. On small screens, the workspace appears first and the controls move below it. Controls use native buttons, range inputs, and checkboxes; they support keyboard navigation and visible focus. No color distinction is needed to interpret a measurement: every color has a text label.

| Area | Contents | Teaching purpose |
| --- | --- | --- |
| Path controls | Linear/circular selector, initial x or starting angle | Compare geometry without mixing separate runs |
| Motion controls | Set current speed, reverse direction, tangential acceleration | Test what changes speed, direction, or both |
| Observation controls | Vector and trail toggles; automatic pause on return | Isolate representations and inspect exact edge cases |
| Canvas | Meter grid, particle, starting marker, traveled trail, displacement arrow, tangent velocity arrow | Contrast the route with the start-to-current vector |
| Instantaneous overlay | Current speed and Cartesian velocity components | Connect the moving arrow to its numerical vector |
| Transport bar | Play, Pause, Reset, Step +0.10 s | Explore freely or inspect slowly |
| Live measurements | t, d, displacement, average speed, average velocity | Connect observations with formulas |
| Insight panel | Context-sensitive explanations | Interpret straight travel, turns, rest, and returns |
| Mini challenge | Target-and-return or one full lap | Apply concepts and receive measured feedback |
| Expandable explanation | Equations, inequality, circular acceleration | Provide mathematical support without hiding the workspace |

Color semantics: mint = distance/current speed, blue = displacement/average velocity, white = instantaneous velocity arrow, gold = challenge target. The line's blue displacement arrow is offset below the track for legibility, with dashed connectors to the true endpoints. On the circle, it is the exact start-to-current chord.

The velocity arrow uses 8 CSS pixels per m/s, capped at 85 pixels; the cap is labeled when active. Its orientation remains exact. Coordinate geometry has a separate responsive pixels-per-meter scale. The trail is a bounded visual history, while total distance is accumulated independently and never discarded.

## Physics state and conventions

| State | Meaning | Units |
| --- | --- | --- |
| `mode` | `linear` or `circular` | — |
| `q`, `q0` | Current and initial path coordinate; x for a line, unwrapped Rθ for a circle | m |
| `speed` (u) | Instantaneous nonnegative speed | m/s |
| `dir` (σ) | Direction along increasing/decreasing path coordinate; +1 or −1 | — |
| `a` | Tangential speed-change setting | m/s² |
| `t` | Integrated simulation time | s |
| `distance` (d) | Accumulated arc length | m |
| `returns`, `lastReturn` | Return event count and measurement snapshot | — |
| `targetVisited`, `maxExcursion` | Challenge progress and greatest excursion in unwrapped q | —, m |
| `trail`, `trailClock` | Bounded drawing samples, independent of physical distance | —, s |

The interface separately stores initial configuration, running/paused state, the time accumulator, challenge state, and display toggles. Initial settings are retained for Reset; wall reflections do not overwrite the chosen initial direction. Clicking Reverse changes current direction and the direction used on Reset.

World coordinates use +x right and +y up. Canvas coordinates reverse the y direction:

```text
screenX = originX + scale * worldX
screenY = originY - scale * worldY
```

### Measurements

```text
r0 = initial position
r  = current position
Δr = r − r0 = (Δx, Δy)
|Δr| = sqrt(Δx² + Δy²)

average speed      s̄ = d / t
average velocity   v̄ = Δr / t = (Δx/t, Δy/t)
|v̄| = |Δr| / t
instantaneous speed u = |v|
```

At `t = 0`, average values are undefined and display “—”. A paused run adds no time. A running particle that has stopped still accumulates time. In the line view, displacement and average velocity are signed x-components; in the circle view, the prominent readouts are explicitly labeled magnitudes, with both signed components directly below.

The geometric invariant is `d ≥ |Δr|`, so `s̄ ≥ |v̄|` whenever `t > 0`. Values are rounded only for display; no rounded values enter the engine or challenge checks.

### Exact speed integration and braking

For a time interval h during which the control setting a is constant:

```text
τ = a < 0 ? min(h, u / (−a)) : h
Δd = u τ + ½ a τ²
u_new = max(0, u + a h)
d_new = d + Δd
t_new = t + h
```

Negative tangential acceleration means braking to rest, without automatic reversal. Once stopped, negative a has no further effect. Positive a accelerates from rest. The speed slider directly sets current u in [0, 12] m/s; positive acceleration can subsequently exceed that slider range. The live overlay always shows the actual current speed. Reset restores the most recent speed-slider setting.

### Linear path with reflections

The track extends from −10 m to +10 m:

```text
r(q) = (q, 0)
v = (σu, 0)
q_new = q + σ Δd  // within a segment
```

When the particle reaches a wall, set q to the exact boundary and flip σ. Continue integrating the remaining time. Reflections preserve speed and accumulated distance. They are idealized instantaneous changes of velocity; acceleration at the exact collision is not represented by the tangential slider. Manual reversal is also an instantaneous intervention.

### Circular path

The circle is centered at (0, 0), with R = 6 m:

```text
θ = q / R
r(q) = (R cos θ, R sin θ)
q_new = q + σ Δd
v = σu (−sin θ, cos θ)
```

Distance is accumulated from **arc length Δd**, never from the shorter straight chord between successive frames. The unwrapped q preserves whole-lap information across the ±π or 2π angle boundaries.

With outward unit normal n = (cos θ, sin θ) and positive-coordinate tangent T = (−sin θ, cos θ):

```text
a_vector = σ a_effective T − (u²/R) n
a_effective = 0 when u = 0 and the setting a < 0; otherwise a
```

The circular constraint supplies centripetal acceleration u²/R, even with zero tangential acceleration. Thus “a = 0” on the slider means constant speed, not zero total acceleration.

### Event timing and exact returns

Each advance finds the next relevant position event: a line wall, the initial x, or a circular return `q = q0 + k(2πR)`.

For travel D to that event, solve `D = uτ + ½aτ²` using the numerically stable expression:

```text
τ_event = 2D / (u + sqrt(u² + 2aD))
```

Only events reachable within the remaining timestep are selected. Integrate to the event, snap q to its exact coordinate, then reflect, continue, or pause. This prevents frame overshoot from turning a mathematically zero displacement into an arbitrary near-zero result. Trigonometric floating-point residuals are tolerated at 1e−7 m for display/challenge logic.

The animation uses `requestAnimationFrame` and a 1/120-second fixed timestep. One Step command integrates 12 substeps, or stops earlier at a return when automatic pause is enabled. Long frame gaps are capped at 0.1 seconds; backgrounding the tab pauses the simulation. The displayed elapsed time is therefore simulated time, not wall-clock time.

## Learning sequence and mini challenges

1. **Predict:** Before playing, ask which measurement will be zero after returning to the start.
2. **Explore a straight trip:** At constant speed with no reversal, observe `d = |Δx|` and `s̄ = |v̄|`.
3. **Reverse:** Observe distance increasing while displacement decreases. A negative average velocity describes the net direction from the start.
4. **Return:** Freeze the exact crossing. Show positive distance and average speed with zero displacement and average velocity.
5. **Change the geometry:** On the circle, keep speed constant and observe continuously changing instantaneous velocity.
6. **Explain:** Use the expandable equations to justify the measurements.

### Round-trip challenge

Start at −6 m, visit +8 m, then return to −6 m. Students choose speed and acceleration, and may reverse manually or use the wall. Success requires target visitation, a subsequent exact return, and positive traveled distance. Current speed may be zero at the return; average speed is still positive. The challenge forces a pause at the return so results are inspectable.

At u = 4 m/s and a = 0, letting the +10 m wall reverse the particle gives t = 8 s, d = 32 m, Δx = 0, s̄ = 4 m/s, and v̄ = 0. The instantaneous velocity is −4 m/s at the return.

“Reach a different target with zero average velocity” would be impossible for finite positive t. Requiring a visit **and a return to the initial point** makes the goal mathematically consistent.

### One-lap challenge

Start at angle 0°, complete an entire lap in either direction, and return with positive instantaneous speed. Success requires an unwrapped excursion of at least 2πR, an exact return, and u > 0. Traveling out and back along only part of the circle does not satisfy the full-lap condition.

At u = 4 m/s, a = 0, R = 6 m: t = 3π ≈ 9.4248 s, d = 12π ≈ 37.6991 m, Δr = (0, 0), s̄ = 4 m/s, and v̄ = (0, 0), while |v| = 4 m/s.

## Code structure and use

`index.html` is the complete runnable prototype: all CSS, physics, canvas rendering, and interaction code are inline. It makes no runtime library, font, image, or network requests. Open it directly in a modern browser, including from a local file. The optional blueprint link works when this companion document is alongside it.

```text
public/index.html
  <style>                       responsive layout and appearance
  semantic HTML                 sidebar, canvas, metrics, challenges
  <script id="physics-engine">  pure MotionPhysics class
    reset()                     initialize a run
    position()                  map path coordinate into 2D
    metrics()                   derive vectors and averages
    travelFor() / timeFor()      exact integration and event timing
    advance()                   advance, reflect, detect returns
  <script id="interface">       browser adapter
    refreshControls()           path and configuration labels
    updateMetrics()             measurements and learning feedback
    simulate()                  physics and challenge transitions
    draw() / resize()           high-DPI canvas renderer
    frame()                     fixed-step animation scheduling
    event handlers              controls and visibility changes
```

Verification uses Node's built-in assertion and VM modules to execute the actual embedded scripts. It covers physics invariants and interaction wiring with an in-memory DOM/canvas stub. This is not a substitute for visual browser QA. Run `node verify.cjs` from the project directory. No packages are required.

Deliberate scope: idealized track constraints, no friction, no collision deformation, no free-flight motion, no time history graph, and no persisted student data. These simplify the model while keeping distance, displacement, speed, and velocity mathematically consistent.

## Second tab: Pac-Man chase

The original **Physics lab** remains the default tab, with the same controls, linear/circular physics, and challenges. **Pac-Man chase** adds a separate animated learning game. Switching tabs pauses the run being left and preserves both simulations' positions, measurements, and settings. Accessible tabs support Left/Right, Home, and End. `lab-v1.html` is an unchanged standalone snapshot of the original version.

### Game layout and missions

The chase retains the lab's control-sidebar/canvas layout. A dark arcade track shows a yellow animated Pac-Man, an animated pink ghost, 23 collectible dots, velocity arrows for both characters, and Pac-Man's traveled trail and start-to-current displacement. All five measurement groups explicitly describe **Pac-Man**. The ghost's current speed and velocity are separately labeled above the canvas.

Controls select a mission, set both instantaneous speed magnitudes from 0–8 m/s, reverse Pac-Man, show/hide vectors or the trail, and enable automatic pause on return. Play, Pause, Restart, and Step +0.10 s operate independently of the original lab. The ghost always follows the route's positive direction. Choosing a mission resets the game and loads its speeds; subsequent speed changes apply live.

- **Catch the ghost:** Pac-Man starts at 4 m/s, the ghost at 2 m/s with a 12 m lead. Catch at exactly 6 s, after 24 m of Pac-Man travel. Displacement is (16, 8) m, with magnitude √320 ≈ 17.89 m. Average speed is 4 m/s; average velocity is (8/3, 4/3) m/s. A faster ghost reaching Pac-Man, or meeting after Pac-Man reverses, is labeled **contact**, without awarding a pursuit win.
- **The zero-velocity lap:** Both speeds start at 4 m/s. Their gap along the track remains 12 m. Pac-Man completes 48 m in 12 s and pauses at his starting point. Average velocity is (0, 0) m/s, average speed remains 4 m/s, and instantaneous speed remains 4 m/s.
- **Scoring and achievements:** Each distinct dot earns 10 points once per run, catching the ghost earns 200, and the first full lap earns 100. Achievements record a corner, a catch, and a full lap. An out-and-back trip along part of the track can have zero average velocity without earning the full-lap achievement.

Animation uses simulation time: Pac-Man's mouth opens and closes facing the direction of travel, while the ghost's skirt moves and its pupils follow its heading. Pausing also freezes animation. These procedural Canvas sprites, the maze corridor, and all controls remain inside the same HTML file.

### Chase model and equations

`ChasePhysics` is independent of the original `MotionPhysics` class. The route's four corners are (−8, −4), (8, −4), (8, 4), and (−8, 4), for a 48 m perimeter. Signed, unwrapped progress q maps to route coordinate s = ((q % 48) + 48) % 48:

```text
0 ≤ s < 16:   r = (−8 + s, −4),       T = ( 1,  0)
16 ≤ s < 24:  r = (8, −4 + s − 16),   T = ( 0,  1)
24 ≤ s < 40:  r = (8 − (s − 24), 4),  T = (−1,  0)
40 ≤ s < 48:  r = (−8, 4 − (s − 40)), T = ( 0, −1)

q_P,new = q_P + σ u_P Δt
q_G,new = q_G + u_G Δt
d_P,new = d_P + u_P Δt
v_P = σ u_P T
v_G = u_G T_G
```

Speed is constant between user interventions. Corners are ideal instantaneous changes of direction. Velocity exactly at an ideal sharp turn is not mathematically differentiable; the displayed arrow uses the outgoing segment. For negative travel, the outgoing tangent uses the preceding positive-coordinate segment, with its sign reversed.

The model splits timesteps at each Pac-Man corner, home crossing, or actor meeting. Corners are inserted into the visual trail, so the path does not cut diagonally across them. Meetings solve the relative-progress equation:

```text
r = q_P − q_G
w = σ u_P − u_G
r + w Δt = k · 48
Δt_meeting = (k · 48 − r) / w
```

Choose the nearest strictly forward reachable integer multiple in the sign of w; when w = 0 and the actors start apart, no meeting occurs. The first meeting ends the run. Pac-Man earns a pursuit catch only if σ = +1 and u_P > u_G; other meetings are contact. Simultaneous catch/return events credit both a catch and a full lap, and display one combined result.

Track gap is `(q_G − q_P) mod 48` in the positive route direction. It is explicitly labeled **gap along track (+q)**, not Euclidean separation or shortest separation. Displacement and all average quantities still use Cartesian positions, exactly as in the first lab.

New code blocks in `index.html`:

```text
<script id="chase-physics">    route mapping, meetings, corners, dots, metrics
<script id="chase-interface">  chase controls, sprites, scoring, explanations
<script id="experience-tabs">  accessible tab switching and independent pauses
```

Run `node verify.cjs` for the original lab and `node verify-chase.cjs` for the game and integration. The chase checks include corner tangents, catch/contact timing, simultaneous events, zero average velocity, partial returns, distinct-dot scoring, direction-aware explanations, preserved tab state, keyboard tabs, and background pausing. `node build.cjs` copies the complete prototype, blueprint, and archived first version into the static output folder.
