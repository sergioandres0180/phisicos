// Leaky Tank: Torricelli's law (v = √(2·g·h)), jets falling freely from the hole (x = v·√(2·y ÷ g)), the flow into a
// bucket, two holes landing together and the farthest jet, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tank.html'),'utf8'),copy=require('./locales/tank.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tank-model'),pure);const Tank=pure.TankModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const v=Math.sqrt(2*9.8*1.8),fall=Math.sqrt(2*1.25/9.8),Q=2e-4*v,twin=2*Math.sqrt(.5*1.5);
const expected=[v,3,Q*4000,1.5,1],units=['m/s','m','L','m','m'];
const make=(i,a=expected[i])=>{const m=new Tank(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Tank(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(v,5.9397,1e-4);near(Q*4000,4.7518,1e-4);});
test('Torricelli speed, free fall from the hole, and the landing distance 2·√(h·y)',()=>{
 const m=make(1);near(m.speed(1.8),v);near(m.fall(1.25),fall);near(m.range(1.8,1.25),3);near(m.surface(),3.05);
 for(const [h,y] of [[.3,1.7],[1,1],[1.6,.4]])near(m.range(h,y),2*Math.sqrt(h*y));
 const t=make(3);near(t.range(.5,1.5),t.range(1.5,.5));near(t.range(.5,1.5),twin);assert.equal(t.holes().length,2);assert.equal(new Tank(3).holes().length,1);assert.equal(new Tank(4).holes().length,0);
 const f=make(4);for(const h of [.2,.6,.9,1.1,1.5,1.9])assert.ok(f.range(h,2-h)<f.range(1,1));near(f.range(1,1),2);near(f.range(2,0),0);
});
test('the bucket catches what left the hole in 4 s, once it has fallen',()=>{
 const m=make(2);near(m.flow(),Q);assert.equal(m.caught(fall*.9),0);near(m.caught(2),Q*(2-fall)*1000);near(m.duration(),4+fall);near(m.caught(m.duration()),Q*4000);near(m.caught(99),Q*4000);
 assert.equal(make(0).caught(2),0);near(make(0).duration(),2);
});
test('every run ends exactly, even inside long steps',()=>{
 for(const i of [0,2,3]){const p=make(i),q=make(i);const e=p.advance(100);assert.equal(e.done,true);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);near(p.t,p.duration());
  const frozen=JSON.stringify(p.snapshot());assert.equal(p.advance(1),null);assert.equal(JSON.stringify(p.snapshot()),frozen);}
});
test('answers within 2%; a run counts as soon as it starts',()=>{
 assert.equal(make(0,6).evaluate().ok,true);assert.equal(make(0,6.1).evaluate().ok,false);assert.equal(make(1,3.05).evaluate().ok,true);assert.equal(make(2,4.8).evaluate().ok,true);
 assert.equal(make(3,1.52).evaluate().ok,true);assert.equal(make(3,1.55).evaluate().ok,false);assert.equal(make(4,.99).evaluate().ok,true);
 const m=make(3);m.advance(10);assert.equal(m.score(),150);assert.equal(make(3).score(),0);
 const n=make(1,v);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4.2),'noTwo');assert.equal(slip(0,35.28),'noRoot');assert.equal(slip(0,4.95),'height');assert.equal(slip(0,9),null);
 assert.equal(slip(1,5.94),'speedOnly');assert.equal(slip(1,2.12),'noTwo');assert.equal(slip(1,4.69),'fromSurface');
 assert.equal(slip(2,1.188),'perSecond');assert.equal(slip(2,3.36),'noTwo');assert.equal(slip(2,.00475),'units');
 assert.equal(slip(3,.5),'same');assert.equal(slip(3,1),'middle');assert.equal(slip(3,1.732),'rangeNotDepth');
 assert.equal(slip(4,2),'bottom');assert.equal(slip(4,.5),'high');assert.equal(slip(4,1.5),'low');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Tank(0).setAnswer(bad),false);assert.equal(new Tank(3).setAnswer(2.01),false);assert.equal(new Tank(4).setAnswer(2),true);
 const m=new Tank(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2);m.advance(3.1);const n=new Tank();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,3.1);
 const s=make(0);s.advance(1);const k0=s.snapshot();for(const bad of [{...k0,index:5},{...k0,answer:'x'},{...k0,answer:-1},{...k0,t:3},{...k0,status:'lost'},{...k0,attempts:-1},{...k0,attempts:0},{...k0,answer:null}]){const k=new Tank();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tank-model'),script(source,'tank-model'));
 return mount(html,{scripts:['tank-model','tank-interface'],locale:'tank-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]);
 const ui=open(lang),done=()=>ui.el('tank-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,`h = ${plain(1.8)} m`);
  assert.equal(ui.el('given-2').textContent,`h = ${plain(1.8)} m · y = ${plain(1.25)} m · A = 2 cm² · t = 4 s`);
  assert.equal(ui.el('given-3').textContent,`H = 2 m · h₁ = ${plain(.5)} m`);assert.equal(ui.el('given-4').textContent,'H = 2 m');
  for(const id of ['pressure-value','speed-value','distance-value','caught-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tank-equation').textContent,'v = √(2·g·h)');
  for(const key of ['viewTitle','speedTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the jet speed appears once the hole opens, and is right on the first try`,()=>{
  ui.input('answer',5.94);assert.equal(ui.el('speed-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');assert.equal(ui.el('speed-value').textContent,fmt(v));assert.equal(ui.el('pressure-value').textContent,fmt(17.64,1));assert.equal(ui.el('caught-value').textContent,'—');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.flowingCopy,{v:fmt(v)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{v:fmt(v),p:fmt(17.64,1)})+' '+l.why0);
  assert.equal(ui.el('tank-equation').textContent,`v = √(2·g·h) = √(2 × ${plain(9.8)} × ${fmt(1.8)}) = ${fmt(v)} m/s`);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: giving the speed as the distance is explained, then the landing spot`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'x =');ui.input('answer',5.94);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{v:fmt(v),f:fmt(fall),x:fmt(3)})+' '+fill(l.missCopy,{p:plain(5.94)+' m'})+' '+l.slipSpeedOnly);
  assert.ok(ui.painted.includes('x = '+fmt(3)+' m')&&ui.painted.includes(l.rangeTitle)&&ui.painted.includes(l.offBanner));
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: the bucket fills while the hole is open`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-unit').textContent,'L');ui.input('answer',4.75);ui.click('play');ui.run(()=>ui.el('caught-value').textContent!=='—'&&ui.el('caught-value').textContent!==fmt(0),{limit:40});
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.fillingCopy,{c:'X'}).split('X')[0]));
  ui.run(done);assert.ok(ui.painted.includes(l.bucketTitle));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{q:fmt(Q*1000,3),c:fmt(Q*4000)})+' '+l.why2);
 });
 test(`${lang}: twin jets, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h₂ =');ui.input('answer',1.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tank-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{h:fmt(1.5),x:fmt(twin),x1:fmt(twin)})+' '+l.why3);
 });
 test(`${lang}: the farthest jet`,()=>{
  ui.click('mission-4');ui.input('answer',2);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{h:fmt(2),x:fmt(0)})+' '+fill(l.missCopy,{p:'2 m'})+' '+l.slipBottom);
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{h:fmt(1),x:fmt(2)})+' '+l.why4);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',2.12);en.click('play');en.run(()=>en.el('tank-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoTwo));en.input('answer',3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3');assert.equal(es.el('tank-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tank-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} leaky-tank Torricelli and multilingual interface checks passed.`);
