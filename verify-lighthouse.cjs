// Lighthouse Rescue: inverse-function solutions, exact straight flights, complement detection, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/lighthouse.html'),'utf8'),copy=require('./locales/lighthouse.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'lighthouse-model'),pure);const Lighthouse=pure.LighthouseModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const deg=Math.PI/180,exact=[Math.atan(45/120)/deg,Math.asin(.25)/deg,Math.acos(.9)/deg,Math.atan(.24)/deg,35/Math.tan(8*deg),40*Math.tan(70*deg)];
const make=(i,answer=exact[i])=>{const m=new Lighthouse(i);m.setAnswer(answer);return m;};

test('each mission solves its triangle with the right inverse function',()=>{
 exact.forEach((value,i)=>near(new Lighthouse(i).exact(),value));
 near(new Lighthouse(1).tri.D,Math.sqrt(200**2-50**2));near(new Lighthouse(2).tri.H,Math.sqrt(200**2-180**2));
 for(const i of exact.keys()){const t=new Lighthouse(i).tri;near(Math.tan(t.angle*deg),t.H/t.D);near(t.r,Math.hypot(t.H,t.D));}
});
test('the exact answer flies the drone exactly onto the target',()=>{
 for(const i of exact.keys()){const m=make(i);m.advance(1e4);const e=m.evaluate();near(e.miss,0,1e-9);assert.ok(e.hit&&e.precise,'mission '+i);}
 const lamp=make(0);lamp.advance(1e4);near(lamp.position().x,120);near(lamp.position().y,0,1e-12);
 const ship=make(3);ship.advance(1e4);near(ship.position().x,0,1e-12);near(ship.position().y,60);
});
test('the drone keeps a constant speed of 10 m/s split into v cos α and v sin α',()=>{
 const m=make(0,30);m.advance(2);const v=m.velocity();near(Math.hypot(v.x,v.y),10);near(v.x,10*Math.cos(30*deg));near(v.y,-5);near(m.flown(),20);near(m.position().y,35);
 const up=make(3,45);up.advance(1);assert.ok(up.velocity().x<0&&up.velocity().y>0);
});
test('arrival is solved exactly inside a long step, then the state freezes',()=>{
 const m=make(0,30);const T=m.flightTime();near(T,9);assert.equal(m.advance(8.9),null);const e=m.advance(5);near(e.t,9);assert.equal(m.status,'done');near(m.position().x,45/Math.tan(30*deg));
 near(m.velocity().x,0);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(3),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(4,200),b=make(4,200);a.advance(1e4);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('misses report direction: too steep, too shallow, too far, too close',()=>{
 const miss=(i,a)=>{const m=make(i,a);m.advance(1e4);return m.evaluate().miss;};
 assert.ok(miss(0,25)<-5);assert.ok(miss(0,17)>5);assert.ok(miss(3,16)>5);assert.ok(miss(3,11)<-5);assert.ok(miss(4,260)>5);assert.ok(miss(4,240)<-5);
});
test('a hit is within 5 m, precision is within 1%, and both are scored',()=>{
 const score=(i,a)=>{const m=make(i,a);m.advance(1e4);return m.score();};
 assert.equal(score(0,20.56),150);assert.equal(score(0,21),100);assert.equal(score(0,23),0);assert.equal(score(4,249),150);assert.equal(score(4,253),100);assert.equal(score(5,110),150);
 assert.equal(make(0).score(),0);
});
test('complementary angles and inverted ratios are recognized as mix-ups',()=>{
 const trap=[90-exact[0],90-exact[1],90-exact[2],90-exact[3],35*Math.tan(8*deg),40/Math.tan(70*deg)];
 trap.forEach((value,i)=>{const e=make(i,Number(value.toFixed(2))).evaluate();assert.ok(e.trap&&!e.hit,'mission '+i);});
 assert.ok(!make(0,30).evaluate().trap);
});
test('without an answer nothing flies, and an unknown ship stays out of the scene',()=>{
 const m=new Lighthouse(4);near(m.path().end.x,exact[4]);assert.equal(m.ship(),null);assert.equal(new Lighthouse(0).path(),null);assert.equal(m.advance(5),null);assert.equal(m.t,0);
 assert.equal(new Lighthouse(0).ship(),120);
});
test('answers outside the valid range are rejected, and edits restart the flight',()=>{
 const m=make(0,20);m.advance(3);for(const bad of [0,-5,90,95,NaN])assert.equal(m.setAnswer(bad),false);assert.equal(m.answer,20);assert.equal(m.t,3);
 const d=make(4,100);assert.equal(d.setAnswer(2000),false);assert.equal(d.setAnswer(1999),true);m.setAnswer(21);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,14);m.advance(4);const n=new Lighthouse();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);near(n.t,4);assert.equal(n.answer,14);
 const s=m.snapshot();for(const bad of [{...s,index:7},{...s,answer:120},{...s,t:1e6},{...s,status:'lost'},{...s,answer:null}]){const k=new Lighthouse();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'lighthouse-model'),script(source,'lighthouse-model'));
 return mount(html,{scripts:['lighthouse-model','lighthouse-interface'],locale:'lighthouse-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, localized givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.aimTitle);assert.equal(ui.el('drone-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('given-4').textContent.replace(/ /g,' '),'H = 35 m · α = 8°');assert.equal(ui.el('answer-symbol').textContent,'α =');assert.equal(ui.el('answer-label').textContent,l.answerAngle);
  assert.ok(ui.painted.includes(l.lighthouse)&&ui.painted.includes(l.ship)&&ui.painted.includes(l.opposite+' · H')&&ui.painted.includes(l.adjacent+' · D'));
 });
 test(`${lang}: the right angle of depression delivers the rescue`,()=>{
  ui.input('answer',20.56);assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{s}','α').replace('{value}',fmt(20.56)+'°'));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.4));assert.equal(ui.el('drone-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('drone-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.hitTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why0));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('hit-badge').classList.has('earned')&&ui.el('precise-badge').classList.has('earned'));assert.equal(ui.el('angle-value').textContent,fmt(20.56)+'°');
  assert.ok(ui.painted.includes(l.hitBanner));
 });
 test(`${lang}: the complement and a distance miss give different feedback`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'β =');assert.equal(ui.el('mission-copy').textContent,l.goalShip);assert.equal(ui.el('angle-label').textContent,l.angleUp);
  ui.input('answer',76.5);ui.click('play');ui.run(()=>ui.el('drone-status-text').textContent===l.done,{limit:800});
  assert.equal(ui.el('lesson-title').textContent,l.trapTitle);assert.equal(ui.el('lesson-copy').textContent,l.trap3);assert.equal(ui.el('mission-score').textContent,'0');
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'m');assert.equal(ui.el('answer-label').textContent,l.answerDistance);assert.ok(ui.painted.includes('D = ?'));
  ui.input('answer',230);ui.click('play');ui.run(()=>ui.el('drone-status-text').textContent===l.done);
  const miss=fmt(35/Math.tan(8*deg)-230,1);assert.equal(ui.el('lesson-title').textContent,l.missTitle.replace('{miss}',miss));
  assert.equal(ui.el('lesson-copy').textContent,l.missNear.replace('{miss}',miss)+' '+l.hint4);assert.ok(ui.el('insight').classList.has('warning'));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('drone-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves mission, answer, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-5');en.input('answer',110);en.click('step');
 en.links.find(l=>l.lang==='de').events.click();assert.equal(storage.size,1);
 const de=open('de',storage);assert.equal(storage.size,0);
 assert.equal(de.el('mission-5').attributes['aria-pressed'],'true');assert.equal(de.el('answer').value,'110');assert.equal(de.el('answer-symbol').textContent,'D =');
 assert.equal(de.el('time-value').textContent,(.4).toLocaleString('de',{minimumFractionDigits:2}));assert.equal(de.el('drone-status-text').textContent,copy.de.paused);
});
console.log(`\n${checks} lighthouse rescue trigonometry and multilingual interface checks passed.`);
