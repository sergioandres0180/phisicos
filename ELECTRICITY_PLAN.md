# Electricity expansion: plan and handoff

This file is for an agent building the Electricity games on Phisicos, in this folder (`speed-velocity-lab`; it is not a git repo). Read it top to bottom, then `DESIGN_GUIDELINES.md` and `WAVES_HANDOFF.md` §3 and §5: the workflow (spec → page → text → register → build → verify → screenshots → docs → `npm test`) and its gotchas are the same and are not repeated here.

Standing rules from the owner (same as Waves):

- **Nothing is published.** Never deploy, upload, or run the hosting packager unless asked.
- **Translations need native review.** Say so in every final report.
- **Final reports are concise** and must mention any number that differs from what is proposed here.
- Keep existing games, routes, and physics intact. Never rename a published route.

## 1. Scope and the decision to make first

Thirteen subtopics, two games each: **26 games**, every one with five tests (130 tests in all). The site has 17 languages now (en, es, fr, de, nl, fi, nb, da, pt, hi, ja, sv, it, ro, pl, tr, ar), so each game adds 17 pages; 26 games take the build from 1870 to about 2312 pages, plus the new topic pages. Confirm the count with `node build.cjs --preview`.

**Topic decision.** Games 1 and 2 were built under the recommended `electrostatics` topic (the owner asked to build them without choosing; nothing is published, so moving them is still cheap). Confirm before game 11, the first circuits game. (Games 11 and 12 were built under the recommended `circuits` topic, Electric circuits, with the slugs below, again without an answer on the split; nothing is published, so moving them is still cheap.) One topic of 26 games would repeat the Waves problem (27 games, still an open split). The recommendation is **two topics**:

