// Powers-of-Ten Probe: prefix conversion, exact arrival events, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/scale.html'),'utf8'),copy=require('./locales/scale.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'scale-model'),pure);const Probe=pure.ProbeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(a),Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[[1e-4,2e-5,5],[.072,.0012,60],[1.2,120,.01],[9e5,250,3600],[3.84e8,3e8,1.28],[1.2,3e8,4e-9]];

test('prefixed givens convert to SI metres and metres per second',()=>{Probe.missions.forEach((_,i)=>{const m=new Probe(i);near(m.config.distance,expected[i][0]);near(m.config.speed,expected[i][1]);near(m.travelTime(),expected[i][2]);});});
test('unsupported units are rejected instead of guessed',()=>{assert.throws(()=>Probe.toSI([1,'mi']));assert.throws(()=>Probe.toSI([1,'Tm/s']));});
test('every trip plays back in 3 to 15 seconds',()=>{Probe.missions.forEach((m,i)=>{const playback=new Probe(i).travelTime()/10**m.kExp;assert.ok(playback>=3&&playback<=15,`${m.id}: ${playback}`);});});
test('arrival is solved exactly inside a long step and then freezes',()=>{
 const m=new Probe(5);assert.equal(m.advance(3e-9),null);near(m.x(),.9);const event=m.advance(1);near(event.t,4e-9);assert.equal(m.status,'arrived');near(m.x(),1.2);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('arrival time is independent of timestep partitioning',()=>{const a=new Probe(4),b=new Probe(4);a.advance(10);while(b.status!=='arrived')b.advance(.1/120);near(a.t,b.t,1e-12);});
test('scoring separates notation, order of magnitude, and 2% accuracy',()=>{
 const run=(i,a,n)=>{const m=new Probe(i);m.setPrediction(a,n);m.advance(1e9);return [m.score(),m.evaluate()];};
 let [score,e]=run(5,4,-9);assert.equal(score,120);assert.ok(e.accurate&&e.order&&e.notation);
 [score,e]=run(5,40,-10);assert.equal(score,100);assert.ok(e.accurate&&!e.notation);
 [score,e]=run(5,4.5,-9);assert.equal(score,70);assert.ok(e.order&&!e.accurate);
 [score,e]=run(5,4,-8);assert.equal(score,20);assert.ok(!e.order);
 [score]=run(4,1.3,0);assert.equal(score,120);[score]=run(4,1.31,0);assert.equal(score,70);
 const pending=new Probe(0);pending.setPrediction(5,0);assert.equal(pending.score(),0);
 const none=new Probe(0);none.advance(10);assert.equal(none.score(),0);
});
test('predictions reset the trip and reject invalid values',()=>{const m=new Probe(0);m.advance(2);m.setPrediction(-3,2.5);assert.equal(m.t,0);assert.equal(m.prediction(),null);assert.equal(m.exponent,0);m.setPrediction(2,99);assert.equal(m.exponent,0);});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=new Probe(3);m.setPrediction(3.6,3);m.advance(1000);const n=new Probe();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);near(n.t,1000);near(n.prediction(),3600);
 for(const bad of [{...m.snapshot(),index:7},{...m.snapshot(),t:-1},{...m.snapshot(),t:1e9},{...m.snapshot(),mantissa:-2},{...m.snapshot(),exponent:1.5},{...m.snapshot(),status:'lost'}]){const k=new Probe();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'scale-model'),script(source,'scale-model'));
 return mount(html,{scripts:['scale-model','scale-interface'],locale:'scale-locale',langs,storage});
};
const predict=(ui,a,n)=>{ui.input('mantissa',a);ui.input('exponent',n);};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sci=(a,e,d=2)=>fmt(a,d)+' × 10'+Probe.sup(e);
 const ui=open(lang);
 test(`${lang}: initial state hides SI conversions and localizes givens`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('probe-status-text').textContent,l.ready);
  assert.equal(ui.el('given-0').textContent,'d = '+(.1).toLocaleString(lang)+' mm · v = 20 μm/s');
  assert.equal(ui.el('speed-value').textContent,'?');assert.equal(ui.el('speed-prefixed').textContent,l.hiddenUntilLaunch);
  assert.equal(ui.el('view-width').textContent,'200 μm = '+fmt(2,0)+' × 10⁻⁴ m');
  assert.ok(ui.painted.includes(l.start)&&ui.painted.includes(l.target));
  assert.ok(ui.painted.some(s=>String(s).startsWith(l.lmHair+' ≈ ')));
 });
 test(`${lang}: a normalized prediction launches and is confirmed on arrival`,()=>{
  predict(ui,5,0);assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{p}',sci(5,0)));assert.equal(ui.el('prediction-prefixed').textContent,'= '+fmt(5)+' s');assert.ok(ui.el('notation-badge').classList.has('earned'));
  ui.click('step');assert.equal(ui.el('speed-value').textContent,'+'+sci(2,-5));assert.equal(ui.el('time-value').textContent,sci(1,-1));
  ui.click('play');ui.run(()=>ui.el('probe-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.arrivedGoodTitle);assert.equal(ui.el('mission-score').textContent,'120');assert.equal(ui.el('time-value').textContent,sci(5,0));
  assert.ok(ui.el('accurate-badge').classList.has('earned'));assert.equal(ui.el('play').disabled,true);assert.ok(ui.painted.includes(l.arrivedBanner.replace('{t}',fmt(5)+' s')));
 });
 test(`${lang}: a wrong power of ten reveals the SI conversions`,()=>{
  ui.click('mission-5');assert.equal(ui.el('mantissa').value,'');assert.equal(ui.el('mission-label').textContent,l.mission5);
  predict(ui,4,-8);ui.click('play');ui.run(()=>ui.el('probe-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.arrivedOffTitle);assert.equal(ui.el('mission-score').textContent,'20');
  assert.ok(ui.el('lesson-copy').textContent.includes(sci(1.2,0)+' m')&&ui.el('lesson-copy').textContent.includes(sci(3,8)+' m/s'));
  assert.ok(ui.el('travel-equation').textContent.endsWith(sci(4,-9)+' s'));
 });
 test(`${lang}: notation hints, passed predictions, and zoom controls`,()=>{
  ui.click('mission-1');predict(ui,40,-1);assert.equal(ui.el('lesson-title').textContent,l.notationTitle);assert.ok(!ui.el('notation-badge').classList.has('earned'));
  predict(ui,3,1);ui.click('play');ui.run(()=>ui.el('lesson-title').textContent===l.passedTitle,{limit:60});assert.equal(ui.el('lesson-title').textContent,l.passedTitle);
  ui.click('pause');const width=ui.el('view-width').textContent;ui.click('zoom-in');assert.notEqual(ui.el('view-width').textContent,width);ui.click('zoom-out');ui.click('zoom-out');ui.click('zoom-fit');assert.equal(ui.el('view-width').textContent,width);
  ui.windowEvents.get('blur')();assert.equal(ui.el('probe-status-text').textContent,l.paused);
 });
}
test('changing language preserves trip, prediction, zoom, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');predict(en,3.6,3);en.click('zoom-out');en.click('step');
 const width=en.el('view-width').textContent;en.links.find(l=>l.lang==='fi').events.click();assert.equal(storage.size,1);
 const fi=open('fi',storage);assert.equal(storage.size,0);
 assert.equal(fi.el('mission-3').attributes['aria-pressed'],'true');assert.equal(fi.el('mantissa').value,'3.6');assert.equal(fi.el('exponent').value,'3');
 assert.equal(fi.el('view-width').textContent.replace(',','.'),width);assert.equal(fi.el('probe-status-text').textContent,copy.fi.paused);assert.equal(fi.el('lesson-title').textContent,copy.fi.travelTitle.replace('{pct}','3'));
});
console.log(`\n${checks} powers-of-ten probe and multilingual interface checks passed.`);
