// Shallow Beach: refraction of water waves. The shorter wavelength over a sandbank λ₂ = λ₁·v₂ ÷ v₁, the unchanged
// frequency, the bend sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂, the speed from the bend, the depth from v = √(g·h), crests continuous across
// the edge, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/beach.html'),'utf8'),copy=require('./locales/beach.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'beach-model'),pure);const Beach=pure.BeachModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const d=Math.PI/180,expected=[6,.5,Math.asin(.3)/d,6*Math.sin(25*d)/Math.sin(40*d),9/9.8],units=['m','Hz','°','m/s','m'];
const make=(i,a=expected[i])=>{const m=new Beach(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run shows three periods in 4 s',()=>{
 expected.forEach((x,i)=>{const m=new Beach(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),6);near(m.duration()/m.config.pace,4);});
 near(new Beach(3).theta2(),25);near(new Beach(0).lambda1(),10);near(new Beach(0).lambda2(),6);
});
test('the bend follows Snell\'s law and crests stay continuous across the edge',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;if(c.theta)near(Math.sin(c.theta*d)/Math.sin(m.theta2()*d),c.v1/c.v2);for(const y of [-10,0,7])near(m.phase(20-1e-9,y),m.phase(20+1e-9,y),1e-6);}
 const m=make(0);near(m.phase(30,0)-m.phase(24,0),1);near(m.phase(15,0)-m.phase(5,0),1);near(m.height(20,0,0),1);near(m.height(26,0,0),1);near(m.height(23,0,0),-1);
 assert.equal(m.crossed(1.9),0);assert.equal(m.crossed(2),1);assert.equal(m.crossed(6),3);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,6);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,.3);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.5);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,50/3),'invertedRatio');assert.equal(slip(0,10),'unchanged');assert.equal(slip(0,8),'speedDifference');assert.equal(slip(0,7),null);
 assert.equal(slip(1,.3),'slowedFreq');assert.equal(slip(1,5/6),'speededFreq');assert.equal(slip(1,1),null);
 assert.equal(slip(2,18),'linearAngle');assert.equal(slip(2,Math.asin(5/6)/d),'invertedAngle');assert.equal(slip(2,30),'unchangedAngle');assert.equal(slip(2,25),null);
 assert.equal(slip(3,6*Math.sin(40*d)/Math.sin(25*d)),'invertedSpeed');assert.equal(slip(3,3.75),'linearSpeed');assert.equal(slip(3,5),null);
 assert.equal(slip(4,3/9.8),'notSquared');assert.equal(slip(4,88.2),'multiplied');assert.equal(slip(4,9),'squareOnly');assert.equal(slip(4,2),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,91])assert.equal(new Beach(2).setAnswer(bad),false);assert.equal(new Beach(2).setAnswer(90),true);assert.equal(new Beach(0).setAnswer(1e4),true);assert.equal(new Beach(1).setAnswer(1001),false);
 const m=new Beach(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,3.75);m.advance(2);const n=new Beach();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,2);assert.equal(n.answer,3.75);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:7},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Beach(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'beach-model'),script(source,'beach-model'));
 return mount(html,{scripts:['beach-model','beach-interface'],locale:'beach-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,dd=2)=>Math.abs(n)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):n.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Beach(i),c=m.config;return {l:plain(m.lambda2()),f:plain(c.f),a:num(m.theta2(),1),v:num(c.v2),h:num(c.v2*c.v2/9.8)};};
 const ui=open(lang),done=()=>ui.el('beach-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'λ₂ =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'λ₁ = 10 m · v: 5 → 3 m/s');assert.equal(ui.el('given-1').textContent,'λ₁ = 10 m · v: 5 → 3 m/s');assert.equal(ui.el('given-2').textContent,'θ₁ = 30° · v: 5 → 3 m/s');
  assert.equal(ui.el('given-3').textContent,'v₁ = 6 m/s · 40° → 25°');assert.equal(ui.el('given-4').textContent,`v₂ = 3 m/s · g = ${plain(9.8)} m/s²`);
  for(const id of ['speed1-value','speed2-value','wavelength2-value','frequency-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('beach-equation').textContent,'λ₂ ÷ λ₁ = v₂ ÷ v₁');
  for(const key of ['viewTitle','profileGraph','panelHint','scaleNote','deepTag','shallowTag','normalTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('40 m'));
 });
 test(`${lang}: the readings appear once the waves start, and the new wavelength is right on the first try`,()=>{
  ui.input('answer',6);assert.equal(ui.el('speed1-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('speed1-value').textContent,num(5,1));assert.equal(ui.el('speed2-value').textContent,num(3));assert.equal(ui.el('wavelength2-value').textContent,num(6,1));assert.equal(ui.el('frequency-value').textContent,num(.5));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.beachCopy,{n:'0'}));
  assert.equal(ui.el('beach-equation').textContent,`λ₂ = λ₁·v₂ ÷ v₁ = 10 × 3 ÷ 5 = ${num(6,1)} m`);assert.ok(ui.painted.includes(fill(l.paceTag,{n:plain(1.5)}))&&ui.painted.includes(l.distanceAxis));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: the frequency slowed with the speed, then unchanged`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'f₂ =');assert.equal(ui.el('answer-unit').textContent,'Hz');assert.equal(ui.el('beach-equation').textContent,'f₂ = f₁');ui.input('answer',.3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(.3)+' Hz'})+' '+l.slipSlowedFreq);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('beach-equation').textContent,`f₂ = f₁ = v₁ ÷ λ₁ = 5 ÷ 10 = ${num(.5)} Hz`);
  ui.input('answer',.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the bend over the sandbank`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'θ₂ =');assert.equal(ui.el('answer-unit').textContent,'°');assert.equal(ui.el('beach-equation').textContent,'sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂');ui.input('answer',17.46);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('beach-equation').textContent,`sin θ₂ = sin 30° × 3 ÷ 5 → θ₂ = ${num(Math.asin(.3)/d,1)}°`);
 });
 test(`${lang}: the speed from the bend, with the angles, then their sines`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'v₂ =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',3.75);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(3.75)+' m/s'})+' '+l.slipLinearSpeed);
  ui.input('answer',3.94);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('beach-equation').textContent,`v₂ = v₁·sin 25° ÷ sin 40° = ${num(expected[3])} m/s`);
 });
 test(`${lang}: the depth over the sandbank, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('beach-equation').textContent,'v = √(g·h)');ui.input('answer',.92);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('beach-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('beach-equation').textContent,`h = v₂² ÷ g = 3² ÷ ${plain(9.8)} = ${num(9/9.8)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',.3);en.click('play');en.run(()=>en.el('beach-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSlowedFreq));en.input('answer',.5);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.5');assert.equal(es.el('beach-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('beach-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} shallow beach refraction and multilingual interface checks passed.`);
