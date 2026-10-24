// Voltmeter Walk: a voltage is always between two points, V = V_red − V_black. Swapped probes on a battery, an open
// switch taking the whole voltage, a wire reading 0, the junction between two resistors, and two cells pushing against
// each other; the potential round the loop, the probes' walk, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/voltwalk.html'),'utf8'),copy=require('./locales/voltwalk.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'voltwalk-model'),pure);const Walk=pure.VoltWalkModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1),`${a} != ${b}`);
const expected=[-9,9,0,8,7.5];
const make=(i,a=expected[i])=>{const m=new Walk(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Walk(i);assert.equal(m.exact(),x);assert.equal(m.unit(),'V');assert.equal(m.duration(),3);});
});
test('round the loop the potential rises through cells, falls I·R through resistors, and comes back to 0',()=>{
 for(let i=0;i<5;i++){const m=new Walk(i);near(m.potential(0),0);near(m.potential(.9999999),0,1e-6);}
 const b=new Walk(0);near(b.current(),.5);near(b.potential(.09),0);near(b.potential(.24),9);near(b.potential(.5),9);near(b.potential(.665),4.5);near(b.potential(.8),0);
 const j=new Walk(3);near(j.current(),2);near(j.potential(.4),12);near(j.potential(.665),8);near(j.potential(.8),0);
 const o=new Walk(4);near(o.current(),1.5);near(o.potential(.15),9);near(o.potential(.29),7.5);near(o.potential(.9),0);
});
test('an open switch stops the current, so the bulb drops nothing and the whole 9 V is across the gap',()=>{
 const g=new Walk(1);assert.equal(g.current(),0);assert.equal(g.open(),true);near(g.potential(.355),9);near(g.potential(.475),0);near(g.potential(.66),0);
 const w=new Walk(2);near(w.potential(.355),9);near(w.potential(.475),9);
});
test('the meter reads red minus black once both probes have walked onto their points',()=>{
 for(let i=0;i<5;i++){const m=make(i);assert.equal(m.reading(1.9),null);near(m.reading(2),expected[i]);near(m.reading(3),expected[i]);}
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative, and a reading of 0 within 0.05 V; a run counts as soon as it starts',()=>{
 for(const i of [0,1,3,4]){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 for(const a of [0,.05,-.05])assert.equal(make(2,a).evaluate().ok,true);for(const a of [.06,-.06])assert.equal(make(2,a).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(3,4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(8);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,9),'sign');assert.equal(slip(0,0),null);
 assert.equal(slip(1,0),'zero');assert.equal(slip(1,-9),'swappedGap');assert.equal(slip(1,4.5),null);
 assert.equal(slip(2,9),'battery');assert.equal(slip(2,-9),'battery');assert.equal(slip(2,4.5),null);
 assert.equal(slip(3,4),'drop');assert.equal(slip(3,-4),'againstPlus');assert.equal(slip(3,12),'wholeBattery');assert.equal(slip(3,6),null);
 assert.equal(slip(4,10.5),'added');assert.equal(slip(4,9),'ignoredCell');assert.equal(slip(4,1.5),null);
});
test('answers are validated: readings are signed and may be 0, and nothing moves without one',()=>{
 for(const bad of [Infinity,NaN,2000,-2000])assert.equal(new Walk(0).setAnswer(bad),false);for(const ok of [0,-9,1000])assert.equal(new Walk(0).setAnswer(ok),true);
 const m=new Walk(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,4);m.advance(1.5);const n=new Walk();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,4);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2000},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Walk(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'voltwalk-model'),script(source,'voltwalk-model'));
 return mount(html,{scripts:['voltwalk-model','voltwalk-interface'],locale:'voltwalk-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const v2=x=>num(x,2).replace('-','−'),g={V:plain(9),W:plain(12),a:plain(2),b:plain(4),c:plain(1.5),R:plain(5)},values=expected.map(x=>({x:plain(x)}));
 const ui=open(lang),done=()=>ui.el('voltwalk-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  ['givenBackwards','givenGap','givenWire','givenJunction','givenOpposed'].forEach((k,i)=>assert.equal(ui.el('given-'+i).textContent,fill(l[k],g)));
  for(const id of ['reading-value','red-value','black-value','current-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('voltwalk-equation').textContent,'V = V_red − V_black');
  for(const key of ['viewTitle','profileGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('? V')&&ui.painted.includes(fill(l.heightNote,{V:plain(9)})));
 });
 test(`${lang}: the probes walk onto the battery the wrong way round, right on the first try`,()=>{
  ui.input('answer',-9);ui.click('step');assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('reading-value').textContent,'—');assert.equal(ui.el('current-value').textContent,num(.5,3));
  assert.equal(ui.el('lesson-copy').textContent,l.walkCopy);assert.equal(ui.el('voltwalk-equation').textContent,`V = V_red − V_black = 0 − 9 = ${plain(-9)} V`);
  const read=fill(l.readCopy,{r:v2(0),b:v2(9),V:v2(-9)});ui.click('play');ui.run(copyIs(read));ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('reading-value').textContent,v2(-9));assert.equal(ui.el('red-value').textContent,v2(0));assert.equal(ui.el('black-value').textContent,v2(9));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(v2(-9)+' V')&&ui.painted.includes(l.guessTag+': '+plain(-9)+' V'));
 });
 test(`${lang}: across an open switch, 0 and the wrong sign, then the whole 9 V`,()=>{
  ui.click('mission-1');ui.input('answer',0);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(0)+' V'})+' '+l.slipZero);assert.equal(ui.el('current-value').textContent,num(0,3));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',-9);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(-9)+' V'})+' '+l.slipSwappedGap);
  ui.input('answer',9);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('reading-value').textContent,v2(9));assert.equal(ui.el('voltwalk-equation').textContent,'I = 0: V = 9 − 0 = 9 V');
 });
 test(`${lang}: along a wire, the battery's voltage, then 0`,()=>{
  ui.click('mission-2');ui.input('answer',9);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(9)+' V'})+' '+l.slipBattery);
  ui.input('answer',0);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('reading-value').textContent,v2(0));assert.equal(ui.el('red-value').textContent,v2(9));assert.equal(ui.el('voltwalk-equation').textContent,'V = I·R_wire = I × 0 = 0 V');
 });
 test(`${lang}: the junction, the drop, then 8 V`,()=>{
  ui.click('mission-3');ui.input('answer',4);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(4)+' V'})+' '+l.slipDrop);
  ui.input('answer',8);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('reading-value').textContent,v2(8));assert.equal(ui.el('current-value').textContent,num(2,3));assert.equal(ui.el('voltwalk-equation').textContent,'V = 12 − 2 A × 2 Ω = 8 V');
 });
 test(`${lang}: cells against each other, added, then subtracted; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',10.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(10.5)+' V'})+' '+l.slipAdded);
  ui.input('answer',7.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('voltwalk-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('reading-value').textContent,v2(7.5));assert.equal(ui.el('voltwalk-equation').textContent,`V = 9 − ${plain(1.5)} = ${plain(7.5)} V`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',4);en.click('play');en.run(()=>en.el('voltwalk-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipDrop));en.input('answer',8);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'8');assert.equal(es.el('voltwalk-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('voltwalk-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} voltmeter walk and multilingual interface checks passed.`);
