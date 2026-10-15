// Venturi Pipe: continuity (A₁·v₁ = A₂·v₂), Bernoulli's pressure drop (½·ρ·(v₂² − v₁²)) and its column, the flow from a
// Venturi meter, a fountain's height, the flow building up, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/venturi.html'),'utf8'),copy=require('./locales/venturi.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'venturi-model'),pure);const Venturi=pure.VenturiModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const meterV1=Math.sqrt(2*9.8*.2/3),expected=[24,7.5,5760/9800,20e-4*meterV1*1000,10],units=['m/s','kPa','m','L/s','m'];
const make=(i,a=expected[i])=>{const m=new Venturi(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Venturi(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[3],2.2862,1e-4);});
test('continuity and Bernoulli: the narrow part is faster and its pressure lower by ½·ρ·(v₂² − v₁²)',()=>{
 for(const i of [0,1,2,3]){const m=make(i);near(m.inlet()*m.ratio(),m.outlet());near(m.drop(2),500*(m.outlet()**2-m.inlet()**2));near(m.head(2),m.drop(2)/9800);}
 near(make(0).ratio(),16);near(make(1).outlet(),4);near(make(1).drop(2),7500);near(make(2).outlet(),3.6);near(make(3).head(2),.2);near(make(3).inlet(),meterV1);
 const m=make(1);near(m.v1(.5),.5);near(m.v2(.25),1);near(m.drop(.5),7500/4);near(m.v2(1.7),4);
});
test('the fountain climbs like a thrown ball and stops at v² ÷ (2·g)',()=>{
 const f=make(4);near(f.rise(.5),14*.5-4.9*.25);near(f.rise(14/9.8),10);near(f.rise(2),10);near(f.drop(0),98000);near(f.head(1),10);assert.equal(f.inlet(),0);near(f.v2(0),14);
});
test('every run ends exactly after 2 s, even inside long steps',()=>{
 for(const i of [0,3,4]){const p=make(i),q=make(i);const e=p.advance(100);assert.equal(e.done,true);near(p.t,2);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);
  const frozen=JSON.stringify(p.snapshot());assert.equal(p.advance(1),null);assert.equal(JSON.stringify(p.snapshot()),frozen);}
});
test('answers within 2%; a run counts as soon as it starts',()=>{
 assert.equal(make(0,24.4).evaluate().ok,true);assert.equal(make(0,25).evaluate().ok,false);assert.equal(make(2,.595).evaluate().ok,true);assert.equal(make(2,.6).evaluate().ok,false);assert.equal(make(3,2.3).evaluate().ok,true);
 assert.equal(make(4,10.2).evaluate().ok,true);assert.equal(make(4,10.3).evaluate().ok,false);
 const m=make(2);m.advance(10);assert.equal(m.score(),150);assert.equal(make(2).score(),0);
 const n=make(1,15);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(7.5);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,6),'notSquared');assert.equal(slip(0,.09375),'inverted');assert.equal(slip(0,1.5),'same');assert.equal(slip(0,50),null);
 assert.equal(slip(1,4.5),'diffSquared');assert.equal(slip(1,15),'noHalf');assert.equal(slip(1,8),'outletOnly');assert.equal(slip(1,1.5),'notSquared');assert.equal(slip(1,7500),'unitsPressure');
 assert.equal(slip(2,5.76),'pressureNotHeight');assert.equal(slip(2,1.1755),'noHalf');assert.equal(slip(2,.4122),'level');assert.equal(slip(2,58.78),'unitsHeight');
 assert.equal(slip(3,1.143),'speedOnly');assert.equal(slip(3,1.617),'noHalf');assert.equal(slip(3,3.96),'torricelli');assert.equal(slip(3,.002286),'unitsFlow');
 assert.equal(slip(4,1.43),'noSquare');assert.equal(slip(4,.714),'noSquare');assert.equal(slip(4,20),'noHalf');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e5+1])assert.equal(new Venturi(0).setAnswer(bad),false);assert.equal(new Venturi(1).setAnswer(1e7),true);
 const m=new Venturi(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3);m.advance(1.2);const n=new Venturi();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Venturi();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'venturi-model'),script(source,'venturi-model'));
 return mount(html,{scripts:['venturi-model','venturi-interface'],locale:'venturi-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]);
 const kpa=n=>fmt(n,Math.abs(n)<100?2:1),metres=n=>fmt(n,Math.abs(n)<1?3:2);
 const ui=open(lang),done=()=>ui.el('venturi-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v₂ =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,`d₁ = 2 cm · v₁ = ${plain(1.5)} m/s · d₂ = ${plain(.5)} cm`);assert.equal(ui.el('given-1').textContent,'A₁ = 20 cm² · A₂ = 5 cm² · v₁ = 1 m/s');
  assert.equal(ui.el('given-3').textContent,`A₁ = 20 cm² · A₂ = 10 cm² · Δh = ${plain(.2)} m`);assert.equal(ui.el('given-4').textContent,'v = 14 m/s');
  assert.equal(ui.el('equation-title').textContent,l.equationTitle);for(const id of ['inlet-value','outlet-value','drop-value','head-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('venturi-equation').textContent,'Δp = ½·ρ·(v₂² − v₁²)');
  for(const key of ['viewTitle','budgetTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('v₂ = ? m/s'));
 });
 test(`${lang}: the flow builds up, and the nozzle speed is right on the first try`,()=>{
  ui.input('answer',24);assert.ok(ui.painted.includes(l.guessTag+' · v₂ = '+plain(24)+' m/s'));
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('inlet-value').textContent,fmt(m.v1(t)));assert.equal(ui.el('outlet-value').textContent,fmt(m.v2(t)));assert.equal(ui.el('drop-value').textContent,kpa(m.drop(t)/1000));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.jetCopy,{v1:fmt(m.v1(t)),v2:fmt(m.v2(t)),p:kpa(m.drop(t)/1000)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{v2:fmt(24),p:kpa(m.drop(2)/1000)})+' '+l.why0);
  for(const key of ['hoseShort','jetShort','pressureKey','motionKey','rightBanner'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: forgetting the ½ is explained, then the pressure drop`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Δp =');assert.equal(ui.el('answer-unit').textContent,'kPa');ui.input('answer',15);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{v2:fmt(4),p:kpa(7.5)})+' '+fill(l.missCopy,{p:plain(15)+' kPa'})+' '+l.slipNoHalf);
  assert.equal(ui.el('venturi-equation').textContent,`Δp = ½·ρ·(v₂² − v₁²) = ½ × 1000 × (${fmt(4)}² − ${fmt(1)}²) = ${kpa(7.5)} kPa`);
  ui.input('answer',7.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: the column drop`,()=>{
  ui.click('mission-2');ui.input('answer',.5878);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{v2:fmt(3.6),p:kpa(5.76),h:metres(5760/9800)})+' '+l.why2);
  assert.ok(ui.painted.includes('h₁ = '+metres(1)+' m')&&ui.painted.includes(l.wideShort)&&ui.painted.includes(l.narrowShort));
 });
 test(`${lang}: the flow meter, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',2.29);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('venturi-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.guessTag+' · Q = '+plain(2.29)+' L/s'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{p:kpa(1.96),v1:fmt(meterV1),v2:fmt(2*meterV1),q:fmt(expected[3])})+' '+l.why3);
 });
 test(`${lang}: the fountain`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('equation-title').textContent,l.heightTitle);ui.input('answer',20);ui.click('step');const f=make(4);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.risingCopy,{h:metres(f.rise(12/120))}));assert.equal(ui.el('inlet-value').textContent,'—');
  ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoHalf));
  ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{h:metres(10)})+' '+l.why4);
  assert.equal(ui.el('venturi-equation').textContent,`h = v² ÷ (2·g) = ${fmt(14)}² ÷ (2 × ${plain(9.8)}) = ${metres(10)} m`);assert.ok(ui.painted.includes(l.heightKey)&&ui.painted.includes(l.topShort));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',3.96);en.click('play');en.run(()=>en.el('venturi-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipTorricelli));en.input('answer',2.29);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'2.29');assert.equal(es.el('venturi-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('venturi-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} venturi-pipe Bernoulli and multilingual interface checks passed.`);
