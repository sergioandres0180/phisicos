// Bottle Flute: a bottle as a pipe closed at one end. f = v ÷ 4L for the air column above the water, the column for a note,
// the water to pour for a note, odd harmonics only (3f next), the water pouring in during a run, the exact end of each run,
// slips, scoring, and every localized interface, with the asked reading hidden until the run ends.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bottle.html'),'utf8'),copy=require('./locales/bottle.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bottle-model'),pure);const Bottle=pure.BottleModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[425,500,25,19.5,1275],units=['Hz','Hz','cm','cm','Hz'];
const make=(i,a=expected[i])=>{const m=new Bottle(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Bottle(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
});
test('the air column holds a quarter wave, pouring in water raises the note, and only odd harmonics fit',()=>{
 for(let i=0;i<5;i++){const m=new Bottle(i);for(const q of [0,1,2,3.5,4]){near(m.wavelength(q)*m.harmonic(),4*m.air(q));near(m.pitch(q)*m.wavelength(q)/100,340);}}
 const w=new Bottle(1);near(w.water(0),0);near(w.water(1.75),6.5);near(w.water(4),13);near(w.pitch(0),340*100/120);assert.ok(w.pitch(2)>w.pitch(1));
 const f=new Bottle(3);near(f.air(4),12.5);near(f.pitch(4),680);near(f.pitch(0),340*100/128);
 near(new Bottle(4).pitch(0),3*new Bottle(0).pitch(0));near(new Bottle(2).depth(),25);near(new Bottle(2).pitch(4),340);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,283.3);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(500);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,850),'openPipe');assert.equal(slip(0,4.25),'centimetres');assert.equal(slip(0,1700),'noFour');assert.equal(slip(0,500),null);
 assert.equal(slip(1,283.3),'wholeBottle');assert.equal(slip(1,34000/52),'waterColumn');assert.equal(slip(1,1000),'openPipe');assert.equal(slip(1,425),null);
 assert.equal(slip(2,50),'openLength');assert.equal(slip(2,100),'fullWave');assert.equal(slip(2,.25),'metresLength');assert.equal(slip(2,30),null);
 assert.equal(slip(3,12.5),'airInstead');assert.equal(slip(3,7),'openFill');assert.equal(slip(3,44.5),'addedLengths');assert.equal(slip(3,15),null);
 assert.equal(slip(4,850),'evenHarmonic');assert.equal(slip(4,425),'fundamental');assert.equal(slip(4,425/3),'dividedHarmonic');assert.equal(slip(4,1000),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Bottle(0).setAnswer(bad),false);assert.equal(new Bottle(0).setAnswer(1e6),true);assert.equal(new Bottle(2).setAnswer(1e5+1),false);
 const m=new Bottle(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,15);m.advance(1);const k=new Bottle();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,15);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Bottle(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bottle-model'),script(source,'bottle-model'));
 return mount(html,{scripts:['bottle-model','bottle-interface'],locale:'bottle-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Bottle(i);return {e:num(m.exact(),m.config.ask==='pitch'?0:1)};};
 const ui=open(lang),done=()=>ui.el('bottle-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');
  assert.equal(ui.el('given-0').textContent,'L = 20 cm · v = 340 m/s');assert.equal(ui.el('given-1').textContent,'D = 30 cm · h = 13 cm');assert.equal(ui.el('given-2').textContent,'f = 340 Hz · v = 340 m/s');
  assert.equal(ui.el('given-3').textContent,'D = 32 cm · f = 680 Hz');assert.equal(ui.el('given-4').textContent,'L = 20 cm · n = 3');
  for(const id of ['pitch-value','air-value','water-value','lambda-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('bottle-equation').textContent,'f = v ÷ 4L');
  for(const key of ['viewTitle','pitchGraph','panelHint','scaleNote','neckTag','slowTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('cm'));
 });
 test(`${lang}: the note stays hidden until the run ends, and a 20 cm column is right on the first try`,()=>{
  ui.input('answer',425);assert.equal(ui.el('pitch-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('pitch-value').textContent,'?');assert.equal(ui.el('air-value').textContent,num(20,1));assert.equal(ui.el('water-value').textContent,num(0,1));assert.equal(ui.el('lambda-value').textContent,num(80,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.bottleCopy,{f:'?'}));
  assert.equal(ui.el('bottle-equation').textContent,`f = 340 ÷ (4 × ${plain(.2)}) = ${num(425,0)} Hz`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.airAxis));assert.equal(ui.el('pitch-value').textContent,num(425,0));
 });
 test(`${lang}: pouring in water, the whole bottle first, then the air above the water`,()=>{
  ui.click('mission-1');ui.input('answer',283.3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(283.3)+' Hz'})+' '+l.slipWholeBottle);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.waterTag));
  assert.equal(ui.el('bottle-equation').textContent,`f = 340 ÷ (4 × ${plain(.17)}) = ${num(500,0)} Hz`);assert.equal(ui.el('water-value').textContent,num(13,1));
  ui.input('answer',500);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the column for 340 Hz is hidden until the run starts`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',25);assert.ok(ui.painted.includes('?'));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('bottle-equation').textContent,`L = 340 ÷ (4 × 340) = ${num(.25)} m`);assert.equal(ui.el('air-value').textContent,num(25,1));
 });
 test(`${lang}: the water for 680 Hz stays hidden until the run ends; the air column first, then D − L`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h =');ui.input('answer',12.5);
  ui.click('step');assert.equal(ui.el('water-value').textContent,'?');
  ui.click('play');ui.run(done);assert.equal(ui.el('water-value').textContent,num(19.5,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(12.5)+' cm'})+' '+l.slipAirInstead);
  assert.equal(ui.el('bottle-equation').textContent,`h = D − v ÷ 4f = 32 − ${plain(12.5)} = ${num(19.5,1)} cm`);
  ui.input('answer',19.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
 });
 test(`${lang}: the next note up is 3f, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('bottle-equation').textContent,'f_n = n·v ÷ 4L, n = 1, 3, 5…');ui.input('answer',1275);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('bottle-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('bottle-equation').textContent,`f₃ = 3 × 340 ÷ (4 × ${plain(.2)}) = ${num(1275,0)} Hz`);assert.equal(ui.el('lambda-value').textContent,num(80/3,1));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',283.3);en.click('play');en.run(()=>en.el('bottle-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWholeBottle));en.input('answer',500);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'500');assert.equal(es.el('bottle-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('bottle-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} bottle flute and multilingual interface checks passed.`);
