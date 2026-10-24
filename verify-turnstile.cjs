// Charge Gate: a current is charge per second through a cut, I = Q ÷ t, so Q = I·t and t = Q ÷ I, and one ampere is
// 1 ÷ e electrons a second; each test's clock in its own unit, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/turnstile.html'),'utf8'),copy=require('./locales/turnstile.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'turnstile-model'),pure);const Gate=pure.TurnstileModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const e=1.602e-19,expected=[.5,600,1/e,10800,360],units=['A','C','e⁻/s','C','s'],tus=['min','min','s','h','s'],durations=[1,5,1,1.5,360];
const make=(i,a=expected[i])=>{const m=new Gate(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, clock unit, and length; every run takes 4 s on screen',()=>{
 expected.forEach((x,i)=>{const m=new Gate(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.config.tu,tus[i]);assert.equal(m.duration(),durations[i]);near(m.config.pace,durations[i]/4);});
});
test('the charge through the gate is Q = I·t with t turned into seconds, carried by Q ÷ e electrons',()=>{
 near(make(0).charge(1),30);near(make(0).charge(.5),15);near(make(1).charge(5),600);near(make(2).electrons(1),1/e);near(make(2).charge(1),1);
 near(make(3).charge(1.5),10800);near(make(3).charge(1),7200);near(make(4).charge(360),90);near(make(4).charge(180),45);assert.equal(make(0).charge(0),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e9);assert.equal(r.done,true);assert.equal(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,10);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(600);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,30),'perMinute');assert.equal(slip(0,2),'inverted');assert.equal(slip(0,1),null);
 assert.equal(slip(1,10),'lampMinutes');assert.equal(slip(1,.00667),'divided');assert.equal(slip(1,1200),null);
 assert.equal(slip(2,1.602e-19),'multiplied');assert.equal(slip(2,1e18),null);
 assert.equal(slip(3,3),'hours');assert.equal(slip(3,180),'phoneMinutes');assert.equal(slip(3,5400),null);
 assert.equal(slip(4,22.5),'timesCharge');assert.equal(slip(4,6),'waitMinutes');assert.equal(slip(4,90),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e30])assert.equal(new Gate(0).setAnswer(bad),false);assert.equal(new Gate(2).setAnswer(6e18),true);assert.equal(new Gate(1).setAnswer(1e-6),true);
 const m=new Gate(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,22.5);m.advance(100);const n=new Gate();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,100);assert.equal(n.answer,22.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:361},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Gate(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'turnstile-model'),script(source,'turnstile-model'));
 return mount(html,{scripts:['turnstile-model','turnstile-interface'],locale:'turnstile-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+' '+u;
 const values=[{x:num(.5,2)},{x:plain(600)},{x:plain(1/e)},{x:plain(10800)},{x:plain(360)}];
 const ui=open(lang),done=()=>ui.el('turnstile-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');assert.equal(ui.el('time-unit').textContent,'min');
  assert.equal(ui.el('given-0').textContent,fill(l.givenRate,{Q:plain(30),t:plain(1)}));assert.equal(ui.el('given-1').textContent,fill(l.givenLamp,{I:num(2,1),t:plain(5)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenElectrons,{I:plain(1),e:plain(e)}));assert.equal(ui.el('given-3').textContent,fill(l.givenPhone,{I:num(2,1),t:plain(1.5)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenWait,{I:plain(.25),Q:plain(90)}));
  for(const id of ['charge-value','current-value','electrons-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('turnstile-equation').textContent,'I = Q ÷ t');
  for(const key of ['viewTitle','countGraph','scaleNote','panelHint','gateTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('Q = ? C'));
 });
 test(`${lang}: thirty coulombs in a minute, right on the first try`,()=>{
  ui.input('answer',.5);assert.equal(ui.el('charge-value').textContent,'—');ui.click('step');assert.equal(ui.el('time-unit').textContent,'min');
  assert.ok(ui.el('lesson-copy').textContent.startsWith(l.countCopy.split('{')[0])||l.countCopy.startsWith('{'));assert.equal(ui.el('current-value').textContent,num(.5,2));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('time-value').textContent,num(1));assert.equal(ui.el('charge-value').textContent,num(30,1));assert.equal(ui.el('electrons-value').textContent,plain(30/e));
  assert.equal(ui.el('turnstile-equation').textContent,`I = Q ÷ t = 30 ÷ 60 = ${num(.5,2)} A`);assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,fill(l.dotNote,{q:'1 C'}),fill(l.paceNote,{t:plain(.25)+' min'}),l.guessTag+': '+plain(.5)+' A','Q = '+num(30,1)+' C',fill(l.timeAxis,{u:'min'})])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the lamp's charge with the time left in minutes, divided, then multiplied`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Q =');assert.equal(ui.el('answer-unit').textContent,'C');
  ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(10,'C'),'slipLampMinutes'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',.00667);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(1,amount(.00667,'C'),'slipDivided'));
  ui.input('answer',600);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('charge-value').textContent,num(600,1));assert.equal(ui.el('turnstile-equation').textContent,`Q = I·t = ${num(2,1)} × 300 = 600 C`);
 });
 test(`${lang}: electrons in one ampere, multiplied by e, then divided`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'N ÷ t =');assert.equal(ui.el('answer-unit').textContent,'e⁻/s');assert.equal(ui.el('time-unit').textContent,'s');
  ui.input('answer',1.602e-19);ui.click('play');ui.run(starts(l.electronCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(1.602e-19,'e⁻/s'),'slipMultiplied'));
  assert.ok(ui.painted.includes(l.electronGraph)&&ui.painted.includes('N = '+plain(1/e)+' e⁻')&&ui.painted.includes(fill(l.dotNote,{q:plain(1/30/e)+' e⁻'})));
  ui.input('answer',6.242e18);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('electrons-value').textContent,plain(1/e));assert.equal(ui.el('turnstile-equation').textContent,`N ÷ t = I ÷ e = 1 ÷ ${plain(e)} = ${plain(1/e)} e⁻/s`);
 });
 test(`${lang}: the phone's charge in hours, in minutes, then in seconds`,()=>{
  ui.click('mission-3');assert.equal(ui.el('time-unit').textContent,'h');ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(3,'C'),'slipHours'));
  ui.input('answer',180);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(180,'C'),'slipPhoneMinutes'));
  ui.input('answer',10800);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('time-value').textContent,num(1.5));assert.equal(ui.el('turnstile-equation').textContent,`Q = I·t = ${num(2,1)} × 5400 = 10800 C`);
 });
 test(`${lang}: the wait for 90 C, multiplied, in minutes, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('time-unit').textContent,'s');
  ui.input('answer',22.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(22.5,'s'),'slipTimesCharge'));assert.ok(ui.painted.includes(fill(l.targetTag,{Q:plain(90)})));
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(6,'s'),'slipWaitMinutes'));
  ui.input('answer',360);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('turnstile-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('charge-value').textContent,num(90,1));assert.equal(ui.el('turnstile-equation').textContent,`t = Q ÷ I = 90 ÷ ${plain(.25)} = 360 s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',10);en.click('play');en.run(()=>en.el('turnstile-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLampMinutes));en.input('answer',600);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'600');assert.equal(es.el('turnstile-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('turnstile-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} charge gate and multilingual interface checks passed.`);
