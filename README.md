# Phisicos — multilingual educational simulation games

A static homepage linked to Train Track, Lift Trips, Dog Walk, the speed and velocity lab, Pac-Man chase, Graph Rider, Galileo's Bells, Stop on the Line, Drop Test, Straight Up, Reaction Ruler, Lunar Lander: Eco-Mission, Unit Pipeline, the Powers-of-Ten Probe, Formula Balance, Undo Machine, Formula Test Drive, River Crossing, Orienteering Walk, Force Table, Loading Ramp, Lighthouse Rescue, Ferris Wheel, Air Drop, Two Shadows, and Range Cannon. The header lists every game in a localized Games menu. The implementation preserves both physics engines and generates searchable HTML in English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, Danish, Brazilian Portuguese, Hindi, and Japanese. No runtime dependencies or translation services are required.

## Local preview

```sh
npm run dev
```

Open http://localhost:4173/. The local build uses `noindex, nofollow` and a disallowing robots.txt. Language navigation keeps readers on the equivalent homepage or game page. Generated pages need an HTTP server because navigation and styles use root-relative paths.

## Production build

Set `SITE_URL` to the actual public HTTPS origin, with no subpath, and run `npm run build`. The build requires this setting, so localhost or an invented default cannot accidentally become the production canonical domain. `npm run preview` serves the result locally. Do not reuse the localhost preview build for a public launch.

For **phisicos.com shared hosting**, run `npm run package:hosting`. This reads `deployment.json`, builds production files separately in `release/public_html/`, validates them, and creates **release/phisicos.com-upload.zip**. Extract that ZIP directly into the document root assigned to phisicos.com. Include the hidden `.htaccess` file. See [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) for SSL, upload, and Search Console steps. The site runs on Apache/LiteSpeed PHP hosting with no PHP backend, database, or Node.js installation on the server. Packaging does not publish the site or change the local preview in `dist/`.

`node verify-apache.cjs` optionally exercises the production artifact through a temporary local Apache server over HTTP and TLS, covering canonical redirects, every localized route, missing pages, headers, and gzip. It requires Apache and OpenSSL; macOS defaults are provided, with environment overrides for other installations. Temporary certificates and the test server are removed on completion. Never upload these development scripts or certificates.

## Routes

| Language | Homepage | Velocity game |
| --- | --- | --- |
| English | `/` | `/games/motion/speed-velocity/` |
| Español | `/es/` | `/es/juegos/movimiento/rapidez-velocidad/` |
| Français | `/fr/` | `/fr/jeux/mouvement/vitesse-vecteur/` |
| Deutsch | `/de/` | `/de/spiele/bewegung/tempo-geschwindigkeit/` |
| Nederlands | `/nl/` | `/nl/spellen/beweging/snelheid-vector/` |
| Suomi | `/fi/` | `/fi/pelit/liike/vauhti-nopeus/` |
| Norsk bokmål | `/nb/` | `/nb/spill/bevegelse/fart-hastighet/` |
| Dansk | `/da/` | `/da/spil/bevaegelse/fart-hastighed/` |
| Português | `/pt/` | `/pt/jogos/movimento/rapidez-velocidade/` |
| हिन्दी | `/hi/` | `/hi/khel/gati/chal-veg/` |
| 日本語 | `/ja/` | `/ja/gemu/undo/hayasa-sokudo/` |

English stays at `/`; there is no duplicate `/en/` homepage. Every localized page has its own canonical, reciprocal `hreflang` links including itself, and the English equivalent as `x-default`. No automatic language redirects are used. The server redirects directory URLs to their trailing-slash form and returns HTTP 404 for missing pages.

## Topics

