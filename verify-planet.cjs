// Planet Scale: surface gravity g = G·M ÷ R², weight W = m·g, unchanged mass, exact fall times, slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/planet.html'),'utf8'),copy=require('./locales/planet.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'planet-model'),pure);const Planet=pure.PlanetModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const G=6.674e-11,gMoon=G*7.342e22/1.7374e6**2,gMars=G*6.417e23/3.3895e6**2,gEarth=G*5.972e24/6.371e6**2;
const expected=[gMoon,70*gMars,70,Math.sqrt(4/gMoon),2*gEarth];
const make=(i,a=expected[i])=>{const m=new Planet(i);assert.ok(m.setAnswer(a));return m;};

test('each world has the expected answer',()=>{expected.forEach((v,i)=>near(new Planet(i).exact(),v));near(gMoon,1.6233,1e-4);near(gMars,3.7278,1e-4);near(gEarth,9.8195,1e-4);});
test('g = G·M ÷ R² grows with the mass and falls with the square of the radius, and the mass never changes',()=>{
 near(new Planet(4).gravity(),8/4*gEarth);near(new Planet(1).weight()/new Planet(1).gravity(),70);near(new Planet(2).exact(),70);
 near(new Planet(0).weight(),70*gMoon);assert.ok(new Planet(0).weight()<new Planet(1).weight());
});
test('the ball lands exactly at t = √(2h ÷ g) with v = g·t, inside long steps, then freezes',()=>{
 const m=make(3),e=m.advance(100);assert.equal(e.done,true);near(e.t,expected[3]);near(m.y(m.now()),0,1e-12);near(m.v(m.now()),Math.sqrt(2*gMoon*2));
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(4),b=make(4);a.advance(100);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);
 near(make(0).y(.5),2-.5*gMoon*.25);
});
test('answers count within 2%, and a drop counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,1.65).evaluate().ok,true);assert.equal(make(0,1.66).evaluate().ok,false);assert.equal(make(2,70.5).evaluate().ok,true);
 const m=make(1);m.advance(10);assert.equal(m.score(),150);
 const n=make(3,1);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.57);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, including mass and weight mixed up',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,G*7.342e22/1.7374e6),'noSquare');assert.equal(slip(0,G*7.342e22/1737.4**2),'km');assert.equal(slip(0,9.8),'earth');
 assert.equal(slip(1,70),'mass');assert.equal(slip(1,686),'earthWeight');assert.equal(slip(1,gMars),'gOnly');assert.equal(slip(1,70*gMars/gEarth),'kgf');
 assert.equal(slip(2,70*gMars),'weight');assert.equal(slip(2,70*gMars/gEarth),'scaled');
 assert.equal(slip(3,4/gMoon),'noRoot');assert.equal(slip(3,Math.sqrt(2/gMoon)),'noTwo');assert.equal(slip(3,Math.sqrt(4/gEarth)),'earthTime');
 assert.equal(slip(4,8*gEarth),'massOnly');assert.equal(slip(4,gEarth/4),'radiusOnly');assert.equal(slip(4,4*gEarth),'linear');assert.equal(slip(4,gEarth),'sameAsEarth');assert.equal(slip(4,5),null);
});
test('answers are validated and nothing falls without one',()=>{
 assert.equal(new Planet(0).setAnswer(0),false);assert.equal(new Planet(1).setAnswer(-3),false);assert.equal(new Planet(2).setAnswer(Infinity),false);
 const m=new Planet(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,1.2);m.advance(.5);const n=new Planet();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Planet();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'planet-model'),script(source,'planet-model'));
 return mount(html,{scripts:['planet-model','planet-interface'],locale:'planet-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'g =');
  assert.equal(ui.el('given-0').textContent,'M = '+plain(7.342)+' × 10²² kg · R = 1737 km');assert.equal(ui.el('given-4').textContent,'M = 8·M⊕ · R = 2·R⊕');
  assert.equal(ui.el('g-value').textContent,'—');assert.equal(ui.el('w-value').textContent,'—');
  assert.ok(ui.painted.includes(fill(l.viewTitle,{world:l.moonName}))&&ui.painted.includes(l.chartTitle)&&ui.painted.includes(l.scaleTitle)&&ui.painted.includes(l.earthName));
 });
 test(`${lang}: gravity and the scale appear once the ball is released, and the right g earns the bonus`,()=>{
  ui.input('answer',1.623);assert.equal(ui.el('g-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('g-value').textContent,fmt(gMoon));assert.equal(ui.el('w-value').textContent,fmt(70*gMoon,0));
  ui.click('play');ui.run(()=>ui.el('planet-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.resultCopy,{place:l.onMoon,g:fmt(gMoon),t:fmt(expected[3]),W:fmt(70*gMoon,0)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+fill(l.landedBanner,{t:fmt(expected[3])})));
 });
 test(`${lang}: Earth's weight on Mars is explained, and the mass stays 70 kg`,()=>{
  ui.click('mission-1');assert.equal(ui.el('given-1').textContent,'m = 70 kg · M = '+plain(6.417)+' × 10²³ kg · R = 3390 km');
  ui.input('answer',687);ui.click('play');ui.run(()=>ui.el('planet-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.resultCopy,{place:l.onMars,g:fmt(gMars),t:fmt(Math.sqrt(4/gMars)),W:fmt(70*gMars,0)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipEarthWeight));assert.ok(ui.el('insight').classList.has('warning'));
  ui.click('mission-2');ui.input('answer',70);ui.click('play');ui.run(()=>ui.el('planet-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'150');
 });
 test(`${lang}: focus loss pauses the drop without advancing time`,()=>{
  ui.click('mission-4');assert.ok(ui.painted.includes(fill(l.viewTitle,{world:l.superEarthName})));ui.input('answer',19.6);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('planet-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves world, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',1);en.click('play');en.run(()=>en.el('planet-status-text').textContent===copy.en.done);en.input('answer',1.57);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.57');assert.equal(es.el('planet-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('planet-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} planet scale surface-gravity and multilingual interface checks passed.`);
