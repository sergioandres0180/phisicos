// Orienteering Walk: displacement sums, exact corners and finish, route tools, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/walk.html'),'utf8'),copy=require('./locales/walk.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'walk-model'),pure);const Walk=pure.WalkModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const summary=m=>{const d=m.displacementTotal();return {mag:Math.hypot(d.e,d.n),bearing:Walk.bearing(d.e,d.n),total:m.total()};};

test('each route has the designed displacement, bearing, and distance',()=>{
 const expected=[[500,53.130102,700],[0,null,1400],[385.459004,66.523991,700],[429.510906,350.184233,1100],[250,36.869898,350]];
 expected.forEach(([mag,bearing,total],i)=>{const s=summary(new Walk(i));near(s.mag,mag,1e-6);near(s.total,total);if(bearing!==null)near(s.bearing,bearing,1e-6);});
});
test('distance is never smaller than the size of the displacement',()=>{for(let i=0;i<Walk.levels.length;i++){const s=summary(new Walk(i));assert.ok(s.total>=s.mag-1e-9);}});
test('reversing the leg order changes the path but not the displacement',()=>{
 for(let i=0;i<Walk.levels.length;i++){const a=new Walk(i),b=new Walk(i);b.setReversed(true);const da=a.displacementTotal(),db=b.displacementTotal();near(da.e,db.e,1e-9);near(da.n,db.n,1e-9);}
 const a=new Walk(3),b=new Walk(3);b.setReversed(true);a.advance(200);b.advance(200);assert.ok(Math.hypot(a.position().e-b.position().e,a.position().n-b.position().n)>10);
});
test('multiplying the route scales the displacement and ×(−1) reverses its direction',()=>{
 const m=new Walk(4);m.setMultiplier(2);let s=summary(m);near(s.mag,500);near(s.bearing,36.869898,1e-6);near(s.total,700);
 m.setMultiplier(-1);s=summary(m);near(s.mag,250);near(s.bearing,216.869898,1e-6);near(s.total,350);assert.equal(m.setMultiplier(3),false);
});
test('corners are reached exactly and the current leg switches there',()=>{
 const m=new Walk(0);m.advance(200);let p=m.position();near(p.e,0,1e-9);near(p.n,300);assert.equal(p.leg,1);near(m.velocity().e,1.5);near(m.velocity().n,0,1e-12);
 m.advance(100);p=m.position();near(p.e,150);near(p.n,300);assert.equal(p.leg,1);
});
test('the finish is solved exactly inside a long step and then freezes',()=>{
 const m=new Walk(0);assert.equal(m.advance(400),null);const e=m.advance(1e4);near(e.t,700/1.5);assert.equal(m.status,'finished');near(m.position().e,400);near(m.position().n,300);near(Math.hypot(m.velocity().e,m.velocity().n),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(10),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('finish time is independent of timestep partitioning',()=>{const a=new Walk(1),b=new Walk(1);a.advance(1e5);while(b.status!=='finished')b.advance(.5);near(a.t,b.t,1e-12);});
test('scoring checks size within 5% and bearing within 5°',()=>{
 const run=(i,mag,bearing)=>{const m=new Walk(i);m.setPrediction(mag,bearing);m.advance(1e5);return m.score();};
 assert.equal(run(0,500,53),100);assert.equal(run(0,480,57),100);assert.equal(run(0,470,53),50);assert.equal(run(0,500,60),50);assert.equal(run(0,500,NaN),50);
 assert.equal(run(1,0,NaN),100);assert.equal(run(1,3,123),100);assert.equal(run(1,50,0),0);
 const pending=new Walk(0);pending.setPrediction(500,53);assert.equal(pending.score(),0);
});
test('bearings wrap around north and zero vectors have no direction',()=>{near(Walk.angleGap(358,3),5);near(Walk.bearing(-1,1),315);const m=new Walk(0);m.setPrediction(10,-10);assert.equal(m.prediction.bearing,350);});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=new Walk(4);m.setMultiplier(-1);m.setReversed(true);m.setPrediction(250,217);m.advance(60);
 const n=new Walk();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.level,4);assert.equal(n.multiplier,-1);assert.equal(n.reversed,true);near(n.t,60);assert.equal(n.prediction.bearing,217);
 for(const bad of [{...m.snapshot(),level:8},{...m.snapshot(),multiplier:5},{...m.snapshot(),reversed:'yes'},{...m.snapshot(),t:1e7},{...m.snapshot(),prediction:{magnitude:-1,bearing:null}}]){const k=new Walk();assert.equal(k.restore(bad),false);assert.equal(k.level,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'walk-model'),script(source,'walk-model'));
 return mount(html,{scripts:['walk-model','walk-interface'],locale:'walk-locale',langs,storage});
};
const predict=(ui,m,b)=>{ui.input('predict-magnitude',m);ui.input('predict-bearing',b);};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, route legs, and map labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('walk-status-text').textContent,l.ready);
  assert.equal(ui.el('given-0').textContent,'300 m @ 000° · 400 m @ 090°');assert.equal(ui.el('distance-total').textContent,l.routeTotal.replace('{s}','700'));
  assert.equal(ui.el('bearing-value').textContent,l.noDirection);assert.ok(ui.painted.includes(l.north)&&ui.painted.includes(l.start));
 });
 test(`${lang}: the corner walk confirms a 500 m shortcut at 053°`,()=>{
  predict(ui,500,53);assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{pm}',fmt(500,1)).replace('{pb}','053°'));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(6,0));assert.equal(ui.el('distance-value').textContent,fmt(9,1));
  ui.click('play');ui.run(()=>ui.el('walk-status-text').textContent===l.finished);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle.replace('{m}',fmt(500,1)).replace('{b}','053°'));assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('distance-value').textContent,fmt(700,1));assert.equal(ui.el('magnitude-value').textContent,fmt(500,1));assert.equal(ui.el('bearing-value').textContent,l.bearingNote.replace('{b}','053°'));
  assert.ok(ui.el('magnitude-badge').classList.has('earned')&&ui.el('bearing-badge').classList.has('earned'));
 });
 test(`${lang}: a round trip walks 1400 m with zero displacement`,()=>{
  ui.click('level-1');assert.equal(ui.el('predict-magnitude').value,'');predict(ui,0,'');ui.click('play');ui.run(()=>ui.el('walk-status-text').textContent===l.finished);
  assert.equal(ui.el('lesson-title').textContent,l.loopGoodTitle);assert.equal(ui.el('distance-value').textContent,fmt(1400,1));assert.equal(ui.el('bearing-value').textContent,l.noDirection);
  assert.ok(ui.painted.includes(l.homeBanner));
 });
 test(`${lang}: route tools reverse and scale the displacement`,()=>{
  ui.click('level-4');ui.click('multiply--1');assert.equal(ui.el('multiply--1').attributes['aria-pressed'],'true');ui.click('reverse');assert.equal(ui.el('reverse').attributes['aria-pressed'],'true');
  predict(ui,200,0);ui.click('play');ui.run(()=>ui.el('walk-status-text').textContent===l.finished);
  assert.equal(ui.el('magnitude-value').textContent,fmt(250,1));assert.equal(ui.el('bearing-value').textContent,l.bearingNote.replace('{b}','217°'));
  assert.equal(ui.el('lesson-title').textContent,l.missTitle.replace('{m}',fmt(250,1)).replace('{b}','217°'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.windowEvents.get('blur')();assert.equal(ui.el('walk-status-text').textContent,l.finished);
 });
}
test('changing language preserves route, tools, prediction, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('level-3');en.click('reverse');en.click('multiply-2');predict(en,860,350);en.click('step');
 en.links.find(l=>l.lang==='da').events.click();assert.equal(storage.size,1);
 const da=open('da',storage);assert.equal(storage.size,0);
 assert.equal(da.el('level-3').attributes['aria-pressed'],'true');assert.equal(da.el('reverse').attributes['aria-pressed'],'true');assert.equal(da.el('multiply-2').attributes['aria-pressed'],'true');
 assert.equal(da.el('predict-magnitude').value,'860');assert.equal(da.el('time-value').textContent,'6');assert.equal(da.el('walk-status-text').textContent,copy.da.paused);
});
console.log(`\n${checks} orienteering walk scalar/vector and multilingual interface checks passed.`);
