// Pendulum Clock: the period of a simple pendulum (T = 2π·√(L ÷ g)), a seconds pendulum, a double-period pendulum, the
// Moon, a heavier bob, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/pendulum.html'),'utf8'),copy=require('./locales/pendulum.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'pendulum-model'),pure);const Pendulum=pure.PendulumModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=2*Math.PI,period=(L,g=9.8)=>P*Math.sqrt(L/g);
const expected=[9.8/Math.PI**2,period(.5),1.44,period(1,1.62),period(.8)],units=['m','s','m','s','s'];
const make=(i,a=expected[i])=>{const m=new Pendulum(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Pendulum(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[0],.99295,1e-5);near(expected[1],1.41923,1e-5);near(expected[3],4.93654,1e-5);near(expected[4],1.79520,1e-5);});
test('the period depends only on the length and g, not on the mass or the swing',()=>{
 near(make(1).real(),period(.5));near(make(4).real(),period(.8));near(make(3).real(),period(1,1.62));near(make(3).real()/period(1),Math.sqrt(9.8/1.62));
 near(new Pendulum(0).length(),1);near(new Pendulum(2).length(),.36);near(make(0,.5).length(),.5);near(make(2,2).length(),2);near(new Pendulum(1).length(),.5);
 const m=make(1);near(m.angle(0),10);near(m.angle(m.real()/2),-10);near(m.angle(m.real()/4),0,1e-9);near(m.swings(m.real()),1);
});
test('a length test swings for the period wanted, and the double test beside the short pendulum',()=>{
 near(make(0,.5).duration(),2);near(make(0,3).duration(),2);near(make(0).target(),2);near(make(0).real(),2);
 const d=make(2);near(d.reference(),period(.36));near(d.target(),2*period(.36));near(d.duration(),2.40851,1e-5);near(d.real(),d.target());near(d.referenceAngle(0),10);near(d.referenceAngle(period(.36)/2),-10);
 assert.equal(make(1).reference(),null);assert.equal(make(1).referenceAngle(.3),0);near(make(1).duration(),period(.5));near(make(3).duration(),period(1,1.62));
 const k=make(2);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);near(k.angle(100),k.angle(k.duration()));
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,.99],[0,3],[1,1.4],[2,1.44],[3,2],[4,1.8]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,.32);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.42);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);assert.equal(n.evaluate().first,false);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,39.2),'noTwoPi');assert.equal(slip(0,3.119),'noSquare');assert.equal(slip(0,.2482),'halfPeriod');assert.equal(slip(0,2),null);
 assert.equal(slip(1,.2259),'noTwoPi');assert.equal(slip(1,27.82),'inverted');assert.equal(slip(1,.3206),'noRoot');assert.equal(slip(1,3),null);
 assert.equal(slip(2,.72),'doubled');assert.equal(slip(2,.5091),'root');assert.equal(slip(2,1),null);
 assert.equal(slip(3,2.007),'earthG');assert.equal(slip(3,.7857),'noTwoPi');assert.equal(slip(3,.6),null);
 assert.equal(slip(4,3.59),'massMatters');assert.equal(slip(4,.8976),'massMatters');assert.equal(slip(4,.2857),'noTwoPi');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Pendulum(0).setAnswer(bad),false);assert.equal(new Pendulum(1).setAnswer(1e4),true);
 const m=new Pendulum(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.equal(m.evaluate().ok,false);assert.throws(()=>make(0).advance(-1));assert.throws(()=>make(0).advance(NaN));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,2);m.advance(1.5);const n=new Pendulum();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Pendulum();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'pendulum-model'),script(source,'pendulum-model'));
 return mount(html,{scripts:['pendulum-model','pendulum-interface'],locale:'pendulum-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const r=m.reference(),T=m.real();return {L:num(m.length()),T:num(T),h:num(T/2),T1:r===null?'':num(r),n:r===null?'':num(T/r)};};
 const ui=open(lang),done=()=>ui.el('pendulum-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'T = 2 s');assert.equal(ui.el('given-1').textContent,`L = ${plain(.5)} m`);assert.equal(ui.el('given-2').textContent,`L₁ = ${plain(.36)} m · T₂ = 2·T₁`);
  assert.equal(ui.el('given-3').textContent,`L = 1 m · g = ${plain(1.62)} m/s²`);assert.equal(ui.el('given-4').textContent,`L = ${plain(.8)} m · m = ${plain(.5)} kg → 2 kg`);
  for(const id of ['length-value','period-value','swings-value','angle-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('pendulum-equation').textContent,'T = 2π·√(L ÷ g)');
  for(const key of ['viewTitle','graphTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once it swings, and the seconds pendulum is right on the first try`,()=>{
  ui.input('answer',.993);assert.equal(ui.el('period-value').textContent,'—');assert.equal(ui.el('lesson-copy').textContent,l.readyCopy);
  ui.click('step');const m=make(0,.993),t=12/120;
  assert.equal(ui.el('length-value').textContent,num(.993));assert.equal(ui.el('period-value').textContent,num(m.real()));assert.equal(ui.el('swings-value').textContent,num(m.swings(t)));assert.equal(ui.el('angle-value').textContent,num(m.angle(t),1));
  assert.equal(ui.el('pendulum-equation').textContent,`T = 2π·√(L ÷ g) = 2π × √(${num(.993)} ÷ ${plain(9.8)}) = ${num(m.real())} s`);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.swingingCopy,{n:num(m.swings(t)),T:num(m.real())}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(fill(l.targetTag,{T:num(2)})));
 });
 test(`${lang}: a forgotten square root, then the short pendulum's period`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',.3206);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(make(1)))+' '+fill(l.missCopy,{p:plain(.3206)+' s'})+' '+l.slipNoRoot);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',1.42);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(make(1)))+' '+l.why1);
 });
 test(`${lang}: the double-period pendulum beside the short one, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'L₂ =');ui.input('answer',1.44);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('pendulum-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  const m=make(2);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(m))+' '+l.why2);assert.ok(values(m).n===num(2));assert.ok(ui.painted.includes(fill(l.targetTag,{T:num(m.target())})));
 });
 test(`${lang}: Earth's g on the Moon, then the Moon's period`,()=>{
  ui.click('mission-3');ui.input('answer',2.007);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipEarthG));
  ui.input('answer',4.94);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
 });
 test(`${lang}: the heavier bob keeps the same period`,()=>{
  ui.click('mission-4');ui.input('answer',3.59);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipMassMatters));
  ui.input('answer',1.8);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);assert.ok(ui.painted.includes('2 kg'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',2.007);en.click('play');en.run(()=>en.el('pendulum-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipEarthG));en.input('answer',4.94);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'4.94');assert.equal(es.el('pendulum-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('pendulum-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} pendulum clock period and multilingual interface checks passed.`);
