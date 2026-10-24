# Phisicos — multilingual educational simulation games

A static homepage linked to Train Track, Lift Trips, Dog Walk, the speed and velocity lab, Pac-Man chase, Graph Rider, Galileo's Bells, Stop on the Line, Drop Test, Straight Up, Reaction Ruler, Lunar Lander: Eco-Mission, Unit Pipeline, the Powers-of-Ten Probe, Formula Balance, Undo Machine, Formula Test Drive, River Crossing, Orienteering Walk, Force Table, Loading Ramp, Lighthouse Rescue, Ferris Wheel, Air Drop, Two Shadows, Range Cannon, Carousel, Spin Station, Curve Ahead, Planet Scale, Satellite Launch, and Kepler's Clock. The header lists every game in a localized Games menu. The implementation preserves both physics engines and generates searchable HTML in English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, Danish, Brazilian Portuguese, Hindi, and Japanese. No runtime dependencies or translation services are required.

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

Games are grouped into seventeen topics: Motion (Train Track, Lift Trips, Dog Walk, speed & velocity, Graph Rider, Galileo's Bells, Stop on the Line, Drop Test, Straight Up, Reaction Ruler, Lunar Lander), Measurement (Unit Pipeline, Powers-of-Ten Probe), Formulas (Formula Balance, Undo Machine, Formula Test Drive), Vectors (River Crossing, Orienteering Walk, Force Table), Trigonometry (Loading Ramp, Lighthouse Rescue, Ferris Wheel), Projectile motion (Air Drop, Two Shadows, Range Cannon), Circular motion (Carousel, Spin Station, Curve Ahead), Gravitation (Planet Scale, Satellite Launch, Kepler's Clock), Statics (Hanging Sign, Seesaw, Plank Bridge), Torque and rotation (Stuck Bolt, Forklift, Flywheel Race, Lever Lab, Force for Distance), Centre of mass (Balance Point, Hanging Mobile, Block Tower), Fluids (Density Detective, Barge Load, Deep Dive, Weighed Under Water, Balloon Lift, Torricelli's Tube, Magdeburg Hemispheres, Hydraulic Lift, Pascal's Barrel), Fluids in motion (Leaky Tank, Venturi Pipe, Storm and Wing), Oscillations (Metronome Studio, Harbour Buoy, Seismograph, Pendulum Clock, Wrecking Ball, Big and Fading Swings, Spring Bounce, Spring Shop, Spring Launcher, Swing and Resonance), and Waves (Rope Pulse, Pebble Ripples, Power on a Rope, Ripple Tank Ruler, Wave Machine, String Tuner, Strobe Freeze, Surfer's Wait, Tide Clock, Rope Tension Lab, Tsunami Race, Slinky Lab, Earthquake P and S, Echo Sounder, Bank Shot Ripples, Shallow Beach, Spearfishing, Two Speakers, Beat Tuner, Harbour Gap, Laser Slit, Ambulance Pass-by, Paddling Duck, Decibel Meter, Bottle Flute, Antenna Workshop, Sound in Slow Motion), and Electrostatics (Static Rub, Oil Drop, Touch and Share, Material Tester, Floating Bead, Charge Tug, Field Probe, Electron Beam, Potential Map, Particle Gun), and Electric circuits (Battery Stack, Voltmeter Walk, Charge Gate, Snail Electrons, Wire Stretcher, Hot Filament, Ohm's Law Lab, Fuse Test, Bulb Chain, Voltage Divider, Room Wiring, Current Splitter, Bulb Brightness, Power Line, Kettle Race, Energy Meter). Each game route nests under its topic: `<games index>/<topic>/<game>/`. The games index lists the topics, and each topic page lists its games in the suggested playing order, followed by the other topics. Breadcrumbs (visible and in JSON-LD) follow the URL: Home / Topics / topic / game. The header has a Topics link and a Games menu grouped by topic. The homepage shows the topic tiles first, then every game card under its topic heading.

| Language | Topics index | Motion | Measurement | Formulas | Vectors | Trigonometry | Projectile motion | Circular motion | Gravitation | Statics | Torque and rotation | Centre of mass | Fluids | Fluids in motion | Oscillations | Waves |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| English | `/games/` | `/games/motion/` | `/games/measurement/` | `/games/formulas/` | `/games/vectors/` | `/games/trigonometry/` | `/games/projectile-motion/` | `/games/circular-motion/` | `/games/gravitation/` | `/games/statics/` | `/games/torque-and-rotation/` | `/games/centre-of-mass/` | `/games/fluids/` | `/games/fluids-in-motion/` | `/games/oscillations/` | `/games/waves/` |
| Español | `/es/juegos/` | `/es/juegos/movimiento/` | `/es/juegos/medicion/` | `/es/juegos/despeje-de-formulas/` | `/es/juegos/vectores/` | `/es/juegos/trigonometria/` | `/es/juegos/movimiento-parabolico/` | `/es/juegos/movimiento-circular/` | `/es/juegos/gravitacion/` | `/es/juegos/estatica/` | `/es/juegos/momento-y-rotacion/` | `/es/juegos/centro-de-masa/` | `/es/juegos/fluidos/` | `/es/juegos/fluidos-en-movimiento/` | `/es/juegos/oscilaciones/` | `/es/juegos/ondas/` |
| Français | `/fr/jeux/` | `/fr/jeux/mouvement/` | `/fr/jeux/mesure/` | `/fr/jeux/formules/` | `/fr/jeux/vecteurs/` | `/fr/jeux/trigonometrie/` | `/fr/jeux/mouvement-parabolique/` | `/fr/jeux/mouvement-circulaire/` | `/fr/jeux/gravitation/` | `/fr/jeux/statique/` | `/fr/jeux/moment-et-rotation/` | `/fr/jeux/centre-de-masse/` | `/fr/jeux/fluides/` | `/fr/jeux/fluides-en-mouvement/` | `/fr/jeux/oscillations/` | `/fr/jeux/ondes/` |
| Deutsch | `/de/spiele/` | `/de/spiele/bewegung/` | `/de/spiele/messen/` | `/de/spiele/formeln/` | `/de/spiele/vektoren/` | `/de/spiele/trigonometrie/` | `/de/spiele/wurfbewegung/` | `/de/spiele/kreisbewegung/` | `/de/spiele/gravitation/` | `/de/spiele/statik/` | `/de/spiele/drehmoment-und-rotation/` | `/de/spiele/schwerpunkt/` | `/de/spiele/fluessigkeiten/` | `/de/spiele/stroemungen/` | `/de/spiele/schwingungen/` | `/de/spiele/wellen/` |
| Nederlands | `/nl/spellen/` | `/nl/spellen/beweging/` | `/nl/spellen/meten/` | `/nl/spellen/formules/` | `/nl/spellen/vectoren/` | `/nl/spellen/goniometrie/` | `/nl/spellen/worpen/` | `/nl/spellen/cirkelbeweging/` | `/nl/spellen/gravitatie/` | `/nl/spellen/statica/` | `/nl/spellen/moment-en-rotatie/` | `/nl/spellen/massamiddelpunt/` | `/nl/spellen/vloeistoffen/` | `/nl/spellen/stromingen/` | `/nl/spellen/trillingen/` | `/nl/spellen/golven/` |
| Suomi | `/fi/pelit/` | `/fi/pelit/liike/` | `/fi/pelit/mittaaminen/` | `/fi/pelit/kaavat/` | `/fi/pelit/vektorit/` | `/fi/pelit/trigonometria/` | `/fi/pelit/heittoliike/` | `/fi/pelit/ympyraliike/` | `/fi/pelit/gravitaatio/` | `/fi/pelit/statiikka/` | `/fi/pelit/momentti-ja-pyoriminen/` | `/fi/pelit/massakeskipiste/` | `/fi/pelit/nesteet/` | `/fi/pelit/virtaukset/` | `/fi/pelit/varahtelut/` | `/fi/pelit/aallot/` |
| Norsk bokmål | `/nb/spill/` | `/nb/spill/bevegelse/` | `/nb/spill/maling/` | `/nb/spill/formler/` | `/nb/spill/vektorer/` | `/nb/spill/trigonometri/` | `/nb/spill/kastebevegelse/` | `/nb/spill/sirkelbevegelse/` | `/nb/spill/gravitasjon/` | `/nb/spill/statikk/` | `/nb/spill/dreiemoment-og-rotasjon/` | `/nb/spill/massesenter/` | `/nb/spill/vaesker/` | `/nb/spill/stromninger/` | `/nb/spill/svingninger/` | `/nb/spill/bolger/` |
| Dansk | `/da/spil/` | `/da/spil/bevaegelse/` | `/da/spil/maaling/` | `/da/spil/formler/` | `/da/spil/vektorer/` | `/da/spil/trigonometri/` | `/da/spil/kastebevaegelse/` | `/da/spil/cirkelbevaegelse/` | `/da/spil/gravitation/` | `/da/spil/statik/` | `/da/spil/kraftmoment-og-rotation/` | `/da/spil/massemidtpunkt/` | `/da/spil/vaesker/` | `/da/spil/stromninger/` | `/da/spil/svingninger/` | `/da/spil/bolger/` |
| Português | `/pt/jogos/` | `/pt/jogos/movimento/` | `/pt/jogos/medicao/` | `/pt/jogos/formulas/` | `/pt/jogos/vetores/` | `/pt/jogos/trigonometria/` | `/pt/jogos/movimento-parabolico/` | `/pt/jogos/movimento-circular/` | `/pt/jogos/gravitacao/` | `/pt/jogos/estatica/` | `/pt/jogos/torque-e-rotacao/` | `/pt/jogos/centro-de-massa/` | `/pt/jogos/fluidos/` | `/pt/jogos/fluidos-em-movimento/` | `/pt/jogos/oscilacoes/` | `/pt/jogos/ondas/` |
| हिन्दी | `/hi/khel/` | `/hi/khel/gati/` | `/hi/khel/mapan/` | `/hi/khel/sutra/` | `/hi/khel/sadish/` | `/hi/khel/trikonmiti/` | `/hi/khel/prakshepya-gati/` | `/hi/khel/vrittiya-gati/` | `/hi/khel/gurutvakarshan/` | `/hi/khel/sthitiki/` | `/hi/khel/bal-aghurn-aur-ghurnan/` | `/hi/khel/dravyaman-kendra/` | `/hi/khel/taral/` | `/hi/khel/bahte-taral/` | `/hi/khel/dolan/` | `/hi/khel/tarangen/` |
| 日本語 | `/ja/gemu/` | `/ja/gemu/undo/` | `/ja/gemu/sokutei/` | `/ja/gemu/koshiki/` | `/ja/gemu/bekutoru/` | `/ja/gemu/sankakuhi/` | `/ja/gemu/hoshabutsu-undo/` | `/ja/gemu/en-undo/` | `/ja/gemu/banyu-inryoku/` | `/ja/gemu/tsuriai/` | `/ja/gemu/moment-to-kaiten/` | `/ja/gemu/juushin/` | `/ja/gemu/ryutai/` | `/ja/gemu/ryutai-no-nagare/` | `/ja/gemu/shindo/` | `/ja/gemu/nami/` |

- `locales/topics.cjs`: topic membership and order, localized slugs, names, page titles, descriptions, and interface words. A game belongs to exactly one topic; the build fails otherwise.
- `locales/site.cjs`: every page kind on the site, which ones are collections, and each game’s topic. The build and all checks read the page list from here.
- `locales/tags.cjs`: collections, which group games across topics without moving them. A game keeps its topic route and breadcrumbs, and its page gets an "Also in" link to every collection that lists it. Each collection page lives beside the topic pages (`<games index>/<slug>/`, breadcrumbs Home / Topics / collection) with the key equations, the game cards, and a note on how each game uses the idea. Collection tiles appear on the topics index and on every topic page that shares a game. The build fails if a collection lists an unknown game, misses a note, or reuses a topic slug. The first collection is **uniform linear motion (MRU)**: Train Track, Dog Walk, Lift Trips, Speed & velocity, and the Powers-of-Ten Probe, at `/games/uniform-motion/`, `/es/juegos/movimiento-rectilineo-uniforme/`, `/fr/jeux/mouvement-rectiligne-uniforme/`, `/de/spiele/gleichfoermige-bewegung/`, `/nl/spellen/eenparige-beweging/`, `/fi/pelit/tasainen-liike/`, `/nb/spill/jevn-bevegelse/`, `/da/spil/jaevn-bevaegelse/`, `/pt/jogos/movimento-retilineo-uniforme/`, `/hi/khel/ekasaman-rekhiya-gati/`, and `/ja/gemu/tosoku-chokusen-undo/`. The second is **force equilibrium**: Force Table (from Vectors) with Hanging Sign, Seesaw, and Plank Bridge, at `/games/force-equilibrium/`, `/es/juegos/equilibrio-de-fuerzas/`, `/fr/jeux/equilibre-des-forces/`, `/de/spiele/kraeftegleichgewicht/`, `/nl/spellen/krachtenevenwicht/`, `/fi/pelit/voimien-tasapaino/`, `/nb/spill/kraftlikevekt/`, `/da/spil/kraftligevaegt/`, `/pt/jogos/equilibrio-de-forcas/`, `/hi/khel/bal-santulan/`, and `/ja/gemu/chikara-no-tsuriai/`.
- `locales/legacy-routes.cjs`: game routes before topic browsing (October 2026). The hosting build turns each into a one-hop 301 redirect to the game’s current route (with or without a trailing slash or `index.html`, keeping the query string). Keep this file when adding games; add an entry only if a published route moves again.

To add a game, register it in `locales/games.cjs`, add its kind to one topic in `locales/topics.cjs`, and give its locale routes the form `<games index>/<topic slug>/<game slug>/`.

## Content and SEO

The primary keyword across the site is **educational simulation games**. The homepage title, H1, description, collection heading, and navigation label target it directly; each game page targets **educational simulation game** plus its topic (speed and velocity, or gravity for Lunar Lander). Localized equivalents: *juegos de simulación educativos* (es), *jeux de simulation éducatifs* (fr), *Simulationsspiele zum Lernen* (de), *educatieve simulatiespellen* (nl), *opetukselliset simulaatiopelit* (fi), *pedagogiske simuleringsspill* (nb), *pædagogiske simulationsspil* (da), *jogos de simulação educativos* (pt), *शैक्षिक सिमुलेशन गेम* (hi), and *教育用シミュレーションゲーム* (ja). Physics terms stay as secondary keywords. Each page has a unique title and description, one H1, semantic headings and landmarks, crawlable internal links, and localized instructions. The game page includes a worked relative-speed example and questions about average speed, average velocity, and direction. Editorial content is in the initial HTML and does not depend on JavaScript or Canvas rendering.

Metadata includes Open Graph, Twitter large-image cards, a local 1200 × 630 sharing image, site icons, and JSON-LD (`WebSite`, `CollectionPage` or `WebPage` with the localized primary keyword in `keywords`, `BreadcrumbList`, and `VideoGame` on the game page). No invented ratings, reviews, offers, or rich-result promises are included. `sitemap.xml` contains only the 2346 canonical pages; the error page and legacy snapshots are excluded. There is no obsolete keywords meta tag.

System fonts and shared styles are local. Production pages load Google Tag Manager container `GTM-TZH7L6DT` asynchronously, with the standard noscript fallback immediately after the opening body tag. The build adds it once to all 2346 localized pages and the 404 page; preview builds omit tracking. Tags are managed and published in the GTM account. Game code remains small and self-contained. Locale-specific numbers use decimal commas where appropriate, with semicolons between vector components to avoid ambiguity. Long translated labels can wrap on narrow screens. Keyboard controls, native language navigation, canvas descriptions, and screen-reader announcements are preserved and localized.

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

## Circular motion games: Carousel, Spin Station, Curve Ahead

The Circular motion topic (*movimiento circular*) comes after Projectile motion. Its games cover uniform circular motion, angular velocity, centripetal acceleration, centripetal force, and two applications: artificial gravity on a spinning space station and the top speed of a car on a flat curve. They use the same template pipeline as the other module games. In all three, a run counts as an attempt as soon as it starts, because a measurement shown during the run would otherwise give the answer away.

| Language | Carousel | Spin Station | Curve Ahead |
| --- | --- | --- | --- |
| English | `/games/circular-motion/carousel/` | `/games/circular-motion/spin-station/` | `/games/circular-motion/curve-ahead/` |
| Español | `/es/juegos/movimiento-circular/carrusel/` | `/es/juegos/movimiento-circular/estacion-espacial-giratoria/` | `/es/juegos/movimiento-circular/curva-peligrosa/` |
| Français | `/fr/jeux/mouvement-circulaire/manege/` | `/fr/jeux/mouvement-circulaire/station-spatiale-tournante/` | `/fr/jeux/mouvement-circulaire/virage-serre/` |
| Deutsch | `/de/spiele/kreisbewegung/karussell/` | `/de/spiele/kreisbewegung/rotierende-raumstation/` | `/de/spiele/kreisbewegung/kurvenfahrt/` |
| Nederlands | `/nl/spellen/cirkelbeweging/draaimolen/` | `/nl/spellen/cirkelbeweging/draaiend-ruimtestation/` | `/nl/spellen/cirkelbeweging/scherpe-bocht/` |
| Suomi | `/fi/pelit/ympyraliike/karuselli/` | `/fi/pelit/ympyraliike/pyoriva-avaruusasema/` | `/fi/pelit/ympyraliike/jyrkka-mutka/` |
| Norsk bokmål | `/nb/spill/sirkelbevegelse/karusell/` | `/nb/spill/sirkelbevegelse/roterende-romstasjon/` | `/nb/spill/sirkelbevegelse/skarp-sving/` |
| Dansk | `/da/spil/cirkelbevaegelse/karrusel/` | `/da/spil/cirkelbevaegelse/roterende-rumstation/` | `/da/spil/cirkelbevaegelse/skarpt-sving/` |
| Português | `/pt/jogos/movimento-circular/carrossel/` | `/pt/jogos/movimento-circular/estacao-espacial-giratoria/` | `/pt/jogos/movimento-circular/curva-perigosa/` |
| हिन्दी | `/hi/khel/vrittiya-gati/merry-go-round/` | `/hi/khel/vrittiya-gati/ghoomta-antariksh-station/` | `/hi/khel/vrittiya-gati/sadak-ka-mod/` |
| 日本語 | `/ja/gemu/en-undo/merry-go-round/` | `/ja/gemu/en-undo/kaiten-uchu-station/` | `/ja/gemu/en-undo/kabu/` |

**Carousel**: uniform circular motion and angular velocity, θ = ω·t, v = ω·r, T = 2π ÷ ω. Missions ask for the period of one lap, the angular velocity from the period, the speed of a drone that must stay above a horse, the angle turned in degrees, and the time to reach a gate at 270°. A time answer stops the ride, an angular velocity spins it, a speed flies the drone, and an angle plants a flag. A θ–t graph draws a straight line whose slope is ω. Slips recognized: r ÷ v, half a lap, the circumference as a time, the frequency for the period, ω in degrees per second, the frequency or laps per minute for ω, T ÷ 2π, ω ÷ r, r ÷ ω, ω in degrees per second for the speed, an extra 2π, an angle left in radians, ω ÷ t, t ÷ ω, degrees divided by rad/s, and θ·ω for a time.

**Spin Station**: centripetal acceleration, a = v² ÷ r = ω²·r, felt as artificial gravity. Missions ask for the acceleration from the rim speed and from the spin rate, then the spin rate and the period that give Earth gravity, and the radius that gives Moon gravity with a 60 s turn. An acceleration answer marks a dial; a spin rate, period, or radius sets up the station. The dial reads the floor's push per kilogram once a spin starts. Slips recognized: v ÷ r, v²·r, v² ÷ 2r, ω·r, (ω·r)², ω² ÷ r, a ÷ r without the root, √(r ÷ a) for ω, √(r ÷ a) or 2π·r ÷ a for the period, and the rim speed for the radius.

**Curve Ahead**: centripetal force from tyre friction, F = m·v² ÷ r ≤ μ·m·g, so the top speed is v = √(μ·g·r) for any mass. Missions ask for the sideways force, the top speed, the tightest curve, the top speed on a wet road (μ halved), and the top speed of a heavy truck. With too little grip the car follows a wider circle, R = m·v² ÷ (μ·m·g), and either runs wide or slides off the outside of the road. Slips recognized: m·v ÷ r, v² ÷ r, the weight m·g, m·v², a factor ½, v² for v, √(g·r), v² ÷ g, v ÷ (μ·g), μ·v² ÷ g, half the speed or the same speed on a wet road, a heavier truck taking the curve more slowly, and a safe answer that is not the limit.

