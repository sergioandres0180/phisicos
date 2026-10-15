// Earthquake P and S: two kinds of seismic wave. The distance from the S−P gap, the P arrival, the gap at a station, the
// S wave's transverse shake (90°), the S wave's speed from two arrivals, the bursts at the station, the exact end of each run,
// slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/quake.html'),'utf8'),copy=require('./locales/quake.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'quake-model'),pure);const Quake=pure.QuakeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[84,20,25,90,4],units=['km','s','s','°','km/s'],durations=[28,120/3.5+4,64,28,39];
const make=(i,a=expected[i])=>{const m=new Quake(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts 5 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Quake(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,5);});
 const m=new Quake(0);near(m.sTime()-m.pTime(),10);near(new Quake(4).pTime(),20);near(new Quake(4).sTime()-new Quake(4).pTime(),15);
});
test('P pushes the rock along its path, S shakes it across, and each reaches the station on time',()=>{
 const m=make(0),c=m.config;
 assert.equal(m.along(c.d,m.pTime()-.01),0);assert.ok(Math.abs(m.along(c.d,m.pTime()+.7))>.1);assert.equal(m.across(c.d,m.sTime()-.01),0);assert.ok(Math.abs(m.across(c.d,m.sTime()+.7))>.5);
 assert.equal(m.across(c.d,m.pTime()+1),0);assert.equal(m.along(c.d,m.sTime()+3.5),0);
 assert.equal(m.arrived(m.pTime()-.1),0);assert.equal(m.arrived(m.pTime()),1);assert.equal(m.arrived(m.sTime()),2);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,120/3.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(20);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,60),'pOnly');assert.equal(slip(0,35),'sOnly');assert.equal(slip(0,25),'difference');assert.equal(slip(0,70),null);
 assert.equal(slip(1,120/3.5),'sTime');assert.equal(slip(1,720),'multiplied');assert.equal(slip(1,.05),'inverted');assert.equal(slip(1,30),null);
 assert.equal(slip(2,60),'sArrival');assert.equal(slip(2,35),'pArrival');assert.equal(slip(2,95),'added');assert.equal(slip(2,30),null);
 assert.equal(slip(3,0),'pLike');assert.equal(slip(3,180),'pLike');assert.equal(slip(3,45),null);
 assert.equal(slip(4,140/15),'gapOnly');assert.equal(slip(4,7),'pSpeed');assert.equal(slip(4,28),'subtracted');assert.equal(slip(4,5),null);
});
test('answers are validated and nothing moves without one',()=>{
 assert.equal(new Quake(3).setAnswer(0),true);for(const bad of [-1,361,NaN])assert.equal(new Quake(3).setAnswer(bad),false);
 for(const bad of [0,-1,Infinity,NaN,1e5+1])assert.equal(new Quake(0).setAnswer(bad),false);assert.equal(new Quake(0).setAnswer(1e5),true);assert.equal(new Quake(4).setAnswer(1e4+1),false);
 const m=new Quake(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,0);m.advance(5);const n=new Quake();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,5);assert.equal(n.answer,0);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:29},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Quake(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'quake-model'),script(source,'quake-model'));
 return mount(html,{scripts:['quake-model','quake-interface'],locale:'quake-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const m=new Quake(i),c=m.config;return {d:plain(c.d),t:plain(m.pTime()),g:plain(m.sTime()-m.pTime()),v:plain(c.vS)};};
 const ui=open(lang),done=()=>ui.el('quake-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('answer-unit').textContent,'km');
  assert.equal(ui.el('given-0').textContent,`Δt = 10 s · P 6 · S ${plain(3.5)} km/s`);assert.equal(ui.el('given-1').textContent,'d = 120 km · v_P = 6 km/s');assert.equal(ui.el('given-2').textContent,`d = 210 km · P 6 · S ${plain(3.5)} km/s`);
  assert.equal(ui.el('given-3').textContent,`S · v_S = ${plain(3.5)} km/s`);assert.equal(ui.el('given-4').textContent,'d = 140 km · 20 s + 15 s');
  for(const id of ['distance-value','pspeed-value','sspeed-value','arrival-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('quake-equation').textContent,'d = Δt ÷ (1/v_S − 1/v_P)');
  for(const key of ['viewTitle','seismoGraph','panelHint','scaleNote','focusTag','stationTag','motionTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(!ui.painted.includes('d = 84 km'));
 });
 test(`${lang}: the readings appear once the quake starts, and the distance is right on the first try`,()=>{
  ui.input('answer',84);assert.equal(ui.el('distance-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('distance-value').textContent,'84');assert.equal(ui.el('pspeed-value').textContent,num(6,1));assert.equal(ui.el('sspeed-value').textContent,num(3.5,1));assert.equal(ui.el('arrival-value').textContent,'0');
  assert.equal(ui.el('time-value').textContent,num(.56));assert.equal(ui.el('lesson-copy').textContent,fill(l.quakeCopy,{p:num(3.36,0),s:num(1.96,0)}));
  assert.equal(ui.el('quake-equation').textContent,`d = 10 ÷ (1/${plain(3.5)} − 1/6) = ${num(84,1)} km`);assert.ok(ui.painted.includes(fill(l.fastTag,{n:plain(5.6)}))&&ui.painted.includes('d = 84 km'));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('arrival-value').textContent,'2');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis)&&ui.painted.includes('P')&&ui.painted.includes('S'));
 });
 test(`${lang}: the S arrival for the P arrival, then the P arrival`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'t_P =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('quake-equation').textContent,'t = d ÷ v');ui.input('answer',34.29);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(34.29)+' s'})+' '+l.slipSTime);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('quake-equation').textContent,`t_P = d ÷ v_P = 120 ÷ 6 = ${num(20,1)} s`);
  ui.input('answer',20);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the gap at a station 210 km away`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'Δt =');ui.input('answer',25);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('quake-equation').textContent,`Δt = 210 ÷ ${plain(3.5)} − 210 ÷ 6 = ${num(25,1)} s`);
 });
 test(`${lang}: the S wave's shake taken as P's, then across`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');ui.input('answer',0);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(0)+' °'})+' '+l.slipPLike);
  ui.input('answer',90);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('quake-equation').textContent,'θ_S = 90° · θ_P = 0°');
 });
 test(`${lang}: the S wave's speed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'v_S =');assert.equal(ui.el('answer-unit').textContent,'km/s');ui.input('answer',4);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('quake-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('quake-equation').textContent,`v_S = d ÷ t_S = 140 ÷ 35 = ${num(4)} km/s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',34.29);en.click('play');en.run(()=>en.el('quake-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSTime));en.input('answer',20);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'20');assert.equal(es.el('quake-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('quake-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} earthquake P and S and multilingual interface checks passed.`);
