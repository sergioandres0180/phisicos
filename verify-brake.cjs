// Stop on the Line: constant deceleration, exact braking events, reaction time, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/brake.html'),'utf8'),copy=require('./locales/brake.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'brake-model'),pure);const Brake=pure.BrakeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[10,40,45,60,4];
const make=(i,a=expected[i])=>{const m=new Brake(i);assert.ok(m.setAnswer(a));return m;};

test('each mission has the expected answer, and doubling the speed quadruples the braking distance',()=>{
 expected.forEach((v,i)=>near(new Brake(i).exact(),v));near(new Brake(1).exact()/new Brake(0).exact(),4);
});
test('the run is cruise, reaction, then constant deceleration to rest, all in closed form',()=>{
 const m=make(3),p=m.plan();near(p.tSignal,2);near(p.tBrake,3);near(p.xBrake,-40);near(p.tStop,7);near(p.xStop,0);
 assert.equal(m.state(1).phase,'cruise');assert.equal(m.state(2.5).phase,'react');assert.equal(m.state(2.5).a,0);near(m.state(2.5).v,20);
 const b=m.state(5);assert.equal(b.phase,'braking');near(b.v,10);near(b.a,-5);near(b.braking,30);near(b.x,-10);
 near(m.state(3-1e-9).x,m.state(3+1e-9).x,1e-6);const s=m.state(8);assert.equal(s.phase,'stopped');assert.equal(s.v,0);assert.equal(s.a,0);
 for(const t of [3.5,4.2,6.9]){const q=m.state(t);near(q.v*q.v,400-2*5*q.braking,1e-9);}
});
test('the stop is solved exactly inside a long step, then freezes',()=>{
 const m=make(0);assert.equal(m.advance(4.9),null);const e=m.advance(5);near(e.t,5);assert.equal(m.status,'done');near(m.state(m.now()).x,0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(2),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2,30),b=make(2,30);a.advance(1e3);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('braking too late crosses the line at the speed given by v² = v₀² − 2a·s',()=>{
 const m=make(0,8);near(m.plan().xStop,2);near(m.lineSpeed(),Math.sqrt(20));assert.equal(make(0,12).lineSpeed(),null);
 const late=make(0,1);near(late.lineSpeed(),Math.sqrt(100-2*5*1));const after=make(3,10);assert.ok(after.plan().xBrake>0);near(after.lineSpeed(),20);
});
test('stopping within 0.5 m earns 100, plus 50 only on the first run',()=>{
 const m=make(0);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(0,12);n.advance(1e3);assert.equal(n.score(),0);n.setAnswer(10.4);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
 assert.ok(make(0,10.5).evaluate().ok);assert.ok(!make(0,10.6).evaluate().ok);assert.ok(make(4,4.05).evaluate().ok);assert.equal(make(0).score(),0);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,20),'noHalf');assert.equal(slip(1,20),'linear');assert.equal(slip(1,80),'noHalf');assert.equal(slip(3,40),'noReaction');assert.equal(slip(3,100),'noHalf');
 assert.equal(slip(0,2),'time');assert.equal(slip(4,8),'noHalfA');assert.equal(slip(0,15),null);assert.equal(slip(0,10),null);
});
test('answers must be in range, edits restart the run, and nothing moves without an answer',()=>{
 const m=new Brake(0);for(const bad of [0,-5,41,NaN])assert.equal(m.setAnswer(bad),false);assert.equal(m.advance(5),null);assert.equal(m.t,0);
 const d=new Brake(4);for(const bad of [.5,10.5,0])assert.equal(d.setAnswer(bad),false);assert.equal(d.setAnswer(1),true);assert.equal(d.setAnswer(10),true);
 const r=make(0);r.advance(2);r.setAnswer(12);assert.equal(r.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,8);m.advance(1e3);m.setAnswer(4);m.advance(3);const n=new Brake();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,3);assert.equal(n.answer,4);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:50},{...s,t:1e6},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Brake();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'brake-model'),script(source,'brake-model'));
 return mount(html,{scripts:['brake-model','brake-interface'],locale:'brake-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('brake-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('question').textContent,l.questionDistance);assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('given-0').textContent,'v₀ = 10 m/s · a = 5 m/s²');
  assert.ok(ui.painted.includes(l.stopLine)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes(l.roadTitle));
 });
 test(`${lang}: the right braking distance on the first run earns the bonus`,()=>{
  ui.input('answer',10);assert.equal(ui.el('lesson-title').textContent,fill(l.readyTitle,{p:'10 m'}));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('brake-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('brake-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.goodCopy,{gs:fmt(0)})+' '+l.why0);assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('line-badge').classList.has('earned')&&ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('velocity-value').textContent,fmt(0));assert.equal(ui.el('braking-value').textContent,fmt(10));
 });
 test(`${lang}: forgetting the reaction time runs the red light, and is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('question').textContent,l.questionReaction);assert.ok(ui.painted.includes(l.signalMark)===false);
  ui.input('answer',40);ui.click('play');ui.run(()=>ui.el('brake-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.overTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.overCopy,{g:fmt(20,1),vc:fmt(Math.sqrt(200),1)})+' '+l.slipNoReaction);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');assert.ok(ui.painted.includes(l.signalMark));
  ui.input('answer',60);ui.click('play');ui.run(()=>ui.el('brake-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(!ui.el('first-badge').classList.has('earned'));
 });
 test(`${lang}: the deceleration mission asks for a, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'a =');assert.equal(ui.el('answer-unit').textContent,'m/s²');assert.equal(ui.el('question').textContent,l.questionDeceleration);
  ui.input('answer',4);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('brake-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(()=>ui.el('brake-status-text').textContent===l.done);assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
 });
}
test('changing language preserves mission, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',30);en.click('play');en.run(()=>en.el('brake-status-text').textContent===copy.en.done);
 assert.equal(en.el('lesson-title').textContent,copy.en.overTitle);en.input('answer',45);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'45');assert.equal(es.el('brake-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('brake-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} stop on the line braking-distance and multilingual interface checks passed.`);
