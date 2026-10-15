// Slinky Lab: transverse and longitudinal waves. Which way a painted coil moves when the slinky is shaken (90°) or pushed
// and pulled (0°, 180° also right), the spacing of compressions λ = v ÷ f, their speed v = f·λ, the spacing from a timed run,
// the front, the coils' movement, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/slinky.html'),'utf8'),copy=require('./locales/slinky.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'slinky-model'),pure);const Slinky=pure.SlinkyModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[90,0,1.5,2,2],units=['°','°','m','m/s','m'];
const make=(i,a=expected[i])=>{const m=new Slinky(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Slinky(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),2);near(m.duration()/m.config.pace,4);});
 near(new Slinky(3).wavelength(),.8);assert.equal(new Slinky(0).config.mode,'trans');for(let i=1;i<5;i++)assert.equal(new Slinky(i).config.mode,'long');
});
test('coils stay still until the front reaches them, then follow the hand one wave behind another',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config,l=m.wavelength();near(m.front(1),c.v);assert.equal(m.shift(c.v*1+.01,1),0);near(m.shift(.4,1.6),m.shift(.4+l,1.6),1e-9);near(m.shift(0,1/c.f/4),m.amplitude());}
});
test('longitudinal waves squeeze the coils to about half their spacing; transverse waves move them 30 cm',()=>{
 const m=make(2),l=m.wavelength(),dx=1e-5,x=m.front(1.5)-l;near(-(m.shift(x+dx,1.5)-m.shift(x-dx,1.5))/(2*dx),.08*2*Math.PI,1e-4);near(make(0).amplitude(),.3);near(make(1).painted(),2);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(100);assert.equal(r.done,true);near(r.t,2);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%, along the slinky is 0° or 180°, and a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){if(i===1)continue;assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 for(const a of [0,.5,180,183])assert.equal(make(1,a).evaluate().ok,true);for(const a of [.6,5,90,175])assert.equal(make(1,a).evaluate().ok,false);
 const m=make(0);m.advance(100);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,90);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(0);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,0),'alongInstead');assert.equal(slip(0,180),'alongInstead');assert.equal(slip(0,45),null);
 assert.equal(slip(1,90),'acrossInstead');assert.equal(slip(1,45),null);
 assert.equal(slip(2,6),'multiplied');assert.equal(slip(2,2/3),'inverted');assert.equal(slip(2,1),null);
 assert.equal(slip(3,.32),'divided');assert.equal(slip(3,3.125),'invertedSpeed');assert.equal(slip(3,1),null);
 assert.equal(slip(4,3),'speedInstead');assert.equal(slip(4,4.5),'multipliedTwo');assert.equal(slip(4,4),'noTime');assert.equal(slip(4,1),null);
});
test('answers are validated and nothing moves without one',()=>{
 assert.equal(new Slinky(0).setAnswer(0),true);assert.equal(new Slinky(0).setAnswer(360),true);for(const bad of [-1,361,Infinity,NaN])assert.equal(new Slinky(0).setAnswer(bad),false);
 for(const bad of [0,-1,1e4+1])assert.equal(new Slinky(2).setAnswer(bad),false);assert.equal(new Slinky(3).setAnswer(1e4),true);
 const m=new Slinky(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,0);m.advance(1);const n=new Slinky();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1);assert.equal(n.answer,0);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Slinky(2);assert.equal(k.restore(bad),false);assert.equal(k.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'slinky-model'),script(source,'slinky-model'));
 return mount(html,{scripts:['slinky-model','slinky-interface'],locale:'slinky-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const m=new Slinky(i);return {l:plain(m.wavelength()),v:plain(m.config.v)};};
 const ui=open(lang),done=()=>ui.el('slinky-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');
  assert.equal(ui.el('given-0').textContent,'↕ · f = 2 Hz');assert.equal(ui.el('given-1').textContent,'↔ · f = 2 Hz');assert.equal(ui.el('given-2').textContent,'↔ · f = 2 Hz · v = 3 m/s');
  assert.equal(ui.el('given-3').textContent,`↔ · f = ${plain(2.5)} Hz · λ = ${plain(.8)} m`);assert.equal(ui.el('given-4').textContent,`↔ · f = ${plain(1.5)} Hz · 6 m · 2 s`);
  for(const id of ['frequency-value','speed-value','wavelength-value','coil-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('slinky-equation').textContent,'θ = ?');
  for(const key of ['viewTitle','pathGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('6 m'));
 });
 test(`${lang}: the readings appear once the hand moves, and the sideways shake is right on the first try`,()=>{
  ui.input('answer',90);assert.equal(ui.el('frequency-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('frequency-value').textContent,num(2,1));assert.equal(ui.el('speed-value').textContent,num(3,1));assert.equal(ui.el('wavelength-value').textContent,num(1.5));assert.equal(ui.el('coil-value').textContent,num(0,0));
  assert.equal(ui.el('time-value').textContent,num(.05));assert.equal(ui.el('lesson-copy').textContent,fill(l.acrossCopy,{c:num(0,0)}));
  assert.equal(ui.el('slinky-equation').textContent,'θ = 90°');assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(2)}))&&ui.painted.includes(l.alongAxis));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: a push and pull taken as a sideways shake, then along the slinky`,()=>{
  ui.click('mission-1');ui.input('answer',90);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(90)+' °'})+' '+l.slipAcrossInstead);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('slinky-equation').textContent,'θ = 0°');
  ui.input('answer',0);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the spacing of compressions`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'m');assert.equal(ui.el('slinky-equation').textContent,'λ = v ÷ f');ui.input('answer',1.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('slinky-equation').textContent,`λ = v ÷ f = 3 ÷ 2 = ${num(1.5)} m`);
 });
 test(`${lang}: the speed of compressions, divided first, then multiplied`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',.32);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(.32)+' m/s'})+' '+l.slipDivided);
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('slinky-equation').textContent,`v = f·λ = ${plain(2.5)} × ${plain(.8)} = ${num(2)} m/s`);
 });
 test(`${lang}: the spacing in two steps, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'λ =');ui.input('answer',2);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('slinky-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('slinky-equation').textContent,`λ = (d ÷ t) ÷ f = 3 ÷ ${plain(1.5)} = ${num(2)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',90);en.click('play');en.run(()=>en.el('slinky-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipAcrossInstead));en.input('answer',0);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0');assert.equal(es.el('slinky-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('slinky-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} slinky transverse, longitudinal, and multilingual interface checks passed.`);
