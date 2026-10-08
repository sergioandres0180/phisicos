const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'release/public_html');
const base=require('./deployment.json').siteUrl;
const pages=require('./locales/pages.cjs'),{kinds}=require('./locales/site.cjs'),legacy=require('./locales/legacy-routes.cjs'),pageCount=Object.keys(pages).length*kinds.length;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sitemap=read('sitemap.xml');
assert.equal((sitemap.match(/<loc>/g)||[]).length,pageCount);
assert.equal(read('robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
for(const p of Object.values(pages))for(const route of kinds.map(kind=>p[kind])){
 const html=read(route.slice(1)+'index.html');
 assert.ok(html.includes(`rel="canonical" href="${base}${route}"`));
 assert.ok(!/localhost|127\.0\.0\.1|noindex|__ORIGIN__/.test(html));
 for(const [,href] of html.matchAll(/<(?:link|meta)\b[^>]*(?:href|content)="(https?:\/\/[^" ]+)"/g)){
  assert.equal(new URL(href).origin,base,'SEO metadata must use the production origin');
 }
 assert.ok(html.includes('content="summary_large_image"'));
 assert.ok(html.includes(`content="${base}/assets/social-preview.png"`));
}
const png=fs.readFileSync(path.join(root,'assets/social-preview.png'));
assert.equal(png.subarray(1,4).toString(),'PNG');
assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
const config=read('.htaccess');
for(const file of [...Object.values(pages).flatMap(p=>kinds.map(kind=>p[kind]).map(route=>route.slice(1)+'index.html')),'404.html']){
 const html=read(file);
 assert.equal((html.match(/googletagmanager\.com\/gtm\.js/g)||[]).length,1,file);
 assert.equal((html.match(/googletagmanager\.com\/ns\.html/g)||[]).length,1,file);
 assert.equal((html.match(/GTM-TZH7L6DT/g)||[]).length,2,file);
 assert.ok(html.includes('<head><meta charset="utf-8">\n<!-- Google Tag Manager -->'),file);
 assert.ok(html.includes('<body>\n<!-- Google Tag Manager (noscript) -->'),file);
}
console.log(`PASS GTM-TZH7L6DT: one head loader and one body fallback on all ${pageCount+1} production HTML pages`);
assert.ok(!config.includes('__'));
assert.ok(config.includes(`RewriteRule ^ ${base}%{REQUEST_URI} [R=301,L,NE]`));
assert.ok(config.includes('ErrorDocument 404 /404.html'));
for(const [lang,map] of Object.entries(legacy))for(const [kind,from] of Object.entries(map))assert.ok(config.includes(`RewriteRule ^${from.slice(1)}?(?:index\\.html)?$ ${base}${pages[lang][kind]} [R=301,L,NE]`),'missing redirect for '+from);
assert.ok(config.indexOf('[R=301,L,NE]\n\n# Redirect explicitly requested index.html')>config.indexOf(legacy.en.game),'legacy redirects must run before the index.html rule');
assert.ok(config.includes('DirectoryIndex index.html'));
for(const forbidden of ['src','locales','.git','.openai','node_modules','deployment.json','package.json','lab-v1.html'])assert.ok(!fs.existsSync(path.join(root,forbidden)));
console.log(`PASS hosting artifact: ${pageCount} public canonical pages, social images, robots, sitemap, Apache configuration, no development files`);
