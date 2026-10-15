// Echo Sounder: distances from echoes. A sonar depth d = v·t ÷ 2, a bat's moth, a cliff's echo time t = 2d ÷ v, the speed
// of sound in sea water v = 2d ÷ t, a shoal above the seabed from two echoes, the sound's path and echoes heard, the exact
// end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/echo.html'),'utf8'),copy=require('./locales/echo.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'echo-model'),pure);const Echo=pure.EchoModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[300,1.7,.5,1500,225],units=['m','m','s','m/s','m'],durations=[400,10,500,800,400];
const make=(i,a=expected[i])=>{const m=new Echo(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Echo(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,4);});
});
test('the sound goes out and back, and each echo is heard after its round trip',()=>{
 const m=make(4);near(m.travelled(200),300);near(m.travelled(400),600);assert.equal(m.heard(99),0);assert.equal(m.heard(100),1);assert.equal(m.heard(399),1);assert.equal(m.heard(400),2);
 near(m.echoTime(75),.1);near(m.echoTime(300),.4);assert.equal(JSON.stringify(m.reflectors()),'[75,300]');assert.equal(JSON.stringify(make(0).reflectors()),'[300]');
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,3.4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.7);n.advance(1e4);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,600),'noHalf');assert.equal(slip(0,3750),'divided');assert.equal(slip(0,68),'airSpeed');assert.equal(slip(0,250),null);
 assert.equal(slip(1,3.4),'noHalf');assert.equal(slip(1,34000),'divided');assert.equal(slip(1,170),'centimetres');assert.equal(slip(1,1),null);
 assert.equal(slip(2,.25),'oneWay');assert.equal(slip(2,2),'inverted');assert.equal(slip(2,1),null);
 assert.equal(slip(3,750),'oneWaySpeed');assert.equal(slip(3,480),'multipliedSpeed');assert.equal(slip(3,1000),null);
 assert.equal(slip(4,450),'noHalfGap');assert.equal(slip(4,75),'fishDepth');assert.equal(slip(4,300),'seabedDepth');assert.equal(slip(4,150),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Echo(0).setAnswer(bad),false);assert.equal(new Echo(0).setAnswer(1e6),true);assert.equal(new Echo(2).setAnswer(1e4+1),false);
 const m=new Echo(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,750);m.advance(100);const n=new Echo();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,100);assert.equal(n.answer,750);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:801},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Echo(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'echo-model'),script(source,'echo-model'));
 return mount(html,{scripts:['echo-model','echo-interface'],locale:'echo-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const m=new Echo(i),c=m.config;return {d:plain(c.d),t:plain(m.echoTime(c.d)),v:plain(c.v),h:plain(c.d-(c.fish||0))};};
 const ui=open(lang),done=()=>ui.el('echo-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`v = 1500 m/s · t = ${plain(.4)} s`);assert.equal(ui.el('given-1').textContent,`v = 340 m/s · t = ${plain(.01)} s`);assert.equal(ui.el('given-2').textContent,'v = 340 m/s · d = 85 m');
  assert.equal(ui.el('given-3').textContent,`d = 600 m · t = ${plain(.8)} s`);assert.equal(ui.el('given-4').textContent,`v = 1500 m/s · ${plain(.1)} s · ${plain(.4)} s`);
  for(const id of ['speed-value','distance-value','travel-value','echo-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('echo-equation').textContent,'d = v·t ÷ 2');
  for(const key of ['viewTitle','recorderGraph','panelHint','scaleNote','shipTag','seabedTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('300 m'));
 });
 test(`${lang}: the readings appear once the ping goes out, and the depth is right on the first try`,()=>{
  ui.input('answer',300);assert.equal(ui.el('speed-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('speed-value').textContent,'1500');assert.equal(ui.el('distance-value').textContent,'300');assert.equal(ui.el('travel-value').textContent,'15');assert.equal(ui.el('echo-value').textContent,'0');
  assert.equal(ui.el('time-value').textContent,num(10));assert.equal(ui.el('lesson-copy').textContent,fill(l.echoCopy,{s:'15'}));
  assert.equal(ui.el('echo-equation').textContent,`d = v·t ÷ 2 = 1500 × ${plain(.4)} ÷ 2 = ${num(300,0)} m`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(10)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('echo-value').textContent,'1');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis)&&ui.painted.includes(num(400,0)+' ms'));
 });
 test(`${lang}: the bat's moth without halving, then halved`,()=>{
  ui.click('mission-1');ui.input('answer',3.4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(3.4)+' m'})+' '+l.slipNoHalf);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.batTag)&&ui.painted.includes(l.mothTag));
  assert.equal(ui.el('echo-equation').textContent,`d = v·t ÷ 2 = 340 × ${plain(.01)} ÷ 2 = ${num(1.7)} m`);
  ui.input('answer',1.7);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: a cliff's echo time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('echo-equation').textContent,'t = 2d ÷ v');ui.input('answer',.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);assert.ok(ui.painted.includes(l.cliffTag)&&ui.painted.includes(l.youTag));
  assert.equal(ui.el('echo-equation').textContent,`t = 2d ÷ v = 170 ÷ 340 = ${num(.5,3)} s`);
 });
 test(`${lang}: the speed of sound in sea water, one way first, then both`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',750);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(750)+' m/s'})+' '+l.slipOneWaySpeed);
  ui.input('answer',1500);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('echo-equation').textContent,`v = 2d ÷ t = 1200 ÷ ${plain(.8)} = ${num(1500,0)} m/s`);
 });
 test(`${lang}: a shoal above the seabed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('echo-equation').textContent,'h = v·Δt ÷ 2');ui.input('answer',225);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('echo-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('echo-equation').textContent,`h = v·Δt ÷ 2 = 1500 × ${plain(.3)} ÷ 2 = ${num(225,0)} m`);assert.equal(ui.el('echo-value').textContent,'2');assert.ok(ui.painted.includes(l.fishTag));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',3.4);en.click('play');en.run(()=>en.el('echo-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoHalf));en.input('answer',1.7);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.7');assert.equal(es.el('echo-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('echo-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} echo sounder and multilingual interface checks passed.`);
