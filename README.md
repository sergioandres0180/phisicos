# Motion Lab — multilingual physics videogames

A static homepage linked to the speed and velocity lab, Pac-Man chase, and Lunar Lander: Eco-Mission. The implementation preserves both physics engines and generates searchable HTML in English, Spanish, French, German, Dutch, Finnish, Norwegian Bokmål, and Danish. No runtime dependencies or translation services are required.

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

The homepage targets **physics videogames**; the game page targets **speed videogame** and **velocity physics videogame**, with natural equivalents in each language. Each page has a unique title and description, one H1, semantic headings and landmarks, crawlable internal links, and localized instructions. The game page includes a worked relative-speed example and questions about average speed, average velocity, and direction. Editorial content is in the initial HTML and does not depend on JavaScript or Canvas rendering.

Metadata includes Open Graph, Twitter large-image cards, a local 1200 × 630 sharing image, site icons, and JSON-LD (`WebSite`, `CollectionPage` or `WebPage`, `BreadcrumbList`, and `VideoGame` on the game page). No invented ratings, reviews, offers, or rich-result promises are included. `sitemap.xml` contains only the 24 canonical pages; the error page and legacy snapshots are excluded. There is no obsolete keywords meta tag.

System fonts and shared styles are local. Production pages load Google Tag Manager container `GTM-TZH7L6DT` asynchronously, with the standard noscript fallback immediately after the opening body tag. The build adds it once to all 24 localized pages and the 404 page; preview builds omit tracking. Tags are managed and published in the GTM account. Game code remains small and self-contained. Locale-specific numbers use decimal commas where appropriate, with semicolons between vector components to avoid ambiguity. Long translated labels can wrap on narrow screens. Keyboard controls, native language navigation, canvas descriptions, and screen-reader announcements are preserved and localized.

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
