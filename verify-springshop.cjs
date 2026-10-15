// Spring Shop: springs side by side (k = k₁ + k₂) and end to end (1/k = 1/k₁ + 1/k₂), half a spring twice as stiff, a
// bounce on two springs, each spring's own stretch, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/springshop.html'),'utf8'),copy=require('./locales/springshop.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'springshop-model'),pure);const Shop=pure.SpringShopModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const T4=2*Math.PI*Math.sqrt(.5/100),expected=[9.8,39.2,240,75,T4],units=['cm','cm','N/m','N/m','s'];
const make=(i,a=expected[i])=>{const m=new Shop(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Shop(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(T4,.444288,1e-5);});
test('side by side the stiffnesses add; end to end the stretches add',()=>{
 same([0,1,2,3,4].map(i=>Number(new Shop(i).stiffness().toFixed(9))),[200,50,240,75,100]);
 const p=make(0);same(p.parts(2).map(v=>Number(v.toFixed(9))),[.098,.098]);near(p.force(2),19.6);
 const s=make(1);same(s.parts(2).map(v=>Number(v.toFixed(9))),[.196,.196]);near(s.rest(),.392);near(s.force(2),19.6);
 const x=make(3);near(x.parts(2)[0],.098);near(x.parts(2)[1],.098/3);near(x.parts(2)[0]+x.parts(2)[1],x.rest());near(100*x.parts(2)[0],300*x.parts(2)[1]);
});
test('half a spring stretches half as far under the same load',()=>{const c=make(2),[whole,half]=c.parts(2);near(whole,9.8/120);near(half,9.8/240);near(whole/half,2);});
test('the load is lowered gently to rest; the bounce is simple harmonic on the combined spring',()=>{
 const m=make(0);near(m.stretch(0),0);near(m.stretch(1),.049);near(m.stretch(2),.098);near(m.velocity(0),0);near(m.velocity(2),0,1e-12);assert.equal(m.bouncing(),false);
 const b=make(4);near(b.omega(),Math.sqrt(200));near(b.stretch(0),b.rest()+.03);near(b.stretch(b.period()/2),b.rest()-.03);near(Math.abs(b.velocity(b.period()/4)),.03*Math.sqrt(200));
});
test('every run lasts exactly 2 s, even inside long steps',()=>{
 for(const [i,a] of [[0,9.8],[1,39.2],[2,240],[3,75],[4,.44]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,2);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,60);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(240);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,19.6),'oneSpring');assert.equal(slip(0,39.2),'seriesInstead');assert.equal(slip(0,.098),'unitsM');assert.equal(slip(0,5),null);
 assert.equal(slip(1,9.8),'addedK');assert.equal(slip(1,19.6),'oneOfTwo');assert.equal(slip(1,.392),'unitsM');assert.equal(slip(1,30),null);
 assert.equal(slip(2,60),'halved');assert.equal(slip(2,120),'same');assert.equal(slip(2,480),null);
 assert.equal(slip(3,400),'addedK');assert.equal(slip(3,200),'average');assert.equal(slip(3,100),null);
 assert.equal(slip(4,.6283),'singleSpring');assert.equal(slip(4,.8886),'seriesInstead');assert.equal(slip(4,.0707),'noTwoPi');assert.equal(slip(4,1),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Shop(0).setAnswer(bad),false);assert.equal(new Shop(0).setAnswer(1e4),true);assert.equal(new Shop(2).setAnswer(1e6),true);assert.equal(new Shop(4).setAnswer(1e3+1),false);
 const m=new Shop(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,30);m.advance(1.5);const n=new Shop();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Shop(2);assert.equal(k.restore(bad),false);assert.equal(k.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'springshop-model'),script(source,'springshop-model'));
 return mount(html,{scripts:['springshop-model','springshop-interface'],locale:'springshop-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const cm=x=>num(x*100,1);
 const values=m=>{const c=m.config,[p1,p2]=m.parts(2);return {x:cm(m.rest()),x1:cm(c.k0?p2:p1),x2:cm(p2),x0:cm(p1),k:num(m.stiffness(),1),F:num(m.weight(),1),F2:num(m.weight()/2,1),T:num(m.period(),3)};};
 const ui=open(lang),done=()=>ui.el('springshop-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.equal(ui.el('given-0').textContent,'k₁ = k₂ = 100 N/m · m = 2 kg');assert.equal(ui.el('given-1').textContent,'k₁ = k₂ = 100 N/m · m = 2 kg');assert.equal(ui.el('given-2').textContent,'k = 120 N/m · ½');
  assert.equal(ui.el('given-3').textContent,'k₁ = 100 N/m · k₂ = 300 N/m');assert.equal(ui.el('given-4').textContent,`k₁ = k₂ = 50 N/m · m = ${plain(.5)} kg`);
  for(const id of ['stretch-value','force-value','stiffness-value','period-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('springshop-equation').textContent,'k = k₁ + k₂');
  for(const key of ['viewTitle','lowerTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('100 N/m'));
 });
 test(`${lang}: the readings appear once the load is lowered, and side by side is right on the first try`,()=>{
  ui.input('answer',9.8);assert.equal(ui.el('stretch-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('stretch-value').textContent,cm(m.stretch(t)));assert.equal(ui.el('force-value').textContent,num(m.force(t),1));assert.equal(ui.el('stiffness-value').textContent,num(200,1));assert.equal(ui.el('period-value').textContent,num(m.period(),3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.loweringCopy,{x:cm(m.stretch(t)),F:num(m.force(t),1)}));
  assert.equal(ui.el('springshop-equation').textContent,`k = k₁ + k₂ = 100 + 100 = 200 N/m · x = m·g ÷ k = ${num(9.8,1)} cm`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: stiffnesses added end to end, then the true drop`,()=>{
  ui.click('mission-1');ui.input('answer',9.8);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(9.8)+' cm'})+' '+l.slipAddedK);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('springshop-equation').textContent,`1/k = 1/100 + 1/100 → k = ${num(50,1)} N/m · x = m·g ÷ k = ${num(39.2,1)} cm`);
  ui.input('answer',39.2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: a halved stiffness, then half a spring twice as stiff`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'k =');assert.equal(ui.el('answer-unit').textContent,'N/m');ui.input('answer',60);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipHalved));
  ui.input('answer',240);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('springshop-equation').textContent,'k_½ = 2·k = 2 × 120 = 240 N/m');assert.ok(ui.painted.includes('½ · k = 240 N/m')&&ui.painted.includes('k = 120 N/m'));
 });
 test(`${lang}: a mixed pair, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',75);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('springshop-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
  assert.equal(ui.el('springshop-equation').textContent,`1/k = 1/100 + 1/300 → k = ${num(75,1)} N/m`);assert.ok(ui.painted.includes('300 N/m'));
 });
 test(`${lang}: the bounce on two springs`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'T =');ui.input('answer',.4443);
  ui.click('step');const m=make(4),t=12/120;assert.equal(ui.el('lesson-copy').textContent,fill(l.bouncingCopy,{y:num((m.stretch(t)-m.rest())*100,1),v:num(Math.abs(m.velocity(t)))}));
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+l.why4);
  assert.equal(ui.el('springshop-equation').textContent,`k = 50 + 50 = 100 N/m · T = 2π·√(m ÷ k) = ${num(T4,3)} s`);assert.ok(ui.painted.includes(l.graphTitle));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',60);en.click('play');en.run(()=>en.el('springshop-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipHalved));en.input('answer',240);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'240');assert.equal(es.el('springshop-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('springshop-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} spring shop series, parallel, and multilingual interface checks passed.`);
