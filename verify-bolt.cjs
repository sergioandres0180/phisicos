// Stuck Bolt: torque from a push at a distance and an angle (τ = F·r·sin φ), a cross wrench's couple, breaking loose
// exactly, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bolt.html'),'utf8'),copy=require('./locales/bolt.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bolt-model'),pure);const Bolt=pure.BoltModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[200,400,.8,30,220],needs=[60,60,240,60,110];
const make=(i,a=expected[i])=>{const m=new Bolt(i);assert.ok(m.setAnswer(a));return m;};

test('each bolt has the expected answer',()=>{expected.forEach((v,i)=>near(new Bolt(i).exact(),v));});
test('the right answer gives exactly the torque the bolt needs, with the angle and both hands',()=>{
 for(let i=0;i<5;i++){const m=make(i);near(m.peak(),needs[i]);assert.equal(m.loose(),true);near(m.breakTime(),2);near(m.duration(),3);}
 near(make(1).arm(),.15);near(make(3).arm(),.15);near(make(2).arm(),.8);near(make(4).peak(),2*220*.25);
 const m=make(0);near(m.torque(1),30);near(m.force(1),100);near(m.torque(5),60);
});
test('the push grows steadily, the bolt breaks loose exactly inside long steps, then turns a quarter turn and freezes',()=>{
 const m=make(0,300),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'loose');near(m.breakTime(),2*60/90);near(m.t,2*60/90+1);
 near(m.turned(m.now()),Math.PI/2);near(m.force(m.now()),300*(2*60/90)/2);near(m.torque(m.now()),60);assert.equal(m.turned(m.breakTime()),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(4,300),b=make(4,300);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
 const s=make(0,150);s.advance(100);assert.equal(s.outcome(),'stuck');near(s.t,3);near(s.torque(s.t),45);assert.equal(s.turned(s.t),0);assert.equal(s.breakTime(),null);
});
test('a torque within 0.05% counts, answers count within 2% above the least, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,199.95).loose(),true);assert.equal(make(0,199.95).evaluate().ok,true);assert.equal(make(0,199.8).loose(),false);assert.equal(make(0,199.8).evaluate().ok,false);
 assert.equal(make(0,204).evaluate().ok,true);assert.equal(make(0,204.1).evaluate().slip,'spare');
 assert.equal(make(3,30.6).evaluate().ok,true);assert.equal(make(3,30.7).evaluate().slip,'spare');assert.equal(make(3,29.99).loose(),true);assert.equal(make(3,29.9).loose(),false);
 assert.equal(make(2,.81).evaluate().ok,true);assert.equal(make(2,.79).evaluate().ok,false);
 const m=make(1,400);m.advance(10);assert.equal(m.score(),150);
 const n=make(4,200);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(220);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,18),'multiplied');assert.equal(slip(0,60),'noArm');assert.equal(slip(0,100),null);
 assert.equal(slip(1,200),'noAngle');assert.equal(slip(1,60/(.3*Math.cos(Math.PI/6))),'cosine');assert.equal(slip(1,100),'timesSin');
 assert.equal(slip(2,1.25),'inverted');assert.equal(slip(2,.55),'pipeOnly');
 assert.equal(slip(3,60),'cosine');assert.equal(slip(3,90),'square');assert.equal(make(3,90).loose(),true);
 assert.equal(slip(4,440),'oneHand');assert.equal(slip(4,27.5),'multiplied');
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Bolt(0).setAnswer(0),false);assert.equal(new Bolt(2).setAnswer(1.6),false);assert.equal(new Bolt(3).setAnswer(91),false);assert.equal(new Bolt(4).setAnswer(Infinity),false);assert.equal(new Bolt(1).setAnswer(-5),false);
 const m=new Bolt(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.equal(m.loose(),false);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,45);m.advance(.3);const n=new Bolt();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,45);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:95},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Bolt();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bolt-model'),script(source,'bolt-model'));
 return mount(html,{scripts:['bolt-model','bolt-interface'],locale:'bolt-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('bolt-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');
  assert.equal(ui.el('given-0').textContent,`τ = 60 N·m · r = ${plain(.3)} m · F = ? · φ = 90°`);
  assert.equal(ui.el('given-2').textContent,'τ = 240 N·m · r = ? · F = 300 N · φ = 90°');
  assert.equal(ui.el('given-4').textContent,`τ = 110 N·m · r = ${plain(.25)} m · F = ? · φ = 90° · 2 × F`);
  assert.equal(ui.el('torque-value').textContent,'—');assert.equal(ui.el('arm-value').textContent,'—');assert.equal(ui.el('bolt-equation').textContent,'τ = F·r·'+l.sinName+' φ');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.gaugeTitle)&&ui.painted.includes(l.gaugeHint)&&ui.painted.includes(l.boltLabel)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: the torque appears once the push starts, and the bolt breaks loose on the first try`,()=>{
  ui.input('answer',200);assert.equal(ui.el('torque-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('torque-value').textContent,fmt(3,1));assert.equal(ui.el('force-value').textContent,fmt(10,1));assert.equal(ui.el('arm-value').textContent,fmt(.3,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.pushingCopy,{tau:fmt(3,1),need:'60'}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.looseCopy,{tb:fmt(2),need:'60',peak:fmt(60,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('turn-value').textContent,fmt(90,1));
  assert.ok(ui.painted.includes(l.rightBanner+' · '+l.looseBanner)&&ui.painted.includes(l.needLabel+' 60'));
 });
 test(`${lang}: ignoring the angle leaves the bolt stuck, and the slip is explained`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'F =');ui.input('answer',200);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.stuckCopy,{peak:fmt(30,1),need:'60'})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoAngle));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.stuckBanner));
  assert.equal(ui.el('turn-value').textContent,fmt(0,1));
 });
 test(`${lang}: the cross wrench shares the torque, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',440);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.looseCopy,{tb:fmt(1),need:'110',peak:fmt(220,1)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipOneHand));
  ui.input('answer',220);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('bolt-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why4));
 });
 test(`${lang}: the bar and angle missions take a distance and an angle`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'m');
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'φ =');assert.equal(ui.el('answer-unit').textContent,'°');
  ui.input('answer',30);assert.equal(ui.el('lesson-title').textContent,fill(l.readyTitle,{p:'30°'}));
 });
}
test('changing language preserves bolt, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',60);en.click('play');en.run(()=>en.el('bolt-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipCosine));en.input('answer',30);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'30');assert.equal(es.el('bolt-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('bolt-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} stuck-bolt torque and multilingual interface checks passed.`);
