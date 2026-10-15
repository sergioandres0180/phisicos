// Seismograph: reading a trace on moving paper (T = d ÷ u, f = u ÷ d), the ground's true amplitude (a ÷ M), peak spacing
// from the frequency, the paper speed you choose, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/seismograph.html'),'utf8'),copy=require('./locales/seismograph.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'seismograph-model'),pure);const Seismo=pure.SeismographModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[2.5,.5,.03,5,20],units=['s','Hz','mm','mm','mm/s'];
const make=(i,a=expected[i])=>{const m=new Seismo(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Seismo(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});});
test('peaks one period apart sit u·T apart on the paper',()=>{
 const f=[.4,.5,.5,2,4],u=[10,20,10,10,20],d=[25,40,20,5,5];
 f.forEach((x,i)=>{const m=new Seismo(i);near(m.frequency(),x);near(m.period(),1/x);near(m.speed(),u[i]);near(m.spacing(),d[i]);near(m.speed()*m.period(),m.spacing());});
 const p=make(0).peaks(10);assert.equal(p.length,4);near(p[0],.625);near((p[1]-p[0])*10,25);
});
test('the pen magnifies the ground 1000 times',()=>{
 const m=make(2);near(m.pen(.5),30);near(m.ground(.5),.03);near(m.pen(1.5),-30);near(m.ground(0),0);near(m.pen(.25)/m.ground(.25),1000);
});
test('when the paper speed is asked, your speed drives the paper',()=>{
 near(new Seismo(4).speed(),20);near(make(4,10).speed(),10);near(make(4,10).spacing(),2.5);near(make(4,40).spacing(),10);near(make(4,20).spacing(),5);
});
test('every run ends exactly inside long steps',()=>{
 assert.deepEqual([0,1,2,3,4].map(i=>new Seismo(i).duration()),[10,8,6,3,2]);
 for(const [i,a] of [[0,2.5],[1,.5],[2,.03],[3,5],[4,20]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(0);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(20);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,2);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.5);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,250),'multiplied');assert.equal(slip(0,.4),'frequency');assert.equal(slip(0,25),'distance');assert.equal(slip(0,4),null);
 assert.equal(slip(1,2),'period');assert.equal(slip(1,800),'productFrequency');assert.equal(slip(1,.025),'noSpeed');assert.equal(slip(1,1),null);
 assert.equal(slip(2,.06),'peakToPeak');assert.equal(slip(2,30),'noMagnification');assert.equal(slip(2,30000),'magnified');assert.equal(slip(2,.3),null);
 assert.equal(slip(3,20),'timesFrequency');assert.equal(slip(3,.2),'inverted');assert.equal(slip(3,.5),'periodOnly');assert.equal(slip(3,10),null);
 assert.equal(slip(4,1.25),'divided');assert.equal(slip(4,.8),'invertedPaper');assert.equal(slip(4,10),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e3+1])assert.equal(new Seismo(0).setAnswer(bad),false);assert.equal(new Seismo(0).setAnswer(1e3),true);assert.equal(new Seismo(2).setAnswer(1e5),true);assert.equal(new Seismo(4).setAnswer(1e3+1),false);
 const m=new Seismo(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0);m.advance(4);const n=new Seismo();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,0);assert.equal(n.attempts,1);near(n.t,4);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:11},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Seismo(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'seismograph-model'),script(source,'seismograph-model'));
 return mount(html,{scripts:['seismograph-model','seismograph-interface'],locale:'seismograph-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config;return {u:plain(Number(m.speed().toPrecision(5))),d:num(m.spacing(),1),T:num(m.period()),f:num(m.frequency()),a:plain(c.a),M:plain(c.M),x:num(c.a/c.M,3)};};
 const ui=open(lang),done=()=>ui.el('seismograph-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,'u = 10 mm/s · d = 25 mm');assert.equal(ui.el('given-1').textContent,'u = 20 mm/s · d = 40 mm');assert.equal(ui.el('given-2').textContent,'a = 30 mm · M = 1000×');
  assert.equal(ui.el('given-3').textContent,'f = 2 Hz · u = 10 mm/s');assert.equal(ui.el('given-4').textContent,'f = 4 Hz · d = 5 mm');
  for(const id of ['pen-value','ground-value','period-value','frequency-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('seismograph-equation').textContent,'T = d ÷ u');
  for(const key of ['viewTitle','readingGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(l.groundTag+' ×1000')&&ui.painted.includes('← 10 mm/s'));
 });
 test(`${lang}: the readings appear once it records, and the period is right on the first try`,()=>{
  ui.input('answer',2.5);assert.equal(ui.el('period-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('pen-value').textContent,num(m.pen(t),1));assert.equal(ui.el('ground-value').textContent,num(m.ground(t),3));assert.equal(ui.el('period-value').textContent,num(2.5));assert.equal(ui.el('frequency-value').textContent,num(.4));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.drawingCopy,{n:'0',y:num(m.pen(t),1),x:num(m.ground(t),3)}));assert.equal(ui.el('seismograph-equation').textContent,`T = d ÷ u = 25 ÷ 10 = ${num(2.5)} s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);
  assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes('d = '+num(25,1)+' mm')&&ui.painted.includes('a = 30 mm'));
 });
 test(`${lang}: the period for the frequency, then the frequency`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');ui.input('answer',2);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:'2 Hz'})+' '+l.slipPeriod);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('seismograph-equation').textContent,`f = u ÷ d = 20 ÷ 40 = ${num(.5)} Hz`);
  ui.input('answer',.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: the swing on the paper, then the ground's true amplitude`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'mm');ui.input('answer',30);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoMagnification));assert.ok(ui.painted.includes(l.guessTag+' ↕'));
  ui.input('answer',.03);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('seismograph-equation').textContent,`x = a ÷ M = 30 ÷ 1000 = ${num(.03,3)} mm`);
 });
 test(`${lang}: faster shaking, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'d =');ui.input('answer',5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('seismograph-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
  assert.equal(ui.el('seismograph-equation').textContent,`d = u ÷ f = 10 ÷ 2 = ${num(5,1)} mm`);
 });
 test(`${lang}: your paper speed drives the paper`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'u =');assert.equal(ui.el('answer-unit').textContent,'mm/s');ui.input('answer',1.25);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4,1.25)))+' '+fill(l.missCopy,{p:plain(1.25)+' mm/s'})+' '+l.slipDivided);
  ui.input('answer',20);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);assert.ok(ui.painted.includes('← 20 mm/s'));
  assert.equal(ui.el('seismograph-equation').textContent,`d = u ÷ f = 20 ÷ 4 = ${num(5,1)} mm`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',30);en.click('play');en.run(()=>en.el('seismograph-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoMagnification));en.input('answer',.03);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.03');assert.equal(es.el('seismograph-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('seismograph-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} seismograph amplitude, period, frequency, and multilingual interface checks passed.`);
