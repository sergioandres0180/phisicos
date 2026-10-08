// Loading Ramp: right-triangle solutions, exact arrival events, mix-up detection, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ramp.html'),'utf8'),copy=require('./locales/ramp.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ramp-model'),pure);const Ramp=pure.RampModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const deg=Math.PI/180,exact=[2,3*Math.cos(25*deg),1.2/Math.sin(20*deg),3.5*Math.tan(15*deg),2.5,2.5];
const make=(i,answer=exact[i],ratio=Ramp.missions[i].ratio)=>{const m=new Ramp(i);m.setAnswer(answer);if(ratio)m.setRatio(ratio);return m;};

test('each mission solves its right triangle from the two givens',()=>{
 exact.forEach((value,i)=>near(new Ramp(i).exact(),value));
 const corner=new Ramp(4).tri;near(corner.theta,30);near(corner.d,5*Math.sin(60*deg));
 const p=new Ramp(5).tri;near(p.h,1.5);near(p.d,2);near(Math.sin(p.rad),.6);
 for(const [i] of exact.entries()){const t=new Ramp(i).tri;near(t.h**2+t.d**2,t.L**2);assert.ok(t.L>t.h&&t.L>t.d,'hypotenuse is the longest side');}
});
test('the exact answer makes the ramp end exactly at the platform edge',()=>{
 for(const i of exact.keys()){const g=make(i).geometry();near(g.gap.x,0,1e-12);near(g.gap.y,0,1e-12);}
 const low=make(0,1.8).geometry();near(low.gap.y,-.2);near(low.gap.x,0,1e-12);
 const long=make(5,3).geometry();near(Math.hypot(long.gap.x,long.gap.y),.5);
});
test('the box climbs along the ramp with velocity components v cos θ and v sin θ',()=>{
 const m=make(0);m.advance(2);const p=m.position(),v=m.velocity();
 near(m.along(),1);near(p.x,Math.cos(30*deg));near(p.y,.5);near(v.x,.5*Math.cos(30*deg));near(v.y,.25);near(Math.hypot(v.x,v.y),Ramp.speed);
});
test('the top is reached exactly inside a long step, then the state freezes',()=>{
 const m=make(0);assert.equal(m.advance(7.9),null);const e=m.advance(5);near(e.t,8);near(m.along(),4);near(m.position().y,2);assert.equal(m.status,'top');
 near(m.velocity().x,0);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(3),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('arrival is independent of timestep partitioning',()=>{const a=make(2,3.3),b=make(2,3.3);a.advance(1e3);while(b.status!=='top')b.advance(1/120);near(a.t,b.t,1e-12);near(a.t,6.6);});
test('without an answer the box does not move and the unknown is not revealed',()=>{
 const m=new Ramp(0);assert.equal(m.advance(5),null);assert.equal(m.t,0);
 assert.equal(m.geometry().platform.y,0);assert.equal(new Ramp(1).geometry().platform.x,3.5);assert.equal(new Ramp(5).geometry().length,1);
});
test('a fit is within 1%, and the right relation earns its own points',()=>{
 const score=(i,a,r)=>{const m=make(i,a,r);m.advance(1e3);return m.score();};
 assert.equal(score(0,2,'sin'),150);assert.equal(score(0,2.019,'sin'),150);assert.equal(score(0,2.03,'sin'),50);
 assert.equal(score(1,2.72,'sin'),100);assert.equal(score(3,.94,'tan'),150);assert.equal(score(5,2.5,'pythagoras'),150);assert.equal(score(4,2.5,'sin'),100);
 assert.equal(make(0).score(),0);
});
test('classic mix-ups are recognized instead of reported as plain misses',()=>{
 const trap=[4*Math.cos(30*deg),3*Math.sin(25*deg),1.2*Math.sin(20*deg),3.5*Math.sin(15*deg),5*Math.sin(60*deg),3.5];
 trap.forEach((value,i)=>{const e=make(i,Number(value.toFixed(2))).evaluate();assert.ok(e.trap&&!e.fit,'mission '+i);});
 const e=make(0,1.5).evaluate();assert.ok(!e.trap&&!e.fit&&!e.high);near(e.miss,.5);
});
test('answers outside (0, 20] m are rejected, and edits restart the climb',()=>{
 const m=make(0);m.advance(3);for(const bad of [0,-1,21,NaN,Infinity])assert.equal(m.setAnswer(bad),false);assert.equal(m.answer,2);assert.equal(m.t,3);
 assert.equal(m.setRatio('sec'),false);m.setRatio('cos');assert.equal(m.t,0);m.advance(1);m.setAnswer(2.1);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,.9,'tan');m.advance(1);const n=new Ramp();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);near(n.t,1);assert.equal(n.answer,.9);assert.equal(n.ratio,'tan');
 const s=m.snapshot();for(const bad of [{...s,index:9},{...s,answer:-2},{...s,ratio:'sec'},{...s,t:1e6},{...s,status:'flying'},{...s,answer:null}]){const k=new Ramp();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ramp-model'),script(source,'ramp-model'));
 return mount(html,{scripts:['ramp-model','ramp-interface'],locale:'ramp-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, localized givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.solveTitle);assert.equal(ui.el('ramp-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('given-2').textContent.replace(/ /g,' '),'h = '+(1.2).toLocaleString(lang)+' m · θ = 20°');
  assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('mission-copy').textContent,l.goalH);
  assert.ok(ui.painted.includes(l.platform)&&ui.painted.includes(l.hypotenuse+' · L')&&ui.painted.includes(l.opposite+' · h'));
 });
 test(`${lang}: the right side and relation deliver the box`,()=>{
  ui.click('ratio-sin');ui.input('answer',2);assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{s}','h').replace('{value}',fmt(2)));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.2));assert.equal(ui.el('ramp-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('ramp-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.deliveredTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why0));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('fit-badge').classList.has('earned')&&ui.el('ratio-badge').classList.has('earned'));assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('height-value').textContent,fmt(2));assert.ok(ui.painted.includes(l.deliveredBanner));
 });
 test(`${lang}: a mix-up and a plain miss give different feedback`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer').value,'');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('mission-copy').textContent,l.goalL);
  ui.input('answer',.41);ui.click('play');ui.run(()=>ui.el('ramp-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.trapTitle);assert.equal(ui.el('lesson-copy').textContent,l.trap2);assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('answer',3);ui.click('play');ui.run(()=>ui.el('ramp-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle.replace('{miss}',fmt(1.2/Math.sin(20*deg)-3)));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.hint2));
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.some(s=>String(s).startsWith(l.gapBanner.split('{')[0])));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('ramp-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves mission, relation, answer, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.click('ratio-tan');en.input('answer',.94);en.click('step');
 en.links.find(l=>l.lang==='fi').events.click();assert.equal(storage.size,1);
 const fi=open('fi',storage);assert.equal(storage.size,0);
 assert.equal(fi.el('mission-3').attributes['aria-pressed'],'true');assert.equal(fi.el('ratio-tan').attributes['aria-pressed'],'true');assert.equal(fi.el('answer').value,'0.94');
 assert.equal(fi.el('time-value').textContent,(.2).toLocaleString('fi',{minimumFractionDigits:2}));assert.equal(fi.el('ramp-status-text').textContent,copy.fi.paused);
});
console.log(`\n${checks} loading ramp trigonometry and multilingual interface checks passed.`);
