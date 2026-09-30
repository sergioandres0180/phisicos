const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pages = require('./locales/pages.cjs');
const lander = require('./locales/lander.cjs');
const root = __dirname;
const hosting = process.argv.includes('--hosting');
const target = path.join(root, hosting ? 'release/public_html' : 'dist');
const preview = process.argv.includes('--preview');
if (preview && hosting) throw new Error('A hosting package must be a production build.');
const configuredOrigin = process.env.SITE_URL;
if (!preview && !configuredOrigin) throw new Error('Set SITE_URL to the public HTTPS origin, or use node build.cjs --preview for a noindex localhost build.');
const origin = new URL(configuredOrigin || 'http://localhost:4173');
if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('SITE_URL must be an origin without a path, query, or credentials.');
if (!preview && (origin.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(origin.hostname))) throw new Error('Production requires a public HTTPS origin.');
const base = origin.origin;
const strings = JSON.parse(fs.readFileSync(path.join(root,'locales/strings.json'),'utf8'));
const rows = fs.readFileSync(path.join(root,'locales/translations.tsv'),'utf8').trimEnd().split('\n').map(line=>line.split('\t'));
const languages = rows.shift().slice(1);
if (rows.length !== strings.length) throw new Error('Translation row count mismatch');
const dictionaries = Object.fromEntries(languages.map(lang=>[lang,{}]));
rows.forEach((row,index)=>{
  if (Number(row[0])!==index || row.length!==languages.length+1 || row.some(v=>!v.trim())) throw new Error('Invalid translation row '+index);
  languages.forEach((lang,i)=>dictionaries[lang][strings[index]]=row[i+1].trim());
});
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':'\u00a0'}[s]));
const translate = (value,lang) => {
  if (lang==='en') return value;
  const trimmed=value.trim(), replacement=dictionaries[lang][trimmed];
  if (replacement===undefined) return value;
  return value.slice(0,value.indexOf(trimmed))+replacement+value.slice(value.indexOf(trimmed)+trimmed.length);
};
const url = route => base+route;
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
function alternates(kind){return Object.entries(pages).map(([lang,p])=>`<link rel="alternate" hreflang="${lang}" href="${url(p[kind])}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${url(pages.en[kind])}">`;}
function metadata(lang,kind){
 const p=pages[lang], title=p[kind+'Title'], description=p[kind+'Description'];
 const website={'@type':'WebSite','@id':url('/#website'),url:url('/'),name:'Motion Lab',inLanguage:Object.keys(pages)};
 const current={'@type':kind==='home'?'CollectionPage':'WebPage','@id':url(p[kind]+'#page'),url:url(p[kind]),name:title,description,inLanguage:lang,isPartOf:{'@id':website['@id']}};
 const gameKind=kind==='home'?'game':kind;
 const game={'@type':'VideoGame','@id':url(p[gameKind]+'#game'),name:p[gameKind+'Heading'],url:url(p[gameKind]),description:p[gameKind+'Description'],inLanguage:lang,genre:p.games,gamePlatform:'Web browser',playMode:'https://schema.org/SinglePlayer',isAccessibleForFree:true};
 const breadcrumbs={'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:p.homeLabel,item:url(p.home)},...(kind!=='home'?[{'@type':'ListItem',position:2,name:p[kind+'Label'],item:url(p[kind])}]:[])]};
 const graph=[website,current,breadcrumbs];
 if(kind!=='home'){current.mainEntity={'@id':game['@id']};graph.push(game);}else{current.mainEntity={'@type':'ItemList',numberOfItems:2,itemListElement:[{'@type':'ListItem',position:1,name:p.cardTitle,url:url(p.game)},{'@type':'ListItem',position:2,name:p.landerHeading,url:url(p.lander)}]};}
 return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="robots" content="${preview?'noindex, nofollow':'index, follow, max-snippet:-1, max-image-preview:large'}">
<link rel="canonical" href="${url(p[kind])}">\n${alternates(kind)}
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon.png"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="Motion Lab"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url(p[kind])}"><meta property="og:locale" content="${p.locale}">
<meta property="og:image" content="${url('/assets/social-preview.png')}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(p[kind+'Heading'] || title)}">
${Object.entries(pages).filter(([l])=>l!==lang).map(([,q])=>`<meta property="og:locale:alternate" content="${q.locale}">`).join('')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${url('/assets/social-preview.png')}"><meta name="twitter:image:alt" content="${esc(p[kind+'Heading'] || title)}"><meta name="theme-color" content="#102637">
<script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>
${kind!=='home'?'<link rel="stylesheet" href="/assets/game.css">':''}<link rel="stylesheet" href="/assets/site.css">${kind==='lander'?'<link rel="stylesheet" href="/assets/lander.css">':''}`;
}
function header(lang,kind){const p=pages[lang];return `<a class="skip-link" href="#main-content">${esc(p.skip)}</a><header class="site-header"><a class="site-brand" href="${p.home}"><span aria-hidden="true">↗</span>MOTION LAB</a><nav class="site-nav" aria-label="${esc(p.games)}"><a href="${p.home}"${kind==='home'?' aria-current="page"':''}>${esc(p.homeLabel)}</a><a href="${p.game}"${kind==='game'?' aria-current="page"':''}>${esc(p.gameLabel)}</a><a href="${p.lander}"${kind==='lander'?' aria-current="page"':''}>${esc(p.landerLabel)}</a><details class="language-menu"><summary>${esc(p.language)} · <span lang="${lang}">${esc(p.name)}</span></summary><nav aria-label="${esc(p.language)}">${Object.entries(pages).map(([l,q])=>`<a lang="${l}" hreflang="${l}" href="${q[kind]}"${l===lang?' aria-current="page"':''}>${esc(q.name)}</a>`).join('')}</nav></details></nav></header>`;}
function footer(lang){const p=pages[lang];return `<footer class="site-footer"><span>${esc(p.footer)}</span><a href="${p.home}">${esc(p.games)} · Motion Lab</a></footer>`;}
function homepage(lang){const p=pages[lang];return `<!doctype html><html lang="${lang}"><head>${metadata(lang,'home')}</head><body><div class="shell">${header(lang,'home')}<main id="main-content"><section class="home-hero"><div><p class="eyebrow-label">${esc(p.games)}</p><h1>${p.hero}</h1></div><p>${esc(p.lead)}</p></section><section class="collection" aria-labelledby="games-heading"><div class="collection-header"><h2 id="games-heading">${esc(p.games)}</h2><span>${esc(p.topic)} / 02</span></div><article class="game-card"><div class="game-card-copy"><p class="eyebrow-label">${esc(p.available)}</p><h3><a href="${p.game}" style="color:inherit;text-decoration:none">${esc(p.cardTitle)}</a></h3><p>${esc(p.cardCopy)}</p><div class="game-types"><span>${esc(p.lab)}</span><span>${esc(p.chase)}</span></div><a class="play-link" href="${p.game}">${esc(p.play)} <span aria-hidden="true">↗</span></a></div><dl class="equation-board"><div><dt>${esc(translate('Average speed',lang))}</dt><dd>s̄ = d / t</dd></div><div><dt>${esc(translate('Average velocity',lang))}</dt><dd>v̄ = Δr / t</dd></div></dl></article>${landerCard(lang)}<aside class="coming-next"><h3>${esc(p.later)}</h3><p>${esc(p.laterCopy)}</p></aside></section><section class="home-learning"><div><h2>${esc(p.homeLearn)}</h2><p>${esc(p.homeBody)}</p></div><ol>${p.homeSteps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section></main>${footer(lang)}</div></body></html>`;}
function landerCard(lang){const p=pages[lang],l=lander[lang];return `<article class="game-card lander-card"><div class="game-card-copy"><p class="eyebrow-label">${esc(l.available)}</p><h3><a href="${p.lander}" style="color:inherit;text-decoration:none">${esc(l.cardTitle)}</a></h3><p>${esc(l.cardCopy)}</p><div class="game-types"><span>${esc(l.conceptGravity)}</span><span>${esc(l.conceptAcceleration)}</span></div><a class="play-link" href="${p.lander}">${esc(l.playCard)} <span aria-hidden="true">↗</span></a></div><dl class="equation-board"><div><dt>${esc(l.netAcceleration)}</dt><dd>a = aₜ − g</dd></div><div><dt>${esc(l.contactLabel)}</dt><dd>|v| ≤ 1.5 m/s</dd></div></dl></article>`;}
function learning(lang){const p=pages[lang];return `<article class="learning-content" aria-labelledby="guide-title"><section><h2 id="guide-title">${esc(p.guideTitle)}</h2><ol>${p.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section><section><h2>${esc(p.lessonTitle)}</h2><p>${esc(p.lesson)}</p><aside class="worked-example"><h3>${esc(p.exampleTitle)}</h3><p>${esc(p.example)}</p></aside></section><section class="faq"><h2>${esc(p.faqTitle)}</h2>${p.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section></article><a class="back-link" href="${p.home}">← ${esc(p.back)}</a>`;}
let source=fs.readFileSync(path.join(root,'src/velocity.html'),'utf8');
const gameCSS=source.match(/<style>([\s\S]*?)<\/style>/)[1];
function localizeHTML(markup,lang){
 // Translate text nodes and accessible names, never IDs, classes, or code identifiers.
 return markup.replace(/(<[^>]+>)|([^<]+)/g,(part,tag,text)=>{
   if(tag)return tag.replace(/\b(aria-label|title)="([^"]*)"/g,(_,name,value)=>`${name}="${esc(translate(decode(value),lang))}"`);
   return esc(translate(decode(text),lang));
 });
}
function localizeScript(script,lang){
 // Lex comments and quoted literals so translations cannot alter CSS selectors,
 // physics identifiers, method names, or strings inside comments.
 let result=script.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,token=>{
   if(!/^['"]/.test(token))return token;
   const value=vm.runInNewContext(token);
   const translated=translate(value,lang);
   return translated===value?token:JSON.stringify(translated);
 });
 // Only interface formatters contain these calls; physical state remains numeric.
 result=result.replace('.toFixed(digits)',`.toLocaleString('${lang}', {minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:false})`).replace('.toFixed(d)',`.toLocaleString('${lang}', {minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false})`);
 // A semicolon separates vector components in decimal-comma locales.
 if(lang!=='en')result=result.replace("+signed(x)+', '+signed(y)","+signed(x)+'; '+signed(y)").replace("+sign(x)+', '+sign(y)","+sign(x)+'; '+sign(y)");
 new vm.Script(result);
 return result;
}
function gamepage(lang){
 const p=pages[lang];
 let body=source.split('<body>')[1].split('<script')[0];
 body=body.replace(/<header class="topbar">[\s\S]*?<\/header>/,'__HEADER__');
 body=body.replace(/<footer class="footer">[\s\S]*?<\/footer>/,'__FOOTER__');
 body=body.replace('<main id="lab-panel"','<section id="lab-panel"').replace('</main>','</section>');
 body=body.replace('<div class="masthead">','__MAIN__<div class="masthead">');
 body=body.replace(/<h1>[\s\S]*?<\/h1>/,'__H1__');
 body=localizeHTML(body,lang)
 .replace('__HEADER__',header(lang,'game'))
 .replace('__MAIN__',`<main id="main-content"><nav class="breadcrumbs" aria-label="${esc(p.homeLabel)}"><a href="${p.home}">${esc(p.games)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.gameLabel)}</span></nav>`)
 .replace('__H1__',`<h1>${esc(p.gameHeading)}</h1>`)
 .replace('__FOOTER__',learning(lang)+'</main>'+footer(lang));
 const scripts=[...source.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)].map(([,id,script])=>`<script id="${id}">${/^(interface|chase-interface)$/.test(id)?localizeScript(script,lang):script}</script>`).join('\n');
 return `<!doctype html><html lang="${lang}"><head>${metadata(lang,'game')}</head><body>${body}${scripts}</body></html>`;
}
const landerSource=fs.readFileSync(path.join(root,'src/lander.html'),'utf8');
const landerCSS=landerSource.match(/<style>([\s\S]*?)<\/style>/)[1];
function landerpage(lang){
 const p=pages[lang],l=lander[lang];
 if(!l)throw new Error('Missing Lunar Lander locale: '+lang);
 for(const key of Object.keys(lander.en)){
  if(typeof l[key]!=='string'||!l[key].trim())throw new Error('Missing lander translation '+lang+': '+key);
  if(JSON.stringify((l[key].match(/\{\w+\}/g)||[]).sort())!==JSON.stringify((lander.en[key].match(/\{\w+\}/g)||[]).sort()))throw new Error('Lander placeholder mismatch '+lang+': '+key);
 }
 let body=landerSource.split('<body>')[1].split('<script')[0];
 body=body.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in l))throw new Error('Unknown lander key '+key);return esc(l[key]);})
 .replace('__HEADER__',header(lang,'lander'))
 .replace('__BREADCRUMBS__',`<nav class="breadcrumbs" aria-label="${esc(p.homeLabel)}"><a href="${p.home}">${esc(p.games)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(l.navLabel)}</span></nav>`)
 .replace('__FOOTER__',footer(lang));
 const scripts=[...landerSource.matchAll(/<script id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)].map(([,id,attrs,code])=>`<script id="${id}"${attrs}>${id==='lander-locale'?json({lang,strings:l}):code}</script>`).join('\n');
 return `<!doctype html><html lang="${lang}"><head>${metadata(lang,'lander')}</head><body>${body}${scripts}</body></html>`;
}
// Install once on every production HTML page, including 404. Local previews do not send analytics.
const gtmHead=`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TZH7L6DT');</script>
<!-- End Google Tag Manager -->`;
const gtmBody=`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TZH7L6DT"
height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
function write(relative,content){
 if(!preview && relative.endsWith('.html'))content=content
  .replace('<meta charset="utf-8">',`<meta charset="utf-8">\n${gtmHead}\n`)
  .replace('<body>',`<body>\n${gtmBody}\n`);
 const file=path.join(target,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
}
// Output is disposable; source and archives remain outside dist.
fs.rmSync(target,{recursive:true,force:true});
fs.cpSync(path.join(root,'src/assets'),path.join(target,'assets'),{recursive:true});
write('assets/site.css',fs.readFileSync(path.join(root,'src/site.css'),'utf8'));
write('assets/game.css',gameCSS);
write('assets/lander.css',landerCSS);
write('design-guidelines.md',fs.readFileSync(path.join(root,'DESIGN_GUIDELINES.md'),'utf8'));
for(const [lang,p] of Object.entries(pages)){
 write(p.home.slice(1)+'index.html',homepage(lang));
 write(p.game.slice(1)+'index.html',gamepage(lang));
 write(p.lander.slice(1)+'index.html',landerpage(lang));
}
const urls=Object.values(pages).flatMap(p=>[p.home,p.game,p.lander]);
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route=>`<url><loc>${esc(url(route))}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt',preview?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
write('404.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 | Motion Lab</title><link rel="stylesheet" href="/assets/site.css"></head><body><div class="shell">${header('en','home')}<main id="main-content"><h1>${pages.en.notFound}</h1><p>${pages.en.missing}</p><a href="/">${pages.en.homeLabel}</a></main>${footer('en')}</div></body></html>`);
if(hosting){
 const config=fs.readFileSync(path.join(root,'hosting/apache.htaccess'),'utf8')
  .replaceAll('__ORIGIN__',base).replaceAll('__HOST_REGEX__',origin.host.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 write('.htaccess',config);
}
console.log(`Built 24 localized pages and a 404 page. ${preview?'PREVIEW (noindex)': 'PRODUCTION'}: ${base}`);
