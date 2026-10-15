// Tide Clock: the period of the tides. One period from four tides, the next low tide at T ÷ 2, high tides in a day 24 ÷ T,
// tomorrow's high tide 2T − 24 h later, the tide's wavelength λ = v·T, the harbour clock and days, the exact end of each run,
// slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tide.html'),'utf8'),copy=require('./locales/tide.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tide-model'),pure);const Tide=pure.TideModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const T=12+25/60,start=6+10/60;
const expected=[T,T/2,24/T,50,8940],units=['h','h','','min','km'],durations=[50,26,26,50,26];
const make=(i,a=expected[i])=>{const m=new Tide(i);assert.ok(m.setAnswer(a));return m;};
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

test('each test has the expected answer, unit, and length; every run lasts about 4 s of real time',()=>{
 near(Tide.T,T);expected.forEach((x,i)=>{const m=new Tide(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.duration()/m.config.pace,4);});
 near(T,12.4166666667,1e-9);near(make(4).exact(),200*44700/1000);
});
test('the water is high every period and low half a period later',()=>{
 const m=make(0);near(m.level(0),2);near(m.level(T/2),-2);near(m.level(T),2);near(m.level(T/4),0,1e-9);
 const h=m.highs();assert.equal(h.length,5);h.forEach((q,k)=>near(q,k*T));near(h[4],49+40/60);assert.equal(m.highCount(0),1);assert.equal(m.highCount(T),2);assert.equal(m.highCount(50),5);
 assert.equal(make(2).highs().length,3);
});
test('the harbour clock starts at 06:10 and the high tide comes 50 minutes later the next day',()=>{
 const m=make(3);assert.equal(hhmm(m.minutes(0)),'06:10');assert.equal(m.day(0),1);assert.equal(hhmm(m.minutes(T)),'18:35');assert.equal(m.day(T),1);
 assert.equal(hhmm(m.minutes(2*T)),'07:00');assert.equal(m.day(2*T),2);assert.equal(hhmm(m.minutes(4*T)),'07:50');assert.equal(m.day(4*T),3);assert.equal(hhmm(m.minutes(50)),'08:10');
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1000);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(100);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,6);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(6.21);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, and none falls inside the 2% of the answer',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4*T/5),'extraTide');assert.equal(slip(0,4*T-48),'clockOnly');assert.equal(slip(0,12),'twelve');assert.equal(slip(0,13),null);
 assert.equal(slip(1,T/4),'quarter');assert.equal(slip(1,T),'fullPeriod');assert.equal(slip(1,6),'sixHours');assert.equal(slip(1,5),null);
 assert.equal(slip(2,2),'two');assert.equal(slip(2,1/T),'perHour');assert.equal(slip(2,T/24),'invertedDay');assert.equal(slip(2,1),null);
 assert.equal(slip(3,50/60),'hours');assert.equal(slip(3,25),'oneTide');assert.equal(slip(3,100),'doubled');assert.equal(slip(3,60),null);
 assert.equal(slip(4,200*T/1000),'hoursNotSeconds');assert.equal(slip(4,8.94e6),'metres');assert.equal(slip(4,4470),null);
 for(const [i,a] of [[0,12],[1,6],[2,2]])assert.equal(make(i,a).evaluate().ok,false);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Tide(0).setAnswer(bad),false);assert.equal(new Tide(0).setAnswer(1e4),true);assert.equal(new Tide(4).setAnswer(1e9),true);assert.equal(new Tide(3).setAnswer(1e5+1),false);
 const m=new Tide(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,25);m.advance(10);const n=new Tide();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,10);assert.equal(n.answer,25);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:51},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tide(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tide-model'),script(source,'tide-model'));
 return mount(html,{scripts:['tide-model','tide-interface'],locale:'tide-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>({c:hhmm(Math.round((start+T)*60)%1440),l:hhmm(Math.round((start+T/2)*60)%1440),T:num(T),t:num(T/2),n:num(24/T),m:plain(50),k:num(Tide.missions[i].v?8940:0,0)});
 const ui=open(lang),done=()=>ui.el('tide-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'h');
  assert.equal(ui.el('given-0').textContent,'Δt = 49 h 40 min · 4 T');assert.equal(ui.el('given-1').textContent,'06:10 · T = 12 h 25 min');assert.equal(ui.el('given-2').textContent,'T = 12 h 25 min');
  assert.equal(ui.el('given-3').textContent,'T = 12 h 25 min');assert.equal(ui.el('given-4').textContent,'v = 200 m/s · T = 12 h 25 min');
  for(const id of ['clock-value','level-value','high-value','period-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tide-equation').textContent,'h = A·cos(2π·t ÷ T)');
  for(const key of ['viewTitle','tideGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('06:10')&&ui.painted.includes('+'+plain(2)+' m'));
 });
 test(`${lang}: the readings appear once the tide clock starts, and the period is right on the first try`,()=>{
  ui.input('answer',12.42);assert.equal(ui.el('clock-value').textContent,'—');
  ui.click('step');
  const lvl=2*Math.cos(2*Math.PI*1.25/T);
  assert.equal(ui.el('time-value').textContent,num(1.25));assert.equal(ui.el('clock-value').textContent,'07:25');assert.equal(ui.el('level-value').textContent,num(lvl));assert.equal(ui.el('high-value').textContent,'1');assert.equal(ui.el('period-value').textContent,num(T));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.tideCopy,{c:'07:25',h:num(lvl)}));
  assert.equal(ui.el('tide-equation').textContent,`T = Δt ÷ 4 = ${num(4*T)} ÷ 4 = ${num(T)} h`);assert.ok(ui.painted.includes(fill(l.fastTag,{n:plain(45000)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('high-value').textContent,'5');assert.equal(ui.el('clock-value').textContent,'08:10');assert.ok(ui.painted.includes(fill(l.dayTag,{n:'3'})));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.hoursAxis));
 });
 test(`${lang}: six hours to low tide, then half a period`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'t =');ui.input('answer',6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(6)+' h'})+' '+l.slipSixHours);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('tide-equation').textContent,`t = T ÷ 2 = ${num(T)} ÷ 2 = ${num(T/2)} h`);
  ui.input('answer',6.21);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: high tides in a day`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',1.93);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('tide-equation').textContent,`n = 24 h ÷ T = 24 ÷ ${num(T)} = ${num(24/T)}`);assert.equal(ui.el('high-value').textContent,'3');
 });
 test(`${lang}: one tide's delay, then the next morning's 50 minutes`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'Δt =');assert.equal(ui.el('answer-unit').textContent,'min');ui.input('answer',25);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(25)+' min'})+' '+l.slipOneTide);
  ui.input('answer',50);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('tide-equation').textContent,`Δt = 2·T − 24 h = ${num(2*T)} − 24 = ${num(50,0)} min`);
 });
 test(`${lang}: the tide's wavelength, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'km');assert.equal(ui.el('tide-equation').textContent,'λ = v·T');ui.input('answer',8940);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tide-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('tide-equation').textContent,`λ = v·T = 200 × 44700 s = ${num(8940,0)} km`);assert.ok(ui.painted.includes(l.earthTag)&&ui.painted.includes(plain(20000)+' km'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',25);en.click('play');en.run(()=>en.el('tide-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipOneTide));en.input('answer',50);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'50');assert.equal(es.el('tide-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tide-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} tide period and multilingual interface checks passed.`);
