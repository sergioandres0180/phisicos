// Energy Meter: E = P·t counted in kilowatt-hours; a lamp, a month of standby, a power bank in kJ, an LED swap, and a
// phone battery; the time unit in hours or days, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bill.html'),'utf8'),copy=require('./locales/bill.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bill-model'),pure);const Bill=pure.BillModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[.5,1.44,54,51,11.1],units=['kWh','kWh','kJ','kWh','Wh'],durations=[5,30,1.5,1000,3],tus=['h','d','h','h','h'];
const make=(i,a=expected[i])=>{const m=new Bill(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, time unit, and run length',()=>{
 expected.forEach((x,i)=>{const m=new Bill(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),durations[i]);assert.equal(m.config.tu,tus[i]);near(m.config.pace,durations[i]/4);});
});
test('E = P·t in Wh, converted to kWh or kJ; days count 24 hours',()=>{
 const b=make(0);near(b.wh(5),500);near(b.reading(2.5),.25);
 const s=make(1);near(s.hours(30),720);near(s.wh(30),1440);near(s.reading(1),.048);
 const p=make(2);near(p.wh(1.5),15);near(p.reading(1.5),54);
 const w=make(3);near(w.used(0,1000),60000);near(w.used(1,1000),9000);near(w.wh(1000),51000);
 near(make(4).wh(3),11.1);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,durations[i]);while(q.status!=='done')q.advance(durations[i]/480);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(1e3);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e3);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,1440);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.44);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,500),'wh');assert.equal(slip(0,1.8e6),'joulesKwh');assert.equal(slip(0,5),null);
 assert.equal(slip(1,1440),'wh');assert.equal(slip(1,.048),'oneDay');assert.equal(slip(1,60),null);
 assert.equal(slip(2,.9),'minutes');assert.equal(slip(2,54000),'joules');assert.equal(slip(2,15),null);
 assert.equal(slip(3,51000),'wh');assert.equal(slip(3,60),'oldOnly');assert.equal(slip(3,9),null);
 assert.equal(slip(4,11100),'noMilli');assert.equal(slip(4,3),'charge');assert.equal(slip(4,1.11),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Bill(0).setAnswer(bad),false);assert.equal(new Bill(0).setAnswer(1e9),true);
 const m=new Bill(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,1440);m.advance(12);const n=new Bill();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,12);assert.equal(n.answer,1440);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:31},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Bill(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bill-model'),script(source,'bill-model'));
 return mount(html,{scripts:['bill-model','bill-interface'],locale:'bill-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const number=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('bill-status-text').textContent===l.done;
 const result=(i,p,key)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[key];
 const meters=(P,h,E,u)=>{assert.equal(ui.el('power-value').textContent,sig(P));assert.equal(ui.el('hours-value').textContent,sig(h));assert.equal(ui.el('energy-value').textContent,sig(E)+' '+u);};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'E =');assert.equal(ui.el('answer-unit').textContent,'kWh');assert.equal(ui.el('time-unit').textContent,'h');
  assert.equal(ui.el('given-0').textContent,fill(l.givenBulb,{P:plain(100),T:plain(5)}));assert.equal(ui.el('given-1').textContent,fill(l.givenStandby,{P:plain(2),T:plain(30)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenBattery,{w:plain(15)}));assert.equal(ui.el('given-3').textContent,fill(l.givenSwap,{Q:plain(9),P:plain(60),T:plain(1000)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenPhone,{a:plain(3000),V:plain(3.7)}));
  for(const id of ['power-value','hours-value','energy-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('bill-equation').textContent,'E (kWh) = P (kW) · t (h)');
  for(const key of ['viewTitle','energyGraph','scaleNote','panelHint','meterTag'])assert.ok(ui.painted.includes(l[key]),key);
  for(const s of [fill(l.lampTag,{P:plain(100)}),'kWh','0 h',plain(5)+' h',fill(l.speedTag,{p:sig(1.25),u:'h'})])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: a lamp, right on the first try; then joules`,()=>{
  ui.input('answer',.5);assert.equal(ui.el('energy-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.meterCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(100,5,.5,'kWh');assert.equal(ui.el('time-value').textContent,number(5));assert.equal(ui.el('bill-equation').textContent,'E = '+plain(.1)+' kW × 5 h = '+plain(.5)+' kWh');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(.5)+' kWh',sig(.5)+' kWh',fill(l.timeAxis,{u:'h'})])assert.ok(ui.painted.includes(s),s);
  ui.input('answer',1.8e6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(0,amount(1.8e6,'kWh'),'slipJoulesKwh'));assert.ok(ui.painted.includes(l.offBanner));
 });
 test(`${lang}: a month of standby, counted in days; watt-hours, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('time-unit').textContent,'d');
  for(const s of [fill(l.tvTag,{P:plain(2)}),'0 d',plain(30)+' d',fill(l.speedTag,{p:sig(7.5),u:'d'})])assert.ok(ui.painted.includes(s),s);
  ui.input('answer',1440);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(1,amount(1440,'kWh'),'slipWh'));
  ui.input('answer',1.44);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(2,720,1.44,'kWh');assert.equal(ui.el('time-value').textContent,number(30));assert.equal(ui.el('time-unit').textContent,'d');assert.ok(ui.painted.includes(fill(l.timeAxis,{u:'d'})));
 });
 test(`${lang}: a power bank, minutes, joules, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-unit').textContent,'kJ');assert.equal(ui.el('time-unit').textContent,'h');assert.ok(ui.painted.includes(fill(l.bankTag,{w:plain(15)})));
  ui.input('answer',.9);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(.9,'kJ'),'slipMinutes'));
  ui.input('answer',54000);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(54000,'kJ'),'slipJoules'));
  ui.input('answer',54);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('bill-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(10,1.5,54,'kJ');assert.equal(ui.el('bill-equation').textContent,'E = 15 Wh × '+plain(3.6)+' kJ/Wh = 54 kJ');
 });
 test(`${lang}: swapping for an LED, the old bulb only, then right`,()=>{
  ui.click('mission-3');for(const s of [l.savedTag,fill(l.oldTag,{P:plain(60)}),fill(l.ledTag,{P:plain(9)})])assert.ok(ui.painted.includes(s),s);
  ui.input('answer',60);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(60,'kWh'),'slipOldOnly'));
  ui.input('answer',51);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.swapCopy.split('{')[0])&&ui.el('bill-status-text').textContent===l.running);ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(51,1000,51,'kWh');for(const s of [sig(60)+' kWh',sig(9)+' kWh'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: a phone battery, the charge, a guess, then right`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'Wh');assert.ok(ui.painted.includes(fill(l.phoneTag,{a:plain(3000),V:plain(3.7)})));
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(3,'Wh'),'slipCharge'));
  ui.input('answer',1.11);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(1.11,'Wh'),'hint4'));
  ui.input('answer',11.1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(3.7,3,11.1,'Wh');assert.equal(ui.el('bill-equation').textContent,'E = 3 Ah × '+plain(3.7)+' V = '+plain(11.1)+' Wh');
 });
}
test('changing language preserves test, answer, attempts, run, and time unit',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',1440);en.click('play');en.run(()=>en.el('bill-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWh));en.input('answer',1.44);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.44');assert.equal(es.el('time-unit').textContent,'d');assert.equal(es.el('bill-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('bill-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} energy meter and multilingual interface checks passed.`);
