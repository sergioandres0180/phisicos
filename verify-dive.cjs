// Deep Dive: pressure in a fluid (p = p₀ + ρ·g·h), the deepest safe dive in sea and fresh water, the force on a window,
// the pressure change between two depths, the exact alarm, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/dive.html'),'utf8'),copy=require('./locales/dive.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'dive-model'),pure);const Dive=pure.DiveModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const sea=1025*9.8/1000,fresh=9.8,expected=[101+sea*30,1099/sea,1099/fresh,sea*50*.5,sea*15],units=['kPa','m','m','kN','kPa'];
const make=(i,a=expected[i])=>{const m=new Dive(i);assert.ok(m.setAnswer(a));return m;};

test('each dive has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Dive(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(new Dive(0).exact(),402.35);near(new Dive(3).exact(),251.125);});
test('pressure grows in a straight line from p₀ at the surface, and the dive goes down steadily',()=>{
 const m=make(0);near(m.pressure(0),101);near(m.pressure(10),101+sea*10);near(m.pressure(20)-m.pressure(10),m.pressure(30)-m.pressure(20));
 near(m.depth(0),0);near(m.depth(1),15);near(m.depth(2),30);near(m.depth(5),30);near(make(4).depth(0),10);near(make(4).depth(1),17.5);
 near(make(2).water(10),98);near(make(1).safeDepth(),1099/sea);assert.equal(make(0).safeDepth(),null);
});
test('the alarm stops the dive at the exact depth where the hull limit is reached',()=>{
 const m=make(1,1200/sea),deep=(1200*(1+5e-4)-101)/sea,ta=2*deep/(1200/sea);
 near(m.alarmTime(),ta);assert.equal(m.alarmed(),true);near(m.duration(),ta);near(m.depth(1.99),deep);near(m.pressure(m.depth(2)),1200*(1+5e-4));
 const e=m.advance(100);assert.equal(e.done,true);near(m.t,ta);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 assert.equal(make(1,109.45).alarmed(),false);assert.equal(make(1,109.5).alarmed(),true);assert.equal(make(2,112).alarmed(),false);
 const a=make(1,130),b=make(1,130);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('the run ends exactly at 2 s inside long steps when the hull holds',()=>{
 const a=make(0),b=make(0);a.advance(100);let n=0;while(b.status!=='done'){b.advance(1/120);n++;}near(a.t,2);near(a.t,b.t,1e-12);assert.equal(n,240);
});
test('answers count within 2%, a safe depth with at most 2% to spare, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,402).evaluate().ok,true);assert.equal(make(0,412).evaluate().ok,false);assert.equal(make(3,251).evaluate().ok,true);assert.equal(make(4,150).evaluate().ok,true);
 assert.equal(make(1,108).evaluate().ok,true);assert.equal(make(1,107).evaluate().ok,false);assert.equal(make(1,109.45).evaluate().ok,true);assert.equal(make(1,110).evaluate().ok,false);
 const m=make(3);m.advance(10);assert.equal(m.score(),150);assert.equal(make(3).score(),0);
 const n=make(1,130);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(109);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,sea*30),'noP0');assert.equal(slip(0,101+30.75),'noG');assert.equal(slip(0,500),null);
 assert.equal(slip(1,1200/sea),'noP0');assert.equal(slip(1,90),'spare');assert.equal(slip(1,140),null);
 assert.equal(slip(2,1099/sea),'seawater');assert.equal(slip(2,1200/fresh),'noP0');assert.equal(slip(2,95),'spare');
 assert.equal(slip(3,(101+sea*50)*.5),'total');assert.equal(slip(3,sea*50),'noArea');assert.equal(slip(3,1025*50*.5/1000),'noG');
 assert.equal(slip(4,sea*25),'totalDepth');assert.equal(slip(4,101+sea*25),'withP0');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1001])assert.equal(new Dive(1).setAnswer(bad),false);assert.equal(new Dive(0).setAnswer(1e5),true);
 const m=new Dive(1);near(m.target(),0);assert.equal(m.alarmTime(),null);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,130);m.advance(.3);const n=new Dive();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,130);assert.equal(n.index,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Dive();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'dive-model'),script(source,'dive-model'));
 return mount(html,{scripts:['dive-model','dive-interface'],locale:'dive-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('dive-status-text').textContent===l.done,P=h=>101+sea*h;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'p =');assert.equal(ui.el('answer-unit').textContent,'kPa');
  assert.equal(ui.el('given-0').textContent,'h = 30 m · ρ = 1025 kg/m³ · p₀ = 101 kPa');
  assert.equal(ui.el('given-1').textContent,'p_max = 1200 kPa · ρ = 1025 kg/m³ · p₀ = 101 kPa');
  assert.equal(ui.el('given-3').textContent,`h = 50 m · A = ${plain(.5)} m² · ρ = 1025 kg/m³`);
  assert.equal(ui.el('given-4').textContent,'h: 10 → 25 m · ρ = 1025 kg/m³');
  for(const id of ['depth-value','pressure-value','water-value','force-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('dive-equation').textContent,'p = p₀ + ρ·g·h');
  for(const key of ['viewTitle','graphTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(l.seaLabel+' · ρ = 1025 kg/m³')&&ui.painted.includes('kPa'));
 });
 test(`${lang}: the gauge reads once the dive starts, and the pressure at 30 m is right on the first try`,()=>{
  ui.input('answer',402.35);assert.equal(ui.el('pressure-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('depth-value').textContent,fmt(1.5,1));assert.equal(ui.el('pressure-value').textContent,fmt(P(1.5),1));assert.equal(ui.el('water-value').textContent,fmt(sea*1.5,1));assert.equal(ui.el('force-value').textContent,'—');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{h:fmt(1.5,1),p:fmt(P(1.5),1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{p:fmt(P(30),1),w:fmt(sea*30,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: forgetting the air sets off the alarm, and the safe depth holds`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',119.5);ui.click('play');ui.run(done);
  const deep=(1200*(1+5e-4)-101)/sea;
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.alarmCopy,{h:fmt(deep,1),target:plain(119.5)})+' '+fill(l.missCopy,{p:plain(119.5)+' m'})+' '+l.slipNoP0);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner+' · '+l.alarmBanner)&&ui.painted.includes(l.limitTag));
  ui.input('answer',109.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{h:fmt(109.4,1),p:fmt(P(109.4),1),margin:fmt(1200-P(109.4),1)})+' '+l.why1);
 });
 test(`${lang}: the lake dive, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');ui.input('answer',109.4);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSeawater));assert.ok(ui.painted.includes(l.lakeLabel+' · ρ = 1000 kg/m³'));
  ui.input('answer',112);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('dive-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why2));
 });
 test(`${lang}: the force on the window`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'kN');
  ui.input('answer',301.6);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipTotal));assert.equal(ui.el('force-value').textContent,fmt(sea*25,1));
  ui.input('answer',251);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{w:fmt(sea*50,1),f:fmt(sea*25,1)})+' '+l.why3);
 });
}
test('changing language preserves dive, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',251.1);en.click('play');en.run(()=>en.el('dive-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipTotalDepth));
 const one=n=>n.toLocaleString('en',{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false});
 assert.ok(en.el('lesson-copy').textContent.startsWith(copy.en.result4.replace('{p1}',one(101+sea*10)).replace('{p}',one(101+sea*25)).replace('{dp}',one(sea*15))));
 en.input('answer',150.7);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'150.7');assert.equal(es.el('dive-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('dive-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} deep-dive pressure and multilingual interface checks passed.`);
