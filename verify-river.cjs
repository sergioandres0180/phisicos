// River Crossing: velocity addition, exact landing events, mission goals, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/river.html'),'utf8'),copy=require('./locales/river.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'river-model'),pure);const River=pure.RiverModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const make=(i,heading=0)=>{const m=new River(i);m.setHeading(heading);return m;};

test('ground velocity is the vector sum of boat and current velocities',()=>{
 const m=make(1,Math.asin(.6)*180/Math.PI),v=m.velocities();near(v.ground.x,v.boat.x+v.water.x);near(v.ground.y,v.boat.y);near(v.ground.x,0,1e-12);near(v.ground.y,2);near(Math.hypot(v.boat.x,v.boat.y),2.5);
});
test('aiming straight across drifts downstream by u × W ÷ s',()=>{const m=make(0);near(m.crossingTime(),30);near(m.landingX(),15);});
test('each mission has a slider-reachable heading that meets its goal',()=>{
 for(const [i,heading] of [[0,14.5],[1,37],[2,0],[3,53]]){const m=make(i,heading);m.advance(1e6);assert.ok(m.evaluate().goal,`mission ${i} at ${heading}°: x = ${m.landingX()}`);}
 assert.ok(!make(0,0).evaluate().goal);assert.ok(!make(2,5).evaluate().goal);
});
test('least drift formula matches a brute-force search over headings',()=>{
 let best=Infinity;for(let h=-75;h<=75;h+=.01)best=Math.min(best,make(3,h).landingX());near(River.missions[3].width*Math.sqrt(2.5**2-4)/2,45);near(best,45,1e-4);near(new River(3).leastDrift(),45);
});
test('the fastest crossing points straight across',()=>{const straight=make(2,0);near(straight.crossingTime(),straight.bestTime());for(const h of [-30,10,40])assert.ok(make(2,h).crossingTime()>straight.crossingTime());});
test('the far bank is reached exactly inside a long step, then the state freezes',()=>{
 const m=make(0);assert.equal(m.advance(29.9),null);const e=m.advance(10);near(e.t,30);near(m.position().y,60);near(m.position().x,15);assert.equal(m.status,'landed');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(3),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('landing is independent of timestep partitioning',()=>{const a=make(1,20),b=make(1,20);a.advance(1e3);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);near(a.landingX(),b.landingX());});
test('score rewards the goal and a prediction within 3 m',()=>{
 const m=make(0,14.5);m.setPrediction(2);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(0,0);n.setPrediction(10);n.advance(1e3);assert.equal(n.score(),0);n.reset();n.setPrediction(15);n.advance(1e3);assert.equal(n.score(),50);
 assert.equal(make(0,14.5).score(),0);
});
test('headings outside ±75° are rejected, and edits restart the crossing',()=>{const m=make(0,10);m.advance(5);assert.equal(m.setHeading(80),false);assert.equal(m.heading,10);assert.equal(m.t,5);m.setPrediction(3);assert.equal(m.t,0);});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,40);m.setPrediction(50);m.advance(12);const n=new River();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);near(n.t,12);assert.equal(n.prediction,50);
 for(const bad of [{...m.snapshot(),index:9},{...m.snapshot(),heading:90},{...m.snapshot(),t:1e6},{...m.snapshot(),prediction:'x'},{...m.snapshot(),status:'sunk'}]){const k=new River();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'river-model'),script(source,'river-model'));
 return mount(html,{scripts:['river-model','river-interface'],locale:'river-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const signed=(n,d)=>(n>.5*10**-d?'+':'')+fmt(n,d);
 const ui=open(lang);
 test(`${lang}: initial state, localized givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('river-status-text').textContent,l.ready);
  assert.equal(ui.el('heading-value').textContent,l.headingStraight);assert.equal(ui.el('predict-value').textContent,'—');
  assert.equal(ui.el('given-1').textContent.replace(/\u00a0/g,' '),'W = 80 m · u = '+(1.5).toLocaleString(lang)+' m/s · s = '+(2.5).toLocaleString(lang)+' m/s');
  assert.equal(ui.el('velocity-value').textContent,lang==='en'?'(+0.50, +2.00)':`(${signed(.5,2)}; ${signed(2,2)})`);
  assert.ok(ui.painted.includes(l.farBank)&&ui.painted.includes(l.dock));
 });
 test(`${lang}: aiming upstream lands on the dock and confirms the prediction`,()=>{
  ui.input('heading',14.5);assert.equal(ui.el('heading-value').textContent,l.headingUpstream.replace('{a}',fmt(14.5,1)));
  ui.input('predict',0);assert.equal(ui.el('lesson-title').textContent.startsWith(l.readyTitle.split('{')[0]),true);
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.5));assert.equal(ui.el('river-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('river-status-text').textContent===l.landed);
  assert.equal(ui.el('lesson-title').textContent,l.dockGoodTitle);assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('goal-badge').classList.has('earned')&&ui.el('predict-badge').classList.has('earned'));assert.equal(ui.el('play').disabled,true);
  assert.ok(ui.painted.some(s=>String(s).startsWith(l.landingBanner.split('{')[0])));
 });
 test(`${lang}: an angled heading is not the fastest crossing`,()=>{
  ui.click('mission-2');assert.equal(ui.el('mission-copy').textContent,l.goalFastest);assert.equal(ui.el('heading-value').textContent,l.headingStraight);
  ui.input('heading',20);ui.click('play');ui.run(()=>ui.el('river-status-text').textContent===l.landed);
  assert.equal(ui.el('lesson-title').textContent,l.fastSlowTitle);assert.ok(ui.el('lesson-copy').textContent.includes(fmt(50)));assert.equal(ui.el('mission-score').textContent,'0');
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('river-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves mission, heading, prediction, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('heading',53);en.input('predict',45);en.click('step');
 en.links.find(l=>l.lang==='nl').events.click();assert.equal(storage.size,1);
 const nl=open('nl',storage);assert.equal(storage.size,0);
 assert.equal(nl.el('mission-3').attributes['aria-pressed'],'true');assert.equal(nl.el('heading').value,'53');assert.equal(nl.el('predict').value,'45');
 assert.equal(nl.el('time-value').textContent,(.5).toLocaleString('nl',{minimumFractionDigits:2}));assert.equal(nl.el('river-status-text').textContent,copy.nl.paused);
});
console.log(`\n${checks} river crossing vector and multilingual interface checks passed.`);
