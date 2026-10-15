// Kepler's Clock: Kepler's third law T² = 4π²·r³ ÷ (G·M) on circular orbits, exact orbits and run ends, the mass of
// Jupiter, Mars's distance, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/kepler.html'),'utf8'),copy=require('./locales/kepler.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'kepler-model'),pure);const Kepler=pure.KeplerModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const G=6.674e-11,day=86400,AU=1.496e11,P=Math.PI,T=(M,r)=>2*P*Math.sqrt(r**3/(G*M))/day;
const year=T(1.989e30,AU),expected=[T(5.972e24,3.844e8),T(1.898e27,6.709e8),4*P*P*4.217e8**3/(G*(1.769*day)**2),year,Math.cbrt(G*1.989e30*(687*day)**2/(4*P*P))/AU];
const make=(i,a=expected[i])=>{const m=new Kepler(i);assert.ok(m.setAnswer(a));return m;};

test('each orbit has the expected answer',()=>{expected.forEach((v,i)=>near(new Kepler(i).exact(),v));near(expected[0],27.4529,1e-5);near(expected[3],365.2187,1e-6);near(expected[4],1.52383,1e-5);});
test('T² ÷ r³ is the same for every body around one centre, and the period follows T = 2π·√(r³ ÷ G·M)',()=>{
 for(const i of [1,3,4]){const m=make(i),k=c=>m.period(c)**2/m.radius(c)**3;for(let b=1;b<m.config.bodies.length;b++)near(k(b),k(0));near(k(0),4*P*P/(G*m.mass()));}
 const m=make(1);near(m.period(1)/m.period(0),(6.709/4.217)**1.5);near(make(4).period(1)/day,687,1e-9);
});
test('the right answer brings the marked body back exactly to the start, found exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const m=make(i),e=m.advance(1e12);assert.equal(e.done,true);assert.equal(e.lap,1);assert.ok(Math.abs(m.gap())<1e-6);}
 const short=make(0,20);short.advance(1e12);near(short.gap(),(20/expected[0]-1)*360);const past=make(3,400);past.advance(1e12);assert.ok(past.gap()>0);
 const a=make(1,10),b=make(1,10);a.advance(1e12);let laps=[];while(b.status!=='done'){const r=b.advance(day/120);if(r?.lap)laps.push(r.lap);}near(a.t,b.t,1e-12);assert.deepEqual(laps,[1,2]);
 const frozen=JSON.stringify(a.snapshot());assert.equal(a.advance(1),null);assert.equal(JSON.stringify(a.snapshot()),frozen);
});
test('a heavier Jupiter makes Io go round faster, and the mass of the orbiting body never enters',()=>{
 const light=make(2,expected[2]/4),heavy=make(2,expected[2]*4);near(light.period(0)/heavy.period(0),4);assert.ok(light.gap()<0&&heavy.gap()>0);
});
test('answers count within 2%, and a run counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,28).evaluate().ok,true);assert.equal(make(0,28.1).evaluate().ok,false);assert.equal(make(1,3.5498).evaluate().ok,true);assert.equal(make(4,1.524).evaluate().ok,true);
 const m=make(3);m.advance(1e12);assert.equal(m.score(),150);
 const n=make(2,1e27);n.advance(10);assert.equal(n.attempts,1);n.setAnswer(1.9e27);n.advance(1e12);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip,k=6.709/4.217,e2=expected[2],r=687/year;
 assert.equal(slip(0,expected[0]/(2*P)),'noTwoPi');assert.equal(slip(0,expected[0]*24),'hours');assert.equal(slip(3,expected[3]/(2*P)),'noTwoPi');
 assert.equal(slip(1,1.769*k),'linear');assert.equal(slip(1,1.769*k*k),'squareRatio');assert.equal(slip(1,1.769/k**1.5),'inverse');
 assert.equal(slip(2,e2/(4*P*P)),'noFourPi');assert.equal(slip(2,e2*day*day),'days');assert.equal(slip(2,e2/1e9),'km');assert.equal(slip(2,e2*3600**2),'hoursM');
 assert.equal(slip(4,r),'linearR');assert.equal(slip(4,r*r),'squareR');assert.equal(slip(4,Math.sqrt(r)),'sqrtR');assert.equal(slip(4,1),null);
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Kepler(0).setAnswer(0),false);assert.equal(new Kepler(2).setAnswer(1e10),false);assert.equal(new Kepler(4).setAnswer(4),false);assert.equal(new Kepler(3).setAnswer(20000),false);
 const m=new Kepler(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,1.3);m.advance(10*day);const n=new Kepler();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,10*day);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:9},{...s,t:1e12},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Kepler();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'kepler-model'),script(source,'kepler-model'));
 return mount(html,{scripts:['kepler-model','kepler-interface'],locale:'kepler-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');
  assert.equal(ui.el('given-0').textContent,l.earthName+': M = '+plain(5.972)+' × 10²⁴ kg · '+l.moonName+': r = 384400 km');
  assert.equal(ui.el('period-value').textContent,'—');assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.graphHint)&&ui.painted.includes(l.moonName)&&ui.painted.includes(l.startLabel));
 });
 test(`${lang}: the period shows once the run starts, and the right month brings the Moon back`,()=>{
  ui.input('answer',27.45);assert.ok(ui.painted.includes(fill(l.playbackLabel,{d:'5'})));assert.equal(ui.el('period-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('period-value').textContent,fmt(expected[0]));ui.click('play');ui.run(()=>ui.el('kepler-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.ok(ui.el('lesson-copy').textContent.includes(l.backCopy));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why0));
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.backBanner)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: a period scaled in step with distance falls short, and Mars's distance is found`,()=>{
  ui.click('mission-1');ui.input('answer',2.814);ui.click('play');ui.run(()=>ui.el('kepler-status-text').textContent===l.done);
  const m=make(1,2.814);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.includes(fill(l.shortCopy,{d:fmt(Math.abs(m.gap()),1)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipLinear));assert.ok(ui.el('insight').classList.has('warning'));
  ui.click('mission-4');assert.equal(ui.el('r-value').textContent,'—');ui.input('answer',1.524);assert.equal(ui.el('r-value').textContent,fmt(1.524,3));ui.click('play');ui.run(()=>ui.el('kepler-status-text').textContent===l.done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.marsName)&&ui.painted.includes(l.sunName));
 });
 test(`${lang}: focus loss pauses the clock without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',365);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('kepler-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves orbit, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',1e27);en.click('play');en.run(()=>en.el('kepler-status-text').textContent===copy.en.done);en.input('answer',1.9e27);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.9e+27');assert.equal(es.el('kepler-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('kepler-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} kepler's clock third-law and multilingual interface checks passed.`);
