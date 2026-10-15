# Waves expansion: handoff for the next agent

This file is for an agent picking up the Waves work on Phisicos, a static, multilingual (11 languages) site of educational physics simulation games, in this folder (`speed-velocity-lab`; it is not a git repo). Read it top to bottom before touching anything, then read `DESIGN_GUIDELINES.md` (§6r is the Waves contract) and the Waves section at the end of `README.md`.

Standing rules from the owner:

- **Nothing is published.** Never deploy, upload, or run the hosting packager unless asked.
- **Translations need native review.** Say so in every final report.
- **Final reports are concise** and must mention any number that differs from what was proposed.
- Keep existing games, routes, and physics intact. Never rename a published route.

## 1. Where things stand

- The site builds **1210 pages** (110 per language) after all twenty-four new Waves games (Pebble Ripples, Power on a Rope, Ripple Tank Ruler, Antenna Workshop, String Tuner, Strobe Freeze, Surfer's Wait, Tide Clock, Rope Tension Lab, Tsunami Race, Slinky Lab, Earthquake P and S, Echo Sounder, Bank Shot Ripples, Shallow Beach, Spearfishing, Two Speakers, Beat Tuner, Harbour Gap, Laser Slit, Ambulance Pass-by, Paddling Duck, Decibel Meter, Bottle Flute); it was 946 before them.
- Waves topic (`locales/topics.cjs`, id `waves`; slugs: en `waves`, es `ondas`, fr `ondes`, de `wellen`, nl `golven`, fi `aallot`, nb/da `bolger`, pt `ondas`, hi `tarangen`, ja `nami`).
- Games in the topic, in playing order: `pulse` (Rope Pulse), `ripples` (Pebble Ripples), `ropepower` (Power on a Rope), `rippletank` (Ripple Tank Ruler), `wavemachine` (Wave Machine), `strings` (String Tuner), `strobe` (Strobe Freeze), `surf` (Surfer's Wait), `tide` (Tide Clock), `tension` (Rope Tension Lab), `tsunami` (Tsunami Race), `slinky` (Slinky Lab), `quake` (Earthquake P and S), `echo` (Echo Sounder), `bank` (Bank Shot Ripples), `beach` (Shallow Beach), `spear` (Spearfishing), `antenna` (Antenna Workshop), `sound` (Sound in Slow Motion).
- **Open decision for the owner:** with all 24 planned games the Waves topic would hold 27 (it holds 27 now). The proposal was to split it into three topics: **Waves** (amplitude, wavelength, frequency, period, speed, transverse and longitudinal, reflection: 14 games + Rope Pulse and Wave Machine), **Wave phenomena** / *Fenómenos ondulatorios* (refraction, interference, diffraction) and **Sound** / *Sonido* (Doppler, sound, + Sound in Slow Motion). Ask before splitting: moving a game to another topic changes its route, and published routes need an entry in `locales/legacy-routes.cjs`. Nothing is published yet, so moving is still cheap, but confirm first.

## 2. The plan: 24 games, two per subtopic

Status: **done** = built, localized, registered, verified, screenshotted, documented. Numbers in brackets are the expected answers.

| # | Subtopic | Game (kind) | Tests to build | Formula | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Amplitud | Pebble Ripples (`ripples`) | see §4 | A ∝ 1/√r, E ∝ A² | done |
| 2 | Amplitud | Power on a Rope (`ropepower`) | see §4 | P = ½·μ·ω²·A²·v | done |
| 3 | Longitud de onda | Ripple Tank Ruler (`rippletank`) | see README | λ = d ÷ (n − 1) | done |
| 4 | Longitud de onda | Antenna Workshop (`antenna`) | see README | λ = c ÷ f | done |
| 5 | Frecuencia | String Tuner (`strings`) | see README | f = v ÷ 2L | done |
| 6 | Frecuencia | Strobe Freeze (`strobe`) | see README | f_seen = f − f_s | done |
| 7 | Período | Surfer's Wait (`surf`) | see README | T = λ ÷ v | done |
| 8 | Período | Tide Clock (`tide`) | see README (changed from the proposal: the period from four periods in 49 h 40 min, low tide, 1.93 highs a day, 50 min later, λ = 8940 km) | T = 12 h 25 min | done |
| 9 | Velocidad de propagación | Rope Tension Lab (`tension`) | see README | v = √(F ÷ μ) | done |
| 10 | Velocidad de propagación | Tsunami Race (`tsunami`) | see README | v = √(g·h) | done |
| 11 | Transversales y longitudinales | Slinky Lab (`slinky`) | see README | v = f·λ | done |
| 12 | Transversales y longitudinales | Earthquake P and S (`quake`) | see README (the liquid core is explained, not asked: the fourth test asks the S wave's angle, 90°) | d = Δt ÷ (1/v_S − 1/v_P) | done |
| 13 | Reflexión | Echo Sounder (`echo`) | see README | d = v·t ÷ 2 | done |
| 14 | Reflexión | Bank Shot Ripples (`bank`) | see README | θ_in = θ_out | done |
| 15 | Refracción | Shallow Beach (`beach`) | see README | sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂ | done |
| 16 | Refracción | Spearfishing (`spear`) | see README | n₁·sin θ₁ = n₂·sin θ₂ | done |
| 17 | Interferencia | Two Speakers (`speakers`) | see README | Δd = (n + ½)·λ | done |
| 18 | Interferencia | Beat Tuner (`beats`) | see README (the tuning test asks how far to lower the string, 3 Hz, not the new pitch: a 2% window on 441 Hz would accept 440 and 444) | f_b = \|f₁ − f₂\| | done |
| 19 | Difracción | Harbour Gap (`harbour`) | see README ("which boat rocks" is shown by three boats rather than asked; "spreads most when gap ≈ λ" is the widest-gap test, a = λ) | sin θ = λ ÷ a | done |
| 20 | Difracción | Laser Slit (`slit`) | see README | y = λ·L ÷ a | done |
| 21 | Efecto Doppler | Ambulance Pass-by (`ambulance`) | see README (leaving is 643 Hz, not 642: 700 × 340 ÷ 370 = 643.2) | f' = f·v ÷ (v ∓ v_s) | done |
| 22 | Efecto Doppler | Paddling Duck (`duck`) | see README | λ' = (v ∓ v_s) ÷ f | done |
| 23 | Sonido | Decibel Meter (`decibel`) | see README | L = 10·log(I ÷ I₀) | done |
| 24 | Sonido | Bottle Flute (`bottle`) | see README | f = v ÷ 4L | done |

Check every proposed number before building (some are rounded); if a test's numbers have to change (for example so two slips don't collide), report it. Build in batches of 2 to 4 and report after each batch.

## 3. How a game is built (the workflow that produced every recent game)

Tools live in `tools/game-kit/` (copied from a temporary scratchpad; they are not part of the site build):

- `make-page.cjs <root> <spec.cjs>` writes `src/<kind>.html` from a spec, then parses the model and interface to catch syntax errors.
- `assemble.cjs <root> <kind> "<header comment>" <COMMON> <frag-a.cjs> <frag-b.cjs> <frag-c.cjs>` merges locale fragments with shared keys from `locales/barrel.cjs` into `locales/<kind>.cjs`. Fragment names must include `.cjs`.
- `check-keys.cjs <kind>` checks keys, placeholders, slips, and decimal dots across languages.
- `shoot.mjs <out.png> <url> <width> <height> <waitMs> "<js>"` takes a headless-Chrome screenshot (needs Google Chrome installed).
- `specs/` holds the specs of the generated games (`spec-pulse.cjs`, `spec-wavemachine.cjs`, `spec-sound.cjs`, `spec-ripples.cjs`, `spec-ropepower.cjs`, and older oscillation ones). `text/` holds their locale fragments. Copy the closest one as a starting point.

COMMON (shared keys taken from the barrel):

```
available,setup,answerHeading,answerLabel,observe,guessToggle,guessLegend,play,pause,step,reset,time,ready,paused,done,predictTitle,readyTitle,goodTitle,missTitle,missCopy,score,rightBadge,firstBadge,modelTitle,languageNote,doneAnnouncement,pausedAnnouncement,missionAnnouncement,suspendedAnnouncement,rightBanner,offBanner,guessTag
```

Steps for each game:

1. **Spec** (`tools/game-kit/specs/spec-<kind>.cjs`): `kind, model, title, symbol, unit, equation, toggle:[id,key], legends:[[cls,key]…], metrics:[[id,labelKey,unit,eq,kind]…], modelCode, hooksCode`.
   - Model API: `missions`, `setMission`, `reset`, `valid`, `setAnswer`, `ready`, `duration`, `now`, `advance(dt)` (ends exactly at T with `if(this.t+dt>=T*(1-1e-12))`; a run counts as an attempt as soon as it starts), `exact`, `unit`, `evaluate` → `{ok, slip, first, exact}` (2% tolerance), `score` (100, +50 first try), `snapshot`, `restore`.
   - Hooks must define `symbols`, `given(m)`, `equation()`, `baseEquation()`, `metrics(t, begun)`, `values()`, `runningCopy(t)`, `scene(g)`, `panel(g)`. `g = {c, ready, done, t, begun, option, guess, label, line, fit, dot, box, wide, area}`. The interface provides `text`, `number(n, d=2)`, `plain`, `model`, `width`, `height`, `ctx`, `pace()` (`config.pace ?? 1`), `amount`.
   - Check every exact answer and every slip value numerically in node before writing text; make sure no two slips (or a slip and the answer) fall within 2% of each other.
2. `node tools/game-kit/make-page.cjs $PWD tools/game-kit/specs/spec-<kind>.cjs`.
3. **Text**: three fragments, a = en, es, fr, de; b = nl, fi, nb, da; c = pt, hi, ja. Page keys: `route, pageTitle, pageDescription, navLabel, title, subtitle, cardTitle, cardCopy, playCard, tag1, tag2, board1, board2, noScript, mission0–4, setupNote, question0–4, answerHint, <toggle key>, observeHint, sceneTitle, canvasLabel, <legend keys>, equationTitle, <metric keys>, running, predictCopy, readyCopy, runningTitle, <runningCopy keys>, result0–4, slip<Name> for every slip, hint0–4, why0–4, missionTitle, missionCopy, guideTitle, instruction1–4, conceptTitle, conceptCopy, exampleTitle, exampleCopy, modelCopy, startedAnnouncement, resetAnnouncement, viewTitle, scaleNote, panelHint`, plus any key the hooks call with `text()`.
   - Routes: `<section><topic slug>/<game slug>/`, ASCII slugs only (æ → ae, ø → o, å → a). Sections: en `/games/`, es `/es/juegos/`, fr `/fr/jeux/`, de `/de/spiele/`, nl `/nl/spellen/`, fi `/fi/pelit/`, nb `/nb/spill/`, da `/da/spil/`, pt `/pt/jogos/`, hi `/hi/khel/`, ja `/ja/gemu/`.
   - Site checks: `pageTitle` ≤ 104 characters (an apostrophe counts as 5), `pageDescription` over 70 characters, decimal commas in es/fr/de/nl/fi/nb/da/pt (dots in en/hi/ja). Avoid "every {T}. second" constructions in nb/da.
   - Register: `assemble.cjs`, then `check-keys.cjs`.
4. **Register** in `locales/games.cjs` (`{kind, source:'src/<kind>.html', copy:require('./<kind>.cjs'), styles:['module.css','<kind>.css'], card:l=>({tags:[l.tag1,l.tag2], board:[[l.board1,'…'],[l.board2,'…']]})}`) and add the kind to the topic's `games` list in `locales/topics.cjs` in playing order. If the topic's description lists its games, update it in all 11 languages.
5. `node build.cjs --preview` (page count goes up by 11 per game) and `node verify-site.cjs`.
6. **Verify script** `verify-<kind>.cjs` (copy `verify-pulse.cjs` or `verify-wavemachine.cjs`): model tests, then per language: initial state and givens, step readings and first-try 150, a slip then 100, the blur pause, equation strings, then the en → es language transfer. Compare vm arrays with JSON, not `deepEqual`. Add it to the `test` chain in `package.json` before `verify-build.cjs`.
7. **Screenshots**: `(PORT=4199 node serve.cjs >/dev/null 2>&1 &)`, then `shoot.mjs` for each test at 1280×900 and some at 390×844 (mobile). The js clicks `mission-<i>`, sets `answer`, dispatches `input`, clicks `play`, waits, and scrolls `.scene` into view. Look at every image for overlapping labels and wrong-looking physics; fix, rebuild, re-shoot. Finish with `pkill -f shoot.mjs; pkill -f serve.cjs`.
8. **Docs**: README (topics paragraph, page counts in two places, a section per batch with a routes table and one paragraph per game, the verify bullet) and DESIGN_GUIDELINES (intro list of games, §8 topic list if topics change, the Waves contract §6r).
9. `npm test` (writes thousands of PASS lines; redirect to a file and check the exit code) and report.

## 4. Games built so far from this plan

**Pebble Ripples** (`ripples`): top view of a pond. A pebble's ring travels out at 1 m/s; the energy of the ring is spread around its circumference, so the height falls as A ∝ 1/√r (a straight wave from a long plank doesn't spread and keeps its height). Floats at the measuring distances bob as the ring passes; the right panel plots the ring's height against distance with the 1/√r curve.

**Power on a Rope** (`ropepower`): a motor shakes a 6 m rope ending in an absorber at the far end, so nothing reflects. Power P = ½·μ·ω²·A²·v. A gray dashed reference wave shows the earlier shaking; the right panel plots the energy delivered to the absorber over time, whose slope is the power.

**Ripple Tank Ruler** (`rippletank`): a ripple tank from above with a vibrating bar; counting gaps, a half-size photo, v = f·λ, a shallow end where the ripples bunch up, and the crossing time.

**Antenna Workshop** (`antenna`): radio waves at c, slowed down by their own frequency; FM, a quarter-wave antenna, Wi-Fi, a microwave oven's standing wave, and AM, with a logarithmic ladder of lengths.

**String Tuner** (`strings`): a guitar string vibrating in its fundamental, a tuner dial; open string, octave, finger position for a note, tension, period.

**Strobe Freeze** (`strobe`): a dark room lit by a strobe that shows a wave or a spoked wheel only at flashes; freezing, creep, measuring a frequency, a still wheel, a frozen wave's speed.

Exact tests, answers, and slips are in the specs (`tools/game-kit/specs/spec-ripples.cjs`, `spec-ropepower.cjs`, `spec-rippletank.cjs`, `spec-antenna.cjs`, `spec-strings.cjs`, `spec-strobe.cjs`, `spec-surf.cjs`, `spec-tide.cjs`, `spec-tension.cjs`, `spec-tsunami.cjs`, `spec-slinky.cjs`, `spec-quake.cjs`, `spec-echo.cjs`, `spec-bank.cjs`, `spec-beach.cjs`, `spec-spear.cjs`) and in README.

## 5. Gotchas met so far

- A model test that accepts 0 must say so in `valid()` (see Rope Pulse's `zero:true`), and the 0 answer needs its own window (`a <= .5`) because 2% of 0 is 0.
- Number inputs in headless Chrome may show a comma; that is the browser, not the page.
- Canvas text: check guess labels against rulers, clouds, and brackets; the earlier fixes were all label placement.
- Keep scene content below y ≈ 56: the RIGHT / NOT QUITE banner is drawn at y = 40 on the left and the time at y = 44 on the right.
- Keep answer symbols short (at most about 6 characters, such as `f_s =`): a long symbol pushes the unit onto a second line in the sidebar.
- Shade fields with opaque colours mixed per column, not stacked rgba boxes (they stripe). Label lengths with enough decimals: 12.5 cm must not show as 13 cm.
- Longitudinal motion must be enlarged enough to see squeezes (strain about 0.5) and its sign must match the pressure graph.
- `verify-dom.cjs` arrays come from another realm: compare with `JSON.stringify`.
- Shell: there is no `timeout` command on this Mac; kill stuck background jobs with `pkill`.
- Keep the test cards' givens short (`A: 5 → 10 cm · f = 2 Hz`, `r: 1 → 4 m`): long ones wrap and leave a lone unit on the second line.
- Put guess labels above their dashed line, not beside it: beside, they collide with crests and ropes.
- Check every slip against the 2% window before writing text: a slip that lands within 2% of the answer is marked right and never shown. Tide Clock's first period test (12.25 h against 12.42 h) failed this and was redesigned.
- A game whose clock is not in seconds sets `timeUnit` in its spec (Tide Clock uses `timeUnit:'h'`); the generator writes it next to the time reading.
- Runs that would last hours or days are sped up with a per-mission `pace` (`config.pace`) so each takes about 4 s; say the factor on the canvas (`fastTag`).
- The interface steps the model by a fixed 1/120 of its own time unit and `pace` is units per real second, so pick the time unit to suit: slow motion of a fraction of a second needs ms (Rope Tension Lab), hours of travel need minutes or hours (Tsunami Race, Tide Clock). Otherwise the animation is jerky or the step loop runs hundreds of thousands of times a second.
- Numbers written into givens and equations (g = 9.8, × 3.6) must go through `plain()` so comma languages show 9,8.
- Direction questions are typed as an angle to the way the wave travels (90° across, 0° along). An answer of 0 needs `valid()` to accept 0 and its own window in `evaluate()` (`a <= .5`); decide whether 180° also counts and say so in `answerHint` and `modelCopy`.
- Signed answers (Bank Shot Ripples' heights) need `valid()` to accept negatives and refuse 0; the relative 2% window works for negatives as written. `verify-dom` keeps the typed value, so a test can read back `'-5'`.
- Slip keys become text keys (`slip` + name), so two missions can share a slip only if the same sentence fits both; otherwise give them different names (`inverted` vs `invertedTime`).
- Write `-(x**2)`, not `-x**2`: the page script is parsed in strict mode and the generator stops on the syntax error.
- Rays that sweep or extend far (Spearfishing's critical test) must be clipped to the scene box with `ctx.save(); ctx.rect(...); ctx.clip()`, or they draw into the right panel.
- Keep the equation row under about 37 characters (`Δd = 0.33 × 0.9 = 0.30 m`, not the full formula): longer ones wrap on a phone. The formula itself goes in `baseEquation()`.
- Routes must be ASCII: Norwegian and Danish names with ø or æ need a transliterated slug (`tsunamikapplopet`, `rebspaendingslab`).
- A relative 2% window is too wide for answers that sit on a large offset (a pitch near 441 Hz accepts 432–450 Hz): ask for the change instead.
- When a test asks for a quantity the run shows (a gap, a slit, a wavelength), show ? in that reading until the run ends, and keep the scene from giving it away before Start.
- Check every slip against the right answer before keeping it: at low speeds the moving-listener Doppler formulas land within 2% of the moving-source ones and could never be shown.
- Never start a shell line with a bare `cat > file` (no heredoc): it waits for input and the whole command hangs.
- When anchoring an insertion into `locales/games.cjs` from a script, find the last entry with `lastIndexOf` rather than matching a line with `·` or `÷` inside a shell-quoted string (that match failed once).

## 6. Last verified state

See the end of this file after each batch; it is updated by the agent that ran `npm test` last.

`npm test` passed with 5503 PASS lines (exit 0) after Ripple Tank Ruler and Antenna Workshop: 1068 site checks, 76 for Ripple Tank Ruler, 75 for Antenna Workshop. The build has 990 pages. Next in the plan: items 5 and 6 (Frecuencia: String Tuner, Strobe Freeze).

`npm test` passed with 5678 PASS lines (exit 0) after String Tuner and Strobe Freeze: 1090 site checks, 76 for String Tuner, 77 for Strobe Freeze. The build has 1012 pages. Next in the plan: items 7 and 8 (Período: Surfer's Wait, Tide Clock).

`npm test` passed with 5850 PASS lines (exit 0) after Surfer's Wait and Tide Clock: 1112 site checks, 75 for Surfer's Wait, 75 for Tide Clock. The build has 1034 pages. Next in the plan: items 9 and 10 (Velocidad de propagación: Rope Tension Lab, Tsunami Race).

`npm test` passed with 6022 PASS lines (exit 0) after Rope Tension Lab and Tsunami Race: 1134 site checks, 75 for Rope Tension Lab, 75 for Tsunami Race. The build has 1056 pages. Next in the plan: items 11 and 12 (Ondas transversales y longitudinales: Slinky Lab, Earthquake P and S).

`npm test` passed with 6193 PASS lines (exit 0) after Slinky Lab and Earthquake P and S: 1156 site checks, 75 for Slinky Lab, 74 for Earthquake P and S. The build has 1078 pages. Next in the plan: items 13 and 14 (Reflexión: Echo Sounder, Bank Shot Ripples).

`npm test` passed with 6364 PASS lines (exit 0) after Echo Sounder and Bank Shot Ripples: 1178 site checks, 74 for Echo Sounder, 75 for Bank Shot Ripples. The build has 1100 pages. Next in the plan: items 15 and 16 (Refracción: Shallow Beach, Spearfishing).

`npm test` passed with 6534 PASS lines (exit 0) after Shallow Beach and Spearfishing: 1200 site checks, 74 for Shallow Beach, 74 for Spearfishing. The build has 1122 pages. Next in the plan: items 17 and 18 (Interferencia: Two Speakers, Beat Tuner).

`npm test` passed with 6704 PASS lines (exit 0) after Two Speakers and Beat Tuner: 1222 site checks, 74 for Two Speakers, 74 for Beat Tuner. The build has 1144 pages. Next in the plan: items 19 and 20 (Difracción: Harbour Gap, Laser Slit).

`npm test` passed with 6874 PASS lines (exit 0) after Harbour Gap and Laser Slit: 1244 site checks, 74 for Harbour Gap, 74 for Laser Slit. The build has 1166 pages. Next in the plan: items 21 and 22 (Efecto Doppler: Ambulance Pass-by, Paddling Duck).

`npm test` passed with 7044 PASS lines (exit 0) after Ambulance Pass-by and Paddling Duck: 1266 site checks, 74 for Ambulance Pass-by, 74 for Paddling Duck. The build has 1188 pages. Next in the plan: items 23 and 24 (Sonido: Decibel Meter, Bottle Flute), the last two.

`npm test` passed with 7214 PASS lines (exit 0) after Decibel Meter and Bottle Flute: 1288 site checks, 74 for Decibel Meter, 74 for Bottle Flute. The build has 1210 pages. All 24 planned Waves games are built; nothing in the plan is left. Still open for the owner: whether to split the Waves topic (27 games) into Waves / Wave phenomena / Sound, and native review of all translations.
