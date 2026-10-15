// Hydraulic Lift: Pascal's principle (F₁ ÷ A₁ = F₂ ÷ A₂), the oil's volume (A₁·d₁ = A₂·d₂), lifting at the exact moment,
// diameters squared, jack strokes, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/hydraulic.html'),'utf8'),copy=require('./locales/hydraulic.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'hydraulic-model'),pure);const Hyd=pure.HydraulicModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[117.6,490,147,80,8],units=['N','cm²','N','cm',''];
const make=(i,a=expected[i])=>{const m=new Hyd(i);assert.ok(m.setAnswer(a));return m;};

test('each job has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Hyd(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});});
test('the pressure is the same on both pistons, and the oil pushed in fills the other cylinder',()=>{
 for(let i=0;i<5;i++){const m=make(i);for(const t of [.3,1,1.7,2,2.5]){near(m.liftForce(t),m.applied(t)*m.a2()/m.a1());near(m.a1()*m.travel(t),m.a2()*m.rise(t));}}
 near(make(0).need(),117.6);near(make(2).a2()/make(2).a1(),100);near(make(1).a2(),490);near(make(1).need(),50);
});
test('the load lifts at the exact moment p·A₂ reaches its weight, and the small piston then travels 30 cm',()=>{
 const m=make(0,200),tl=2*117.6/200;near(m.liftTime(),tl);near(m.applied(1.9),117.6);near(m.liftForce(1.9),m.weight());near(m.duration(),tl+1);
 near(m.travel(tl+.5),15);near(m.rise(tl+1),.3);assert.equal(m.rise(tl),0);
 const e=m.advance(100);assert.equal(e.done,true);near(m.t,tl+1);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const held=make(0,100);assert.equal(held.lifts(),false);assert.equal(held.liftTime(),null);near(held.duration(),2);near(held.applied(2),100);assert.equal(held.rise(2),0);
 assert.equal(make(0,117.6*(1-4e-4)).lifts(),true);assert.equal(make(0,117.4).lifts(),false);
 near(make(1,490).liftTime(),2);assert.equal(make(1,500).lifts(),true);assert.equal(make(1,450).lifts(),false);
});
test('strokes and jack pumps move the oil steadily over 2 s',()=>{
 const s=make(3,80);near(s.travel(1),40);near(s.rise(2),2);near(s.applied(1),s.need());
 const j=make(4,8);near(j.rise(2),3.2);near(j.rise(1),1.6);near(j.drop(.125),5);near(j.drop(.25),0,1e-9);near(j.travel(2),80);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,200],[0,100],[3,80],[4,8]]){const p=make(i,a),q=make(i,a);p.advance(100);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
});
test('a push or a piston with at most 2% to spare, a stroke within 2%, the fewest pumps; a run counts as soon as it starts',()=>{
 assert.equal(make(0,119).evaluate().ok,true);assert.equal(make(0,120.5).evaluate().ok,false);assert.equal(make(0,117).evaluate().ok,false);
 assert.equal(make(1,495).evaluate().ok,true);assert.equal(make(1,500).evaluate().ok,false);assert.equal(make(3,81).evaluate().ok,true);assert.equal(make(4,9).evaluate().ok,false);
 const m=make(4);m.advance(10);assert.equal(m.score(),150);assert.equal(make(4).score(),0);
 const n=make(0,100);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(118);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1176000),'inverted');assert.equal(slip(0,11760),'weight');assert.equal(slip(0,12),'noG');assert.equal(slip(0,140),'spare');assert.equal(slip(0,100),null);
 assert.equal(slip(2,1470),'notSquared');assert.equal(slip(2,1470000),'inverted');assert.equal(slip(2,15),'noG');
 assert.equal(slip(1,50*5/4900),'inverted');assert.equal(slip(1,50),'noG');assert.equal(slip(1,98),'ratioOnly');assert.equal(slip(1,550),'spare');assert.equal(slip(1,450),null);
 assert.equal(slip(3,2),'same');assert.equal(slip(3,.05),'inverted');assert.equal(slip(3,40),'ratioStroke');
 assert.equal(slip(4,7),'roundDown');assert.equal(slip(4,1),'samePump');assert.equal(slip(4,9),'morePumps');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN])assert.equal(new Hyd(0).setAnswer(bad),false);assert.equal(new Hyd(4).setAnswer(7.5),false);assert.equal(new Hyd(1).setAnswer(1e6+1),false);
 const m=new Hyd(0);assert.equal(m.target(),0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,200);m.advance(1.5);const n=new Hyd();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,200);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Hyd();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'hydraulic-model'),script(source,'hydraulic-model'));
 return mount(html,{scripts:['hydraulic-model','hydraulic-interface'],locale:'hydraulic-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('hydraulic-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F₁ =');assert.equal(ui.el('answer-unit').textContent,'N');
  assert.equal(ui.el('given-0').textContent,'m = 1200 kg · A₁ = 10 cm² · A₂ = 1000 cm²');
  assert.equal(ui.el('given-1').textContent,'m = 500 kg · A₁ = 5 cm² · F₁ = 50 N');
  assert.equal(ui.el('given-2').textContent,'m = 1500 kg · d₁ = 2 cm · d₂ = 20 cm');
  assert.equal(ui.el('given-4').textContent,'m = 1000 kg · A₁ = 2 cm² · A₂ = 50 cm² · h₂ = 3 cm · 1 × 10 cm');
  for(const id of ['push-value','pressure-value','lift-value','rise-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('hydraulic-equation').textContent,'F₁ ÷ A₁ = F₂ ÷ A₂');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('F₁ = ? N')&&ui.painted.includes('m = 1200 kg'));
 });
 test(`${lang}: the push and pressure appear once you push, and the car lifts with the right push on the first try`,()=>{
  ui.input('answer',117.6);assert.equal(ui.el('push-value').textContent,'—');
  ui.click('step');const m=make(0,117.6),f=m.applied(12/120);
  assert.equal(ui.el('push-value').textContent,fmt(f,1));assert.equal(ui.el('pressure-value').textContent,fmt(f/(10e-4)/1000,1));assert.equal(ui.el('lift-value').textContent,fmt(f*100/1000));assert.equal(ui.el('rise-value').textContent,fmt(0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{f:fmt(f,1),p:fmt(f/(10e-4)/1000,1),rise:fmt(0)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{need:fmt(117.6,1),p:fmt(117.6,1),w:fmt(11.76)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.liftedBanner)&&ui.painted.includes(l.liftShort)&&ui.painted.includes(l.weightShort)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: forgetting to square the diameters is explained, and the right push lifts the car`,()=>{
  ui.click('mission-2');ui.input('answer',1470);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{need:fmt(147,1)})+' '+fill(l.missCopy,{p:'1470 N'})+' '+l.slipNotSquared);assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',147);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why2));
 });
 test(`${lang}: a big piston too small leaves the load down`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'A₂ =');assert.equal(ui.el('answer-unit').textContent,'cm²');ui.input('answer',450);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.stuckCopy,{f:fmt(50,1),p:fmt(100,1),w:fmt(4.9)})+' '+fill(l.missCopy,{p:'450 cm²'})+' '+l.hint1);
  assert.ok(ui.painted.includes(l.offBanner+' · '+l.stuckBanner));
 });
 test(`${lang}: the small piston's stroke, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'d₁ =');assert.equal(ui.el('answer-unit').textContent,'cm');
  ui.input('answer',2);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSame));
  assert.ok(ui.painted.includes(l.volumeTitle)&&ui.painted.includes(l.inShort)&&ui.painted.includes(l.outShort)&&ui.painted.includes(l.targetTag+' · 2 cm'));
  ui.input('answer',80);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('hydraulic-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{travel:fmt(80,1),rise:fmt(2)})+' '+l.why3);
 });
 test(`${lang}: the jack's strokes`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,l.pumpsUnit);
  ui.input('answer',7);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipRoundDown));
  ui.input('answer',8);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{n:plain(8),rise:fmt(3.2)})+' '+l.why4);
 });
}
test('changing language preserves job, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',98);en.click('play');en.run(()=>en.el('hydraulic-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipRatioOnly));en.input('answer',490);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'490');assert.equal(es.el('hydraulic-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('hydraulic-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} hydraulic-lift pascal's-principle and multilingual interface checks passed.`);
