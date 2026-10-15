// Power on a Rope: the energy a wave carries, P = ½·μ·ω²·A²·v. Power growing as A² and f², the watts for a given rope, the
// amplitude that keeps the power at a higher frequency (your amplitude drives the motor), a heavier rope, the energy delivered
// to the absorber, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ropepower.html'),'utf8'),copy=require('./locales/ropepower.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ropepower-model'),pure);const Rope=pure.RopePowerModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=(mu,f,A,v)=>.5*mu*(2*Math.PI*f)**2*A**2*v,expected=[4,16,P(.2,2,.1,10),5,2],units=['','','W','cm',''];
const make=(i,a=expected[i])=>{const m=new Rope(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Rope(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});near(expected[2],1.57914,1e-5);});
test('the power is ½·μ·ω²·A²·v and grows as A² and f²',()=>{
 near(make(0).power(true),P(.2,2,.05,10));near(make(0).power(),P(.2,2,.1,10));near(make(1).power(),P(.2,4,.1,10));near(make(1).power()/make(1).power(true),16);
 const h=make(4);near(h.power(),P(.8,2,.05,5));near(h.power()/h.power(true),2);near(h.arrival(),1.2);near(h.arrival(true),.6);
});
test('energy reaches the absorber only after the first wave, at the rate P',()=>{
 const m=make(2);near(m.arrival(),.6);assert.equal(m.delivered(.5),0);near(m.delivered(1.6),m.power());near(m.delivered(3),2.4*m.power());
 near(m.height(0,.125),.1);assert.equal(m.height(3,.2),0);near(m.front(.3),3);near(m.front(2),6);
 const w=m.wave();near(.5*w.mu*(2*Math.PI*w.f)**2*w.A**2*w.v,m.power());
});
test('when the amplitude is asked, the motor shakes with yours',()=>{
 const a=make(3,5);near(a.power(),a.power(true));near(a.wave().A,.05);near(make(3,10).power()/a.power(),4);near(make(3,10).height(0,.0625),.1);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,4],[1,16],[2,1.58],[3,5],[3,20],[4,2]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(16);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2),'linear');assert.equal(slip(0,1),'unchanged');assert.equal(slip(0,1.414),'root');assert.equal(slip(0,8),'cubed');assert.equal(slip(0,3),null);
 assert.equal(slip(1,4),'bothLinear');assert.equal(slip(1,8),'oneSquared');assert.equal(slip(1,32),null);
 assert.equal(slip(2,3.158),'noHalf');assert.equal(slip(2,.04),'frequency');assert.equal(slip(2,.1257),'omegaNotSquared');assert.equal(slip(2,15791),'unitsCm');assert.equal(slip(2,1),null);
 assert.equal(slip(3,2.5),'quarter');assert.equal(slip(3,7.07),'rootSwing');assert.equal(slip(3,10),'sameSwing');assert.equal(slip(3,20),'double');assert.equal(slip(3,4),null);
 assert.equal(slip(4,4),'massOnly');assert.equal(slip(4,.5),'speedOnly');assert.equal(slip(4,1),'sameRope');assert.equal(slip(4,3),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Rope(0).setAnswer(bad),false);assert.equal(new Rope(0).setAnswer(1e4),true);assert.equal(new Rope(2).setAnswer(1e6),true);
 const m=new Rope(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,7);m.advance(1);const n=new Rope();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1);near(n.wave().A,.07);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Rope(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ropepower-model'),script(source,'ropepower-model'));
 return mount(html,{scripts:['ropepower-model','ropepower-interface'],locale:'ropepower-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>[{p:num(P(.2,2,.1,10)),p0:num(P(.2,2,.05,10)),a:num(10,1)},{p:num(P(.2,4,.1,10)),p0:num(P(.2,2,.05,10)),a:num(10,1)},{p:num(P(.2,2,.1,10)),p0:'',a:num(10,1)},{p:num(P(.2,4,.05,10)),p0:num(P(.2,2,.1,10)),a:num(5,1)},{p:num(P(.8,2,.05,5)),p0:num(P(.2,2,.05,10)),a:num(5,1)}][i];
 const ui=open(lang),done=()=>ui.el('ropepower-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'P₂ ÷ P₁ =');assert.equal(ui.el('answer-unit').textContent,'');
  assert.equal(ui.el('given-0').textContent,'A: 5 → 10 cm · f = 2 Hz');assert.equal(ui.el('given-1').textContent,'A: 5 → 10 cm · f: 2 → 4 Hz');assert.equal(ui.el('given-2').textContent,`μ = ${plain(.2)} kg/m · v = 10 m/s · f = 2 Hz · A = 10 cm`);
  assert.equal(ui.el('given-3').textContent,'f: 2 → 4 Hz · A₁ = 10 cm');assert.equal(ui.el('given-4').textContent,'μ ×4 · v: 10 → 5 m/s');
  for(const id of ['power-value','energy-value','frequency-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('ropepower-equation').textContent,'P = ½·μ·ω²·A²·v');
  for(const key of ['viewTitle','energyGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('6 m'));
 });
 test(`${lang}: the readings appear once the motor starts, and the power ratio is right on the first try`,()=>{
  ui.input('answer',4);assert.equal(ui.el('power-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('power-value').textContent,num(m.power()));assert.equal(ui.el('energy-value').textContent,num(0));assert.equal(ui.el('frequency-value').textContent,'2');assert.equal(ui.el('speed-value').textContent,num(10));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.shakingCopy,{x:num(m.front(t)),e:num(0)}));
  assert.equal(ui.el('ropepower-equation').textContent,`P₂ ÷ P₁ = (A₂ ÷ A₁)² = (10 ÷ 5)² = ${num(4)}`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('energy-value').textContent,num(m.delivered(3)));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
 });
 test(`${lang}: both changes taken as linear, then 16 times the power`,()=>{
  ui.click('mission-1');ui.input('answer',4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(4)})+' '+l.slipBothLinear);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('ropepower-equation').textContent,`P₂ ÷ P₁ = (A₂ ÷ A₁)²·(f₂ ÷ f₁)² = 2² × 2² = ${num(16)}`);
  ui.input('answer',16);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: a missing ½, then the watts`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'P =');assert.equal(ui.el('answer-unit').textContent,'W');ui.input('answer',3.158);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(3.158)+' W'})+' '+l.slipNoHalf);
  ui.input('answer',1.58);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('ropepower-equation').textContent,`P = ½·μ·(2π·f)²·A²·v = ½ × ${plain(.2)} × (2π × 2)² × ${plain(.1)}² × 10 = ${num(expected[2])} W`);
 });
 test(`${lang}: the amplitude for the same power drives the motor`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'A₂ =');assert.equal(ui.el('answer-unit').textContent,'cm');assert.equal(ui.el('ropepower-equation').textContent,'P ∝ f²·A²');
  ui.input('answer',5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('power-value').textContent,num(P(.2,4,.05,10)));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.equal(ui.el('ropepower-equation').textContent,`A₂ = A₁·f₁ ÷ f₂ = 10 × 2 ÷ 4 = ${num(5,1)} cm`);
 });
 test(`${lang}: the heavier rope, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',2);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('ropepower-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('ropepower-equation').textContent,`P₂ ÷ P₁ = (μ₂·v₂) ÷ (μ₁·v₁) = (${plain(.8)} × 5) ÷ (${plain(.2)} × 10) = ${num(2)}`);assert.equal(ui.el('speed-value').textContent,num(5));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',4);en.click('play');en.run(()=>en.el('ropepower-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipBothLinear));en.input('answer',16);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'16');assert.equal(es.el('ropepower-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('ropepower-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} power on a rope and multilingual interface checks passed.`);
