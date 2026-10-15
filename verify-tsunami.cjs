// Tsunami Race: how depth sets a wave's speed. v = √(g·h) over a 4000 m ocean, the same in km/h, the time to cross 2000 km,
// the slow-down in 10 m of water, the depth from a measured speed h = v² ÷ g, the exact end of each run, slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tsunami.html'),'utf8'),copy=require('./locales/tsunami.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tsunami-model'),pure);const Tsunami=pure.TsunamiModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,deep=Math.sqrt(g*4000),cross=2e6/deep;
const expected=[deep,3.6*deep,cross/3600,Math.sqrt(g*10),2500/g],units=['m/s','km/h','h','m/s','m'],durations=[cross/60,cross/60,cross/60,2000/Math.sqrt(98)/60,200/60];
const make=(i,a=expected[i])=>{const m=new Tsunami(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Tsunami(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,4);});
 near(deep,197.98989873);near(3.6*deep,712.76363544);near(cross/3600,2.80597929);near(new Tsunami(4).speed(),50);
});
test('the speed follows the square root of the depth',()=>{
 near(new Tsunami(0).speed()/new Tsunami(3).speed(),20);near(new Tsunami(4).speed()**2/g,new Tsunami(4).config.h);
});
test('the wave moves steadily and reaches the far side as the run ends',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;near(m.position(0),0);near(m.position(m.duration()/2),c.d/2);near(m.position(m.duration()),c.d);near(m.position(m.duration()*2),c.d);}
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,198);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(713);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,39200),'noRoot');assert.equal(slip(0,Math.sqrt(4000)),'noGravity');assert.equal(slip(0,Math.sqrt(4000/g)),'divided');assert.equal(slip(0,100),null);
 assert.equal(slip(1,198),'metresPerSecond');assert.equal(slip(1,55),'dividedBy36');assert.equal(slip(1,600),null);
 assert.equal(slip(2,cross),'seconds');assert.equal(slip(2,cross/60),'minutes');assert.equal(slip(2,3.6*deep/2000),'invertedTime');assert.equal(slip(2,3),null);
 assert.equal(slip(3,98),'noRootShallow');assert.equal(slip(3,Math.sqrt(10)),'noGravityShallow');assert.equal(slip(3,deep/400),'linear');assert.equal(slip(3,20),null);
 assert.equal(slip(4,50/g),'notSquared');assert.equal(slip(4,g*2500),'multiplied');assert.equal(slip(4,2500),'squareOnly');assert.equal(slip(4,300),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Tsunami(0).setAnswer(bad),false);assert.equal(new Tsunami(0).setAnswer(1e6),true);assert.equal(new Tsunami(4).setAnswer(1e7),true);assert.equal(new Tsunami(2).setAnswer(1e5+1),false);
 const m=new Tsunami(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,.495);m.advance(1);const n=new Tsunami();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1);assert.equal(n.answer,.495);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:4},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tsunami(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tsunami-model'),script(source,'tsunami-model'));
 return mount(html,{scripts:['tsunami-model','tsunami-interface'],locale:'tsunami-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values={v:num(deep,0),k:num(3.6*deep,0),t:num(cross/3600),m:num(cross/60,0),s:num(Math.sqrt(98),1),h:num(2500/g,0)};
 const ui=open(lang),done=()=>ui.el('tsunami-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,`h = 4000 m · g = ${plain(9.8)} m/s²`);assert.equal(ui.el('given-1').textContent,'h = 4000 m');assert.equal(ui.el('given-2').textContent,'d = 2000 km · h = 4000 m');
  assert.equal(ui.el('given-3').textContent,'h: 4000 → 10 m');assert.equal(ui.el('given-4').textContent,'v = 50 m/s');
  for(const id of ['depth-value','speed-value','kmh-value','distance-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tsunami-equation').textContent,'v = √(g·h)');
  for(const key of ['viewTitle','distanceGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('h = 4000 m')&&ui.painted.includes('500 km')&&ui.painted.includes('2000 km'));
 });
 test(`${lang}: the readings appear once the wave starts, and the deep-ocean speed is right on the first try`,()=>{
  ui.input('answer',198);assert.equal(ui.el('depth-value').textContent,'—');
  ui.click('step');
  const t=new Tsunami(0).config.pace/10,d=deep*t*60/1000;
  assert.equal(ui.el('depth-value').textContent,'4000');assert.equal(ui.el('speed-value').textContent,num(deep,1));assert.equal(ui.el('kmh-value').textContent,num(3.6*deep,0));assert.equal(ui.el('distance-value').textContent,num(d,0));
  assert.equal(ui.el('time-value').textContent,num(t));assert.equal(ui.el('lesson-copy').textContent,fill(l.tsunamiCopy,{d:num(d,0)}));
  assert.equal(ui.el('tsunami-equation').textContent,`v = √(g·h) = √(${plain(9.8)} × 4000) = ${num(deep,1)} m/s`);assert.ok(ui.painted.includes(fill(l.fastTag,{n:plain(2525)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('distance-value').textContent,'2000');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values)+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
 });
 test(`${lang}: metres per second for km/h, then km/h`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-unit').textContent,'km/h');ui.input('answer',198);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values)+' '+fill(l.missCopy,{p:plain(198)+' km/h'})+' '+l.slipMetresPerSecond);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('tsunami-equation').textContent,`v = ${num(deep,1)} m/s × ${plain(3.6)} = ${num(3.6*deep,0)} km/h`);
  ui.input('answer',713);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values)+' '+l.why1);
 });
 test(`${lang}: the time to cross 2000 km`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'h');assert.equal(ui.el('tsunami-equation').textContent,'t = d ÷ v');ui.input('answer',2.81);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values)+' '+l.why2);
  assert.equal(ui.el('tsunami-equation').textContent,`t = d ÷ v = 2000 km ÷ ${num(3.6*deep,0)} km/h = ${num(cross/3600)} h`);
 });
 test(`${lang}: near the shore, slowed in proportion, then by the square root`,()=>{
  ui.click('mission-3');ui.input('answer',.495);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values)+' '+fill(l.missCopy,{p:plain(.495)+' m/s'})+' '+l.slipLinear);
  ui.input('answer',9.9);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values)+' '+l.why3);
  assert.equal(ui.el('tsunami-equation').textContent,`v = √(g·h) = √(${plain(9.8)} × 10) = ${num(Math.sqrt(98),1)} m/s`);assert.equal(ui.el('distance-value').textContent,num(2,2));
 });
 test(`${lang}: the depth from a speed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'m');assert.equal(ui.el('tsunami-equation').textContent,'h = v² ÷ g');ui.input('answer',255);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tsunami-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values)+' '+l.why4);
  assert.equal(ui.el('tsunami-equation').textContent,`h = v² ÷ g = 50² ÷ ${plain(9.8)} = ${num(2500/g,0)} m`);assert.ok(ui.painted.includes('h = 255 m'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',198);en.click('play');en.run(()=>en.el('tsunami-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMetresPerSecond));en.input('answer',713);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'713');assert.equal(es.el('tsunami-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tsunami-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} tsunami speed and multilingual interface checks passed.`);