- `verify-carousel.cjs`, `verify-station.cjs`, `verify-curve.cjs`: model checks (uniform rotation, exact laps, turns, curve entry and road exit inside long steps, timestep independence, the wider circle of a skid, mass cancelling, playback factors, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Gravitation games: Planet Scale, Satellite Launch, Kepler's Clock

The Gravitation topic (*gravitación*) comes last, after Circular motion, because orbits combine universal gravitation with the centripetal force. Every game applies F = G·M·m ÷ r² with r measured from the centre of the attracting body. As in Circular motion, a run counts as an attempt as soon as it starts.

| Language | Planet Scale | Satellite Launch | Kepler's Clock |
| --- | --- | --- | --- |
| English | `/games/gravitation/planet-scale/` | `/games/gravitation/satellite-launch/` | `/games/gravitation/kepler-clock/` |
| Español | `/es/juegos/gravitacion/bascula-planetaria/` | `/es/juegos/gravitacion/lanza-el-satelite/` | `/es/juegos/gravitacion/reloj-de-kepler/` |
| Français | `/fr/jeux/gravitation/balance-planetaire/` | `/fr/jeux/gravitation/lancement-de-satellite/` | `/fr/jeux/gravitation/horloge-de-kepler/` |
| Deutsch | `/de/spiele/gravitation/planetenwaage/` | `/de/spiele/gravitation/satellitenstart/` | `/de/spiele/gravitation/kepler-uhr/` |
| Nederlands | `/nl/spellen/gravitatie/planetenweegschaal/` | `/nl/spellen/gravitatie/satellietlancering/` | `/nl/spellen/gravitatie/keplerklok/` |
| Suomi | `/fi/pelit/gravitaatio/planeettavaaka/` | `/fi/pelit/gravitaatio/satelliitin-laukaisu/` | `/fi/pelit/gravitaatio/keplerin-kello/` |
| Norsk bokmål | `/nb/spill/gravitasjon/planetvekt/` | `/nb/spill/gravitasjon/satellittoppskyting/` | `/nb/spill/gravitasjon/kepler-klokke/` |
| Dansk | `/da/spil/gravitation/planetvaegt/` | `/da/spil/gravitation/satellitopsendelse/` | `/da/spil/gravitation/kepler-ur/` |
| Português | `/pt/jogos/gravitacao/balanca-planetaria/` | `/pt/jogos/gravitacao/lancamento-de-satelite/` | `/pt/jogos/gravitacao/relogio-de-kepler/` |
| हिन्दी | `/hi/khel/gurutvakarshan/grah-taraju/` | `/hi/khel/gurutvakarshan/upgrah-prakshepan/` | `/hi/khel/gurutvakarshan/kepler-ghadi/` |
| 日本語 | `/ja/gemu/banyu-inryoku/wakusei-no-hakari/` | `/ja/gemu/banyu-inryoku/jinko-eisei/` | `/ja/gemu/banyu-inryoku/kepler-dokei/` |

**Planet Scale**: surface gravity, g = G·M ÷ R², and weight against mass. On the Moon, Mars, and an imagined super-Earth (8 M⊕, 2 R⊕), a ball falls 2 m while a 70 kg astronaut stands on a scale. Missions ask for g on the Moon, the astronaut's weight on Mars, the astronaut's mass on Mars (still 70 kg), the fall time on the Moon, and g on the super-Earth. Slips recognized: R instead of R², R in km, Earth's g, mass given as weight, Earth's weight, g for W, dividing by Earth's g, weight given as mass, a shrunken mass, no square root or no 2 in the fall time, Earth's fall time, and scaling g by the mass or the radius only, or by R instead of R².

**Satellite Launch**: Newton's law of universal gravitation, F = G·M·m ÷ r², with r measured from Earth's centre. Missions ask for the pull on a satellite 400 km up, the pull at twice the distance (a quarter), the acceleration due to gravity 1000 km up, the launch speed for a circular orbit, v = √(G·M ÷ r), and the geostationary radius, r = ∛(G·M·T² ÷ 4π²). Force and gravity answers are checked against the measurement and plotted on an inverse-square graph drawn after the launch; a speed answer launches the satellite, which circles, crashes on an ellipse, flies out on a long ellipse, or escapes; a radius answer places a geostationary orbit over a city on the turning Earth. Paths are exact conics timed with Kepler's equation and drawn to scale. Slips recognized: the height instead of the distance from the centre (for F, g, v, and the geostationary radius), the surface value, r instead of r², kilometres in the formula, g for F, halving instead of quartering, the escape speed, and km/s for m/s.

**Kepler's Clock**: Kepler's third law, T² = 4π²·r³ ÷ (G·M), on circular orbits. Missions ask for the Moon's period, Europa's period from Io's (T² ∝ r³), Jupiter's mass from Io's orbit, Earth's year, and Mars's distance from its 687 d period. A period answer runs the clock; the marked body should return exactly to the start mark. A mass answer sets Jupiter and a distance answer places Mars. After each run, a graph of (T ÷ T₁)² against (r ÷ r₁)³ puts every body on one line. Slips recognized: no 2π, hours for days, a period scaled linearly, squared, or inversely with distance, no 4π², T in days or hours or r in km for the mass, and a distance scaled linearly, as a square, or as a square root of the period.

- `verify-planet.cjs`, `verify-orbit.cjs`, `verify-kepler.cjs`: model checks (inverse square law and unchanged mass, exact touchdowns, crashes, exits, orbits, and returns inside long steps, conserved energy and angular momentum, T² ÷ r³ shared by every body around one centre, the geostationary city, playback, slip detection, scoring, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Statics games: Hanging Sign, Seesaw, Plank Bridge

The Statics topic (*estática*) comes after Gravitation. Every game is about an object at rest: the forces cancel, ΣF = 0, and the moments cancel, ΣM = 0. Loads are applied slowly, so the system is in equilibrium at every moment; tensions, torques, and reactions stay hidden until a run starts, and a run counts as an attempt as soon as it starts. Failures (a cable snapping, a support cracking, a plank tipping) are solved exactly, and a value within 0.05% of a limit counts as holding, so a rounded right answer never fails. Force Table, in Vectors, joins the three in the force equilibrium collection.

| Language | Hanging Sign | Seesaw | Plank Bridge |
| --- | --- | --- | --- |
| English | `/games/statics/hanging-sign/` | `/games/statics/seesaw/` | `/games/statics/plank-bridge/` |
| Español | `/es/juegos/estatica/cartel-colgante/` | `/es/juegos/estatica/balancin/` | `/es/juegos/estatica/puente-de-tablon/` |
| Français | `/fr/jeux/statique/enseigne-suspendue/` | `/fr/jeux/statique/bascule/` | `/fr/jeux/statique/pont-de-planche/` |
| Deutsch | `/de/spiele/statik/haengeschild/` | `/de/spiele/statik/wippe/` | `/de/spiele/statik/brettbruecke/` |
| Nederlands | `/nl/spellen/statica/hangend-uithangbord/` | `/nl/spellen/statica/wip/` | `/nl/spellen/statica/plankbrug/` |
| Suomi | `/fi/pelit/statiikka/riippuva-kyltti/` | `/fi/pelit/statiikka/keinulauta/` | `/fi/pelit/statiikka/lankkusilta/` |
| Norsk bokmål | `/nb/spill/statikk/hengende-skilt/` | `/nb/spill/statikk/vippehuske/` | `/nb/spill/statikk/plankebro/` |
| Dansk | `/da/spil/statik/haengende-skilt/` | `/da/spil/statik/vippe/` | `/da/spil/statik/plankebro/` |
| Português | `/pt/jogos/estatica/placa-pendurada/` | `/pt/jogos/estatica/gangorra/` | `/pt/jogos/estatica/ponte-de-tabua/` |
| हिन्दी | `/hi/khel/sthitiki/latakta-board/` | `/hi/khel/sthitiki/see-saw/` | `/hi/khel/sthitiki/takhta-pul/` |
| 日本語 | `/ja/gemu/tsuriai/tsuri-kanban/` | `/ja/gemu/tsuriai/shiiso/` | `/ja/gemu/tsuriai/ita-no-hashi/` |

**Hanging Sign**: force equilibrium on a ring. A 20 kg sign hangs from one or two cables; the horizontal parts of the tensions cancel and the vertical parts carry the weight, T₁·cos θ₁ = T₂·cos θ₂ and T₁·sin θ₁ + T₂·sin θ₂ = W. Missions ask for the rating of one vertical cable (196 N), of two cables at 30° (196 N each), of two nearly flat cables at 10° (564.4 N), of the steeper cable when the two are at 30° and 60° (169.7 N), and for the shallowest angle 300 N cables allow (19.07°). A crane hands the weight to the cables over 2 s; a cable rated below its tension snaps exactly when the tension reaches the rating. A force triangle, W, T₁, and T₂ head to tail, closes as the forces cancel. Slips recognized: the mass in kg, half the weight on one cable, cos θ for sin θ, a missing factor 2, the whole weight, the other cable's tension, an even split between uneven cables, and a rating or angle that holds with room to spare.

**Seesaw**: torque, M = F·d, and rotational equilibrium, ΣM = 0. Missions ask where a 40 kg child must sit to balance a 30 kg child (1.5 m), what mass balances (30 kg), a third child (36.1 kg), a mass when the plank's own 10 kg acts 1 m from the pivot (12.5 kg), and the lift at a wheelbarrow's handles (147 N). Pivot friction holds the plank while the torques differ by at most 2%; otherwise it turns from rest until its lower end touches the ground. Bars compare the counter-clockwise and clockwise torques. Slips recognized: an inverted ratio, equal distances or equal masses, adding masses instead of torques, a missing child, forgetting the plank or putting it on the wrong side, and lifting the whole load, an inverted lever, or half the load.

**Plank Bridge**: support reactions from ΣF = 0 and ΣM = 0, R_B = (W·x + w·x_c) ÷ L and R_A = W + w − R_B. Missions ask for the rating support A needs under a crate in the middle (400 N), off centre (600 N), and on a 200 N plank (700 N), how far a 1200 N truck can drive before support B cracks (4.25 m), and how far past B a 600 N walker can go before the plank tips (0.5 m). A support cracks exactly at its rating; the plank tips over B exactly when R_A reaches zero. Bars show R_A and R_B against the ratings. Slips recognized: the whole load on one support, an even split for an off-centre load, the other support's share, forgetting the plank or putting all of it on A, ignoring the plank under the truck, driving to the end, an inverted lever or distances from the plank's end at the overhang, and a rating or stop with room to spare.

- `verify-sign.cjs`, `verify-seesaw.cjs`, `verify-bridge.cjs`: model checks (ΣF = 0 on the ring, ΣM = 0 about the pivot and the supports, exact snaps, tipping, cracking, and touchdown inside long steps, timestep independence, friction and rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Torque and rotation games: Stuck Bolt, Forklift, Flywheel Race

The Torque and rotation topic (*momento y rotación*) comes after Statics. Seesaw introduces torque as weight × distance; these three games take it further: the lever arm of a slanted push, moments about the edge a vehicle tips over, and torque as the cause of angular acceleration, τ = I·α. Answers are typed, and a run counts as an attempt as soon as it starts; readings that are, or give away, the answer (torque, lever arm, moments, reactions, α, I) stay hidden until a run starts.

| Language | Stuck Bolt | Forklift | Flywheel Race |
| --- | --- | --- | --- |
| English | `/games/torque-and-rotation/stuck-bolt/` | `/games/torque-and-rotation/forklift/` | `/games/torque-and-rotation/flywheel-race/` |
| Español | `/es/juegos/momento-y-rotacion/perno-atascado/` | `/es/juegos/momento-y-rotacion/carretilla-elevadora/` | `/es/juegos/momento-y-rotacion/carrera-de-volantes/` |
| Français | `/fr/jeux/moment-et-rotation/boulon-grippe/` | `/fr/jeux/moment-et-rotation/chariot-elevateur/` | `/fr/jeux/moment-et-rotation/course-de-volants/` |
| Deutsch | `/de/spiele/drehmoment-und-rotation/festgerostete-schraube/` | `/de/spiele/drehmoment-und-rotation/gabelstapler/` | `/de/spiele/drehmoment-und-rotation/schwungrad-rennen/` |
| Nederlands | `/nl/spellen/moment-en-rotatie/vastgeroeste-bout/` | `/nl/spellen/moment-en-rotatie/heftruck/` | `/nl/spellen/moment-en-rotatie/vliegwielrace/` |
| Suomi | `/fi/pelit/momentti-ja-pyoriminen/jumittunut-pultti/` | `/fi/pelit/momentti-ja-pyoriminen/trukki/` | `/fi/pelit/momentti-ja-pyoriminen/vauhtipyorakisa/` |
| Norsk bokmål | `/nb/spill/dreiemoment-og-rotasjon/fastrustet-bolt/` | `/nb/spill/dreiemoment-og-rotasjon/gaffeltruck/` | `/nb/spill/dreiemoment-og-rotasjon/svinghjulslop/` |
| Dansk | `/da/spil/kraftmoment-og-rotation/fastrustet-bolt/` | `/da/spil/kraftmoment-og-rotation/gaffeltruck/` | `/da/spil/kraftmoment-og-rotation/svinghjulslob/` |
| Português | `/pt/jogos/torque-e-rotacao/parafuso-emperrado/` | `/pt/jogos/torque-e-rotacao/empilhadeira/` | `/pt/jogos/torque-e-rotacao/corrida-de-volantes/` |
| हिन्दी | `/hi/khel/bal-aghurn-aur-ghurnan/jaam-bolt/` | `/hi/khel/bal-aghurn-aur-ghurnan/forklift/` | `/hi/khel/bal-aghurn-aur-ghurnan/flywheel-daud/` |
| 日本語 | `/ja/gemu/moment-to-kaiten/kochaku-boruto/` | `/ja/gemu/moment-to-kaiten/forkurifuto/` | `/ja/gemu/moment-to-kaiten/hazumi-guruma-kyoso/` |

**Stuck Bolt**: torque from a push at a distance and an angle, τ = F·r·sin φ = F·d, with the lever arm d = r·sin φ drawn from the bolt to the line of the push. Missions ask for a square-on push (200 N), a push at 30° to the handle (400 N), the length of a cheater bar (0.8 m), the shallowest push a wall allows (30°), and the push per hand on a cross wrench, whose two torques add (220 N). The push grows steadily over 2 s; the bolt breaks loose exactly when the torque reaches the need, then turns a quarter turn in 1 s. An answer must break the bolt loose and be at most 2% above the least that does. Slips recognized: multiplying instead of dividing by the arm, the torque taken as the force, ignoring the angle, cos for sin, multiplying by sin φ, an inverted ratio, the pipe's overhang alone, a square-on push where a shallower one works, one hand doing all the work, and a push with room to spare.

**Forklift**: moments about the front wheels, the edge the truck tips over. A 3000 kg truck has its centre of mass 0.8 m behind the front wheels and its rear wheels 1.6 m behind them; R_r·1.6 = M·g·0.8 + m_c·g·1.5 − m·g·x. Missions ask for the heaviest pallet 1.2 m out (2000 kg), how far out a 1500 kg crate can sit (1.6 m), the least counterweight 1.5 m back for 2500 kg at 1.2 m (400 kg), the rear wheels' push under 1200 kg at 1 m (7350 N), and a capacity plate read at a closer load centre (3000 kg). The forks take the load over 2 s; the truck tips exactly when R_r falls to zero, and the tipping is then drawn over 0.8 s as an illustration. Slips recognized: masses balanced instead of moments, an inverted ratio, a moment taken as a mass, equal arms, the truck's own moment forgotten, the load's arm used for the counterweight, a multiplied arm, the empty-forks reaction, adding the load's moment, subtracting weights, the plate's mass at any distance, and a limit with room to spare.

**Flywheel Race**: Newton's second law for rotation, τ_net = I·α. A cord wound on a spool pulls with a constant force, τ = F·r; bearing friction is a constant torque against the motion, and a wheel at rest stays at rest while τ ≤ τ_f. Missions ask for the spin-up time to 12 rad/s (3 s), the pull that matches a pace wheel (25 N), where two 1 kg masses sit on the spokes so I = I₀ + 2·m·x² (0.3 m), the pull that beats 0.3 N·m of friction (11 N), and the pull that holds a steady 10 rad/s against friction (3 N, zero net torque). ω = ω₀ + α·t is exact, the target speed is reached exactly at t = (ω − ω₀) ÷ α, and a run ends there or after twice the pace time. A pace wheel spins up exactly on time beside the learner's wheel, and an ω–t graph is drawn as the wheels run. Answers are right within 2%. Slips recognized: the force taken as the torque (or the reverse), forgetting the inertia, an inverted ratio, skipping the time, a multiplied radius, forgetting the hub, one mass instead of two, distance not squared, ignoring friction or subtracting it, and no pull at all for a steady speed.

- `verify-bolt.cjs`, `verify-forklift.cjs`, `verify-flywheel.cjs`: model checks (τ = F·r·sin φ and the couple, moments about the tipping edge and the rear-wheel reaction, τ_net = I·α with masses on the spokes and friction, exact breaking, tipping, arrival, and stopping inside long steps, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Lever games: Lever Lab, Force for Distance

Two more Torque and rotation games are about levers (*palancas*). Seesaw and Stuck Bolt already use the law of the lever; these two cover all three classes of lever and what a lever trades. Answers are typed, and a run counts as an attempt as soon as it starts; readings that give the answer away (moments, mechanical advantage, distances moved, work) stay hidden until a run starts.

| Language | Lever Lab | Force for Distance |
| --- | --- | --- |
| English | `/games/torque-and-rotation/lever-lab/` | `/games/torque-and-rotation/force-for-distance/` |
| Español | `/es/juegos/momento-y-rotacion/laboratorio-de-palancas/` | `/es/juegos/momento-y-rotacion/fuerza-por-distancia/` |
| Français | `/fr/jeux/moment-et-rotation/labo-des-leviers/` | `/fr/jeux/moment-et-rotation/force-contre-distance/` |
| Deutsch | `/de/spiele/drehmoment-und-rotation/hebel-labor/` | `/de/spiele/drehmoment-und-rotation/kraft-gegen-weg/` |
| Nederlands | `/nl/spellen/moment-en-rotatie/hefboomlab/` | `/nl/spellen/moment-en-rotatie/kracht-tegen-afstand/` |
| Suomi | `/fi/pelit/momentti-ja-pyoriminen/vipulaboratorio/` | `/fi/pelit/momentti-ja-pyoriminen/voima-vai-matka/` |
| Norsk bokmål | `/nb/spill/dreiemoment-og-rotasjon/vektstanglab/` | `/nb/spill/dreiemoment-og-rotasjon/kraft-mot-strekning/` |
| Dansk | `/da/spil/kraftmoment-og-rotation/vaegtstangslab/` | `/da/spil/kraftmoment-og-rotation/kraft-mod-straekning/` |
| Português | `/pt/jogos/torque-e-rotacao/laboratorio-de-alavancas/` | `/pt/jogos/torque-e-rotacao/forca-por-distancia/` |
| हिन्दी | `/hi/khel/bal-aghurn-aur-ghurnan/uttolak-prayogshala/` | `/hi/khel/bal-aghurn-aur-ghurnan/bal-aur-doori/` |
| 日本語 | `/ja/gemu/moment-to-kaiten/teko-no-jikkenshitsu/` | `/ja/gemu/moment-to-kaiten/chikara-to-kyori/` |

**Lever Lab**: the law of the lever, F·d_e = W·d_l, in class 1, 2, and 3 levers, with mechanical advantage MA = d_e ÷ d_l. Missions ask for the push on a crowbar (200 N), the squeeze on a nutcracker (40 N), the biceps pull that holds a 49 N dumbbell in the hand (428.75 N, a class 3 lever with MA below 1), where to put the fulcrum under a 1.5 m bar so 300 N lifts 1200 N (d_l = 0.3 m), and how long an effort arm 400 N needs to lift 2400 N at 0.25 m (1.5 m). The effort grows steadily over 2 s; the load lifts exactly when F·d_e reaches W·d_l (within 0.05%, so a rounded answer still lifts) and then rises through 8° in 1 s, while a load that stays down is watched for 1 s. An answer must lift the load with at most 2% to spare. A moment gauge compares F·d_e with W·d_l once a run starts. Slips recognized: the full load as the effort, an inverted ratio (in class 1 or class 3), the arm measured between the load and the hand, the fulcrum in the middle, an inverted fulcrum split, the whole bar as the arm, and an answer with room to spare.

**Force for Distance**: what a lever trades. Both ends turn through the same angle, so each moves d·sin θ and s_l ÷ s_e = d_l ÷ d_e at every moment; for a slow, frictionless lever the work in, F·s_e, equals the work out, W·s_l. Missions ask for how far your hand pushes a crowbar to raise a rock 4 cm (0.2 m), the work done lifting 600 N by 5 cm (30 J, with 200 N through 0.15 m on the effort side), how fast the hand rises when the biceps shortens at 1 cm/s (0.0875 m/s), how far a fishing rod's tip rises (1.6 m), and the push that raises 900 N by 0.1 m when the hand moves 0.6 m (150 N). One point is moved steadily for 2 s and the run ends exactly at 2 s. Bars compare the two distances, or the work in and out, once the lever moves. Answers are right within 2%. Slips recognized: an inverted ratio, the same distance on both ends (or the same speed), one side's force with the other side's distance, the load's force taken as the work, the full load as the push, and the work not divided by the distance.

- `verify-lever.cjs`, `verify-tradeoff.cjs`: model checks (the law of the lever in all three classes, mechanical advantage, s_l ÷ s_e = d_l ÷ d_e and work in = work out at every moment, exact lifting and run ends inside long steps, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Centre of mass games: Balance Point, Hanging Mobile, Block Tower

The Centre of mass topic (*centro de masa*) comes after Torque and rotation. All three games use one rule: an object stays put while its centre of mass, x_cm = Σm·x ÷ Σm, is over its support. Answers are typed and a run counts as an attempt as soon as it starts; the centre of mass, Σm·x, and the edge checks stay hidden until a run starts.

| Language | Balance Point | Hanging Mobile | Block Tower |
| --- | --- | --- | --- |
| English | `/games/centre-of-mass/balance-point/` | `/games/centre-of-mass/hanging-mobile/` | `/games/centre-of-mass/block-tower/` |
| Español | `/es/juegos/centro-de-masa/punto-de-equilibrio/` | `/es/juegos/centro-de-masa/movil-colgante/` | `/es/juegos/centro-de-masa/torre-de-bloques/` |
| Français | `/fr/jeux/centre-de-masse/point-d-equilibre/` | `/fr/jeux/centre-de-masse/mobile-suspendu/` | `/fr/jeux/centre-de-masse/tour-de-blocs/` |
| Deutsch | `/de/spiele/schwerpunkt/gleichgewichtspunkt/` | `/de/spiele/schwerpunkt/haengendes-mobile/` | `/de/spiele/schwerpunkt/klotzturm/` |
| Nederlands | `/nl/spellen/massamiddelpunt/evenwichtspunt/` | `/nl/spellen/massamiddelpunt/hangend-mobiel/` | `/nl/spellen/massamiddelpunt/blokkentoren/` |
| Suomi | `/fi/pelit/massakeskipiste/tasapainopiste/` | `/fi/pelit/massakeskipiste/riippuva-mobile/` | `/fi/pelit/massakeskipiste/palikkatorni/` |
| Norsk bokmål | `/nb/spill/massesenter/balansepunkt/` | `/nb/spill/massesenter/hengende-uro/` | `/nb/spill/massesenter/klosstarn/` |
| Dansk | `/da/spil/massemidtpunkt/balancepunkt/` | `/da/spil/massemidtpunkt/haengende-uro/` | `/da/spil/massemidtpunkt/klodstaarn/` |
| Português | `/pt/jogos/centro-de-massa/ponto-de-equilibrio/` | `/pt/jogos/centro-de-massa/mobile-suspenso/` | `/pt/jogos/centro-de-massa/torre-de-blocos/` |
| हिन्दी | `/hi/khel/dravyaman-kendra/santulan-bindu/` | `/hi/khel/dravyaman-kendra/latakta-mobile/` | `/hi/khel/dravyaman-kendra/block-minar/` |
| 日本語 | `/ja/gemu/juushin/tsuriai-no-ten/` | `/ja/gemu/juushin/tsurusu-mobiru/` | `/ja/gemu/juushin/tsumiki-no-to/` |

**Balance Point**: the centre of mass of masses on a 2 m beam, measured from its left end. Missions ask where the support goes under 3 kg and 1 kg at the ends (0.5 m), under three masses (0.95 m), and under a 2 kg beam carrying 4 kg (0.5 m, the beam counted at its middle), where to place 1 kg to balance on a fixed support (1.6 m), and what mass at the end balances a 2 kg beam (2 kg). The support's flat top is 2 cm wide, so the beam stays level while x_cm is within 1 cm of it; otherwise it tips over the nearer edge until its end touches the table, found exactly. Right means the beam stays level. Slips recognized: the middle of the beam, an inverted ratio, averaging positions, the heaviest mass, forgetting the beam, and mirroring a distance.

**Hanging Mobile**: composite objects, worked from the bottom up. A balanced lower mobile acts as one mass, its total, at the point it hangs from. Missions ask where to tie the string on a rod with two ornaments (0.15 m), three ornaments (0.3 m), a rod carrying a two-ornament mobile (0.48 m), what ornament balances a rod tied off-centre (100 g), and where to tie a rod carrying a two-level mobile (0.75 m). The knot holds the top rod level while x_cm is within 0.5 cm of it; otherwise the rod turns about the knot until it has tilted 20°, found exactly. Slips recognized: the middle, an inverted ratio, a missing ornament, part of the lower mobile counted, equal masses, and an inverted mass ratio.

**Block Tower**: toppling. Uniform 0.4 m blocks stack out past a table's edge; at every level, the centre of mass of everything above must lie over the edge below. Missions ask how far one block can stick out (0.2 m), the bottom of two blocks (0.1 m), the bottom of three blocks on the harmonic L/2, L/4 shifts (L/6), the least counterweight on the back end of a block 0.25 m out (0.667 kg), and the bottom of a light block under a heavy one (0.05 m). The part above the lowest failing edge turns about it until it has turned 30°, found exactly; within 0.2 mm counts as over the edge. An overhang is right when it holds and is at most 2% short of the limit; a counterweight when it holds with at most 2% to spare. A list on the canvas checks every edge once a run starts. Slips recognized: the whole block out, a quarter, ignoring the top block, the top block's reach, repeating or halving the shift, equal or inverted masses, and equal blocks.

- `verify-beam.cjs`, `verify-mobile.cjs`, `verify-stack.cjs`: model checks (x_cm = Σm·x ÷ Σm with the beam's own mass, lower mobiles as single masses, the centre of mass over every edge and the harmonic overhang, exact tipping, tilting, and toppling inside long steps, timestep independence, support, knot, and edge margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Fluids games: Density Detective, Barge Load, Deep Dive

The Fluids topic (*fluidos*) comes after Centre of mass. Density comes first, because floating and pressure both build on it: ρ = m ÷ V, buoyancy F_b = ρ·g·V (Archimedes' principle), and pressure in a still liquid p = p₀ + ρ·g·h. Answers are typed, and a run counts as an attempt as soon as it starts; readings that give the answer away (the level, the water pushed aside, the draft, the buoyancy, the pressure) stay hidden until a run starts.

| Language | Density Detective | Barge Load | Deep Dive |
| --- | --- | --- | --- |
| English | `/games/fluids/density-detective/` | `/games/fluids/barge-load/` | `/games/fluids/deep-dive/` |
| Español | `/es/juegos/fluidos/detective-de-la-densidad/` | `/es/juegos/fluidos/carga-de-la-barcaza/` | `/es/juegos/fluidos/inmersion-profunda/` |
| Français | `/fr/jeux/fluides/detective-masse-volumique/` | `/fr/jeux/fluides/chargement-de-la-peniche/` | `/fr/jeux/fluides/plongee-profonde/` |
| Deutsch | `/de/spiele/fluessigkeiten/dichte-detektiv/` | `/de/spiele/fluessigkeiten/lastkahn-beladen/` | `/de/spiele/fluessigkeiten/tieftauchgang/` |
| Nederlands | `/nl/spellen/vloeistoffen/dichtheidsdetective/` | `/nl/spellen/vloeistoffen/duwbak-laden/` | `/nl/spellen/vloeistoffen/diepe-duik/` |
| Suomi | `/fi/pelit/nesteet/tiheysetsiva/` | `/fi/pelit/nesteet/proomun-lastaus/` | `/fi/pelit/nesteet/syvasukellus/` |
| Norsk bokmål | `/nb/spill/vaesker/tetthetsdetektiv/` | `/nb/spill/vaesker/lekterlasting/` | `/nb/spill/vaesker/dypdykk/` |
| Dansk | `/da/spil/vaesker/densitetsdetektiv/` | `/da/spil/vaesker/pramlastning/` | `/da/spil/vaesker/dybdedyk/` |
| Português | `/pt/jogos/fluidos/detetive-da-densidade/` | `/pt/jogos/fluidos/carga-da-barcaca/` | `/pt/jogos/fluidos/mergulho-profundo/` |
| हिन्दी | `/hi/khel/taral/ghanatva-jasoos/` | `/hi/khel/taral/bajra-ladai/` | `/hi/khel/taral/gehra-gota/` |
| 日本語 | `/ja/gemu/ryutai/mitsudo-tantei/` | `/ja/gemu/ryutai/hashike-no-tsumini/` | `/ja/gemu/ryutai/shinkai-daibu/` |

**Density Detective**: density from mass and the water an object pushes aside. Objects hang on a thread and are lowered steadily into a measuring cylinder for 2 s; while a box goes in, its depth below the raised surface is s = (L₀ − y)·A ÷ (A − a), and once under it pushes aside its own volume, 1 mL = 1 cm³. Missions ask for the reading after a 540 g aluminium block goes into 300 mL (500 mL), the density of a 965 g "gold" crown that raises the water from 400 to 460 mL (16.1 g/cm³, not pure gold), the mass of a 2.6 g/cm³ stone that raises it from 350 to 425 mL (195 g), where a 1.2 g/cm³ bead stops in a column of honey, water, and oil (on the honey, 5 cm up), and how far a 1 kg gold bar raises the water in a 20 cm² cylinder (2.59 cm). Bars compare the object's density with the liquids' once a run starts. Answers are right within 2%. Slips recognized: the rise taken as the reading, grams taken as millilitres, an inverted formula, the whole level instead of the rise, assuming the crown is gold, the volume taken as the mass, a bead that floats on top, sinks to the bottom, or stops on the water, and the volume instead of the rise.

**Barge Load**: Archimedes' principle. A box with a flat bottom of area A floats at the draft d = M ÷ (ρ·A), and the buoyancy equals its weight at every moment; the load comes onto the water steadily for 2 s. Missions ask for an empty 24 t barge's draft (0.4 m), the most cargo before the water reaches the 1.5 m deck (66 t; more floods it at the exact moment, and the sinking is drawn for 1 s), the draft in a river after 0.82 m in the sea (0.84 m), the share of an ice block under seawater (89.5%), and a steel boat's average density (250 kg/m³). Draft marks run up the hull, the predicted waterline is drawn on it, and bars compare the weight with the buoyancy. A cargo is right if the barge floats with at most 2% to spare; every other answer within 2%. Slips recognized: an inverted ratio, the volume taken as the depth, forgetting the barge's own mass, a cargo with room to spare, the same draft in fresh water or a higher one, the part above the water, fresh water for seawater, solid steel's density, the density of water, and volume per mass.

**Deep Dive**: pressure in a still liquid, p = p₀ + ρ·g·h with p₀ = 101 kPa. The submarine (or a diver) goes down steadily for 2 s; if the pressure reaches the hull's 1200 kPa first, the alarm stops the dive at exactly that depth. Missions ask for the gauge at 30 m in the sea (402 kPa), the deepest safe dive in the sea (109 m) and in a freshwater lake (112 m), the net force on a 0.5 m² window at 50 m with air inside (251 kN), and the pressure rise from 10 m to 25 m (151 kPa). A gauge marks the hull limit, and a graph plots pressure against depth once a run starts. A dive depth is right if it is safe with at most 2% to spare; every other answer within 2%. Slips recognized: forgetting the air, forgetting g, a dive with room to spare, the seawater answer for a lake, counting the air on a window, a pressure instead of a force, the whole depth instead of the change, and the total pressure instead of the rise.

- `verify-density.cjs`, `verify-barge.cjs`, `verify-dive.cjs`: model checks (ρ = m ÷ V and the level as a box goes in, the bead's resting layer, ρ·A·d = M and buoyancy equal to weight, the exact flooding moment, p = p₀ + ρ·g·h and the exact alarm, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Air pressure games: Torricelli's Tube, Magdeburg Hemispheres

Two more Fluids games are about the air's own pressure (*presión atmosférica*), about 101.3 kPa at sea level. Deep Dive uses it on the water's surface; these two make it the subject. Answers are typed and a run counts as an attempt as soon as it starts; the column, its pressure, the pull, and the air's hold stay hidden until a run starts.

| Language | Torricelli's Tube | Magdeburg Hemispheres |
| --- | --- | --- |
| English | `/games/fluids/torricellis-tube/` | `/games/fluids/magdeburg-hemispheres/` |
| Español | `/es/juegos/fluidos/tubo-de-torricelli/` | `/es/juegos/fluidos/hemisferios-de-magdeburgo/` |
| Français | `/fr/jeux/fluides/tube-de-torricelli/` | `/fr/jeux/fluides/hemispheres-de-magdebourg/` |
| Deutsch | `/de/spiele/fluessigkeiten/torricelli-rohr/` | `/de/spiele/fluessigkeiten/magdeburger-halbkugeln/` |
| Nederlands | `/nl/spellen/vloeistoffen/buis-van-torricelli/` | `/nl/spellen/vloeistoffen/maagdenburger-halve-bollen/` |
| Suomi | `/fi/pelit/nesteet/torricellin-putki/` | `/fi/pelit/nesteet/magdeburgin-pallonpuoliskot/` |
| Norsk bokmål | `/nb/spill/vaesker/torricellis-ror/` | `/nb/spill/vaesker/magdeburg-halvkulene/` |
| Dansk | `/da/spil/vaesker/torricellis-roer/` | `/da/spil/vaesker/magdeburgske-halvkugler/` |
| Português | `/pt/jogos/fluidos/tubo-de-torricelli/` | `/pt/jogos/fluidos/hemisferios-de-magdeburgo/` |
| हिन्दी | `/hi/khel/taral/torricelli-nali/` | `/hi/khel/taral/magdeburg-ardhgole/` |
| 日本語 | `/ja/gemu/ryutai/torichieri-no-kan/` | `/ja/gemu/ryutai/magudeburuku-no-hankyu/` |

**Torricelli's Tube**: a liquid column held up by the air, ρ·g·h = p, with a vacuum above it. A full tube turned over in a dish falls steadily for 2 s to its balance height. Missions ask for the mercury column at sea level (760 mm), Pascal's water barometer (10.3 m), the air pressure on a mountain where mercury stands 600 mm (80 kPa), the highest a suction pump can sit above a well where the air presses 80 kPa (8.16 m; the pump empties its pipe over 2 s and the water stops where the outside air can push it no higher), and the density of a liquid whose column stands 8.2 m (1261 kg/m³, glycerine). Bars compare the air's pressure with the column's. A pump height is right if the water reaches it with at most 2% to spare; every other answer within 2%. Slips recognized: a water column for mercury (or the reverse), metres for millimetres (or the reverse), forgetting g, sea-level air on a mountain, the sea-level pump limit, a pump with room to spare, and water's density.

**Magdeburg Hemispheres**: the force of air pressure, F = (p_out − p_in)·π·r², on the flat circle where two halves meet. The pull (or a suction cup's load) grows steadily for 2 s; the halves part, or the cup lets go, at the exact moment it reaches the air's hold. Missions ask for the pull that parts 0.25 m hemispheres pumped down to 21.3 kPa (15.7 kN), how many 1.5 kN horses each team needs (11; one team and a tree would do), the pull with half the air out (9.9 kN), the pull on a mountain at 70 kPa (11.8 kN), and the heaviest load a 4 cm suction cup holds (25.6 kg). A pull is right if it parts the halves with at most 2% to spare, a team if it is the fewest horses that do it, and a load if the cup holds it with at most 2% to spare. Slips recognized: the full outside pressure, forgetting the air inside, sea-level air on a mountain, the curved surface or four times the area, a pull with room to spare, teams sharing the force, doubling the teams, rounding down, extra horses, newtons for kilograms, the diameter, and a load with room to spare.

- `verify-barometer.cjs`, `verify-hemispheres.cjs`: model checks (ρ·g·h = p and the falling column, the pump's limit, F = Δp·π·r² and the exact parting and letting-go, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Archimedes games: Weighed Under Water, Balloon Lift

Two more Fluids games are about Archimedes' principle (*principio de Arquímedes*): a fluid pushes up on anything in it with the weight of the fluid it pushes aside, in liquids and in air alike. Answers are typed and a run counts as an attempt as soon as it starts; readings, forces, volumes, and densities stay hidden until a run starts.

| Language | Weighed Under Water | Balloon Lift |
| --- | --- | --- |
| English | `/games/fluids/weighed-under-water/` | `/games/fluids/balloon-lift/` |
| Español | `/es/juegos/fluidos/pesar-bajo-el-agua/` | `/es/juegos/fluidos/globos-que-suben/` |
| Français | `/fr/jeux/fluides/peser-sous-l-eau/` | `/fr/jeux/fluides/ballons-qui-montent/` |
| Deutsch | `/de/spiele/fluessigkeiten/unter-wasser-wiegen/` | `/de/spiele/fluessigkeiten/ballonauftrieb/` |
| Nederlands | `/nl/spellen/vloeistoffen/wegen-onder-water/` | `/nl/spellen/vloeistoffen/ballonnen-die-stijgen/` |
| Suomi | `/fi/pelit/nesteet/punnitus-veden-alla/` | `/fi/pelit/nesteet/ilmapallon-noste/` |
| Norsk bokmål | `/nb/spill/vaesker/veiing-under-vann/` | `/nb/spill/vaesker/ballongloft/` |
| Dansk | `/da/spil/vaesker/vejning-under-vand/` | `/da/spil/vaesker/ballonloft/` |
| Português | `/pt/jogos/fluidos/pesar-debaixo-d-agua/` | `/pt/jogos/fluidos/baloes-que-sobem/` |
| हिन्दी | `/hi/khel/taral/pani-mein-taul/` | `/hi/khel/taral/gubbare-ki-udaan/` |
| 日本語 | `/ja/gemu/ryutai/suichu-de-hakaru/` | `/ja/gemu/ryutai/fusen-no-furyoku/` |

**Weighed Under Water**: an object hangs from a spring scale and is lowered steadily for 2 s into a can filled to its spout; the part under the liquid, V, pushes the same volume into a cup, the liquid pushes up with F_b = ρ·g·V, and the scale reads R = W − F_b. Missions ask for the reading of a 2 kg, 800 cm³ stone under water (11.76 N), the volume of a stone that reads 29.4 N in air and 24.5 N in water (500 cm³), the density of a block that reads 27 N and 17 N (2700 kg/m³), the reading in oil of 800 kg/m³ of a block that reads 10 N and 6 N (6.8 N), and how deep a 1.5 kg, 50 cm² cylinder must go for the scale to read 12.25 N (5 cm). Answers within 2% are right. Slips caught: leaving out g, giving the push instead of the reading, adding the push, answering in kg, using a reading instead of the loss, the reading in water, the inverted density ratio, the wrong liquid, and wrong units.

**Balloon Lift**: the lift is (ρ_air − ρ_in)·g·V and the balloon lifts off at the exact moment it reaches the weight of everything it carries; party balloons and a helium envelope fill steadily for 2 s, and a hot-air balloon's burner heats its air steadily for 2 s with ρ·T constant in kelvin. Missions ask for the fewest 10 L helium balloons (3 g of rubber each) that lift a 30 g toy (5), the heaviest load for a 2500 m³, 400 kg balloon at 0.95 kg/m³ inside (225 kg), the inside temperature that lifts 400 + 350 kg (≈ 118 °C), the heaviest load from a plateau where air is 1.0 kg/m³ (125 kg), and the helium that lifts 80 kg (78.4 m³). The count must be the fewest that fly; a load, temperature, or volume must lift off with at most 2% to spare. Slips caught: rounding down, forgetting the rubber, the balloon, or the gas's own weight, sea-level air on the plateau, kelvin instead of °C, °C in the gas law, dividing by helium's density, and answers with room to spare.

- `verify-weigh.cjs`, `verify-balloon.cjs`: model checks (the push equal to the weight of the liquid under, the reading as weight minus push, the depth limit, lift against weight, the exact lift-off moment, ρ·T constant in kelvin, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Pascal's principle games: Hydraulic Lift, Pascal's Barrel

Two more Fluids games are about Pascal's principle (*principio de Pascal*): squeeze a closed liquid and the extra pressure reaches every part of it equally. Answers are typed and a run counts as an attempt as soon as it starts; the push, the pressure, the forces, and the heights stay hidden until a run starts.

| Language | Hydraulic Lift | Pascal's Barrel |
| --- | --- | --- |
| English | `/games/fluids/hydraulic-lift/` | `/games/fluids/pascals-barrel/` |
| Español | `/es/juegos/fluidos/elevador-hidraulico/` | `/es/juegos/fluidos/tonel-de-pascal/` |
| Français | `/fr/jeux/fluides/elevateur-hydraulique/` | `/fr/jeux/fluides/tonneau-de-pascal/` |
| Deutsch | `/de/spiele/fluessigkeiten/hydraulische-hebebuehne/` | `/de/spiele/fluessigkeiten/pascals-fass/` |
| Nederlands | `/nl/spellen/vloeistoffen/hydraulische-lift/` | `/nl/spellen/vloeistoffen/vat-van-pascal/` |
| Suomi | `/fi/pelit/nesteet/hydraulinen-nostin/` | `/fi/pelit/nesteet/pascalin-tynnyri/` |
| Norsk bokmål | `/nb/spill/vaesker/hydraulisk-lift/` | `/nb/spill/vaesker/pascals-tonne/` |
| Dansk | `/da/spil/vaesker/hydraulisk-lift/` | `/da/spil/vaesker/pascals-tonde/` |
| Português | `/pt/jogos/fluidos/elevador-hidraulico/` | `/pt/jogos/fluidos/barril-de-pascal/` |
| हिन्दी | `/hi/khel/taral/hydraulic-lift/` | `/hi/khel/taral/pascal-ka-pipa/` |
| 日本語 | `/ja/gemu/ryutai/yuatsu-rifuto/` | `/ja/gemu/ryutai/pasukaru-no-taru/` |

**Hydraulic Lift**: F₁ ÷ A₁ = F₂ ÷ A₂, and since oil doesn't compress, A₁·d₁ = A₂·d₂. A push that grows steadily for 2 s lifts the load at the exact moment p·A₂ reaches its weight; the small piston then travels 30 cm. Missions ask for the push that lifts a 1200 kg car on pistons of 10 cm² and 1000 cm² (117.6 N), the large piston a 50 N push on 5 cm² needs for 500 kg (490 cm²), the push with pistons 2 cm and 20 cm across (147 N, diameters squared), how far the small piston goes to raise a load 2 cm (80 cm), and the fewest 10 cm strokes of a jack that raise a car 3 cm (8). Bars compare the lift with the weight, or the oil pushed in with the oil under the load. A push or a piston is right if it lifts the load with at most 2% to spare, a stroke within 2%, and a number of strokes if it is the fewest that do the job. Slips recognized: an inverted ratio, the whole weight, forgetting g, diameters not squared, room to spare, the area ratio alone, the same distance on both pistons, rounding down, and extra strokes.

**Pascal's Barrel**: water h up a thin tube on a sealed, full barrel adds Δp = ρ·g·h under the lid, and that pressure reaches every wall; the bottom, H deeper, feels ρ·g·(h + H). Water is poured steadily for 2 s, and a lid pops at the exact moment ρ·g·h·A_lid reaches its strength. Missions ask for the height that pops a 0.5 m², 20 kN lid with a 1 cm² tube (4.08 m) and with a 10 cm² tube (the same 4.08 m), the force on the lid with 6 m of water (29.4 kN), the force on the bottom with 4 m (24.5 kN), and the extra force on a 50 cm² bottle bottom when a 2 cm² cork is pushed with 20 N (500 N). Arrows show the extra pressure pushing out on every wall, and bars compare the tiny force that goes in with the large force out. A height is right if it pops the lid with at most 2% to spare; a force within 2%. Slips recognized: thinking the tube's width matters, the tube's area for the lid's, forgetting g, water to spare, counting the barrel's depth on the lid, leaving the tube or the barrel out of the bottom's pressure, a force passed on unchanged, and an inverted ratio.

- `verify-hydraulic.cjs`, `verify-barrel.cjs`: model checks (equal pressure on both pistons and equal oil volumes, the exact lifting and popping moments, pressure reaching the lid and the bottom, strokes and jack pumps, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Fluids in motion games: Leaky Tank, Venturi Pipe, Storm and Wing

A new topic, Fluids in motion (*fluidos en movimiento*), is about Bernoulli's principle: along a flow, pressure, motion, and height trade with one another, p + ½·ρ·v² + ρ·g·h = constant, and a fluid that doesn't compress passes the same volume through every section, A·v = constant. Answers are typed and a run counts as an attempt as soon as it starts; speeds, pressures, forces, and distances stay hidden until a run starts.

| Language | Leaky Tank | Venturi Pipe | Storm and Wing |
| --- | --- | --- | --- |
| English | `/games/fluids-in-motion/leaky-tank/` | `/games/fluids-in-motion/venturi-pipe/` | `/games/fluids-in-motion/storm-and-wing/` |
| Español | `/es/juegos/fluidos-en-movimiento/tanque-agujereado/` | `/es/juegos/fluidos-en-movimiento/tubo-de-venturi/` | `/es/juegos/fluidos-en-movimiento/tormenta-y-ala/` |
| Français | `/fr/jeux/fluides-en-mouvement/reservoir-perce/` | `/fr/jeux/fluides-en-mouvement/tube-de-venturi/` | `/fr/jeux/fluides-en-mouvement/tempete-et-aile/` |
| Deutsch | `/de/spiele/stroemungen/tank-mit-loch/` | `/de/spiele/stroemungen/venturi-rohr/` | `/de/spiele/stroemungen/sturm-und-fluegel/` |
| Nederlands | `/nl/spellen/stromingen/lekke-tank/` | `/nl/spellen/stromingen/venturibuis/` | `/nl/spellen/stromingen/storm-en-vleugel/` |
| Suomi | `/fi/pelit/virtaukset/vuotava-sailio/` | `/fi/pelit/virtaukset/venturiputki/` | `/fi/pelit/virtaukset/myrsky-ja-siipi/` |
| Norsk bokmål | `/nb/spill/stromninger/lekk-tank/` | `/nb/spill/stromninger/venturiror/` | `/nb/spill/stromninger/storm-og-vinge/` |
| Dansk | `/da/spil/stromninger/utaet-tank/` | `/da/spil/stromninger/venturiror/` | `/da/spil/stromninger/storm-og-vinge/` |
| Português | `/pt/jogos/fluidos-em-movimento/tanque-furado/` | `/pt/jogos/fluidos-em-movimento/tubo-de-venturi/` | `/pt/jogos/fluidos-em-movimento/tempestade-e-asa/` |
| हिन्दी | `/hi/khel/bahte-taral/chhed-wali-tanki/` | `/hi/khel/bahte-taral/venturi-nali/` | `/hi/khel/bahte-taral/aandhi-aur-pankh/` |
| 日本語 | `/ja/gemu/ryutai-no-nagare/ana-no-aita-tanku/` | `/ja/gemu/ryutai-no-nagare/benchuri-kan/` | `/ja/gemu/ryutai-no-nagare/arashi-to-tsubasa/` |

**Leaky Tank**: a hose keeps the level steady and water h below the surface leaves a hole at v = √(2·g·h) (Torricelli's law), then falls freely from the hole's height y, landing x = v·√(2·y ÷ g) = 2·√(h·y) away. Missions ask for the speed 1.8 m down (5.94 m/s), where that jet lands from 1.25 m up (3 m), the litres a 2 cm² hole lets into a bucket in 4 s (4.75 L), the second hole whose jet lands with one 0.5 m down in 2 m of water (1.5 m), and the hole that shoots farthest (1 m, halfway). Answers within 2% are right. Slips caught: a missing 2 or square root, height for depth, the speed as the distance, falling from the surface, one second's flow, m³ for litres, the same or the middle hole, and holes too high or too low.

**Venturi Pipe**: in a level pipe A₁·v₁ = A₂·v₂, and the narrow part's pressure is lower by ½·ρ·(v₂² − v₁²), so an open column there stands Δp ÷ (ρ·g) lower; the flow builds up over 1 s. Missions ask for the speed out of a 0.5 cm nozzle on a 2 cm hose at 1.5 m/s (24 m/s), the drop from 20 cm² to 5 cm² at 1 m/s (7.5 kPa), the column drop from 12 cm² to 4 cm² at 1.2 m/s (0.588 m), the flow through a 20 → 10 cm² Venturi meter with 0.2 m between columns (2.29 L/s), and a 14 m/s fountain's height (10 m). The right panel stacks pressure, motion, and height in kPa to show the same total at both places. Answers within 2% are right. Slips caught: diameters not squared, an inverted ratio, the same speed, (v₂ − v₁)², a missing ½, forgetting v₁, Pa or cm, the pressure for the column, the column's level, the speed for the flow, √(2·g·Δh), and an unsquared speed.

**Storm and Wing**: faster air over than under leaves a pressure difference ½·ρ·(v_over² − v_under²) on the area, with air at 1.2 kg/m³; the wind, the plane, or the breath speeds up steadily for 2 s and a roof, a plane, or a paper strip lifts at the exact moment the lift reaches its weight (within 0.15%). Missions ask for a 30 m/s storm's pull on a 100 m² roof (54 kN), the wind that tears off a 4000 kg roof (25.6 m/s), a 16 m² wing's lift at 70 and 60 m/s (12.5 kN), the take-off speed of a 1000 kg plane whose wing air is 1.1 times as fast (69.7 m/s), and the breath that lifts a 0.5 g, 20 cm² strip (2.02 m/s). A force must be within 2%; a speed must lift with at most 2% to spare. Slips caught: a missing ½ or square, the pressure for the force, water's density, N for kN, (v_over − v_under)², ignoring the air underneath, m for m·g, 0.1 for 1.1² − 1, km/h, cm² as m², and speed to spare.

- `verify-tank.cjs`, `verify-venturi.cjs`, `verify-wing.cjs`: model checks (Torricelli speed and free fall, symmetric and farthest jets, the bucket's timing, continuity and the pressure drop, the meter and the fountain, lift against weight and the exact lift-off moment, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Oscillations games: Pendulum Clock, Spring Bounce, Swing and Resonance

A new topic, Oscillations (*oscilaciones*), is about simple harmonic motion: a pendulum or a mass on a spring swings back and forth with its own steady period, whatever the size of the swing, T = 2π·√(L ÷ g) or T = 2π·√(m ÷ k); without friction its energy flows between motion and storage, and pushes in time with that period build a big motion (resonance). Answers are typed and a run counts as an attempt as soon as it starts; lengths, periods, speeds, and energies stay hidden until a run starts.

| Language | Pendulum Clock | Spring Bounce | Swing and Resonance |
| --- | --- | --- | --- |
| English | `/games/oscillations/pendulum-clock/` | `/games/oscillations/spring-bounce/` | `/games/oscillations/swing-and-resonance/` |
| Español | `/es/juegos/oscilaciones/reloj-de-pendulo/` | `/es/juegos/oscilaciones/muelle-que-rebota/` | `/es/juegos/oscilaciones/columpio-y-resonancia/` |
| Français | `/fr/jeux/oscillations/horloge-a-pendule/` | `/fr/jeux/oscillations/ressort-rebondissant/` | `/fr/jeux/oscillations/balancoire-et-resonance/` |
| Deutsch | `/de/spiele/schwingungen/pendeluhr/` | `/de/spiele/schwingungen/federschwinger/` | `/de/spiele/schwingungen/schaukel-und-resonanz/` |
| Nederlands | `/nl/spellen/trillingen/slingeruurwerk/` | `/nl/spellen/trillingen/massa-aan-veer/` | `/nl/spellen/trillingen/schommel-en-resonantie/` |
| Suomi | `/fi/pelit/varahtelut/heilurikello/` | `/fi/pelit/varahtelut/jousivarahtelija/` | `/fi/pelit/varahtelut/keinu-ja-resonanssi/` |
| Norsk bokmål | `/nb/spill/svingninger/pendelur/` | `/nb/spill/svingninger/fjaerpendel/` | `/nb/spill/svingninger/huske-og-resonans/` |
| Dansk | `/da/spil/svingninger/pendulur/` | `/da/spil/svingninger/fjederpendul/` | `/da/spil/svingninger/gynge-og-resonans/` |
| Português | `/pt/jogos/oscilacoes/relogio-de-pendulo/` | `/pt/jogos/oscilacoes/mola-saltitante/` | `/pt/jogos/oscilacoes/balanco-e-ressonancia/` |
| हिन्दी | `/hi/khel/dolan/lolak-ghadi/` | `/hi/khel/dolan/spring-ka-uchhal/` | `/hi/khel/dolan/jhoola-aur-anunad/` |
| 日本語 | `/ja/gemu/shindo/furiko-dokei/` | `/ja/gemu/shindo/bane-no-shindo/` | `/ja/gemu/shindo/buranko-to-kyoshin/` |

**Pendulum Clock**: a bob swings 10° each way, θ = θ₀·cos(2π·t ÷ T), drawn to scale. Missions ask for the length of a seconds pendulum, which takes 2 s per full swing (0.993 m), the period of a 0.5 m pendulum (1.42 s), the length that doubles a 0.36 m pendulum's period (1.44 m, four times as long), the period of a 1 m pendulum on the Moon at g = 1.62 m/s² (4.94 s), and the period after swapping a 0.5 kg bob for a 2 kg one (1.80 s, unchanged). When a length is asked, your pendulum swings for the period wanted, beside the short one in the double test; when a period is asked, an orange ghost swings with your timing. Answers within 2% are right. Slips caught: a missing 2π or square, half a period, a doubled length, √2, an inverted root, no root, Earth's g on the Moon, and a period that changes with the mass.

**Spring Bounce**: a spring pulls back with k·x, so a mass hangs at rest where k·x₀ = m·g; pulled 5 cm below that and let go, it bounces with y = A·cos(ω·t), ω = √(k ÷ m). The mass is lowered gently for the stretch; every run lasts 2 s. Missions ask for the stretch of a 0.5 kg mass on a 98 N/m spring (0.05 m), the period of 0.5 kg on 49 N/m (0.635 s), the spring that makes 0.2 kg bounce every 0.5 s (31.6 N/m), the top speed of 0.5 kg on 50 N/m pulled 5 cm (0.5 m/s), and the period from a 0.25 m stretch alone, T = 2π·√(x₀ ÷ g) (1.00 s). Answers within 2% are right. Slips caught: a missing g, 2π, square, root, or amplitude, an inverted ratio, ω for the period, and cm for m.

**Swing and Resonance**: an oscillator trades motion for stored energy; short pushes or bumps each add the same speed and are added up exactly, so five of them build a big motion only when they come once per natural period T₀. Pushes and bumps play at triple speed. Missions ask how often to push a swing on 2.45 m ropes (π ≈ 3.14 s, ending at 20° each way against about 3–4° off the beat), its speed at the bottom when let go from 0.2 m (1.98 m/s), the energy in a 200 N/m spring pulled 0.1 m (1 J), where a block swinging 10 cm has equal motion and stored energy (7.07 cm, A ÷ √2), and the bump spacing that makes a 1000 kg car on 25000 N/m springs bounce most at 10 m/s (12.6 m, ending at 10 cm against 0.2 cm at 10 m). The right panel shows the motion over time with every push or bump marked, or energy bars that always add up to the same total. Answers within 2% are right. Slips caught: a missing 2π, 2, ½, square, or root, half a period, the frequency, the rope's length for the height, cm for m and m for cm, halfway for half the energy, the time for the spacing, ω, and the speed divided by the period.

- `verify-pendulum.cjs`, `verify-spring.cjs`, `verify-swing.cjs`: model checks (the period from length and g, the seconds and double-period pendulums, the mass not mattering, Hooke's law and the lowered rest position, the bounce and its top speed, energy conservation, resonance from added-up pushes and bumps, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Amplitude, period, and frequency games: Metronome Studio, Harbour Buoy, Seismograph

Three more Oscillations games come first in the topic's playing order. They name and measure the three numbers that describe any oscillation: the period T (the time for one cycle), the frequency f = 1 ÷ T (cycles per second, in Hz), and the amplitude A (the largest distance from the middle, half of top to bottom). Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Metronome Studio | Harbour Buoy | Seismograph |
| --- | --- | --- | --- |
| English | `/games/oscillations/metronome-studio/` | `/games/oscillations/harbour-buoy/` | `/games/oscillations/seismograph/` |
| Español | `/es/juegos/oscilaciones/estudio-de-metronomo/` | `/es/juegos/oscilaciones/boya-del-puerto/` | `/es/juegos/oscilaciones/sismografo/` |
| Français | `/fr/jeux/oscillations/studio-metronome/` | `/fr/jeux/oscillations/bouee-du-port/` | `/fr/jeux/oscillations/sismographe/` |
| Deutsch | `/de/spiele/schwingungen/metronom-studio/` | `/de/spiele/schwingungen/hafenboje/` | `/de/spiele/schwingungen/seismograph/` |
| Nederlands | `/nl/spellen/trillingen/metronoomstudio/` | `/nl/spellen/trillingen/havenboei/` | `/nl/spellen/trillingen/seismograaf/` |
| Suomi | `/fi/pelit/varahtelut/metronomistudio/` | `/fi/pelit/varahtelut/sataman-poiju/` | `/fi/pelit/varahtelut/seismografi/` |
| Norsk bokmål | `/nb/spill/svingninger/metronomstudio/` | `/nb/spill/svingninger/havneboye/` | `/nb/spill/svingninger/seismograf/` |
| Dansk | `/da/spil/svingninger/metronomstudie/` | `/da/spil/svingninger/havneboje/` | `/da/spil/svingninger/seismograf/` |
| Português | `/pt/jogos/oscilacoes/estudio-de-metronomo/` | `/pt/jogos/oscilacoes/boia-do-porto/` | `/pt/jogos/oscilacoes/sismografo/` |
| हिन्दी | `/hi/khel/dolan/metronome-studio/` | `/hi/khel/dolan/bandargah-ka-plav/` | `/hi/khel/dolan/bhukamplekhi/` |
| 日本語 | `/ja/gemu/shindo/metoronomu-sutajio/` | `/ja/gemu/shindo/minato-no-bui/` | `/ja/gemu/shindo/jishinkei/` |

**Metronome Studio**: each metronome clicks once per full swing, θ = −θ₀·cos(2π·f·t), so one beat is one period (real metronomes click at both ends; the model text says so). An orange ghost metronome ticks at the rate your answer gives, and a timeline marks every click. Missions ask for the period at 120 bpm (0.5 s), the tempo at 1.5 Hz (90 bpm), the frequency of 24 beats in 10 s (2.4 Hz), the frequency of a 0.8 s swing (1.25 Hz), and when 2 Hz and 3 Hz metronomes next click together (1 s). Answers within 2% are right. Slips caught: the frequency for the period, minutes for seconds, dividing or inverting the 60, the period for the tempo or the frequency, multiplying beats by time, beats per minute for Hz, ω for f, one metronome's period, and multiplying or adding the frequencies.

**Harbour Buoy**: a buoy rides a smooth swell beside a post scaled in metres, y = A·sin(2π·t ÷ T) about a middle level of 2.2 m; runs play 2 to 6 times faster than real time. Missions ask for the amplitude from crests at 3.4 m and troughs at 1.0 m (1.2 m), the period when last week's 0.5 m, 8 s swell is three times as big (still 8 s, with a ghost buoy on the smaller swell bobbing in step), the distance travelled in a minute (4·A per period: 36 m), the speed through the middle (2π·A ÷ T ≈ 0.94 m/s), and how much more energy a swell twice as big carries (E = ½·ρ·g·A²: 4 times). Answers within 2% are right. Slips caught: peak to peak, the crest's reading, the middle level, a period scaled with the swell (up, down, or by a root), 2·A or A per period, whole periods only, the average speed, a missing 2π or amplitude, and energy growing linearly, as the cube, or as the root.

**Seismograph**: the pen magnifies the ground's shaking 1000 times and writes it on paper moving at u mm/s, shown to scale with a 5 mm grid, so peaks one period apart sit d = u·T apart. Your answer places orange peak marks on the trace, and the right panel measures one stretch (d, a, T, f, and the ground's motion). Missions ask for the period from 25 mm at 10 mm/s (2.5 s), the frequency from 40 mm at 20 mm/s (0.5 Hz), the ground's amplitude from a 30 mm swing (0.03 mm), the peak spacing of 2 Hz shaking at 10 mm/s (5 mm), and the paper speed that spaces 4 Hz peaks 5 mm apart (20 mm/s; your speed drives the paper). Answers within 2% are right. Slips caught: multiplying spacing and speed, the frequency for the period and back, the spacing as a time, 1 ÷ d, peak to peak, the swing without the magnification or multiplied by it, u·f, f ÷ u, the period as a spacing, d ÷ f, and f ÷ d.

- `verify-metronome.cjs`, `verify-buoy.cjs`, `verify-seismograph.cjs`: model checks (period and frequency as inverses, tempo, the ghost's rate, counted beats, the meeting time, amplitude from the marks, a period independent of amplitude, 4·A per period, the top speed, energy as A², peak spacing u ÷ f, the magnification, the paper speed you choose, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Spring and pendulum games: Spring Shop, Spring Launcher, Wrecking Ball, Big and Fading Swings

Four more Oscillations games cover what the first ones leave out: combining springs, the energy a spring stores, a pendulum's energy at any angle, and big and fading swings. In the topic's playing order the pendulum games follow Pendulum Clock and the spring games follow Spring Bounce. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Spring Shop | Spring Launcher | Wrecking Ball | Big and Fading Swings |
| --- | --- | --- | --- | --- |
| English | `/games/oscillations/spring-shop/` | `/games/oscillations/spring-launcher/` | `/games/oscillations/wrecking-ball/` | `/games/oscillations/big-and-fading-swings/` |
| Español | `/es/juegos/oscilaciones/taller-de-muelles/` | `/es/juegos/oscilaciones/lanzador-de-muelle/` | `/es/juegos/oscilaciones/bola-de-demolicion/` | `/es/juegos/oscilaciones/oscilaciones-grandes-y-amortiguadas/` |
| Français | `/fr/jeux/oscillations/atelier-des-ressorts/` | `/fr/jeux/oscillations/lanceur-a-ressort/` | `/fr/jeux/oscillations/boulet-de-demolition/` | `/fr/jeux/oscillations/grandes-oscillations-et-amortissement/` |
| Deutsch | `/de/spiele/schwingungen/federwerkstatt/` | `/de/spiele/schwingungen/federkatapult/` | `/de/spiele/schwingungen/abrissbirne/` | `/de/spiele/schwingungen/grosse-und-abklingende-schwingungen/` |
| Nederlands | `/nl/spellen/trillingen/verenwerkplaats/` | `/nl/spellen/trillingen/veerkatapult/` | `/nl/spellen/trillingen/sloopkogel/` | `/nl/spellen/trillingen/grote-en-uitdovende-slingers/` |
| Suomi | `/fi/pelit/varahtelut/jousipaja/` | `/fi/pelit/varahtelut/jousilinko/` | `/fi/pelit/varahtelut/purkupallo/` | `/fi/pelit/varahtelut/suuret-ja-vaimenevat-heilahdukset/` |
| Norsk bokmål | `/nb/spill/svingninger/fjaerverksted/` | `/nb/spill/svingninger/fjaerkatapult/` | `/nb/spill/svingninger/rivningskule/` | `/nb/spill/svingninger/store-og-dempede-svingninger/` |
| Dansk | `/da/spil/svingninger/fjedervaerksted/` | `/da/spil/svingninger/fjederkatapult/` | `/da/spil/svingninger/nedrivningskugle/` | `/da/spil/svingninger/store-og-daempede-svingninger/` |
| Português | `/pt/jogos/oscilacoes/oficina-de-molas/` | `/pt/jogos/oscilacoes/lancador-de-mola/` | `/pt/jogos/oscilacoes/bola-de-demolicao/` | `/pt/jogos/oscilacoes/oscilacoes-grandes-e-amortecidas/` |
| हिन्दी | `/hi/khel/dolan/spring-karyashala/` | `/hi/khel/dolan/spring-prakshepak/` | `/hi/khel/dolan/dhwans-gola/` | `/hi/khel/dolan/bade-aur-ghatte-dolan/` |
| 日本語 | `/ja/gemu/shindo/bane-kobo/` | `/ja/gemu/shindo/bane-hasshadai/` | `/ja/gemu/shindo/tekkyu-no-furiko/` | `/ja/gemu/shindo/ookina-furiko-to-gensui/` |

**Spring Shop**: loads are lowered gently over 2 s onto springs side by side (k = k₁ + k₂), end to end (1/k = 1/k₁ + 1/k₂, each spring stretching by the full load ÷ its own k), or a spring cut in half (twice as stiff, shown beside the whole one), with stretches to scale on a ruler. Missions ask for the stretch of two 100 N/m springs side by side under 2 kg (9.8 cm) and end to end (39.2 cm), half of a 120 N/m spring (240 N/m), 100 and 300 N/m end to end (75 N/m), and the bounce of 0.5 kg on two 50 N/m springs side by side (0.444 s). Answers within 2% are right. Slips caught: one spring carrying it all, the other arrangement, metres for cm, stiffnesses added end to end, one spring's stretch, halving or keeping k when cut, the average, a single spring's period, and a missing 2π.

**Spring Launcher**: a spring stores ½·k·x² and hands it on, with bars for spring, motion, and height energy. Missions ask for a pinball's launch speed from a 400 N/m spring pushed in 5 cm (3.16 m/s), a 50 g rocket's height on 800 N/m pushed in 8 cm (5.22 m), the push that sends a 100 g rocket on 500 N/m to a 2 m platform (8.85 cm, your push drives the rocket), what doubling the push does to the height (4 times), and how far a 2 kg cart at 3 m/s squashes a 200 N/m buffer (30 cm, in slow motion). Answers within 2% are right. Slips caught: a missing root or ½, cm for m and m for cm, an extra 2, an unsquared push, the mass for the weight, a missing 2 in the push, and energy growing linearly, as the cube, or as the root.

**Wrecking Ball**: a 100 kg ball on a 2 m rope swings to scale, worked out exactly for any angle (θ'' = −g ÷ L·sin θ in an RK4 table, so the half-swing from 60° takes 1.523 s, not the small-swing 1.419 s); speeds come from the height lost and the rope pulls m·g·cos θ + m·v² ÷ L. Missions ask for the speed at the bottom from 60° (4.43 m/s), at 30° on the way down (3.79 m/s), the rope's pull at the bottom from 45° (1554 N), how high the ball rises when a peg halfway down catches the rope after a 0.5 m drop (0.5 m, at 60°), and the angle reached from 3 m/s at the bottom (39.6°). Answers within 2% are right. Slips caught: the rope's length as the drop, a missing 2 or root, the drop from 30°, half the speed, the bottom speed, the weight alone, the bending pull alone or subtracted, a halved or doubled rise, the rope's length, radians, a missing 1 −, and the sine.

**Big and Fading Swings**: a real pendulum swings beside a gray ideal one. Big swings are integrated exactly and their period comes from the elliptic integral (AGM); fading swings keep 90% of their size every full swing, θ = θ₀·0.9ⁿ·cos(2π·t ÷ T₀). Missions ask for the period of a 1 m pendulum swinging 60° (2.154 s), how much slower a 30° swing is (1.74%), the size after 5 swings from 20° (11.8°), the swings to halve (6.58), and the energy lost per swing (19%). Answers within 2% are right. Slips caught: the small-swing period, half a swing, a fraction for a percentage, the period in seconds, subtracting the losses, one or four swings, the energy's share, when the energy halves, the size loss as the energy loss, the energy kept, and squaring the loss.

- `verify-springshop.cjs`, `verify-launcher.cjs`, `verify-wrecking.cjs`, `verify-fading.cjs`: model checks (series and parallel stiffness and each spring's stretch, the cut spring, the bounce, stored energy and its conservation, aiming and doubling, the buffer's squash, the exact large-angle swing against the elliptic period, v² + 2·g·h held constant, the rope's pull, Galileo's peg, fading sizes, half-life, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Waves games: Rope Pulse, Wave Machine, Sound in Slow Motion

A new topic, Waves (*ondas*), covers what a wave is, amplitude, wavelength, frequency, and period. A wave carries energy and a shape from place to place while the material it travels through only moves up and down, or back and forth; frequency, wavelength, and speed are tied together by v = f·λ, with T = 1 ÷ f. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Rope Pulse | Wave Machine | Sound in Slow Motion |
| --- | --- | --- | --- |
| English | `/games/waves/rope-pulse/` | `/games/waves/wave-machine/` | `/games/waves/sound-in-slow-motion/` |
| Español | `/es/juegos/ondas/pulso-en-la-cuerda/` | `/es/juegos/ondas/maquina-de-ondas/` | `/es/juegos/ondas/sonido-a-camara-lenta/` |
| Français | `/fr/jeux/ondes/impulsion-sur-la-corde/` | `/fr/jeux/ondes/machine-a-ondes/` | `/fr/jeux/ondes/le-son-au-ralenti/` |
| Deutsch | `/de/spiele/wellen/seilpuls/` | `/de/spiele/wellen/wellenmaschine/` | `/de/spiele/wellen/schall-in-zeitlupe/` |
| Nederlands | `/nl/spellen/golven/puls-op-het-touw/` | `/nl/spellen/golven/golfmachine/` | `/nl/spellen/golven/geluid-in-slow-motion/` |
| Suomi | `/fi/pelit/aallot/pulssi-koydessa/` | `/fi/pelit/aallot/aaltokone/` | `/fi/pelit/aallot/aani-hidastettuna/` |
| Norsk bokmål | `/nb/spill/bolger/puls-pa-tauet/` | `/nb/spill/bolger/bolgemaskin/` | `/nb/spill/bolger/lyd-i-sakte-film/` |
| Dansk | `/da/spil/bolger/puls-pa-rebet/` | `/da/spil/bolger/bolgemaskine/` | `/da/spil/bolger/lyd-i-slowmotion/` |
| Português | `/pt/jogos/ondas/pulso-na-corda/` | `/pt/jogos/ondas/maquina-de-ondas/` | `/pt/jogos/ondas/som-em-camera-lenta/` |
| हिन्दी | `/hi/khel/tarangen/rassi-par-spand/` | `/hi/khel/tarangen/tarang-mashin/` | `/hi/khel/tarangen/dhimi-gati-mein-dhvani/` |
| 日本語 | `/ja/gemu/nami/ropu-no-parusu/` | `/ja/gemu/nami/nami-mashin/` | `/ja/gemu/nami/surou-no-oto/` |

**Rope Pulse**: smooth pulses about 1.2 m wide run along an ideal rope at 4 m/s, y(x, t) = b(x − v·t), with heights drawn 5 times larger; a red ribbon tied 4 m along only bobs in place. Missions ask for the speed of a pulse crossing 8 m in 2 s (4 m/s), how far the ribbon moves along the rope while the pulse crosses (0 cm; this test accepts 0, and anything up to 0.5 cm counts), the amplitude of a full wave that takes the ribbon from 15 cm above the resting line to 15 cm below (15 cm, crest first), the height where a 10 cm and a 6 cm pulse overlap (16 cm, y = y₁ + y₂; both carry on unchanged), and when a pulse is back from a wall 6 m away at 4 m/s (3 s, upside down: the rope at the fixed end never moves). Answers within 2% are right. Slips caught: multiplying or inverting distance and time, the pulse's distance or the ribbon's rise for its movement along the rope, top to bottom, metres for cm, subtracting, keeping the bigger pulse, averaging, one way only, multiplying distance and speed, and speed ÷ distance.

**Wave Machine**: a motor shakes one end of a 6 m rope in a perfect sine, y = A·sin(2π·(f·t − x ÷ λ)) behind a front that moves out at the rope's speed, with nothing reflected; a red bead 3 m along shows one period per up-and-down, and once the waves arrive a bracket marks one wavelength from crest to crest. Every run lasts 3 s. Missions ask for the length of each wave when 4 fill the rope (1.5 m), the speed of 1.5 m waves at 2 Hz (3 m/s), the new wavelength when the same rope is shaken at 4 Hz (0.75 m, beside a gray 2 Hz wave), how long a 2 m wave at 5 m/s takes to pass the bead (0.4 s), and the speed when the motor shakes twice as far (still 3 m/s, beside a gray smaller wave). Answers within 2% are right. Slips caught: dividing by the crests, multiplying, waves per metre, dividing or inverting f and λ, longer or unchanged waves when shaken faster, the frequency for the period, λ·v, and a speed doubled or halved by the amplitude.

**Sound in Slow Motion**: sound is a longitudinal wave at 340 m/s. Notes are slowed down by their own frequency, so one vibration lasts one second on screen: dots of air move back and forth (much enlarged) and bunch into squeezes λ = v ÷ f apart, and the right panel plots the pressure one wavelength from the speaker. Thunder and echoes play in real time on a map to scale, the flash arriving at once. Missions ask how far apart the squeezes of a 340 Hz note are (1 m), how long one vibration of a 440 Hz A lasts (2.27 ms), how far away a storm is when the thunder comes 3 s after the flash (1020 m), how far away a cliff is when the echo comes 2 s after the shout (340 m), and how far apart the squeezes of a 20000 Hz note are (1.7 cm). Answers within 2% are right. Slips caught: multiplying v and f, the period for the wavelength and back, seconds for ms, dividing v by t, a halved one-way trip, kilometres for metres, the round trip, and metres or millimetres for cm.

- `verify-pulse.cjs`, `verify-wavemachine.cjs`, `verify-sound.cjs`: model checks (a pulse moving at v while the ribbon stays put, a full wave reaching ±A, superposition and pulses passing through each other, the fixed end and the inverted echo, λ = v ÷ f from counted waves, the bead's period, shorter waves when shaken faster, an amplitude that changes neither speed nor wavelength, slowed tones, squeezes λ apart, thunder and echo distances, timestep independence, rounding margins, the 0 answer, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Amplitude games: Pebble Ripples, Power on a Rope

Two more Waves games, the first of a planned 24 (see `WAVES_HANDOFF.md`), cover what amplitude says about energy: the energy a wave carries grows as the square of its amplitude, and a wave that spreads out shares the same energy over a longer front. They follow Rope Pulse in the topic's playing order. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Pebble Ripples | Power on a Rope |
| --- | --- | --- |
| English | `/games/waves/pebble-ripples/` | `/games/waves/power-on-a-rope/` |
| Español | `/es/juegos/ondas/ondas-de-una-piedra/` | `/es/juegos/ondas/potencia-en-una-cuerda/` |
| Français | `/fr/jeux/ondes/ronds-dans-l-eau/` | `/fr/jeux/ondes/puissance-sur-une-corde/` |
| Deutsch | `/de/spiele/wellen/kreise-im-teich/` | `/de/spiele/wellen/leistung-auf-dem-seil/` |
| Nederlands | `/nl/spellen/golven/kringen-in-de-vijver/` | `/nl/spellen/golven/vermogen-op-een-touw/` |
| Suomi | `/fi/pelit/aallot/renkaat-lammessa/` | `/fi/pelit/aallot/teho-koydessa/` |
| Norsk bokmål | `/nb/spill/bolger/ringer-i-dammen/` | `/nb/spill/bolger/effekt-pa-et-tau/` |
| Dansk | `/da/spil/bolger/ringe-i-vandet/` | `/da/spil/bolger/effekt-pa-et-reb/` |
| Português | `/pt/jogos/ondas/ondas-de-uma-pedra/` | `/pt/jogos/ondas/potencia-numa-corda/` |
| हिन्दी | `/hi/khel/tarangen/kankad-ki-lahren/` | `/hi/khel/tarangen/rassi-par-shakti/` |
| 日本語 | `/ja/gemu/nami/koishi-no-hamon/` | `/ja/gemu/nami/ropu-no-pawa/` |

**Pebble Ripples**: a pond seen from above, with a side view of the surface along a dashed line (heights enlarged) and red floats at the measured distances. A pebble's ring travels out at 1 m/s as one smooth crest; its energy is shared around 2π·r, so its height follows A = A₁·√(r₁ ÷ r) exactly, with no friction. The right panel draws the crest's height at every distance reached. Missions ask for the height 4 m away of a ripple 2 cm high at 1 m (1 cm), how many times less energy each metre of ring carries at 3 m than at 1 m (3), how far a 3 cm ripple at 0.5 m travels before it is 1 cm high (4.5 m), the height at 2 m of a pebble with 4 times the energy of one whose ripple is 1 cm there (2 cm, beside the small pebble's ripple in gray), and the height 4 m away of a straight wave from a plank, 2 cm at 1 m (still 2 cm). Answers within 2% are right. Slips caught: a height falling as 1 ÷ r or 1 ÷ r², an unchanged, growing, or multiplied height, 1 ÷ r² or √r for the energy, no change, a linear or root distance and the ratio upside down, height growing linearly or as the square of energy, an unchanged height, and the ring's rule for a straight wave.

**Power on a Rope**: a motor shakes a 6 m rope that runs into an absorber with a lamp, so nothing reflects; the earlier shaking runs beside it as a dashed gray wave. P = ½·μ·(2π·f)²·A²·v exactly, and the right panel plots the energy reaching the absorber from the moment the first wave arrives, so its slope is the power. Every run lasts 3 s. Missions ask how many times the power when the amplitude doubles from 5 to 10 cm (4), when the frequency doubles too (16), the watts for 0.2 kg/m, 10 m/s, 2 Hz, and 10 cm (1.58 W), the amplitude that keeps the same power at 4 Hz instead of 2 Hz (5 cm; the motor shakes with your amplitude), and how many times the power on a rope 4 times as heavy per metre at the same tension, where waves travel at 5 m/s instead of 10 m/s (2). Answers within 2% are right. Slips caught: power growing linearly, unchanged, as the root, or as the cube, both changes linear or only one squared, a missing ½, f for ω, ω not squared, the amplitude in cm, a quartered, √2-reduced, unchanged, or doubled amplitude, and the mass, the speed, or neither alone.

- `verify-ripples.cjs`, `verify-ropepower.cjs`: model checks (the ring's energy A²·2π·r held constant, height as 1 ÷ √r, energy per metre as 1 ÷ r, the straight wave's constant height, √E for a bigger pebble, P = ½·μ·ω²·A²·v, power as A² and f², energy delivered only after the first wave arrives, your amplitude driving the motor, the heavier rope, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Wavelength games: Ripple Tank Ruler, Antenna Workshop

Two more Waves games (plan items 3 and 4 in `WAVES_HANDOFF.md`) are about measuring and using the wavelength: counting gaps between crests, correcting a photo's scale, v = f·λ in water, and λ = c ÷ f for radio waves. In the topic's playing order Ripple Tank Ruler comes before Wave Machine and Antenna Workshop after it. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Ripple Tank Ruler | Antenna Workshop |
| --- | --- | --- |
| English | `/games/waves/ripple-tank-ruler/` | `/games/waves/antenna-workshop/` |
| Español | `/es/juegos/ondas/cubeta-de-ondas/` | `/es/juegos/ondas/taller-de-antenas/` |
| Français | `/fr/jeux/ondes/cuve-a-ondes/` | `/fr/jeux/ondes/atelier-des-antennes/` |
| Deutsch | `/de/spiele/wellen/wellenwanne/` | `/de/spiele/wellen/antennenwerkstatt/` |
| Nederlands | `/nl/spellen/golven/golfbak/` | `/nl/spellen/golven/antennewerkplaats/` |
| Suomi | `/fi/pelit/aallot/aaltoallas/` | `/fi/pelit/aallot/antennipaja/` |
| Norsk bokmål | `/nb/spill/bolger/bolgekar/` | `/nb/spill/bolger/antenneverksted/` |
| Dansk | `/da/spil/bolger/bolgekar/` | `/da/spil/bolger/antennevaerksted/` |
| Português | `/pt/jogos/ondas/cuba-de-ondas/` | `/pt/jogos/ondas/oficina-de-antenas/` |
| हिन्दी | `/hi/khel/tarangen/lahar-tanki/` | `/hi/khel/tarangen/antenna-karyashala/` |
| 日本語 | `/ja/gemu/nami/hamon-suiso/` | `/ja/gemu/nami/antena-kobo/` |

**Ripple Tank Ruler**: a 60 cm ripple tank seen from above, lighter where the water is higher, with every crest drawn as a bright line, a ruler in cm, and a side view of the surface and the bottom. A bar dips 8 times a second, so crests sit λ = v ÷ f apart; over the shallow end the ripples slow from 40 to 24 cm/s at the step, with the same frequency. Every run lasts 2.5 s. Missions ask for the spacing when 10 crests span 45 cm (5 cm, bracketed once all ten are in the tank), the real spacing from a half-size photo showing 2.5 cm (5 cm; the photo is drawn under the tank with its own scale), the speed at 8 Hz and 5 cm (40 cm/s), the spacing over the shallow end (3 cm), and how long the first ripple takes to cross the tank (1.5 s). Answers within 2% are right. Slips caught: dividing by the number of crests or by one gap too many, crests per centimetre, the photo's value or shrinking it again, dividing or inverting f and λ, m/s for cm/s, an unchanged or longer wavelength, multiplying speed and frequency, the number of waves for a time, dividing by the frequency, and the period.

**Antenna Workshop**: radio waves leave an antenna at c = 3 × 10⁸ m/s, shown slowed down by their own frequency so one oscillation lasts one second on screen, with a ruler in m or cm and a bracket over one wavelength; the right panel places the length on a ladder of powers of ten from 1 mm to 10 km beside AM radio, FM radio, and Wi-Fi. Every run lasts 3 s. Missions ask for the wavelength of FM radio at 100 MHz (3 m), a quarter-wave car antenna for it (0.75 m, drawn beside your antenna), Wi-Fi at 2.4 GHz in cm (12.5 cm), the hot spots of a 2.45 GHz microwave oven, half a wavelength apart (6.12 cm, a standing wave melting a chocolate bar), and AM radio at 1 MHz (300 m). Answers within 2% are right. Slips caught: multiplying c and f, MHz taken as Hz, f ÷ c, the speed of sound, a full or half wave for the antenna, metres, millimetres, or GHz taken as MHz for Wi-Fi, a whole or quarter wavelength or metres for the hot spots, and kilometres or MHz taken as kHz for AM.

- `verify-rippletank.cjs`, `verify-antenna.cjs`: model checks (crests λ apart and 10 crests spanning 9 gaps, the photo's scale, the same frequency on both sides of the step with shorter waves over the shallow end, the crossing time, λ = c ÷ f, one wavelength per displayed second, hot spots half a wavelength apart with still points at the walls, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Frequency games: String Tuner, Strobe Freeze

Two more Waves games (plan items 5 and 6 in `WAVES_HANDOFF.md`) are about frequency: the pitch of a string, f = v ÷ (2·L), and measuring a frequency with a strobe, f_seen = f − f_s. They follow Wave Machine in the topic's playing order. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | String Tuner | Strobe Freeze |
| --- | --- | --- |
| English | `/games/waves/string-tuner/` | `/games/waves/strobe-freeze/` |
| Español | `/es/juegos/ondas/afinador-de-cuerdas/` | `/es/juegos/ondas/congelar-con-estroboscopio/` |
| Français | `/fr/jeux/ondes/accordeur-de-cordes/` | `/fr/jeux/ondes/figer-au-stroboscope/` |
| Deutsch | `/de/spiele/wellen/saitenstimmer/` | `/de/spiele/wellen/stroboskop-stopp/` |
| Nederlands | `/nl/spellen/golven/snarenstemmer/` | `/nl/spellen/golven/stroboscoop-stilzetten/` |
| Suomi | `/fi/pelit/aallot/kielten-viritin/` | `/fi/pelit/aallot/stroboskooppi/` |
| Norsk bokmål | `/nb/spill/bolger/strengestemmer/` | `/nb/spill/bolger/stroboskopet/` |
| Dansk | `/da/spil/bolger/strengestemmer/` | `/da/spil/bolger/stroboskopet/` |
| Português | `/pt/jogos/ondas/afinador-de-cordas/` | `/pt/jogos/ondas/congelar-com-estroboscopio/` |
| हिन्दी | `/hi/khel/tarangen/taar-tuner/` | `/hi/khel/tarangen/strobe-se-rokna/` |
| 日本語 | `/ja/gemu/nami/gen-no-chunaa/` | `/ja/gemu/nami/sutorobo-de-tomeru/` |

**String Tuner**: a guitar neck with frets and a ruler measured from the bridge; the string vibrates in its fundamental (half a wave, λ = 2·L) between the nut or your finger and the bridge, slowed down by its own frequency so one vibration lasts a second on screen. The right panel is a tuner dial from 0 to 1000 Hz with A3, E4, A4, and A5 marked, the string's needle in blue and yours in orange. Every run lasts 3 s. Missions ask for the note of a 65 cm string with 286 m/s waves (220 Hz), half the string (440 Hz), the vibrating length for 330 Hz (43.3 cm; your finger sets it), four times the tension (440 Hz), and one vibration at 220 Hz (4.55 ms). Answers within 2% are right. Slips caught: v ÷ L, v ÷ (4·L), multiplying, halving, keeping, or quadrupling the note, the wavelength for the length, the inverse ratio, metres for cm, a linear or √2 change with tension, no change, seconds for ms, half a period, and the frequency for the period.

**Strobe Freeze**: a dark room where a wave on a rope or an 8-spoke wheel is drawn only at each flash, each image held for 0.1 s and fading, with an optional gray blur of the real motion; the right panel plots one point over the last 0.4 s with a dot at every flash. Runs last 3 s in real time. Missions ask for the highest flash rate that freezes a 25 Hz wave with a single image (25 Hz; your rate drives the lamp, so 50 Hz shows two images), the creep of a 26 Hz wave under 25 flashes a second (1 Hz), the frequency of a wave that creeps 2 cycles a second under 40 flashes (42 Hz), the slowest turning rate that makes the wheel look still under 24 flashes (3 turns a second; your rate drives the wheel, and 1.5 shows 16 spokes), and the speed of a frozen wave with crests 5 cm apart at 25 Hz (125 cm/s). Answers within 2% are right. Slips caught: half or double the rate, the period, adding or dividing the rates, subtracting the creep, the creep or the flash rate alone, the flash rate for the wheel, multiplying by the spokes, half the rate, λ ÷ f, f ÷ λ, and m/s for cm/s.

- `verify-strings.cjs`, `verify-strobe.cjs`: model checks (f = v ÷ (2·L) and the half-wave shape, the octave, √F for tension, your finger's length, frozen images at one flash per cycle, the creep f − f_s, the wheel's still speeds, the images the eye holds, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Period games: Surfer's Wait, Tide Clock

Two more Waves games (plan items 7 and 8 in `WAVES_HANDOFF.md`) are about the period: the time between crests of an ocean swell, T = λ ÷ v, and the period of the tides, about 12 h 25 min. They follow Strobe Freeze in the topic's playing order. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Surfer's Wait | Tide Clock |
| --- | --- | --- |
| English | `/games/waves/surfers-wait/` | `/games/waves/tide-clock/` |
| Español | `/es/juegos/ondas/la-espera-del-surfista/` | `/es/juegos/ondas/reloj-de-mareas/` |
| Français | `/fr/jeux/ondes/l-attente-du-surfeur/` | `/fr/jeux/ondes/l-horloge-des-marees/` |
| Deutsch | `/de/spiele/wellen/warten-auf-die-welle/` | `/de/spiele/wellen/gezeitenuhr/` |
| Nederlands | `/nl/spellen/golven/wachten-op-de-golf/` | `/nl/spellen/golven/getijdenklok/` |
| Suomi | `/fi/pelit/aallot/surffarin-odotus/` | `/fi/pelit/aallot/vuorovesikello/` |
| Norsk bokmål | `/nb/spill/bolger/surferens-venting/` | `/nb/spill/bolger/tidevannsklokka/` |
| Dansk | `/da/spil/bolger/surferens-ventetid/` | `/da/spil/bolger/tidevandsuret/` |
| Português | `/pt/jogos/ondas/a-espera-do-surfista/` | `/pt/jogos/ondas/relogio-das-mares/` |
| हिन्दी | `/hi/khel/tarangen/surfer-ka-intezaar/` | `/hi/khel/tarangen/jwar-ghadi/` |
| 日本語 | `/ja/gemu/nami/safa-no-machijikan/` | `/ja/gemu/nami/shio-no-tokei/` |

**Surfer's Wait**: a side view of a swell rolling towards a beach over 2.5 wavelengths, with a surfer waiting 1.25 wavelengths out and a ruler in metres; heights are enlarged. The right panel plots the surfer's height over time with a white dot at each crest. A run lasts 2.5 periods, sped up so it takes 4 s, and ends as the third crest lifts the surfer. Missions ask for the wait between crests 60 m apart at 10 m/s (6 s), waves per minute for the same swell (10), the swell's speed from a pier with crests 40 m apart every 5 s (8 m/s), the spacing of a 12 s storm swell at 15 m/s (180 m), and the frequency of waves every 8 s (0.125 Hz). Answers within 2% are right. Slips caught: λ·v, v ÷ λ, the period for waves per minute, 60·T, waves per second, λ·T, T ÷ λ, v ÷ T, T ÷ v, the period for the frequency, and waves per minute for hertz.

**Tide Clock**: a harbour wall with a tide gauge from −3 to +3 m, a moored boat, a big clock, and a sky that follows the hour; the tide is h = 2 m · cos(2π·t ÷ T) with T = 12 h 25 min, starting at high tide at 06:10. The right panel plots the water level over the run's hours with a white dot at each high tide. Runs cover 26 or 50 hours in about 4 s (sped up 23 400 or 45 000 times); the clock and day show the harbour time, and the time reading is in hours. Missions ask for the period from four periods in 49 h 40 min (12.42 h), the next low tide after 06:10 (6.21 h), high tides in 24 h (1.93), how much later tomorrow's morning high tide is (50 min), and the tide's wavelength across a 4000 m deep ocean at 200 m/s (8940 km, drawn on a scale to halfway round the Earth). Answers within 2% are right. Slips caught: dividing by the five tides seen, taking away two days, 12 h, a quarter or a whole period, 6 h, two tides, tides per hour, T ÷ 24, hours for minutes, one tide's delay, double the delay, hours for seconds, and metres for km.

- `verify-surf.cjs`, `verify-tide.cjs`: model checks (crests reaching the surfer at T/2, 3T/2, 5T/2, the swell repeating every wavelength and moving one wavelength each period, high and low water, the harbour clock and day, timestep independence, rounding margins, slip detection with no slip inside the 2% window, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Wave speed games: Rope Tension Lab, Tsunami Race

Two more Waves games (plan items 9 and 10 in `WAVES_HANDOFF.md`) are about what sets the speed of a wave: the tension and mass per metre of a rope, v = √(F ÷ μ), and the depth of the sea for a tsunami, v = √(g·h). They follow Tide Clock in the topic's playing order. Answers are typed and a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Rope Tension Lab | Tsunami Race |
| --- | --- | --- |
| English | `/games/waves/rope-tension-lab/` | `/games/waves/tsunami-race/` |
| Español | `/es/juegos/ondas/laboratorio-de-tension-de-cuerdas/` | `/es/juegos/ondas/carrera-del-tsunami/` |
| Français | `/fr/jeux/ondes/labo-de-tension-des-cordes/` | `/fr/jeux/ondes/la-course-du-tsunami/` |
| Deutsch | `/de/spiele/wellen/seilspannungs-labor/` | `/de/spiele/wellen/tsunami-rennen/` |
| Nederlands | `/nl/spellen/golven/touwspanningslab/` | `/nl/spellen/golven/tsunamirace/` |
| Suomi | `/fi/pelit/aallot/koyden-kireys/` | `/fi/pelit/aallot/tsunamikisa/` |
| Norsk bokmål | `/nb/spill/bolger/taustrammelab/` | `/nb/spill/bolger/tsunamikapplopet/` |
| Dansk | `/da/spil/bolger/rebspaendingslab/` | `/da/spil/bolger/tsunamikaplobet/` |
| Português | `/pt/jogos/ondas/laboratorio-de-tensao-em-cordas/` | `/pt/jogos/ondas/corrida-do-tsunami/` |
| हिन्दी | `/hi/khel/tarangen/rassi-tanav-prayogshala/` | `/hi/khel/tarangen/tsunami-ki-daud/` |
| 日本語 | `/ja/gemu/nami/rope-no-chouryoku/` | `/ja/gemu/nami/tsunami-no-kyoso/` |

**Rope Tension Lab**: a rope from a hand over a pulley to a hanging weight that sets the tension; a raised-cosine pulse runs along it, heights enlarged, with a ruler in metres. The before-and-after tests draw the old rope above the new one, both pulses starting together. The right panel plots the pulse's position over time, with the old rope's line dotted and your speed dashed in orange. Runs end as the middle of the pulse reaches the pulley and are slowed down so each takes 3 s; the time reading is in milliseconds. Missions ask for the speed on a 0.1 kg/m rope at 40 N (20 m/s), the speed at 160 N (40 m/s, twice, not four times), the speed on a 0.4 kg/m rope at 40 N (10 m/s), the tension for 30 m/s on a 0.05 kg/m rope (45 N), and the time for a pulse to cross a 10 m, 0.5 kg rope at 80 N (0.25 s). Answers within 2% are right. Slips caught: F ÷ μ, √(μ ÷ F), F·μ, four times or no change with tension, a quarter, double, or no change with mass, μ·v, v² ÷ μ, v², the whole mass for μ, v ÷ L, and L ÷ (F ÷ μ).

**Tsunami Race**: a cross-section of the sea, depth enlarged, with a seabed, a beach slope on the right, and a tsunami hump crossing the surface; a km scale runs underneath and the depth is labelled (in the depth test, only once the run starts). The right panel plots distance over time with your speed dashed in orange. Runs end as the middle of the wave reaches the far side and are sped up so each takes 4 s; the time reading is in minutes. Missions ask for the speed over a 4000 m deep ocean (198 m/s), the same in km/h (713 km/h), the time to cross 2000 km (2.81 h), the speed in 10 m of water near the shore (9.9 m/s), and the depth of a sea crossed at 50 m/s (255 m). g = 9.8 m/s². Answers within 2% are right. Slips caught: g·h, √h, √(h ÷ g), m/s for km/h, dividing by 3.6, seconds or minutes for hours, speed ÷ distance, a linear slow-down with depth, v ÷ g, g·v², and v².

- `verify-tension.cjs`, `verify-tsunami.cjs`: model checks (√ of the tension and mass per metre, the before-and-after ratios, the √ of the depth, steady motion to the far end, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Transverse and longitudinal games: Slinky Lab, Earthquake P and S

Two more Waves games (plan items 11 and 12 in `WAVES_HANDOFF.md`) are about the two kinds of wave: a slinky shaken sideways (transverse) or pushed and pulled (longitudinal), and an earthquake's P (longitudinal) and S (transverse) waves. They follow Tsunami Race in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts. The direction questions take an angle between the material's movement and the way the wave travels: 90° across, 0° along (180° also counts on the slinky, and 0 has its own window).

| Language | Slinky Lab | Earthquake P and S |
| --- | --- | --- |
| English | `/games/waves/slinky-lab/` | `/games/waves/earthquake-p-and-s/` |
| Español | `/es/juegos/ondas/laboratorio-del-muelle/` | `/es/juegos/ondas/terremoto-p-y-s/` |
| Français | `/fr/jeux/ondes/labo-du-ressort/` | `/fr/jeux/ondes/seisme-p-et-s/` |
| Deutsch | `/de/spiele/wellen/spiralfeder-labor/` | `/de/spiele/wellen/erdbeben-p-und-s/` |
| Nederlands | `/nl/spellen/golven/slinkylab/` | `/nl/spellen/golven/aardbeving-p-en-s/` |
| Suomi | `/fi/pelit/aallot/jousilaboratorio/` | `/fi/pelit/aallot/maanjaristys-p-ja-s/` |
| Norsk bokmål | `/nb/spill/bolger/fjaerlaben/` | `/nb/spill/bolger/jordskjelv-p-og-s/` |
| Dansk | `/da/spil/bolger/fjederlab/` | `/da/spil/bolger/jordskaelv-p-og-s/` |
| Português | `/pt/jogos/ondas/laboratorio-da-mola/` | `/pt/jogos/ondas/terremoto-p-e-s/` |
| हिन्दी | `/hi/khel/tarangen/spring-prayogshala/` | `/hi/khel/tarangen/bhukamp-p-aur-s/` |
| 日本語 | `/ja/gemu/nami/bane-no-jikken/` | `/ja/gemu/nami/jishin-no-p-to-s/` |

**Slinky Lab**: a slinky seen from above, one stroke per coil 10 cm apart, a hand at the left end, one coil painted white a third of the way along, and a ruler in metres. ↕ cards shake the end sideways; ↔ cards push and pull it. The right panel draws the painted coil's path from above, with an arrow for the way the wave goes and the guessed angle as an orange dashed line. Runs play at half speed and end as the front reaches the far end (4 s). Missions ask for the angle of a coil's movement for a sideways shake (90°) and a push and pull (0°), the spacing of compressions at 2 Hz and 3 m/s (1.5 m), the speed of compressions 0.8 m apart at 2.5 Hz (2 m/s), and the spacing when the first compression covers 6 m in 2 s at 1.5 Hz (2 m). Answers within 2% are right. Slips caught: along for across, across for along, v·f, f ÷ v, λ ÷ f, f ÷ λ, the speed for the spacing, the speed times f, and the distance ÷ f.

**Earthquake P and S**: a cross-section of the crust with the quake at the left and a station on the surface; the P (blue) and S (white) fronts spread as circles, a row of rock grains is pushed along by P and shaken across by S (enlarged), and a top-left inset shows the ground's path at the station. The right panel is the station's seismogram: a small P burst, then a larger S burst, each 3 s long, with guessed arrival times as dashed orange lines. Runs end 4 s after the S wave arrives, sped up so each takes 5 s. Missions ask for the distance from a 10 s S−P gap with v_P = 6 and v_S = 3.5 km/s (84 km), the P arrival 120 km away (20 s), the gap 210 km away (25 s), the angle of the S wave's shake (90°), and the S speed from arrivals at 20 s and 15 s later, 140 km away (4 km/s). Answers within 2% are right. Slips caught: the gap times v_P, times v_S, or times v_P − v_S, the S arrival for P, d·v, v ÷ d, the S or P arrival for the gap, the sum of the arrivals, 0° or 180° for S, d ÷ the gap, the P speed, and subtracting the gap.

- `verify-slinky.cjs`, `verify-quake.cjs`: model checks (coils still ahead of the front, one wavelength of repeat behind it, the squeeze of about half the spacing, 0° and 180° both along, P along and S across with on-time arrivals, timestep independence, rounding margins, slip detection, scoring, input validation including 0°, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Reflection games: Echo Sounder, Bank Shot Ripples

Two more Waves games (plan items 13 and 14 in `WAVES_HANDOFF.md`) are about reflection: echoes, d = v·t ÷ 2, and how waves bounce, θ_out = θ_in, upside down from a fixed end and upright from a free end. They follow Earthquake P and S in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Echo Sounder | Bank Shot Ripples |
| --- | --- | --- |
| English | `/games/waves/echo-sounder/` | `/games/waves/bank-shot-ripples/` |
| Español | `/es/juegos/ondas/sonda-de-eco/` | `/es/juegos/ondas/carambola-de-ondas/` |
| Français | `/fr/jeux/ondes/sondeur-a-echo/` | `/fr/jeux/ondes/rebonds-de-vagues/` |
| Deutsch | `/de/spiele/wellen/echolot/` | `/de/spiele/wellen/bandenwellen/` |
| Nederlands | `/nl/spellen/golven/echolood/` | `/nl/spellen/golven/bandstoot-golven/` |
| Suomi | `/fi/pelit/aallot/kaikuluotain/` | `/fi/pelit/aallot/vallikimmokkeet/` |
| Norsk bokmål | `/nb/spill/bolger/ekkolodd/` | `/nb/spill/bolger/vantstot-med-bolger/` |
| Dansk | `/da/spil/bolger/ekkolod/` | `/da/spil/bolger/bandestod-med-bolger/` |
| Português | `/pt/jogos/ondas/sonda-de-eco/` | `/pt/jogos/ondas/tabela-de-ondas/` |
| हिन्दी | `/hi/khel/tarangen/goonj-mapi/` | `/hi/khel/tarangen/takkar-se-laherein/` |
| 日本語 | `/ja/gemu/nami/kodama-sokutei/` | `/ja/gemu/nami/hansha-no-kusshon/` |

**Echo Sounder**: a ship over the sea (with a shoal of fish in one test), a bat and a moth, or a person and a cliff. The ping spreads out as circles and each echo spreads back from what it hit; a scale is shown in metres. The right panel is what the receiver hears: the ping, then a burst for each echo labelled with its time, with guessed echo times dashed in orange. Time is in milliseconds, slowed so each run takes 4 s and ends as the last echo returns. Missions ask for the depth from a 0.4 s echo at 1500 m/s (300 m), a moth from a 0.01 s echo at 340 m/s (1.7 m), the echo time from a cliff 85 m away (0.5 s), the speed of sound from a 0.8 s echo where the sea is 600 m deep (1500 m/s), and how high a shoal swims above the seabed from echoes at 0.1 s and 0.4 s (225 m). Answers within 2% are right. Slips caught: v·t without halving, v ÷ t, the speed of sound in air for sonar, centimetres, the one-way time, v ÷ 2d, one way only for the speed, d·t, v·Δt without halving, and the fish's or the seabed's depth.

**Bank Shot Ripples**: two scenes. A wave tank from above, 8 m by 4 m with the wall along the bottom: a ripple packet runs from A, bounces, and traces its path; the right panel is a close-up of the bounce with both angles. A rope from the side, 6 m from the hand to a clamped end or a ring on a pole, with a marked point 1.5 m along; the right panel plots the marked point's height. Missions ask for the angle out for a ripple arriving at 35° to the wall (35°), where to hit the wall to get from A (2 m out) to B (1 m out, 6 m along) (4 m), the height of a 5 cm pulse back from a fixed end (−5 cm) and from a free end (+5 cm), and the round trip on a 6 m rope at 4 m/s (3 s). Answers within 2% are right; heights take a sign. Slips caught: 90° − θ, 180° − θ, 2θ, halfway, the swapped split, upright from a fixed end, inverted from a free end, double height, one way, L·v, and v ÷ 2L.

- `verify-echo.cjs`, `verify-bank.cjs`: model checks (out-and-back paths, echoes heard on time, equal angles in and out, the bank shot reaching B, the fixed end staying still and returning −5 cm, the free end returning +5 cm, timestep independence, rounding margins, slip detection, scoring, input validation including signed heights, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Refraction games: Shallow Beach, Spearfishing

Two more Waves games (plan items 15 and 16 in `WAVES_HANDOFF.md`) are about refraction: sea waves that slow down and bend over a sandbank, and light that bends at a water surface, sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂ = n₂ ÷ n₁. They follow Bank Shot Ripples in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts. Angles are measured from the normal.

| Language | Shallow Beach | Spearfishing |
| --- | --- | --- |
| English | `/games/waves/shallow-beach/` | `/games/waves/spearfishing/` |
| Español | `/es/juegos/ondas/playa-poco-profunda/` | `/es/juegos/ondas/pesca-con-arpon/` |
| Français | `/fr/jeux/ondes/plage-peu-profonde/` | `/fr/jeux/ondes/peche-au-harpon/` |
| Deutsch | `/de/spiele/wellen/flacher-strand/` | `/de/spiele/wellen/speerfischen/` |
| Nederlands | `/nl/spellen/golven/ondiep-strand/` | `/nl/spellen/golven/speervissen/` |
| Suomi | `/fi/pelit/aallot/matala-ranta/` | `/fi/pelit/aallot/harppuunakalastus/` |
| Norsk bokmål | `/nb/spill/bolger/grunn-strand/` | `/nb/spill/bolger/harpunfiske/` |
| Dansk | `/da/spil/bolger/lavvandet-strand/` | `/da/spil/bolger/harpunfiskeri/` |
| Português | `/pt/jogos/ondas/praia-rasa/` | `/pt/jogos/ondas/pesca-submarina/` |
| हिन्दी | `/hi/khel/tarangen/uthla-kinara/` | `/hi/khel/tarangen/bhale-se-machhli/` |
| 日本語 | `/ja/gemu/nami/asase-no-hama/` | `/ja/gemu/nami/mori-de-sakana/` |

**Shallow Beach**: the sea from above, 40 m by 30 m, deep water on the left and a sandbank beyond a straight edge at 20 m. Crests are drawn where the phase is a whole number, continuous across the edge, so they bunch up and swing round as they cross; the waves' path and the normal are drawn. The right panel is a side view along the path: the water's surface, with crests closer together over the raised seabed. Each run shows three periods (6 s), paced ×1.5. Missions ask for the wavelength over the sandbank for 10 m waves slowing from 5 to 3 m/s (6 m), their frequency there (0.5 Hz), the angle over the sandbank for waves arriving at 30° (17.5°), the speed of 6 m/s waves that bend from 40° to 25° (3.94 m/s), and the depth for 3 m/s shallow-water waves (0.92 m). Answers within 2% are right. Slips caught: the inverted ratio, no change, subtracting speeds, frequency slowed or raised with the speed, scaling the angle itself, bending away from the normal, no bend, the inverted speed, the angles for their sines, v ÷ g, g·v², and v².

**Spearfishing**: a side view of air over water (or a clear liquid). The depth tests show a fish, your eye, and the ray from the fish bending at the surface; once traced, the fish's image is drawn where it seems to be, with a depth scale. The angle tests show a laser ray crossing the surface; the critical test sweeps an underwater lamp's ray from 0° to 80°, refracting out until the critical angle and then reflecting back. The right panel is a close-up of the crossing with both angles. Each run lasts 3 s, paced ×0.75. Missions ask for the real depth of a fish that looks 1 m deep (1.33 m), the angle in water for a ray entering at 45° (32.1°), how far below its image a fish that looks 0.9 m deep really is (0.30 m), the index of a liquid that bends 60° to 35° (1.51), and the critical angle for water (48.8°). Answers within 2% are right. Slips caught: dividing by n, no change, scaling the angle itself, bending away from the normal, no bend, the real depth for the gap, the gap the wrong way, the apparent depth, the ratio of angles, the inverted index, the angle from the surface, and sin θ_c for θ_c.

- `verify-beach.cjs`, `verify-spear.cjs`: model checks (Snell's law, crests continuous across the edge and spaced by the local wavelength, crests counted onto the sandbank, real and apparent depth, the ray escaping until the critical angle and reflecting after it, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Interference games: Two Speakers, Beat Tuner

Two more Waves games (plan items 17 and 18 in `WAVES_HANDOFF.md`) are about interference: two speakers playing the same note, which add up or cancel depending on the path difference, and two close notes that drift in and out of step in time, which makes beats. They follow Spearfishing in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts.

| Language | Two Speakers | Beat Tuner |
| --- | --- | --- |
| English | `/games/waves/two-speakers/` | `/games/waves/beat-tuner/` |
| Español | `/es/juegos/ondas/dos-altavoces/` | `/es/juegos/ondas/afinador-de-pulsaciones/` |
| Français | `/fr/jeux/ondes/deux-haut-parleurs/` | `/fr/jeux/ondes/accordeur-a-battements/` |
| Deutsch | `/de/spiele/wellen/zwei-lautsprecher/` | `/de/spiele/wellen/schwebungs-stimmer/` |
| Nederlands | `/nl/spellen/golven/twee-luidsprekers/` | `/nl/spellen/golven/zwevingsstemmer/` |
| Suomi | `/fi/pelit/aallot/kaksi-kaiutinta/` | `/fi/pelit/aallot/huojuntaviritin/` |
| Norsk bokmål | `/nb/spill/bolger/to-hoyttalere/` | `/nb/spill/bolger/svevningsstemmer/` |
| Dansk | `/da/spil/bolger/to-hojttalere/` | `/da/spil/bolger/svaevningsstemmer/` |
| Português | `/pt/jogos/ondas/dois-alto-falantes/` | `/pt/jogos/ondas/afinador-de-batimentos/` |
| हिन्दी | `/hi/khel/tarangen/do-loudspeaker/` | `/hi/khel/tarangen/vispand-tuner/` |
| 日本語 | `/ja/gemu/nami/futatsu-no-supika/` | `/ja/gemu/nami/unari-de-chosei/` |

**Two Speakers**: a room seen from above, with two speakers 3 m apart on the left and sound at 340 m/s. The sum of both waves is drawn as a field, slowed to one vibration a second: bright and dark where they add, grey where they cancel. A microphone walks along a line 4 m in front of the speakers, from the middle outwards, over a 4 s run; the right panel graphs the loudness at the microphone, |cos(π·Δd ÷ λ)|, against the path difference, with dips at the quiet spots. One test wires a speaker backwards, which swaps loud and quiet. Missions ask for the path difference at the first quiet spot for 340 Hz (0.5 m) and at the second (1.5 m), the note when the first loud spot beyond the middle is at 0.85 m (400 Hz), the first loud spot with a reversed speaker at 680 Hz (0.25 m), and the wavelength when the second quiet spot is at 0.75 m (0.5 m). Answers within 2% are right. Slips caught: a whole wavelength for quiet, a quarter wave, the loud spot between, two wavelengths, the first quiet spot for the second, half a wave for a loud spot, v·λ, λ ÷ v, the in-phase answer with a reversed speaker, a quarter-wave shift, the path difference for the wavelength, the first quiet spot's factor, and half the path difference.

**Beat Tuner**: two notes and the sound they make together, drawn scrolling over the last 2 s with its fast vibration slowed far down and its loudness envelope at the real beat rate; a loudness bar swells and fades with each beat. The right panel graphs the loudness over the whole run, with your answer as a dashed orange pattern. In the two tuning tests the string is retuned halfway through the run. Runs last 4 s (the counting test 2 s, paced ×0.5). Missions ask for the beats a second of 440 Hz and 444 Hz (4), how far to lower a 444 Hz string to first hear 1 beat a second against 440 Hz (3 Hz), the time between beats of 440 Hz and 442.5 Hz (0.4 s), how far off a string is that beats 3 times a second and 5 after tightening (+3 Hz, sharp), and the pitch gap when 6 beats are counted in 2 s (3 Hz). Answers within 2% are right. Slips caught: adding the notes, their average, half the difference, tuning all the way to 440 Hz, going past it to 439 Hz, the beat rate for the change, the rate for the time, one vibration of the note, half a beat, the wrong side, the beat rate after tightening, the count for the rate, count × time, and time ÷ count.

- `verify-speakers.cjs`, `verify-beats.cjs`: model checks (path differences along the microphone's line, silence at half a wavelength and loudness at whole ones, a reversed speaker swapping them, the drawn field cancelling at a quiet spot, beat rates from the frequency difference, the envelope continuous when a string is retuned, beats counted, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages. All run in `npm test`.

## Diffraction games: Harbour Gap, Laser Slit

Two more Waves games (plan items 19 and 20 in `WAVES_HANDOFF.md`) are about diffraction: sea waves spreading through a gap in a harbour wall, and laser light spreading through a narrow slit. Both use the first dark (calm) direction of a single gap, sin θ = λ ÷ a, which on a distant screen becomes y = λ·L ÷ a. They follow Beat Tuner in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts, and the asked quantity stays hidden (shown as ?) until the run ends.

| Language | Harbour Gap | Laser Slit |
| --- | --- | --- |
| English | `/games/waves/harbour-gap/` | `/games/waves/laser-slit/` |
| Español | `/es/juegos/ondas/bocana-del-puerto/` | `/es/juegos/ondas/rendija-laser/` |
| Français | `/fr/jeux/ondes/passe-du-port/` | `/fr/jeux/ondes/fente-laser/` |
| Deutsch | `/de/spiele/wellen/hafeneinfahrt/` | `/de/spiele/wellen/laserspalt/` |
| Nederlands | `/nl/spellen/golven/haveningang/` | `/nl/spellen/golven/laserspleet/` |
| Suomi | `/fi/pelit/aallot/sataman-suu/` | `/fi/pelit/aallot/laserrako/` |
| Norsk bokmål | `/nb/spill/bolger/havneapningen/` | `/nb/spill/bolger/laserspalte/` |
| Dansk | `/da/spil/bolger/havneabningen/` | `/da/spil/bolger/laserspalte/` |
| Português | `/pt/jogos/ondas/entrada-do-porto/` | `/pt/jogos/ondas/fenda-laser/` |
| हिन्दी | `/hi/khel/tarangen/bandargah-ka-muhana/` | `/hi/khel/tarangen/laser-jhiri/` |
| 日本語 | `/ja/gemu/nami/minato-no-iriguchi/` | `/ja/gemu/nami/reza-to-suritto/` |

**Harbour Gap**: a harbour seen from above, stretched to fill the scene: straight waves come in from the open sea on the left, pass a gap in the wall, and spread out behind it, drawn as the far-field pattern |sin β ÷ β| with β = π·a·sin θ ÷ λ and slowed to one crest a second. Three moored boats at 15°, 30°, and 50° rock with the water where they are. A wave gauge sweeps from straight ahead (0°) to the wall (90°) over a 4 s run, and the right panel graphs wave height against angle. Your answer is drawn as dashed orange calm directions (and orange marks for a gap). Missions ask for the first calm direction for 10 m waves through a 20 m gap (30°), the gap that puts a boat at 30° in it for 6 m waves (12 m), the wavelength when the calm direction behind a 14 m gap is at 35° (8.03 m), the widest gap with no calm direction for 15 m waves (15 m), and the calm direction for waves at 5 m/s every 2 s through a 25 m gap (23.6°). Answers within 2% are right. Slips caught: sin θ for θ, the tangent, the angle from the wall, λ·sin θ, the tangent or cosine for the gap, one wavelength for the gap, a ÷ sin θ, the tangent or cosine for the wavelength, half or twice the wavelength, the speed as the wavelength, and v ÷ T.

**Laser Slit**: a laser, a slit, and a screen from above, not to scale (metres along the beam, millimetres across the screen). The beam reaches the slit by 0.8 s and spreads to the screen by 2 s; the screen then shows the bands in the laser's colour (the square root of (sin β ÷ β)², so the faint bands show), and a light meter moves out to three dark bands by 4 s while the right panel graphs brightness against distance from the centre. Your answer is drawn as orange marks at the dark bands it implies. Missions ask for the first dark band of a 650 nm laser through a 0.1 mm slit 2 m from the screen (13 mm, the plan's example), the central band's width for 532 nm, 0.2 mm, 1.5 m (7.98 mm), the slit when the first dark band of 650 nm light 2 m away is at 20 mm (0.065 mm), the wavelength when a 0.15 mm slit 3 m away puts it at 9 mm (450 nm), and the second dark band for 650 nm, 0.2 mm, 2.4 m (15.6 mm). Answers within 2% are right. Slips caught: the band's width for the dark band, half the distance, metres for mm, half or twice the width, the full width read as y, y ÷ (λ·L), the second band for the first, a doubled wavelength, micrometres for nm, the first band for the second, the first faint bright band, and four times the first.

- `verify-harbour.cjs`, `verify-slit.cjs`: model checks (calm directions at sin θ = λ ÷ a with zero height, height 2 ÷ π halfway in sine, the drawn sea calm along the calm direction and continuous through the gap, evenly spaced dark bands, the faint first bright band, the light's arrival and the meter's sweep, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages, including the hidden asked reading. All run in `npm test`.

## Doppler games: Ambulance Pass-by, Paddling Duck

Two more Waves games (plan items 21 and 22 in `WAVES_HANDOFF.md`) are about the Doppler effect of a moving source: a siren's pitch rising and falling as an ambulance passes, and the ripples of a paddling duck crowding ahead and spreading behind, up to the bow wave of a duck faster than its ripples. They follow Laser Slit in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts, and the asked quantity stays hidden (shown as ?) until the run ends.

| Language | Ambulance Pass-by | Paddling Duck |
| --- | --- | --- |
| English | `/games/waves/ambulance-pass-by/` | `/games/waves/paddling-duck/` |
| Español | `/es/juegos/ondas/paso-de-la-ambulancia/` | `/es/juegos/ondas/pato-nadador/` |
| Français | `/fr/jeux/ondes/passage-ambulance/` | `/fr/jeux/ondes/canard-nageur/` |
| Deutsch | `/de/spiele/wellen/krankenwagen/` | `/de/spiele/wellen/paddelnde-ente/` |
| Nederlands | `/nl/spellen/golven/ambulance/` | `/nl/spellen/golven/peddelende-eend/` |
| Suomi | `/fi/pelit/aallot/ambulanssi/` | `/fi/pelit/aallot/uiva-sorsa/` |
| Norsk bokmål | `/nb/spill/bolger/ambulansen/` | `/nb/spill/bolger/padlende-and/` |
| Dansk | `/da/spil/bolger/ambulancen/` | `/da/spil/bolger/padlende-and/` |
| Português | `/pt/jogos/ondas/ambulancia-passando/` | `/pt/jogos/ondas/pato-nadador/` |
| हिन्दी | `/hi/khel/tarangen/ambulance-ki-siren/` | `/hi/khel/tarangen/tairti-battakh/` |
| 日本語 | `/ja/gemu/nami/kyukyusha-no-sairen/` | `/ja/gemu/nami/ahiru-no-hamon/` |

**Ambulance Pass-by**: a street from above, stretched to fill the scene, with an ambulance driving right and a listener at each end. Each third of a second the siren sends out a circular crest from where it is; sound is drawn far slower than real but with the true ratio v_s ÷ v, so the crests bunch up ahead and spread behind. The right panel graphs the pitch heard by someone 10 m from the road, from 2 s before the ambulance passes to 2 s after, using the speed at which it comes closer (no sound delay), with the pitches ahead and behind and the siren's own note as dashed guides and your answer as a dashed orange line. Missions ask for the pitch of a 700 Hz siren coming at 30 m/s (768 Hz), going away at 30 m/s (643 Hz; the plan said 642, but 700 × 340 ÷ 370 = 643.2), the speed when 700 Hz is heard as 750 Hz (22.7 m/s), the real note of a siren heard at 680 Hz while leaving at 20 m/s (720 Hz), and the speed for an octave higher (170 m/s). Answers within 2% are right. Slips caught: the leaving formula, adding the speed, the approaching formula, subtracting the speed, the pitch difference for the speed, dividing by f or by f + f', the wrong sign, adding Hz, the speed of sound, v ÷ 3 (1.5 times higher), and twice the speed of sound. The moving-listener formulas are too close (under 2%) at these speeds to be told apart, so they are not slips.

**Paddling Duck**: a pond from above, 240 cm by 160 cm, at real speed. The duck paddles f times a second and each paddle sends out a ring at v from where the duck is; the rings crowd ahead and spread behind, and a duck faster than its ripples trails a V. The right panel is a side view along the path, with a peak wherever a ring crosses it. Your answer is drawn as orange marks a guessed spacing apart (ahead or behind) or as a dashed orange V. Missions ask for the spacing ahead of a duck at 10 cm/s paddling at 2 Hz with ripples at 30 cm/s (10 cm), the spacing behind at 15 cm/s, 2.5 Hz, 25 cm/s (16 cm), the duck's speed when ripples ahead are 6 cm apart at 3 Hz (12 cm/s), the bow wave of a 50 cm/s duck with 25 cm/s ripples (30°), and the paddling rate when ripples behind a 6 cm/s duck are 12 cm apart (3 Hz). Answers within 2% are right. Slips caught: the other side's spacing, still water, multiplying by f, λ'·f for the speed, λ' ÷ f, the spacing difference, the complement, sin θ for θ, the tangent, ignoring the duck, the wrong side, and multiplying by the spacing.

- `verify-ambulance.cjs`, `verify-duck.cjs`: model checks (pitch ahead and behind, the roadside glide falling steadily through the siren's own note, the ring spacing ahead and behind measured from the drawn rings, every ring touching the bow wave, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages, including the hidden asked reading. All run in `npm test`.

## Sound games: Decibel Meter, Bottle Flute

The last two Waves games of the plan (items 23 and 24 in `WAVES_HANDOFF.md`) are about sound: levels in decibels, and the notes of a pipe closed at one end. They follow Paddling Duck in the topic's playing order. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until a run starts, and the asked quantity stays hidden (shown as ?) until the run ends.

| Language | Decibel Meter | Bottle Flute |
| --- | --- | --- |
| English | `/games/waves/decibel-meter/` | `/games/waves/bottle-flute/` |
| Español | `/es/juegos/ondas/sonometro/` | `/es/juegos/ondas/flauta-de-botella/` |
| Français | `/fr/jeux/ondes/sonometre/` | `/fr/jeux/ondes/flute-bouteille/` |
| Deutsch | `/de/spiele/wellen/schallpegelmesser/` | `/de/spiele/wellen/flaschenfloete/` |
| Nederlands | `/nl/spellen/golven/decibelmeter/` | `/nl/spellen/golven/flessenfluit/` |
| Suomi | `/fi/pelit/aallot/desibelimittari/` | `/fi/pelit/aallot/pullohuilu/` |
| Norsk bokmål | `/nb/spill/bolger/desibelmaler/` | `/nb/spill/bolger/flaskefloyte/` |
| Dansk | `/da/spil/bolger/decibelmaler/` | `/da/spil/bolger/flaskefloejte/` |
| Português | `/pt/jogos/ondas/decibelimetro/` | `/pt/jogos/ondas/flauta-de-garrafa/` |
| हिन्दी | `/hi/khel/tarangen/decibel-meter/` | `/hi/khel/tarangen/botal-ki-bansuri/` |
| 日本語 | `/ja/gemu/nami/souon-kei/` | `/ja/gemu/nami/bin-no-fue/` |

**Decibel Meter**: speakers on the left sending out rings that brighten with the level, a sound level meter on a distance scale, and a dial from 0 to 120 dB whose number shows ? while the level is the answer. Each run changes one thing over 3.5 s (speakers switching on one by one, the meter carried away, the power or the intensity turned up) and then holds; the right panel graphs the level over the run, with your answer as a dashed orange level (or the time the meter passes your distance). Missions ask for ten 60 dB speakers together (70 dB), a 80 dB mower heard from 4 m instead of 2 m (74.0 dB), how many times more intense 90 dB is than 60 dB (1000), the level of 10⁻⁵ W/m² (70 dB), and how far from a 110 dB concert at 10 m the level is 90 dB (100 m). Answers within 2% are right. Slips caught: multiplying the level, +3 dB for ten times, halving the decibels, 1 ÷ r instead of 1 ÷ r², 10 dB for doubling the distance, the dB difference for the ratio, bels for the ratio, the ratio of levels, bels for decibels, the natural log, leaving out I₀, doubling the distance, the intensity ratio as the distance ratio, and adding dB to metres.

**Bottle Flute**: a bottle from the side with water at the bottom and the air column above it swinging as a quarter wave (three quarters for the next note), drawn slowed down, with breath across the neck; in two tests water pours in over 3.5 s and the note rises. The right panel graphs f = v ÷ 4L against the column length with the bottle's path along it, and your answer as a dashed orange water line. Missions ask for the note of a 20 cm column (425 Hz, the plan's example), a 30 cm bottle with 13 cm of water (500 Hz), the column for 340 Hz (25 cm), the water for 680 Hz in a 32 cm bottle (19.5 cm), and the next note up from a 20 cm column (1275 Hz). Answers within 2% are right. Slips caught: the open pipe, cm for m, a whole wavelength, the whole bottle, the water's depth, open-pipe and full-wave lengths, metres for cm, the air column for the water, the open-pipe fill, adding lengths, the even harmonic, the fundamental, and dividing by 3. The model text says real bottles act partly as Helmholtz resonators and sound lower.

- `verify-decibel.cjs`, `verify-bottle.cjs`: model checks (levels from intensity and distance ratios, the speakers switching on, a quarter wave in the column at every moment, water pouring in, odd harmonics, timestep independence, rounding margins, slip detection, scoring, input validation, state transfer) and localized interface checks in all eleven languages, including the hidden asked reading. All run in `npm test`.

## Electrostatics games: Static Rub, Oil Drop

A new topic, Electrostatics (*electrostática*), opens the Electricity plan in `ELECTRICITY_PLAN.md` (items 1 and 2, the subtopic *carga eléctrica*). Charge is electrons moved from one place to another, never made or destroyed, and it always comes in whole electrons: Q = n·e with e = 1.602 × 10⁻¹⁹ C. Answers are typed, in scientific notation where they are tiny (`3.2e-19`); a run counts as an attempt as soon as it starts; readings stay hidden until a run starts. The 2% window is purely relative, because a charge near 10⁻¹⁹ C would fit inside the family's usual absolute slack. Both pages use two opt-in fields of the page generator: `sci` writes very small and very large values as a × 10ⁿ, and `css` adds page styles (here, Arabic test cards take the direction of their first letter so a trailing e⁻ stays put).

| Language | Static Rub | Oil Drop |
| --- | --- | --- |
| English | `/games/electrostatics/static-rub/` | `/games/electrostatics/oil-drop/` |
| Español | `/es/juegos/electrostatica/frotar-el-globo/` | `/es/juegos/electrostatica/gota-de-millikan/` |
| Français | `/fr/jeux/electrostatique/ballon-frotte/` | `/fr/jeux/electrostatique/goutte-de-millikan/` |
| Deutsch | `/de/spiele/elektrostatik/ballon-reiben/` | `/de/spiele/elektrostatik/millikan-tropfen/` |
| Nederlands | `/nl/spellen/elektrostatica/ballon-wrijven/` | `/nl/spellen/elektrostatica/millikan-druppel/` |
| Suomi | `/fi/pelit/sahkostatiikka/ilmapallon-hankaus/` | `/fi/pelit/sahkostatiikka/millikanin-pisara/` |
| Norsk bokmål | `/nb/spill/elektrostatikk/gni-ballongen/` | `/nb/spill/elektrostatikk/millikans-drape/` |
| Dansk | `/da/spil/elektrostatik/gnid-ballonen/` | `/da/spil/elektrostatik/millikans-draabe/` |
| Português | `/pt/jogos/eletrostatica/esfregar-o-balao/` | `/pt/jogos/eletrostatica/gota-de-millikan/` |
| हिन्दी | `/hi/khel/sthir-vidyut/gubbara-ragadna/` | `/hi/khel/sthir-vidyut/millikan-boond/` |
| 日本語 | `/ja/gemu/seidenki/fusen-masatsu/` | `/ja/gemu/seidenki/mirikan-no-yuteki/` |
| Svenska | `/sv/spel/elektrostatik/gnid-ballongen/` | `/sv/spel/elektrostatik/millikans-droppe/` |
| Italiano | `/it/giochi/elettrostatica/strofina-il-palloncino/` | `/it/giochi/elettrostatica/goccia-di-millikan/` |
| Română | `/ro/jocuri/electrostatica/freaca-balonul/` | `/ro/jocuri/electrostatica/picatura-lui-millikan/` |
| Polski | `/pl/gry/elektrostatyka/pocieranie-balonu/` | `/pl/gry/elektrostatyka/kropla-millikana/` |
| Türkçe | `/tr/oyunlar/elektrostatik/balon-surtme/` | `/tr/oyunlar/elektrostatik/millikan-damlasi/` |
| العربية | `/ar/alab/kahraba-sakina/dalk-albalun/` | `/ar/alab/kahraba-sakina/qatrat-miliken/` |

**Static Rub**: a balloon rubbed on a wool jumper, a comb and hair, a dust grain, or a carbon atom. Electrons (sky, −) move at a steady rate for 2 s, one at a time onto the grain over 3 s, or one after the other off the atom; each moving mark stands for a tenth of the electrons, and its + partner stays behind. Toggling the neutral pairs shows every + − pair or only the charge left over. The right panel plots both charges over time, mirror images whose dashed sum stays 0, or the electrons moved. Tests: the balloon's charge (−480.6 nC), the wool's (+480.6 nC), the electrons on a comb at −8 nC (4.994 × 10¹⁰), the electrons on a dust grain reading −2.4 × 10⁻¹⁸ C (15), and the charge of a carbon atom that loses 2 electrons (+3.204 × 10⁻¹⁹ C).

**Oil Drop**: Millikan's experiment. Plates d apart, top one positive, ramp to their voltage over 2 s and hold 2 s; an oil drop (886 kg/m³) with extra electrons moves at its terminal speed at every instant, v = (q·V ÷ d − m·g) ÷ (6π·η·r), in closed form, and sticks to a plate it reaches at the exact moment it gets there. A to-scale inset shows the whole gap; a magnified microscope view with a 0.1 mm grid shows the drop with its weight (orange), electric force (sky), and velocity (white). An orange drop carries the charge your answer gives it; the right panel plots the height over time, or a charge ladder whose orange rungs are the multiples of your e. Tests: the charge of a drop hovering at 1000 V (3.205 × 10⁻¹⁹ C), its electrons (2), the voltage that holds 3 electrons on 4.9 × 10⁻¹⁵ kg across 1.2 cm (1199 V), e from drops of 4.8, 8.0, and 11.2 × 10⁻¹⁹ C (1.6 × 10⁻¹⁹ C), and the hovering voltage after a drop at 900 V catches a third electron (600 V).

- `verify-rubbing.cjs`, `verify-oildrop.cjs`: model checks (charges that always add to 0, whole electrons arriving and leaving exactly on time, the closed-form drop motion against small steps, hovering at the right voltage, the exact plate contact during and after the ramp, timestep independence, the purely relative window near 10⁻¹⁹ C, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Conductor games: Touch and Share, Material Tester

Items 3 and 4 of `ELECTRICITY_PLAN.md` (the subtopic *conductores y aislantes*) follow Oil Drop in the Electrostatics topic. In a metal, electrons move freely, so charge flows between touching conductors until they reach the same potential; in an insulator it doesn't move at all. How well a material conducts is its resistivity, which spans about twenty powers of ten from copper to glass. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until then; the 2% window is purely relative.

| Language | Touch and Share | Material Tester |
| --- | --- | --- |
| English | `/games/electrostatics/touch-and-share/` | `/games/electrostatics/material-tester/` |
| Español | `/es/juegos/electrostatica/tocar-y-repartir/` | `/es/juegos/electrostatica/probador-de-materiales/` |
| Français | `/fr/jeux/electrostatique/toucher-et-partager/` | `/fr/jeux/electrostatique/testeur-de-materiaux/` |
| Deutsch | `/de/spiele/elektrostatik/beruehren-und-teilen/` | `/de/spiele/elektrostatik/materialpruefer/` |
| Nederlands | `/nl/spellen/elektrostatica/aanraken-en-delen/` | `/nl/spellen/elektrostatica/materiaaltester/` |
| Suomi | `/fi/pelit/sahkostatiikka/kosketa-ja-jaa/` | `/fi/pelit/sahkostatiikka/materiaalitesteri/` |
| Norsk bokmål | `/nb/spill/elektrostatikk/ta-og-del/` | `/nb/spill/elektrostatikk/materialtester/` |
| Dansk | `/da/spil/elektrostatik/roer-og-del/` | `/da/spil/elektrostatik/materialetester/` |
| Português | `/pt/jogos/eletrostatica/tocar-e-dividir/` | `/pt/jogos/eletrostatica/testador-de-materiais/` |
| हिन्दी | `/hi/khel/sthir-vidyut/chhuo-aur-banto/` | `/hi/khel/sthir-vidyut/padarth-parikshak/` |
| 日本語 | `/ja/gemu/seidenki/furete-wakeru/` | `/ja/gemu/seidenki/zairyo-tester/` |
| Svenska | `/sv/spel/elektrostatik/rora-och-dela/` | `/sv/spel/elektrostatik/materialtestaren/` |
| Italiano | `/it/giochi/elettrostatica/tocca-e-dividi/` | `/it/giochi/elettrostatica/tester-di-materiali/` |
| Română | `/ro/jocuri/electrostatica/atinge-si-imparte/` | `/ro/jocuri/electrostatica/tester-de-materiale/` |
| Polski | `/pl/gry/elektrostatyka/dotknij-i-podziel/` | `/pl/gry/elektrostatyka/tester-materialow/` |
| Türkçe | `/tr/oyunlar/elektrostatik/dokun-ve-paylas/` | `/tr/oyunlar/elektrostatik/malzeme-testi/` |
| العربية | `/ar/alab/kahraba-sakina/lams-wa-taqsim/` | `/ar/alab/kahraba-sakina/fahis-almawad/` |

**Touch and Share**: metal spheres (and a plastic ball) on insulating stands, about one + or − mark per nC. Each contact is a 2.5 s leg: the pair moves together for 1 s, touches for 0.5 s, and parts for 1 s; the charge moves at the instant of contact and the electron flow is drawn as an arrow. Identical spheres share their total equally; plastic takes nothing; the big-and-small test joins spheres of radii 3 cm and 1 cm far apart with a long thin wire, so the charge splits in proportion to the radii (touching spheres of different sizes would share in a more complicated way, which the model text says). The right panel shows each sphere's charge as a bar, with the total that never changes. Tests: B after touching A at +12 nC (6 nC), A after touching B and then C (3 nC), A after touching a plastic ball (12 nC), the small sphere joined to a 3 cm sphere at +16 nC (4 nC), and C after A (+10) and B (−4) touch and B then touches C (1.5 nC).

**Material Tester**: a 12 V battery, a switch that closes at 0.5 s, an ammeter, and a sample between two clips; R = ρ·L ÷ A and I = V ÷ R with ideal wires and meter. Electrons move round the loop against the conventional current at a display speed set by log I. The right panel is a resistivity ladder from 10⁻⁹ to 10¹⁴ Ω·m (copper, aluminium, nichrome, graphite, glass, rubber) with an orange mark at the resistivity the answer implies. Tests: the current through 1 m of 0.5 mm² nichrome (5.455 A), through a 10 cm, 1 cm² glass rod (1.2 × 10⁻¹⁴ A), the length of 0.5 mm² nichrome for 10 Ω (4.545 m, the answer shapes the wire), the cross-section of 100 m of aluminium matching 1 mm² of copper (1.577 mm², the answer shapes the cable), and a pencil lead 6 cm long and 0.7 mm across (5.457 Ω).

- `verify-share.cjs`, `verify-tester.cjs`: model checks (charge conserved at every moment and moved only at the instant of contact, plastic taking nothing, the wire's 3 : 1 split, the switch closing exactly on time, target currents for a right length or area, the resistivity an answer implies, timestep independence, the purely relative window near 10⁻¹⁴ A, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Coulomb's law games: Floating Bead, Charge Tug

Items 5 and 6 of `ELECTRICITY_PLAN.md` (the subtopic *ley de Coulomb*) follow Material Tester in the Electrostatics topic. Two point charges push apart (same sign) or pull together (opposite signs) with F = k·q₁·q₂ ÷ r², k = 8.99 × 10⁹ N·m²/C², equal and opposite; forces from several charges add. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until then; the 2% window is purely relative.

| Language | Floating Bead | Charge Tug |
| --- | --- | --- |
| English | `/games/electrostatics/floating-bead/` | `/games/electrostatics/charge-tug/` |
| Español | `/es/juegos/electrostatica/cuenta-flotante/` | `/es/juegos/electrostatica/tira-y-afloja-de-cargas/` |
| Français | `/fr/jeux/electrostatique/perle-flottante/` | `/fr/jeux/electrostatique/tir-a-la-corde-des-charges/` |
| Deutsch | `/de/spiele/elektrostatik/schwebende-perle/` | `/de/spiele/elektrostatik/ladungs-tauziehen/` |
| Nederlands | `/nl/spellen/elektrostatica/zwevende-kraal/` | `/nl/spellen/elektrostatica/ladingtouwtrekken/` |
| Suomi | `/fi/pelit/sahkostatiikka/leijuva-helmi/` | `/fi/pelit/sahkostatiikka/varausten-koydenveto/` |
| Norsk bokmål | `/nb/spill/elektrostatikk/svevende-perle/` | `/nb/spill/elektrostatikk/ladningsdragkamp/` |
| Dansk | `/da/spil/elektrostatik/svaevende-perle/` | `/da/spil/elektrostatik/ladningstovtraekning/` |
| Português | `/pt/jogos/eletrostatica/conta-flutuante/` | `/pt/jogos/eletrostatica/cabo-de-guerra-de-cargas/` |
| हिन्दी | `/hi/khel/sthir-vidyut/tairta-moti/` | `/hi/khel/sthir-vidyut/aavesh-raskasi/` |
| 日本語 | `/ja/gemu/seidenki/uku-bizu/` | `/ja/gemu/seidenki/denka-tsunahiki/` |
| Svenska | `/sv/spel/elektrostatik/svavande-parla/` | `/sv/spel/elektrostatik/laddningsdragkampen/` |
| Italiano | `/it/giochi/elettrostatica/perlina-fluttuante/` | `/it/giochi/elettrostatica/tiro-alla-fune-delle-cariche/` |
| Română | `/ro/jocuri/electrostatica/margeaua-plutitoare/` | `/ro/jocuri/electrostatica/tragerea-sarcinilor/` |
| Polski | `/pl/gry/elektrostatyka/unoszacy-sie-koralik/` | `/pl/gry/elektrostatyka/przeciaganie-ladunkow/` |
| Türkçe | `/tr/oyunlar/elektrostatik/yuzen-boncuk/` | `/tr/oyunlar/elektrostatik/yuk-halat-cekme/` |
| العربية | `/ar/alab/kahraba-sakina/alkharaza-alaima/` | `/ar/alab/kahraba-sakina/shadd-alhabl-lilshuhnat/` |

**Floating Bead**: an upright glass tube 16 cm tall, to scale, with a bead fixed at the bottom and a second bead of the same sign on a thread. The thread's end comes down steadily from the cap to 0.6 cm in 2 s and holds 1 s, slowly enough that the bead is always in balance: the thread pulls T = m·g − F and goes slack exactly where F = m·g, at r* = √(k·q₁·q₂ ÷ m·g). A bead pushed harder than its weight at the top stays at the cap; one too heavy rests on the bottom bead. Arrows for the weight (orange, 40 px), the push (sky), and the thread (white) sit beside the tube at one scale; the right panel plots the push against the gap with the weight as a line, or force bars for the floor test. Your charge or mass is the one used when it is asked. Tests: the gap for two 40 nC beads under 1 g (3.831 cm), the charge that floats 1.5 g at 5 cm (63.94 nC), the gap when the top bead carries 80 nC (5.418 cm, √2 times), the floor's push on a 3 g bottom bead (39.2 mN, its weight plus the push), and the mass that floats at 2 cm on 30 nC (2.064 g).

**Charge Tug**: beads on a straight frictionless rod, to scale, with fixed beads in clamps and the asked bead on a force gauge that reads the force it holds back. The moving bead is brought in over 2 s and held 1 s; arrows show the net force on each bead at one scale per test. In the balance test a third +1 µC bead is held at your point and let go at 2 s: within 2% of the balance point it stays; otherwise it is pushed, drawn for 1 s as an illustration (between A and B it settles on the balance point, which is stable along the rod; beyond B it slides away). The right panel plots the held bead's force as the other comes in, or the net force on a +1 µC bead along the rod. Tests: the pull between +2 and −3 µC 0.3 m apart (0.599 N), the balance point between +4 µC at 0 and +1 µC at 0.9 m (0.6 m), the force on +1 µC at 0.1 m between +1 µC at 0 and −1 µC at 0.3 m (1.124 N, both to the right), B's charge when 5 µC pushes it with 1.8 N from 0.5 m (10.01 µC), and two +1 µC beads at 0.1 m (0.899 N) with both charges and the gap doubled (0.899 N).

- `verify-levitate.cjs`, `verify-coulomb.cjs`: model checks (the thread going slack exactly at r*, √2 times higher for twice one charge, the floor carrying weight plus push, the cap and touching cases, equal and opposite pulls growing as 1 ÷ r², zero force at the balance point with a push back toward it and away beyond B, the two forces on the middle bead adding, timestep independence, the purely relative window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Electric field games: Field Probe, Electron Beam

Items 7 and 8 of `ELECTRICITY_PLAN.md` (the subtopic *campo eléctrico*) follow Charge Tug in the Electrostatics topic. The electric field is the force per charge, E = F ÷ q: it belongs to the point, not to the probe, and a point charge makes E = k·Q ÷ r²; between two charged plates it is uniform, E = V ÷ d, and bends a beam into a parabola. Answers are typed (scientific notation such as `3e5` works); a run counts as an attempt as soon as it starts; readings stay hidden until then; the 2% window is purely relative.

| Language | Field Probe | Electron Beam |
| --- | --- | --- |
| English | `/games/electrostatics/field-probe/` | `/games/electrostatics/electron-beam/` |
| Español | `/es/juegos/electrostatica/sonda-de-campo/` | `/es/juegos/electrostatica/haz-de-electrones/` |
| Français | `/fr/jeux/electrostatique/sonde-de-champ/` | `/fr/jeux/electrostatique/faisceau-d-electrons/` |
| Deutsch | `/de/spiele/elektrostatik/feldsonde/` | `/de/spiele/elektrostatik/elektronenstrahl/` |
| Nederlands | `/nl/spellen/elektrostatica/veldsonde/` | `/nl/spellen/elektrostatica/elektronenbundel/` |
| Suomi | `/fi/pelit/sahkostatiikka/kenttaluotain/` | `/fi/pelit/sahkostatiikka/elektronisuihku/` |
| Norsk bokmål | `/nb/spill/elektrostatikk/feltsonde/` | `/nb/spill/elektrostatikk/elektronstrale/` |
| Dansk | `/da/spil/elektrostatik/feltsonde/` | `/da/spil/elektrostatik/elektronstraale/` |
| Português | `/pt/jogos/eletrostatica/sonda-de-campo/` | `/pt/jogos/eletrostatica/feixe-de-eletrons/` |
| हिन्दी | `/hi/khel/sthir-vidyut/kshetra-janchak/` | `/hi/khel/sthir-vidyut/electron-kiranpunj/` |
| 日本語 | `/ja/gemu/seidenki/denba-purobu/` | `/ja/gemu/seidenki/denshi-bimu/` |
| Svenska | `/sv/spel/elektrostatik/faltsond/` | `/sv/spel/elektrostatik/elektronstrale/` |
| Italiano | `/it/giochi/elettrostatica/sonda-di-campo/` | `/it/giochi/elettrostatica/fascio-di-elettroni/` |
| Română | `/ro/jocuri/electrostatica/sonda-de-camp/` | `/ro/jocuri/electrostatica/fasciculul-de-electroni/` |
| Polski | `/pl/gry/elektrostatyka/sonda-pola/` | `/pl/gry/elektrostatyka/wiazka-elektronow/` |
| Türkçe | `/tr/oyunlar/elektrostatik/alan-sondasi/` | `/tr/oyunlar/elektrostatik/elektron-demeti/` |
| العربية | `/ar/alab/kahraba-sakina/misbar-almajal/` | `/ar/alab/kahraba-sakina/hizmat-alilktronat/` |

**Field Probe**: a top view, to scale, of fixed point charges with a map of gray field arrows on a grid (pointing along E, their length on a log scale: 12 px longer for every factor of 10). A small positive probe on an insulating wand is carried steadily from 0.15 m below the point P up to it in 2 s and held 1 s; the gauge on the wand reads the force, and arrows at the probe show E (light) and F (sky) at a stated scale per test. The field leaves out the probe's own. The right panel plots F against the probe's charge at the probe's place (one line through 0 whose slope is E), E against the distance from the charge, or, for the dipole, E along the probe's path from each charge and in total. Tests: the field from 0.60 mN on 2.0 nC near a charged dome (3.0 × 10⁵ N/C; the dome's charge is not given), the field 0.30 m from +5.0 nC (499.4 N/C), the force on a 6.0 nC probe at the dome's point (1.8 mN), the field halfway between +4.0 and −4.0 nC 0.40 m apart (1798 N/C; 0 is accepted as the slip of cancelling), and where +10 nC makes 1000 N/C (0.2998 m; the answer sets where the probe goes, and the true ring appears after the run).

**Electron Beam**: a cathode-ray tube from the side, to scale: a gun 2 cm before two plates 2.0 cm apart and 5.0 cm long (+ on top), and a screen 7 cm past them with a mm ruler. Between the plates the field is uniform, E = V ÷ d, with no fringe; the particle keeps v₀ along the tube and accelerates at a = q·E ÷ m across it, a parabola in the plates and a line after them, and one whose bend reaches a plate stops on it at that exact moment. Gravity is ignored, and every test stays under 9% of the speed of light. Time is in ns; each run (5.6–7 ns) is slowed to about 4 s, with the factor on the canvas. Arrows: velocity white with its parts dashed, force sky (only between the plates), field gray from + to −; your answer becomes an orange dashed path, and the right panel plots the height inside the plates (in µm for the proton). Tests: the field for 500 V across 2.0 cm (25 000 V/m; the beam runs at 2.5 × 10⁷ m/s so it clears the plates), an electron's acceleration in 15 000 V/m (2.638 × 10¹⁵ m/s²), its bend at 2.0 × 10⁷ m/s through the plates (8.244 mm), the voltage that bends it 5.0 mm (182.0 V; the answer drives the plates, and above 363.9 V the beam lands on the + plate), and a proton's bend in the same beam (−4.489 µm, signed: down, about 1836 times less).

- `verify-fieldprobe.cjs`, `verify-deflect.cjs`: model checks (the probe's path, the field independent of the probe and F = q·E, 1 ÷ r², the dipole's fields adding along the middle line, the reach test's probe going to the answer, the beam's three phases and its exact plate hit, the proton bending the other way by mₚ ÷ mₑ, timestep independence, the purely relative window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Electric potential games: Potential Map, Particle Gun

Items 9 and 10 of `ELECTRICITY_PLAN.md` (the subtopic *potencial eléctrico*) close the Electrostatics games. Electric potential is energy per charge: a point charge makes V = k·Q ÷ r, potentials add as plain numbers, carrying a charge takes work W = q·ΔV whatever the path, and a charge that falls through ΔV gains kinetic energy q·ΔV = ½·m·v². Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until then; the 2% window is purely relative, with a window of 0.5 nJ for a work of 0.

| Language | Potential Map | Particle Gun |
| --- | --- | --- |
| English | `/games/electrostatics/potential-map/` | `/games/electrostatics/particle-gun/` |
| Español | `/es/juegos/electrostatica/mapa-de-potencial/` | `/es/juegos/electrostatica/canon-de-particulas/` |
| Français | `/fr/jeux/electrostatique/carte-de-potentiel/` | `/fr/jeux/electrostatique/canon-a-particules/` |
| Deutsch | `/de/spiele/elektrostatik/potenzialkarte/` | `/de/spiele/elektrostatik/teilchenkanone/` |
| Nederlands | `/nl/spellen/elektrostatica/potentiaalkaart/` | `/nl/spellen/elektrostatica/deeltjeskanon/` |
| Suomi | `/fi/pelit/sahkostatiikka/potentiaalikartta/` | `/fi/pelit/sahkostatiikka/hiukkastykki/` |
| Norsk bokmål | `/nb/spill/elektrostatikk/potensialkart/` | `/nb/spill/elektrostatikk/partikkelkanon/` |
| Dansk | `/da/spil/elektrostatik/potentialkort/` | `/da/spil/elektrostatik/partikelkanon/` |
| Português | `/pt/jogos/eletrostatica/mapa-de-potencial/` | `/pt/jogos/eletrostatica/canhao-de-particulas/` |
| हिन्दी | `/hi/khel/sthir-vidyut/vibhav-manchitra/` | `/hi/khel/sthir-vidyut/kan-top/` |
| 日本語 | `/ja/gemu/seidenki/den-i-mappu/` | `/ja/gemu/seidenki/ryushi-ju/` |
| Svenska | `/sv/spel/elektrostatik/potentialkarta/` | `/sv/spel/elektrostatik/partikelkanon/` |
| Italiano | `/it/giochi/elettrostatica/mappa-del-potenziale/` | `/it/giochi/elettrostatica/cannone-di-particelle/` |
| Română | `/ro/jocuri/electrostatica/harta-potentialului/` | `/ro/jocuri/electrostatica/tunul-de-particule/` |
| Polski | `/pl/gry/elektrostatyka/mapa-potencjalu/` | `/pl/gry/elektrostatyka/dzialo-czastek/` |
| Türkçe | `/tr/oyunlar/elektrostatik/potansiyel-haritasi/` | `/tr/oyunlar/elektrostatik/parcacik-topu/` |
| العربية | `/ar/alab/kahraba-sakina/kharitat-aljuhd/` | `/ar/alab/kahraba-sakina/midfa-aljusaymat/` |

**Potential Map**: a top view, to scale, shaded like a hill map (opaque cells from navy at 0 V to lighter at 300 V and above), with contour rings every 20 V found by marching squares; the rings and their labels appear once a run starts, because before that they would give the answer away. A +1 nC test charge is carried steadily along a dotted path for 2 s and held 1 s, with a voltmeter and a work counter, W = q·(V now − V at the start), beside it and the electric force on it as a sky arrow. The map is computed once per test, answer, size, and run state and redrawn from that cache. Your potential is drawn as an orange contour (or an orange ring at your distance); the right panel plots the potential along the path, with your level and a bracket for the work. Tests: the potential 0.30 m from +2.0 nC (59.93 V), the work to carry +1 nC from 0.30 to 0.10 m (119.9 nJ; the field's work, −119.9 nJ, is a slip), the work half way round the 0.30 m ring (0, within 0.5 nJ; the force is across the path the whole way), the potential halfway between +3.0 and +1.0 nC 0.40 m apart (179.8 V, which the model text contrasts with Field Probe's fields), and the radius of the 120 V contour around +4.0 nC (0.2997 m; the answer sets where the test charge goes).

**Particle Gun**: a side view, to scale, of a source, two grids 4.0 cm apart with their potentials and the uniform field between them, and a detector at 10 cm. The particle starts from rest at the first grid, speeds up steadily between the grids, and coasts to the detector; in the stopping test an electron arrives at 4.0 × 10⁶ m/s and is slowed by your voltage: it gets through slower, or stops inside and is pushed back out, and within 2% of the stopping voltage it stops exactly at the second grid so the motion always matches the verdict. Every speed stays under 7% of the speed of light. Time is in ns, slowed so each run lasts about 4 s (7.5 ns for the electron through 1000 V, 640 ns for the proton). An orange ghost moves at the speed your answer implies, and the right panel shows the electric potential energy U turning into kinetic energy K under a dashed total, in eV, with your energy as an orange line. Tests: an electron's energy through 1000 V (1.602 × 10⁻¹⁶ J), its speed through 250 V (9.377 × 10⁶ m/s), a proton's speed through 250 V (2.188 × 10⁵ m/s), an alpha particle's energy through 1000 V (2000 eV), and the voltage that stops an electron at 4.0 × 10⁶ m/s (45.49 V; the answer drives the grids).

- `verify-potmap.cjs`, `verify-accelerator.cjs`: model checks (the carried path, 1 ÷ r potentials, the work q·ΔV with none round the ring and the force across the path, potentials adding where fields partly cancel, the contour test's path to the answer, the speed-up and coasting phases, energy conservation, the proton √1836 times slower, getting through, turning back and stopping at the grid, timestep independence, the windows, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Voltage games: Battery Stack, Voltmeter Walk

Items 11 and 12 of `ELECTRICITY_PLAN.md` (the subtopic *voltaje*) open a new topic, Electric circuits (*circuitos eléctricos*), which will hold items 11–26. A voltage is energy per charge, and it is always between two points: cells in a row add their voltages, a cell turned round takes its voltage away, cells side by side give the voltage of one, a battery gives each coulomb it moves V joules (W = Q·V), and a voltmeter reads V_red − V_black. Both games follow the circuit contract in `DESIGN_GUIDELINES.md` §6t: mint arrows show the conventional current, from + to − outside the cells; sky dots marked − are electrons moving the other way at a display speed in step with the current; cells, wires, and meters are ideal; resistances are fixed; the current is steady at once; symbols follow IEC. Answers are typed; a run counts as an attempt as soon as it starts; readings stay hidden until then; the 2% window is purely relative, with 0.05 V for a reading of 0, and the cell count must be exact.

| Language | Battery Stack | Voltmeter Walk |
| --- | --- | --- |
| English | `/games/electric-circuits/battery-stack/` | `/games/electric-circuits/voltmeter-walk/` |
| Español | `/es/juegos/circuitos-electricos/torre-de-pilas/` | `/es/juegos/circuitos-electricos/paseo-con-voltimetro/` |
| Français | `/fr/jeux/circuits-electriques/tour-de-piles/` | `/fr/jeux/circuits-electriques/promenade-au-voltmetre/` |
| Deutsch | `/de/spiele/stromkreise/batterieturm/` | `/de/spiele/stromkreise/voltmeter-spaziergang/` |
| Nederlands | `/nl/spellen/stroomkringen/batterijtoren/` | `/nl/spellen/stroomkringen/voltmeterwandeling/` |
| Suomi | `/fi/pelit/virtapiirit/paristotorni/` | `/fi/pelit/virtapiirit/jannitemittarikavely/` |
| Norsk bokmål | `/nb/spill/stromkretser/batteritarn/` | `/nb/spill/stromkretser/voltmetertur/` |
| Dansk | `/da/spil/stromkredse/batteritaarn/` | `/da/spil/stromkredse/voltmetertur/` |
| Português | `/pt/jogos/circuitos-eletricos/torre-de-pilhas/` | `/pt/jogos/circuitos-eletricos/passeio-com-voltimetro/` |
| हिन्दी | `/hi/khel/vidyut-paripath/battery-minar/` | `/hi/khel/vidyut-paripath/voltmeter-ki-sair/` |
| 日本語 | `/ja/gemu/denki-kairo/denchi-tawa/` | `/ja/gemu/denki-kairo/denatsukei-sanpo/` |
| Svenska | `/sv/spel/stromkretsar/batteritorn/` | `/sv/spel/stromkretsar/voltmeterpromenad/` |
| Italiano | `/it/giochi/circuiti-elettrici/torre-di-pile/` | `/it/giochi/circuiti-elettrici/passeggiata-col-voltmetro/` |
| Română | `/ro/jocuri/circuite-electrice/turnul-de-baterii/` | `/ro/jocuri/circuite-electrice/plimbarea-cu-voltmetrul/` |
| Polski | `/pl/gry/obwody-elektryczne/wieza-z-baterii/` | `/pl/gry/obwody-elektryczne/spacer-z-woltomierzem/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/pil-kulesi/` | `/tr/oyunlar/elektrik-devreleri/voltmetre-yuruyusu/` |
| العربية | `/ar/alab/dawair-kahrabaiya/burj-albatariyat/` | `/ar/alab/dawair-kahrabaiya/jawlat-alfoltmitr/` |

**Battery Stack**: a cell holder under a loop with a switch and an IEC lamp; a voltmeter sits across the holder. The cells click in one after another over 2 s (a flipped one shows its + end on the left), count once they are fully in, and the switch closes at 2.5 s; the lamp glows with the power it takes (12 Ω for the 1.5 V tests, 36 Ω for the 9 V battery, 9 Ω for the count test, rated 9 V). The right panel climbs the potential cell by cell (a step down for a flipped cell, one shared step side by side), or, in the energy test, plots the energy given to the charge against the charge moved, with slope V. Tests: four 1.5 V cells in a row (6.0 V), the same with the third flipped (3.0 V), three side by side (1.5 V), the energy a 9 V battery gives 0.50 C (4.5 J; the switch is closed from 1 s to 3 s with 0.25 A), and the fewest 1.2 V cells for at least 9 V (8, giving 9.6 V; your number of cells, 1 to 20, goes into the holder and lights the lamp brightly or dimly).

**Voltmeter Walk**: an oblique view of the loop as a landscape of potential, height = potential with the gray floor at 0 V: cells are ramps up, resistors and bulbs ramps down by I·R, wires level, and an open switch a gap. The red and black probes walk onto their points over 2 s and the meter reads once both touch; the right panel unrolls the potential round the loop from the battery's − end, with both probes marked and your reading drawn as an orange level V_black + answer. Readings are signed, with a true minus. Tests: the probes swapped on a 9 V battery (−9 V), across an open switch with a bulb (9 V), along a connecting wire (0 V), the junction of 2 Ω and 4 Ω on 12 V against − (8 V), and a 9 V battery against a 1.5 V cell with 5 Ω, after both cells (7.5 V).

- `verify-batteries.cjs`, `verify-voltwalk.cjs`: model checks (cells counting only once fully in, series, flipped and parallel voltages, the lamp's current and power, the charge and energy W = Q·V in the switched window, the count test's holder and threshold, potentials round the loop, readings red minus black with their signs, no current through an open switch, the zero window, timestep independence, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Current games: Charge Gate, Snail Electrons

Items 13 and 14 of `ELECTRICITY_PLAN.md` (the subtopic *corriente*) follow Voltmeter Walk in the Electric circuits topic. A current is charge per second through a cut across the wire, I = Q ÷ t, so one ampere is 1 ÷ e = 6.242 × 10¹⁸ electrons a second; in copper (n = 8.5 × 10²⁸ free electrons per m³) that takes only a slow drift, I = n·e·A·v_d, while the signal that sets the electrons moving runs along the wire at about 2 × 10⁸ m/s. Both games keep the circuit contract (mint current arrows, sky electron dots marked − moving the other way) and answers within 2%, purely relative. Their tests run over very different times, so each test has its own clock unit (s, min, h, or ns) and a pace that makes every run last 4 s on screen, stated on the canvas as 1 s on screen = …; the page generator's opt-in `timeUnits` field lets the hooks set the time metric's unit per test.

| Language | Charge Gate | Snail Electrons |
| --- | --- | --- |
| English | `/games/electric-circuits/charge-gate/` | `/games/electric-circuits/snail-electrons/` |
| Español | `/es/juegos/circuitos-electricos/contador-de-carga/` | `/es/juegos/circuitos-electricos/electrones-caracol/` |
| Français | `/fr/jeux/circuits-electriques/compteur-de-charge/` | `/fr/jeux/circuits-electriques/electrons-escargots/` |
| Deutsch | `/de/spiele/stromkreise/ladungszaehler/` | `/de/spiele/stromkreise/schneckenelektronen/` |
| Nederlands | `/nl/spellen/stroomkringen/ladingteller/` | `/nl/spellen/stroomkringen/slakkenelektronen/` |
| Suomi | `/fi/pelit/virtapiirit/varauslaskuri/` | `/fi/pelit/virtapiirit/etanaelektronit/` |
| Norsk bokmål | `/nb/spill/stromkretser/ladningsteller/` | `/nb/spill/stromkretser/snegleelektroner/` |
| Dansk | `/da/spil/stromkredse/ladningstaeller/` | `/da/spil/stromkredse/snegleelektroner/` |
| Português | `/pt/jogos/circuitos-eletricos/contador-de-carga/` | `/pt/jogos/circuitos-eletricos/eletrons-caracol/` |
| हिन्दी | `/hi/khel/vidyut-paripath/aavesh-ganak/` | `/hi/khel/vidyut-paripath/ghongha-electron/` |
| 日本語 | `/ja/gemu/denki-kairo/denka-kaunta/` | `/ja/gemu/denki-kairo/katatsumuri-denshi/` |
| Svenska | `/sv/spel/stromkretsar/laddningsraknare/` | `/sv/spel/stromkretsar/snigelelektroner/` |
| Italiano | `/it/giochi/circuiti-elettrici/contatore-di-carica/` | `/it/giochi/circuiti-elettrici/elettroni-lumaca/` |
| Română | `/ro/jocuri/circuite-electrice/contorul-de-sarcina/` | `/ro/jocuri/circuite-electrice/electronii-melc/` |
| Polski | `/pl/gry/obwody-elektryczne/licznik-ladunku/` | `/pl/gry/obwody-elektryczne/elektrony-slimaki/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/yuk-sayaci/` | `/tr/oyunlar/elektrik-devreleri/salyangoz-elektronlar/` |
| العربية | `/ar/alab/dawair-kahrabaiya/addad-alshihna/` | `/ar/alab/dawair-kahrabaiya/alelektronat-alhalazuniya/` |

**Charge Gate**: a magnified wire with a dashed gate across it and a counter above the gate; electrons stream left through it (each dot stands for a thirtieth of the run's charge, stated on the canvas) while mint arrows show the current to the right, and the counter adds up the charge, or the electrons in the electron test. The right panel plots the count against time, with your current as an orange slope, your charge as an orange level, or your time as an orange line beside the 90 C target. Tests: 30 C in 1 min (0.50 A), 2.0 A for 5 min (600 C), the electrons per second in 1 A (6.242 × 10¹⁸, in 1 s), a phone charged at 2.0 A for 1.5 h (10800 C), and the time 0.25 A takes to carry 90 C (360 s; the run ends when 90 C has passed).

**Snail Electrons**: in three tests a magnified copper wire, 0.5 mm across the view, its height growing with √A, holds a faint ion lattice and electrons that jitter (thermal motion, not to scale) and drift left at their real speed, with one ringed and trailed and a 0.1 mm scale bar; the metre test shows 1 m of wire with the tagged electron crawling along it in hours; the signal test shows a battery, a switch closed at t = 0, and 3 m of wire to an IEC lamp, with the signal's glow running along the wire and the lamp lighting at 15 ns. The right panel plots the tagged electron's drift (with the 1 mm² wire dashed for comparison in the thick-wire test), the charge through a cross-section, or the signal's front against time, with your answer in orange. Tests: the drift of 1.0 A in 1.0 mm² (0.0734 mm/s, in real time), the time to drift 1 m (3.78 h), the current from 0.10 mm/s in 2.5 mm² (3.40 A), 1.0 A in 4.0 mm² (0.0184 mm/s), and the lamp 3 m away at 2.0 × 10⁸ m/s (15 ns).

- `verify-turnstile.cjs`, `verify-drift.cjs`: model checks (Q = I·t with each clock unit turned into seconds, the electrons per coulomb, I = n·e·A·v_d and the distance drifted in each unit, the signal's front and the lamp lighting when it arrives, the clock units and paces, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages, including the time metric's unit per test. Both run in `npm test`.

## Resistance games: Wire Stretcher, Hot Filament

Items 15 and 16 of `ELECTRICITY_PLAN.md` (the subtopic *resistencia*) follow Snail Electrons in the Electric circuits topic. A wire's resistance is R = ρ·L ÷ A, growing with its length and falling with its cross-section (A = π·d² ÷ 4 for a round wire), and a metal's resistance rises with temperature, R = R₀·(1 + α·(T − T₀)), a straight-line teaching model. Each change is made steadily over 2 s and held for 1 s while ideal meters follow it; answers within 2%, purely relative. Readings show 3 significant figures in Wire Stretcher, and 4 for results and 5 for meter readings in Hot Filament (rounded first, so a Pt100 reading of 119.25 Ω is shown as such).

| Language | Wire Stretcher | Hot Filament |
| --- | --- | --- |
| English | `/games/electric-circuits/wire-stretcher/` | `/games/electric-circuits/hot-filament/` |
| Español | `/es/juegos/circuitos-electricos/estirar-el-cable/` | `/es/juegos/circuitos-electricos/filamento-caliente/` |
| Français | `/fr/jeux/circuits-electriques/etirer-le-fil/` | `/fr/jeux/circuits-electriques/filament-chaud/` |
| Deutsch | `/de/spiele/stromkreise/draht-dehnen/` | `/de/spiele/stromkreise/heisser-gluehdraht/` |
| Nederlands | `/nl/spellen/stroomkringen/draad-rekken/` | `/nl/spellen/stroomkringen/hete-gloeidraad/` |
| Suomi | `/fi/pelit/virtapiirit/johdon-venytys/` | `/fi/pelit/virtapiirit/kuuma-hehkulanka/` |
| Norsk bokmål | `/nb/spill/stromkretser/strekk-ledningen/` | `/nb/spill/stromkretser/het-glodetrad/` |
| Dansk | `/da/spil/stromkredse/straek-ledningen/` | `/da/spil/stromkredse/varm-gloedetraad/` |
| Português | `/pt/jogos/circuitos-eletricos/esticar-o-fio/` | `/pt/jogos/circuitos-eletricos/filamento-quente/` |
| हिन्दी | `/hi/khel/vidyut-paripath/taar-khinchna/` | `/hi/khel/vidyut-paripath/garam-filament/` |
| 日本語 | `/ja/gemu/denki-kairo/harigane-nobashi/` | `/ja/gemu/denki-kairo/atsui-firamento/` |
| Svenska | `/sv/spel/stromkretsar/strack-traden/` | `/sv/spel/stromkretsar/het-glodtrad/` |
| Italiano | `/it/giochi/circuiti-elettrici/allunga-il-filo/` | `/it/giochi/circuiti-elettrici/filamento-caldo/` |
| Română | `/ro/jocuri/circuite-electrice/intinde-firul/` | `/ro/jocuri/circuite-electrice/filamentul-incins/` |
| Polski | `/pl/gry/obwody-elektryczne/rozciaganie-drutu/` | `/pl/gry/obwody-elektryczne/goracy-zarnik/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/teli-uzat/` | `/tr/oyunlar/elektrik-devreleri/sicak-filaman/` |
| العربية | `/ar/alab/dawair-kahrabaiya/shadd-alsilk/` | `/ar/alab/dawair-kahrabaiya/alfatil-alsakhin/` |

**Wire Stretcher**: a wire between two clamps on a bench with an ohmmeter wired to both; its drawn thickness follows its cross-section (18 px for 0.5 mm²) and the right-hand clamp moves with its end. The copper wire unrolls to 2 m; the nichrome wires of tests 2–4 have the sizes that give their starting resistances (3 Ω: 0.5 mm² and 1.36 m; 8 Ω: 0.4 mm across and 0.914 m; 5 Ω: 0.5 mm² and 2.27 m) and lengthen, thicken, or stretch at constant volume; in the coil test your length of 0.2 mm nichrome unrolls. The right panel plots R against what changes: the length in metres, or the length or diameter as a multiple of the start, with your resistance as an orange level or your length as an orange line beside the 20 Ω target. Tests: 2 m of copper, 0.5 mm² (0.0672 Ω), 3 Ω made twice as long (6 Ω), 8 Ω with twice the diameter (2 Ω), 5 Ω stretched to twice its length (20 Ω), and the length of nichrome 0.2 mm across for 20 Ω (0.571 m).

**Hot Filament**: a coil between two posts, in a water bath (copper, platinum) or a glass bulb (tungsten), coloured by its temperature and glowing above about 500 °C, with an ohmmeter above it (an ammeter on 230 V in the lamp test) and a thermometer beside it. The coil heats steadily over 2 s. The right panel plots R against T (or, for the lamp, the current V ÷ R), faint over the whole range and bright as far as the run, with your answer in orange. Tests: copper 10 Ω at 20 °C heated to 70 °C (11.97 Ω), tungsten 40 Ω at 20 °C glowing at 2500 °C (486.4 Ω), the lamp's cold-to-hot current ratio on 230 V (12.16), a Pt100 reading 119.25 Ω (50 °C), and the temperature that doubles copper's 10 Ω (274.5 °C; the coil is heated to your temperature).

- `verify-wire.cjs`, `verify-filament.cjs`: model checks (R = ρ·L ÷ A through each change, the constant volume when stretching, the coil's length from the answer, the straight-line R(T), the lamp's currents on 230 V, the sensor read backwards, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Ohm's law games: Ohm's Law Lab, Fuse Test

Items 17 and 18 of `ELECTRICITY_PLAN.md` (the subtopic *ley de Ohm*) follow Hot Filament in the Electric circuits topic. For a fixed resistor the current is proportional to the voltage, V = I·R, so I = V ÷ R and R = V ÷ I, and its I–V graph is a straight line through the origin; a fuse is a thin wire that melts the moment the current reaches its rating. In both games a supply ramps steadily from 0 to its voltage over 2 s and holds for 1 s while ideal meters follow it; readings and results show 4 significant figures. Answers are right within 2%, purely relative; a limit (the least resistance, the most voltage) must hold with at most 2% to spare, and a current within 0.05% of the rating counts as holding.

| Language | Ohm's Law Lab | Fuse Test |
| --- | --- | --- |
| English | `/games/electric-circuits/ohms-law-lab/` | `/games/electric-circuits/fuse-test/` |
| Español | `/es/juegos/circuitos-electricos/laboratorio-de-ohm/` | `/es/juegos/circuitos-electricos/prueba-del-fusible/` |
| Français | `/fr/jeux/circuits-electriques/laboratoire-d-ohm/` | `/fr/jeux/circuits-electriques/test-du-fusible/` |
| Deutsch | `/de/spiele/stromkreise/ohm-labor/` | `/de/spiele/stromkreise/sicherungstest/` |
| Nederlands | `/nl/spellen/stroomkringen/ohm-lab/` | `/nl/spellen/stroomkringen/zekeringtest/` |
| Suomi | `/fi/pelit/virtapiirit/ohmin-laboratorio/` | `/fi/pelit/virtapiirit/sulaketesti/` |
| Norsk bokmål | `/nb/spill/stromkretser/ohms-lab/` | `/nb/spill/stromkretser/sikringstest/` |
| Dansk | `/da/spil/stromkredse/ohms-laboratorium/` | `/da/spil/stromkredse/sikringstest/` |
| Português | `/pt/jogos/circuitos-eletricos/laboratorio-de-ohm/` | `/pt/jogos/circuitos-eletricos/teste-do-fusivel/` |
| हिन्दी | `/hi/khel/vidyut-paripath/ohm-prayogshala/` | `/hi/khel/vidyut-paripath/fuse-pariksha/` |
| 日本語 | `/ja/gemu/denki-kairo/ohmu-no-jikkenshitsu/` | `/ja/gemu/denki-kairo/hyuzu-shiken/` |
| Svenska | `/sv/spel/stromkretsar/ohms-labb/` | `/sv/spel/stromkretsar/sakringstest/` |
| Italiano | `/it/giochi/circuiti-elettrici/laboratorio-di-ohm/` | `/it/giochi/circuiti-elettrici/prova-del-fusibile/` |
| Română | `/ro/jocuri/circuite-electrice/laboratorul-lui-ohm/` | `/ro/jocuri/circuite-electrice/testul-sigurantei/` |
| Polski | `/pl/gry/obwody-elektryczne/laboratorium-ohma/` | `/pl/gry/obwody-elektryczne/test-bezpiecznika/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/ohm-laboratuvari/` | `/tr/oyunlar/elektrik-devreleri/sigorta-testi/` |
| العربية | `/ar/alab/dawair-kahrabaiya/mukhtabar-uum/` | `/ar/alab/dawair-kahrabaiya/ikhtibar-almisahar/` |

**Ohm's Law Lab**: a loop with a variable supply on the left, an IEC resistor on top with a voltmeter across it, an ammeter on the right, mint current arrows and sky electron dots (the flow toggle). The right panel draws current against the resistor's voltage as the supply rises, with the resistor's dashed line, the wanted current, the given point, and your answer in orange. The LED is ideal: no current below 2.0 V, then a constant 2.0 V drop, glowing with its current. Tests: 12 V across 4 Ω (3 A), 6 V driving 0.25 A (24 Ω), the voltage for 0.50 A through 220 Ω (110 V; your voltage sets the supply), the current at 9 V on a line through (2 V, 0.10 A) (0.45 A), and the resistor for an LED on 9 V at 20 mA (350 Ω; your resistor goes in the circuit).

**Fuse Test**: the same loop with a glass cartridge fuse on top whose wire warms from gray to orange as the current nears the rating and breaks when it melts, then a load (a kettle, wet skin, a resistor, your resistor, or a thick shorting wire), and an ammeter. The meters show the supply, the current, and the load on the fuse in percent. The right panel plots current against the supply's voltage with the rating as an orange-red line (or a note when the rating is far off the scale) and a cross where the fuse melted. Tests: a 26.45 Ω kettle on 230 V (8.696 A, under its 13 A fuse), the least resistance on 12 V with a 2 A fuse (6.0 Ω), wet skin of 1000 Ω on 230 V (230 mA, far below the 13 A fuse), the most voltage on 47 Ω rated 0.1 A (4.7 V), and a 12 V battery with 0.05 Ω inside, shorted (240 A, with a 300 A battery fuse that holds at 80%). The model text says these are teaching values, not safety limits, and that a fuse protects wiring, not people.

- `verify-ohm.cjs`, `verify-fuse.cjs`: model checks (the ramp, V = I·R and its rearrangements, the LED's 2 V threshold, the battery's internal resistance, the melt time and the 0.05% grace, the limit rule, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Series circuit games: Bulb Chain, Voltage Divider

Items 19 and 20 of `ELECTRICITY_PLAN.md` (the subtopic *circuitos en serie*) follow Fuse Test in the Electric circuits topic. In series there is one path, so one current flows through every component, the resistances add, R = R₁ + R₂ + …, and the supply is shared in proportion to the resistances, V₁ = I·R₁; taking the output across the lower part gives a voltage divider, V_out = V·R₂ ÷ (R₁ + R₂). In both games the supply ramps steadily from 0 to its voltage over 2 s and holds for 1 s while ideal meters follow it; readings and results show 4 significant figures, and answers are right within 2%, purely relative. The fairy-lights test is a limit: the exact fewest whole number of bulbs that none burns out (a bulb burns out the moment its voltage passes its 2.5 V rating; within 0.05% counts as holding). Translations need native review; the Portuguese of these two games follows the site's Brazilian standard.

| Language | Bulb Chain | Voltage Divider |
| --- | --- | --- |
| English | `/games/electric-circuits/bulb-chain/` | `/games/electric-circuits/voltage-divider/` |
| Español | `/es/juegos/circuitos-electricos/cadena-de-bombillas/` | `/es/juegos/circuitos-electricos/divisor-de-tension/` |
| Français | `/fr/jeux/circuits-electriques/chaine-d-ampoules/` | `/fr/jeux/circuits-electriques/diviseur-de-tension/` |
| Deutsch | `/de/spiele/stromkreise/lampenkette/` | `/de/spiele/stromkreise/spannungsteiler/` |
| Nederlands | `/nl/spellen/stroomkringen/lampjesketting/` | `/nl/spellen/stroomkringen/spanningsdeler/` |
| Suomi | `/fi/pelit/virtapiirit/lamppuketju/` | `/fi/pelit/virtapiirit/jannitteenjakaja/` |
| Norsk bokmål | `/nb/spill/stromkretser/lyspaerekjede/` | `/nb/spill/stromkretser/spenningsdeler/` |
| Dansk | `/da/spil/stromkredse/paerekaede/` | `/da/spil/stromkredse/spaendingsdeler/` |
| Português | `/pt/jogos/circuitos-eletricos/corrente-de-lampadas/` | `/pt/jogos/circuitos-eletricos/divisor-de-tensao/` |
| हिन्दी | `/hi/khel/vidyut-paripath/bulb-shrinkhla/` | `/hi/khel/vidyut-paripath/voltata-vibhajak/` |
| 日本語 | `/ja/gemu/denki-kairo/denkyu-no-retsu/` | `/ja/gemu/denki-kairo/denatsu-bunkatsu/` |
| Svenska | `/sv/spel/stromkretsar/lampkedja/` | `/sv/spel/stromkretsar/spanningsdelare/` |
| Italiano | `/it/giochi/circuiti-elettrici/catena-di-lampadine/` | `/it/giochi/circuiti-elettrici/partitore-di-tensione/` |
| Română | `/ro/jocuri/circuite-electrice/lantul-de-becuri/` | `/ro/jocuri/circuite-electrice/divizorul-de-tensiune/` |
| Polski | `/pl/gry/obwody-elektryczne/lancuch-zarowek/` | `/pl/gry/obwody-elektryczne/dzielnik-napiecia/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/ampul-zinciri/` | `/tr/oyunlar/elektrik-devreleri/gerilim-bolucu/` |
| العربية | `/ar/alab/dawair-kahrabaiya/silsilat-almasabih/` | `/ar/alab/dawair-kahrabaiya/muqassim-aljuhd/` |

**Bulb Chain**: a loop with the supply on the left, IEC lamps (a circle with a cross) in a row on the top wire, each glowing with its own power on a stated scale (full glow at 16 W, or 0.5 W for a fairy light), a voltmeter across the middle bulb, and an ammeter on the right; mint current arrows and sky electron dots (the flow toggle). In the fairy-lights test your number of small bulbs (up to 150 drawn) spreads along the loop; too few and one burns out, breaking the only path, so every bulb goes dark. The right panel shows a bar per bulb with its voltage and their sum, which is the supply (one bar for all the fairy lights, against the 2.5 V rating). Tests: three 4 Ω bulbs on 12 V (1 A), 2, 5, and 3 Ω in series (10 Ω), the same on 20 V across the 5 Ω (10 V), a fourth 4 Ω bulb (0.75 A), and 2.5 V fairy lights on 230 V (92 bulbs; your number goes in the chain).

**Voltage Divider**: a loop with the supply on the left and IEC resistors standing one above another on the right-hand wire, a light sensor (LDR symbol) or thermistor at the bottom in two tests, and a voltmeter from the output node to the bottom wire. Resistances are in kΩ and the current in mA. The right panel plots the potential against the resistance passed from the top, a straight line with a dot at each node, the output node's value, the wanted output, and your answer in orange. Tests: 9 V across 1 and 2 kΩ (6 V across the 2 kΩ), 5 V out of 12 V with 1.4 kΩ on top (1.0 kΩ; your resistor goes in), an LDR at 1 kΩ under 10 kΩ on 9 V (0.818 V), a thermistor under 4.7 kΩ on 5 V reading 2.5 V (4.7 kΩ; your value goes in), and the node above the 3 kΩ in 1, 2, 3 kΩ on 12 V (6 V).

- `verify-series.cjs`, `verify-divider.cjs`: model checks (one current, the resistances adding, the shares in proportion, the fairy lights' burn-out time and the fewest-bulbs rule, node potentials down a chain, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Parallel circuit games: Room Wiring, Current Splitter

Items 21 and 22 of `ELECTRICITY_PLAN.md` (the subtopic *circuitos en paralelo*) follow Voltage Divider in the Electric circuits topic. In parallel every branch gets the full supply voltage, so each branch draws I = V ÷ R on its own, the currents add at the junctions, I = I₁ + I₂ + …, and the combined resistance is smaller than the smallest branch, 1/R = 1/R₁ + 1/R₂ + …; two branches share a current inversely to their resistances, I₁·R₁ = I₂·R₂. In Room Wiring the supply is steady and the branches switch on in turn over 2 s; in Current Splitter the source ramps steadily over 2 s; both then hold for 1 s while ideal ammeters follow; readings and results show 4 significant figures, and answers are right within 2%, purely relative. The breaker test is a limit: the exact most whole number of lamps before the breaker trips (it trips the moment the current passes 16 A; within 0.05% counts as holding). Translations need native review; the Portuguese of these games follows the site's Brazilian standard.

| Language | Room Wiring | Current Splitter |
| --- | --- | --- |
| English | `/games/electric-circuits/room-wiring/` | `/games/electric-circuits/current-splitter/` |
| Español | `/es/juegos/circuitos-electricos/instalacion-de-la-casa/` | `/es/juegos/circuitos-electricos/reparto-de-corriente/` |
| Français | `/fr/jeux/circuits-electriques/installation-de-la-maison/` | `/fr/jeux/circuits-electriques/partage-du-courant/` |
| Deutsch | `/de/spiele/stromkreise/hausinstallation/` | `/de/spiele/stromkreise/stromteiler/` |
| Nederlands | `/nl/spellen/stroomkringen/huisinstallatie/` | `/nl/spellen/stroomkringen/stroomverdeler/` |
| Suomi | `/fi/pelit/virtapiirit/talon-sahkot/` | `/fi/pelit/virtapiirit/virranjakaja/` |
| Norsk bokmål | `/nb/spill/stromkretser/husets-anlegg/` | `/nb/spill/stromkretser/stromdeler/` |
| Dansk | `/da/spil/stromkredse/husets-installation/` | `/da/spil/stromkredse/stromdeler/` |
| Português | `/pt/jogos/circuitos-eletricos/instalacao-da-casa/` | `/pt/jogos/circuitos-eletricos/divisao-de-corrente/` |
| हिन्दी | `/hi/khel/vidyut-paripath/ghar-ki-wiring/` | `/hi/khel/vidyut-paripath/dhara-vibhajak/` |
| 日本語 | `/ja/gemu/denki-kairo/ie-no-haisen/` | `/ja/gemu/denki-kairo/denryu-no-bunki/` |
| Svenska | `/sv/spel/stromkretsar/husets-elinstallation/` | `/sv/spel/stromkretsar/stromdelare/` |
| Italiano | `/it/giochi/circuiti-elettrici/impianto-di-casa/` | `/it/giochi/circuiti-elettrici/divisione-della-corrente/` |
| Română | `/ro/jocuri/circuite-electrice/instalatia-casei/` | `/ro/jocuri/circuite-electrice/impartirea-curentului/` |
| Polski | `/pl/gry/obwody-elektryczne/instalacja-w-domu/` | `/pl/gry/obwody-elektryczne/podzial-pradu/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/ev-tesisati/` | `/tr/oyunlar/elektrik-devreleri/akim-bolucu/` |
| العربية | `/ar/alab/dawair-kahrabaiya/tamdidat-albayt/` | `/ar/alab/dawair-kahrabaiya/taqsim-altayyar/` |

**Room Wiring**: a house circuit with the supply on the left and appliances on parallel branches between two rails, switched on in turn, each with its own ammeter, and a main ammeter (a breaker in the last test) on the supply wire; mint current arrows and sky electron dots (the flow toggle). In the unplug test one of three lamps is unplugged at 2.5 s and the others keep their current. The right panel plots the main current against time, stepping up as each branch switches on and down when one goes off. Tests: 6 and 3 Ω side by side (2 Ω), the same on 12 V (6 A in the main wire), three 12 Ω lamps with one unplugged (2 A), the resistor beside 10 Ω that makes 4 Ω (6.67 Ω; your resistor goes in), and the most 0.50 A lamps on a 16 A breaker at 230 V (32; your number of lamps goes in).

**Current Splitter**: a junction where the main current splits between branches and joins again, an ammeter on every branch, and the counts adding at each junction (Kirchhoff's current law). Tests that give a current use a current source. The right panel shows a bar for the current in and one for each branch, which add up to it. Tests: 3 A in with 1.2 A down one branch (1.8 A; the resistances are hidden), 6 A between 2 and 4 Ω (4 A in the 2 Ω), 12, 20, and 30 Ω on 6 V (1 A in the main wire), a 6 Ω branch switched on beside 4 Ω on 12 V (the 4 Ω keeps 3 A), and the shunt that makes a 50 mA, 20 Ω meter read 1 A (1.053 Ω; your shunt goes in).

- `verify-parallel.cjs`, `verify-junction.cjs`: model checks (the full voltage on every branch, the currents adding, the reciprocal rule, the inverse share, branches switching on in turn, the breaker's trip time and the most-lamps rule, the shunt, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Electrical power games: Bulb Brightness, Power Line

Items 23 and 24 of `ELECTRICITY_PLAN.md` (the subtopic *potencia eléctrica*) follow Current Splitter in the Electric circuits topic. Electrical power is the energy transferred each second, P = V·I, which with Ohm's law is also I²·R and V² ÷ R; a bulb's brightness follows the power it actually takes, not its rating, and a power line loses P_loss = I²·R, so sending the same power at a higher voltage, with a smaller current, cuts the loss by the square. In both games the supply ramps over 2 s and holds for 1 s; readings and results show 4 significant figures, and answers are right within 2%, purely relative. Translations need native review; the Portuguese of these games follows the site's Brazilian standard.

| Language | Bulb Brightness | Power Line |
| --- | --- | --- |
| English | `/games/electric-circuits/bulb-brightness/` | `/games/electric-circuits/power-line/` |
| Español | `/es/juegos/circuitos-electricos/brillo-de-bombillas/` | `/es/juegos/circuitos-electricos/linea-de-alta-tension/` |
| Français | `/fr/jeux/circuits-electriques/eclat-des-ampoules/` | `/fr/jeux/circuits-electriques/ligne-haute-tension/` |
| Deutsch | `/de/spiele/stromkreise/lampenhelligkeit/` | `/de/spiele/stromkreise/hochspannungsleitung/` |
| Nederlands | `/nl/spellen/stroomkringen/felheid-van-lampen/` | `/nl/spellen/stroomkringen/hoogspanningslijn/` |
| Suomi | `/fi/pelit/virtapiirit/lamppujen-kirkkaus/` | `/fi/pelit/virtapiirit/voimalinja/` |
| Norsk bokmål | `/nb/spill/stromkretser/paerenes-lysstyrke/` | `/nb/spill/stromkretser/kraftlinje/` |
| Dansk | `/da/spil/stromkredse/paerers-lysstyrke/` | `/da/spil/stromkredse/hojspaendingsledning/` |
| Português | `/pt/jogos/circuitos-eletricos/brilho-das-lampadas/` | `/pt/jogos/circuitos-eletricos/linha-de-transmissao/` |
| हिन्दी | `/hi/khel/vidyut-paripath/bulb-ki-chamak/` | `/hi/khel/vidyut-paripath/bijli-ki-line/` |
| 日本語 | `/ja/gemu/denki-kairo/denkyu-no-akarusa/` | `/ja/gemu/denki-kairo/souden-sen/` |
| Svenska | `/sv/spel/stromkretsar/lampornas-ljusstyrka/` | `/sv/spel/stromkretsar/kraftledning/` |
| Italiano | `/it/giochi/circuiti-elettrici/luce-delle-lampadine/` | `/it/giochi/circuiti-elettrici/linea-elettrica/` |
| Română | `/ro/jocuri/circuite-electrice/stralucirea-becurilor/` | `/ro/jocuri/circuite-electrice/linia-de-inalta-tensiune/` |
| Polski | `/pl/gry/obwody-elektryczne/jasnosc-zarowek/` | `/pl/gry/obwody-elektryczne/linia-wysokiego-napiecia/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/ampul-parlakligi/` | `/tr/oyunlar/elektrik-devreleri/enerji-hatti/` |
| العربية | `/ar/alab/dawair-kahrabaiya/twahhuj-almasabih/` | `/ar/alab/dawair-kahrabaiya/khatt-alnaql/` |

**Bulb Brightness**: a loop with the supply on the left and IEC lamps that glow with their power on a stated scale (full glow at 100 W), a wattmeter on the marked bulb, and the bulbs keeping the resistance of their rating (the model text says real filaments change). The right panel shows a bar for each bulb's actual power beside a dashed outline of its rated power. Tests: a 6 Ω bulb on 12 V (24 W), the resistance of a 60 W bulb made for 230 V (881.7 Ω; your resistance goes in the bulb), two such bulbs in series on 230 V (15 W each), 60 W and 100 W bulbs in series (23.4 W in the 60 W bulb, the brighter one), and a 100 W bulb on 115 V (25 W).

**Power Line**: a power station, a step-up transformer, a long two-wire line that glows warmer with its loss, a step-down transformer, and a town or house; the line's voltage, resistance, and current are labelled, with mint current arrows and sky electron dots. The right panel compares the power sent, lost, and delivered, with the share lost. Teaching values with ideal transformers. Tests: 100 kW at 1000 V through 0.5 Ω (5000 W lost), the same at 10 kV (50 W), the voltage at which 1 MW through 2 Ω loses only 1% (14.1 kV; your voltage goes on the line), 20 A through a 4 Ω line (1600 W), and a heater that takes 2 kW from the house's 230 V (26.45 Ω; your heater goes in the house).

- `verify-brightness.cjs`, `verify-powerline.cjs`: model checks (P = V·I = I²·R = V² ÷ R, the rated resistance, series bulbs sharing the voltage, the brighter low-wattage bulb, the line current and loss, the hundredfold cut, the 1% design, the heater's line, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages. Both run in `npm test`.

## Electrical energy games: Kettle Race, Energy Meter

Items 25 and 26 of `ELECTRICITY_PLAN.md` (the subtopic *energía eléctrica*) follow Power Line and close the Electric circuits topic. The energy an appliance uses is its power times the time it runs, E = P·t: a kettle turns it into heat, and warming water takes E = m·c·ΔT with c = 4180 J/(kg·°C); a house energy meter counts kilowatt-hours, 1 kWh = 1000 Wh = 3600 kJ. Both games run over long times, so each test has its own pace that makes a run last about 4 s on screen, stated on the canvas; Energy Meter uses the generator's `timeUnits` field so the clock reads hours, or days in the standby test. Answers are right within 2%, purely relative. Translations need native review; the Portuguese of these games follows the site's Brazilian standard.

| Language | Kettle Race | Energy Meter |
| --- | --- | --- |
| English | `/games/electric-circuits/kettle-race/` | `/games/electric-circuits/energy-meter/` |
| Español | `/es/juegos/circuitos-electricos/carrera-de-hervidores/` | `/es/juegos/circuitos-electricos/contador-de-energia/` |
| Français | `/fr/jeux/circuits-electriques/course-des-bouilloires/` | `/fr/jeux/circuits-electriques/compteur-electrique/` |
| Deutsch | `/de/spiele/stromkreise/wasserkocher-rennen/` | `/de/spiele/stromkreise/stromzaehler/` |
| Nederlands | `/nl/spellen/stroomkringen/waterkoker-race/` | `/nl/spellen/stroomkringen/energiemeter/` |
| Suomi | `/fi/pelit/virtapiirit/vedenkeitinkisa/` | `/fi/pelit/virtapiirit/sahkomittari/` |
| Norsk bokmål | `/nb/spill/stromkretser/vannkoker-kapplop/` | `/nb/spill/stromkretser/strommaler/` |
| Dansk | `/da/spil/stromkredse/elkedel-kaplob/` | `/da/spil/stromkredse/elmaler/` |
| Português | `/pt/jogos/circuitos-eletricos/corrida-das-chaleiras/` | `/pt/jogos/circuitos-eletricos/medidor-de-energia/` |
| हिन्दी | `/hi/khel/vidyut-paripath/kettle-ki-daud/` | `/hi/khel/vidyut-paripath/bijli-ka-meter/` |
| 日本語 | `/ja/gemu/denki-kairo/denki-ketoru-kyoso/` | `/ja/gemu/denki-kairo/denryoku-meta/` |
| Svenska | `/sv/spel/stromkretsar/vattenkokar-tavling/` | `/sv/spel/stromkretsar/elmatare/` |
| Italiano | `/it/giochi/circuiti-elettrici/gara-dei-bollitori/` | `/it/giochi/circuiti-elettrici/contatore-di-energia/` |
| Română | `/ro/jocuri/circuite-electrice/cursa-fierbatoarelor/` | `/ro/jocuri/circuite-electrice/contorul-de-energie/` |
| Polski | `/pl/gry/obwody-elektryczne/wyscig-czajnikow/` | `/pl/gry/obwody-elektryczne/licznik-energii/` |
| Türkçe | `/tr/oyunlar/elektrik-devreleri/su-isiticisi-yarisi/` | `/tr/oyunlar/elektrik-devreleri/elektrik-sayaci/` |
| العربية | `/ar/alab/dawair-kahrabaiya/sibaq-alghallayat/` | `/ar/alab/dawair-kahrabaiya/addad-alkahraba/` |

**Kettle Race**: an electric kettle plugged into a socket, its water coloured from blue to red by its temperature, a thermometer beside it, and steam once it boils; mint arrows show the energy flowing in along the cord (the flow toggle). In the time tests a second, orange kettle boils exactly at your predicted time, so the two race. No heat is lost unless an efficiency is given, and the kettle itself takes no heat. The right panel plots the temperature against time, with your time dashed in orange. Tests: 2000 W boiling 1 L from 20 °C (167 s), 1500 W for 3 minutes (270 kJ), test 1 at 90% efficiency (186 s), the power that boils 0.5 L in a minute (2790 W; your power goes in the kettle), and test 1's 230 V kettle on 115 V (669 s, a quarter of the power).

**Energy Meter**: a house energy meter with rolling digits wired to an appliance (a lamp, a TV on standby, a power bank, an old bulb beside an LED, or a phone on charge), mint arrows for the energy flowing out of the meter, and a timeline of the test's hours or days. The meter shows kWh for the house tests and Wh for the batteries; energies only, no prices. The right panel plots the energy in the asked unit against time, with your answer as an orange level. Tests: 100 W for 5 h (0.5 kWh), 2 W of standby for 30 days (1.44 kWh), a 15 Wh power bank in kJ (54 kJ), a 9 W LED instead of a 60 W bulb for 1000 h (51 kWh saved), and a 3000 mAh, 3.7 V phone battery (11.1 Wh).

- `verify-kettle.cjs`, `verify-bill.cjs`: model checks (E = P·t, m·c·ΔT heating to the boil and holding there, the pace kettle, efficiency, a quarter of the power on half the voltage, Wh, kWh, and kJ conversions, days counting 24 hours, the saved energy, timestep independence, the 2% window, slip detection, scoring, input validation, state transfer) and localized interface checks in all seventeen languages, including the time unit switching between h and d. Both run in `npm test`.
