// Strobe Freeze: frequency and the strobe effect. Freezing a wave (your flash rate drives the lamp), the creep f − f_s,
// a frequency from the creep, a spoked wheel that looks still (your turning rate drives it), the speed of a frozen wave, the
// images the eye holds, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/strobe.html'),'utf8'),copy=require('./locales/strobe.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'strobe-model'),pure);const Strobe=pure.StrobeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[25,1,42,3,125],units=['Hz','Hz','Hz','Hz','cm/s'];
const make=(i,a=expected[i])=>{const m=new Strobe(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Strobe(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});});
test('one flash per cycle freezes the wave: every flash shows the same picture',()=>{
 const m=make(0);near(m.flashRate(),25);near(m.seen(),0);const taus=m.flashes(2);assert.equal(taus.length,3);for(const tau of taus)for(const x of [0,7,13])near(m.height(x,tau),m.height(x,2),1e-9);
 near(make(0,12.5).seen(),0);near(Math.abs(make(0,50).seen()),25);near(m.height(5,.04),m.height(5,0),1e-9);
});
test('a slightly faster wave creeps forward at f − f_s',()=>{
 const m=make(1);near(m.seen(),1);const a=m.flashes(1)[0],b=a+1/25;near(((m.config.f*b-m.config.f*a)%1+1)%1,1/25,1e-9);
 near(make(2).seen(),2);near(make(2).motion(),42);
});
test('the wheel looks still when each spoke moves to the next one\'s place between flashes',()=>{
 const w=make(3);near(w.turnRate(),3);near(w.motion(),24);near(w.seen(),0);const step=w.angle(1/24);near(step,2*Math.PI/8);
 near(make(3,6).seen(),0);near(Math.abs(make(3,1.5).seen()),12);
});
test('the eye holds the last tenth of a second of flashes, newest first',()=>{
 const m=make(2);const f=m.flashes(1);assert.equal(f.length,5);near(f[0],1);assert.ok(f.every((tau,i)=>!i||tau<f[i-1]));assert.ok(1-f[f.length-1]<=.1+1e-9);assert.equal(m.count(1),41);assert.equal(m.flashes(0).length,0);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,25],[1,1],[2,42],[3,3],[4,125]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,51);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,12.5),'half');assert.equal(slip(0,50),'double');assert.equal(slip(0,.04),'period');assert.equal(slip(0,30),null);
 assert.equal(slip(1,51),'added');assert.equal(slip(1,1.04),'ratio');assert.equal(slip(1,3),null);
 assert.equal(slip(2,38),'subtracted');assert.equal(slip(2,2),'creepOnly');assert.equal(slip(2,40),'strobeOnly');assert.equal(slip(2,50),null);
 assert.equal(slip(3,24),'noSpokes');assert.equal(slip(3,192),'times');assert.equal(slip(3,1.5),'halfway');assert.equal(slip(3,5),null);
 assert.equal(slip(4,.2),'divided');assert.equal(slip(4,5),'inverted');assert.equal(slip(4,1.25),'metresPerSecond');assert.equal(slip(4,100),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1001])assert.equal(new Strobe(0).setAnswer(bad),false);assert.equal(new Strobe(0).setAnswer(1000),true);assert.equal(new Strobe(4).setAnswer(1e6),true);
 const m=new Strobe(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,2);m.advance(1);const n=new Strobe();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1);near(n.turnRate(),2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Strobe(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'strobe-model'),script(source,'strobe-model'));
 return mount(html,{scripts:['strobe-model','strobe-interface'],locale:'strobe-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const c=Strobe.missions[i];return {s:plain(c.ask==='flash'?c.f:c.fs),d:plain(c.ask==='drift'?c.f-c.fs:2),f:plain(c.f??0),r:plain(c.fs/(c.spokes||1)),v:plain(c.f*(c.l||0))};};
 const ui=open(lang),done=()=>ui.el('strobe-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'f_s =');assert.equal(ui.el('answer-unit').textContent,'Hz');
  assert.equal(ui.el('given-0').textContent,'f = 25 Hz');assert.equal(ui.el('given-1').textContent,'f = 26 Hz · f_s = 25 Hz');assert.equal(ui.el('given-2').textContent,'f_s = 40 Hz · f_seen = 2 Hz');
  assert.equal(ui.el('given-3').textContent,'n = 8 · f_s = 24 Hz');assert.equal(ui.el('given-4').textContent,'f = 25 Hz · λ = 5 cm');
  for(const id of ['flash-value','motion-value','seen-value','count-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('strobe-equation').textContent,'f_seen = f − f_s');
  for(const key of ['viewTitle','samplingGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(plain(60)+' cm'));
 });
 test(`${lang}: the readings appear once the strobe starts, and the freezing rate is right on the first try`,()=>{
  ui.input('answer',25);assert.equal(ui.el('flash-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('flash-value').textContent,'25');assert.equal(ui.el('motion-value').textContent,'25');assert.equal(ui.el('seen-value').textContent,num(0));assert.equal(ui.el('count-value').textContent,'3');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.flashingCopy,{n:'3',d:num(0)}));
  assert.equal(ui.el('strobe-equation').textContent,`f_s = f = ${num(25,0)} Hz`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
 });
 test(`${lang}: adding the rates, then the creep`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'f_seen =');ui.input('answer',51);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(51)+' Hz'})+' '+l.slipAdded);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('seen-value').textContent,num(1));assert.equal(ui.el('strobe-equation').textContent,`f_seen = f − f_s = 26 − 25 = ${num(1,0)} Hz`);
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: a frequency measured from the creep`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'f =');ui.input('answer',42);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('strobe-equation').textContent,`f = f_s + f_seen = 40 + 2 = ${num(42,0)} Hz`);
 });
 test(`${lang}: the wheel at the flash rate, then the slowest still speed`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'f_rot =');assert.equal(ui.el('strobe-equation').textContent,'f_rot·n = f_s');ui.input('answer',24);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(24)+' Hz'})+' '+l.slipNoSpokes);
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('motion-value').textContent,'24');assert.equal(ui.el('strobe-equation').textContent,`f_rot = f_s ÷ n = 24 ÷ 8 = ${num(3,0)} Hz`);
 });
 test(`${lang}: the frozen wave's speed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'cm/s');ui.input('answer',125);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('strobe-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('strobe-equation').textContent,`v = f·λ = 25 × 5 = ${num(125,0)} cm/s`);assert.ok(ui.painted.includes(plain(14)+' cm'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',51);en.click('play');en.run(()=>en.el('strobe-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipAdded));en.input('answer',1);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1');assert.equal(es.el('strobe-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('strobe-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} strobe frequency and multilingual interface checks passed.`);
