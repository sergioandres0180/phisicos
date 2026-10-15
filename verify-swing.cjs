// Swing and Resonance: energy in oscillations (m·g·h = ½·m·v², E = ½·k·A²), pushes and bumps added up exactly so that they
// build a big motion only at the natural period, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/swing.html'),'utf8'),copy=require('./locales/swing.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'swing-model'),pure);const Swing=pure.SwingModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const car=2*Math.PI*Math.sqrt(1000/25000),expected=[Math.PI,Math.sqrt(2*9.8*.2),1,10/Math.SQRT2,10*car],units=['s','m/s','J','cm','m'];
const make=(i,a=expected[i])=>{const m=new Swing(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Swing(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[1],1.97990,1e-5);near(expected[3],7.07107,1e-5);near(expected[4],12.5664,1e-5);});
test('pushes in time with the swing add up; out of time they mostly cancel',()=>{
 const m=make(0);near(m.natural(),Math.PI);assert.equal(m.impulses().length,5);near(m.impulses()[4],4*Math.PI);near(m.duration(),5*Math.PI);
 near(m.amplitude(),5*.07);near(m.amplitude()*180/Math.PI,20.0535,1e-5);
 for(const a of [2.6,4.2,1.571])assert.ok(make(0,a).amplitude()<.25*m.amplitude(),String(a));
 const late=m.duration(),w=m.omega();near(Math.hypot(m.position(late),m.rate(late)/w),m.amplitude());
 assert.equal(make(0,5).impulses().length,4);near(make(0,5).duration(),15+Math.PI);assert.equal(make(0,100).impulses().length,1);near(make(0,100).duration(),Math.PI);
 near(new Swing(0).interval(),Math.PI);near(m.position(0),0);near(m.rate(0),.07*w);
});
test('bumps at the car\'s natural period make it bounce the most',()=>{
 const m=make(4);near(m.natural(),car);near(m.interval(),car);near(m.amplitude(),.1);near(m.duration(),5*car);
 assert.ok(make(4,10).amplitude()<.0025);assert.ok(make(4,16).amplitude()<.025);near(make(4,10).interval(),1);
});
test('without friction the energy stays the same: m·g·h becomes ½·m·v², and ½·k·A² is shared at A ÷ √2',()=>{
 const b=make(1),T=b.natural();near(T,Math.PI);near(b.duration(),T);near(b.speed(T/4),expected[1]);near(b.stored(0),25*9.8*.2);near(b.kinetic(T/4),49);near(b.kinetic(0),0);
 for(let t=0;t<T;t+=.21)near(b.kinetic(t)+b.stored(t),49,1e-9);
 const e=make(2),P=e.natural();near(P,2*Math.PI/10);near(e.duration(),2);near(e.stored(0),1);near(e.kinetic(0),0);near(e.kinetic(P/4),1);
 for(let t=0;t<2;t+=.17)near(e.kinetic(t)+e.stored(t),1,1e-9);
 const h=make(3),x=h.exact()/100;near(200*x*x/2,.5);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,Math.PI],[0,5],[1,1.98],[2,1],[3,7],[4,12.57],[4,10]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(0);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(2);m.advance(10);assert.equal(m.score(),150);assert.equal(make(2).score(),0);
 const n=make(1,3.92);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.98);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.5),'noTwoPi');assert.equal(slip(0,1.571),'half');assert.equal(slip(0,.318),'frequency');assert.equal(slip(0,2.6),null);
 assert.equal(slip(1,3.92),'noRoot');assert.equal(slip(1,1.4),'noTwo');assert.equal(slip(1,6.93),'length');assert.equal(slip(1,2.5),null);
 assert.equal(slip(2,2),'noHalf');assert.equal(slip(2,10),'noSquare');assert.equal(slip(2,10000),'unitsCm');assert.equal(slip(2,4),null);
 assert.equal(slip(3,5),'halfway');assert.equal(slip(3,.0707),'unitsM');assert.equal(slip(3,8.66),null);
 assert.equal(slip(4,1.2566),'time');assert.equal(slip(4,2),'omega');assert.equal(slip(4,7.958),'multiplied');assert.equal(slip(4,10),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,100.001])assert.equal(new Swing(0).setAnswer(bad),false);assert.equal(new Swing(0).setAnswer(100),true);assert.equal(new Swing(2).setAnswer(1e7),true);assert.equal(new Swing(4).setAnswer(1e4+1),false);
 const m=new Swing(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0);m.advance(6);const n=new Swing();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,0);assert.equal(n.attempts,1);near(n.t,6);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:20},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Swing(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'swing-model'),script(source,'swing-model'));
 return mount(html,{scripts:['swing-model','swing-interface'],locale:'swing-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const joules=n=>num(n,Math.abs(n)<10?2:0);
 const values=m=>{const c=m.config,amp=m.amplitude(),x=c.ask==='half'?m.answer/100:0,pe=c.k?c.k*x*x/2:0,E=c.k?c.k*c.A**2/2:0;
  return {a:num(m.interval()),deg:num(amp*180/Math.PI,1),T:num(m.natural()),v:num(m.speed(m.natural()/4)),E:joules(E),x:num(x*100),pe:joules(pe),ke:joules(Math.max(E-pe,0)),d:num(m.answer),c:num(amp*100,1)};};
 const ui=open(lang),done=()=>ui.el('swing-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,`L = ${plain(2.45)} m`);assert.equal(ui.el('given-1').textContent,`L = ${plain(2.45)} m · h = ${plain(.2)} m`);assert.equal(ui.el('given-2').textContent,`k = 200 N/m · A = ${plain(.1)} m`);
  assert.equal(ui.el('given-3').textContent,'A = 10 cm');assert.equal(ui.el('given-4').textContent,'m = 1000 kg · k = 25000 N/m · v = 10 m/s');assert.equal(ui.el('equation-title').textContent,l.swingTitle);
  for(const id of ['natural-value','speed-value','kinetic-value','stored-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('swing-equation').textContent,'T₀ = 2π·√(L ÷ g)');
  for(const key of ['viewTitle','swingGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once it moves, and pushes at the right rhythm are right on the first try`,()=>{
  ui.input('answer',3.1416);assert.equal(ui.el('natural-value').textContent,'—');
  ui.click('step');const m=make(0,3.1416),t=12*3/120;
  assert.equal(ui.el('time-value').textContent,num(t));assert.equal(ui.el('natural-value').textContent,num(Math.PI));assert.equal(ui.el('speed-value').textContent,num(m.speed(t)));
  assert.equal(ui.el('kinetic-value').textContent,joules(m.kinetic(t)));assert.equal(ui.el('stored-value').textContent,joules(m.stored(t)));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{v:num(m.speed(t)),ke:joules(m.kinetic(t)),pe:joules(m.stored(t))}));
  assert.equal(ui.el('swing-equation').textContent,`T₀ = 2π·√(L ÷ g) = 2π × √(${plain(2.45)} ÷ ${plain(9.8)}) = ${num(Math.PI)} s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.equal(values(m).deg,num(20.1,1));assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: a forgotten square root, then the speed at the bottom`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');assert.equal(ui.el('swing-equation').textContent,'v = √(2·g·h)');
  ui.input('answer',3.92);ui.click('play');ui.run(done);const m=make(1,3.92);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(3.92)+' m/s'})+' '+l.slipNoRoot);assert.equal(values(m).v,num(1.98));
  assert.equal(ui.el('swing-equation').textContent,`v = √(2·g·h) = √(2 × ${plain(9.8)} × ${plain(.2)}) = ${num(1.98)} m/s`);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',1.98);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: the spring's stored energy, with the energy bars`,()=>{
  ui.click('mission-2');assert.equal(ui.el('equation-title').textContent,l.energyTitle);ui.input('answer',2);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoHalf));
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('swing-equation').textContent,`E = ½·k·A² = ½ × 200 × ${plain(.1)}² = ${joules(1)} J`);
  for(const key of ['energyGraph','motionShort','storedShort','guessTag'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: half and half, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'x =');ui.input('answer',7.07);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('swing-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  const m=make(3,7.07);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);assert.equal(values(m).pe,joules(.5));
 });
 test(`${lang}: the bump spacing that makes the car resonate`,()=>{
  ui.click('mission-4');assert.equal(ui.el('equation-title').textContent,l.bumpTitle);assert.equal(ui.el('answer-symbol').textContent,'d =');ui.input('answer',12.57);ui.click('play');ui.run(done);
  const m=make(4,12.57);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+l.why4);assert.equal(values(m).c,num(10,1));
  assert.equal(ui.el('swing-equation').textContent,`d = v·T₀ → 10 × ${num(1.257)} s = ${num(12.57)} m`);assert.ok(ui.painted.includes(l.bounceGraph));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',1.2566);en.click('play');en.run(()=>en.el('swing-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipTime));en.input('answer',12.57);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'12.57');assert.equal(es.el('swing-status-text').textContent,copy.es.paused);assert.equal(es.el('equation-title').textContent,copy.es.bumpTitle);
 es.click('play');es.run(()=>es.el('swing-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} swing and resonance energy and multilingual interface checks passed.`);
