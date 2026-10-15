// Big and Fading Swings: the exact large-angle period (elliptic integral, checked against the integrated swing), a clock's
// error, swings that keep the same share of their size each time, their half-life, energy lost as the size squared, the
// exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/fading.html'),'utf8'),copy=require('./locales/fading.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'fading-model'),pure);const Fade=pure.FadingModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const T0=2*Math.PI*Math.sqrt(1/9.8),expected=[2.153973,1.740880,20*.9**5,Math.log(2)/Math.log(1/.9),19],units=['s','%','°','','%'];
const make=(i,a=expected[i])=>{const m=new Fade(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Fade(i);near(m.exact(),x,1e-6);assert.equal(m.unit(),units[i]);});near(new Fade(0).small(),T0);});
test('big swings take longer: the elliptic period matches the integrated swing',()=>{
 const m=new Fade(0),T=m.big();near(T/T0,1.073182,1e-6);near(m.angle(T),60,1e-6);near(m.angle(2*T),60,1e-6);near(m.angle(T/2),-60,1e-6);near(m.angle(T/4),0,1e-5);
 near(new Fade(1).big()/T0,1.017409,1e-6);near(m.big(90)/T0,1.180341,1e-6);near(m.big(.01),T0,1e-8);near(new Fade(1).angle(new Fade(1).big()),30,1e-6);
});
test('fading swings keep the same share each swing; the energy keeps its square',()=>{
 const m=new Fade(2);for(let n=0;n<=5;n++){near(m.size(n*T0),20*.9**n);near(m.angle(n*T0),20*.9**n);}near(m.size(2.5*T0),20*.9**2.5);near(m.ideal(3*T0),20);
 const h=new Fade(3);near(h.size(h.exact()*T0),10);const e=new Fade(4);near((e.size(T0)/20)**2,.81);near(e.swings(T0),1);
});
test('every run ends exactly inside long steps',()=>{
 const D=[0,1,2,3,4].map(i=>new Fade(i).duration());near(D[0],3*2.153973,1e-6);near(D[1],4*T0*1.017409,1e-6);near(D[2],5*T0);near(D[3],8*T0);near(D[4],T0);
 for(const [i,a] of [[0,2.15],[1,1.74],[2,11.8],[3,6.6],[4,19]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(0);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(4);m.advance(10);assert.equal(m.score(),150);assert.equal(make(4).score(),0);
 const n=make(3,5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(6.58);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2.007),'smallAngle');assert.equal(slip(0,1.077),'halfSwing');assert.equal(slip(0,3),null);
 assert.equal(slip(1,.01741),'fraction');assert.equal(slip(1,2.042),'seconds');assert.equal(slip(1,7.3),null);
 assert.equal(slip(2,10),'linear');assert.equal(slip(2,18),'oneSwing');assert.equal(slip(2,13.12),'fourSwings');assert.equal(slip(2,6.974),'energyKept');assert.equal(slip(2,15),null);
 assert.equal(slip(3,5),'linear');assert.equal(slip(3,3.29),'energyHalf');assert.equal(slip(3,10),null);
 assert.equal(slip(4,10),'amplitudeOnly');assert.equal(slip(4,81),'kept');assert.equal(slip(4,1),'squaredLoss');assert.equal(slip(4,30),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e3+1])assert.equal(new Fade(0).setAnswer(bad),false);assert.equal(new Fade(2).setAnswer(180),true);assert.equal(new Fade(2).setAnswer(181),false);assert.equal(new Fade(4).setAnswer(100.5),false);
 const m=new Fade(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,12);m.advance(4);const n=new Fade();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,4);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:11},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Fade(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'fading-model'),script(source,'fading-model'));
 return mount(html,{scripts:['fading-model','fading-interface'],locale:'fading-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config;return {T:num(m.big(),3),T0:num(m.small(),3),p:num(c.keep?0:m.exact()),a:num(c.keep?c.start*c.keep**c.swings:0,1),n:num(c.keep?Math.log(2)/Math.log(1/c.keep):0,1),k:num(c.keep?c.keep*c.keep*100:0,0),e:num(c.keep?(1-c.keep*c.keep)*100:0,0)};};
 const ui=open(lang),done=()=>ui.el('fading-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,'L = 1 m · θ₀ = 60°');assert.equal(ui.el('given-1').textContent,'L = 1 m · θ₀ = 30°');for(const i of [2,3,4])assert.equal(ui.el('given-'+i).textContent,'L = 1 m · θ₀ = 20° · 90%');
  for(const id of ['angle-value','size-value','period-value','swings-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('fading-equation').textContent,'T₀ = 2π·√(L ÷ g)');
  for(const key of ['viewTitle','graphTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('60°'));
 });
 test(`${lang}: the readings appear once it swings, and the big swing's period is right on the first try`,()=>{
  ui.input('answer',2.154);assert.equal(ui.el('period-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('angle-value').textContent,num(m.angle(t),1));assert.equal(ui.el('size-value').textContent,num(60,1));assert.equal(ui.el('period-value').textContent,num(m.big(),3));assert.equal(ui.el('swings-value').textContent,num(m.swings(t)));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.swingingCopy,{n:num(m.swings(t)),a:num(60,1)}));
  assert.equal(ui.el('fading-equation').textContent,`T₀ = 2π·√(L ÷ g) = ${num(T0,3)} s → T(60°) = ${num(m.big()/T0,3)} × T₀ = ${num(m.big(),3)} s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: a fraction for a percentage, then the clock's error`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'ΔT ÷ T₀ =');assert.equal(ui.el('answer-unit').textContent,'%');ui.input('answer',.01741);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(.01741)+' %'})+' '+l.slipFraction);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('fading-equation').textContent,`T(30°) ÷ T₀ = ${num(m.big(),3)} ÷ ${num(T0,3)} = ${num(m.big()/T0,4)} → +${num(m.exact())} %`);
  ui.input('answer',1.74);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: a fading swing, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'θ₅ =');assert.equal(ui.el('answer-unit').textContent,'°');ui.input('answer',11.8);assert.ok(ui.painted.includes(l.guessTag));
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('fading-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('size-value').textContent,num(20*.9**5,1));assert.equal(ui.el('fading-equation').textContent,`θ₅ = 20° × ${plain(.9)}⁵ = ${num(20*.9**5)}°`);
 });
 test(`${lang}: losses subtracted, then the half-life`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',5);ui.click('play');ui.run(done);
  const m=make(3);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:'5'})+' '+l.slipLinear);
  ui.input('answer',6.58);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('fading-equation').textContent,`${plain(.9)}ⁿ = ½ → n = log ½ ÷ log ${plain(.9)} = ${num(m.exact())}`);
 });
 test(`${lang}: the energy lost in one swing`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'ΔE ÷ E =');ui.input('answer',19);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('fading-equation').textContent,`E ∝ θ² → ${plain(.9)}² = ${plain(.9*.9)} → ${num(19,0)} %`);assert.ok(ui.painted.includes(l.energyGraph)&&ui.painted.includes('100 %'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',5);en.click('play');en.run(()=>en.el('fading-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLinear));en.input('answer',6.58);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'6.58');assert.equal(es.el('fading-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('fading-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} big and fading swings pendulum and multilingual interface checks passed.`);
