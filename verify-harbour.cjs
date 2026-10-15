// Harbour Gap: diffraction of sea waves through a gap. The first calm direction sin θ = λ ÷ a, the gap that puts a boat in
// it, a wavelength from a calm direction, the widest gap with no calm direction (a = λ), λ = v·T first, the exact end of
// each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/harbour.html'),'utf8'),copy=require('./locales/harbour.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'harbour-model'),pure);const Harbour=pure.HarbourModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const d=Math.PI/180,expected=[30,12,14*Math.sin(35*d),15,Math.asin(.4)/d],units=['°','m','m','m','°'];
const make=(i,a=expected[i])=>{const m=new Harbour(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Harbour(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
 near(new Harbour(4).lambda(),10);near(new Harbour(1).gap(),12);near(new Harbour(3).gap(),15);
});
test('the waves are calm in the direction sin θ = λ ÷ a, highest straight ahead, and spread everywhere once a = λ',()=>{
 for(let i=0;i<5;i++){const m=new Harbour(i),c=m.calmAngle();near(Math.sin(c*d),m.lambda()/m.gap());near(m.amplitude(c),0,1e-12);near(m.amplitude(0),1);near(m.amplitude(Math.asin(Math.sin(c*d)/2)/d),2/Math.PI);}
 near(new Harbour(3).calmAngle(),90);near(new Harbour(1).amplitude(30),0,1e-12);
 const m=new Harbour(0);for(let k=0;k<10;k++){const t=k/10,r=50;near(m.field(r*Math.cos(30*d),r*Math.sin(30*d),t),0,1e-12);near(m.field(-1e-9,0,t),m.field(1e-9,0,t),1e-6);near(m.field(-5,7,t),Math.cos(2*Math.PI*(-.5-t)));}
 near(m.probe(0),0);near(m.probe(2),45);near(m.probe(4),90);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,3);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(12);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.5),'sineOnly');assert.equal(slip(0,Math.atan(.5)/d),'tangent');assert.equal(slip(0,60),'fromWall');assert.equal(slip(0,45),null);
 assert.equal(slip(1,3),'multiplied');assert.equal(slip(1,6/Math.tan(30*d)),'tangentGap');assert.equal(slip(1,6),'lambdaOnly');assert.equal(slip(1,6/Math.cos(30*d)),'cosine');assert.equal(slip(1,9),null);
 assert.equal(slip(2,14/Math.sin(35*d)),'divided');assert.equal(slip(2,14*Math.tan(35*d)),'tangentLambda');assert.equal(slip(2,14*Math.cos(35*d)),'cosineLambda');assert.equal(slip(2,7),null);
 assert.equal(slip(3,7.5),'halfGap');assert.equal(slip(3,30),'doubleGap');assert.equal(slip(3,20),null);
 assert.equal(slip(4,Math.asin(.2)/d),'speedOnly');assert.equal(slip(4,Math.asin(.1)/d),'dividedPeriod');assert.equal(slip(4,Math.atan(.4)/d),'tangent');assert.equal(slip(4,30),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,91])assert.equal(new Harbour(0).setAnswer(bad),false);assert.equal(new Harbour(0).setAnswer(90),true);assert.equal(new Harbour(1).setAnswer(1001),false);assert.equal(new Harbour(1).setAnswer(500),true);
 const m=new Harbour(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,20);m.advance(1);const k=new Harbour();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,20);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Harbour(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'harbour-model'),script(source,'harbour-model'));
 return mount(html,{scripts:['harbour-model','harbour-interface'],locale:'harbour-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Harbour(i);return {e:num(m.exact(),m.config.ask==='lambda'?2:1),l:num(m.lambda(),0)};};
 const ui=open(lang),done=()=>ui.el('harbour-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');
  assert.equal(ui.el('given-0').textContent,'λ = 10 m · a = 20 m');assert.equal(ui.el('given-1').textContent,'λ = 6 m · θ = 30°');assert.equal(ui.el('given-2').textContent,'a = 14 m · θ = 35°');
  assert.equal(ui.el('given-3').textContent,'λ = 15 m · θ = 90°');assert.equal(ui.el('given-4').textContent,'v = 5 m/s · T = 2 s · a = 25 m');
  for(const id of ['lambda-value','gap-value','probe-value','height-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('harbour-equation').textContent,'sin θ = λ ÷ a');
  for(const key of ['viewTitle','heightGraph','panelHint','scaleNote','wallTag','seaTag','boatTag','slowTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('20 m'));
 });
 test(`${lang}: the readings appear once the gauge sweeps, and the first calm direction is right on the first try`,()=>{
  ui.input('answer',30);assert.equal(ui.el('lambda-value').textContent,'—');
  ui.click('step');
  const m=new Harbour(0),p=m.probe(.1),h=Math.abs(m.amplitude(p))*100;
  assert.equal(ui.el('lambda-value').textContent,num(10));assert.equal(ui.el('gap-value').textContent,num(20));assert.equal(ui.el('probe-value').textContent,num(p,0));assert.equal(ui.el('height-value').textContent,num(h,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.harbourCopy,{a:num(p,0),h:num(h,0)}));
  assert.equal(ui.el('harbour-equation').textContent,`sin θ = λ ÷ a = 10 ÷ 20 → θ = ${num(30,1)}°`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.angleAxis));assert.equal(ui.el('probe-value').textContent,num(90,0));
 });
 test(`${lang}: the gap that calms the boat stays hidden until the run ends; multiplied first, then a = λ ÷ sin θ`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'a =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',3);assert.ok(ui.painted.includes('?'));
  ui.click('step');assert.equal(ui.el('gap-value').textContent,'?');assert.equal(ui.el('lambda-value').textContent,num(6));
  ui.click('play');ui.run(done);assert.equal(ui.el('gap-value').textContent,num(12));
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(3)+' m'})+' '+l.slipMultiplied);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('harbour-equation').textContent,`a = λ ÷ sin θ = 6 ÷ sin 30° = ${num(12,1)} m`);
  ui.input('answer',12);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the wavelength from a calm direction, divided first, then λ = a·sin θ`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'λ =');ui.input('answer',24.41);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(24.41)+' m'})+' '+l.slipDivided);
  assert.equal(ui.el('harbour-equation').textContent,`λ = a·sin θ = 14 × sin 35° = ${num(expected[2])} m`);
  ui.input('answer',8.03);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: the widest gap with no calm direction is one wavelength`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'a =');ui.input('answer',15);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('harbour-equation').textContent,`a = λ ÷ sin 90° = 15 ÷ 1 = ${num(15,1)} m`);assert.equal(ui.el('height-value').textContent,num(0,0));
 });
 test(`${lang}: speed and period give the wavelength, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('harbour-equation').textContent,'λ = v·T');ui.input('answer',23.6);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('harbour-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('harbour-equation').textContent,`sin θ = v·T ÷ a = 10 ÷ 25 → θ = ${num(expected[4],1)}°`);assert.equal(ui.el('lambda-value').textContent,num(10));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',3);en.click('play');en.run(()=>en.el('harbour-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMultiplied));en.input('answer',12);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'12');assert.equal(es.el('harbour-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('harbour-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} harbour diffraction and multilingual interface checks passed.`);