Games are grouped into six topics: Motion (Train Track, Lift Trips, Dog Walk, speed & velocity, Graph Rider, Galileo's Bells, Stop on the Line, Drop Test, Straight Up, Reaction Ruler, Lunar Lander), Measurement (Unit Pipeline, Powers-of-Ten Probe), Formulas (Formula Balance, Undo Machine, Formula Test Drive), Vectors (River Crossing, Orienteering Walk, Force Table), Trigonometry (Loading Ramp, Lighthouse Rescue, Ferris Wheel), and Projectile motion (Air Drop, Two Shadows, Range Cannon). Each game route nests under its topic: `<games index>/<topic>/<game>/`. The games index lists the topics, and each topic page lists its games in the suggested playing order, followed by the other topics. Breadcrumbs (visible and in JSON-LD) follow the URL: Home / Topics / topic / game. The header has a Topics link and a Games menu grouped by topic. The homepage shows the topic tiles first, then every game card under its topic heading.

| Language | Topics index | Motion | Measurement | Formulas | Vectors | Trigonometry | Projectile motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| English | `/games/` | `/games/motion/` | `/games/measurement/` | `/games/formulas/` | `/games/vectors/` | `/games/trigonometry/` | `/games/projectile-motion/` |
| Español | `/es/juegos/` | `/es/juegos/movimiento/` | `/es/juegos/medicion/` | `/es/juegos/despeje-de-formulas/` | `/es/juegos/vectores/` | `/es/juegos/trigonometria/` | `/es/juegos/movimiento-parabolico/` |
| Français | `/fr/jeux/` | `/fr/jeux/mouvement/` | `/fr/jeux/mesure/` | `/fr/jeux/formules/` | `/fr/jeux/vecteurs/` | `/fr/jeux/trigonometrie/` | `/fr/jeux/mouvement-parabolique/` |
| Deutsch | `/de/spiele/` | `/de/spiele/bewegung/` | `/de/spiele/messen/` | `/de/spiele/formeln/` | `/de/spiele/vektoren/` | `/de/spiele/trigonometrie/` | `/de/spiele/wurfbewegung/` |
| Nederlands | `/nl/spellen/` | `/nl/spellen/beweging/` | `/nl/spellen/meten/` | `/nl/spellen/formules/` | `/nl/spellen/vectoren/` | `/nl/spellen/goniometrie/` | `/nl/spellen/worpen/` |
| Suomi | `/fi/pelit/` | `/fi/pelit/liike/` | `/fi/pelit/mittaaminen/` | `/fi/pelit/kaavat/` | `/fi/pelit/vektorit/` | `/fi/pelit/trigonometria/` | `/fi/pelit/heittoliike/` |
| Norsk bokmål | `/nb/spill/` | `/nb/spill/bevegelse/` | `/nb/spill/maling/` | `/nb/spill/formler/` | `/nb/spill/vektorer/` | `/nb/spill/trigonometri/` | `/nb/spill/kastebevegelse/` |
| Dansk | `/da/spil/` | `/da/spil/bevaegelse/` | `/da/spil/maaling/` | `/da/spil/formler/` | `/da/spil/vektorer/` | `/da/spil/trigonometri/` | `/da/spil/kastebevaegelse/` |
| Português | `/pt/jogos/` | `/pt/jogos/movimento/` | `/pt/jogos/medicao/` | `/pt/jogos/formulas/` | `/pt/jogos/vetores/` | `/pt/jogos/trigonometria/` | `/pt/jogos/movimento-parabolico/` |
| हिन्दी | `/hi/khel/` | `/hi/khel/gati/` | `/hi/khel/mapan/` | `/hi/khel/sutra/` | `/hi/khel/sadish/` | `/hi/khel/trikonmiti/` | `/hi/khel/prakshepya-gati/` |
| 日本語 | `/ja/gemu/` | `/ja/gemu/undo/` | `/ja/gemu/sokutei/` | `/ja/gemu/koshiki/` | `/ja/gemu/bekutoru/` | `/ja/gemu/sankakuhi/` | `/ja/gemu/hoshabutsu-undo/` |

- `locales/topics.cjs`: topic membership and order, localized slugs, names, page titles, descriptions, and interface words. A game belongs to exactly one topic; the build fails otherwise.
- `locales/site.cjs`: every page kind on the site, which ones are collections, and each game’s topic. The build and all checks read the page list from here.
- `locales/tags.cjs`: collections, which group games across topics without moving them. A game keeps its topic route and breadcrumbs, and its page gets an "Also in" link to every collection that lists it. Each collection page lives beside the topic pages (`<games index>/<slug>/`, breadcrumbs Home / Topics / collection) with the key equations, the game cards, and a note on how each game uses the idea. Collection tiles appear on the topics index and on every topic page that shares a game. The build fails if a collection lists an unknown game, misses a note, or reuses a topic slug. The first collection is **uniform linear motion (MRU)**: Train Track, Dog Walk, Lift Trips, Speed & velocity, and the Powers-of-Ten Probe, at `/games/uniform-motion/`, `/es/juegos/movimiento-rectilineo-uniforme/`, `/fr/jeux/mouvement-rectiligne-uniforme/`, `/de/spiele/gleichfoermige-bewegung/`, `/nl/spellen/eenparige-beweging/`, `/fi/pelit/tasainen-liike/`, `/nb/spill/jevn-bevegelse/`, `/da/spil/jaevn-bevaegelse/`, `/pt/jogos/movimento-retilineo-uniforme/`, `/hi/khel/ekasaman-rekhiya-gati/`, and `/ja/gemu/tosoku-chokusen-undo/`.
- `locales/legacy-routes.cjs`: game routes before topic browsing (October 2026). The hosting build turns each into a one-hop 301 redirect to the game’s current route (with or without a trailing slash or `index.html`, keeping the query string). Keep this file when adding games; add an entry only if a published route moves again.

To add a game, register it in `locales/games.cjs`, add its kind to one topic in `locales/topics.cjs`, and give its locale routes the form `<games index>/<topic slug>/<game slug>/`.

## Content and SEO

The primary keyword across the site is **educational simulation games**. The homepage title, H1, description, collection heading, and navigation label target it directly; each game page targets **educational simulation game** plus its topic (speed and velocity, or gravity for Lunar Lander). Localized equivalents: *juegos de simulación educativos* (es), *jeux de simulation éducatifs* (fr), *Simulationsspiele zum Lernen* (de), *educatieve simulatiespellen* (nl), *opetukselliset simulaatiopelit* (fi), *pedagogiske simuleringsspill* (nb), *pædagogiske simulationsspil* (da), *jogos de simulação educativos* (pt), *शैक्षिक सिमुलेशन गेम* (hi), and *教育用シミュレーションゲーム* (ja). Physics terms stay as secondary keywords. Each page has a unique title and description, one H1, semantic headings and landmarks, crawlable internal links, and localized instructions. The game page includes a worked relative-speed example and questions about average speed, average velocity, and direction. Editorial content is in the initial HTML and does not depend on JavaScript or Canvas rendering.

Metadata includes Open Graph, Twitter large-image cards, a local 1200 × 630 sharing image, site icons, and JSON-LD (`WebSite`, `CollectionPage` or `WebPage` with the localized primary keyword in `keywords`, `BreadcrumbList`, and `VideoGame` on the game page). No invented ratings, reviews, offers, or rich-result promises are included. `sitemap.xml` contains only the 374 canonical pages; the error page and legacy snapshots are excluded. There is no obsolete keywords meta tag.

System fonts and shared styles are local. Production pages load Google Tag Manager container `GTM-TZH7L6DT` asynchronously, with the standard noscript fallback immediately after the opening body tag. The build adds it once to all 374 localized pages and the 404 page; preview builds omit tracking. Tags are managed and published in the GTM account. Game code remains small and self-contained. Locale-specific numbers use decimal commas where appropriate, with semicolons between vector components to avoid ambiguity. Long translated labels can wrap on narrow screens. Keyboard controls, native language navigation, canvas descriptions, and screen-reader announcements are preserved and localized.

Reference guidance: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Managing multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [Localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions).

## Editing and adding games

- `src/velocity.html`: the working game source, including both physics engines. Its previous location was `public/index.html`.
- `src/site.css`: homepage, navigation, educational content, and translation layout rules.
- `locales/pages.cjs`: page copy, metadata, and localized routes. Keep all eleven entries in sync when adding content.
- `locales/strings.json`: ordered English interface strings. Append new keys without reordering existing keys.
- `locales/translations.tsv`: matching translations in ten language columns. The build rejects missing rows and empty translations.
- `build.cjs`: static page generation. It translates complete text nodes, accessibility labels, and quoted interface strings without modifying physics identifiers or state. It creates the homepage, Speed & Velocity page, and Lunar Lander page for each locale.
- `public/lab-v1.html` and `public/BLUEPRINT.md`: historical reference materials, retained locally and not published.

For another game, add its source and localized route/content, extend the page renderer and homepage card list, and include its canonical routes and language alternates in the generator. Publish a new card only when its game is available; the current future-games note has no inactive or misleading links. Do not edit `dist/` directly: the next build replaces it.

## Verification

```sh
npm run build:preview
npm test
```

The checks run the original physics and UI tests, then execute each generated language's game with a strict in-memory DOM/Canvas adapter. They cover controls, directions, catch and lap completion, localized messages, numerical formatting, language links, metadata, schemas, and sitemap consistency. An isolated build fixture verifies production origin requirements and public indexing directives without replacing the local preview. These are programmatic checks, not visual browser testing.


## Lunar Lander: Eco-Mission

The second game uses HTML, Canvas, CSS, and vanilla JavaScript. It adds Moon and Mars environments, adjustable gravity, initial height/descent speed, thrust acceleration, fuel allowance, and live thrust power. Ignite/cut the engine with the button or hold Space; Play, Pause, Reset, and Step operate independently of the thruster.

| Language | Lunar Lander |
| --- | --- |
| English | `/games/motion/lunar-lander/` |
| Español | `/es/juegos/movimiento/modulo-lunar/` |
| Français | `/fr/jeux/mouvement/module-lunaire/` |
| Deutsch | `/de/spiele/bewegung/mondlander/` |
| Nederlands | `/nl/spellen/beweging/maanlander/` |
| Suomi | `/fi/pelit/liike/kuulaskeutuja/` |
| Norsk bokmål | `/nb/spill/bevegelse/manelander/` |
| Dansk | `/da/spil/bevaegelse/manelander/` |
| Português | `/pt/jogos/movimento/modulo-lunar/` |
| हिन्दी | `/hi/khel/gati/chandra-lander/` |
| 日本語 | `/ja/gemu/undo/getsumen-chakuriku/` |

The signed model uses upward-positive height/velocity and `a = u × aMax − g`. Gravity is constant, with presets of 1.62 m/s² (Moon) and 3.71 m/s² (Mars). Finite fuel is measured in seconds of full-power burn at constant module mass. Fuel exhaustion and platform contact are solved within a timestep. Touchdown readings retain precontact velocity, rather than replacing it with zero. The ideal model omits atmospheric drag.

Land at a speed no greater than 1.5 m/s; keep at least 30% fuel for the eco badge. The braking guide assumes the chosen power stays constant and warns when fuel is insufficient. The altitude view expands during ascent without imposing a physical ceiling. Language changes pause and transfer the current flight via a one-time session entry, when storage is available.

- `DESIGN_GUIDELINES.md`: shared layout, colors, accessibility, language, motion, and physics rules. Also available at `/design-guidelines.md`.
- `src/lander.html`: source markup, local style overrides, pure `LanderPhysics` model, renderer, and controls.
- `locales/lander.cjs`: 110 complete UI/content keys for all eleven languages, with validated interpolation fields.
- `verify-lander.cjs`: physical edge cases and generated-language interface checks. Included in `npm test`.

Existing Speed & Velocity and Pac-Man engines remain unchanged. Generated HTML runs without runtime packages or translation services. Local development continues using the existing server and build workflow.


## Unit Pipeline and Powers-of-Ten Probe

Two measurement games cover SI units, unit conversion, prefixes, and scientific notation. Both use the same template pipeline as Lunar Lander: `src/<game>.html` holds markup with `{{key}}` placeholders, a pure model script, and an interface script; `locales/<game>.cjs` holds every string for all eleven languages; `locales/games.cjs` registers each game for routes, navigation, homepage cards, sitemap, and JSON-LD. Shared styles for the two games are in `src/module.css`.

| Language | Unit Pipeline | Powers-of-Ten Probe |
| --- | --- | --- |
| English | `/games/measurement/unit-conversion/` | `/games/measurement/powers-of-ten/` |
| Español | `/es/juegos/medicion/conversion-unidades/` | `/es/juegos/medicion/potencias-de-diez/` |
| Français | `/fr/jeux/mesure/conversion-unites/` | `/fr/jeux/mesure/puissances-de-dix/` |
| Deutsch | `/de/spiele/messen/einheiten-umrechnen/` | `/de/spiele/messen/zehnerpotenzen/` |
| Nederlands | `/nl/spellen/meten/eenheden-omrekenen/` | `/nl/spellen/meten/machten-van-tien/` |
| Suomi | `/fi/pelit/mittaaminen/yksikkomuunnokset/` | `/fi/pelit/mittaaminen/kymmenen-potenssit/` |
| Norsk bokmål | `/nb/spill/maling/enhetsomregning/` | `/nb/spill/maling/tierpotenser/` |
| Dansk | `/da/spil/maaling/enhedsomregning/` | `/da/spil/maaling/titalspotenser/` |
| Português | `/pt/jogos/medicao/conversao-de-unidades/` | `/pt/jogos/medicao/potencias-de-dez/` |
| हिन्दी | `/hi/khel/mapan/matrak-roopantaran/` | `/hi/khel/mapan/das-ki-ghaten/` |
| 日本語 | `/ja/gemu/sokutei/tani-kansan/` | `/ja/gemu/sokutei/ju-no-beki/` |

**Unit Pipeline** gives each tank a volume V and pump rate Q in everyday units. The learner multiplies V ÷ Q by exact conversion factors (each equal to 1), flipping them until only seconds remain; factors that add units instead of cancelling them are flagged. Play fills the tank from SI values, so the measured fill time independently confirms a valid chain. Five tanks cover mL/L, cubed centimetres (the ×10⁶ trap), L/min, m³/h, and 1 mL = 1 cm³.

**Powers-of-Ten Probe** gives six trips (bacterium, snail, nerve signal, airliner, light to the Moon, light across a desk) with prefixed distance and speed. The learner enters t = a × 10ⁿ s; the probe then travels on a zoomable ruler labelled with SI prefixes and size landmarks. SI conversions of d and v are hidden until launch. Scoring separates correct notation, the right power of ten, and 2% accuracy.

- `verify-pipeline.cjs` and `verify-scale.cjs`: model checks (exact tiles, shortest chains, exact fill/arrival events, scoring, state transfer) and localized interface checks in all eleven languages. Both run in `npm test` through the shared `verify-dom.cjs` adapter.

## Vector games: River Crossing, Orienteering Walk, Force Table

Three games cover scalars and vectors in two dimensions, using the same template pipeline (`src/<game>.html`, `locales/<game>.cjs`, registered in `locales/games.cjs`).

| Language | River Crossing | Orienteering Walk | Force Table |
| --- | --- | --- | --- |
| English | `/games/vectors/river-crossing/` | `/games/vectors/orienteering-walk/` | `/games/vectors/force-table/` |
| Español | `/es/juegos/vectores/cruce-del-rio/` | `/es/juegos/vectores/orientacion/` | `/es/juegos/vectores/mesa-de-fuerzas/` |
| Français | `/fr/jeux/vecteurs/traversee-riviere/` | `/fr/jeux/vecteurs/course-orientation/` | `/fr/jeux/vecteurs/table-des-forces/` |
| Deutsch | `/de/spiele/vektoren/flussueberquerung/` | `/de/spiele/vektoren/orientierungslauf/` | `/de/spiele/vektoren/krafttisch/` |
| Nederlands | `/nl/spellen/vectoren/rivier-oversteken/` | `/nl/spellen/vectoren/orientatieloop/` | `/nl/spellen/vectoren/krachtentafel/` |
| Suomi | `/fi/pelit/vektorit/joen-ylitys/` | `/fi/pelit/vektorit/suunnistus/` | `/fi/pelit/vektorit/voimapoyta/` |
| Norsk bokmål | `/nb/spill/vektorer/elvekryssing/` | `/nb/spill/vektorer/orientering/` | `/nb/spill/vektorer/kraftbord/` |
| Dansk | `/da/spil/vektorer/flodkrydsning/` | `/da/spil/vektorer/orientering/` | `/da/spil/vektorer/kraftbord/` |
| Português | `/pt/jogos/vetores/travessia-do-rio/` | `/pt/jogos/vetores/orientacao/` | `/pt/jogos/vetores/mesa-de-forcas/` |
| हिन्दी | `/hi/khel/sadish/nadi-paar/` | `/hi/khel/sadish/disha-khoj-sair/` | `/hi/khel/sadish/bal-mez/` |
| 日本語 | `/ja/gemu/bekutoru/kawa-watari/` | `/ja/gemu/bekutoru/orienteeringu/` | `/ja/gemu/bekutoru/chikara-no-teburu/` |

**River Crossing**: the ground velocity is the vector sum of the boat's velocity relative to the water and the current. Four missions: land on the dock opposite (gentle and 3-4-5 currents), the fastest crossing, and the least drift when the current is faster than the boat. The learner predicts the landing point.

**Orienteering Walk**: compass legs add tip to tail. Five routes compare the distance walked (scalar) with the displacement (vector), including a round trip with zero displacement. Route tools reverse the leg order (same displacement, different path) and multiply the route by 2 or −1.

**Force Table**: strings pull a ring; the learner adds one force so the vector sum is zero. Static friction (0.05 N) is the honest tolerance for "balanced"; otherwise the ring slides along ΣF to a stop pin. The net force stays hidden until release, and an optional tip-to-tail helper costs a bonus.

- `verify-river.cjs`, `verify-walk.cjs`, `verify-forces.cjs`: model checks (vector sums, slider-reachable solutions, exact landing, corner, finish, hold and slip events, scoring, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Trigonometry games: Loading Ramp, Lighthouse Rescue, Ferris Wheel

Three games cover basic trigonometry with the same template pipeline (`src/<game>.html`, `locales/<game>.cjs`, registered in `locales/games.cjs`). Answers are typed, not picked from a slider, and common mix-ups get their own feedback.

| Language | Loading Ramp | Lighthouse Rescue | Ferris Wheel |
| --- | --- | --- | --- |
| English | `/games/trigonometry/loading-ramp/` | `/games/trigonometry/lighthouse-angles/` | `/games/trigonometry/ferris-wheel/` |
| Español | `/es/juegos/trigonometria/rampa-de-carga/` | `/es/juegos/trigonometria/faro-y-barcos/` | `/es/juegos/trigonometria/rueda-de-la-feria/` |
| Français | `/fr/jeux/trigonometrie/rampe-de-chargement/` | `/fr/jeux/trigonometrie/phare-et-bateaux/` | `/fr/jeux/trigonometrie/grande-roue/` |
| Deutsch | `/de/spiele/trigonometrie/laderampe/` | `/de/spiele/trigonometrie/leuchtturm-winkel/` | `/de/spiele/trigonometrie/riesenrad/` |
| Nederlands | `/nl/spellen/goniometrie/laadhelling/` | `/nl/spellen/goniometrie/vuurtoren-hoeken/` | `/nl/spellen/goniometrie/reuzenrad/` |
| Suomi | `/fi/pelit/trigonometria/lastausramppi/` | `/fi/pelit/trigonometria/majakan-kulmat/` | `/fi/pelit/trigonometria/maailmanpyora/` |
| Norsk bokmål | `/nb/spill/trigonometri/lasterampe/` | `/nb/spill/trigonometri/fyrtarn-vinkler/` | `/nb/spill/trigonometri/pariserhjul/` |
| Dansk | `/da/spil/trigonometri/laesserampe/` | `/da/spil/trigonometri/fyrtaarn-vinkler/` | `/da/spil/trigonometri/pariserhjul/` |
| Português | `/pt/jogos/trigonometria/rampa-de-carga/` | `/pt/jogos/trigonometria/resgate-no-farol/` | `/pt/jogos/trigonometria/roda-gigante/` |
| हिन्दी | `/hi/khel/trikonmiti/ladan-dhalan/` | `/hi/khel/trikonmiti/prakash-stambh-bachav/` | `/hi/khel/trikonmiti/vishal-jhoola/` |
| 日本語 | `/ja/gemu/sankakuhi/niage-surope/` | `/ja/gemu/sankakuhi/todai-kyujo/` | `/ja/gemu/sankakuhi/kanransha/` |

**Loading Ramp**: right-triangle ratios. Six missions give two of L, h, d, θ (or β at the top corner); the learner picks the relation (sin, cos, tan, or Pythagoras) and types the missing side. A winch pulls a box up the ramp at 0.5 m/s with components v cos θ and v sin θ; the ramp fits when the answer is within 1%. Swapped ratios, multiplying instead of dividing, naming sides from the wrong angle, and adding sides instead of squares are recognized.

**Lighthouse Rescue**: inverse functions, angles of elevation and depression. A drone flies in a straight line at 10 m/s from the lamp to the sea, or from the ship to the lamp. Four missions ask for an angle (tan⁻¹, sin⁻¹, cos⁻¹, elevation from the ship) and two for a distance (from an angle of depression, or from an angle measured from the vertical). A hit is within 5 m; precision is within 1%. Complementary angles are recognized.

**Ferris Wheel**: the unit circle. The cabin turns counter-clockwise at 1.5°/s (R = 10 m, hub 12 m up) to 30°, 135°, 210°, 270°, 300°, or 405°. The learner types cos θ and sin θ as decimals or exact forms (`√3/2`, `-1/2`, `1/√2`, `sqrt(2)/2`); both within 0.01 earns the position, exact forms earn a bonus. Swapped values and sign errors are recognized. Axis shadows and a traced sine/cosine graph show the coordinates.

- `verify-ramp.cjs`, `verify-lighthouse.cjs`, `verify-wheel.cjs`: model checks (triangle solutions, exact arrival events, timestep independence, mix-up detection, exact-value parsing, scoring, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Position games: Train Track, Lift Trips, Dog Walk

Three games open the Motion topic with position, distance, and displacement in one dimension, before speed and velocity. They use the same template pipeline (`src/<game>.html`, `locales/<game>.cjs`, registered in `locales/games.cjs` and listed first in the Motion topic). Card numbers (PLAY NOW · 01, 02, …) are computed by the build from topic order, so locale files hold only the label.

| Language | Train Track | Lift Trips | Dog Walk |
| --- | --- | --- | --- |
| English | `/games/motion/train-track/` | `/games/motion/lift-trips/` | `/games/motion/dog-walk-graph/` |
| Español | `/es/juegos/movimiento/tren-en-la-via/` | `/es/juegos/movimiento/ascensor/` | `/es/juegos/movimiento/paseo-del-perro/` |
| Français | `/fr/jeux/mouvement/train-sur-la-voie/` | `/fr/jeux/mouvement/ascenseur/` | `/fr/jeux/mouvement/promenade-du-chien/` |
| Deutsch | `/de/spiele/bewegung/zug-auf-dem-gleis/` | `/de/spiele/bewegung/aufzug/` | `/de/spiele/bewegung/hundespaziergang/` |
| Nederlands | `/nl/spellen/beweging/trein-op-het-spoor/` | `/nl/spellen/beweging/lift/` | `/nl/spellen/beweging/hond-uitlaten/` |
| Suomi | `/fi/pelit/liike/juna-raiteilla/` | `/fi/pelit/liike/hissi/` | `/fi/pelit/liike/koiran-lenkki/` |
| Norsk bokmål | `/nb/spill/bevegelse/tog-pa-skinnene/` | `/nb/spill/bevegelse/heis/` | `/nb/spill/bevegelse/hundetur/` |
| Dansk | `/da/spil/bevaegelse/tog-pa-skinnerne/` | `/da/spil/bevaegelse/elevator/` | `/da/spil/bevaegelse/hundetur/` |
| Português | `/pt/jogos/movimento/trem-nos-trilhos/` | `/pt/jogos/movimento/elevador/` | `/pt/jogos/movimento/passeio-com-o-cachorro/` |
| हिन्दी | `/hi/khel/gati/patri-par-train/` | `/hi/khel/gati/lift-ki-yatrayen/` | `/hi/khel/gati/kutte-ki-sair/` |
| 日本語 | `/ja/gemu/undo/senro-no-ressha/` | `/ja/gemu/undo/erebeta/` | `/ja/gemu/undo/inu-no-sanpo/` |

**Train Track**: position and reference point. A train runs at 20 m/s between stations A–E on a straight east–west track. Each of six missions sets the origin station and the +x direction; the learner predicts the final position and the displacement. Axis values stay hidden until arrival. After arrival the learner can move the origin or flip +x: every position changes, the displacement does not (or only changes sign with +x). Slips recognized: wrong sign, distance from station A instead of the origin, distance travelled instead of position, final position instead of displacement.

**Lift Trips**: distance versus displacement with signs. A lift (2 m/s, 1 s at each intermediate stop, 3 m floors from −3 to 8) makes six multi-stop trips. The learner predicts the distance and the displacement; a trip log draws every stretch side by side while the displacement arrow links only start and finish. Slips recognized: floors instead of metres, straight-line distance instead of the path, distance given as displacement, wrong sign, final position as displacement.

**Dog Walk**: reading a position–time graph. A dog walks a piecewise-constant-velocity route from a bench; the whole x–t graph is shown on a 1 s × 1 m grid, and the path is drawn upright beside it on the same scale. Six questions ask for a position, a displacement, a distance, the return time to the bench, and the farthest point. Play walks the dog in step with the graph; a right first answer earns a bonus.

- `verify-track.cjs`, `verify-lift.cjs`, `verify-dog.cjs`: model checks (frame invariance, exact schedules and arrival events, timestep independence, distance ≥ |displacement|, slip detection, scoring, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Acceleration games: Graph Rider, Galileo's Bells, Stop on the Line

Three games follow speed and velocity in the Motion topic, before Lunar Lander, and make acceleration the main idea: as the slope of a v–t graph, as distance from rest growing with t², and as braking. They use the same template pipeline as the other module games.

| Language | Graph Rider | Galileo's Bells | Stop on the Line |
| --- | --- | --- | --- |
| English | `/games/motion/velocity-graph-rider/` | `/games/motion/galileo-bells/` | `/games/motion/stop-on-the-line/` |
| Español | `/es/juegos/movimiento/grafica-de-velocidad/` | `/es/juegos/movimiento/campanas-de-galileo/` | `/es/juegos/movimiento/frena-en-la-linea/` |
| Français | `/fr/jeux/mouvement/graphique-de-vitesse/` | `/fr/jeux/mouvement/cloches-de-galilee/` | `/fr/jeux/mouvement/arret-sur-la-ligne/` |
| Deutsch | `/de/spiele/bewegung/geschwindigkeitsgraph/` | `/de/spiele/bewegung/galileis-glocken/` | `/de/spiele/bewegung/bremsweg/` |
| Nederlands | `/nl/spellen/beweging/snelheidsgrafiek/` | `/nl/spellen/beweging/klokken-van-galilei/` | `/nl/spellen/beweging/remweg/` |
| Suomi | `/fi/pelit/liike/nopeuskuvaaja/` | `/fi/pelit/liike/galilein-kellot/` | `/fi/pelit/liike/jarrutusmatka/` |
| Norsk bokmål | `/nb/spill/bevegelse/hastighetsgraf/` | `/nb/spill/bevegelse/galileis-bjeller/` | `/nb/spill/bevegelse/bremselengde/` |
| Dansk | `/da/spil/bevaegelse/hastighedsgraf/` | `/da/spil/bevaegelse/galileis-klokker/` | `/da/spil/bevaegelse/bremselaengde/` |
| Português | `/pt/jogos/movimento/grafico-de-velocidade/` | `/pt/jogos/movimento/sinos-de-galileu/` | `/pt/jogos/movimento/frear-na-linha/` |
| हिन्दी | `/hi/khel/gati/veg-graph/` | `/hi/khel/gati/galileo-ki-ghantiyan/` | `/hi/khel/gati/rekha-par-rukein/` |
| 日本語 | `/ja/gemu/undo/sokudo-gurafu/` | `/ja/gemu/undo/garireo-no-kane/` | `/ja/gemu/undo/sen-de-tomaru/` |

**Graph Rider**: acceleration as the slope of a v–t graph. Four target graphs are made of straight legs; the learner sets one constant acceleration per leg (slider, ±3 m/s² in 0.5 steps) and drives. The trace is drawn over the dashed target while a ghost cart drives the target motion beside the learner's cart; the shaded area under the trace is the displacement. Slips recognized per leg: non-zero acceleration on a flat leg, wrong sign, a = 0 on a sloping leg, wrong direction, too steep, too shallow.

**Galileo's Bells**: uniform acceleration from rest. A ball rolls down a ramp with a given acceleration; the learner places four bells so they ring on a steady beat (x = ½·a·t² at t = Δt … 4Δt), or, on the last ramp, finds a for fixed bells. A rhythm strip compares each ring with the beat, the gaps between bells show the 1 : 3 : 5 : 7 rule, and optional Web Audio tones play the beat and the rings. Slips recognized: a·t² (no ½), a·t (speed instead of distance), equally spaced bells, a = x ÷ t².

**Stop on the Line**: deceleration and braking distance. A car cruises at v₀, then brakes with constant deceleration; the learner predicts where to brake (d = v₀² ÷ (2a)), including double speed, a wet road, and a 1 s reaction time, or the deceleration for a given braking point. A v–t graph shades the braking distance as a triangle. Slips recognized: v₀² ÷ a (no ½), doubling the distance when the speed doubles, a forgotten reaction distance, the stopping time given as a distance, a = v₀² ÷ d.

- `verify-graph.cjs`, `verify-bells.cjs`, `verify-brake.cjs`: model checks (exact closed-form motion, continuity at leg and phase boundaries, exact ring and stop events inside long steps, timestep independence, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.


## Free-fall games: Drop Test, Straight Up, Reaction Ruler

Three games follow Stop on the Line in the Motion topic, before Lunar Lander, and cover free fall: motion with a = −g, down from rest, up and back down, and as a way to measure time. They use the same template pipeline as the other module games.

| Language | Drop Test | Straight Up | Reaction Ruler |
| --- | --- | --- | --- |
| English | `/games/motion/drop-test/` | `/games/motion/straight-up/` | `/games/motion/reaction-ruler/` |
| Español | `/es/juegos/movimiento/prueba-de-caida/` | `/es/juegos/movimiento/lanzamiento-vertical/` | `/es/juegos/movimiento/regla-de-reaccion/` |
| Français | `/fr/jeux/mouvement/test-de-chute/` | `/fr/jeux/mouvement/lancer-vertical/` | `/fr/jeux/mouvement/regle-de-reaction/` |
| Deutsch | `/de/spiele/bewegung/falltest/` | `/de/spiele/bewegung/senkrechter-wurf/` | `/de/spiele/bewegung/reaktionslineal/` |
| Nederlands | `/nl/spellen/beweging/valtest/` | `/nl/spellen/beweging/verticale-worp/` | `/nl/spellen/beweging/reactieliniaal/` |
| Suomi | `/fi/pelit/liike/pudotuskoe/` | `/fi/pelit/liike/pystysuora-heitto/` | `/fi/pelit/liike/reaktioviivain/` |
| Norsk bokmål | `/nb/spill/bevegelse/slippforsok/` | `/nb/spill/bevegelse/loddrett-kast/` | `/nb/spill/bevegelse/reaksjonslinjal/` |
| Dansk | `/da/spil/bevaegelse/faldforsoeg/` | `/da/spil/bevaegelse/lodret-kast/` | `/da/spil/bevaegelse/reaktionslineal/` |
| Português | `/pt/jogos/movimento/teste-de-queda/` | `/pt/jogos/movimento/lancamento-vertical/` | `/pt/jogos/movimento/regua-de-reacao/` |
| हिन्दी | `/hi/khel/gati/girane-ka-pareekshan/` | `/hi/khel/gati/seedha-upar/` | `/hi/khel/gati/pratikriya-paimana/` |
| 日本語 | `/ja/gemu/undo/rakka-tesuto/` | `/ja/gemu/undo/nageage/` | `/ja/gemu/undo/hanno-monosashi/` |

**Drop Test**: free fall from rest. Five missions drop a ball from a balcony, from a tower four times higher, onto the Moon (g = 1.62 m/s²), and with a heavy and a light ball side by side; the learner predicts the fall time (t = √(2h ÷ g)) or the impact speed (v = √(2·g·h)). The drop plays in real time. Slips recognized: no square root, a missing 2, h ÷ g, Earth's g on the Moon, a heavier ball falling faster, g·h for the speed, the fall time given as a speed.

**Straight Up**: vertical throw. A ball is thrown up at v₀ and caught at the same height; the learner predicts the time to the top (v₀ ÷ g), the maximum height (v₀² ÷ (2g)), the flight time, the acceleration at the top, and the velocity on the way down. Heights are measured from the hand, up positive, and the view and graph keep the same scales for every throw. Slips recognized: whole flight for the time to the top, no ½ in the height, a time given as a height, only the way up, zero acceleration at the top, wrong signs for a and v, zero velocity at the catch.

**Reaction Ruler**: free fall as a clock. A ruler drops from rest between open fingers; the learner turns a catch mark into a reaction time (t = √(2d ÷ g)), a reaction time into a mark, compares 0.1 s and 0.2 s (d grows with t²), and finds the slowest reaction that still catches a 30 cm ruler. Scored drops play ×0.1; a real-time Test Yourself mode drops the ruler after a random wait and measures the learner's own reaction (button or Space). Slips recognized: no square root, a missing 2, centimetres used as metres, no ½, metres given for centimetres, doubling the distance with the time, g·t instead of a distance.

- `verify-drop.cjs`, `verify-toss.cjs`, `verify-ruler.cjs`: model checks (exact landing, top, catch and slip events inside long steps, timestep independence, symmetry of the throw, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Formula games: Formula Balance, Undo Machine, Formula Test Drive

The Formulas topic, between Measurement and Vectors, covers rearranging formulas (*despeje de fórmulas*). Each game uses the values of one real situation, so every step of a rearrangement can be checked as numbers. They use the same template pipeline as the other module games.

| Language | Formula Balance | Undo Machine | Formula Test Drive |
| --- | --- | --- | --- |
| English | `/games/formulas/formula-balance/` | `/games/formulas/undo-machine/` | `/games/formulas/formula-test-drive/` |
| Español | `/es/juegos/despeje-de-formulas/balanza-de-formulas/` | `/es/juegos/despeje-de-formulas/maquina-inversa/` | `/es/juegos/despeje-de-formulas/prueba-de-formulas/` |
| Français | `/fr/jeux/formules/balance-des-formules/` | `/fr/jeux/formules/machine-inverse/` | `/fr/jeux/formules/essai-de-formules/` |
| Deutsch | `/de/spiele/formeln/formelwaage/` | `/de/spiele/formeln/umkehrmaschine/` | `/de/spiele/formeln/formel-probefahrt/` |
| Nederlands | `/nl/spellen/formules/formulebalans/` | `/nl/spellen/formules/omkeermachine/` | `/nl/spellen/formules/formuleproefrit/` |
| Suomi | `/fi/pelit/kaavat/kaavavaaka/` | `/fi/pelit/kaavat/kaanteiskone/` | `/fi/pelit/kaavat/kaavan-koeajo/` |
| Norsk bokmål | `/nb/spill/formler/formelvekt/` | `/nb/spill/formler/omvendingsmaskin/` | `/nb/spill/formler/formelprovekjoring/` |
| Dansk | `/da/spil/formler/formelvaegt/` | `/da/spil/formler/omvendingsmaskine/` | `/da/spil/formler/formelproevekoersel/` |
| Português | `/pt/jogos/formulas/balanca-de-formulas/` | `/pt/jogos/formulas/maquina-inversa/` | `/pt/jogos/formulas/teste-de-formulas/` |
| हिन्दी | `/hi/khel/sutra/sutra-taraju/` | `/hi/khel/sutra/ulti-mashin/` | `/hi/khel/sutra/sutra-pareekshan/` |
| 日本語 | `/ja/gemu/koshiki/koshiki-tenbin/` | `/ja/gemu/koshiki/gyaku-mashin/` | `/ja/gemu/koshiki/koshiki-tesuto/` |

**Formula Balance**: doing the same to both sides. Five formulas (d = v·t, F = m·a, v = d / t, x = ½·a·t², E = ½·m·v²) are shown as a two-pan balance. The learner applies × or ÷ by a letter or by 2, a square, or a square root to both sides, the left only, or the right only, until the unknown is alone; Weigh then swings the beam (damped, ending exactly after 4 s). A one-sided step tips the scale. The bonus is for the fewest steps.

**Undo Machine**: inverse operations in reverse order. Each formula is drawn as a forward machine of single operations on the unknown; the learner builds a reverse machine of up to six boxes, and a token carries the known value through it (0.8 s per stretch of pipe). Slips recognized: the right boxes in the wrong order, a repeated forward step instead of its inverse, a missing step, a square root of a negative number.

**Formula Test Drive**: checking a rearranged formula. Five driving situations each offer four rearrangements, one right and three common mistakes; an optional units check shows the units of each. The car drives with the chosen value and stops on the line, short of it, past it, or at the wrong speed. Slips recognized: an inverted fraction, multiplying instead of dividing, adding unlike units, a wrong sign, a missing factor 2, an unsquared speed, a missing square root. Feedback says whether a unit check would have caught the mistake.

- `verify-balance.cjs`, `verify-machine.cjs`, `verify-pickform.cjs`: model checks (exact symbolic steps, balance and tipping, exact token and stop events, slip detection, scoring, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Projectile games: Air Drop, Two Shadows, Range Cannon

The Projectile motion topic (*movimiento parabólico*) comes last, after Vectors and Trigonometry, because every game splits a velocity into components with sine and cosine. Each game treats a projectile as uniform motion across plus free fall or a vertical throw, sharing one clock. They use the same template pipeline as the other module games.

| Language | Air Drop | Two Shadows | Range Cannon |
| --- | --- | --- | --- |
| English | `/games/projectile-motion/air-drop/` | `/games/projectile-motion/two-shadows/` | `/games/projectile-motion/range-cannon/` |
| Español | `/es/juegos/movimiento-parabolico/lanzamiento-desde-avion/` | `/es/juegos/movimiento-parabolico/dos-sombras/` | `/es/juegos/movimiento-parabolico/canon-de-alcance/` |
| Français | `/fr/jeux/mouvement-parabolique/largage/` | `/fr/jeux/mouvement-parabolique/deux-ombres/` | `/fr/jeux/mouvement-parabolique/canon-de-portee/` |
| Deutsch | `/de/spiele/wurfbewegung/abwurf/` | `/de/spiele/wurfbewegung/zwei-schatten/` | `/de/spiele/wurfbewegung/wurfweiten-kanone/` |
| Nederlands | `/nl/spellen/worpen/luchtdropping/` | `/nl/spellen/worpen/twee-schaduwen/` | `/nl/spellen/worpen/worpafstand-kanon/` |
| Suomi | `/fi/pelit/heittoliike/pudotus-lentokoneesta/` | `/fi/pelit/heittoliike/kaksi-varjoa/` | `/fi/pelit/heittoliike/kantamatykki/` |
| Norsk bokmål | `/nb/spill/kastebevegelse/slipp-fra-fly/` | `/nb/spill/kastebevegelse/to-skygger/` | `/nb/spill/kastebevegelse/kastelengdekanon/` |
| Dansk | `/da/spil/kastebevaegelse/nedkast-fra-fly/` | `/da/spil/kastebevaegelse/to-skygger/` | `/da/spil/kastebevaegelse/kastelaengdekanon/` |
| Português | `/pt/jogos/movimento-parabolico/lancamento-do-aviao/` | `/pt/jogos/movimento-parabolico/duas-sombras/` | `/pt/jogos/movimento-parabolico/canhao-de-alcance/` |
| हिन्दी | `/hi/khel/prakshepya-gati/vimaan-se-giraana/` | `/hi/khel/prakshepya-gati/do-parchhaiyan/` | `/hi/khel/prakshepya-gati/paras-top/` |
| 日本語 | `/ja/gemu/hoshabutsu-undo/hikoki-kara-toka/` | `/ja/gemu/hoshabutsu-undo/futatsu-no-kage/` | `/ja/gemu/hoshabutsu-undo/shatei-taiho/` |

**Air Drop**: horizontal launch. A plane in level flight releases a crate that keeps the plane's velocity. Five missions ask for the fall time (t = √(2h ÷ g)), the release distance before a target (d = v·t), the fall time again with a faster plane (unchanged), the impact speed (|v| = √(vₓ² + v_y²)), and the altitude for a given release point. With a target, the answer sets the release point or the altitude, so the crate visibly lands short, past, or on the flag. A ball dropped from rest at the release point falls level with the crate, and the crate stays right below the plane. Slips recognized: no square root, a missing 2, h ÷ v, a faster plane falling faster, releasing over the target, the fall time given as a distance, a single component or the sum of components for the speed, g·t or g·t² for the height.

**Two Shadows**: velocity components. A ball thrown from the floor at v₀ and θ casts a floor shadow that moves uniformly at vₓ = v₀·cos θ and a wall shadow that rises and falls like a vertical throw at v_y0 = v₀·sin θ. Missions ask for vₓ, the time to the top, the maximum height, the speed at the top (vₓ, not zero), and the landing distance. vₓ is hidden until landing when it is the answer. Slips recognized: swapped sine and cosine, the whole v₀ instead of a component, the whole flight for the time to the top, no ½ in the height, zero speed at the top, v_y0 at the top, the top position for the landing.

**Range Cannon**: range and launch angle, R = v₀²·sin(2θ) ÷ g. Missions ask for a range, the complementary angle that lands in the same spot, the maximum range (45°), the angle that hits a target (either root counts, within 0.5°), and the speed for a 45° shot. An angle or speed answer aims the cannon; a range answer plants a flag. After each landing a small graph draws R(θ) for that speed, with the shot marked. Slips recognized: sin θ instead of sin 2θ, half the range, the maximum at the wrong angle, the same angle again, 45° for the other angle, v₀² ÷ (2g) or 2v₀² ÷ g for the maximum, 2θ instead of θ, an answer in radians, and a factor 2 in the speed.

- `verify-airdrop.cjs`, `verify-shadows.cjs`, `verify-cannon.cjs`: model checks (independent components, exact top and landing events inside long steps, timestep independence, complementary angles and the 45° maximum, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.
