// Decibel Meter: sound levels in decibels. L = 10·log(I ÷ I₀): ten speakers add 10 dB, twice as far is 6 dB less, 30 dB is
// a factor of 1000, 10⁻⁵ W/m² is 70 dB, 20 dB less is ten times as far; the exact end of each run, slips, scoring, and every
// localized interface, with the asked reading hidden until the run ends.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/decibel.html'),'utf8'),copy=require('./locales/decibel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'decibel-model'),pure);const Decibel=pure.DecibelModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[70,80-20*Math.log10(2),1000,70,100],units=['dB','dB','','dB','m'];
const make=(i,a=expected[i])=>{const m=new Decibel(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Decibel(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
});
test('levels add 10·log of intensity ratios, and fall by 20·log of distance ratios',()=>{
 const t=new Decibel(0);assert.equal(t.sources(0),1);assert.equal(t.sources(4),10);near(t.level(0),60);near(t.level(4),70);for(let k=0;k<=40;k++){const q=k/10;near(t.level(q),60+10*Math.log10(t.sources(q)));}
 const d=new Decibel(1);near(d.distance(0),2);near(d.distance(3.5),4);near(d.distance(4),4);near(d.ratio(0)/d.ratio(4),4);
 const r=new Decibel(2);near(r.ratio(4)/r.ratio(0),1000);near(r.level(1.75),75);
 const i=new Decibel(3);near(i.level(0),0);near(i.ratio(4)*1e-12,1e-5);
 const f=new Decibel(4);near(f.farEnd(),100);near(f.level(4),90);near(f.ratio(0)/f.ratio(4),100);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,40);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(74);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,600),'multipliedLevel');assert.equal(slip(0,63),'threeDb');assert.equal(slip(0,65),null);
 assert.equal(slip(1,40),'halvedLevel');assert.equal(slip(1,80-10*Math.log10(2)),'firstPower');assert.equal(slip(1,70),'tenDb');assert.equal(slip(1,60),null);
 assert.equal(slip(2,30),'difference');assert.equal(slip(2,3),'belsOnly');assert.equal(slip(2,1.5),'levelRatio');assert.equal(slip(2,100),null);
 assert.equal(slip(3,7),'bels');assert.equal(slip(3,10*Math.log(1e7)),'naturalLog');assert.equal(slip(3,50),'noThreshold');assert.equal(slip(3,60),null);
 assert.equal(slip(4,20),'doubledDistance');assert.equal(slip(4,1000),'intensityRatioDistance');assert.equal(slip(4,30),'addedLevels');assert.equal(slip(4,50),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Decibel(0).setAnswer(bad),false);assert.equal(new Decibel(0).setAnswer(1e4),true);assert.equal(new Decibel(2).setAnswer(1e12),true);assert.equal(new Decibel(2).setAnswer(1e12+1),false);
 const m=new Decibel(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,60);m.advance(1);const k=new Decibel();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,60);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Decibel(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'decibel-model'),script(source,'decibel-model'));
 return mount(html,{scripts:['decibel-model','decibel-interface'],locale:'decibel-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Decibel(i);return {e:num(m.exact(),m.config.ask==='level'?1:0)};};
 const ui=open(lang),done=()=>ui.el('decibel-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'dB');
  assert.equal(ui.el('given-0').textContent,'60 dB · I × 10');assert.equal(ui.el('given-1').textContent,'80 dB · 2 m → 4 m');assert.equal(ui.el('given-2').textContent,'60 dB → 90 dB');
  assert.equal(ui.el('given-3').textContent,'I = 10⁻⁵ W/m² · I₀ = 10⁻¹² W/m²');assert.equal(ui.el('given-4').textContent,'110 dB · 10 m → 90 dB');
  for(const id of ['level-value','intensity-value','dist-value','count-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('decibel-equation').textContent,'L = 10·log(I ÷ I₀)');
  for(const key of ['viewTitle','levelGraph','panelHint','scaleNote','sourceTag','meterTag','dialTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('— dB'));
 });
 test(`${lang}: the level stays hidden until the run ends, and ten speakers are right on the first try`,()=>{
  ui.input('answer',70);assert.equal(ui.el('level-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('level-value').textContent,'?');assert.equal(ui.el('intensity-value').textContent,'?');assert.equal(ui.el('dist-value').textContent,num(3,1));assert.equal(ui.el('count-value').textContent,'1');assert.ok(ui.painted.includes('? dB'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.decibelCopy,{n:'1',r:num(3,1)}));
  assert.equal(ui.el('decibel-equation').textContent,`L = 60 + 10·log 10 = ${num(70,0)} dB`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis));
  assert.equal(ui.el('level-value').textContent,num(70,1));assert.equal(ui.el('count-value').textContent,'10');assert.equal(ui.el('intensity-value').textContent,`${num(1,1)} × 10⁷`);
 });
 test(`${lang}: twice as far, halving the decibels first, then 6 dB less`,()=>{
  ui.click('mission-1');assert.equal(ui.el('decibel-equation').textContent,'I ∝ 1 ÷ r²');ui.input('answer',40);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(40)+' dB'})+' '+l.slipHalvedLevel);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('decibel-equation').textContent,`L = 80 − 20·log(4 ÷ 2) = ${num(expected[1],1)} dB`);assert.equal(ui.el('dist-value').textContent,num(4,1));
  ui.input('answer',74);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: how many times more intense, the difference first, then 10^(30 ÷ 10)`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'I₂ ÷ I₁ =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',30);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(30)})+' '+l.slipDifference);
  assert.equal(ui.el('decibel-equation').textContent,`I₂ ÷ I₁ = 10^(30 ÷ 10) = ${num(1000,0)}`);assert.equal(ui.el('level-value').textContent,num(90,1));
  ui.input('answer',1000);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: the level of a measured intensity`,()=>{
  ui.click('mission-3');ui.input('answer',70);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('decibel-equation').textContent,`L = 10·log(10⁻⁵ ÷ 10⁻¹²) = ${num(70,0)} dB`);
 });
 test(`${lang}: the distance for 20 dB less stays hidden until the run ends, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',100);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('decibel-status-text').textContent,l.paused);assert.equal(ui.el('dist-value').textContent,'?');
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('decibel-equation').textContent,`r = 10 × 10^(20 ÷ 20) = ${num(100,0)} m`);assert.equal(ui.el('dist-value').textContent,num(100,1));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',40);en.click('play');en.run(()=>en.el('decibel-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipHalvedLevel));en.input('answer',74);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'74');assert.equal(es.el('decibel-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('decibel-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} decibel meter and multilingual interface checks passed.`);
