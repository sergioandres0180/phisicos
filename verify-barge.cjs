// Barge Load: Archimedes' principle (ρ·A·d = M), buoyancy equal to weight while afloat, the most cargo before the deck
// floods, sea to river, floating ice, average density, exact flooding and run ends, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/barge.html'),'utf8'),copy=require('./locales/barge.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'barge-model'),pure);const Barge=pure.BargeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[.4,66,.82*1.025,91700/1025,250],units=['m','t','m','%','kg/m³'];
const make=(i,a=expected[i])=>{const m=new Barge(i);assert.ok(m.setAnswer(a));return m;};

test('each float has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Barge(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});});
test('a float pushes aside its own mass of water, so the buoyancy equals the weight at every moment',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;for(const t of [0,.3,1,1.7,2]){near(m.rho(t)*m.area()*m.draft(t),m.mass(t));near(m.buoyancy(t),m.weight(t));near(m.displaced(t),m.area()*m.draft(t));}assert.equal(m.flooded(),false);}
 near(make(0).draft(2),.4);near(make(0).draft(0),0);near(make(0).mass(1),12000);near(make(0).buoyancy(2),24000*9.8);
 near(make(2).draft(0),.82);near(make(2).draft(2),.8405);near(make(2).rho(1),1012.5);
 near(make(3).draft(2),917/1025);near(make(4).draft(2),.25);near(make(1).draft(2),1.5);near(make(1).mass(1),57000);
});
test('too much cargo floods the deck at the exact moment, loading stops, and the barge is drawn sinking',()=>{
 const m=make(1,90),cap=1000*60*1.5*(1+5e-4),tf=2*(cap-24000)/90000;
 near(m.floodTime(),tf);assert.equal(m.flooded(),true);near(m.duration(),tf+1);near(m.mass(1.9),cap);near(m.draft(1.9),1.5);assert.ok(m.buoyancy(1.9)<=m.weight(1.9));
 near(m.sinking(tf),0);near(m.sinking(tf+.5),.5);near(m.sinking(9),1);
 const e=m.advance(100);assert.equal(e.done,true);near(m.t,tf+1);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 assert.equal(make(1,66.03).flooded(),false);assert.equal(make(1,66.1).flooded(),true);assert.equal(make(1,66).floodTime(),null);
});
test('the run ends exactly at 2 s inside long steps when nothing floods',()=>{
 const a=make(0),b=make(0);a.advance(100);let n=0;while(b.status!=='done'){b.advance(1/120);n++;}near(a.t,2);near(a.t,b.t,1e-12);assert.equal(n,240);
 const c=make(1,90),d=make(1,90);c.advance(100);while(d.status!=='done')d.advance(1/120);near(c.t,d.t,1e-12);
});
test('answers count within 2%, a cargo with at most 2% to spare, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,.408).evaluate().ok,true);assert.equal(make(0,.41).evaluate().ok,false);assert.equal(make(3,89.5).evaluate().ok,true);assert.equal(make(2,.84).evaluate().ok,true);
 assert.equal(make(1,65).evaluate().ok,true);assert.equal(make(1,64.6).evaluate().ok,false);assert.equal(make(1,66.03).evaluate().ok,true);assert.equal(make(1,67).evaluate().ok,false);
 const m=make(4);m.advance(10);assert.equal(m.score(),150);assert.equal(make(4).score(),0);
 const n=make(1,90);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(66);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2.5),'inverted');assert.equal(slip(0,24),'volume');assert.equal(slip(0,.6),null);
 assert.equal(slip(1,90),'noBarge');assert.equal(slip(1,50),'spare');assert.equal(slip(1,120),null);
 assert.equal(slip(2,.82),'same');assert.equal(slip(2,.8),'higher');
 assert.equal(slip(3,100-91700/1025),'above');assert.equal(slip(3,91.7),'freshWater');
 assert.equal(slip(4,7850),'steel');assert.equal(slip(4,1000),'water');assert.equal(slip(4,.004),'perMass');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,101])assert.equal(new Barge(0).setAnswer(bad),false);assert.equal(new Barge(3).setAnswer(101),false);assert.equal(new Barge(3).setAnswer(100),true);
 const m=new Barge(1);assert.equal(m.load(),0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,90);m.advance(.3);const n=new Barge();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,90);assert.equal(n.index,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Barge();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
 const late=make(1,90);late.advance(2.2);const back=new Barge();assert.equal(back.restore(late.snapshot()),true);near(back.t,2.2);
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'barge-model'),script(source,'barge-model'));
 return mount(html,{scripts:['barge-model','barge-interface'],locale:'barge-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('barge-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`L × B = 12 × 5 m · H = ${plain(1.5)} m · M = 24 t · ρ = 1000 kg/m³`);
  assert.equal(ui.el('given-2').textContent,`L × B = 12 × 5 m · d = ${plain(.82)} m · ρ: 1025 → 1000 kg/m³`);
  assert.equal(ui.el('given-3').textContent,'1 × 1 × 1 m · ρ_ice = 917 kg/m³ · ρ = 1025 kg/m³');
  for(const id of ['draft-value','displaced-value','buoyancy-value','water-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('barge-equation').textContent,'F_b = ρ·g·V');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('ρ = 1000 kg/m³'));
 });
 test(`${lang}: the draft appears once the barge is lowered, and the empty barge is right on the first try`,()=>{
  ui.input('answer',.4);assert.equal(ui.el('draft-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');assert.equal(ui.el('draft-value').textContent,fmt(.02,3));assert.equal(ui.el('displaced-value').textContent,fmt(1.2));assert.equal(ui.el('buoyancy-value').textContent,fmt(11.76,1));assert.equal(ui.el('water-value').textContent,fmt(1000,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{d:fmt(.02,3),m:fmt(1.2)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{d:fmt(.4,3),v:fmt(24)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.weightShort)&&ui.painted.includes(l.buoyancyShort));
 });
 test(`${lang}: forgetting the barge's own mass floods it, and the full load holds`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'t');ui.input('answer',90);ui.click('play');ui.run(done);
  const tf=2*(1000*60*1.5*(1+5e-4)-24000)/90000;
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.floodCopy,{cargo:plain(90),tf:fmt(tf)})+' '+fill(l.missCopy,{p:'90 t'})+' '+l.slipNoBarge);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner+' · '+l.floodBanner)&&ui.painted.includes(l.capacityTag));
  ui.input('answer',66);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{cargo:plain(66),d:fmt(1.5,3),free:fmt(0,3)})+' '+l.why1);
 });
 test(`${lang}: floating ice, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'%');
  ui.input('answer',10.5);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipAbove));
  ui.input('answer',89.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('barge-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{d:fmt(917/1025,3),f:fmt(91700/1025,1)})+' '+l.why3);assert.ok(ui.painted.includes('ρ = 1025 kg/m³'));
 });
 test(`${lang}: from the sea into the river`,()=>{
  ui.click('mission-2');ui.input('answer',.84);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{d:fmt(.8405,3),dd:fmt(2.05)})+' '+l.why2);assert.equal(ui.el('water-value').textContent,fmt(1000,0));
 });
}
test('changing language preserves float, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',7850);en.click('play');en.run(()=>en.el('barge-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSteel));en.input('answer',250);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'250');assert.equal(es.el('barge-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('barge-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} barge-load buoyancy and multilingual interface checks passed.`);