| Topic id | en / es | Subtopics | Games |
| --- | --- | --- | --- |
| `electrostatics` | Electrostatics / *Electrostática* | Carga eléctrica, Conductores y aislantes, Ley de Coulomb, Campo eléctrico, Potencial eléctrico | 10 (#1–10) |
| `circuits` | Electric circuits / *Circuitos eléctricos* | Voltaje, Corriente, Resistencia, Ley de Ohm, Circuitos en serie, Circuitos en paralelo, Potencia eléctrica, Energía eléctrica | 16 (#11–26) |

Proposed topic slugs (native check needed): electrostatics — en `electrostatics`, es `electrostatica`, fr `electrostatique`, de `elektrostatik`, nl `elektrostatica`, fi `sahkostatiikka`, nb `elektrostatikk`, da `elektrostatik`, pt `eletrostatica`, hi `sthir-vidyut`, ja `seidenki`, sv `elektrostatik`, it `elettrostatica`, ro `electrostatica`, pl `elektrostatyka`, tr `elektrostatik`, ar `kahraba-sakina`. Circuits — en `electric-circuits`, es `circuitos-electricos`, fr `circuits-electriques`, de `stromkreise`, nl `stroomkringen`, fi `virtapiirit`, nb `stromkretser`, da `stromkredse`, pt `circuitos-eletricos`, hi `vidyut-paripath`, ja `denki-kairo`, sv `stromkretsar`, it `circuiti-elettrici`, ro `circuite-electrice`, pl `obwody-elektryczne`, tr `elektrik-devreleri`, ar `dawair-kahrabaiya`.

Alternative: one `electricity` topic with all 26, plus collections in `locales/tags.cjs` (for example "Ohm's law" joining #8, #15–18). Either way, add the topic(s) to `locales/topics.cjs`, the homepage groups, the Games menu, and the §8 topic list in `DESIGN_GUIDELINES.md`.

## 2. The plan: 26 games, two per subtopic

Status: **done** = built, localized, registered, verified, screenshotted, documented. The five tests of each game are in §4.

| # | Subtopic | Game (kind) | Main idea | Formula | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Carga eléctrica | Static Rub / *Frotar el globo* (`rubbing`) | charge is electrons moved, never made | Q = −n·e, ΣQ = 0 | done |
| 2 | Carga eléctrica | Oil Drop / *La gota de Millikan* (`oildrop`) | charge comes in whole electrons | q = m·g·d ÷ V | done |
| 3 | Conductores y aislantes | Touch and Share / *Tocar y repartir* (`share`) | charge spreads on metal, stays on plastic | Q₁ ÷ R₁ = Q₂ ÷ R₂ | done |
| 4 | Conductores y aislantes | Material Tester / *Probador de materiales* (`tester`) | resistivity spans 20 powers of ten | R = ρ·L ÷ A, I = V ÷ R | done |
| 5 | Ley de Coulomb | Floating Bead / *La cuenta flotante* (`levitate`) | the push grows as 1/r² until it holds the weight | k·q₁·q₂ ÷ r² = m·g | done |
| 6 | Ley de Coulomb | Charge Tug / *Tira y afloja de cargas* (`coulomb`) | forces between charges add as vectors | F = k·q₁·q₂ ÷ r² | done |
| 7 | Campo eléctrico | Field Probe / *Sonda de campo* (`fieldprobe`) | the field is force per charge, there with or without the probe | E = F ÷ q = k·Q ÷ r² | done |
| 8 | Campo eléctrico | Electron Beam / *Haz de electrones* (`deflect`) | a uniform field bends a beam into a parabola | E = V ÷ d, y = ½·(q·E ÷ m)·(L ÷ v₀)² | done |
| 9 | Potencial eléctrico | Potential Map / *Mapa de potencial* (`potmap`) | potential is energy per charge, a scalar hill | V = k·Q ÷ r, W = q·ΔV | done |
| 10 | Potencial eléctrico | Particle Gun / *Cañón de partículas* (`accelerator`) | a potential difference becomes kinetic energy | q·ΔV = ½·m·v² | done |
| 11 | Voltaje | Battery Stack / *Torre de pilas* (`batteries`) | cells in series add, in parallel don't | V = ΣV_cell, W = Q·V | done |
| 12 | Voltaje | Voltmeter Walk / *Paseo con voltímetro* (`voltwalk`) | a voltage is always between two points | V = V_red − V_black | done |
| 13 | Corriente | Charge Gate / *Contador de carga* (`turnstile`) | current is charge per second through a cut | I = Q ÷ t | done |
| 14 | Corriente | Snail Electrons / *Electrones caracol* (`drift`) | electrons crawl; the signal is fast | I = n·e·A·v_d | done |
| 15 | Resistencia | Wire Stretcher / *Estirar el cable* (`wire`) | length and thickness set resistance | R = ρ·L ÷ A | done |
| 16 | Resistencia | Hot Filament / *Filamento caliente* (`filament`) | resistance rises with temperature | R = R₀·(1 + α·ΔT) | done |
| 17 | Ley de Ohm | Ohm's Law Lab / *Laboratorio de Ohm* (`ohm`) | current is proportional to voltage | V = I·R | done |
| 18 | Ley de Ohm | Fuse Test / *Prueba del fusible* (`fuse`) | small resistance, big current | I = V ÷ R ≤ I_max | done |
| 19 | Circuitos en serie | Bulb Chain / *Cadena de bombillas* (`series`) | one path: same current, resistances add | R = R₁ + R₂ + … | done |
| 20 | Circuitos en serie | Voltage Divider / *Divisor de tensión* (`divider`) | the voltage shares in proportion to R | V₂ = V·R₂ ÷ (R₁ + R₂) | done |
| 21 | Circuitos en paralelo | Room Wiring / *Instalación de la casa* (`parallel`) | every branch gets the full voltage | 1/R = 1/R₁ + 1/R₂ + … | done |
| 22 | Circuitos en paralelo | Current Splitter / *Reparto de corriente* (`junction`) | currents split and add at junctions | I = I₁ + I₂, I₁·R₁ = I₂·R₂ | done |
| 23 | Potencia eléctrica | Bulb Brightness / *Brillo de bombillas* (`brightness`) | power, not rating, sets brightness | P = V·I = I²·R = V² ÷ R | done |
| 24 | Potencia eléctrica | Power Line / *Línea de alta tensión* (`powerline`) | high voltage cuts line losses | P_loss = I²·R, I = P ÷ V | done |
| 25 | Energía eléctrica | Kettle Race / *Carrera de hervidores* (`kettle`) | energy is power times time | E = P·t = m·c·ΔT | done |
| 26 | Energía eléctrica | Energy Meter / *Contador de energía* (`bill`) | the kilowatt-hour is an energy | E (kWh) = P (kW) · t (h) | done |

Build in batches of two (one subtopic per batch), in this order, and report after each batch. Every kind above was checked against `locales/games.cjs`: none is taken (`bolt`, `scale`, `balance`, `tank` are, so avoid them).

## 3. Shared contract (to add to DESIGN_GUIDELINES as §6s Electrostatics and §6t Electric circuits)

**Constants.** k = 8.99 × 10⁹ N·m²/C², e = 1.602 × 10⁻¹⁹ C, m_e = 9.109 × 10⁻³¹ kg, m_p = 1.673 × 10⁻²⁷ kg, g = 9.8 m/s², copper n = 8.5 × 10²⁸ electrons/m³. Resistivities (Ω·m): copper 1.68 × 10⁻⁸, aluminium 2.65 × 10⁻⁸, nichrome 1.10 × 10⁻⁶, graphite 3.5 × 10⁻⁵, glass 10¹² (a typical value; real glass ranges 10¹⁰–10¹⁴), rubber 10¹³. Temperature coefficients (/°C): copper 0.00393, tungsten 0.0045, platinum 0.00385 (Pt100, referred to 0 °C). Water c = 4180 J/(kg·°C), 1 L = 1 kg.

**Electrostatics model.** Point charges or uniform spheres, in air treated as vacuum, charges fixed unless the test moves them. Anything that moves is moved quasi-statically (lowered, slid, or carried steadily over 2 s), so forces balance at every moment, as in the Statics games; holding, floating, or a balanced point is found exactly, and a value within 0.05% of a limit counts as holding. Charge moves between conductors only at the instant of contact and spreads so that every touching conductor has the same potential (k·Q ÷ R equal on spheres). Particle beams (#8, #10) are non-relativistic (every speed is under 9% of c, which the model text says; changed when built: the proposed 4% cannot hold, since #8's beams run at 2.0–2.5 × 10⁷ m/s, 7–8% of c, where relativity changes the bend by under 0.5%), gravity on electrons and protons is ignored (10¹⁴ times smaller than the electric force), and plate fields are uniform with no fringe. Beam runs use `timeUnit:'ns'` with a `pace` so each lasts about 4 s; say the slow-motion factor on the canvas.

**Circuit model.** Ideal wires (0 Ω), ideal meters (ammeter 0 Ω, voltmeter infinite), ideal cells unless an internal resistance is given, and resistors and bulbs as fixed resistances (the filament's change is #16's lesson only, and the model texts of #19 and #23 say so). No capacitance or inductance: when the switch closes, the current is steady at once. A supply that ramps does so linearly over 2 s and holds 1–2 s; a fuse or breaker melts or trips the exact moment the current reaches its rating (within 0.05%). Runs measured in minutes or hours (#13, #14, #25, #26) use `timeUnit` `min` or `h` and a `pace`, with the factor on the canvas. Use IEC symbols (rectangle resistors), which most of the 17 languages' textbooks use.

**Two directions, always drawn and labelled.** Conventional current I is a mint arrow along the wire, from + to − outside the cell. Electrons are sky dots marked − that move the other way. Charge dots in wires move at a display speed proportional to I, never at the real drift speed (the model text says so); only #14 shows the real drift, with the factor on screen.

**Colours (family palette, always backed by a sign or label).** Positive charge: mint with +. Negative charge and electrons: sky with −. Electric force on a charge: blue on white panels, sky on navy, labelled F; Newton's third-law pairs equal and opposite. Field E: thin light-gray lines and arrows, length ∝ E with a stated cap. Weight: orange down (Lunar Lander convention). Velocity: white. Predictions: orange dashed (family convention). Overload, melting fuse, tripped breaker: orange-tinted warning. High potential: lighter shading on navy, with labelled contour rings.

**Answers.** Typed; a run counts as an attempt as soon as it starts; every reading that is or gives away the answer stays hidden (shows ?) until the run starts, or until it ends when the run itself would display it. Right within 2%; limit answers (fuse resistance, most lamps on a breaker, fewest cells) follow the Statics wording: hold with at most 2% to spare, or the fewest or most whole number that works. Scientific notation is accepted (`3.2e-19`, `3,2 × 10⁻¹⁹` in comma languages). Signed answers: #1 tests 1, 2, 5; #8 test 5; #12 test 1. Zero answers with their own absolute window: #9 test 3 (|W| ≤ 0.5 nJ) and #12 test 3 (|V| ≤ 0.05 V). **The 2% window must be purely relative** for charges, masses, and energies of single particles: the family's `near()` adds `+1e-12`, which accepts any value near 10⁻¹⁹ C (this caught #1 test 5 and #2 tests 1 and 4 in the number check).

**Safety.** Shock, fuse, short-circuit, and wiring values are teaching examples, not safety limits (the Curve Ahead rule); say so in the model text of #18, #21, and #24.

## 4. The games and their tests

Every answer and slip below was checked in node with `tools/game-kit/check-electricity.cjs`: no slip is within 2% of its answer or of another slip in the same test. Rerun it after any change. Answers are given to 3–4 figures; the model keeps full precision.

### 1. Static Rub (`rubbing`)
Side view: a hand rubs a balloon on a wool jumper for 2 s; electrons (sky −) hop from wool to balloon at a steady rate; a charge meter on each shows nC. Right panel: balloon and wool charge against time, mirror-image lines whose dashed sum stays at 0. Answer units: nC (tests 1–2), electrons (3–4), C (5).

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| balloon | 3.0 × 10¹² electrons move to the balloon | Q = −480.6 nC | sign +480.6; coulombs −4.806 × 10⁻⁷ (typed in C); divided n ÷ e |
| jumper | the same rub: charge on the wool | +480.6 nC | sameSign −480.6; none 0 (charge "made", not moved) |
| count | a comb ends at −8.0 nC | 4.994 × 10¹⁰ electrons | multiplied 1.28 × 10⁻²⁷; nano 4.99 × 10¹⁹ (8 C) |
| quantum | a dust grain shows −2.4 × 10⁻¹⁸ C | 15 electrons (14.98) | inverted 0.0667 |
| ion | an atom loses 2 electrons | +3.204 × 10⁻¹⁹ C | sign −3.204 × 10⁻¹⁹; oneElectron 1.602 × 10⁻¹⁹; electrons 2 (added when built) |

### 2. Oil Drop (`oildrop`)
Side view through a microscope: a drop (about 1 µm, oil 886 kg/m³) between horizontal plates d apart, + on top. The voltage ramps from 0 to the set value over 2 s and holds 2 s. The drop is always at its terminal speed (Stokes drag, reached in microseconds): v = (q·V ÷ d − m·g) ÷ (6π·η·r), η = 1.8 × 10⁻⁵ Pa·s; it hovers when the electric force is within 2% of the weight. Arrows: weight orange, electric force sky, velocity white. The model text introduces E = V ÷ d (the field games treat it fully).

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| charge | m = 3.27 × 10⁻¹⁵ kg hovers at 1000 V, d = 1.0 cm | q = 3.205 × 10⁻¹⁹ C | noGravity 3.27 × 10⁻²⁰; noDistance 3.205 × 10⁻¹⁷; electronCount 2 and noPower 3.205 (added when built) |
| count | the same drop: extra electrons | n = 2 | inverted 0.5; chargeTyped 3.205 × 10⁻¹⁹ (added) |
| voltage | m = 4.9 × 10⁻¹⁵ kg, 3 extra electrons, d = 1.2 cm | V = 1199 V (sets the voltage) | oneElectron 3597; noDistance 99 920 |
| unit | drops carry 4.8, 8.0, 11.2 × 10⁻¹⁹ C | e = 1.6 × 10⁻¹⁹ C | smallest 4.8 × 10⁻¹⁹; difference 3.2 × 10⁻¹⁹; average 8.0 × 10⁻¹⁹, halfUnit 0.8 × 10⁻¹⁹, noPower 1.6 (added) |
| gain | hovers at 900 V with 2 electrons, catches one more | V = 600 V | multiplied 1350; halved 450 |

### 3. Touch and Share (`share`)
Front view: spheres on insulating stands slide together over 1 s, touch 0.5 s, separate 1 s; + and − marks spread over metal and stay where they were on plastic (drawn frosted). Charge moves only at contact; touching spheres end at the same potential, so identical ones share equally and unequal ones in proportion to radius. Bars give each sphere's charge in nC.

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| pair | A +12 nC touches neutral B | B = 6 nC | allMoved 12; noneMoved 0 (added) |
| relay | A +12 nC touches neutral B, then neutral C | A = 3 nC | threeWay 4; firstOnly 6 |
| plastic | metal A +12 nC touches a plastic ball | A = 12 nC | likeMetal 6; gaveAll 0 (added) |
| sizes | a 3 cm sphere at +16 nC joined by a long thin wire to a neutral 1 cm sphere far away (changed when built: touching spheres of different sizes don't split in proportion to the radii) | small = 4 nC | equal 8; swapped 12; area 1.6 |
| mixed | A +10, B −4 nC touch; then B touches neutral C | C = 1.5 nC | firstOnly 3; ignoredSign 3.5; threeWay 2 (added) |

### 4. Material Tester (`tester`)
A bench: 12 V battery, ammeter, two clips holding a sample rod. R = ρ·L ÷ A, I = V ÷ R. Right panel: a logarithmic ladder of resistivity from 10⁻⁸ to 10¹⁶ Ω·m with every material of §3 and the sample marked. Charge dots in the sample flow at a rate that follows log I (stated).

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| nichrome | 1 m of nichrome, 0.5 mm², on 12 V | I = 5.455 A | multiplied 26.4; inverted 0.1833; noMm 5.45 × 10⁶ (added) |
| glass | (changed when built: an ideal 12 V battery would drive about 7 × 10⁵ A through a short copper rod) a glass rod 10 cm long, 1 cm², on 12 V | I = 1.2 × 10⁻¹⁴ A | multiplied 1.2 × 10¹⁶; noArea 1.2 × 10⁻¹⁰; units 1.2 × 10⁻¹² |
| heater | nichrome 0.5 mm² for 10 Ω | L = 4.545 m | inverted 22; noMm 4.5 × 10⁶ (added) |
| aluminium | 100 m of aluminium matching 100 m of 1 mm² copper (length added when built, so the copper reads 7.143 A) | A = 1.577 mm² | inverted 0.634; sameArea 1 (added) |
| pencil | graphite lead 6 cm long, 0.7 mm across | R = 5.457 Ω | diameterAsRadius 1.364; noPi 17.14 (added) |

### 5. Floating Bead (`levitate`)
Side view of a vertical glass tube with a cm ruler, to scale. A charged bead is fixed at the bottom; an equal-sign bead on a thread is lowered steadily for 2 s. The thread's pull, m·g − k·q₁·q₂ ÷ r², shrinks and goes slack exactly at r* = √(k·q₁·q₂ ÷ m·g), where the bead floats (stable). The answer is a dashed mark (height) or sets the charge or mass; a wrong one floats at its own r*, away from the target mark. Arrows: weight orange, electric push sky. (Built: the tube is 16 cm and the thread comes down to 0.6 cm; a white arrow shows the thread's pull; a bead pushed harder than its weight at the top stays at the cap, and one too heavy rests on the bottom bead. The arrows sit beside the tube, clear of the ruler.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| height | both 40 nC, top bead 1 g | r = 3.831 cm | notSquared 0.147 cm; metres 0.03831 (added) |
| charge | equal charges, 1.5 g bead floats 5 cm up | q = 63.94 nC | notSquared 8.2 × 10⁻⁵ nC; coulombs 6.394 × 10⁻⁸ (added) |
| double | test 1 with the top charge doubled | r = 5.418 cm | doubled 7.662; same 3.831; quadrupled 15.32 (added) |
| floor | the bottom bead is 3 g; test 1's bead floats | floor push 39.2 mN | noPush 29.4; minus 19.6; topOnly 9.8 (added) |
| mass | 30 nC each, floats 2 cm up | m = 2.064 g | notSquared 0.0413; kilograms 0.002064 (added) |

### 6. Charge Tug (`coulomb`)
Top view: beads on a straight rod, each held by a force gauge, brought slowly into place over 2 s; the gauges read and equal-and-opposite force pairs are drawn. In the balance test the free bead is let go at the answer: it stays if its net force is at most 2% of either push, otherwise it is drawn sliding for 1 s (an illustration, not a simulation). (Changed when built: it stays when the answer is within 2% of 0.6 m, the same window as the score, so what the bead does always matches the verdict; between A and B it eases to 0.6 m, a stable balance along the rod, and beyond B it slides away. Fixed beads sit in clamps; the asked bead is always on a gauge.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| pull | +2 µC and −3 µC, 0.30 m apart | F = 0.599 N (attract) | notSquared 0.180; centimetres 5.99 × 10⁻⁵ (added) |
| balance | +4 µC at 0, +1 µC at 0.90 m: where does a third feel nothing? | x = 0.60 m | midpoint 0.45; noRoot 0.72; outside 1.8 (added) |
| middle | +1 µC at 0.10 m between +1 µC at 0 and −1 µC at 0.30 m | F = 1.124 N (both push right) | subtracted 0.674; firstOnly 0.899 (added) |
| charge | a push of 1.8 N from +5 µC at 0.50 m | q = 10.0 µC (10.01) | notSquared 20.0; coulombs 1.001 × 10⁻⁵ (added) |
| scale | 0.90 N, then both charges and the distance doubled (built: two +1 µC beads 0.10 m apart, 0.899 N) | F = 0.899 N | doubled 1.798; quadrupled 3.596; halved 0.4495 |

### 7. Field Probe (`fieldprobe`)
Top view of a field map: gray arrows on a grid (length ∝ E, log-capped, stated) around the charges. A small probe charge on a wand is carried to the point over 2 s; a gauge on the wand reads F, and E = F ÷ q is drawn at the probe. (Built: the probe rises from 0.15 m below the point and is held 1 s; map arrows are 18 + 12·log₁₀(E ÷ E_P) px, clamped to 4–30 px; the dome's charge is hidden and chosen so E_P = 3 × 10⁵ N/C; the probes are 1 nC where not given.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| probe | a 2.0 nC probe feels 0.60 mN | E = 3.0 × 10⁵ N/C | multiplied 1.2 × 10⁻¹²; inverted 3.3 × 10⁻⁶; noNano 3 × 10⁻⁴ and noMilli 3 × 10⁸ (added) |
| point | 5.0 nC, 30 cm away | E = 499.4 N/C | notSquared 149.8; centimetres 0.04994 (added) |
| swap | a 6.0 nC probe at test 1's point | F = 1.8 mN | same 0.6; ratioInverted 0.2; newtons 0.0018 (added) |
| dipole | +4 and −4 nC, 40 cm apart: the middle | E = 1798 N/C | cancelled 0 (accepted as an answer); oneCharge 899; fullGap 449.5 (added) |
| reach | where 10 nC makes 1000 N/C | r = 0.2998 m | notRoot 0.0899 |

### 8. Electron Beam (`deflect`)
Side view of a cathode-ray tube: gun, horizontal plates (+ on top), a glowing screen. The electron enters along the axis at v₀; between the plates E = V ÷ d is uniform and the path is a parabola, straight after; the trail glows. Arrows: velocity white with blue components, force sky toward the + plate. Up is positive. (Built: gun at −2 cm, plates 0–5 cm and 2 cm apart, screen at 12 cm, all to scale; the velocity's parts are dashed white, not blue, so they don't read as a second force; runs of 5.6–7 ns are slowed to 4 s; an answer that bends the beam to a plate stops it there.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| field | plates 2.0 cm apart at 500 V (built: the beam runs at 2.5 × 10⁷ m/s, since at 2.0 × 10⁷ it would hit the + plate) | E = 25 000 V/m | multiplied 10; cm 250 |
| push | an electron in 15 000 V/m | a = 2.638 × 10¹⁵ m/s² | protonMass 1.436 × 10¹²; forceOnly 2.403 × 10⁻¹⁵ (added) |
| bend | v₀ = 2.0 × 10⁷ m/s, plates 5.0 cm long, 15 000 V/m | y = 8.244 mm | noHalf 16.49; metres 0.008244 (added) |
| aim | 5.0 mm bend, d = 2.0 cm, L = 5.0 cm, v₀ = 2.0 × 10⁷ m/s | V = 182.0 V (sets the plates) | noHalf 90.98; field 9098 (added) |
| proton | a proton in test 3's beam | y = −4.489 µm (changed when built: asked in µm, since −0.00449 mm shows as −0.004 at three decimals) | sameAsElectron 8244 or 8.244; mirrored −8244 or −8.244; sameDirection +4.489; millimetres −0.004489 (added) |

### 9. Potential Map (`potmap`)
Top view shaded like a hill map, with contour rings labelled every 20 V. A +1 nC test charge is carried along the asked path at a steady pace over 2 s; a voltmeter and a work counter, W = q·(V_end − V_start), follow it. Potentials add as plain numbers with signs; the model text contrasts this with #7's dipole test. (Built: the contour rings and labels appear only once a run starts, since the 60 V ring passes through test 1's point; the work answer is signed, the work you do; a sky arrow shows the force on the test charge, across the path round the ring.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| level | 2.0 nC, 0.30 m away (built: carried in from 0.55 m) | V = 59.93 V | squared 199.8; centimetres 0.5993 (added) |
| climb | carry +1 nC from 0.30 to 0.10 m (2.0 nC) | W = 119.9 nJ | finalOnly 179.8; fieldWork −119.9 (added) |
| ring | carry it half round the 0.30 m ring | W = 0 | potential 59.93; forceTimesPath 188.3 (added) |
| pair | +3 and +1 nC, 0.40 m apart: the middle | V = 179.8 V | subtracted 89.9; field 449.5 (added) |
| contour | the 120 V ring around 4.0 nC | r = 0.2997 m | squared 0.5474 |

### 10. Particle Gun (`accelerator`)
Side view: a source, two grids with ΔV between them; the particle starts from rest and speeds up in the uniform field between the grids. Energy bars (electric potential energy → kinetic) add to the same dashed total; the velocity arrow is white. Answers in J, m/s, eV, or V. (Built: grids 4.0 cm apart, detector at 10 cm; an alpha particle is 2e and 6.645 × 10⁻²⁷ kg, a mass §3 doesn't list; an orange ghost moves at the speed the answer implies; in the stopping test an answer within 2% stops the electron exactly at the second grid, and a wrong one lets it through or turns it back; every speed stays under 7% of c.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| energy | an electron through 1000 V | 1.602 × 10⁻¹⁶ J | noCharge 1000; halved 8.01 × 10⁻¹⁷ (added) |
| speed | an electron through 250 V | v = 9.377 × 10⁶ m/s | noTwo 6.631 × 10⁶; noRoot 8.794 × 10¹³ (added) |
| proton | a proton through 250 V | v = 2.188 × 10⁵ m/s | electronMass 9.377 × 10⁶; noRoot 4.788 × 10¹⁰ (added) |
| alpha | an alpha particle (2e) through 1000 V | 2000 eV | oneCharge 1000; squared 4000; joules 3.204 × 10⁻¹⁶ (added) |
| stop | stop an electron moving at 4.0 × 10⁶ m/s | ΔV = 45.49 V (sets the grids) | noHalf 90.98; kineticJoules 7.287 × 10⁻¹⁸ (added) |

### 11. Battery Stack (`batteries`)
A holder with slots; cells slide in (a flipped cell is reversed); a voltmeter and a lamp. When the switch closes the lamp lights with brightness that follows the power. Right panel: a potential staircase, one step up per cell, a step down for a reversed one. (Built: the cells click in one after another over 2 s and count once fully in, the switch closes at 2.5 s, and the run ends at 4 s; lamps of 12 Ω for the 1.5 V tests, 36 Ω for the 9 V battery, and 9 Ω rated 9 V for the count test; in the energy test the switch is closed from 1 s to 3 s with 0.25 A, and the panel plots energy against charge instead; the count must be a whole number from 1 to 20 and exactly 8, and it sets the cells in the holder.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| stack | four 1.5 V cells in series | 6.0 V | parallel 1.5 |
| flipped | four 1.5 V cells, one reversed | 3.0 V | dropped 4.5; ignored 6 |
| side | three 1.5 V cells side by side | 1.5 V | added 4.5 |
| energy | a 9 V battery moves 0.50 C | W = 4.5 J | divided 18; inverted 0.0556 |
| enough | the fewest 1.2 V cells for at least 9 V | 8 (9.6 V) | roundedDown 7; oneFive 6 |

### 12. Voltmeter Walk (`voltwalk`)
The circuit is drawn as a potential landscape: wires flat, the battery a ramp up, resistors and bulbs ramps down. The voltmeter's red and black probes step onto two points over 2 s; the reading is V_red − V_black. (Built: the bulb is 18 Ω; the opposed test adds a 5 Ω resistor, which the plan left open; readings are signed, with a true minus, and the battery slip catches −9 as well as 9.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| backwards | probes swapped on a 9 V battery | −9 V | sign 9 |
| gap | across an open switch, 9 V battery and a bulb | 9 V | zero 0; swappedGap −9 (added) |
| wire | across a connecting wire, circuit on | 0 V | battery 9 |
| junction | 12 V, then 2 Ω and 4 Ω from +: the junction against − | 8 V | drop 4; againstPlus −4, wholeBattery 12 (added) |
| opposed | a 9 V battery against a 1.5 V cell (built: with 5 Ω) | 7.5 V | added 10.5; ignoredCell 9 (added) |

### 13. Charge Gate (`turnstile`)
A section of wire with a counting gate at one cross-section and a counter in coulombs; charge dots pass at a rate that follows I. Long runs are sped up (`timeUnit:'min'`, pace on screen). (Built: each test has its own clock unit, min, s, or h, through the new opt-in `timeUnits` spec field, and a pace of its length ÷ 4 s; the electron test runs over 1 s and the wait test ends when 90 C has passed; each dot stands for a thirtieth of the run's charge.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| rate | 30 C pass in 1 min | I = 0.50 A | minutes 30; inverted 2 (added) |
| lamp | 2.0 A for 5 min | Q = 600 C | minutes 10; divided 0.00667 |
| electrons | 1 A: electrons per second | 6.242 × 10¹⁸ | multiplied 1.602 × 10⁻¹⁹ |
| phone | a phone charges at 2.0 A for 1.5 h | Q = 10 800 C | hours 3; minutes 180 |
| wait | how long 0.25 A takes to carry 90 C | t = 360 s | multiplied 22.5; minutes 6 (added) |

### 14. Snail Electrons (`drift`)
A magnified copper wire: electrons jitter (thermal motion, about 10⁶ m/s, not to scale) and drift slowly against the mint current arrow, with the real drift shown by a counter and a sped-up factor on screen; a lamp 3 m away lights when the signal arrives. (Built: clocks in s, h, and ns through `timeUnits`; the crawl, current, and thick tests run 4 s in real time in a wire 0.5 mm across the view; the trip test shows 1 m of wire over 3.78 h; the signal test runs 20 ns with the lamp lighting at 15 ns.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| crawl | 1.0 A in copper of 1.0 mm² | v_d = 0.0734 mm/s | areaMm 7.34 × 10⁻⁸; metres 7.34 × 10⁻⁵ (added) |
| trip | an electron crossing 1 m of that wire | t = 3.78 h | seconds 13 620; minutes 227 (added) |
| current | drift 0.10 mm/s in 2.5 mm² | I = 3.40 A | areaMm 3.40 × 10⁶; speedMetres 3404 (added) |
| thick | 1.0 A in a wire twice as wide (4 mm²) | v_d = 0.0184 mm/s | half 0.0367; same 0.0734 (added) |
| signal | the lamp's signal over 3 m at 2.0 × 10⁸ m/s | t = 15 ns | electrons 4.1 × 10¹³; seconds 1.5 × 10⁻⁸ (added) |

### 15. Wire Stretcher (`wire`)
A wire between two clamps with an ohmmeter; the learner's change (length, thickness, stretching at constant volume) is made steadily over 2 s and the reading follows. R = ρ·L ÷ A, A = π·d² ÷ 4. (Built: each change runs over 2 s and holds 1 s; copper unrolls to 2 m; tests 2–4 are nichrome wires sized for their starting resistances, 3 Ω at 0.5 mm² and 1.36 m, 8 Ω at 0.4 mm across and 0.914 m, 5 Ω at 0.5 mm² and 2.27 m; the coil test unrolls your length, up to 1000 m.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| copper | 2 m of copper, 0.5 mm² | R = 0.0672 Ω | noMm 6.72 × 10⁻⁸ |
| longer | 3 Ω, then twice the length | 6 Ω | halved 1.5; squared 12 (added) |
| thicker | 8 Ω, then twice the diameter | 2 Ω | halved 4; doubled 16 |
| stretch | 5 Ω pulled to twice its length (same volume) | 20 Ω | lengthOnly 10; unchanged 5 (added) |
| coil | nichrome 0.2 mm across for 20 Ω | L = 0.571 m | diameterAsRadius 2.285; noPi 0.182 (added) |

### 16. Hot Filament (`filament`)
A wire or filament heated steadily over 2 s, glowing by temperature; an ohmmeter and a thermometer. R = R₀·(1 + α·(T − T₀)), a linear teaching model (the model text says real tungsten curves upward); T₀ is 20 °C, or 0 °C for the Pt100. (Built: the lamp runs on 230 V; copper 10 Ω for tests 1 and 5; the double test heats the coil to your temperature; results to 4 significant figures, meters to 5.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| warm | copper 10 Ω at 20 °C, heated to 70 °C | 11.97 Ω | noBase 1.965; absolute 12.75 |
| glow | tungsten 40 Ω at 20 °C, glowing at 2500 °C | 486.4 Ω | noBase 446.4 |
| inrush | cold against hot current, test 2 on the same supply | 12.16 times | inverted 0.0822 |
| sensor | a Pt100 reads 119.25 Ω | T = 50 °C | noBase 309.7 |
| double | the temperature that doubles copper's R from 20 °C | T = 274.5 °C | rise 254.5 |

### 17. Ohm's Law Lab (`ohm`)
A variable supply ramps from 0 to the set voltage over 2 s and holds; ammeter and voltmeter; the I–V graph is drawn as it goes, a straight line through the origin. The LED test uses an ideal LED with a constant 2.0 V drop. (Built: the supply and LED tests put your answer in the circuit, the voltage in the supply or the resistor beside the LED; readings and results to 4 significant figures.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| current | 12 V across 4 Ω | I = 3 A | multiplied 48; inverted 0.333 |
| resistor | 6 V drives 0.25 A | R = 24 Ω | multiplied 1.5; inverted 0.0417 |
| supply | 0.50 A through 220 Ω | V = 110 V (sets the supply) | divided 440; inverted 0.00227 (added) |
| graph | the line passes (2 V, 0.10 A): current at 9 V | I = 0.45 A | multiplied 180; resistance 20 (added) |
| led | 9 V supply, LED drops 2 V, wants 20 mA | R = 350 Ω | noLed 450; ledOnly 100 |

### 18. Fuse Test (`fuse`)
The supply ramps over 2 s; the fuse wire glows warmer as the current grows and melts the exact moment it reaches the rating; a fuse that holds is watched 1 s more. Teaching values, not safety limits. (Built: 230 V mains; the kettle and skin tests have a 13 A fuse and the short a 300 A battery fuse, which holds at 80%; a limit is right when the fuse holds with at most 2% to spare, and a miss says whether it melted or held with too much to spare; your resistance or voltage goes in the circuit.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| kettle | a 26.45 Ω kettle on 230 V | I = 8.696 A | multiplied 6084; inverted 0.115 (added) |
| least | the smallest resistance on 12 V with a 2 A fuse | 6.0 Ω (holds, ≤ 2% to spare) | multiplied 24; inverted 0.167 |
| skin | wet skin, 1000 Ω, touches 230 V | 230 mA | amps 0.23 |
| rating | the most voltage on 47 Ω rated 0.1 A | 4.7 V | divided 470 |
| short | a 12 V battery with 0.05 Ω inside, shorted | I = 240 A | multiplied 0.6; inverted 0.00417 (added) |

### 19. Bulb Chain (`series`)
Bulbs in one loop; the same current dots pass every bulb; brightness follows each bulb's power. Unscrewing one bulb (shown, not asked) puts them all out. (Built: the total and share tests order the chain 2, 5, 3 Ω so the voltmeter sits on the middle bulb; the fairy lights are 12.5 Ω bulbs, and the answer is the exact fewest whole number, with too few burning one out and putting all out, which is how unscrewing is shown; brightness is full at 16 W, or 0.5 W for a fairy light.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| three | three 4 Ω bulbs on 12 V | I = 1 A | oneBulb 3; resistance 12 (added) |
| total | 2, 3, and 5 Ω in series | 10 Ω | parallel 0.968; average 3.33 (added) |
| share | the same on 20 V: across the 5 Ω | 10 V | equalShare 6.67; current 2 (added) |
| fourth | test 1 with a fourth bulb | I = 0.75 A | same 1; more 1.33 (added) |
| lights | 2.5 V bulbs on 230 V | 92 bulbs | multiplied 575; blown (fewer than 92); notFewest (more than 92) (added) |

### 20. Voltage Divider (`divider`)
Two resistors (or a resistor and a light or temperature sensor) in series across a supply, with an ideal voltmeter on the lower one; the right panel draws the potential down the chain. (Built: resistances in kΩ and currents in mA; the design and thermistor tests put your answer in the circuit as the bottom resistance; readings and results to 4 significant figures.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| split | 9 V across 1 kΩ and 2 kΩ: across the 2 kΩ | 6 V | swapped 3; noSum 18 |
| design | 5 V out of 12 V with 1.4 kΩ on top | R₂ = 1.0 kΩ | swapped 1.96; total 3.36 (added) |
| light | 9 V, 10 kΩ on top, a light sensor at 1 kΩ below | 0.818 V | swapped 8.18; noSum 0.9 (added) |
| sensor | 5 V, 4.7 kΩ on top, 2.5 V out | 4.7 kΩ | doubled 9.4; half 2.35 (added) |
| ladder | 12 V across 1, 2, 3 kΩ: the node above the 3 kΩ | 6 V | twoOnly 4; top 10 |

### 21. Room Wiring (`parallel`)
A house circuit from above: appliances on parallel branches, each switched on in turn; branch ammeters and a main breaker that trips the exact moment its current is reached. Teaching values, not safety limits. (Built: branch k of n switches on at 2(k+1)/n s; in the unplug test the first lamp is unplugged at 2.5 s; the breaker test uses 0.50 A lamps on 230 V and is right only at the exact most, 32, with a lamp within 0.05% of the rating counting as holding; a miss says whether the breaker tripped or had a lamp to spare.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| pair | 6 Ω and 3 Ω side by side | 2 Ω | added 9; average 4.5; sumInverse 0.5 |
| draw | the same on 12 V: main current | 6 A | series 1.33; oneBranch 2 or 4 (added) |
| unplug | three 12 Ω lamps on 12 V, one removed | 2 A | same 3; oneLamp 1 (added) |
| match | the resistor beside 10 Ω that makes 4 Ω | 6.667 Ω | subtracted 6; inverted 0.15 (added) |
| breaker | the most 0.50 A lamps on a 16 A breaker | 32 | multiplied 8 (renamed from halved: 16 × 0.5); tripped (more than 32); spare (fewer than 32) (added) |

### 22. Current Splitter (`junction`)
Junctions with an ammeter on every branch; current dots split and join and the counts add (Kirchhoff's current law); branch currents divide inversely to resistance. (Built: tests that give a current use a current source; the rest test hides the resistances (5 and 3.33 Ω, so 1.2 A goes down the known branch); in the add test the 6 Ω branch switches on at 2 s; the shunt is drawn beside the meter, whose label sits under its dial.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| rest | 3 A in, 1.2 A down one branch | 1.8 A | added 4.2; whole 3 (added) |
| divide | 6 A between 2 Ω and 4 Ω: in the 2 Ω | 4 A | swapped 2; equal 3 |
| main | branches carry 0.5, 0.3, 0.2 A | 1.0 A | largest 0.5; average 0.333 (added) |
| add | 4 Ω on 12 V, then 6 Ω added beside it: in the 4 Ω | 3 A | shared 1.8; halved 1.5 |
| shunt | a 50 mA, 20 Ω meter made to read 1 A | 1.053 Ω | noSubtract 1.0; inverted 380 |

### 23. Bulb Brightness (`brightness`)
Bulbs glow with a brightness that follows their power (a stated scale); a wattmeter on each. Bulbs keep the resistance of their rating (the model text says real filaments change). (Built: the glow is full at 100 W; in the rating test your resistance goes in the bulb.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| power | 12 V and 2 A (a 6 Ω bulb) | 24 W | divided 6; inverted 0.167 (added) |
| rating | a 60 W bulb made for 230 V: its resistance | 881.7 Ω | VoverP 3.83; current 0.261 (added) |
| chain | two such bulbs in series on 230 V: each | 15 W | halved 30; rated 60 |
| surprise | 60 W and 100 W bulbs in series on 230 V: the 60 W one | 23.44 W (the brighter) | rated 60; swapped 14.06 |
| half | 100 W at 230 V, run on 115 V | 25 W | halved 50; rated 100 (added) |

### 24. Power Line (`powerline`)
A power station, an ideal step-up transformer, a line with resistance, and a town; the line glows warm with its loss; bars compare power sent, lost, and delivered. Teaching values. (Built: the station's output ramps over 2 s and holds for 1 s; the loss test sends 220 kW at 11 kV through 4 Ω, so 20 A flows; the heater test sits at the end of an 11 kV, 4 Ω line, and the station sends the heater's power plus the line's small loss; your voltage goes on the line and your heater in the house.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| low | 100 kW sent at 1000 V, line 0.5 Ω: loss | 5000 W | VsquaredR 2 × 10⁶; drop 50 (added) |
| high | the same at 10 kV | 50 W | tenth 500; same 5000 (added) |
| design | 1 MW, 2 Ω, lose only 1% | V = 14 142 V | noRoot 200; current 70.71 (added) |
| loss | 20 A through a 4 Ω line | 1600 W | IR 80 |
| heater | at the house, 2 kW on 230 V | R = 26.45 Ω | VoverP 0.115; currentHeater 8.696 (added) |

### 25. Kettle Race (`kettle`)
Kettles side by side with thermometers; E = P·t heats the water, m·c·ΔT, with no heat lost unless an efficiency is given. Runs are sped up so each lasts about 4 s (pace on screen); a pace kettle shows the right time. (Built: a time test runs to 1.25 times the true boiling time, and the energy and power tests run for their given 3 min and 1 min; the pace kettle, in orange, boils at your time, beside the real one; the cord enters the kettle's side so it never crosses the labels.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| boil | 2000 W, 1 L from 20 to 100 °C | t = 167.2 s | minutes 2.787; fullRange 209 (added) |
| energy | 1500 W for 3 min | 270 kJ | minutesEnergy 4.5; joules 270 000 (added) |
| losses | test 1 at 90% efficiency | t = 185.8 s | times 150.5; minutes 3.096 (added) |
| power | 0.5 L from 20 to 100 °C in 1 min | P = 2787 W | fullLitre 5573; seconds 167 200 (added) |
| abroad | test 1's 230 V kettle on 115 V | t = 668.8 s | half 334.4; same 167.2 (added) |

### 26. Energy Meter (`bill`)
A house energy meter whose digits turn with the power drawn, appliances on a day timeline, sped up (`timeUnit:'h'`, pace on screen). Energies only, no money (currencies differ by language). (Built: each test runs over its own hours, or days for standby (`timeUnits`, the time metric's unit switches to d), sped up to 4 s; the power bank gives 10 W for 1.5 h and the phone charges at 3.7 W for 3 h; the meter shows kWh for the house tests and Wh for the batteries.)

| Test | Givens | Answer | Slips |
| --- | --- | --- | --- |
| bulb | 100 W for 5 h | 0.5 kWh | wh 500; joulesKwh 1.8 × 10⁶ (added) |
| standby | 2 W for 30 days | 1.44 kWh | wh 1440; oneDay 0.048 (added) |
| battery | a 15 Wh power bank in kJ | 54 kJ | minutes 0.9; joules 54 000 (added) |
| swap | 9 W LED instead of 60 W, 1000 h | 51 kWh saved | wh 51 000; oldOnly 60 (added) |
| phone | 3000 mAh at 3.7 V | 11.1 Wh | noMilli 11 100; charge 3 (added) |

## 5. Gotchas expected for these games

- Use the purely relative 2% window (§3); check with `check-electricity.cjs` before writing text, as `WAVES_HANDOFF.md` §5 asks for every slip.
- Long scientific numbers in givens go through `plain()` and are written a × 10ⁿ with superscripts, as in the Gravitation games; keep givens short so cards don't wrap (`m = 3.27 × 10⁻¹⁵ kg · d = 1 cm`).
- Answer symbols stay short (`q =`, `E =`, `V =`, `R₂ =`, `I =`); a unit like `m/s²` or `×10⁻¹⁹ C` must not push onto a second line.
- Zero answers and signed answers need `valid()` to accept them, and zero needs its own absolute window.
- Keep the two directions (mint I, sky electrons) consistent across all 16 circuit games; check them in every screenshot.
- Translation: "voltage" is *voltaje* or *tensión* (es), *tension* (fr), *Spannung* (de), *spanning* (nl), *jännite* (fi); pick one term per language for the whole topic and keep it.
- Hindi, Japanese, and Arabic keep Latin unit symbols (V, A, Ω, W, kWh, C, N/C) and Latin digits.

- **Seventeen languages in one step.** `tools/game-kit/assemble-all.cjs <root> <kind> "<header>" <COMMON> <fragments…>` assembles every language at once (shared keys from `locales/barrel.cjs`) and isolates Arabic left-to-right runs the way `add-lang.cjs` does, through `tools/game-kit/isolate.cjs`. `--draft` fills missing languages with English so a game can be built and screenshotted before its translations exist; never ship a draft. Fragments: `text/<kind>-en.cjs`, then `-a` (es fr de nl), `-b` (fi nb da pt), `-c` (hi ja sv it), `-d` (ro pl tr ar).
- **Generator fields.** `sci:true` writes values below 10⁻³ or from 10⁷ up as a × 10ⁿ in `plain()` (and so in `amount()` and the feedback); without it 3.2 × 10⁻¹⁹ shows as 0. `css:'…'` adds page styles; both electrostatics games set `[dir=rtl] .<kind>-page .mission-list span{unicode-bidi:plaintext}` so an Arabic card's given that ends in e⁻ is not reordered. Neither field changes existing pages.
- **Write tools normalize Unicode.** A regex range starting with U+FB1D (a precomposed Hebrew letter) was silently decomposed to U+05D9 U+05B4, which widened the range over the superscripts and split `10⁻¹⁹` in Arabic text. `isolate.cjs` now spells the ranges with `\u` escapes; do the same for any character class with such letters.
- **Arabic negatives.** `toLocaleString('ar')` puts an invisible left-to-right mark before a minus sign, so verify scripts must format expected givens and values with the same `plain()` as the page, never a hard-coded `−`.
- Comma languages can't show `3.2e-19` in text (check-keys rejects decimal dots there), so examples of scientific notation use whole mantissas (`2e-19`).
- Check that an "out of range" test value really leaves the range: 5 times the hovering force moves the drop only about 1 mm in 4 s, short of a plate 6 mm away; 30 times reaches it after the ramp.

## 6. Last verified state

When the plan was written, its numbers passed `node tools/game-kit/check-electricity.cjs` (130 tests, no slip within 2% of its answer or of another slip).

`npm test` passed with 10945 PASS lines (exit 0) after Static Rub and Oil Drop: 2041 site checks, 111 for Static Rub, 113 for Oil Drop. The build has 1921 pages (1870 + 2 games and the Electrostatics topic page in 17 languages). Next in the plan: items 3 and 4 (Conductores y aislantes: Touch and Share, Material Tester).

`npm test` passed with 11203 PASS lines (exit 0) after Touch and Share and Material Tester: 2075 site checks, 112 for Touch and Share, 112 for Material Tester. The build has 1955 pages (1921 + 2 games in 17 languages). Next in the plan: items 5 and 6 (Ley de Coulomb: Floating Bead, Charge Tug).

`npm test` passed with 11461 PASS lines (exit 0) after Floating Bead and Charge Tug: 2109 site checks, 112 for Floating Bead, 112 for Charge Tug. The build has 1989 pages (1955 + 2 games in 17 languages). Next in the plan: items 7 and 8 (Campo eléctrico: Field Probe, Electron Beam).

`npm test` passed with 11720 PASS lines (exit 0) after Field Probe and Electron Beam: 2143 site checks, 113 for Field Probe, 112 for Electron Beam. The build has 2023 pages (1989 + 2 games in 17 languages). Next in the plan: items 9 and 10 (Potencial eléctrico: Potential Map, Particle Gun), the last two Electrostatics games; confirm the topic split before item 11.

`npm test` passed with 11978 PASS lines (exit 0) after Potential Map and Particle Gun: 2177 site checks, 112 for Potential Map, 112 for Particle Gun. The build has 2057 pages (2023 + 2 games in 17 languages). All 10 Electrostatics games are built. Next in the plan: item 11 (Voltaje: Battery Stack), the first circuits game; confirm the topic split (Electrostatics / Electric circuits) before building it.

`npm test` passed with 12253 PASS lines (exit 0) after Battery Stack and Voltmeter Walk: 2228 site checks, 112 for Battery Stack, 112 for Voltmeter Walk. The build has 2108 pages (2057 + the Electric circuits topic page and 2 games in 17 languages). Both games are under the new `circuits` topic, built without an answer on the split. Next in the plan: items 13 and 14 (Corriente: Charge Gate, Snail Electrons).

`npm test` passed with 12508 PASS lines (exit 0) after Charge Gate and Snail Electrons: 2262 site checks, 110 for Charge Gate, 111 for Snail Electrons. The build has 2142 pages (2108 + 2 games in 17 languages). The page generator gained the opt-in `timeUnits` field (a clock unit per test); existing pages regenerate unchanged. Next in the plan: items 15 and 16 (Resistencia: Wire Stretcher, Hot Filament).

`npm test` passed with 12763 PASS lines (exit 0) after Wire Stretcher and Hot Filament: 2296 site checks, 110 for Wire Stretcher, 111 for Hot Filament. The build has 2176 pages (2142 + 2 games in 17 languages). Next in the plan: items 17 and 18 (Ley de Ohm: Ohm's Law Lab, Fuse Test).

`npm test` passed with 13019 PASS lines (exit 0) after Ohm's Law Lab and Fuse Test: 2330 site checks, 111 for Ohm's Law Lab, 111 for Fuse Test. The build has 2210 pages (2176 + 2 games in 17 languages). Next in the plan: items 19 and 20 (Circuitos en serie: Bulb Chain, Voltage Divider).

`npm test` passed with 13274 PASS lines (exit 0) after Bulb Chain and Voltage Divider: 2364 site checks, 111 for Bulb Chain, 110 for Voltage Divider. The build has 2244 pages (2210 + 2 games in 17 languages). Next in the plan: items 21 and 22 (Circuitos en paralelo: Room Wiring, Current Splitter).

`npm test` passed with 14037 PASS lines (exit 0) after Room Wiring, Current Splitter, Bulb Brightness, Power Line, Kettle Race, and Energy Meter: 2466 site checks, 111 for Room Wiring, 110 each for Current Splitter, Bulb Brightness, Power Line, Kettle Race, and Energy Meter. The build has 2346 pages (2244 + 6 games in 17 languages). All 26 Electricity games are built; translations of items 11–26 still need native review.
