// Forklift: moments about the front wheels (the tipping edge), the rear wheels' push, a counterweight, a capacity plate,
// exact tipping, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/forklift.html'),'utf8'),copy=require('./locales/forklift.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'forklift-model'),pure);const Forklift=pure.ForkliftModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,truck=g*3000*.8,expected=[2000,1.6,400,7350,3000];
const make=(i,a=expected[i])=>{const m=new Forklift(i);assert.ok(m.setAnswer(a));return m;};

test('each load has the expected answer',()=>{expected.forEach((v,i)=>near(new Forklift(i).exact(),v));});
test('at the limit the load moment equals the truck moment about the front wheels, and the rear wheels carry nothing',()=>{
 for(const i of [0,1,2,4]){const m=make(i);near(m.fullLoadMoment(),m.truckMoment());assert.equal(m.tips(),false);near(m.rear(m.duration()),0,1e-9);near(m.duration(),3);}
 near(make(2).truckMoment(),g*(2400+400*1.5));const r=make(3);near(r.rear(r.duration()),7350);near(r.rear(0),truck/1.6);near(r.front(r.duration())+r.rear(r.duration()),g*(3000+1200));
 near(make(0).loadMoment(1),truck/2);near(make(0).rear(1),truck/2/1.6);
});
test('an overloaded truck tips exactly when the rear wheels unload, inside long steps, then freezes',()=>{
 const m=make(0,3000),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'tip');near(m.tipTime(),2*truck/(g*3000*1.2));near(m.t,m.tipTime()+.8);
 near(m.rear(m.tipTime()),0,1e-9);near(m.rear(m.now()),0,1e-9);near(m.loadMoment(m.now()),truck);near(m.tilt(m.now()),6*Math.PI/180);assert.equal(m.tilt(m.tipTime()),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1,2.5),b=make(1,2.5);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.outcome(),'tip');
 const h=make(3);h.advance(100);assert.equal(h.outcome(),'hold');near(h.t,3);assert.equal(h.tipTime(),null);
});
test('a load within 0.05% of the limit holds, answers count within 2%, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,2000.9).tips(),false);assert.equal(make(0,2000.9).evaluate().ok,true);assert.equal(make(0,2002).tips(),true);assert.equal(make(0,2002).evaluate().ok,false);
 assert.equal(make(0,1960).evaluate().ok,true);assert.equal(make(0,1959).evaluate().slip,'light');assert.equal(make(1,1.57).evaluate().ok,true);assert.equal(make(1,1.56).evaluate().slip,'short');
 assert.equal(make(2,399.9).tips(),false);assert.equal(make(2,399.9).evaluate().ok,true);assert.equal(make(2,408).evaluate().ok,true);assert.equal(make(2,409).evaluate().slip,'spare');assert.equal(make(2,398).tips(),true);
 assert.equal(make(3,7497).evaluate().ok,true);assert.equal(make(3,7500).evaluate().ok,false);
 const m=make(4,3000);m.advance(10);assert.equal(m.score(),150);
 const n=make(0,3000);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(2000);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,3000),'sameMass');assert.equal(slip(0,4500),'inverted');assert.equal(slip(0,2400),'noDistance');assert.equal(slip(0,2500),null);
 assert.equal(slip(1,.625),'inverted');assert.equal(slip(1,.8),'sameArm');
 assert.equal(slip(2,2000),'noTruck');assert.equal(slip(2,500),'loadArm');assert.equal(slip(2,900),'multiplied');
 assert.equal(slip(3,14700),'noLoad');assert.equal(slip(3,22050),'loadAdds');assert.equal(slip(3,17640),'weights');assert.equal(slip(3,5000),null);
 assert.equal(slip(4,4000/3),'inverted');assert.equal(slip(4,2000),'plateSame');
});
test('answers are validated and nothing moves without one',()=>{
 assert.equal(new Forklift(0).setAnswer(0),false);assert.equal(new Forklift(1).setAnswer(3.1),false);assert.equal(new Forklift(2).setAnswer(-1),false);assert.equal(new Forklift(3).setAnswer(Infinity),false);
 const m=new Forklift(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.equal(m.tips(),false);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,300);m.advance(.3);const n=new Forklift();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,300);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Forklift();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'forklift-model'),script(source,'forklift-model'));
 return mount(html,{scripts:['forklift-model','forklift-interface'],locale:'forklift-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('forklift-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'m =');
  assert.equal(ui.el('given-0').textContent,`m = ? · x = ${plain(1.2)} m`);
  assert.equal(ui.el('given-2').textContent,`m = 2500 kg · x = ${plain(1.2)} m · m_c = ?, x = −${plain(1.5)} m`);
  assert.equal(ui.el('given-4').textContent,`2000 kg · ${plain(1.2)} m → m = ? · x = ${plain(.8)} m`);
  assert.equal(ui.el('rear-value').textContent,'—');assert.equal(ui.el('load-moment-value').textContent,'—');assert.equal(ui.el('forklift-equation').textContent,'m·g·x ≤ M·g·b');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.momentTitle)&&ui.painted.includes(l.momentHint)&&ui.painted.includes(l.edgeLabel)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: moments appear once the forks lift, and the heaviest pallet holds on the first try`,()=>{
  ui.input('answer',2000);assert.equal(ui.el('rear-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('load-moment-value').textContent,fmt(1176,0));assert.equal(ui.el('rear-value').textContent,fmt(13965,0));assert.equal(ui.el('load-value').textContent,fmt(980,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.liftingCopy,{ml:fmt(1176,0),mt:fmt(23520,0),rear:fmt(13965,0)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{ml:fmt(23520,0),mt:fmt(23520,0),rear:fmt(0,0)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.holdBanner)&&ui.painted.includes(l.truckShort)&&ui.painted.includes(l.loadShort));
 });
 test(`${lang}: lifting the truck's own mass tips it, and the slip is explained`,()=>{
  ui.input('answer',3000);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.tipCopy,{tt:fmt(2*23520/35280),mt:fmt(23520,0)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSameMass));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.tipBanner));
  assert.equal(ui.el('rear-value').textContent,fmt(0,0));
 });
 test(`${lang}: a counterweight that ignores the truck holds with room to spare`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'m_c =');ui.input('answer',2000);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.holdCopy,{ml:fmt(29400,0),mt:fmt(52920,0),rear:fmt(14700,0)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoTruck));
 });
 test(`${lang}: the rear-wheel prediction, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'R_r =');assert.equal(ui.el('answer-unit').textContent,'N');
  ui.input('answer',7350);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('forklift-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{ml:fmt(11760,0),mt:fmt(23520,0),rear:fmt(7350,0)})+' '+l.why3);
 });
}
test('changing language preserves load, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',2000);en.click('play');en.run(()=>en.el('forklift-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipPlateSame));en.input('answer',3000);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3000');assert.equal(es.el('forklift-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('forklift-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} forklift tipping-moment and multilingual interface checks passed.`);
