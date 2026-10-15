// Lever Lab: the law of the lever (F·d_e = W·d_l) in all three classes, mechanical advantage, placing the fulcrum, exact
// lifting, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/lever.html'),'utf8'),copy=require('./locales/lever.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'lever-model'),pure);const Lever=pure.LeverModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[200,40,428.75,.3,1.5],ma=[6,5,.04/.35,4,6];
const make=(i,a=expected[i])=>{const m=new Lever(i);assert.ok(m.setAnswer(a));return m;};

test('each lever has the expected answer',()=>{expected.forEach((v,i)=>near(new Lever(i).exact(),v));});
test('the right answer balances F·d_e against W·d_l, and the mechanical advantage is d_e ÷ d_l',()=>{
 for(let i=0;i<5;i++){const m=make(i);near(m.peak(),m.need());assert.equal(m.lifts(),true);near(m.liftTime(),2);near(m.duration(),3);near(m.ma(),ma[i]);near(m.ma(),m.config.W/m.F());}
 near(make(3).de(),1.2);near(make(3).dl(),.3);near(make(0).moment(1),120);near(make(0).effort(1),100);
});
test('the load lifts exactly when the moments match, inside long steps; the hand moves MA times as far as the load',()=>{
 const m=make(0,300),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'lift');near(m.liftTime(),2*240/360);near(m.t,2*240/360+1);
 near(m.angle(m.now()),8*Math.PI/180);near(m.travel(m.now())/m.rise(m.now()),6);near(m.moment(m.now()),240);assert.equal(m.angle(m.liftTime()),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2,600),b=make(2,600);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
 const s=make(0,150);s.advance(100);assert.equal(s.outcome(),'stuck');near(s.t,3);near(s.angle(s.t),0);assert.equal(s.liftTime(),null);
});
test('within 0.05% counts, answers count within 2% of the limit, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,199.95).lifts(),true);assert.equal(make(0,199.95).evaluate().ok,true);assert.equal(make(0,199.8).lifts(),false);
 assert.equal(make(0,204).evaluate().ok,true);assert.equal(make(0,205).evaluate().slip,'spare');
 assert.equal(make(3,.296).evaluate().ok,true);assert.equal(make(3,.25).evaluate().slip,'spare');assert.equal(make(3,.31).lifts(),false);
 assert.equal(make(4,1.53).evaluate().ok,true);assert.equal(make(4,1.48).lifts(),false);
 const m=make(1);m.advance(10);assert.equal(m.score(),150);
 const n=make(2,49);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(428.75);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1200),'fullLoad');assert.equal(slip(0,7200),'inverted');assert.equal(slip(0,100),null);
 assert.equal(slip(1,200),'fullLoad');assert.equal(slip(1,50),'gap');assert.equal(slip(1,1000),'inverted');
 assert.equal(slip(2,49),'fullLoad');assert.equal(slip(2,5.6),'invertedThird');
 assert.equal(slip(3,.75),'middle');assert.equal(slip(3,1.2),'invertedFulcrum');
 assert.equal(slip(4,400*.25/2400),'inverted');assert.equal(slip(4,1.75),'wholeBar');
});
test('answers are validated and nothing moves without one',()=>{
 assert.equal(new Lever(0).setAnswer(0),false);assert.equal(new Lever(0).setAnswer(-1),false);assert.equal(new Lever(3).setAnswer(1.5),false);assert.equal(new Lever(4).setAnswer(3.1),false);assert.equal(new Lever(1).setAnswer(Infinity),false);
 const m=new Lever(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,150);m.advance(.3);const n=new Lever();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,150);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Lever();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'lever-model'),script(source,'lever-model'));
 return mount(html,{scripts:['lever-model','lever-interface'],locale:'lever-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('lever-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');
  assert.equal(ui.el('given-0').textContent,`#1 · W = 1200 N · d_l = ${plain(.2)} m · F = ? · d_e = ${plain(1.2)} m`);
  assert.equal(ui.el('given-3').textContent,`#1 · W = 1200 N · d_l = ? · F = 300 N · d_e = ? · L = ${plain(1.5)} m`);
  assert.equal(ui.el('moment-value').textContent,'—');assert.equal(ui.el('ma-value').textContent,'—');assert.equal(ui.el('effort-value').textContent,'—');assert.equal(ui.el('lever-equation').textContent,'F·d_e = W·d_l');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.class1)&&ui.painted.includes(l.fulcrumLabel)&&ui.painted.includes(l.gaugeTitle)&&ui.painted.includes(l.gaugeHint)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: the moment appears once the push starts, and the crowbar lifts on the first try`,()=>{
  ui.input('answer',200);assert.equal(ui.el('moment-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('effort-value').textContent,fmt(10,1));assert.equal(ui.el('moment-value').textContent,fmt(12,1));assert.equal(ui.el('ma-value').textContent,fmt(6));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.pushingCopy,{m:fmt(12,1),need:fmt(240,1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.liftCopy,{tl:fmt(2),need:fmt(240,1),peak:fmt(240,1),ma:fmt(6)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('rise-value').textContent,fmt(20*Math.sin(8*Math.PI/180),1));
  assert.ok(ui.painted.includes(l.rightBanner+' · '+l.liftBanner));
 });
 test(`${lang}: holding the dumbbell with only its weight leaves it down, and the slip is explained`,()=>{
  ui.click('mission-2');ui.input('answer',49);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.stuckCopy,{peak:fmt(1.96,1),need:fmt(17.15,1)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipFullLoad));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.stuckBanner)&&ui.painted.includes(l.class3));
 });
 test(`${lang}: placing the fulcrum, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'d_l =');assert.equal(ui.el('answer-unit').textContent,'m');
  ui.input('answer',.75);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipMiddle));
  ui.input('answer',.3);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('lever-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why3));
 });
}
test('changing language preserves lever, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',50);en.click('play');en.run(()=>en.el('lever-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipGap));en.input('answer',40);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'40');assert.equal(es.el('lever-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('lever-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} lever-lab law-of-the-lever and multilingual interface checks passed.`);
