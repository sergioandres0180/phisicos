// Curve Ahead: centripetal force F = m·v² ÷ r against the grip μ·m·g, the wider circle of a skid, exact curve entry,
// turn and road exit, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/curve.html'),'utf8'),copy=require('./locales/curve.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'curve-model'),pure);const Curve=pure.CurveModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[5400,Math.sqrt(.8*g*40),400/(.5*g),14,Math.sqrt(.7*g*30)];
const make=(i,a=expected[i])=>{const m=new Curve(i);assert.ok(m.setAnswer(a));return m;};

test('each curve has the expected answer',()=>{expected.forEach((v,i)=>near(new Curve(i).exact(),v));near(expected[1],17.7088,1e-5);});
test('with enough grip the car follows the lane at constant speed and needs m·v² ÷ r toward the centre',()=>{
 for(let i=0;i<5;i++){const m=make(i);assert.equal(m.outcome(),'made');near(m.pathRadius(),m.radius());}
 const m=make(0);near(m.needed(),5400);near(m.force(m.duration()),5400);assert.equal(m.force(m.entryTime()/2),0);
 const end=m.position(m.duration());near(end.x,-50);near(end.y,50);const v=m.velocity(m.duration());near(v.x,-15);near(v.y,0,1e-12);
 for(const t of [0,1,2,4,6])near(Math.hypot(m.velocity(t).x,m.velocity(t).y),15);
 near(m.duration(),20/15+Math.PI/2*50/15);
});
test('too little grip gives the wider circle R = m·v² ÷ grip, and the road exit is exact inside long steps',()=>{
 const wide=make(1,expected[1]*1.02);assert.equal(wide.outcome(),'drift');near(wide.pathRadius(),40*1.0404,1e-12);assert.ok(wide.wide(wide.duration())>0&&wide.wide(wide.duration())<4);
 const off=make(1,expected[1]*1.05);assert.equal(off.outcome(),'off');const e=off.advance(1e3);assert.equal(e.done,true);assert.equal(e.entered,true);near(off.wide(off.now()),4);
 near(off.force(off.now()),.8*1200*g);const a=make(1,25),b=make(1,25);a.advance(1e3);while(b.status!=='finished')b.advance(1/120);near(a.t,b.t,1e-12);
 const frozen=JSON.stringify(a.snapshot());assert.equal(a.advance(1),null);assert.equal(JSON.stringify(a.snapshot()),frozen);
});
test('an answer rounded to its last digit still makes the curve exactly',()=>{
 assert.equal(make(2,81.63).outcome(),'made');assert.equal(make(1,17.71).outcome(),'made');assert.equal(make(1,17.8).outcome(),'drift');
});
test('the mass cancels: a truck and a car share the top speed',()=>{
 const truck=make(4),car=new Curve(4);car.config={...car.config,m:1200};car.setAnswer(expected[4]);assert.equal(car.outcome(),'made');near(truck.needed()/truck.grip(),car.needed()/car.grip());
 assert.equal(make(4,expected[4]*1.05).outcome(),'drift');assert.equal(make(4,expected[4]*1.1).outcome(),'off');
});
test('entering the curve is announced once, and slow drives play faster',()=>{
 const m=make(0);let entered=0;while(m.status!=='finished'){const r=m.advance(1/120);if(r?.entered)entered++;}assert.equal(entered,1);
 assert.equal(make(1).playback(),1);const slow=make(1,2);assert.ok(slow.duration()>8);assert.equal(slow.playback(),Math.ceil(slow.duration()/8));
});
test('answers count within 2%, and a drive counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,5300).evaluate().ok,true);assert.equal(make(0,5200).evaluate().ok,false);assert.equal(make(2,83).evaluate().ok,true);
 const m=make(3);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(3,19.8);n.advance(.1);assert.equal(n.attempts,1);n.setAnswer(14);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, and a safe but wrong answer is called out',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,360),'noSquare');assert.equal(slip(0,4.5),'acceleration');assert.equal(slip(0,11760),'weight');assert.equal(slip(0,270000),'noRadius');assert.equal(slip(0,2700),'half');assert.equal(slip(0,8000),'spare');
 assert.equal(slip(1,313.6),'noRoot');assert.equal(slip(1,Math.sqrt(g*40)),'noFriction');assert.equal(slip(1,10),'spare');assert.equal(slip(1,25),null);
 assert.equal(slip(2,400/g),'radiusNoFriction');assert.equal(slip(2,20/(.5*g)),'radiusNoSquare');assert.equal(slip(2,.5*400/g),'radiusTimes');assert.equal(slip(2,150),'spare');
 assert.equal(slip(3,Math.sqrt(.8*g*50)/2),'halfSpeed');assert.equal(slip(3,Math.sqrt(.8*g*50)),'sameSpeed');assert.equal(slip(3,.4*g*50),'noRoot');
 assert.equal(slip(4,Math.sqrt(.7*g*30*.1)),'heavier');assert.equal(slip(4,Math.sqrt(g*30)),'noFriction');
});
test('answers are validated and nothing drives without one',()=>{
 assert.equal(new Curve(0).setAnswer(0),false);assert.equal(new Curve(1).setAnswer(500),false);assert.equal(new Curve(2).setAnswer(250),false);assert.equal(new Curve(3).setAnswer(-1),false);
 const m=new Curve(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,60);m.advance(1);const n=new Curve();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:300},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Curve();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'curve-model'),script(source,'curve-model'));
 return mount(html,{scripts:['curve-model','curve-interface'],locale:'curve-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');
  assert.equal(ui.el('given-0').textContent,'m = 1200 kg · v = 15 m/s · r = 50 m');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.gripTitle)&&ui.painted.includes(l.gripHint)&&ui.painted.includes(l.centreLabel));
 });
 test(`${lang}: the right grip takes the car through the curve on the first drive`,()=>{
  ui.input('answer',5400);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('lesson-copy').textContent,l.straightCopy);assert.ok(ui.painted.includes(l.neededLabel));
  ui.click('play');ui.run(()=>ui.el('curve-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.madeCopy,{v:fmt(15),need:fmt(5400,0),grip:fmt(5400,0)})+' '+l.why0);
  assert.equal(ui.el('force-value').textContent,fmt(5400,0));assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.madeBanner));
 });
 test(`${lang}: too fast slides off the road, and a needlessly wide curve is called out`,()=>{
  ui.click('mission-1');ui.input('answer',25);ui.click('play');ui.run(()=>ui.el('curve-status-text').textContent===l.done);
  const m=new Curve(1);m.setAnswer(25);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.offCopy,{need:fmt(m.needed(),0),grip:fmt(m.grip(),0),t:fmt(m.duration())})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.hint1));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.gripShort));
  ui.click('mission-2');ui.input('answer',150);ui.click('play');ui.run(()=>ui.el('curve-status-text').textContent===l.done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSpare));
 });
 test(`${lang}: the wet road is explained, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('given-3').textContent,'μ = '+fmt(.8,1)+' → '+fmt(.4,1)+' · r = 50 m');
  ui.input('answer',9.9);ui.click('play');ui.run(()=>ui.el('curve-status-text').textContent===l.done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipHalfSpeed));
  ui.click('mission-4');ui.input('answer',14.34);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('curve-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves curve, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',60);en.click('play');en.run(()=>en.el('curve-status-text').textContent===copy.en.done);en.input('answer',81.6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'81.6');assert.equal(es.el('curve-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('curve-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} curve ahead centripetal-force and multilingual interface checks passed.`);
