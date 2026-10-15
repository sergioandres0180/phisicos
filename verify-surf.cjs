// Surfer's Wait: the period of a wave. The wait between crests T = λ ÷ v, waves a minute, the swell's speed from a pier,
// a storm swell's spacing λ = v·T, the frequency f = 1 ÷ T, the crests reaching the surfer, the exact end of each run,
// slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/surf.html'),'utf8'),copy=require('./locales/surf.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'surf-model'),pure);const Surf=pure.SurfModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[6,10,8,180,.125],units=['s','','m/s','m','Hz'],durations=[15,15,12.5,30,20];
const make=(i,a=expected[i])=>{const m=new Surf(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts about 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Surf(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,4);});
});
test('a crest reaches the waiting surfer once every period, the first after half a period',()=>{
 for(let i=0;i<5;i++){const m=make(i),T=m.period(),xs=m.surfer();const q=m.crestTimes();assert.equal(q.length,3);q.forEach((tau,k)=>{near(tau,(k+.5)*T);near(m.height(xs,tau),1);});
  near(m.height(xs,T),-1);assert.equal(m.crests(0),0);assert.equal(m.crests(T),1);assert.equal(m.crests(m.duration()),3);}
});
test('the swell repeats every wavelength and moves one wavelength each period',()=>{
 const m=make(0),c=m.config;for(const [x,t] of [[0,0],[13,2.5],[47,9]]){near(m.height(x,t),m.height(x+c.l,t),1e-9);near(m.height(x+c.v*1.5,t+1.5),m.height(x,t),1e-9);near(m.height(x+c.l,t+m.period()),m.height(x,t),1e-9);}
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1000);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(100);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,6);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(10);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,600),'multiplied');assert.equal(slip(0,1/6),'inverted');assert.equal(slip(0,3),null);
 assert.equal(slip(1,6),'periodNumber');assert.equal(slip(1,360),'times');assert.equal(slip(1,1/6),'perSecond');assert.equal(slip(1,12),null);
 assert.equal(slip(2,200),'multipliedSpeed');assert.equal(slip(2,.125),'invertedSpeed');assert.equal(slip(2,5),null);
 assert.equal(slip(3,1.25),'divided');assert.equal(slip(3,.8),'invertedLength');assert.equal(slip(3,90),null);
 assert.equal(slip(4,8),'periodInstead');assert.equal(slip(4,7.5),'perMinuteInstead');assert.equal(slip(4,.25),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Surf(0).setAnswer(bad),false);assert.equal(new Surf(0).setAnswer(1e6),true);assert.equal(new Surf(3).setAnswer(1e7),true);assert.equal(new Surf(4).setAnswer(1e4+1),false);
 const m=new Surf(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,90);m.advance(5);const n=new Surf();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,5);assert.equal(n.answer,90);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:31},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Surf(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'surf-model'),script(source,'surf-model'));
 return mount(html,{scripts:['surf-model','surf-interface'],locale:'surf-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const c=Surf.missions[i],T=c.l/c.v;return {T:plain(T),n:plain(60/T),v:plain(c.v),l:plain(c.l),f:num(1/T,3)};};
 const ui=open(lang),done=()=>ui.el('surf-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,'λ = 60 m · v = 10 m/s');assert.equal(ui.el('given-1').textContent,'λ = 60 m · v = 10 m/s');assert.equal(ui.el('given-2').textContent,'λ = 40 m · T = 5 s');
  assert.equal(ui.el('given-3').textContent,'v = 15 m/s · T = 12 s');assert.equal(ui.el('given-4').textContent,'T = 8 s');
  for(const id of ['period-value','wavelength-value','speed-value','crest-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('surf-equation').textContent,'T = λ ÷ v');
  for(const key of ['viewTitle','surferGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(plain(100)+' m'));
 });
 test(`${lang}: the readings appear once the swell starts, and the wait is right on the first try`,()=>{
  ui.input('answer',6);assert.equal(ui.el('period-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('period-value').textContent,num(6,1));assert.equal(ui.el('wavelength-value').textContent,'60');assert.equal(ui.el('speed-value').textContent,num(10,1));assert.equal(ui.el('crest-value').textContent,'0');
  assert.equal(ui.el('time-value').textContent,num(.375));assert.equal(ui.el('lesson-copy').textContent,fill(l.surfCopy,{n:'0'}));
  assert.equal(ui.el('surf-equation').textContent,`T = λ ÷ v = 60 ÷ 10 = ${num(6)} s`);assert.ok(ui.painted.includes(fill(l.fastTag,{n:plain(3.75)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('crest-value').textContent,'3');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
 });
 test(`${lang}: the period instead of waves a minute, then the right count`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('surf-equation').textContent,'n = 60 s ÷ T');ui.input('answer',6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(6)})+' '+l.slipPeriodNumber);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('surf-equation').textContent,`n = 60 s ÷ T = 60 ÷ 6 = ${num(10,1)}`);
  ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the swell's speed from a pier`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',8);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('surf-equation').textContent,`v = λ ÷ T = 40 ÷ 5 = ${num(8)} m/s`);
 });
 test(`${lang}: a storm swell's spacing, divided first, then multiplied`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'λ =');ui.input('answer',1.25);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(1.25)+' m'})+' '+l.slipDivided);
  ui.input('answer',180);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('surf-equation').textContent,`λ = v·T = 15 × 12 = ${num(180,0)} m`);
 });
 test(`${lang}: the frequency, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'Hz');assert.equal(ui.el('surf-equation').textContent,'f = 1 ÷ T');ui.input('answer',.125);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('surf-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('surf-equation').textContent,`f = 1 ÷ T = 1 ÷ 8 = ${num(.125,3)} Hz`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',6);en.click('play');en.run(()=>en.el('surf-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipPeriodNumber));en.input('answer',10);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'10');assert.equal(es.el('surf-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('surf-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} surf period and multilingual interface checks passed.`);
