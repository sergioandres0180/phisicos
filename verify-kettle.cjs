// Kettle Race: E = P·t heats water by m·c·ΔT; a boiling time, the energy in 3 minutes, the time with losses, the power
// that boils half a litre in a minute, and a kettle abroad; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/kettle.html'),'utf8'),copy=require('./locales/kettle.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'kettle-model'),pure);const Ket=pure.KettleModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[167.2,270,334400/1800,167200/60,668.8],units=['s','kJ','s','W','s'],durations=[209,180,1.25*334400/1800,60,836];
const make=(i,a=expected[i])=>{const m=new Ket(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and run length',()=>{
 near(expected[2],185.7778,1e-6);near(expected[3],2786.667,1e-6);
 expected.forEach((x,i)=>{const m=new Ket(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);near(m.config.pace,durations[i]/4);});
});
test('E = P·t heats the water by m·c·ΔT, steadily, until it boils',()=>{
 const b=make(0);near(b.energy(167.2),334400);near(b.temp(83.6),60);near(b.temp(167.2),100);assert.equal(b.temp(200),100);near(b.boilTime(),167.2);assert.equal(b.boiling(167),false);assert.equal(b.boiling(167.2),true);
 near(make(0,200).paceTemp(100),60);assert.equal(new Ket(0).paceTemp(100),20);
 const e=make(1);near(e.energy(180),270000);near(e.temp(180),20+270000/4180);
 near(make(2).boilTime(),expected[2]);near(make(4).power(),500);near(make(4).boilTime(),668.8);
 assert.equal(new Ket(3).power(),0);const p=make(3);near(p.power(),expected[3]);near(p.boilTime(),60);near(p.temp(60),100);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(durations[i]/480);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(1e3);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e3);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,150.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(186);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2.787),'minutes');assert.equal(slip(0,209),'fullRange');assert.equal(slip(0,100),null);
 assert.equal(slip(1,4.5),'minutesEnergy');assert.equal(slip(1,270000),'joules');assert.equal(slip(1,27),null);
 assert.equal(slip(2,150.5),'times');assert.equal(slip(2,3.096),'minutes');assert.equal(slip(2,167.2),null);
 assert.equal(slip(3,5573),'fullLitre');assert.equal(slip(3,167200),'seconds');assert.equal(slip(3,1393),null);
 assert.equal(slip(4,334.4),'half');assert.equal(slip(4,167.2),'same');assert.equal(slip(4,1000),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Ket(0).setAnswer(bad),false);assert.equal(new Ket(3).setAnswer(1e9),true);
 const m=new Ket(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,150.5);m.advance(40);const n=new Ket();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,40);assert.equal(n.answer,150.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:233},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Ket(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'kettle-model'),script(source,'kettle-model'));
 return mount(html,{scripts:['kettle-model','kettle-interface'],locale:'kettle-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const number=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('kettle-status-text').textContent===l.done;
 const result=(i,p,key)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[key];
 const meters=(E,T,P)=>{assert.equal(ui.el('energy-value').textContent,sig(E));assert.equal(ui.el('temp-value').textContent,number(T,1));assert.equal(ui.el('power-value').textContent,sig(P));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');
  assert.equal(ui.el('given-0').textContent,fill(l.givenBoil,{P:plain(2000),L:plain(1),T:plain(20)}));assert.equal(ui.el('given-1').textContent,fill(l.givenEnergy,{P:plain(1500),n:plain(3)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenLosses,{e:plain(90)}));assert.equal(ui.el('given-3').textContent,fill(l.givenPower,{L:plain(.5),T:plain(20),s:plain(60)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenAbroad,{P:plain(2000),V:plain(230),u:plain(115)}));
  for(const id of ['energy-value','temp-value','power-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('kettle-equation').textContent,'E = P·t = m·c·ΔT');
  for(const key of ['viewTitle','tempGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);
  for(const s of [fill(l.paceTag,{t:'?'}),fill(l.waterTag,{L:plain(1),T:plain(20)}),'? °C',plain(2000)+' W',fill(l.speedTag,{p:sig(52.25)})])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: boiling a litre, right on the first try against your kettle`,()=>{
  ui.input('answer',167);assert.equal(ui.el('temp-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.heatCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(418,100,2000);assert.equal(ui.el('time-value').textContent,number(209));assert.equal(ui.el('kettle-equation').textContent,'t = m·c·ΔT ÷ P = 1 × 4180 × 80 ÷ 2000 = '+sig(167.2)+' s');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,fill(l.paceTag,{t:plain(167)}),l.boilTag,number(100,1)+' °C',sig(209)])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the energy used, joules, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'E =');assert.equal(ui.el('answer-unit').textContent,'kJ');
  ui.input('answer',270000);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(270000,'kJ'),'slipJoules'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',270);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(270,20+270000/4180,1500);assert.equal(ui.el('kettle-equation').textContent,'E = P·t = 1500 × 180 = 270000 J = 270 kJ');
  assert.ok(ui.painted.includes(l.guessTag+': '+plain(270)+' kJ'));assert.ok(!ui.painted.includes(fill(l.paceTag,{t:plain(270)})));
 });
 test(`${lang}: with losses, times the efficiency, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');ui.input('answer',150.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(150.5,'s'),'slipTimes'));
  assert.ok(ui.painted.includes(fill(l.lossTag,{e:plain(90)})));
  ui.input('answer',186);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('kettle-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(2*durations[2],100,2000);assert.equal(ui.el('kettle-equation').textContent,'t = 334400 ÷ ('+plain(.9)+' × 2000) = '+sig(334400/1800)+' s');
 });
 test(`${lang}: boiling in a minute, leaving out the time, then right; your power goes in the kettle`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'P =');assert.equal(ui.el('answer-unit').textContent,'W');assert.ok(ui.painted.includes('P = ? W'));
  ui.input('answer',167200);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(167200,'W'),'slipSeconds'));
  ui.input('answer',2787);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.heatCopy.split('{')[0])&&ui.el('kettle-status-text').textContent===l.running);ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(2787*60/1000,100,2787);assert.ok(ui.painted.includes(plain(2787)+' W'));
 });
 test(`${lang}: a kettle abroad, a guess, half the power, then right`,()=>{
  ui.click('mission-4');assert.ok(ui.painted.includes(fill(l.abroadTag,{V:plain(230),u:plain(115)})));
  ui.input('answer',1000);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(1000,'s'),'hint4'));
  ui.input('answer',334.4);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(334.4,'s'),'slipHalf'));
  ui.input('answer',669);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(418,100,500);assert.ok(ui.painted.includes(plain(500)+' W'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',150.5);en.click('play');en.run(()=>en.el('kettle-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipTimes));en.input('answer',186);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'186');assert.equal(es.el('kettle-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('kettle-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} kettle race and multilingual interface checks passed.`);
