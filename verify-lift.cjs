// Lift Trips: distance and displacement over multi-stop trips, exact schedule, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/lift.html'),'utf8'),copy=require('./locales/lift.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'lift-model'),pure);const Lift=pure.LiftModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[[15,15],[18,-18],[36,0],[54,6],[48,-18],[30,6]];
const make=(i,[s,d]=expected[i])=>{const m=new Lift(i);m.setPrediction(s,d);return m;};

test('each trip has the expected distance and displacement, and |Δy| ≤ s',()=>{
 expected.forEach(([s,dy],i)=>{const a=new Lift(i).answers();near(a.s,s);near(a.dy,dy);assert.ok(Math.abs(a.dy)<=a.s);});
});
test('the schedule moves at 2 m/s and waits 1 s with zero velocity at intermediate stops',()=>{
 const m=make(2);near(m.tripTime(),19);m.advance(4.5);let st=m.state();near(st.y,9);near(st.v,2);near(st.s,9);
 m.advance(4.7);st=m.state();near(st.y,18);near(st.v,0);near(st.s,18);assert.equal(st.phase.type,'dwell');
 m.advance(1.8);st=m.state();near(st.y,16);near(st.v,-2);near(st.s,20);
});
test('distance only grows while displacement can shrink and change sign',()=>{
 const m=make(4);let last=0;for(let t=0;t<m.tripTime();t+=.5){m.reset();m.advance(t);const st=m.state();assert.ok(st.s>=last-1e-9);last=st.s;}
 m.reset();m.advance(20);assert.ok(m.state().y-m.startY()<0);
});
test('arrival is exact inside a long step, independent of the timestep, then frozen',()=>{
 const m=make(3);const T=m.tripTime();near(T,29);assert.equal(m.advance(28.9),null);const e=m.advance(5);near(e.t,29);assert.equal(m.status,'arrived');
 const st=m.state();near(st.y,9);near(st.s,54);near(st.v,0);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(2),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(5),b=make(5);a.advance(1e3);while(b.status!=='arrived')b.advance(1/120);near(a.t,b.t,1e-12);near(b.state().s,30);
});
test('distance and displacement each earn 50 points',()=>{
 const score=(i,s,d)=>{const m=make(i,[s,d]);m.advance(1e3);return m.score();};
 assert.equal(score(2,36,0),100);assert.equal(score(2,0,0),50);assert.equal(score(2,36,36),50);assert.equal(score(1,18.04,-17.96),100);assert.equal(make(0).score(),0);
});
test('classic slips are recognized',()=>{
 const e=(i,s,d)=>make(i,[s,d]).evaluate();
 assert.equal(e(1,6,-18).distanceSlip,'floors');assert.equal(e(2,0,0).distanceSlip,'straight');assert.equal(e(2,36,36).dispSlip,'distance');
 assert.equal(e(1,18,18).dispSlip,'sign');assert.equal(e(1,18,-6).dispSlip,'floors');assert.equal(e(4,48,-9).dispSlip,'final');
});
test('distance cannot be negative, and edits restart the trip',()=>{
 const m=make(0);m.advance(3);assert.equal(m.setPrediction(-1,0),false);assert.equal(m.t,3);m.setPrediction(15,14);assert.equal(m.t,0);
 const blank=new Lift(0);assert.equal(blank.advance(5),null);assert.equal(blank.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3);m.advance(12);const n=new Lift();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);near(n.t,12);assert.equal(n.distance,54);
 const s=m.snapshot();for(const bad of [{...s,index:6},{...s,distance:-3},{...s,t:1e6},{...s,status:'stuck'},{...s,disp:null}]){const k=new Lift();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'lift-model'),script(source,'lift-model'));
 return mount(html,{scripts:['lift-model','lift-interface'],locale:'lift-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=1)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, localized givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('lift-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('given-3').textContent,l.floorsGiven.replace('{list}','1 → 7 → −1 → 3'));assert.equal(ui.el('floor-value').textContent,l.floorReadout.replace('{n}','0'));
  assert.ok(ui.painted.includes(l.logTitle)&&ui.painted.includes(l.basement)&&ui.painted.includes('−3'));
 });
 test(`${lang}: a round trip has distance but no displacement, with a stop on the way`,()=>{
  ui.click('mission-2');ui.input('distance-answer',36);ui.input('disp-answer',0);
  for(let i=0;i<31;i++)ui.click('step');assert.equal(ui.el('lesson-title').textContent,l.doorsTitle);assert.equal(ui.el('velocity-value').textContent,fmt(0));assert.equal(ui.el('distance-value').textContent,fmt(18));
  ui.click('play');ui.run(()=>ui.el('lift-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,l.why2);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('distance-value').textContent,fmt(36));assert.equal(ui.el('disp-value').textContent,fmt(0));assert.ok(ui.el('distance-badge').classList.has('earned')&&ui.el('disp-badge').classList.has('earned'));
 });
 test(`${lang}: slips get their own explanation`,()=>{
  ui.click('mission-1');ui.input('distance-answer',6);ui.input('disp-answer',18);ui.click('play');ui.run(()=>ui.el('lift-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.checkTitle);assert.equal(ui.el('mission-score').textContent,'0');assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,l.distanceFloors.replace('{floors}','6').replace('{s}','18')+' '+l.dispSign.replace('{dy}',(-18).toLocaleString(lang)));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('lift-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves trip, predictions, and progress',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('distance-answer',48);en.input('disp-answer',-18);en.click('step');
 en.links.find(l=>l.lang==='nb').events.click();assert.equal(storage.size,1);
 const nb=open('nb',storage);assert.equal(storage.size,0);
 assert.equal(nb.el('mission-4').attributes['aria-pressed'],'true');assert.equal(nb.el('distance-answer').value,'48');assert.equal(nb.el('disp-answer').value,'-18');
 assert.equal(nb.el('time-value').textContent,(.3).toLocaleString('nb',{minimumFractionDigits:1}));assert.equal(nb.el('lift-status-text').textContent,copy.nb.paused);
});
console.log(`\n${checks} lift trips distance/displacement and multilingual interface checks passed.`);
