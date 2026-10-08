# Upload Phisicos to shared hosting

Prepared for **https://phisicos.com/** at the domain root, using Apache 2.4 or compatible LiteSpeed hosting (typical cPanel hosting). All 64 pages in eight languages are already built. The games run as HTML, CSS and JavaScript. No database, PHP setup, Composer, Node.js, or build step is required on the server.

## Upload

1. In your hosting panel, point `phisicos.com` and `www.phisicos.com` to this hosting account. Enable a valid SSL certificate for **both** names, usually through AutoSSL or Let's Encrypt.
2. Find the document root assigned to `phisicos.com`. It is often `public_html`; an add-on domain may use another folder. Back up any existing website and `.htaccess` there before replacing files.
3. Upload **phisicos.com-upload.zip** into that document root and extract it **there**. You should see `index.html`, `.htaccess`, `assets/`, `games/`, `es/`, the other language folders, `robots.txt`, and `sitemap.xml` directly inside the document root. Do not create an extra `public_html` or project folder inside it.
4. Enable **Show Hidden Files** in the file manager and confirm `.htaccess` was extracted. Replace or merge existing website rules deliberately; old WordPress routing or host-created redirects can interfere. The host's PHP settings may be retained if needed by other files.
5. Delete the uploaded ZIP after extraction. Keep this guide and the source project on your computer. Common permissions are 755 for folders and 644 for files.

## Verify after upload

- `https://phisicos.com/` displays the homepage. All seven games work, including Play, Pause, Reset, parameter controls, and language changes.
- `http://phisicos.com/` and `https://www.phisicos.com/` permanently redirect to `https://phisicos.com/`. Test a game URL too; the path must be preserved.
- `https://phisicos.com/games/lunar-lander/index.html` redirects to `/games/lunar-lander/`. Directory URLs without a trailing slash also redirect to their canonical form.
- `https://phisicos.com/a-page-that-does-not-exist/` displays the custom error page with **HTTP status 404**, not 200. A browser's Network panel shows the status.
- `https://phisicos.com/robots.txt` says `Allow: /` and links to the production sitemap. The sitemap lists exactly 64 HTTPS URLs. Pages must not be password-protected or blocked by a hosting maintenance mode.
- Page source shows the correct `https://phisicos.com/...` canonical and the appropriate language alternates. Only the error page and internal design guide are marked noindex.
- The social preview is available at `https://phisicos.com/assets/social-preview.png`.
- Google Tag Manager container **GTM-TZH7L6DT** is installed on all 64 pages and the 404 page. After upload, use GTM Preview / Tag Assistant to verify the live container and its tags. Tag configuration and publishing happen in your GTM account. Local preview builds omit tracking.

After these checks, verify ownership of the **phisicos.com domain property** in Google Search Console (using the DNS record Google supplies), then submit `https://phisicos.com/sitemap.xml`. Inspect the homepage and each game. Search Console setup requires your account and DNS access; it is not included in the ZIP. Indexing and rankings are determined by search engines and are not guaranteed.

## What's included

- Unique titles and descriptions, self-canonical links, eight reciprocal language alternates plus `x-default`, and server-delivered educational content on all 64 pages.
- JSON-LD for the website, pages, breadcrumbs, and games; a canonical sitemap and production robots.txt.
- Open Graph and Twitter large-image metadata, a 1200 × 630 PNG, and site/touch icons.
- HTTP-to-HTTPS and preferred-domain permanent redirects; duplicate `index.html` redirects; real missing-page responses.
- Compression when the Apache modules are available, one-day caching for assets, and revalidation for HTML/sitemaps so updates become visible promptly.

## Hosting-specific notes

The `.htaccess` requires rewrite support and permission to use Options, FileInfo, and Indexes directives. If the host returns HTTP 500, check its error log or ask support to enable these overrides. Nginx-only hosting does not read `.htaccess`; ask the provider to configure equivalent redirects, static directory indexes, cache headers, compression, and the 404 response.

The default HTTPS rule assumes the web server terminates TLS. If using Cloudflare, choose **Full (strict)** with a valid origin certificate; Flexible mode would cause a redirect loop. If your provider terminates TLS at a trusted proxy and connects to Apache over HTTP, ask support to adapt the HTTPS condition to its trusted proxy configuration. Do not blindly trust a forwarded header supplied by arbitrary visitors.

If your host returns its own error page, ask it to honor `ErrorDocument 404 /404.html`. Do not add a catch-all rewrite that turns unknown URLs into successful homepage responses.

## Future updates

From the source project on your computer, run:

```sh
npm run build:preview
npm test
npm run package:hosting
```

Packaging uses Node.js and the `zip`/`unzip` utilities locally. It reads the production URL from `deployment.json`, verifies generated pages, and writes `release/phisicos.com-upload.zip`. It leaves the local preview in `dist/` unchanged. Upload the new archive as above. If updating within one day, clear any hosting/CDN asset cache. Keep the hosting ZIP separate from the preview build, which intentionally blocks indexing.

After launch, measure real mobile performance/Core Web Vitals and inspect indexing in Search Console. These depend on the live hosting environment and traffic; a local package cannot validate them.

References: [Google multilingual guidance](https://developers.google.com/search/docs/specialty/international/localized-versions), [Apache redirects](https://httpd.apache.org/docs/2.4/rewrite/remapping.html), [Google sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
