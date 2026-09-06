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
