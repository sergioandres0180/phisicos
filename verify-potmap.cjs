// Potential Map: electric potential as energy per charge. V = k·Q ÷ r at a point, the work q·ΔV to carry a charge up the
// hill, no work round a contour, two potentials adding as plain numbers, and the distance of the 120 V contour; the
// carried test charge's path and meter, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/potmap.html'),'utf8'),copy=require('./locales/potmap.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'potmap-model'),pure);const Pot=pure.PotentialModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const k=8.99e9;
const expected=[k*2e-9/.3,k*2e-9*(1/.1-1/.3),0,k*4e-9/.2,k*4e-9/120],units=['V','nJ','nJ','V','m'];
const make=(i,a=expected[i])=>{const m=new Pot(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Pot(i);near(m.exact()+1,x+1);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
 near(expected[0],59.933,1e-4);near(expected[1],119.87,1e-4);near(expected[3],179.8,1e-9);near(expected[4],.29967,1e-4);
});
test('the test charge is carried steadily along its path for 2 s and held; V = k·Q ÷ r falls as 1 ÷ r',()=>{
 const m=make(0);near(m.probeAt(0)[0],.55);near(m.probeAt(1)[0],.425);near(m.probeAt(2)[0],.3);near(m.probeAt(3)[0],.3);
 near(m.potential(.3,0),expected[0]);near(m.potential(.15,0)/m.potential(.3,0),2);near(m.nearest(3),.3);near(m.length(),.25);
});
test('the work you do is q·ΔV: up the hill it is positive, and round a contour it is 0 at every moment',()=>{
 const m=make(1);near(m.work(3),expected[1]);near(m.work(1),k*2e-9*(1/.2-1/.3));near(m.work(0)+1,1);
 const r=make(2);for(const t of [0,.5,1,1.5,2,3])assert.ok(Math.abs(r.work(t))<1e-9);near(r.probeAt(1)[0],.3);near(r.probeAt(1)[1]+1,1,1e-12);near(r.probeAt(2)[1],-.3);near(r.length(),.3*Math.PI);
 const [Ex,Ey]=r.field(...r.probeAt(.7)),p=r.probeAt(.7),dot=Ex*(-p[1])+Ey*p[0];assert.ok(Math.abs(dot)<1e-9*Math.hypot(Ex,Ey));
});
test('potentials add as plain numbers, even where the fields partly cancel; the contour test goes to your distance',()=>{
 const m=make(3);near(m.potential(0,0),k*3e-9/.2+k*1e-9/.2);const [Ex,Ey]=m.field(0,0);near(Ex,k*2e-9/.04);near(Ey+1,1,1e-12);near(m.nearest(3),.2);
 assert.equal(new Pot(4).at(1),null);assert.equal(new Pot(4).probeAt(2),null);const c=make(4);near(c.potential(...c.probeAt(3)),120);near(make(4,.25).probeAt(3)[0],.25);near(c.probeAt(0)[0],.6);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative, and a work of 0 within 0.5 nJ; a run counts as soon as it starts',()=>{
 for(const i of [0,1,3,4]){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 for(const a of [0,.5,-.5,.3])assert.equal(make(2,a).evaluate().ok,true);for(const a of [.51,-.51,5])assert.equal(make(2,a).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,179.8);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[1]);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,199.8),'squared');assert.equal(slip(0,.5993),'centimetres');assert.equal(slip(0,100),null);
 assert.equal(slip(1,179.8),'finalOnly');assert.equal(slip(1,-119.9),'fieldWork');assert.equal(slip(1,60),null);
 assert.equal(slip(2,59.93),'potential');assert.equal(slip(2,188.3),'forceTimesPath');assert.equal(slip(2,-59.93),null);
 assert.equal(slip(3,89.9),'subtracted');assert.equal(slip(3,449.5),'field');assert.equal(slip(3,135),null);
 assert.equal(slip(4,.5474),'squaredDistance');assert.equal(slip(4,.15),null);
});
test('answers are validated: works may be negative or 0, potentials and distances are positive, nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Pot(0).setAnswer(bad),false);for(const ok of [0,-120,120])assert.equal(new Pot(1).setAnswer(ok),true);
 assert.equal(new Pot(2).setAnswer(2e6),false);assert.equal(new Pot(4).setAnswer(10.5),false);assert.equal(new Pot(4).setAnswer(0),false);
 const m=new Pot(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,-119.9);m.advance(1.5);const n=new Pot();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,-119.9);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2e6},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Pot(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'potmap-model'),script(source,'potmap-model'));
 return mount(html,{scripts:['potmap-model','potmap-interface'],locale:'potmap-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=[{x:num(expected[0])},{x:num(expected[1],1)},{x:num(0,0)},{x:num(expected[3],1)},{x:num(expected[4],3)}];
 const ui=open(lang),done=()=>ui.el('potmap-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  assert.equal(ui.el('given-0').textContent,`Q = +2 nC · r = ${plain(.3)} m`);assert.equal(ui.el('given-1').textContent,`Q = +2 nC · r: ${plain(.3)} → ${plain(.1)} m`);
  assert.equal(ui.el('given-2').textContent,`Q = +2 nC · r = ${plain(.3)} m · 180°`);assert.equal(ui.el('given-3').textContent,`+3 / +1 nC · d = ${plain(.4)} m`);assert.equal(ui.el('given-4').textContent,`Q = +4 nC · V = ${plain(120)} V`);
  for(const id of ['dist-value','potential-value','delta-value','work-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('potmap-equation').textContent,'V = k·Q ÷ r, W = q·ΔV');
  for(const key of ['viewTitle','pathGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('V = ? V')&&ui.painted.includes('W = ? nJ'));
 });
 test(`${lang}: the meter reads the potential as the test charge comes in, right on the first try`,()=>{
  ui.input('answer',59.93);assert.equal(ui.el('potential-value').textContent,'—');
  ui.click('step');const m=make(0),p=m.probeAt(.1),V=m.potential(...p),W=m.work(.1);
  assert.equal(ui.el('dist-value').textContent,num(m.nearest(.1),3));assert.equal(ui.el('potential-value').textContent,num(V));assert.equal(ui.el('delta-value').textContent,num(W));assert.equal(ui.el('work-value').textContent,num(W,1));
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,fill(l.carryCopy,{V:num(V),W:num(W,1)}));assert.equal(ui.el('potmap-equation').textContent,`V = k·Q ÷ r = ${num(expected[0])} V`);
  const hold=fill(l.holdCopy,{V:num(expected[0]),W:num(m.work(3),1)});ui.click('play');ui.run(copyIs(hold));ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('potential-value').textContent,num(expected[0]));assert.equal(ui.el('dist-value').textContent,num(.3,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(fill(l.arrowNote,{F:plain(.2)})));
 });
 test(`${lang}: climbing the hill: the final potential, the field's work, then the work you do`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'W =');assert.equal(ui.el('answer-unit').textContent,'nJ');
  ui.input('answer',179.8);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(179.8)+' nJ'})+' '+l.slipFinalOnly);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',-119.9);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(-119.9)+' nJ'})+' '+l.slipFieldWork);
  ui.input('answer',119.9);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('work-value').textContent,num(expected[1],1));assert.equal(ui.el('potmap-equation').textContent,`W = q·(V₂ − V₁) = ${num(expected[1],1)} nJ`);
 });
 test(`${lang}: round the contour the work stays 0; the potential and force times path are slips`,()=>{
  ui.click('mission-2');ui.input('answer',0);assert.equal(ui.el('play').disabled,false);ui.click('play');
  const ring=fill(l.ringCopy,{V:num(expected[0]),W:num(0,1)});ui.run(copyIs(ring));ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  ui.input('answer',59.93);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(59.93)+' nJ'})+' '+l.slipPotential);
  ui.input('answer',188.3);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(188.3)+' nJ'})+' '+l.slipForceTimesPath);
  assert.equal(ui.el('work-value').textContent,num(0,1));assert.equal(ui.el('potmap-equation').textContent,`W = q·(V₂ − V₁) = ${num(0,0)} nJ`);
 });
 test(`${lang}: two potentials subtracted, then added`,()=>{
  ui.click('mission-3');ui.input('answer',89.9);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(89.9)+' V'})+' '+l.slipSubtracted);
  ui.input('answer',179.8);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('potential-value').textContent,num(expected[3]));assert.equal(ui.el('dist-value').textContent,num(.2,3));assert.equal(ui.el('potmap-equation').textContent,`V = V₁ + V₂ = ${num(expected[3],1)} V`);
 });
 test(`${lang}: the test charge goes to your contour, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'m');assert.ok(ui.painted.includes(l.reachTag));
  ui.input('answer',.5474);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(.5474)+' m'})+' '+l.slipSquaredDistance);
  assert.ok(ui.painted.includes(fill(l.targetTag,{V:plain(120)})));
  ui.input('answer',.3);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('potmap-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('dist-value').textContent,num(.3,3));assert.equal(ui.el('potential-value').textContent,num(k*4e-9/.3));assert.equal(ui.el('potmap-equation').textContent,`r = k·Q ÷ V = ${num(expected[4],3)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',179.8);en.click('play');en.run(()=>en.el('potmap-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipFinalOnly));en.input('answer',119.9);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'119.9');assert.equal(es.el('potmap-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('potmap-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} potential map and multilingual interface checks passed.`);
