// Battery Stack: cells in a row add their voltages, a flipped cell takes its voltage away, cells side by side give one
// cell's voltage, a battery gives each coulomb V joules (W = Q·V), and the fewest whole cells that reach 9 V; the holder
// filling, the switch, the lamp, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/batteries.html'),'utf8'),copy=require('./locales/batteries.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'batteries-model'),pure);const Stack=pure.BatteryModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[6,3,1.5,4.5,8],units=['V','V','V','J',''];
const make=(i,a=expected[i])=>{const m=new Stack(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s',()=>{
 expected.forEach((x,i)=>{const m=new Stack(i);assert.equal(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),4);});
});
test('cells count once they have clicked in: in a row they add, a flipped one subtracts, side by side they give one',()=>{
 const s=make(0);assert.equal(s.voltage(0),0);near(s.voltage(.5),1.5);near(s.voltage(1),3);near(s.voltage(2),6);near(s.voltage(.49),0);
 const f=make(1);near(f.voltage(1),3);near(f.voltage(1.5),1.5);near(f.voltage(2),3);
 const p=make(2);assert.equal(p.voltage(.6),0);near(p.voltage(.7),1.5);near(p.voltage(2),1.5);near(make(3).voltage(0),9);
});
test('the switch closes at 2.5 s; the lamp takes V ÷ R, and the charge moved gives the energy, W = Q·V',()=>{
 const s=make(0);assert.equal(s.current(2.4),0);near(s.current(3),.5);near(s.power(3),3);near(s.charge(4),.75);near(s.charge(3),.25);
 const e=make(3);assert.equal(e.current(.9),0);near(e.current(2),.25);assert.equal(e.current(3.5),0);near(e.charge(3),.5);near(e.charge(4),.5);near(e.charge(4)*e.voltage(4),4.5);near(e.charge(2),.25);
});
test('the last test fills the holder with your number of 1.2 V cells; 8 reach 9.6 V, 7 only 8.4 V',()=>{
 assert.equal(new Stack(4).cells().length,0);near(make(4,8).voltage(2),9.6);near(make(4,7).voltage(2),8.4);near(make(4,8).voltage(1),4.8);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,4);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative, and the number of cells exactly; a run counts as soon as it starts',()=>{
 for(const i of [0,1,2,3]){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(4,8).evaluate().ok,true);assert.equal(make(4,9).evaluate().ok,false);assert.equal(make(4,7).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,4.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1.5),'parallel');assert.equal(slip(0,4),null);
 assert.equal(slip(1,4.5),'dropped');assert.equal(slip(1,6),'ignored');assert.equal(slip(1,1.5),null);
 assert.equal(slip(2,4.5),'added');assert.equal(slip(2,3),null);
 assert.equal(slip(3,18),'divided');assert.equal(slip(3,.0556),'inverted');assert.equal(slip(3,9),null);
 assert.equal(slip(4,7),'roundedDown');assert.equal(slip(4,6),'oneFive');assert.equal(slip(4,10),null);
});
test('answers are validated: the count is a whole number from 1 to 20, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Stack(0).setAnswer(bad),false);for(const bad of [0,7.5,21,-3])assert.equal(new Stack(4).setAnswer(bad),false);
 assert.equal(new Stack(4).setAnswer(20),true);assert.equal(new Stack(3).setAnswer(.1),true);
 const m=new Stack(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,7);m.advance(1.5);const n=new Stack();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,7);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:7.5},{...s,t:4.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Stack(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'batteries-model'),script(source,'batteries-model'));
 return mount(html,{scripts:['batteries-model','batteries-interface'],locale:'batteries-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const g={e:plain(1.5),V:plain(9),Q:plain(.5)},values=[{x:num(6,1)},{x:num(3,1)},{x:num(1.5,1)},{x:num(4.5,1)},{x:plain(8)}],p=plain(1.5);
 const ui=open(lang),done=()=>ui.el('batteries-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  assert.equal(ui.el('given-0').textContent,fill(l.givenStack,g));assert.equal(ui.el('given-1').textContent,fill(l.givenFlipped,g));assert.equal(ui.el('given-2').textContent,fill(l.givenSide,g));
  assert.equal(ui.el('given-3').textContent,fill(l.givenEnergy,g));assert.equal(ui.el('given-4').textContent,fill(l.givenEnough,{...g,e:plain(1.2)}));
  for(const id of ['volt-value','current-value','power-value','charge-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('batteries-equation').textContent,'V = ΣV_cell, W = Q·V');
  for(const key of ['viewTitle','stairGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('? V'));
 });
 test(`${lang}: the cells click in, the switch closes, and the lamp lights, right on the first try`,()=>{
  ui.input('answer',6);assert.equal(ui.el('volt-value').textContent,'—');ui.click('step');
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('volt-value').textContent,num(0));assert.equal(ui.el('current-value').textContent,num(0,3));assert.equal(ui.el('lesson-copy').textContent,fill(l.insertCopy,{V:num(0)}));
  assert.equal(ui.el('batteries-equation').textContent,`V = ${[p,p,p,p].join(' + ')} = ${num(6,1)} V`);
  const lit=fill(l.litCopy,{V:num(6),P:num(3)});ui.click('play');ui.run(copyIs(lit));ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('volt-value').textContent,num(6));assert.equal(ui.el('current-value').textContent,num(.5,3));assert.equal(ui.el('power-value').textContent,num(3));assert.equal(ui.el('charge-value').textContent,num(.75,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.dotNote)&&ui.painted.includes(l.guessTag+': '+plain(6)+' V'));
 });
 test(`${lang}: a flipped cell left out, counted forwards, then taken away`,()=>{
  ui.click('mission-1');ui.input('answer',4.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(4.5)+' V'})+' '+l.slipDropped);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(6)+' V'})+' '+l.slipIgnored);
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('volt-value').textContent,num(3));assert.equal(ui.el('batteries-equation').textContent,`V = ${p} + ${p} − ${p} + ${p} = ${num(3,1)} V`);
 });
 test(`${lang}: side by side, added up, then one cell's voltage`,()=>{
  ui.click('mission-2');ui.input('answer',4.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(4.5)+' V'})+' '+l.slipAdded);assert.ok(ui.painted.includes(l.sideTag));
  ui.input('answer',1.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('volt-value').textContent,num(1.5));assert.equal(ui.el('batteries-equation').textContent,`V = V_cell = ${num(1.5,1)} V`);
 });
 test(`${lang}: the battery's energy, divided, then multiplied`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'W =');assert.equal(ui.el('answer-unit').textContent,'J');ui.input('answer',18);ui.click('play');
  ui.run(starts(l.flowCopy));ui.run(starts(l.stopCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(18)+' J'})+' '+l.slipDivided);
  assert.ok(ui.painted.includes(l.energyGraph)&&ui.painted.includes(fill(l.slopeTag,{V:plain(9)})));
  ui.input('answer',4.5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('charge-value').textContent,num(.5,3));assert.equal(ui.el('current-value').textContent,num(0,3));assert.equal(ui.el('batteries-equation').textContent,`W = Q·V = ${plain(.5)} × 9 = ${num(4.5,1)} J`);
 });
 test(`${lang}: seven cells leave the lamp dim, eight light it; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');assert.ok(ui.painted.includes(fill(l.ratedTag,{V:plain(9)})));
  ui.input('answer',7);ui.click('play');ui.run(starts(l.dimCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(7)})+' '+l.slipRoundedDown);
  assert.ok(ui.painted.includes(fill(l.targetTag,{V:plain(9)})));
  ui.input('answer',8);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('batteries-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('volt-value').textContent,num(9.6));assert.equal(ui.el('batteries-equation').textContent,`n ≥ 9 ÷ ${plain(1.2)} = ${plain(7.5)} → n = 8`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',4.5);en.click('play');en.run(()=>en.el('batteries-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipDropped));en.input('answer',3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3');assert.equal(es.el('batteries-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('batteries-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} battery stack and multilingual interface checks passed.`);
