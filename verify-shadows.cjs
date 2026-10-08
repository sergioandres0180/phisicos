// Two Shadows: an angled launch split into a uniform floor shadow and a vertical-throw wall shadow, with exact top and
// landing, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/shadows.html'),'utf8'),copy=require('./locales/shadows.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'shadows-model'),pure);const Throw=pure.ShadowsModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const r3=Math.sqrt(3),expected=[10*r3,10*r3/9.8,300/19.6,10,400/9.8];
const make=(i,a=expected[i])=>{const m=new Throw(i);assert.ok(m.setAnswer(a));return m;};

test('each throw has the expected answer',()=>{expected.forEach((v,i)=>near(new Throw(i).exact(),v));});
test('the floor shadow moves uniformly and the wall shadow is a vertical throw',()=>{
 const m=make(1),T=m.landTime();near(T,2*10*r3/9.8);
 near(m.x(1)-m.x(0),m.x(2)-m.x(1));near(m.x(T),10*T);near(m.vy(m.topTime()),0);near(m.y(m.topTime()),m.maxHeight());
 near(m.y(.5),m.y(T-.5));near(m.vy(.5),-m.vy(T-.5));near(m.y(T),0);near(m.vy(T),-10*r3);
 // At 45° the two components are equal.
 const d=make(4);near(d.vx0(),d.vy0());near(d.x(d.landTime()),400/9.8);
});
test('the top and the landing are found exactly inside long steps, then the run freezes',()=>{
 const m=make(2);const top=m.advance(2);assert.equal(top.top,true);assert.equal(top.done,false);
 const e=m.advance(5);assert.equal(e.done,true);near(e.t,m.landTime());assert.equal(m.status,'landed');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(4),b=make(4);a.advance(1e3);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a right answer within 2% earns 100, plus 50 only on the first throw',()=>{
 const m=make(3);m.advance(9);assert.equal(m.score(),150);
 const n=make(3,0);n.advance(9);assert.equal(n.score(),0);n.setAnswer(10.1);n.advance(9);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, including zero speed at the top',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,10),'sinCos');assert.equal(slip(0,20),'useV0');
 assert.equal(slip(1,20/9.8),'useV0');assert.equal(slip(1,20*r3/9.8),'whole');assert.equal(slip(1,10/9.8),'sinCos');
 assert.equal(slip(2,400/19.6),'useV0');assert.equal(slip(2,100/19.6),'sinCos');assert.equal(slip(2,300/9.8),'noHalf');
 assert.equal(slip(3,0),'zeroTop');assert.equal(slip(3,20),'useV0');assert.equal(slip(3,10*r3),'vyOnly');
 assert.equal(slip(4,200/9.8),'half');assert.equal(slip(4,20*2*Math.SQRT2*10/9.8),'useV0');assert.equal(slip(4,30),null);
});
test('answers are validated and nothing runs without one',()=>{
 assert.equal(new Throw(0).setAnswer(0),false);assert.equal(new Throw(3).setAnswer(0),true);assert.equal(new Throw(4).setAnswer(-1),false);assert.equal(new Throw(2).setAnswer(201),false);
 const m=new Throw(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,30);m.advance(9);m.setAnswer(40.8);m.advance(1);const n=new Throw();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'landed',attempts:0}]){const k=new Throw();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'shadows-model'),script(source,'shadows-model'));
 return mount(html,{scripts:['shadows-model','shadows-interface'],locale:'shadows-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.questionVx);assert.equal(ui.el('answer-symbol').textContent,'vₓ =');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.axisY)&&ui.painted.includes(l.floorLabel));
 });
 test(`${lang}: vₓ stays hidden until landing, and the right answer earns the bonus`,()=>{
  ui.input('answer',17.32);assert.equal(ui.el('vx-value').textContent,'—');ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('vx-value').textContent,'—');
  ui.click('play');ui.run(()=>ui.el('shadows-status-text').textContent===l.done);assert.equal(ui.el('vx-value').textContent,'+'+fmt(10*r3));
  const T=20/9.8;
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.flightCopy,{x:fmt(10*r3*T),t:fmt(T),h:fmt(100/19.6),top:fmt(T/2)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.landedBanner,{x:fmt(10*r3*T),t:fmt(T)})));assert.ok(ui.painted.includes(l.topLabel));
 });
 test(`${lang}: zero speed at the top is explained, and the height prediction is drawn`,()=>{
  ui.click('mission-3');assert.equal(ui.el('question').textContent,l.questionTopSpeed);
  ui.input('answer',0);ui.click('play');ui.run(()=>ui.el('shadows-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipZeroTop));assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',10);ui.click('play');ui.run(()=>ui.el('shadows-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');
  ui.click('mission-2');ui.input('answer',15);assert.ok(ui.painted.includes(fill(l.predictedHeight,{p:fmt(15)})));assert.equal(ui.el('answer-symbol').textContent,'y_max =');
 });
 test(`${lang}: the localized sine is used, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-1');ui.input('answer',1.77);ui.click('play');ui.run(()=>false,{limit:3});assert.ok(ui.el('shadows-equation').textContent.includes(l.sinName+' 60°'));
  ui.windowEvents.get('blur')();assert.equal(ui.el('shadows-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves throw, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',30);en.click('play');en.run(()=>en.el('shadows-status-text').textContent===copy.en.done);en.input('answer',40.8);en.click('step');
 en.links.find(l=>l.lang==='fi').events.click();assert.equal(storage.size,1);
 const fi=open('fi',storage);assert.equal(storage.size,0);
 assert.equal(fi.el('mission-4').attributes['aria-pressed'],'true');assert.equal(fi.el('answer').value,'40.8');assert.equal(fi.el('shadows-status-text').textContent,copy.fi.paused);
 fi.click('play');fi.run(()=>fi.el('shadows-status-text').textContent===copy.fi.done);assert.equal(fi.el('mission-score').textContent,'100');
});
console.log(`\n${checks} two shadows projectile-component and multilingual interface checks passed.`);
