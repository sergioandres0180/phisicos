// Beat Tuner: beats between two close notes. f_b = |f₁ − f₂|, how far to retune a string to hear 1 beat a second, the time
// between beats T_b = 1 ÷ f_b, sharp or flat from the beats speeding up, a pitch gap from counted beats, the exact end of
// each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/beats.html'),'utf8'),copy=require('./locales/beats.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'beats-model'),pure);const Beats=pure.BeatsModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[4,3,.4,3,3],units=['Hz','Hz','s','Hz','Hz'],runs=[4,4,4,4,2];
const make=(i,a=expected[i])=>{const m=new Beats(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Beats(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),runs[i]);near(m.duration()/m.config.pace,4);});
});
test('the loudness swells |f₁ − f₂| times a second, and retuning halfway changes the rate without a jump',()=>{
 const m=make(0);near(m.loudness(0),1);near(m.loudness(1/8),0,1e-12);near(m.loudness(1/4),1);assert.equal(m.count(4),16);assert.equal(m.count(.24),0);assert.equal(m.count(.25),1);near(m.beat(3),4);
 const t=make(1);assert.equal(t.f2(1.99),444);assert.equal(t.f2(2),441);near(t.beat(1),4);near(t.beat(3),1);assert.equal(t.count(4),10);near(t.phase(2-1e-9),t.phase(2),1e-6);
 const s=make(3);assert.equal(s.f2(1),443);assert.equal(s.f2(3),445);assert.equal(s.count(4),16);
 near(make(2).loudness(.4),1);near(make(2).loudness(.2),0,1e-12);assert.equal(make(4).count(2),6);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,runs[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,4);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(3);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,884),'added');assert.equal(slip(0,442),'average');assert.equal(slip(0,2),'half');assert.equal(slip(0,6),null);
 assert.equal(slip(1,4),'toZero');assert.equal(slip(1,5),'pastTune');assert.equal(slip(1,1),'beatOnly');assert.equal(slip(1,2),null);
 assert.equal(slip(2,2.5),'rateInstead');assert.equal(slip(2,1/440),'notePeriod');assert.equal(slip(2,.2),'halved');assert.equal(slip(2,.6),null);
 assert.equal(slip(3,-3),'wrongSide');assert.equal(slip(3,5),'newBeats');assert.equal(slip(3,1),null);
 assert.equal(slip(4,6),'beatCount');assert.equal(slip(4,12),'multiplied');assert.equal(slip(4,1/3),'invertedDiff');assert.equal(slip(4,5),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Beats(0).setAnswer(bad),false);assert.equal(new Beats(0).setAnswer(1e4),true);
 for(const bad of [0,1001,-1001,NaN])assert.equal(new Beats(3).setAnswer(bad),false);assert.equal(new Beats(3).setAnswer(-3),true);
 const m=new Beats(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,-3);m.advance(1);const k=new Beats();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,-3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Beats(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'beats-model'),script(source,'beats-model'));
 return mount(html,{scripts:['beats-model','beats-interface'],locale:'beats-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−'),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Beats(i);return {b:num(m.exact(),1),p:num(m.exact())};};
 const ui=open(lang),done=()=>ui.el('beats-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'f_b =');assert.equal(ui.el('answer-unit').textContent,'Hz');
  assert.equal(ui.el('given-0').textContent,'f₁ = 440 Hz · f₂ = 444 Hz');assert.equal(ui.el('given-1').textContent,'440 Hz · 444 Hz → 1/s');assert.equal(ui.el('given-2').textContent,`f₁ = 440 Hz · f₂ = ${plain(442.5)} Hz`);
  assert.equal(ui.el('given-3').textContent,'440 Hz · 3/s → 5/s');assert.equal(ui.el('given-4').textContent,'330 Hz · N = 6 · t = 2 s');
  for(const id of ['f1-value','f2-value','beat-value','count-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('beats-equation').textContent,'f_b = |f₁ − f₂|');
  for(const key of ['viewTitle','loudGraph','panelHint','scaleNote','loudTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(1)})));assert.ok(ui.painted.includes('440 Hz')&&ui.painted.includes('444 Hz'));
 });
 test(`${lang}: the readings appear once the notes sound, and the beat rate is right on the first try`,()=>{
  ui.input('answer',4);assert.equal(ui.el('f1-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('f1-value').textContent,num(440,1));assert.equal(ui.el('f2-value').textContent,num(444,1));assert.equal(ui.el('beat-value').textContent,num(4,1));assert.equal(ui.el('count-value').textContent,'0');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.beatsCopy,{n:'0'}));
  assert.equal(ui.el('beats-equation').textContent,`f_b = |440 − 444| = ${num(4,1)} Hz`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));assert.equal(ui.el('count-value').textContent,'16');
 });
 test(`${lang}: tuning down to 1 beat a second, all the way to 440 Hz first, then 3 Hz`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Δf =');assert.equal(ui.el('answer-unit').textContent,'Hz');ui.input('answer',4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(4)+' Hz'})+' '+l.slipToZero);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes('441 Hz'));
  assert.equal(ui.el('beats-equation').textContent,`Δf = 444 − (440 + 1) = ${num(3,0)} Hz`);assert.equal(ui.el('f2-value').textContent,num(441,1));assert.equal(ui.el('beat-value').textContent,num(1,1));assert.equal(ui.el('count-value').textContent,'10');
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the time between beats, the rate first, then its inverse`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'T_b =');assert.equal(ui.el('answer-unit').textContent,'s');assert.equal(ui.el('beats-equation').textContent,'T_b = 1 ÷ f_b');ui.input('answer',2.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(2.5)+' s'})+' '+l.slipRateInstead);
  assert.equal(ui.el('beats-equation').textContent,`T_b = 1 ÷ f_b = 1 ÷ ${plain(2.5)} = ${num(.4)} s`);
  ui.input('answer',.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: sharp or flat, the wrong side first, then +3 Hz`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'Δf =');ui.input('answer',-3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(-3)+' Hz'})+' '+l.slipWrongSide);
  assert.equal(ui.el('beats-equation').textContent,`Δf = 443 − 440 = +${num(3,0)} Hz`);assert.equal(ui.el('f2-value').textContent,num(445,1));
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
 });
 test(`${lang}: counted beats give the pitch gap, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('beats-equation').textContent,'N = f_b·t');ui.input('answer',3);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('beats-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('beats-equation').textContent,`Δf = N ÷ t = 6 ÷ 2 = ${num(3,1)} Hz`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(.5)})));assert.equal(ui.el('count-value').textContent,'6');
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',-3);en.click('play');en.run(()=>en.el('beats-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWrongSide));en.input('answer',3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3');assert.equal(es.el('beats-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('beats-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} beat tuner and multilingual interface checks passed.`);
