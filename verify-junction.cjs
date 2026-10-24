// Current Splitter: what flows into a junction flows out, I = I₁ + I₂ + …, and parallel branches share one voltage so the
// currents divide inversely to resistance; a missing branch, a 6 A split, a main current, a new branch, and a meter's
// shunt; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/junction.html'),'utf8'),copy=require('./locales/junction.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'junction-model'),pure);const Jun=pure.JunctionModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[1.8,4,1,3,1/.95],units=['A','A','A','A','Ω'];
const make=(i,a=expected[i])=>{const m=new Jun(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Jun(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('what flows in flows out, and parallel branches share one voltage',()=>{
 const r=make(0);near(r.main(3),3);near(r.branch(0,3),1.2);near(r.branch(1,3),1.8);near(r.voltage(3),6);near(r.main(1),1.5);
 const d=make(1);near(d.branch(0,3),4);near(d.branch(1,3),2);near(d.voltage(3),8);near(d.branch(0,3)*2,d.branch(1,3)*4);
 const m=make(2);near(m.main(3),1);near(m.branch(2,3),.2);
 const a=make(3);assert.equal(a.on(1,1.9),false);near(a.branch(0,1.9),12*.95/4);near(a.branch(0,3),3);near(a.main(3),5);near(a.main(1.99),2.985);
 const s=make(4);near(s.branch(0,3),.05);near(s.branch(1,3),.95);near(s.main(3),1);assert.equal(new Jun(4).branch(1,3),0);near(new Jun(4).branch(0,3),1);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(4,1);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.053);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4.2),'added');assert.equal(slip(0,3),'whole');assert.equal(slip(0,1.2),null);
 assert.equal(slip(1,2),'swapped');assert.equal(slip(1,3),'equal');assert.equal(slip(1,6),null);
 assert.equal(slip(2,.5),'largest');assert.equal(slip(2,.333),'average');assert.equal(slip(2,.2),null);
 assert.equal(slip(3,1.8),'shared');assert.equal(slip(3,1.5),'halved');assert.equal(slip(3,5),null);
 assert.equal(slip(4,1),'noSubtract');assert.equal(slip(4,380),'inverted');assert.equal(slip(4,20),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Jun(0).setAnswer(bad),false);assert.equal(new Jun(4).setAnswer(1e6),true);
 const m=new Jun(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,380);m.advance(1.5);const n=new Jun();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,380);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Jun(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'junction-model'),script(source,'junction-model'));
 return mount(html,{scripts:['junction-model','junction-interface'],locale:'junction-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('junction-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(I,V)=>{assert.equal(ui.el('in-value').textContent,sig(I));assert.equal(ui.el('out-value').textContent,sig(I));assert.equal(ui.el('branch-value').textContent,sig(V));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'I₂ =');assert.equal(ui.el('answer-unit').textContent,'A');
  assert.equal(ui.el('given-0').textContent,fill(l.givenRest,{I:plain(3),k:plain(1.2)}));assert.equal(ui.el('given-1').textContent,fill(l.givenDivide,{I:plain(6),a:plain(2),b:plain(4)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenMain,{x:plain(.5),y:plain(.3),z:plain(.2)}));assert.equal(ui.el('given-3').textContent,fill(l.givenAdd,{a:plain(4),V:plain(12),b:plain(6)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenShunt,{m:plain(50),a:plain(20),I:plain(1)}));
  for(const id of ['in-value','out-value','branch-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('junction-equation').textContent,'I = I₁ + I₂ + …');
  for(const key of ['viewTitle','splitGraph','scaleNote','panelHint','sourceTag','inTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? A','R₁','R₂',plain(3)+' A'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the other branch, right on the first try`,()=>{
  ui.input('answer',1.8);assert.equal(ui.el('in-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.rampCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(3,6);assert.equal(ui.el('junction-equation').textContent,`I₂ = 3 − ${plain(1.2)} = ${plain(1.8)} A`);assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(1.8)+' A',`${sig(1.2)} + ${sig(1.8)} = ${sig(3)} A`])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: dividing 6 A, swapped, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'I =');
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(2,'A'),'slipSwapped'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(plain(2)+' Ω'));
  ui.input('answer',4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(6,8);assert.equal(ui.el('junction-equation').textContent,'I₁ = 6 × 4 ÷ (2 + 4) = 4 A');
 });
 test(`${lang}: the main current, the largest branch, then right`,()=>{
  ui.click('mission-2');ui.input('answer',.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(.5,'A'),'slipLargest'));assert.ok(ui.painted.includes(l.supplyTag));
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(1,6);assert.equal(ui.el('junction-equation').textContent,`I = ${plain(.5)} + ${plain(.3)} + ${plain(.2)} = 1 A`);
 });
 test(`${lang}: a new branch, halved, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',1.5);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===fill(l.addCopy,{V:sig(12),A:sig(3)}));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(3,amount(1.5,'A'),'slipHalved'));
  ui.input('answer',3);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('junction-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(5,12);assert.equal(ui.el('junction-equation').textContent,'I₁ = 12 ÷ 4 = 3 A');
 });
 test(`${lang}: the meter's shunt, not subtracted, then right; your shunt goes in`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'R_s =');assert.equal(ui.el('answer-unit').textContent,'Ω');assert.ok(ui.painted.includes('R_s = ?'));
  ui.input('answer',1);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.meterCopy.split('{')[0])&&ui.el('junction-status-text').textContent===l.running);ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(4,amount(1,'Ω'),'slipNoSubtract'));assert.ok(ui.painted.includes(fill(l.meterTag,{m:plain(50),r:plain(20)})));
  ui.input('answer',1.053);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(1,1/(1/20+1/1.053));assert.equal(ui.el('junction-equation').textContent,`R_s = ${plain(.05)} × 20 ÷ (1 − ${plain(.05)}) = ${sig(1/.95)} Ω`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',380);en.click('play');en.run(()=>en.el('junction-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipInverted));en.input('answer',1.053);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.053');assert.equal(es.el('junction-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('junction-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} current splitter and multilingual interface checks passed.`);
