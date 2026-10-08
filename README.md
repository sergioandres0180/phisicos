# Phisicos — multilingual educational simulation games

A static homepage linked to the speed and velocity lab, Pac-Man chase, Lunar Lander: Eco-Mission, Unit Pipeline, the Powers-of-Ten Probe, River Crossing, Orienteering Walk, and Force Table. The header lists every game in a localized Games menu. The implementation preserves both physics engines and generates searchable HTML in English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, and Danish. No runtime dependencies or translation services are required.

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
| English | `/` | `/games/speed-velocity/` |
| Español | `/es/` | `/es/juegos/rapidez-velocidad/` |
| Français | `/fr/` | `/fr/jeux/vitesse-vecteur/` |
| Deutsch | `/de/` | `/de/spiele/tempo-geschwindigkeit/` |
| Nederlands | `/nl/` | `/nl/spellen/snelheid-vector/` |
| Suomi | `/fi/` | `/fi/pelit/vauhti-nopeus/` |
| Norsk bokmål | `/nb/` | `/nb/spill/fart-hastighet/` |
| Dansk | `/da/` | `/da/spil/fart-hastighed/` |

English stays at `/`; there is no duplicate `/en/` homepage. Every localized page has its own canonical, reciprocal `hreflang` links including itself, and the English equivalent as `x-default`. No automatic language redirects are used. The server redirects directory URLs to their trailing-slash form and returns HTTP 404 for missing pages.

## Content and SEO

The primary keyword across the site is **educational simulation games**. The homepage title, H1, description, collection heading, and navigation label target it directly; each game page targets **educational simulation game** plus its topic (speed and velocity, or gravity for Lunar Lander). Localized equivalents: *juegos de simulación educativos* (es), *jeux de simulation éducatifs* (fr), *Simulationsspiele zum Lernen* (de), *educatieve simulatiespellen* (nl), *opetukselliset simulaatiopelit* (fi), *pedagogiske simuleringsspill* (nb), and *pædagogiske simulationsspil* (da). Physics terms stay as secondary keywords. Each page has a unique title and description, one H1, semantic headings and landmarks, crawlable internal links, and localized instructions. The game page includes a worked relative-speed example and questions about average speed, average velocity, and direction. Editorial content is in the initial HTML and does not depend on JavaScript or Canvas rendering.

Metadata includes Open Graph, Twitter large-image cards, a local 1200 × 630 sharing image, site icons, and JSON-LD (`WebSite`, `CollectionPage` or `WebPage` with the localized primary keyword in `keywords`, `BreadcrumbList`, and `VideoGame` on the game page). No invented ratings, reviews, offers, or rich-result promises are included. `sitemap.xml` contains only the 64 canonical pages; the error page and legacy snapshots are excluded. There is no obsolete keywords meta tag.

System fonts and shared styles are local. Production pages load Google Tag Manager container `GTM-TZH7L6DT` asynchronously, with the standard noscript fallback immediately after the opening body tag. The build adds it once to all 64 localized pages and the 404 page; preview builds omit tracking. Tags are managed and published in the GTM account. Game code remains small and self-contained. Locale-specific numbers use decimal commas where appropriate, with semicolons between vector components to avoid ambiguity. Long translated labels can wrap on narrow screens. Keyboard controls, native language navigation, canvas descriptions, and screen-reader announcements are preserved and localized.

Reference guidance: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Managing multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [Localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions).

## Editing and adding games

- `src/velocity.html`: the working game source, including both physics engines. Its previous location was `public/index.html`.
- `src/site.css`: homepage, navigation, educational content, and translation layout rules.
- `locales/pages.cjs`: page copy, metadata, and localized routes. Keep all eight entries in sync when adding content.
- `locales/strings.json`: ordered English interface strings. Append new keys without reordering existing keys.
- `locales/translations.tsv`: matching translations in seven language columns. The build rejects missing rows and empty translations.
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
| English | `/games/lunar-lander/` |
| Español | `/es/juegos/modulo-lunar/` |
| Français | `/fr/jeux/module-lunaire/` |
| Deutsch | `/de/spiele/mondlander/` |
| Nederlands | `/nl/spellen/maanlander/` |
| Suomi | `/fi/pelit/kuulaskeutuja/` |
| Norsk bokmål | `/nb/spill/manelander/` |
| Dansk | `/da/spil/manelander/` |

The signed model uses upward-positive height/velocity and `a = u × aMax − g`. Gravity is constant, with presets of 1.62 m/s² (Moon) and 3.71 m/s² (Mars). Finite fuel is measured in seconds of full-power burn at constant module mass. Fuel exhaustion and platform contact are solved within a timestep. Touchdown readings retain precontact velocity, rather than replacing it with zero. The ideal model omits atmospheric drag.

Land at a speed no greater than 1.5 m/s; keep at least 30% fuel for the eco badge. The braking guide assumes the chosen power stays constant and warns when fuel is insufficient. The altitude view expands during ascent without imposing a physical ceiling. Language changes pause and transfer the current flight via a one-time session entry, when storage is available.

- `DESIGN_GUIDELINES.md`: shared layout, colors, accessibility, language, motion, and physics rules. Also available at `/design-guidelines.md`.
- `src/lander.html`: source markup, local style overrides, pure `LanderPhysics` model, renderer, and controls.
- `locales/lander.cjs`: 110 complete UI/content keys for all eight languages, with validated interpolation fields.
- `verify-lander.cjs`: physical edge cases and generated-language interface checks. Included in `npm test`.

