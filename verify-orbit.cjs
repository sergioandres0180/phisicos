// Satellite Launch: universal gravitation F = G·M·m ÷ r², the inverse square law, exact conic orbits timed with Kepler's
// equation, crashes, escapes, the geostationary radius, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/orbit.html'),'utf8'),copy=require('./locales/orbit.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'orbit-model'),pure);const Orbit=pure.OrbitModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const GM=6.674e-11*5.972e24,R=6.371e6,P=Math.PI;
const expected=[1000*GM/(R+4e5)**2,100*GM/R**2/4,GM/(R+1e6)**2,Math.sqrt(GM/(R+4e5)),Math.cbrt(GM*86164**2/(4*P*P))/1000];
const make=(i,a=expected[i])=>{const m=new Orbit(i);assert.ok(m.setAnswer(a));return m;};
const energy=s=>s.v*s.v/2-GM/s.r,spin=s=>s.x*s.vy-s.y*s.vx;

test('each launch has the expected answer',()=>{expected.forEach((v,i)=>near(new Orbit(i).exact(),v));near(expected[0],8693.614,1e-6);near(expected[4],42163.11,1e-6);});
test('gravity follows the inverse square law and g does not depend on the mass',()=>{
 const m=new Orbit(0);near(m.forceAt(2*R),m.forceAt(R)/4);near(m.forceAt(3*R),m.forceAt(R)/9);near(m.gravityAt(R),9.8195,1e-4);
 near(new Orbit(1).forceAt(R)/100,new Orbit(0).forceAt(R)/1000);
});
test('the circular speed gives a circle with constant r and speed, timed by T = 2π·√(r³ ÷ G·M)',()=>{
 const m=make(3),r=R+4e5,T=m.duration();assert.equal(m.outcome(),'orbit');near(T,2*P*Math.sqrt(r**3/GM));
 for(const t of [0,600,1700,3000,T]){const s=m.state(t);near(s.r,r,1e-12);near(s.v,expected[3],1e-12);}
 const end=m.state(T);near(end.x,r,1e-9);near(end.y/r,0,1e-9);
});
test('energy and angular momentum stay constant on ellipses and hyperbolas',()=>{
 for(const v of [3000,7000,9000,10000,12000]){const m=make(3,v),s0=m.state(0),T=m.duration();for(const f of [.1,.37,.5,.81,1]){const s=m.state(T*f);near(energy(s),energy(s0),1e-9);near(spin(s),spin(s0),1e-9);}}
});
test('crashes, exits from the view, and full orbits are found exactly inside long steps',()=>{
 const slow=make(3,7000);assert.equal(slow.outcome(),'crash');const e=slow.advance(1e7);assert.equal(e.done,true);near(slow.state(slow.now()).r,R,1e-12);
 const away=make(3,10000);assert.equal(away.outcome(),'away');near(away.state(away.duration()).r,.98*3*R,1e-10);
 const fast=make(3,Math.sqrt(2*GM/(R+4e5)));assert.equal(fast.outcome(),'escape');const out=make(3,31566);assert.equal(out.outcome(),'escape');near(out.state(out.duration()).r,.98*3*R,1e-10);
 assert.equal(make(3,9000).outcome(),'orbit');const kmUnit=make(3,7.67);assert.equal(kmUnit.outcome(),'crash');near(kmUnit.state(kmUnit.duration()).r,R,1e-9);
 const a=make(3,7300),b=make(3,7300);a.advance(1e7);while(b.status!=='done')b.advance(5);near(a.t,b.t,1e-12);
 const frozen=JSON.stringify(a.snapshot());assert.equal(a.advance(1),null);assert.equal(JSON.stringify(a.snapshot()),frozen);
});
test('the geostationary radius keeps the satellite above the city for a whole turn of the Earth',()=>{
 const m=make(4);near(m.duration(),86164);assert.ok(Math.abs(m.geoGap(m.duration()))<.01);
 const low=make(4,35792);assert.ok(low.geoGap(low.duration())>90);const high=make(4,45000);assert.ok(high.geoGap(high.duration())<-20);
});
test('orbits play so that a run lasts about 10 s',()=>{
 assert.equal(make(0).playback(),600);assert.equal(make(4).playback(),8700);for(let i=0;i<5;i++){const m=make(i);assert.ok(m.duration()/m.playback()<=10);}
});
test('answers count within 2%, and a launch counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,8800).evaluate().ok,true);assert.equal(make(0,8900).evaluate().ok,false);assert.equal(make(4,42500).evaluate().ok,true);
 const m=make(2);m.advance(1e6);assert.equal(m.score(),150);
 const n=make(3,7000);n.advance(1);assert.equal(n.attempts,1);n.setAnswer(7672);n.advance(1e6);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, starting with the height used instead of the distance from the centre',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip,F=r=>1000*GM/r**2;
 assert.equal(slip(0,F(4e5)),'altitude');assert.equal(slip(0,F(R)),'surface');assert.equal(slip(0,1000*GM/(R+4e5)),'noSquare');assert.equal(slip(0,F(6771)),'km');assert.equal(slip(0,GM/(R+4e5)**2),'noMass');
 assert.equal(slip(1,100*GM/R**2/2),'half');assert.equal(slip(1,982),'same');
 assert.equal(slip(2,GM/1e12),'altitudeG');assert.equal(slip(2,GM/R**2),'surfaceG');assert.equal(slip(2,GM/(R+1e6)),'noSquareG');assert.equal(slip(2,GM/7371**2),'kmG');
 assert.equal(slip(3,Math.sqrt(GM/4e5)),'altitudeV');assert.equal(slip(3,Math.sqrt(GM/R)),'surfaceV');assert.equal(slip(3,Math.sqrt(2*GM/(R+4e5))),'escape');assert.equal(slip(3,7.67),'kmUnit');assert.equal(slip(3,7000),null);
 assert.equal(slip(4,expected[4]-6371),'altitudeR');
});
test('answers are validated and nothing flies without one',()=>{
 assert.equal(new Orbit(0).setAnswer(0),false);assert.equal(new Orbit(3).setAnswer(50000),false);assert.equal(new Orbit(4).setAnswer(6000),false);assert.equal(new Orbit(4).setAnswer(42163000),false);
 const m=new Orbit(3);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,9000);m.advance(600);const n=new Orbit();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,600);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:1e9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Orbit();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'orbit-model'),script(source,'orbit-model'));
 return mount(html,{scripts:['orbit-model','orbit-interface'],locale:'orbit-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');
  assert.equal(ui.el('given-0').textContent,'m = 1000 kg · h = 400 km');assert.equal(ui.el('given-1').textContent,'m = 100 kg · '+fill(l.surfaceGiven,{F:'982'})+' · r = 2R');
  assert.equal(ui.el('r-value').textContent,'6771');assert.equal(ui.el('force-value').textContent,'—');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.graphHint)&&ui.painted.includes(l.launchLabel));
 });
 test(`${lang}: the pull appears only once the launch starts, and the right force earns the bonus`,()=>{
  ui.input('answer',8694);assert.equal(ui.el('force-value').textContent,'—');assert.ok(ui.painted.includes(fill(l.playbackLabel,{k:'600'})));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(1,1));assert.equal(ui.el('force-value').textContent,fmt(expected[0],0));
  ui.click('play');ui.run(()=>ui.el('orbit-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.orbitCopy,{t:fmt(make(0).duration()/60,1)})+' '+fill(l.measuredForce,{F:fmt(expected[0],0),r:'6771'})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.orbitBanner)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: the height used for r makes the satellite escape, and a slow launch crashes`,()=>{
  ui.click('mission-3');ui.input('answer',31566);ui.click('play');ui.run(()=>ui.el('orbit-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.escapeCopy,{t:fmt(make(3,31566).duration()/60,1)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipAltitudeV));assert.ok(ui.painted.includes(l.escapeBanner));assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',7000);ui.click('play');ui.run(()=>ui.el('orbit-status-text').textContent===l.done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.crashCopy,{t:fmt(make(3,7000).duration()/60,1)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.hint3));
 });
 test(`${lang}: the geostationary radius stays over the city, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('r-value').textContent,'—');ui.input('answer',42163);ui.click('play');ui.run(()=>ui.el('orbit-status-text').textContent===l.done);
  assert.ok(ui.el('lesson-copy').textContent.includes(l.geoHitCopy));assert.ok(ui.painted.includes(l.cityLabel));assert.equal(ui.el('mission-score').textContent,'150');
  ui.click('mission-1');ui.input('answer',245.5);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('orbit-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves launch, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',7000);en.click('play');en.run(()=>en.el('orbit-status-text').textContent===copy.en.done);en.input('answer',7672);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'7672');assert.equal(es.el('orbit-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('orbit-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} satellite launch universal-gravitation and multilingual interface checks passed.`);
