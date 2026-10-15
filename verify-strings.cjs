// String Tuner: frequency and pitch of a string, f = v ÷ (2·L). The open string, half the string (an octave), the length for
// a note (your finger drives the string), four times the tension, the period in ms, the exact end of each run, slips,
// scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/strings.html'),'utf8'),copy=require('./locales/strings.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'strings-model'),pure);const Str=pure.StringModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[220,440,286/660*100,440,1000/220],units=['Hz','Hz','cm','Hz','ms'];
const make=(i,a=expected[i])=>{const m=new Str(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Str(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});near(expected[2],43.3333,1e-5);});
test('the string is half a wave: f = v ÷ (2·L)',()=>{
 const m=make(0);near(m.length(),.65);near(m.frequency(),220);near(2*m.length()*m.frequency(),286);
 near(m.shape(.325,0),1);near(m.shape(0,.3),0);near(m.shape(.65,.7),0,1e-12);near(m.shape(.325,.5),-1);near(m.shape(.2,1.25),0,1e-12);
});
test('half the length is an octave; four times the tension doubles the speed and the note',()=>{
 near(new Str(1).length(),.325);near(new Str(1).frequency(),440);near(new Str(3).speed(),572);near(new Str(3).frequency(),440);near(new Str(4).frequency(),220);
});
test('when the length is asked, your finger sets the vibrating part',()=>{
 const m=make(2,43.33);near(m.length(),.4333);near(m.frequency(),286/(2*.4333));const k=make(2,65);near(k.frequency(),220);near(make(2,200).length(),.65);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,220],[1,440],[2,43.3],[3,440],[4,4.55]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,220);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(440);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,440),'noTwo');assert.equal(slip(0,110),'quarter');assert.equal(slip(0,371.8),'multiplied');assert.equal(slip(0,300),null);
 assert.equal(slip(1,110),'halved');assert.equal(slip(1,220),'same');assert.equal(slip(1,880),'quadrupled');assert.equal(slip(1,300),null);
 assert.equal(slip(2,86.67),'noTwoLength');assert.equal(slip(2,97.5),'inverseRatio');assert.equal(slip(2,.4333),'metres');assert.equal(slip(2,30),null);
 assert.equal(slip(3,880),'linear');assert.equal(slip(3,220),'unchanged');assert.equal(slip(3,311.1),'rootTwo');assert.equal(slip(3,600),null);
 assert.equal(slip(4,.004545),'seconds');assert.equal(slip(4,2.273),'halfPeriod');assert.equal(slip(4,220),'frequencyNumber');assert.equal(slip(4,10),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Str(0).setAnswer(bad),false);assert.equal(new Str(0).setAnswer(1e6),true);
 const m=new Str(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,50);m.advance(1);const n=new Str();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1);near(n.length(),.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Str(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'strings-model'),script(source,'strings-model'));
 return mount(html,{scripts:['strings-model','strings-interface'],locale:'strings-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const L=[.65,.325,286/660,.65,.65][i],v=i===3?572:286,f=v/(2*L);return {f:num(f,0),l:num(L*100,1),v:num(v,0),T:num(1000/220)};};
 const ui=open(lang),done=()=>ui.el('strings-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');
  assert.equal(ui.el('given-0').textContent,'L = 65 cm · v = 286 m/s');assert.equal(ui.el('given-1').textContent,'L = 65 cm → ½');assert.equal(ui.el('given-2').textContent,'f = 330 Hz · v = 286 m/s');
  assert.equal(ui.el('given-3').textContent,'f = 220 Hz · F ×4');assert.equal(ui.el('given-4').textContent,'f = 220 Hz');
  for(const id of ['frequency-value','length-value','wavelength-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('strings-equation').textContent,'f = v ÷ (2·L)');
  for(const key of ['viewTitle','tunerGraph','scaleNote','noteA3','noteE4','noteA4','noteA5'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(plain(70)+' cm'));
 });
 test(`${lang}: the readings appear once the string is plucked, and its note is right on the first try`,()=>{
  ui.input('answer',220);assert.equal(ui.el('frequency-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('frequency-value').textContent,num(220,0));assert.equal(ui.el('length-value').textContent,num(65,1));assert.equal(ui.el('wavelength-value').textContent,num(1.3));assert.equal(ui.el('speed-value').textContent,num(286,0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.vibratingCopy,{n:num(.1,1),f:num(220,0)}));
  assert.equal(ui.el('strings-equation').textContent,`f = v ÷ (2·L) = 286 ÷ (2 × ${plain(.65)}) = ${num(220,0)} Hz`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:num(220,0)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: the same note for half the string, then the octave`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'f₂ =');ui.input('answer',220);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(220)+' Hz'})+' '+l.slipSame);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('strings-equation').textContent,`f₂ = v ÷ (2·L₂) = 286 ÷ (2 × ${plain(.325)}) = ${num(440,0)} Hz`);
  ui.input('answer',440);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: your finger sets the length for 330 Hz`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',43.33);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('length-value').textContent,num(43.33,1));assert.equal(ui.el('frequency-value').textContent,num(286/(2*.4333),0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);assert.equal(ui.el('strings-equation').textContent,`L = v ÷ (2·f) = 286 ÷ (2 × 330) = ${num(expected[2],1)} cm`);
 });
 test(`${lang}: a linear guess for the tension, then the octave`,()=>{
  ui.click('mission-3');assert.equal(ui.el('strings-equation').textContent,'v = √(F ÷ μ)');ui.input('answer',880);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(880)+' Hz'})+' '+l.slipLinear);
  ui.input('answer',440);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('strings-equation').textContent,`f₂ = f₁·√(F₂ ÷ F₁) = 220 × √4 = ${num(440,0)} Hz`);assert.equal(ui.el('speed-value').textContent,num(572,0));
 });
 test(`${lang}: one vibration, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'ms');ui.input('answer',4.55);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('strings-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('strings-equation').textContent,`T = 1 ÷ f = 1 ÷ 220 = ${num(1000/220)} ms`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',220);en.click('play');en.run(()=>en.el('strings-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSame));en.input('answer',440);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'440');assert.equal(es.el('strings-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('strings-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} string tuner frequency and multilingual interface checks passed.`);
