// Validates generated HTML and executes each localized game without a browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const pages=require('./locales/pages.cjs');
const {kinds,collections,topics,tags,gameKinds}=require('./locales/site.cjs'),legacy=require('./locales/legacy-routes.cjs'),pageCount=Object.keys(pages).length*kinds.length;
const root=path.resolve(__dirname,process.env.SITE_OUTPUT || 'dist');
const source=fs.readFileSync(path.join(__dirname,'src/velocity.html'),'utf8');
const strings=JSON.parse(fs.readFileSync(path.join(__dirname,'locales/strings.json'),'utf8'));
const rows=fs.readFileSync(path.join(__dirname,'locales/translations.tsv'),'utf8').trimEnd().split('\n').map(s=>s.split('\t'));
const langs=rows.shift().slice(1);
const read=route=>fs.readFileSync(path.join(root,route,'index.html'),'utf8');
const script=(html,id)=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>'))[1];
const translated=(text,lang)=>lang==='en'?text:rows[strings.indexOf(text)][langs.indexOf(lang)+1].trim();
const fmt=(n,lang,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
let checks=0;
const test=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const canonical=html=>html.match(/<link rel="canonical" href="([^"]+)"/)[1];
const titles=new Set(), descriptions=new Set(), expectedURLs=[];
for(const [lang,p] of Object.entries(pages)){
 for(const kind of kinds){
  const html=read(p[kind]);expectedURLs.push(canonical(html));
  test(`${lang} ${kind}: language, content, metadata, headings, structured data and links`,()=>{
   assert.ok(html.startsWith(`<!doctype html><html lang="${lang}">`));
   assert.equal((html.match(/<h1\b/g)||[]).length,1);
   assert.equal((html.match(/<main\b/g)||[]).length,1);assert.equal((html.match(/<\/main>/g)||[]).length,1);
   assert.ok(!/__(?:H1|HEADER|FOOTER|MAIN)__/.test(html));
   const title=html.match(/<title>(.*?)<\/title>/)[1],desc=html.match(/<meta name="description" content="([^"]+)"/)[1];
   assert.ok(!titles.has(title),'duplicate title');titles.add(title);assert.ok(!descriptions.has(desc),'duplicate description');descriptions.add(desc);
   assert.ok(title.length>15 && title.length<105);assert.ok(desc.length>(lang==='ja'?50:70)); // Japanese characters carry about twice the content of Latin letters
   const canonicalURL=new URL(canonical(html));assert.equal(canonicalURL.pathname,p[kind]);
   const alternates=[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m=>m.slice(1));
   assert.equal(alternates.length,Object.keys(pages).length+1);assert.equal(new Set(alternates.map(a=>a[0])).size,Object.keys(pages).length+1);
   for(const [code,href] of alternates){assert.equal(new URL(href).pathname,pages[code==='x-default'?'en':code][kind]);assert.equal(new URL(href).origin,canonicalURL.origin);}
   const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
   for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)){
    if(href.startsWith('#'))assert.ok(ids.includes(href.slice(1)),'missing fragment '+href);
    if(href.startsWith('/'))assert.ok(fs.existsSync(path.join(root,href.endsWith('/')?href+'index.html':href)),'missing link '+href);
   }
   const menu=html.match(/<details class="language-menu">([\s\S]*?)<\/details>/)[1];
   for(const [other,q] of Object.entries(pages))assert.ok(menu.includes(`lang="${other}" hreflang="${other}" href="${q[kind]}"`));
   const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
   assert.equal(schema['@context'],'https://schema.org');
   assert.ok(schema['@graph'].some(n=>n['@type']==='BreadcrumbList'));
   assert.ok(schema['@graph'].some(n=>n.inLanguage===lang));
   assert.equal(schema['@graph'].find(n=>n['@type']===(collections.has(kind)?'CollectionPage':'WebPage')).url,canonical(html));
   if(!collections.has(kind))assert.equal(schema['@graph'].find(n=>n['@type']==='VideoGame').url,canonical(html));
   const noindex=html.includes('content="noindex, nofollow"');assert.equal(noindex,fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('Disallow: /'));
   assert.ok(!html.includes('BLUEPRINT.md')&&!html.includes('lab-v1.html'),'archives should not be linked as indexed pages');
  });
 }
 const html=read(p.game);
 test(`${lang}: both physics engines are preserved exactly`,()=>{
  for(const id of ['physics-engine','chase-physics'])assert.equal(script(html,id),script(source,id));
 });
 // The adapter deliberately rejects missing DOM IDs and invalid drawing coordinates.
 const elements=new Map(),frames=[],events=new Map(),painted=[];
 const drawing=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));if(k==='fillText')painted.push(args[0]);}),set:(o,k,v)=>(o[k]=v,true)});
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const tag=m[0],id=m[1];elements.set(id,{id,checked:/\bchecked\b/.test(tag),disabled:/\bdisabled\b/.test(tag),hidden:/\bhidden\b/.test(tag),value:tag.match(/value="([^"]*)"/)?.[1]??'',textContent:'',events:{},attributes:{},classList:{toggle(){}},setAttribute(n,v){this.attributes[n]=v;},addEventListener(n,f){this.events[n]=f;},getBoundingClientRect(){return{width:800,height:367};},getContext(){return drawing;},focus(){}});
 }
 const el=id=>{assert.ok(elements.has(id),'missing ID '+id);return elements.get(id);};
 const doc={hidden:false,getElementById:el,addEventListener(n,f){if(!events.has(n))events.set(n,[]);events.get(n).push(f);}};
 const env=vm.createContext({document:doc,window:{devicePixelRatio:2,addEventListener(){}},requestAnimationFrame(f){frames.push(f);},ResizeObserver:class{observe(){}},console});
 for(const id of ['physics-engine','chase-physics','interface','chase-interface','experience-tabs'])vm.runInContext(script(html,id),env);
 const click=id=>{assert.ok(!el(id).disabled,id+' disabled');el(id).events.click({target:el(id)});};
 const input=(id,value)=>{el(id).value=String(value);el(id).events.input({target:el(id)});};
 const tick=time=>frames.splice(0).forEach(f=>f(time));
 test(`${lang}: translated initialization, stepping, directions and circular canvas description`,()=>{
  assert.equal(el('insight-title').textContent,translated('Predict before you press play',lang));
  assert.equal(el('direction-value').textContent,translated('Right (+x)',lang));
  assert.ok(painted.includes(translated('START',lang)));
  click('step');assert.equal(el('time-metric').textContent,fmt(.1,lang));
  assert.equal(el('status-text').textContent,translated('Paused',lang));
  click('reverse');assert.equal(el('direction-value').textContent,translated('Left (−x)',lang));
  click('circular');assert.equal(el('start-label').textContent,translated('Initial angle',lang));
  assert.equal(el('canvas').attributes['aria-label'],translated(strings[233],lang));
  input('speed',0);click('step');assert.equal(el('insight-title').textContent,translated('At rest now. The journey still has an average.',lang));
 });
 test(`${lang}: round trip completes with translated feedback and unchanged results`,()=>{
  click('linear');input('speed',4);input('acceleration',0);click('challenge-start');tick(1000);for(let i=1;i<=90;i++)tick(1000+i*100);
  assert.equal(el('challenge-badge').textContent,translated('COMPLETE',lang));
  assert.equal(el('time-metric').textContent,fmt(8,lang));assert.equal(el('velocity-metric').textContent,fmt(0,lang));
  assert.ok(el('challenge-feedback').textContent.startsWith(translated('Success!',lang)));
 });
 test(`${lang}: chase, direction feedback, catch, and full lap work in the selected language`,()=>{
  click('chase-tab');click('chase-step');click('chase-reverse');
  assert.ok(el('chase-lesson').textContent.includes(translated('left (−x)',lang)));
  click('chase-catch-mode');click('chase-play');tick(12000);for(let i=1;i<=70;i++)tick(12000+i*100);
  assert.equal(el('chase-time').textContent,fmt(6,lang));assert.equal(el('chase-score').textContent,'0320');
  assert.equal(el('chase-status-text').textContent,translated('Caught!',lang));
  assert.ok(painted.includes(translated('GHOST CAUGHT!',lang)));
  assert.equal(el('chase-lesson-title').textContent,translated('Ghost caught! The route was longer than the shortcut.',lang));
  click('chase-lap-mode');click('chase-play');tick(22000);for(let i=1;i<=130;i++)tick(22000+i*100);
  assert.equal(el('chase-time').textContent,fmt(12,lang));assert.equal(el('chase-distance').textContent,fmt(48,lang));
  assert.equal(el('chase-average-velocity').textContent,fmt(0,lang));assert.equal(el('chase-average-speed').textContent,fmt(4,lang));
  assert.equal(el('chase-mission-status').textContent,translated('COMPLETE',lang));
  assert.equal(el('chase-lesson-title').textContent,translated('A whole journey. Zero net change in position.',lang));
  assert.ok(painted.includes(translated('BACK AT THE START',lang)));
  click('chase-play');doc.hidden=true;events.get('visibilitychange').forEach(f=>f());assert.equal(el('chase-status-text').textContent,translated('Paused',lang));
 });
}
// Topic browsing: every game sits under its topic in the URL, the breadcrumbs, the menu, and the topic page.
for(const [lang,p] of Object.entries(pages)){
 test(`${lang}: topic pages list their games, and games link back to their topic`,()=>{
  const listed=new Set();
  for(const t of topics){
   const route=p['topic-'+t.id],html=read(route);assert.ok(route.startsWith(p.topics)&&route.split('/').filter(Boolean).length===p.topics.split('/').filter(Boolean).length+1);
   const cards=[...html.matchAll(/<h3 class="game-card-title"><a href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(cards,t.games.map(k=>p[k]));
   const items=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='CollectionPage').mainEntity.itemListElement;
   assert.deepEqual(items.map(i=>new URL(i.url).pathname),t.games.map(k=>p[k]));
   for(const k of t.games){
    listed.add(k);assert.ok(p[k].startsWith(route),`${k} is not under ${route}`);
    const game=read(p[k]),crumbs=game.match(/<nav class="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.deepEqual([...crumbs.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),[p.home,p.topics,route]);
    const trail=JSON.parse(game.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='BreadcrumbList').itemListElement;
    assert.deepEqual(trail.map(i=>new URL(i.item).pathname),[p.home,p.topics,route,p[k]]);
   }
  }
  assert.deepEqual([...listed].sort(),[...gameKinds].sort());
  const index=read(p.topics),menu=read(p.home).match(/<details class="games-menu">([\s\S]*?)<\/details>/)[1];
  for(const t of topics)assert.ok(index.includes(`<a href="${p['topic-'+t.id]}">`));
  const groups=[...menu.matchAll(/<div class="menu-group">([\s\S]*?)<\/div>/g)].map(m=>[...m[1].matchAll(/href="([^"]+)"/g)].map(x=>x[1]));
  assert.deepEqual(groups,topics.map(t=>[p['topic-'+t.id],...t.games.map(k=>p[k])]));
 });
 test(`${lang}: old game routes are gone from the site and map to the same game`,()=>{
  for(const [kind,from] of Object.entries(legacy[lang])){assert.notEqual(from,p[kind]);assert.ok(!fs.existsSync(path.join(root,from,'index.html')),'stale page '+from);}
 });
}
// Collections: a game keeps its topic route and breadcrumbs, and links to every collection that lists it.
for(const [lang,p] of Object.entries(pages)){
 test(`${lang}: collections list their games, and those games link back`,()=>{
  const index=read(p.topics);
  for(const t of tags){
   const route=p['tag-'+t.id],html=read(route);assert.ok(route.startsWith(p.topics)&&route.split('/').filter(Boolean).length===p.topics.split('/').filter(Boolean).length+1);
   const cards=[...html.matchAll(/<h3 class="game-card-title"><a href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(cards,t.games.map(k=>p[k]));
   const items=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='CollectionPage').mainEntity.itemListElement;
   assert.deepEqual(items.map(i=>new URL(i.url).pathname),t.games.map(k=>p[k]));
   const crumbs=html.match(/<nav class="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/)[1];assert.deepEqual([...crumbs.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),[p.home,p.topics]);
   assert.ok(index.includes(`<a href="${route}">`));
   for(const k of t.games){const also=read(p[k]).match(/<p class="also-in">([\s\S]*?)<\/p>/);assert.ok(also&&also[1].includes(`href="${route}"`),`${k} does not link to ${route}`);}
   for(const topic of topics)assert.equal(read(p['topic-'+topic.id]).includes(`<a href="${route}">`),t.games.some(k=>topic.games.includes(k)));
  }
  for(const k of gameKinds)if(!tags.some(t=>t.games.includes(k)))assert.ok(!read(p[k]).includes('class="also-in"'),k+' has an unexpected collection link');
 });
}
test(`sitemap contains exactly the ${pageCount} self-canonical URLs, and no archive or 404 pages`,()=>{
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const actual=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.deepEqual(actual.sort(),expectedURLs.sort());assert.equal(new Set(actual).size,pageCount);
 const error=fs.readFileSync(path.join(root,'404.html'),'utf8');assert.ok(error.includes('content="noindex"'));
 assert.ok(!fs.existsSync(path.join(root,'lab-v1.html')));assert.ok(!fs.existsSync(path.join(root,'BLUEPRINT.md')));
});
console.log(`\n${checks} site and localization checks passed.`);
