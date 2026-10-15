// Two Speakers: interference of sound. Quiet where the path difference is Δd = (n + ½)·λ, loud where it is n·λ, a note's
// frequency from a loud spot, a reversed speaker swapping loud and quiet, a wavelength from the second quiet spot, the
// exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/speakers.html'),'utf8'),copy=require('./locales/speakers.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'speakers-model'),pure);const Speakers=pure.SpeakersModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[.5,1.5,400,.25,.5],units=['m','m','Hz','m','m'];
const make=(i,a=expected[i])=>{const m=new Speakers(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Speakers(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
 near(new Speakers(0).lambda(),1);near(new Speakers(2).lambda(),.85);near(new Speakers(4).lambda(),.5);
});
test('quiet at half a wavelength of path difference, loud at whole ones, and a reversed speaker swaps them',()=>{
 const m=make(0),L=Speakers.line;near(Speakers.diffAt(L,0),0);
 for(const d of [.25,.5,1,1.5,2.5])near(Speakers.diffAt(L,Speakers.yFor(d)),d,1e-9);
 near(m.loudness(0),1);near(m.loudness(.5),0,1e-12);near(m.loudness(1),1);near(m.loudness(1.5),0,1e-12);
 const r=make(3);near(r.loudness(0),0,1e-12);near(r.loudness(.25),1);near(r.loudness(.5),0,1e-12);
 const y=Speakers.yFor(.5),far=Math.hypot(L,Speakers.gap/2);for(let k=0;k<20;k++){near(m.field(L,y,k/20),0,1e-9);near(m.field(L,0,k/20),Math.cos(2*Math.PI*(k/20-far)));}
 for(let i=0;i<5;i++){const q=make(i);near(q.micY(0),0);near(q.diff(q.duration()),q.config.max,1e-9);near(q.diff(2),Speakers.diffAt(L,q.yEnd()/2));}
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,1);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(1.5);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1),'fullWave');assert.equal(slip(0,.25),'quarter');assert.equal(slip(0,.7),null);
 assert.equal(slip(1,1),'nextLoud');assert.equal(slip(1,2),'twoWaves');assert.equal(slip(1,.5),'firstQuiet');assert.equal(slip(1,1.2),null);
 assert.equal(slip(2,200),'halfWave');assert.equal(slip(2,340*.85),'multiplied');assert.equal(slip(2,.85/340),'inverted');assert.equal(slip(2,300),null);
 assert.equal(slip(3,.5),'inPhaseThinking');assert.equal(slip(3,.125),'quarterReversed');assert.equal(slip(3,.4),null);
 assert.equal(slip(4,.75),'diffOnly');assert.equal(slip(4,1.5),'firstQuietThinking');assert.equal(slip(4,.375),'halfDiff');assert.equal(slip(4,.6),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,101])assert.equal(new Speakers(0).setAnswer(bad),false);assert.equal(new Speakers(0).setAnswer(100),true);assert.equal(new Speakers(2).setAnswer(1e5+1),false);assert.equal(new Speakers(2).setAnswer(2e4),true);
 const m=new Speakers(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,.3);m.advance(1);const k=new Speakers();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,.3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Speakers(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'speakers-model'),script(source,'speakers-model'));
 return mount(html,{scripts:['speakers-model','speakers-interface'],locale:'speakers-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Speakers(i);return {d:num(m.exact()),f:num(m.exact(),0),l:num(m.lambda())};};
 const ui=open(lang),done=()=>ui.el('speakers-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'Δd =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'f = 340 Hz · v = 340 m/s');assert.equal(ui.el('given-1').textContent,'f = 340 Hz · v = 340 m/s');assert.equal(ui.el('given-2').textContent,`Δd = ${plain(.85)} m · v = 340 m/s`);
  assert.equal(ui.el('given-3').textContent,'f = 680 Hz · 180°');assert.equal(ui.el('given-4').textContent,`Δd = ${plain(.75)} m · n = 1`);
  for(const id of ['freq-value','lambda-value','diff-value','loud-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('speakers-equation').textContent,'Δd = (n + ½)·λ');
  for(const key of ['viewTitle','loudGraph','panelHint','scaleNote','speakerTag','micTag','slowTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('2 m'));
 });
 test(`${lang}: the readings appear once the microphone moves, and the first quiet spot is right on the first try`,()=>{
  ui.input('answer',.5);assert.equal(ui.el('freq-value').textContent,'—');
  ui.click('step');
  const m=new Speakers(0),dd=m.diff(.1),p=m.loudness(dd)*100;
  assert.equal(ui.el('freq-value').textContent,num(340,0));assert.equal(ui.el('lambda-value').textContent,num(1));assert.equal(ui.el('diff-value').textContent,num(dd));assert.equal(ui.el('loud-value').textContent,num(p,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.speakersCopy,{d:num(dd),p:num(p,0)}));
  assert.equal(ui.el('speakers-equation').textContent,`Δd = ½·λ = ½ × 1 = ${num(.5)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.diffAxis));
  assert.equal(ui.el('diff-value').textContent,num(1));assert.equal(ui.el('loud-value').textContent,num(100,0));
 });
 test(`${lang}: the second quiet spot, the loud spot between first, then one and a half wavelengths`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Δd =');ui.input('answer',1);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(1)+' m'})+' '+l.slipNextLoud);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('speakers-equation').textContent,`Δd = (1 + ½)·λ = ${plain(1.5)} × 1 = ${num(1.5)} m`);
  ui.input('answer',1.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the note from a loud spot, half a wave first, then f = v ÷ λ`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');assert.equal(ui.el('speakers-equation').textContent,'Δd = n·λ');ui.input('answer',200);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(200)+' Hz'})+' '+l.slipHalfWave);
  assert.equal(ui.el('speakers-equation').textContent,`f = v ÷ λ = 340 ÷ ${plain(.85)} = ${num(400,0)} Hz`);
  ui.input('answer',400);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: a reversed speaker puts the first loud spot at half a wavelength`,()=>{
  ui.click('mission-3');assert.equal(ui.el('speakers-equation').textContent,'Δd = (n + ½)·λ');ui.input('answer',.25);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.ok(ui.painted.includes('180°'));
  assert.equal(ui.el('speakers-equation').textContent,`Δd = ½·λ = ½ × ${plain(.5)} = ${num(.25)} m`);assert.equal(ui.el('loud-value').textContent,num(new Speakers(3).loudness(.6)*100,0));
 });
 test(`${lang}: the wavelength from the second quiet spot, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'λ =');ui.input('answer',.5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('speakers-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('speakers-equation').textContent,`λ = Δd ÷ 1.5 = ${plain(.75)} ÷ ${plain(1.5)} = ${num(.5)} m`);assert.equal(ui.el('freq-value').textContent,num(680,0));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',1);en.click('play');en.run(()=>en.el('speakers-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNextLoud));en.input('answer',1.5);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.5');assert.equal(es.el('speakers-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('speakers-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} two-speaker interference and multilingual interface checks passed.`);
