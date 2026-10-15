// Ambulance Pass-by: the Doppler effect of a moving source. f' = f·v ÷ (v − v_s) ahead and f·v ÷ (v + v_s) behind, the
// speed from a heard pitch, the siren's own note from the pitch behind, the speed for an octave, the roadside glide, the
// exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ambulance.html'),'utf8'),copy=require('./locales/ambulance.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ambulance-model'),pure);const Ambulance=pure.AmbulanceModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[700*340/310,700*340/370,340*50/750,680*360/340,170],units=['Hz','Hz','m/s','Hz','m/s'];
const make=(i,a=expected[i])=>{const m=new Ambulance(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Ambulance(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
});
test('the pitch is higher ahead and lower behind, and glides from one towards the other as the ambulance passes',()=>{
 const m=new Ambulance(0);near(m.ahead(),767.7419,1e-6);near(m.behind(),643.2432,1e-6);near(m.heard(2),700);assert.ok(m.heard(0)<m.ahead()&&m.heard(0)>m.ahead()-2);assert.ok(m.heard(4)>m.behind()&&m.heard(4)<m.behind()+2);
 let last=Infinity;for(let k=0;k<=40;k++){const f=m.heard(k/10);assert.ok(f<last);last=f;}
 near(new Ambulance(2).ahead(),750);near(new Ambulance(3).behind(),680);near(new Ambulance(4).ahead(),1400);near(new Ambulance(4).behind(),700*340/510);
 near(m.position(0),-60);near(m.position(2),0);near(m.position(4),60);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,767.74);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(643);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,643.2),'leavingFormula');assert.equal(slip(0,730),'addedSpeed');assert.equal(slip(0,700),null);
 assert.equal(slip(1,767.7),'approachingFormula');assert.equal(slip(1,670),'subtractedSpeed');assert.equal(slip(1,700),null);
 assert.equal(slip(2,50),'pitchDifference');assert.equal(slip(2,340*50/700),'wrongBase');assert.equal(slip(2,340*50/1450),'averageBase');assert.equal(slip(2,30),null);
 assert.equal(slip(3,640),'wrongSign');assert.equal(slip(3,700),'addedHz');assert.equal(slip(3,680),null);
 assert.equal(slip(4,340),'soundSpeed');assert.equal(slip(4,340/3),'leavingOctave');assert.equal(slip(4,680),'doubleSound');assert.equal(slip(4,200),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e5+1])assert.equal(new Ambulance(0).setAnswer(bad),false);assert.equal(new Ambulance(0).setAnswer(1e5),true);assert.equal(new Ambulance(2).setAnswer(1e4+1),false);assert.equal(new Ambulance(2).setAnswer(500),true);
 const m=new Ambulance(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,700);m.advance(1);const k=new Ambulance();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,700);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Ambulance(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ambulance-model'),script(source,'ambulance-model'));
 return mount(html,{scripts:['ambulance-model','ambulance-interface'],locale:'ambulance-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Ambulance(i);return {e:num(m.exact(),m.config.ask==='speed'?1:0)};};
 const ui=open(lang),done=()=>ui.el('ambulance-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,"f' =");assert.equal(ui.el('answer-unit').textContent,'Hz');
  assert.equal(ui.el('given-0').textContent,'f = 700 Hz · v_s = 30 m/s');assert.equal(ui.el('given-1').textContent,'f = 700 Hz · v_s = 30 m/s');assert.equal(ui.el('given-2').textContent,"f = 700 Hz · f' = 750 Hz");
  assert.equal(ui.el('given-3').textContent,"f' = 680 Hz · v_s = 20 m/s");assert.equal(ui.el('given-4').textContent,"f = 700 Hz · f' = 2·f");
  for(const id of ['siren-value','speed-value','ahead-value','behind-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('ambulance-equation').textContent,"f' = f·v ÷ (v ∓ v_s)");
  for(const key of ['viewTitle','pitchGraph','panelHint','scaleNote','ambulanceTag','aheadTag','behindTag','slowTag'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the ambulance moves, and the pitch ahead is right on the first try`,()=>{
  ui.input('answer',768);assert.equal(ui.el('siren-value').textContent,'—');
  ui.click('step');
  const m=new Ambulance(0);
  assert.equal(ui.el('siren-value').textContent,num(700,0));assert.equal(ui.el('speed-value').textContent,num(30,1));assert.equal(ui.el('ahead-value').textContent,'?');assert.equal(ui.el('behind-value').textContent,num(m.behind(),0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.ambulanceCopy,{p:num(m.heard(.1),0)}));
  assert.equal(ui.el('ambulance-equation').textContent,`f' = 700 × 340 ÷ (340 − 30) = ${num(expected[0],0)} Hz`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));assert.equal(ui.el('ahead-value').textContent,num(expected[0],0));
 });
 test(`${lang}: the pitch going away, the approaching formula first, then the right one`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,"f' =");ui.input('answer',767.74);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(767.74)+' Hz'})+' '+l.slipApproachingFormula);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('ambulance-equation').textContent,`f' = 700 × 340 ÷ (340 + 30) = ${num(expected[1],0)} Hz`);
  ui.input('answer',643);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the speed stays hidden until the run ends; the pitch difference first, then v·(f' − f) ÷ f'`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'v_s =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',50);
  ui.click('step');assert.equal(ui.el('speed-value').textContent,'?');assert.equal(ui.el('ahead-value').textContent,num(750,0));
  ui.click('play');ui.run(done);assert.equal(ui.el('speed-value').textContent,num(expected[2],1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(50)+' m/s'})+' '+l.slipPitchDifference);
  assert.equal(ui.el('ambulance-equation').textContent,`v_s = 340 × 50 ÷ 750 = ${num(expected[2],1)} m/s`);
  ui.input('answer',22.7);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: the siren's real note from the pitch heard behind`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'f =');ui.input('answer',720);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('ambulance-equation').textContent,`f = 680 × (340 + 20) ÷ 340 = ${num(720,0)} Hz`);assert.equal(ui.el('behind-value').textContent,num(680,0));
 });
 test(`${lang}: an octave higher at half the speed of sound, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'v_s =');ui.input('answer',170);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('ambulance-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('ambulance-equation').textContent,`v_s = v ÷ 2 = 340 ÷ 2 = ${num(170,0)} m/s`);assert.equal(ui.el('ahead-value').textContent,num(1400,0));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',767.74);en.click('play');en.run(()=>en.el('ambulance-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipApproachingFormula));en.input('answer',643);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'643');assert.equal(es.el('ambulance-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('ambulance-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} ambulance Doppler and multilingual interface checks passed.`);
