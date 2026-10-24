// Snail Electrons: electrons drift slowly, I = n·e·A·v_d, a thicker wire drifts more slowly, an electron takes hours to
// go a metre, and a lamp lights when the signal arrives; each test's clock in its own unit, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/drift.html'),'utf8'),copy=require('./locales/drift.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'drift-model'),pure);const Drift=pure.DriftModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const n=8.5e28,e=1.602e-19,v1=1/(n*e*1e-6)*1e3,trip=1/(v1*1e-3)/3600,I25=n*e*2.5e-6*1e-4,v4=1/(n*e*4e-6)*1e3;
const expected=[v1,trip,I25,v4,15],units=['mm/s','h','A','mm/s','ns'],tus=['s','h','s','s','ns'],durations=[4,trip,4,4,20];
const make=(i,a=expected[i])=>{const m=new Drift(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, clock unit, and length; every run takes 4 s on screen',()=>{
 near(v1,.07343761,1e-6);near(trip,3.7825,1e-4);near(I25,3.40425,1e-6);near(v4,.0183594,1e-5);
 expected.forEach((x,i)=>{const m=new Drift(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.config.tu,tus[i]);near(m.duration(),durations[i]);near(m.config.pace,durations[i]/4);});
});
test('I = n·e·A·v_d: the drift speed, the current, and the distance drifted in each unit of time',()=>{
 near(make(0).speed(),v1);near(make(0).current(),1);near(make(0).drift(4),4*v1);near(make(1).drift(trip),1000);near(make(1).drift(1),3600*v1);
 near(make(2).speed(),.1);near(make(2).current(),I25);near(make(2).drift(4),.4);near(make(3).speed(),v1/4);near(make(4).drift(15),15e-9*v1);
});
test('the signal runs along the wire at 2 × 10⁸ m/s and the lamp lights when it arrives',()=>{
 const s=make(4);near(s.front(7.5),1.5);near(s.front(15),3);near(s.front(20),3);assert.equal(s.lit(14.9),false);assert.equal(s.lit(15),true);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e9);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const q=make(3,.0367);q.advance(.01);assert.equal(q.attempts,1);q.setAnswer(.0184);q.advance(10);assert.equal(q.score(),100);assert.equal(q.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,7.344e-8),'crawlArea');assert.equal(slip(0,7.344e-5),'metres');assert.equal(slip(0,.5),null);
 assert.equal(slip(1,13617),'tripSeconds');assert.equal(slip(1,227),'tripMinutes');assert.equal(slip(1,1),null);
 assert.equal(slip(2,3.404e6),'currentArea');assert.equal(slip(2,3404),'speedMetres');assert.equal(slip(2,1),null);
 assert.equal(slip(3,.0367),'half');assert.equal(slip(3,.0734),'same');assert.equal(slip(3,.01),null);
 assert.equal(slip(4,4.085e13),'electrons');assert.equal(slip(4,1.5e-8),'signalSeconds');assert.equal(slip(4,10),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e30])assert.equal(new Drift(0).setAnswer(bad),false);assert.equal(new Drift(0).setAnswer(7e-5),true);
 const m=new Drift(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,4.085e13);m.advance(5);const q=new Drift();assert.equal(q.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(q.index,4);assert.equal(q.attempts,1);near(q.t,5);assert.equal(q.answer,4.085e13);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:21},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const r=new Drift(2);assert.equal(r.restore(bad),false);assert.equal(r.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'drift-model'),script(source,'drift-model'));
 return mount(html,{scripts:['drift-model','drift-interface'],locale:'drift-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=x=>{const a=Math.abs(x);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((x/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(x,d=2)=>Math.abs(x)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):x.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const short=x=>plain(Number(x.toPrecision(4))),amount=(v,u)=>plain(Number(v.toPrecision(5)))+' '+u;
 const values=[{x:num(v1,4)},{x:num(trip,2)},{x:num(I25,2)},{x:num(v4,4)},{x:plain(15)}];
 const ui=open(lang),done=()=>ui.el('drift-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const crawlEq=(A,v)=>`v_d = I ÷ (n·e·A) = 1 ÷ ${Math.round(n*e*A*1e-6)} = ${plain(Number((v*1e-3).toPrecision(4)))} m/s = ${num(v,4)} mm/s`;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'v_d =');assert.equal(ui.el('answer-unit').textContent,'mm/s');assert.equal(ui.el('time-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,fill(l.givenCrawl,{I:plain(1),A:plain(1)}));assert.equal(ui.el('given-1').textContent,fill(l.givenTrip,{L:plain(1),I:plain(1)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenCurrent,{v:plain(.1),A:plain(2.5)}));assert.equal(ui.el('given-3').textContent,fill(l.givenThick,{I:plain(1),A:plain(4)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenSignal,{L:plain(3),c:plain(2e8)}));
  for(const id of ['speed-value','dist-value','current-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('drift-equation').textContent,'I = n·e·A·v_d');
  for(const key of ['viewTitle','driftGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the electrons crawl, right on the first try`,()=>{
  ui.input('answer',.0734);assert.equal(ui.el('speed-value').textContent,'—');ui.click('step');assert.equal(ui.el('speed-value').textContent,num(v1,4));
  assert.ok(ui.el('lesson-copy').textContent.startsWith(l.crawlCopy.split('{')[0]));ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('dist-value').textContent,short(4*v1));assert.equal(ui.el('current-value').textContent,num(1,2));assert.equal(ui.el('drift-equation').textContent,crawlEq(1,v1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.jitterNote,fill(l.areaTag,{A:plain(1)}),fill(l.paceNote,{t:plain(1)+' s'}),fill(l.timeAxis,{u:'s'}),plain(.1)+' mm'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the metre-long trip in seconds, in minutes, then in hours`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'h');assert.equal(ui.el('time-unit').textContent,'h');
  ui.input('answer',13617);ui.click('play');ui.run(starts(l.tripCopy));ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(13617,'h'),'slipTripSeconds'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',227);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(1,amount(227,'h'),'slipTripMinutes'));
  ui.input('answer',3.78);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('dist-value').textContent,short(1000));assert.equal(ui.el('time-value').textContent,num(trip));assert.ok(ui.painted.includes(l.guessTag+': '+plain(3.78)+' h'));
  assert.equal(ui.el('drift-equation').textContent,`t = L ÷ v_d = 1 ÷ ${plain(Number((v1*1e-3).toPrecision(4)))} = ${Math.round(trip*3600)} s = ${num(trip,2)} h`);
 });
 test(`${lang}: the current from a drift, with mm² and mm/s left unconverted, then right`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  ui.input('answer',3.404e6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(3.404e6,'A'),'slipCurrentArea'));assert.ok(ui.painted.includes(l.chargeGraph));
  ui.input('answer',3404);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(3404,'A'),'slipSpeedMetres'));
  ui.input('answer',3.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('current-value').textContent,num(I25,2));assert.equal(ui.el('drift-equation').textContent,`I = n·e·A·v_d = ${[8.5e28,e,2.5e-6,1e-4].map(plain).join(' × ')} = ${num(I25,2)} A`);
 });
 test(`${lang}: a thicker wire, halved, unchanged, then a quarter`,()=>{
  ui.click('mission-3');ui.input('answer',.0367);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(.0367,'mm/s'),'slipHalf'));
  assert.ok(ui.painted.includes(fill(l.areaTag,{A:plain(4)}))&&ui.painted.includes(fill(l.areaTag,{A:plain(1)})));
  ui.input('answer',.0734);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(.0734,'mm/s'),'slipSame'));
  ui.input('answer',.0184);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('speed-value').textContent,num(v4,4));assert.equal(ui.el('drift-equation').textContent,crawlEq(4,v4));
 });
 test(`${lang}: the lamp waits for the signal, not the electrons; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'ns');assert.equal(ui.el('time-unit').textContent,'ns');assert.ok(ui.painted.includes(l.signalTag));
  ui.input('answer',4.085e13);ui.click('play');ui.run(starts(l.signalCopy));ui.run(starts(l.litCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(4.085e13,'ns'),'slipElectrons'));
  assert.ok(ui.painted.includes(l.signalGraph));
  ui.input('answer',1.5e-8);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(1.5e-8,'ns'),'slipSignalSeconds'));
  ui.input('answer',15);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('drift-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('drift-equation').textContent,`t = L ÷ v = 3 ÷ ${plain(2e8)} = ${plain(1.5e-8)} s = 15 ns`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',.0367);en.click('play');en.run(()=>en.el('drift-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipHalf));en.input('answer',.0184);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.0184');assert.equal(es.el('drift-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('drift-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} snail electrons and multilingual interface checks passed.`);
