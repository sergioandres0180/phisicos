// Metronome Studio: period and frequency (f = 1 ÷ T), tempo (60·f), counting beats, two metronomes meeting after a whole
// number of beats of each, the ghost metronome at your rate, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/metronome.html'),'utf8'),copy=require('./locales/metronome.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'metronome-model'),pure);const Metronome=pure.MetronomeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[.5,90,2.4,1.25,1],units=['s','bpm','Hz','Hz','s'];
const make=(i,a=expected[i])=>{const m=new Metronome(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Metronome(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});});
test('the period and the frequency are inverses, and the tempo is 60·f',()=>{
 const f=[2,1.5,2.4,1.25,2];f.forEach((x,i)=>{const m=new Metronome(i);near(m.frequency(),x);near(m.period()*m.frequency(),1);});
 assert.equal(new Metronome(4).second(),3);assert.equal(new Metronome(0).second(),null);near(new Metronome(0).frequency()*60,120);
});
test('the ghost metronome ticks at the rate your answer gives',()=>{
 near(make(0,.5).guessFrequency(),2);near(make(0,.25).guessFrequency(),4);near(make(1,90).guessFrequency(),1.5);near(make(2,3).guessFrequency(),3);near(make(3,1.25).guessFrequency(),1.25);
 assert.equal(make(4,1).guessFrequency(),null);assert.equal(new Metronome(0).guessFrequency(),null);
});
test('the arm clicks at the left once per full swing, and full beats are counted after the first click',()=>{
 const m=make(0);near(m.angle(0),-25);near(m.angle(.25),25);near(m.angle(.5),-25);
 const c=make(2);assert.equal(c.beats(10),24);assert.equal(c.beats(9.99),23);assert.equal(c.beats(0),0);near(c.since(.43),.43-1/2.4);near(c.since(5),0,1e-9);
});
test('two metronomes click together after a whole number of beats of each',()=>{
 const m=make(4);near(m.meeting(),1);assert.equal(m.beats(1,2),2);assert.equal(m.beats(1,3),3);assert.equal(m.beats(3,2),6);assert.equal(m.beats(3,3),9);assert.equal(new Metronome(0).meeting(),null);
});
test('every run ends exactly inside long steps',()=>{
 assert.deepEqual([0,1,2,3,4].map(i=>new Metronome(i).duration()),[4,4,10,4,3]);
 for(const [i,a] of [[0,.5],[1,90],[2,2.4],[3,1.25],[4,1]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(2);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,40);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(90);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2),'frequency');assert.equal(slip(0,.00833),'perMinute');assert.equal(slip(0,1),null);
 assert.equal(slip(1,.025),'divided');assert.equal(slip(1,40),'inverted');assert.equal(slip(1,.667),'periodNotTempo');assert.equal(slip(1,60),null);
 assert.equal(slip(2,.4167),'periodNotFrequency');assert.equal(slip(2,240),'timesTime');assert.equal(slip(2,144),'bpm');assert.equal(slip(2,2),null);
 assert.equal(slip(3,.8),'same');assert.equal(slip(3,75),'bpm');assert.equal(slip(3,7.854),'omega');assert.equal(slip(3,1),null);
 assert.equal(slip(4,.5),'firstPeriod');assert.equal(slip(4,.333),'secondPeriod');assert.equal(slip(4,6),'product');assert.equal(slip(4,.2),'added');assert.equal(slip(4,2),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e3+1])assert.equal(new Metronome(0).setAnswer(bad),false);assert.equal(new Metronome(0).setAnswer(1e3),true);assert.equal(new Metronome(1).setAnswer(1e5),true);assert.equal(new Metronome(1).setAnswer(1e5+1),false);
 const m=new Metronome(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2);m.advance(5);const n=new Metronome();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:11},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Metronome(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'metronome-model'),script(source,'metronome-model'));
 return mount(html,{scripts:['metronome-model','metronome-interface'],locale:'metronome-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config,f=m.frequency(),meet=m.meeting();
  return {bpm:num(60*f,0),T:num(1/f),f:num(f),n:plain(c.beats??0),t:plain(c.span??0),f1:plain(c.f1??0),f2:plain(c.f2??0),c:meet===null?'':num(meet),n1:meet===null?'':plain(meet*(c.f1??0)),n2:meet===null?'':plain(meet*(c.f2??0))};};
 const ui=open(lang),done=()=>ui.el('metronome-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,'120 bpm');assert.equal(ui.el('given-1').textContent,`f = ${plain(1.5)} Hz`);assert.equal(ui.el('given-2').textContent,'n = 24 · t = 10 s');
  assert.equal(ui.el('given-3').textContent,`T = ${plain(.8)} s`);assert.equal(ui.el('given-4').textContent,'f₁ = 2 Hz · f₂ = 3 Hz');
  for(const id of ['beats-value','period-value','frequency-value','tempo-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('metronome-equation').textContent,'f = 1 ÷ T');
  for(const key of ['viewTitle','timelineGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('f = ?'));
 });
 test(`${lang}: the readings appear once it ticks, and the period of a tempo is right on the first try`,()=>{
  ui.input('answer',.5);assert.equal(ui.el('period-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag+' · '+num(2)+' Hz'));
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('beats-value').textContent,'0');assert.equal(ui.el('period-value').textContent,num(.5));assert.equal(ui.el('frequency-value').textContent,num(2));assert.equal(ui.el('tempo-value').textContent,num(120,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.tickingCopy,{n:'0',t:num(t)}));assert.equal(ui.el('metronome-equation').textContent,`T = 60 ÷ tempo = 60 ÷ 120 = ${num(.5)} s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('beats-value').textContent,'8');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: an inverted tempo, then hertz to beats per minute`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'tempo =');assert.equal(ui.el('answer-unit').textContent,'bpm');ui.input('answer',40);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:'40 bpm'})+' '+l.slipInverted);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('metronome-equation').textContent,`tempo = 60·f = 60 × ${plain(1.5)} = ${num(90,0)} bpm`);
  ui.input('answer',90);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: counting 24 beats in 10 s`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');ui.input('answer',2.4);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('beats-value').textContent,'24');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('metronome-equation').textContent,`f = n ÷ t = 24 ÷ 10 = ${num(2.4)} Hz`);
 });
 test(`${lang}: a period to a frequency, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',1.25);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('metronome-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
  assert.equal(ui.el('metronome-equation').textContent,`f = 1 ÷ T = 1 ÷ ${plain(.8)} = ${num(1.25)} Hz`);
 });
 test(`${lang}: one metronome's period, then when both click together`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');ui.input('answer',.5);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipFirstPeriod));
  ui.input('answer',1);ui.click('play');ui.run(done);const m=make(4);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('beats-value').textContent,'6 · 9');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+l.why4);assert.ok(ui.painted.includes('2 Hz')&&ui.painted.includes('3 Hz')&&ui.painted.includes(l.guessTag));
  assert.equal(ui.el('metronome-equation').textContent,`T₁ = 1 ÷ 2 = ${num(.5)} s · T₂ = 1 ÷ 3 = ${num(1/3)} s → ${num(1)} s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',40);en.click('play');en.run(()=>en.el('metronome-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipInverted));en.input('answer',90);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'90');assert.equal(es.el('metronome-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('metronome-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} metronome studio period, frequency, and multilingual interface checks passed.`);
