// Bank Shot Ripples: how waves reflect. A ripple leaving a wall at the angle it arrived, a bank shot aimed at B's mirror
// image, a pulse back upside down from a fixed end and upright from a free end, the round trip t = 2L ÷ v, the exact end of
// each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bank.html'),'utf8'),copy=require('./locales/bank.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bank-model'),pure);const Bank=pure.BankModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[35,4,-5,5,3],units=['°','m','cm','cm','s'];
const make=(i,a=expected[i])=>{const m=new Bank(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts about 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Bank(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration()/m.config.pace,4,.02);});
 near(new Bank(2).duration(),3);near(new Bank(0).length(),2*2/Math.sin(35*Math.PI/180));near(new Bank(1).length(),Math.hypot(4,2)+Math.hypot(2,1));
});
test('a ripple leaves the wall at the angle it arrived, and the bank shot reaches B',()=>{
 for(let i=0;i<2;i++){const m=make(i);near(m.angleIn(),m.angleOut(),1e-9);const p=m.path();near(p[1][1],0);const end=m.point(m.length());near(end[0],p[2][0]);near(end[1],p[2][1]);}
 near(make(0).angleIn(),35);near(make(1).angleIn(),Math.atan(.5)*180/Math.PI);const b=make(1);near(b.point(Math.hypot(4,2))[1],0,1e-9);assert.equal(b.bounced(4),0);assert.equal(b.bounced(5),1);
});
test('a pulse comes back upside down from a fixed end and upright from a free end',()=>{
 const f=make(2),r=make(3);near(f.rope(0,3),-5);near(r.rope(0,3),5);near(f.rope(1,.25),5);near(r.rope(1,.25),5);
 for(const t of [1.2,1.4,1.5,1.6,1.8])near(f.rope(6,t),0,1e-9);near(r.rope(6,1.5),10);assert.equal(f.bounced(1.49),0);assert.equal(f.bounced(1.5),1);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i),T=p.duration();const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,T);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(-5);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,55),'complement');assert.equal(slip(0,145),'continued');assert.equal(slip(0,70),'doubled');assert.equal(slip(0,40),null);
 assert.equal(slip(1,3),'halfway');assert.equal(slip(1,2),'swapped');assert.equal(slip(1,5),null);
 assert.equal(slip(2,5),'upright');assert.equal(slip(2,-10),'doubledHeight');assert.equal(slip(2,-3),null);
 assert.equal(slip(3,-5),'inverted');assert.equal(slip(3,10),'doubledHeight');assert.equal(slip(3,3),null);
 assert.equal(slip(4,1.5),'oneWay');assert.equal(slip(4,24),'multiplied');assert.equal(slip(4,1/3),'invertedTime');assert.equal(slip(4,2),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,101,-101,NaN,Infinity])assert.equal(new Bank(2).setAnswer(bad),false);assert.equal(new Bank(2).setAnswer(-100),true);
 for(const bad of [0,-1,181])assert.equal(new Bank(0).setAnswer(bad),false);assert.equal(new Bank(1).setAnswer(8.1),false);assert.equal(new Bank(4).setAnswer(1e4),true);
 const m=new Bank(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,-5);m.advance(1);const n=new Bank();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1);assert.equal(n.answer,-5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:4},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Bank(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bank-model'),script(source,'bank-model'));
 return mount(html,{scripts:['bank-model','bank-interface'],locale:'bank-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values={a:plain(35),x:plain(4),t:plain(3)};
 const ui=open(lang),done=()=>ui.el('bank-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'θ_out =');assert.equal(ui.el('answer-unit').textContent,'°');
  assert.equal(ui.el('given-0').textContent,'θ_in = 35°');assert.equal(ui.el('given-1').textContent,'A: 2 m · B: 1 m · 6 m');assert.equal(ui.el('given-2').textContent,'y = +5 cm · '+l.fixedTag);
  assert.equal(ui.el('given-3').textContent,'y = +5 cm · '+l.freeTag);assert.equal(ui.el('given-4').textContent,'L = 6 m · v = 4 m/s');
  for(const id of ['speed-value','travel-value','height-value','bounce-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('bank-equation').textContent,'θ_out = θ_in');
  for(const key of ['viewTitle','angleGraph','panelHint','scaleNote','wallTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('A'));
 });
 test(`${lang}: the readings appear once the ripple starts, and the angle out is right on the first try`,()=>{
  ui.input('answer',35);assert.equal(ui.el('speed-value').textContent,'—');
  ui.click('step');
  let t=0;for(let i=0;i<12;i++)t+=1.75/120;
  assert.equal(ui.el('speed-value').textContent,num(1,1));assert.equal(ui.el('travel-value').textContent,num(t,1));assert.equal(ui.el('height-value').textContent,'—');assert.equal(ui.el('bounce-value').textContent,'0');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.tankCopy,{s:num(t,1)}));
  assert.equal(ui.el('bank-equation').textContent,'θ_out = θ_in = 35°');assert.ok(ui.painted.includes(fill(l.paceTag,{n:plain(1.75)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('bounce-value').textContent,'1');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values)+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(num(35,1)+'°'));
 });
 test(`${lang}: a bank shot aimed halfway, then at the mirror image`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values)+' '+fill(l.missCopy,{p:plain(3)+' m'})+' '+l.slipHalfway);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes('B'));
  assert.equal(ui.el('bank-equation').textContent,`x = 6 × 2 ÷ (2 + 1) = ${num(4)} m`);
  ui.input('answer',4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values)+' '+l.why1);
 });
 test(`${lang}: a fixed end, upright first, then upside down`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'y_back =');assert.equal(ui.el('answer-unit').textContent,'cm');assert.equal(ui.el('bank-equation').textContent,'y_back = ±y');ui.input('answer',5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values)+' '+fill(l.missCopy,{p:plain(5)+' cm'})+' '+l.slipUpright);assert.ok(ui.painted.includes(l.fixedTag)&&ui.painted.includes(l.markGraph));
  ui.input('answer',-5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values)+' '+l.why2);
  assert.equal(ui.el('bank-equation').textContent,'y_back = −y = −5 cm');
 });
 test(`${lang}: a free end`,()=>{
  ui.click('mission-3');ui.input('answer',5);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values)+' '+l.why3);assert.ok(ui.painted.includes(l.freeTag));
  assert.equal(ui.el('bank-equation').textContent,'y_back = +y = +5 cm');
 });
 test(`${lang}: the round trip, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('bank-equation').textContent,'t = 2L ÷ v');ui.input('answer',3);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('bank-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values)+' '+l.why4);
  assert.equal(ui.el('bank-equation').textContent,`t = 2L ÷ v = 12 ÷ 4 = ${num(3)} s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',5);en.click('play');en.run(()=>en.el('bank-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipUpright));en.input('answer',-5);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'-5');assert.equal(es.el('bank-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('bank-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} bank shot reflection and multilingual interface checks passed.`);