Existing Speed & Velocity and Pac-Man engines remain unchanged. Generated HTML runs without runtime packages or translation services. Local development continues using the existing server and build workflow.


## Unit Pipeline and Powers-of-Ten Probe

Two measurement games cover SI units, unit conversion, prefixes, and scientific notation. Both use the same template pipeline as Lunar Lander: `src/<game>.html` holds markup with `{{key}}` placeholders, a pure model script, and an interface script; `locales/<game>.cjs` holds every string for all eight languages; `locales/games.cjs` registers each game for routes, navigation, homepage cards, sitemap, and JSON-LD. Shared styles for the two games are in `src/module.css`.

| Language | Unit Pipeline | Powers-of-Ten Probe |
| --- | --- | --- |
| English | `/games/unit-conversion/` | `/games/powers-of-ten/` |
| Español | `/es/juegos/conversion-unidades/` | `/es/juegos/potencias-de-diez/` |
| Français | `/fr/jeux/conversion-unites/` | `/fr/jeux/puissances-de-dix/` |
| Deutsch | `/de/spiele/einheiten-umrechnen/` | `/de/spiele/zehnerpotenzen/` |
| Nederlands | `/nl/spellen/eenheden-omrekenen/` | `/nl/spellen/machten-van-tien/` |
| Suomi | `/fi/pelit/yksikkomuunnokset/` | `/fi/pelit/kymmenen-potenssit/` |
| Norsk bokmål | `/nb/spill/enhetsomregning/` | `/nb/spill/tierpotenser/` |
| Dansk | `/da/spil/enhedsomregning/` | `/da/spil/titalspotenser/` |

**Unit Pipeline** gives each tank a volume V and pump rate Q in everyday units. The learner multiplies V ÷ Q by exact conversion factors (each equal to 1), flipping them until only seconds remain; factors that add units instead of cancelling them are flagged. Play fills the tank from SI values, so the measured fill time independently confirms a valid chain. Five tanks cover mL/L, cubed centimetres (the ×10⁶ trap), L/min, m³/h, and 1 mL = 1 cm³.

**Powers-of-Ten Probe** gives six trips (bacterium, snail, nerve signal, airliner, light to the Moon, light across a desk) with prefixed distance and speed. The learner enters t = a × 10ⁿ s; the probe then travels on a zoomable ruler labelled with SI prefixes and size landmarks. SI conversions of d and v are hidden until launch. Scoring separates correct notation, the right power of ten, and 2% accuracy.

- `verify-pipeline.cjs` and `verify-scale.cjs`: model checks (exact tiles, shortest chains, exact fill/arrival events, scoring, state transfer) and localized interface checks in all eight languages. Both run in `npm test` through the shared `verify-dom.cjs` adapter.

## Vector games: River Crossing, Orienteering Walk, Force Table

Three games cover scalars and vectors in two dimensions, using the same template pipeline (`src/<game>.html`, `locales/<game>.cjs`, registered in `locales/games.cjs`).

| Language | River Crossing | Orienteering Walk | Force Table |
| --- | --- | --- | --- |
| English | `/games/river-crossing/` | `/games/orienteering-walk/` | `/games/force-table/` |
| Español | `/es/juegos/cruce-del-rio/` | `/es/juegos/orientacion/` | `/es/juegos/mesa-de-fuerzas/` |
| Français | `/fr/jeux/traversee-riviere/` | `/fr/jeux/course-orientation/` | `/fr/jeux/table-des-forces/` |
| Deutsch | `/de/spiele/flussueberquerung/` | `/de/spiele/orientierungslauf/` | `/de/spiele/krafttisch/` |
| Nederlands | `/nl/spellen/rivier-oversteken/` | `/nl/spellen/orientatieloop/` | `/nl/spellen/krachtentafel/` |
| Suomi | `/fi/pelit/joen-ylitys/` | `/fi/pelit/suunnistus/` | `/fi/pelit/voimapoyta/` |
| Norsk bokmål | `/nb/spill/elvekryssing/` | `/nb/spill/orientering/` | `/nb/spill/kraftbord/` |
| Dansk | `/da/spil/flodkrydsning/` | `/da/spil/orientering/` | `/da/spil/kraftbord/` |

**River Crossing**: the ground velocity is the vector sum of the boat's velocity relative to the water and the current. Four missions: land on the dock opposite (gentle and 3-4-5 currents), the fastest crossing, and the least drift when the current is faster than the boat. The learner predicts the landing point.

**Orienteering Walk**: compass legs add tip to tail. Five routes compare the distance walked (scalar) with the displacement (vector), including a round trip with zero displacement. Route tools reverse the leg order (same displacement, different path) and multiply the route by 2 or −1.

**Force Table**: strings pull a ring; the learner adds one force so the vector sum is zero. Static friction (0.05 N) is the honest tolerance for "balanced"; otherwise the ring slides along ΣF to a stop pin. The net force stays hidden until release, and an optional tip-to-tail helper costs a bonus.

- `verify-river.cjs`, `verify-walk.cjs`, `verify-forces.cjs`: model checks (vector sums, slider-reachable solutions, exact landing, corner, finish, hold and slip events, scoring, state transfer) and localized interface checks in all eight languages. All run in `npm test`.

