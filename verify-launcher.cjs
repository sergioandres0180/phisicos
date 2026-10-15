// Spring Launcher: energy stored in a spring (½·k·x²) turning into motion and height, a pinball, a rocket, aiming with your
// own push, doubling the push, a cart squashing a buffer, energy conservation, the exact end of each run, slips, scoring,
// and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/launcher.html'),'utf8'),copy=require('./locales/launcher.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'launcher-model'),pure);const Launcher=pure.LauncherModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[.05*Math.sqrt(4000),800*.0064/(2*.05*g),Math.sqrt(2*.1*g*2/500)*100,4,30],units=['m/s','m','cm','','cm'];
const make=(i,a=expected[i])=>{const m=new Launcher(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Launcher(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[0],3.16228,1e-5);near(expected[1],5.22449,1e-5);near(expected[2],8.85438,1e-5);});
test('the spring stores ½·k·x² and hands it on',()=>{
 near(new Launcher(0).stored(),.5);near(new Launcher(1).stored(),2.56);near(new Launcher(3).stored(),10.24);near(new Launcher(4).stored(),9);
 const p=make(0);near(p.launch(),expected[0]);near(p.state(.5).pos,p.launch()*.5);near(p.energies(.5).motion,.5);near(p.energies(0).stored,.5);near(p.state(1.5).pos,4);
 const r=make(1),T=r.duration();near(T,2*Math.sqrt(2*g*expected[1])/g);near(r.state(T/2).height,expected[1]);near(r.state(T).height,0,1e-9);
 for(let t=.01;t<T;t+=.13){const e=r.energies(t);near(e.motion+e.height,2.56,1e-9);}
});
test('aiming uses your push; doubling the push stores four times the energy',()=>{
 near(new Launcher(2).top(),2);near(make(2,10).top(),500*.01/(2*.1*g));near(make(2,10).push(),.1);
 const d=make(3);near(d.push(),.16);near(d.top()/d.top(.08),4);near(d.stored()/(800*.0064/2),4);
});
test('the cart squashes the buffer until its motion is all stored, then is pushed back',()=>{
 const b=make(4),w=b.omega(),t1=1/3,peak=t1+Math.PI/(2*w);near(w,10);near(b.state(peak).squash,.3);near(b.state(peak).v,0,1e-12);near(b.energies(peak).stored,9);
 for(let t=0;t<b.duration();t+=.07){const e=b.energies(t);near(e.stored+e.motion,9,1e-9);}near(b.state(b.duration()).pos,-1);near(b.duration(),2/3+Math.PI/10);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,3],[1,5],[2,8.85],[2,20],[3,4],[4,30]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,10.45);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(5.22);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,10),'noRootSpeed');assert.equal(slip(0,316.2),'unitsCm');assert.equal(slip(0,4.472),'extraTwo');assert.equal(slip(0,2),null);
 assert.equal(slip(1,10.45),'noHalf');assert.equal(slip(1,65.3),'noSquare');assert.equal(slip(1,51.2),'noG');assert.equal(slip(1,3),null);
 assert.equal(slip(2,.784),'noRootPush');assert.equal(slip(2,.0885),'unitsM');assert.equal(slip(2,6.261),'noTwo');assert.equal(slip(2,12),null);
 assert.equal(slip(3,2),'linear');assert.equal(slip(3,8),'cubed');assert.equal(slip(3,1.414),'root');assert.equal(slip(3,3),null);
 assert.equal(slip(4,3),'noRootSquash');assert.equal(slip(4,.3),'unitsM');assert.equal(slip(4,42.43),'extraTwo');assert.equal(slip(4,20),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Launcher(0).setAnswer(bad),false);assert.equal(new Launcher(0).setAnswer(1e4),true);assert.equal(new Launcher(2).setAnswer(100),true);assert.equal(new Launcher(2).setAnswer(100.1),false);
 const m=new Launcher(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,5);m.advance(1);const n=new Launcher();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Launcher(2);assert.equal(k.restore(bad),false);assert.equal(k.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'launcher-model'),script(source,'launcher-model'));
 return mount(html,{scripts:['launcher-model','launcher-interface'],locale:'launcher-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const joules=n=>num(n,Math.abs(n)<10?2:1);
 const values=m=>{const c=m.config;return {v:num(m.launch()),h:num(m.top()),h1:num(m.top(c.x)),x:num(m.push()*100,1),E:joules(m.stored()),r:num(c.scale?c.scale**2:0,1),s:num(m.exact(),1)};};
 const ui=open(lang),done=()=>ui.el('launcher-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,'k = 400 N/m · x = 5 cm · m = 100 g');assert.equal(ui.el('given-1').textContent,'k = 800 N/m · x = 8 cm · m = 50 g');assert.equal(ui.el('given-2').textContent,'k = 500 N/m · m = 100 g · h = 2 m');
  assert.equal(ui.el('given-3').textContent,'x = 8 cm → ×2');assert.equal(ui.el('given-4').textContent,'k = 200 N/m · m = 2 kg · v = 3 m/s');
  for(const id of ['speed-value','height-value','squash-value','stored-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('launcher-equation').textContent,'½·k·x² = ½·m·v²');
  for(const key of ['viewTitle','energyGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('4 m'));
 });
 test(`${lang}: the readings appear once it launches, and the pinball's speed is right on the first try`,()=>{
  ui.input('answer',3.162);assert.equal(ui.el('speed-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120,st=m.state(t),en=m.energies(t);
  assert.equal(ui.el('speed-value').textContent,num(st.v));assert.equal(ui.el('squash-value').textContent,num(0,1));assert.equal(ui.el('stored-value').textContent,joules(0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.launchingCopy,{v:num(st.v),pe:joules(en.stored),ke:joules(en.motion),he:joules(en.height)}));
  assert.equal(ui.el('launcher-equation').textContent,`v = x·√(k ÷ m) = ${plain(.05)} × √(400 ÷ ${plain(.1)}) = ${num(expected[0])} m/s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: a forgotten ½, then the rocket's height`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',10.45);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(10.45)+' m'})+' '+l.slipNoHalf);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('launcher-equation').textContent,`h = k·x² ÷ (2·m·g) = 800 × ${plain(.08)}² ÷ (2 × ${plain(.05)} × ${plain(9.8)}) = ${num(expected[1])} m`);
  ui.input('answer',5.22);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: your push sends the rocket to the platform`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',8.85);ui.click('play');ui.run(done);
  const m=make(2,8.85);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(m))+' '+l.why2);
  assert.equal(ui.el('launcher-equation').textContent,`h = k·x² ÷ (2·m·g) = 500 × ${plain(.0885)}² ÷ (2 × ${plain(.1)} × ${plain(9.8)}) = ${num(m.top())} m`);assert.ok(ui.painted.includes(fill(l.targetTag,{h:'2'})));
 });
 test(`${lang}: double the push`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h₂ ÷ h₁ =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',2);ui.click('play');ui.run(done);
  const m=make(3);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:'2'})+' '+l.slipLinear);
  ui.input('answer',4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('launcher-equation').textContent,`h ∝ x² → (${plain(m.push()*100)} ÷ ${plain(8)})² = 4`);assert.ok(ui.painted.includes(l.compareGraph));
 });
 test(`${lang}: the buffer stop, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',30);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('launcher-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('launcher-equation').textContent,`x = v·√(m ÷ k) = 3 × √(2 ÷ 200) = ${num(30,1)} cm`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',10.45);en.click('play');en.run(()=>en.el('launcher-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoHalf));en.input('answer',5.22);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'5.22');assert.equal(es.el('launcher-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('launcher-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} spring launcher energy and multilingual interface checks passed.`);
