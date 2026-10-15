// Sound in Slow Motion: sound as a longitudinal wave at 340 m/s. The squeezes of a note, one vibration in ms, a storm's
// distance from its thunder, a cliff from its echo, the highest note's wavelength in cm, slowed tones, the exact end of each
// run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/sound.html'),'utf8'),copy=require('./locales/sound.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'sound-model'),pure);const Sound=pure.SoundModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[1,1000/440,1020,340,1.7],units=['m','ms','m','m','cm'];
const make=(i,a=expected[i])=>{const m=new Sound(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Sound(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});assert.equal(Sound.v,340);near(expected[1],2.27273,1e-5);});
test('tones are slowed down by their own frequency: one vibration per second on screen',()=>{
 const m=make(0);near(m.duration(),3);near(m.real(1),1/340);near(m.travelled(3),3);near(m.wavelength(),1);
 const a=make(1);near(a.real(3),3/440);near(a.travelled(1),340/440);
});
test('the air moves back and forth along the path, in squeezes λ apart, and is still ahead of the sound',()=>{
 const m=make(0);for(const x of [.1,.45,.8])near(m.pressure(x,2.6),m.pressure(x+1,2.6),1e-9);assert.equal(m.shift(2.5,2),0);assert.equal(m.pressure(2.5,2),0);
 near(m.pressure(0,1),1);near(m.shift(0,1.25),1);const t=make(4);near(t.wavelength(),.017);for(const x of [.002,.009])near(t.pressure(x,2),t.pressure(x+.017,2),1e-9);
});
test('the thunder and the echo travel at 340 m/s in real time',()=>{
 const th=make(2);near(th.duration(),3.4);near(th.front(0),1020);near(th.front(1),680);near(th.front(3),0);near(th.front(3.4),0);
 const e=make(3);near(e.duration(),2.3);near(e.front(.5),170);near(e.front(1),340);near(e.front(1.5),170);near(e.front(2),0);near(e.travelled(2),680);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,1],[1,2.27],[2,1020],[3,680],[4,1.7]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(2);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(3,680);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(340);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,115600),'multiplied');assert.equal(slip(0,1/340),'periodInstead');assert.equal(slip(0,2),null);
 assert.equal(slip(1,.00227),'seconds');assert.equal(slip(1,.773),'wavelengthInstead');assert.equal(slip(1,440),null);
 assert.equal(slip(2,113.3),'divided');assert.equal(slip(2,510),'halved');assert.equal(slip(2,1.02),'kilometres');assert.equal(slip(2,3000),null);
 assert.equal(slip(3,680),'roundTrip');assert.equal(slip(3,170),'divided');assert.equal(slip(3,.34),'kilometres');assert.equal(slip(3,1000),null);
 assert.equal(slip(4,.017),'unitsM');assert.equal(slip(4,17),'unitsMm');assert.equal(slip(4,5),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e7+1])assert.equal(new Sound(0).setAnswer(bad),false);assert.equal(new Sound(0).setAnswer(1e7),true);
 const m=new Sound(2);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,500);m.advance(1);const n=new Sound();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Sound(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'sound-model'),script(source,'sound-model'));
 return mount(html,{scripts:['sound-model','sound-interface'],locale:'sound-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config,tone=m.tone(),w=tone?m.wavelength():0;return {f:tone?plain(c.f):'',l:c.ask==='tiny'?num(w*100):num(w),T:tone?num(1000/c.f):'',t:plain(c.delay??0),d:tone?'':num(m.exact(),0)};};
 const ui=open(lang),done=()=>ui.el('sound-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'f = 340 Hz · v = 340 m/s');assert.equal(ui.el('given-1').textContent,'f = 440 Hz');assert.equal(ui.el('given-2').textContent,'t = 3 s · v = 340 m/s');
  assert.equal(ui.el('given-3').textContent,'t = 2 s · v = 340 m/s');assert.equal(ui.el('given-4').textContent,'f = 20000 Hz · v = 340 m/s');
  for(const id of ['frequency-value','wavelength-value','period-value','travel-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('sound-equation').textContent,'v = f·λ');
  for(const key of ['viewTitle','pressureGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(fill(l.slowTag,{n:'340'})));
 });
 test(`${lang}: the readings appear once the note plays, and its wavelength is right on the first try`,()=>{
  ui.input('answer',1);assert.equal(ui.el('wavelength-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('frequency-value').textContent,'340');assert.equal(ui.el('wavelength-value').textContent,num(1,3));assert.equal(ui.el('period-value').textContent,num(1000/340,3));assert.equal(ui.el('travel-value').textContent,num(m.travelled(t),3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.vibratingCopy,{n:num(t,1),d:num(m.travelled(t),3)}));
  assert.equal(ui.el('sound-equation').textContent,`λ = v ÷ f = 340 ÷ 340 = ${num(1)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: one vibration given in seconds, then in ms`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'ms');ui.input('answer',.00227);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(.00227)+' ms'})+' '+l.slipSeconds);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('sound-equation').textContent,`T = 1 ÷ f = 1 ÷ 440 = ${num(1000/440)} ms`);
  ui.input('answer',2.27);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: how far away the storm is`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',1020);
  ui.click('step');const m=make(2),t=12/120;assert.equal(ui.el('frequency-value').textContent,'—');assert.equal(ui.el('travel-value').textContent,num(m.travelled(t),0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.travellingCopy,{d:num(m.travelled(t),0)}));assert.ok(ui.painted.includes(l.distanceGraph)&&ui.painted.includes(l.youTag));
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(m))+' '+l.why2);
  assert.equal(ui.el('sound-equation').textContent,`d = v·t = 340 × 3 = ${num(1020,0)} m`);
 });
 test(`${lang}: the echo's whole trip, then the cliff's distance`,()=>{
  ui.click('mission-3');ui.input('answer',680);ui.click('play');ui.run(done);const m=make(3);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:plain(680)+' m'})+' '+l.slipRoundTrip);
  ui.input('answer',340);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('sound-equation').textContent,`d = v·t ÷ 2 = 340 × 2 ÷ 2 = ${num(340,0)} m`);
 });
 test(`${lang}: the highest note, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',1.7);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('sound-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('sound-equation').textContent,`λ = v ÷ f = 340 ÷ 20000 = ${num(1.7)} cm`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:'20000'})));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',680);en.click('play');en.run(()=>en.el('sound-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipRoundTrip));en.input('answer',340);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'340');assert.equal(es.el('sound-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('sound-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} sound wave and multilingual interface checks passed.`);
