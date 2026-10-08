// Range Cannon: range R = v₀²·sin(2θ) ÷ g, complementary angles, the 45° maximum, exact landing, slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/cannon.html'),'utf8'),copy=require('./locales/cannon.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'cannon-model'),pure);const Cannon=pure.CannonModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const low=Math.asin(9.8*30/400)*90/Math.PI,expected=[400*Math.sin(Math.PI/3)/9.8,60,625/9.8,low,Math.sqrt(392)];
const make=(i,a=expected[i])=>{const m=new Cannon(i);assert.ok(m.setAnswer(a));return m;};

test('each shot has the expected answer',()=>{expected.forEach((v,i)=>near(new Cannon(i).exact(),v));near(low,23.6536,1e-5);});
test('the landing point equals v₀²·sin(2θ) ÷ g, complementary angles share it, and 45° goes farthest',()=>{
 const m=make(0);near(m.landX(),expected[0]);near(m.landTime(),2*20*.5/9.8);near(m.vy(m.topTime()),0);near(m.y(m.landTime()),0);
 near(make(1).landX(),make(0).landX());near(make(1,60).maxHeight()/make(0).maxHeight(),3);
 for(const a of [10,30,44,46,60,80])assert.ok(Cannon.rangeOf(20,a)<Cannon.rangeOf(20,45));
 const [a,b]=new Cannon(3).roots();near(a+b,90);near(make(3,a).landX(),30);near(make(3,b).landX(),30);near(make(4).landX(),40);
});
test('the top and the landing are found exactly inside long steps, then the run freezes',()=>{
 const m=make(2);const top=m.advance(m.topTime()+.01);assert.equal(top.top,true);assert.equal(top.done,false);
 const e=m.advance(9);assert.equal(e.done,true);near(e.t,m.landTime());assert.equal(m.status,'landed');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(3),b=make(3);a.advance(1e3);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('angles count within 0.5°, either root hits, and other answers count within 2%',()=>{
 assert.equal(make(3,66.3).evaluate().ok,true);assert.equal(make(3,24.1).evaluate().ok,true);assert.equal(make(3,24.3).evaluate().ok,false);
 assert.equal(make(1,60.4).evaluate().ok,true);assert.equal(make(2,64.5).evaluate().ok,true);assert.equal(make(2,66).evaluate().ok,false);
 const m=make(4);m.advance(9);assert.equal(m.score(),150);
 const n=make(4,14);n.advance(9);assert.equal(n.score(),0);n.setAnswer(19.8);n.advance(9);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, including radians and a forgotten halving',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,200/9.8),'sinTheta');assert.equal(slip(0,400*.5*Math.sqrt(3)/2/9.8),'half');assert.equal(slip(0,400/9.8),'max');
 assert.equal(slip(1,30),'same');assert.equal(slip(1,45),'fortyFive');
 assert.equal(slip(2,625/19.6),'maxHalf');assert.equal(slip(2,1250/9.8),'maxDouble');
 assert.equal(slip(3,2*low),'noHalf');assert.equal(slip(3,low*Math.PI/180),'radians');assert.equal(slip(3,(90-low)*Math.PI/180),'radians');
 assert.equal(slip(4,14),'speedHalf');assert.equal(slip(4,28),'speedTwo');assert.equal(slip(4,25),null);
});
test('answers are validated and nothing runs without one',()=>{
 assert.equal(new Cannon(3).setAnswer(90),false);assert.equal(new Cannon(1).setAnswer(0),false);assert.equal(new Cannon(4).setAnswer(61),false);assert.equal(new Cannon(0).setAnswer(-5),false);
 const m=new Cannon(4);assert.equal(m.advance(1),null);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,40);m.advance(9);m.setAnswer(low);m.advance(1);const n=new Cannon();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:95},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'landed',attempts:0}]){const k=new Cannon();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'cannon-model'),script(source,'cannon-model'));
 return mount(html,{scripts:['cannon-model','cannon-interface'],locale:'cannon-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.questionRange);assert.equal(ui.el('answer-symbol').textContent,'R =');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes(l.graphHint));
 });
 test(`${lang}: the right range on the first shot earns the bonus and draws the range curve`,()=>{
  ui.input('answer',35.35);assert.ok(ui.painted.includes(l.yourFlag));ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));
  ui.click('play');ui.run(()=>ui.el('cannon-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.landedCopy,{x:fmt(expected[0]),t:fmt(20/9.8)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.hitBanner,{x:fmt(expected[0])})));ui.painted.length=0;ui.el('show-strobe').events.change();assert.ok(!ui.painted.includes(l.graphHint)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: the same angle again is explained, and the complementary angle hits`,()=>{
  ui.click('mission-1');assert.equal(ui.el('question').textContent,l.questionOtherAngle);assert.equal(ui.el('answer-unit').textContent,'°');assert.ok(ui.painted.includes(fill(l.referenceLabel,{a:'30'})));
  ui.input('answer',30);ui.click('play');ui.run(()=>ui.el('cannon-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.includes(l.onTargetCopy));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSame));assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',60);ui.click('play');ui.run(()=>ui.el('cannon-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: a target card names its distance, and focus loss pauses without advancing time`,()=>{
  assert.equal(ui.el('given-3').textContent,'v₀ = 20 m/s · '+fill(l.targetGiven,{d:'30'}));
  ui.click('mission-4');ui.input('answer',19.8);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('cannon-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);assert.ok(ui.painted.includes(l.targetLabel));
 });
}
test('changing language preserves shot, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',40);en.click('play');en.run(()=>en.el('cannon-status-text').textContent===copy.en.done);en.input('answer',66.35);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'66.35');assert.equal(es.el('cannon-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('cannon-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} range cannon projectile-range and multilingual interface checks passed.`);
