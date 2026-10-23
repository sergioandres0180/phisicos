const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pages = require('./locales/pages.cjs');
const games = require('./locales/games.cjs');
const {kinds,collections,topics,topicOf,tags,tagOf,tagsOf} = require('./locales/site.cjs');
const {ui,index:topicIndex} = require('./locales/topics.cjs');
const {ui:tagUI} = require('./locales/tags.cjs');
const legacyRoutes = require('./locales/legacy-routes.cjs');
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
// Right-to-left languages set the page direction; site.css keeps the simulations left to right.
const htmlTag = lang => `<!doctype html><html lang="${lang}"${pages[lang].dir?` dir="${pages[lang].dir}"`:''}>`;
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
function alternates(kind){return Object.entries(pages).map(([lang,p])=>`<link rel="alternate" hreflang="${lang}" href="${url(p[kind])}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${url(pages.en[kind])}">`;}
// Breadcrumb trail from the homepage to this page: Home / Topics / topic / game, or Home / Topics / collection.
function trail(lang,kind){
 const p=pages[lang],items=[[p.homeLabel,p.home]];
 if(kind==='home')return items;
 items.push([p.topicsLabel,p.topics]);
 if(kind==='topics')return items;
 if(kind.startsWith('tag-')){items.push([p[kind+'Label'],p[kind]]);return items;}
 const t='topic-'+topicOf(kind).id;items.push([p[t+'Label'],p[t]]);
 if(kind!==t)items.push([p[kind+'Label'],p[kind]]);
 return items;
}
// Pages listed by a collection page, as [name, route].
function listed(lang,kind){
 const p=pages[lang],gamesOf=t=>t.games.map(k=>[p[k+'Heading'],p[k]]);
 if(kind==='home')return topics.flatMap(gamesOf);
 if(kind==='topics')return topics.map(t=>[p['topic-'+t.id+'Label'],p['topic-'+t.id]]);
 if(kind.startsWith('tag-'))return gamesOf(tagOf(kind));
 return gamesOf(topicOf(kind));
}
function metadata(lang,kind){
 const p=pages[lang], title=p[kind+'Title'], description=p[kind+'Description'], collection=collections.has(kind);
 const website={'@type':'WebSite','@id':url('/#website'),url:url('/'),name:'Phisicos',inLanguage:Object.keys(pages)};
 const current={'@type':collection?'CollectionPage':'WebPage','@id':url(p[kind]+'#page'),url:url(p[kind]),name:title,description,keywords:p.games,inLanguage:lang,isPartOf:{'@id':website['@id']}};
 const breadcrumbs={'@type':'BreadcrumbList',itemListElement:trail(lang,kind).map(([name,route],i)=>({'@type':'ListItem',position:i+1,name,item:url(route)}))};
 const graph=[website,current,breadcrumbs];
 if(collection){const items=listed(lang,kind);current.mainEntity={'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map(([name,route],i)=>({'@type':'ListItem',position:i+1,name,url:url(route)}))};}
 else{const game={'@type':'VideoGame','@id':url(p[kind]+'#game'),name:p[kind+'Heading'],url:url(p[kind]),description:p[kind+'Description'],inLanguage:lang,genre:p.games,gamePlatform:'Web browser',playMode:'https://schema.org/SinglePlayer',isAccessibleForFree:true};current.mainEntity={'@id':game['@id']};graph.push(game);}
 return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="robots" content="${preview?'noindex, nofollow':'index, follow, max-snippet:-1, max-image-preview:large'}">
<link rel="canonical" href="${url(p[kind])}">\n${alternates(kind)}
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon.png"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="Phisicos"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url(p[kind])}"><meta property="og:locale" content="${p.locale}">
<meta property="og:image" content="${url('/assets/social-preview.png')}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(p[kind+'Heading'] || title)}">
${Object.entries(pages).filter(([l])=>l!==lang).map(([,q])=>`<meta property="og:locale:alternate" content="${q.locale}">`).join('')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${url('/assets/social-preview.png')}"><meta name="twitter:image:alt" content="${esc(p[kind+'Heading'] || title)}"><meta name="theme-color" content="#102637">
<script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>
${collections.has(kind)?'':'<link rel="stylesheet" href="/assets/game.css">'}<link rel="stylesheet" href="/assets/site.css">${(games.find(g=>g.kind===kind)?.styles||[]).map(file=>`<link rel="stylesheet" href="/assets/${file}">`).join('')}`;
}
// The Games menu groups every game under its topic; topic names link to the topic pages.
function header(lang,kind){const p=pages[lang],cur=k=>kind===k?' aria-current="page"':'';return `<a class="skip-link" href="#main-content">${esc(p.skip)}</a><header class="site-header"><a class="site-brand" href="${p.home}"><span aria-hidden="true">↗</span>PHISICOS</a><nav class="site-nav" aria-label="${esc(p.games)}"><a href="${p.home}"${cur('home')}>${esc(p.homeLabel)}</a><a href="${p.topics}"${cur('topics')}>${esc(p.topicsLabel)}</a><details class="games-menu"><summary>${esc(p.gamesMenu)}</summary><nav aria-label="${esc(p.gamesMenu)}">${topics.map(t=>`<div class="menu-group"><a class="menu-topic" href="${p['topic-'+t.id]}"${cur('topic-'+t.id)}>${esc(p['topic-'+t.id+'Label'])}</a>${t.games.map(k=>`<a href="${p[k]}"${cur(k)}>${esc(p[k+'Label'])}</a>`).join('')}</div>`).join('')}</nav></details><details class="language-menu"><summary>${esc(p.language)} · <span lang="${lang}">${esc(p.name)}</span></summary><nav aria-label="${esc(p.language)}">${Object.entries(pages).map(([l,q])=>`<a lang="${l}" hreflang="${l}" href="${q[kind]}"${l===lang?' aria-current="page"':''}>${esc(q.name)}</a>`).join('')}</nav></details></nav></header>`;}
function footer(lang){const p=pages[lang];return `<footer class="site-footer"><span>${esc(p.footer)}</span><a href="${p.home}">${esc(p.games)} · Phisicos</a></footer>`;}
function breadcrumbs(lang,kind){const items=trail(lang,kind),last=items.pop();return `<nav class="breadcrumbs" aria-label="${esc(pages[lang].homeLabel)}">${items.map(([name,route])=>`<a href="${route}">${esc(name)}</a><span aria-hidden="true">/</span>`).join('')}<span aria-current="page">${esc(last[0])}</span></nav>`;}
const count=(lang,t)=>ui[lang].count.replace('{n}',t.games.length);
// Topic tiles: name, summary, and the topic's games in playing order.
function topicTiles(lang,list,level){const p=pages[lang];return `<div class="topic-grid">${list.map(t=>{const c=t.copy[lang];return `<article class="topic-tile"><p class="eyebrow-label">${esc(count(lang,t))}</p><h${level}><a href="${p['topic-'+t.id]}">${esc(c.name)}</a></h${level}><p>${esc(c.summary)}</p><ul>${t.games.map(k=>`<li><a href="${p[k]}">${esc(p[k+'Label'])}</a></li>`).join('')}</ul></article>`;}).join('')}</div>`;}
// Collection tiles: like topic tiles, for collections that cross topics.
function tagTiles(lang,list,level){const p=pages[lang];return `<div class="topic-grid">${list.map(t=>{const c=t.copy[lang];return `<article class="topic-tile"><p class="eyebrow-label">${esc(tagUI[lang].label)} · ${esc(count(lang,t))}</p><h${level}><a href="${p['tag-'+t.id]}">${esc(c.name)}</a></h${level}><p>${esc(c.summary)}</p><ul>${t.games.map(k=>`<li><a href="${p[k]}">${esc(p[k+'Label'])}</a></li>`).join('')}</ul></article>`;}).join('')}</div>`;}
function tagSection(lang,list){return list.length?`<section class="topic-browser" aria-labelledby="collections-heading"><div class="collection-header"><h2 id="collections-heading">${esc(tagUI[lang].collections)}</h2></div>${tagTiles(lang,list,3)}</section>`:'';}
// "Also in" links from a game page to every collection that lists it, outside the breadcrumb trail.
function alsoIn(lang,kind){const p=pages[lang],list=tagsOf(kind);return list.length?`<p class="also-in"><span>${esc(tagUI[lang].alsoIn)}:</span>${list.map(t=>`<a href="${p['tag-'+t.id]}">${esc(t.copy[lang].name)}</a>`).join('')}</p>`:'';}
// Cards are numbered in topic order, so a new game never needs every label renumbered.
const cardNumber=kind=>' · '+String(topics.flatMap(t=>t.games).indexOf(kind)+1).padStart(2,'0');
function card(kind,lang,level){
 const p=pages[lang];
 if(kind==='game')return `<article class="game-card"><div class="game-card-copy"><p class="eyebrow-label">${esc(p.available+cardNumber('game'))}</p><h${level} class="game-card-title"><a href="${p.game}" style="color:inherit;text-decoration:none">${esc(p.cardTitle)}</a></h${level}><p>${esc(p.cardCopy)}</p><div class="game-types"><span>${esc(p.lab)}</span><span>${esc(p.chase)}</span></div><a class="play-link" href="${p.game}">${esc(p.play)} <span aria-hidden="true">↗</span></a></div><dl class="equation-board"><div><dt>${esc(translate('Average speed',lang))}</dt><dd>s̄ = d / t</dd></div><div><dt>${esc(translate('Average velocity',lang))}</dt><dd>v̄ = Δr / t</dd></div></dl></article>`;
 const g=games.find(x=>x.kind===kind),l=g.copy[lang],{tags,board}=g.card(l);
 return `<article class="game-card ${g.kind}-card"><div class="game-card-copy"><p class="eyebrow-label">${esc(l.available+cardNumber(kind))}</p><h${level} class="game-card-title"><a href="${p[g.kind]}" style="color:inherit;text-decoration:none">${esc(l.cardTitle)}</a></h${level}><p>${esc(l.cardCopy)}</p><div class="game-types">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><a class="play-link" href="${p[g.kind]}">${esc(l.playCard)} <span aria-hidden="true">↗</span></a></div><dl class="equation-board">${board.map(([dt,dd])=>`<div><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join('')}</dl></article>`;
}
function page(lang,kind,main){return `${htmlTag(lang)}<head>${metadata(lang,kind)}</head><body><div class="shell">${header(lang,kind)}<main id="main-content">${main}</main>${footer(lang)}</div></body></html>`;}
function homepage(lang){const p=pages[lang],u=ui[lang];return page(lang,'home',`<section class="home-hero"><div><p class="eyebrow-label">${esc(p.heroLabel)}</p><h1>${p.hero}</h1></div><p>${esc(p.lead)}</p></section><section class="topic-browser" aria-labelledby="topics-heading"><div class="collection-header"><h2 id="topics-heading">${esc(u.browse)}</h2><a href="${p.topics}">${esc(u.all)} <span aria-hidden="true">→</span></a></div>${topicTiles(lang,topics,3)}</section><section class="collection" aria-labelledby="games-heading"><div class="collection-header"><h2 id="games-heading">${esc(p.games)}</h2><span>${esc(p.topic)} / ${String(games.length+1).padStart(2,'0')}</span></div>${topics.map(t=>`<section class="topic-group" aria-labelledby="group-${t.id}"><div class="topic-group-header"><h3 id="group-${t.id}"><a href="${p['topic-'+t.id]}">${esc(t.copy[lang].name)}</a></h3><span>${esc(count(lang,t))}</span></div>${t.games.map(k=>card(k,lang,4)).join('')}</section>`).join('')}<aside class="coming-next"><h3>${esc(p.later)}</h3><p>${esc(p.laterCopy)}</p></aside></section><section class="home-learning"><div><h2>${esc(p.homeLearn)}</h2><p>${esc(p.homeBody)}</p></div><ol>${p.homeSteps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section>`);}
function topicsPage(lang){const p=pages[lang],i=topicIndex[lang];return page(lang,'topics',`${breadcrumbs(lang,'topics')}<section class="topic-hero"><p class="eyebrow-label">${esc(i.label)}</p><h1>${esc(i.heading)}</h1><p>${esc(i.intro)}</p></section><section class="topic-browser" aria-label="${esc(i.label)}">${topicTiles(lang,topics,2)}</section>${tagSection(lang,tags)}`);}
function topicPage(t,lang){const kind='topic-'+t.id,c=t.copy[lang],u=ui[lang];return page(lang,kind,`${breadcrumbs(lang,kind)}<section class="topic-hero"><p class="eyebrow-label">${esc(u.eyebrow)} · ${esc(count(lang,t))}</p><h1>${esc(c.heading)}</h1><p>${esc(c.intro)}</p></section><section class="collection" aria-labelledby="topic-games"><div class="collection-header"><h2 id="topic-games">${esc(u.gamesHeading)}</h2><span>${esc(count(lang,t))}</span></div>${t.games.map(k=>card(k,lang,3)).join('')}</section><section class="other-topics" aria-labelledby="other-topics"><div class="collection-header"><h2 id="other-topics">${esc(u.other)}</h2><a href="${pages[lang].topics}">${esc(u.all)} <span aria-hidden="true">→</span></a></div>${topicTiles(lang,topics.filter(x=>x!==t),3)}</section>${tagSection(lang,tags.filter(x=>x.games.some(k=>t.games.includes(k))))}`);}
function tagPage(t,lang){const kind='tag-'+t.id,c=t.copy[lang],u=ui[lang],g=tagUI[lang],p=pages[lang];return page(lang,kind,`${breadcrumbs(lang,kind)}<section class="topic-hero"><p class="eyebrow-label">${esc(g.label)} · ${esc(count(lang,t))}</p><h1>${esc(c.heading)}</h1><p>${esc(c.intro)}</p></section><section class="tag-lesson" aria-labelledby="tag-lesson"><div><h2 id="tag-lesson">${esc(c.lessonTitle)}</h2><p>${esc(c.lesson)}</p></div><dl class="equation-board">${t.equations.map(([k,e])=>`<div><dt>${esc(g[k])}</dt><dd>${esc(e)}</dd></div>`).join('')}</dl></section><section class="collection" aria-labelledby="tag-games"><div class="collection-header"><h2 id="tag-games">${esc(g.gamesHeading)}</h2><span>${esc(count(lang,t))}</span></div>${t.games.map(k=>card(k,lang,3)).join('')}</section><section class="tag-guide" aria-labelledby="tag-guide"><h2 id="tag-guide">${esc(g.howHeading)}</h2><ol>${t.games.map(k=>`<li><a href="${p[k]}">${esc(p[k+'Label'])}</a> ${esc(c.notes[k])}</li>`).join('')}</ol></section><section class="other-topics" aria-labelledby="other-topics"><div class="collection-header"><h2 id="other-topics">${esc(u.browse)}</h2><a href="${p.topics}">${esc(u.all)} <span aria-hidden="true">→</span></a></div>${topicTiles(lang,topics,3)}</section>`);}
function learning(lang){const p=pages[lang];return `<article class="learning-content" aria-labelledby="guide-title"><section><h2 id="guide-title">${esc(p.guideTitle)}</h2><ol>${p.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section><section><h2>${esc(p.lessonTitle)}</h2><p>${esc(p.lesson)}</p><aside class="worked-example"><h3>${esc(p.exampleTitle)}</h3><p>${esc(p.example)}</p></aside></section><section class="faq"><h2>${esc(p.faqTitle)}</h2>${p.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section></article><a class="back-link" href="${p.home}"><span aria-hidden="true">←</span> ${esc(p.back)}</a>`;}
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
// Canvas text containing right-to-left letters is drawn right to left so its words keep their order; numbers and units alone stay left to right.
const canvasDirection=lang=>pages[lang].dir==='rtl'?`<script>(c=>{const fill=c.fillText;c.fillText=function(text,...rest){this.direction=/[\\u0590-\\u08FF]/.test(text)?'rtl':'ltr';return fill.call(this,text,...rest);};})(CanvasRenderingContext2D.prototype);</script>`:'';
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
 .replace('__MAIN__','<main id="main-content">'+breadcrumbs(lang,'game')+alsoIn(lang,'game'))
 .replace('__H1__',`<h1>${esc(p.gameHeading)}</h1>`)
 .replace('__FOOTER__',learning(lang)+'</main>'+footer(lang));
 const scripts=[...source.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)].map(([,id,script])=>`<script id="${id}">${/^(interface|chase-interface)$/.test(id)?localizeScript(script,lang):script}</script>`).join('\n');
 return `${htmlTag(lang)}<head>${metadata(lang,'game')}</head><body>${body}${canvasDirection(lang)}${scripts}</body></html>`;
}
for(const g of games){
 g.html=fs.readFileSync(path.join(root,g.source),'utf8');
 g.css=g.html.match(/<style>([\s\S]*?)<\/style>/)[1];
}
function modulepage(g,lang){
 const p=pages[lang],l=g.copy[lang];
 if(!l)throw new Error(`Missing ${g.kind} locale: ${lang}`);
 for(const key of Object.keys(g.copy.en)){
  if(typeof l[key]!=='string'||!l[key].trim())throw new Error(`Missing ${g.kind} translation ${lang}: ${key}`);
  if(JSON.stringify((l[key].match(/\{\w+\}/g)||[]).sort())!==JSON.stringify((g.copy.en[key].match(/\{\w+\}/g)||[]).sort()))throw new Error(`${g.kind} placeholder mismatch ${lang}: ${key}`);
 }
 let body=g.html.split('<body>')[1].split('<script')[0];
 body=body.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in l))throw new Error(`Unknown ${g.kind} key ${key}`);return esc(l[key]);})
 .replace('__HEADER__',header(lang,g.kind))
 .replace('__BREADCRUMBS__',breadcrumbs(lang,g.kind)+alsoIn(lang,g.kind))
 .replace('__FOOTER__',footer(lang));
 const scripts=[...g.html.matchAll(/<script id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)].map(([,id,attrs,code])=>`<script id="${id}"${attrs}>${id===g.kind+'-locale'?json({lang,strings:l}):code}</script>`).join('\n');
 return `${htmlTag(lang)}<head>${metadata(lang,g.kind)}</head><body>${body}${canvasDirection(lang)}${scripts}</body></html>`;
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
write('assets/module.css',fs.readFileSync(path.join(root,'src/module.css'),'utf8'));
for(const g of games)write(`assets/${g.kind}.css`,g.css);
write('design-guidelines.md',fs.readFileSync(path.join(root,'DESIGN_GUIDELINES.md'),'utf8'));
for(const [lang,p] of Object.entries(pages)){
 write(p.home.slice(1)+'index.html',homepage(lang));
 write(p.topics.slice(1)+'index.html',topicsPage(lang));
 for(const t of topics)write(p['topic-'+t.id].slice(1)+'index.html',topicPage(t,lang));
 for(const t of tags)write(p['tag-'+t.id].slice(1)+'index.html',tagPage(t,lang));
 write(p.game.slice(1)+'index.html',gamepage(lang));
 for(const g of games)write(p[g.kind].slice(1)+'index.html',modulepage(g,lang));
}
const urls=Object.values(pages).flatMap(p=>kinds.map(kind=>p[kind]));
// Old game routes must never collide with a current page, so every redirect leaves the site's page set unchanged.
const redirects=Object.entries(legacyRoutes).flatMap(([lang,map])=>Object.entries(map).map(([kind,from])=>[from,pages[lang][kind]]));
for(const [from] of redirects)if(urls.includes(from))throw new Error('Legacy route is a current page: '+from);
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route=>`<url><loc>${esc(url(route))}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt',preview?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
write('404.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 | Phisicos</title><link rel="stylesheet" href="/assets/site.css"></head><body><div class="shell">${header('en','home')}<main id="main-content"><h1>${pages.en.notFound}</h1><p>${pages.en.missing}</p><a href="/">${pages.en.homeLabel}</a></main>${footer('en')}</div></body></html>`);
if(hosting){
 const config=fs.readFileSync(path.join(root,'hosting/apache.htaccess'),'utf8')
  .replace('__LEGACY_REDIRECTS__',redirects.map(([from,to])=>`RewriteRule ^${from.slice(1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}?(?:index\\.html)?$ __ORIGIN__${to} [R=301,L,NE]`).join('\n'))
  .replaceAll('__ORIGIN__',base).replaceAll('__HOST_REGEX__',origin.host.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 write('.htaccess',config);
}
console.log(`Built ${urls.length} localized pages and a 404 page. ${preview?'PREVIEW (noindex)': 'PRODUCTION'}: ${base}`);
