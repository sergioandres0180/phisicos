// Rope Tension Lab: the speed of a wave on a rope. A pulse's speed v = √(F ÷ μ), four times the tension, a rope four times
// heavier, the tension a speed needs F = μ·v², the time to cross a rope from its length and mass, the old rope beside the new,
// the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tension.html'),'utf8'),copy=require('./locales/tension.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tension-model'),pure);const Tension=pure.TensionModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[20,40,10,45,.25],units=['m/s','m/s','m/s','N','s'],durations=[500,250,1000,400,250];
const make=(i,a=expected[i])=>{const m=new Tension(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts 3 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Tension(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,3);});
 near(new Tension(3).speed(),30);near(new Tension(4).config.mass/new Tension(4).config.L,new Tension(4).config.mu);
});
test('four times the tension doubles the speed; four times the mass per metre halves it',()=>{
 const a=make(1),b=make(2);near(a.beforeSpeed(),20);near(a.speed()/a.beforeSpeed(),2);near(b.speed()/b.beforeSpeed(),.5);assert.equal(make(0).beforeSpeed(),null);
});
test('the pulse moves steadily from the hand and reaches the pulley as the run ends',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;near(m.position(0),0);near(m.position(m.duration()/2),c.L/2);near(m.position(m.duration()),c.L);near(m.position(m.duration()*2),c.L);}
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,80);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(40);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,400),'noRoot');assert.equal(slip(0,.05),'invertedRoot');assert.equal(slip(0,4),'multiplied');assert.equal(slip(0,30),null);
 assert.equal(slip(1,80),'linear');assert.equal(slip(1,20),'unchanged');assert.equal(slip(1,10),null);
 assert.equal(slip(2,5),'linearMass');assert.equal(slip(2,40),'faster');assert.equal(slip(2,20),'unchanged');assert.equal(slip(2,15),null);
 assert.equal(slip(3,1.5),'notSquared');assert.equal(slip(3,18000),'invertedForce');assert.equal(slip(3,900),'squareOnly');assert.equal(slip(3,60),null);
 assert.equal(slip(4,10/Math.sqrt(160)),'wholeMass');assert.equal(slip(4,4),'invertedTime');assert.equal(slip(4,.00625),'noRootTime');assert.equal(slip(4,.5),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Tension(0).setAnswer(bad),false);assert.equal(new Tension(0).setAnswer(1e6),true);assert.equal(new Tension(3).setAnswer(1e7),true);assert.equal(new Tension(4).setAnswer(1e4+1),false);
 const m=new Tension(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,30);m.advance(100);const n=new Tension();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,100);assert.equal(n.answer,30);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:401},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tension(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tension-model'),script(source,'tension-model'));
 return mount(html,{scripts:['tension-model','tension-interface'],locale:'tension-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const m=new Tension(i);return {v:plain(m.speed()),F:plain(m.config.F),t:plain(m.duration()/1000)};};
 const ui=open(lang),done=()=>ui.el('tension-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,`F = 40 N · μ = ${plain(.1)} kg/m`);assert.equal(ui.el('given-1').textContent,`F: 40 → 160 N · μ = ${plain(.1)} kg/m`);assert.equal(ui.el('given-2').textContent,`μ: ${plain(.1)} → ${plain(.4)} kg/m · F = 40 N`);
  assert.equal(ui.el('given-3').textContent,`v = 30 m/s · μ = ${plain(.05)} kg/m`);assert.equal(ui.el('given-4').textContent,`L = 10 m · ${plain(.5)} kg · F = 80 N`);
  for(const id of ['tension-value','density-value','speed-value','position-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tension-equation').textContent,'v = √(F ÷ μ)');
  for(const key of ['viewTitle','positionGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('10 m')&&ui.painted.includes('40 N'));
 });
 test(`${lang}: the readings appear once the pulse starts, and its speed is right on the first try`,()=>{
  ui.input('answer',20);assert.equal(ui.el('tension-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('tension-value').textContent,'40');assert.equal(ui.el('density-value').textContent,plain(.1));assert.equal(ui.el('speed-value').textContent,num(20,1));assert.equal(ui.el('position-value').textContent,num(1/3,1));
  assert.equal(ui.el('time-value').textContent,num(50/3));assert.equal(ui.el('lesson-copy').textContent,fill(l.ropeCopy,{x:num(1/3,1)}));
  assert.equal(ui.el('tension-equation').textContent,`v = √(F ÷ μ) = √(40 ÷ ${plain(.1)}) = ${num(20,1)} m/s`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(6)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('position-value').textContent,num(10,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
 });
 test(`${lang}: four times the tension, taken as four times the speed, then twice`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'v =');ui.input('answer',80);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(80)+' m/s'})+' '+l.slipLinear);assert.ok(ui.painted.includes(l.offBanner));
  assert.ok(ui.painted.includes(`${l.beforeTag} · 40 N · ${plain(.1)} kg/m`)&&ui.painted.includes(`${l.afterTag} · 160 N · ${plain(.1)} kg/m`));
  assert.equal(ui.el('tension-equation').textContent,`v = √(F ÷ μ) = √(160 ÷ ${plain(.1)}) = ${num(40,1)} m/s`);
  ui.input('answer',40);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: a rope four times heavier`,()=>{
  ui.click('mission-2');ui.input('answer',10);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('tension-equation').textContent,`v = √(F ÷ μ) = √(40 ÷ ${plain(.4)}) = ${num(10,1)} m/s`);
 });
 test(`${lang}: the tension a speed needs, without the square, then with it`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'N');assert.equal(ui.el('tension-equation').textContent,'F = μ·v²');ui.input('answer',1.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(1.5)+' N'})+' '+l.slipNotSquared);
  ui.input('answer',45);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('tension-equation').textContent,`F = μ·v² = ${plain(.05)} × 30² = ${num(45,1)} N`);
 });
 test(`${lang}: the time to cross, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('tension-equation').textContent,'t = L ÷ v');ui.input('answer',.25);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tension-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('tension-equation').textContent,`t = L ÷ v = 10 ÷ 40 = ${num(.25,3)} s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',80);en.click('play');en.run(()=>en.el('tension-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLinear));en.input('answer',40);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'40');assert.equal(es.el('tension-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tension-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} rope tension and multilingual interface checks passed.`);
