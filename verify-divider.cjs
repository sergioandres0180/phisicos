// Voltage Divider: resistors in series share the supply in proportion, V_out = V·R₂ ÷ (R₁ + R₂); an output, a designed
// divider, a light sensor, a thermistor, and a node in a chain of three; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/divider.html'),'utf8'),copy=require('./locales/divider.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'divider-model'),pure);const Div=pure.DividerModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[6,1,9/11,4.7,6],units=['V','kΩ','V','kΩ','V'];
const make=(i,a=expected[i])=>{const m=new Div(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(expected[2],.818182,1e-5);
 expected.forEach((x,i)=>{const m=new Div(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('one current down the chain, in mA; each node sits at the share of resistance below it',()=>{
 const m=make(0);near(m.supply(1),4.5);near(m.current(3),3);near(m.out(3),6);near(m.node(0,3),9);near(m.out(1),3);
 const d=make(1);near(d.total(),2.4);near(d.out(3),5);const s=make(3);near(s.out(3),2.5);near(s.current(3),5/9.4);
 const l=make(4);near(l.node(1,3),10);near(l.node(2,3),6);near(l.node(3,3),0);near(l.current(3),2);
 assert.equal(new Div(1).current(3),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,1.96);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,3),'splitSwapped');assert.equal(slip(0,18),'noSum');assert.equal(slip(0,9),null);
 assert.equal(slip(1,1.96),'designSwapped');assert.equal(slip(1,3.36),'total');assert.equal(slip(1,2.4),null);
 assert.equal(slip(2,8.182),'lightSwapped');assert.equal(slip(2,.9),'lightNoSum');assert.equal(slip(2,9),null);
 assert.equal(slip(3,9.4),'doubled');assert.equal(slip(3,2.35),'half');assert.equal(slip(3,5),null);
 assert.equal(slip(4,4),'twoOnly');assert.equal(slip(4,10),'top');assert.equal(slip(4,12),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Div(0).setAnswer(bad),false);for(const bad of [0,-2,2e6])assert.equal(new Div(1).setAnswer(bad),false);
 assert.equal(new Div(0).setAnswer(1e4),true);assert.equal(new Div(3).setAnswer(1e6),true);
 const m=new Div(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,9.4);m.advance(1.5);const n=new Div();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,9.4);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Div(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'divider-model'),script(source,'divider-model'));
 return mount(html,{scripts:['divider-model','divider-interface'],locale:'divider-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('divider-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,I,U)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('current-value').textContent,sig(I));assert.equal(ui.el('out-value').textContent,sig(U));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  assert.equal(ui.el('given-0').textContent,fill(l.givenSplit,{V:plain(9),a:plain(1),b:plain(2)}));assert.equal(ui.el('given-1').textContent,fill(l.givenDesign,{t:plain(5),V:plain(12),a:plain(1.4)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenLight,{V:plain(9),a:plain(10),b:plain(1)}));assert.equal(ui.el('given-3').textContent,fill(l.givenSensor,{V:plain(5),a:plain(4.7),t:plain(2.5)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenLadder,{V:plain(12),a:plain(1),b:plain(2),c:plain(3)}));
  for(const id of ['supply-value','current-value','out-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('divider-equation').textContent,'V_out = V·R₂ ÷ (R₁ + R₂)');
  for(const key of ['viewTitle','potentialGraph','scaleNote','panelHint','supplyTag','outTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? V',plain(1)+' kΩ',plain(2)+' kΩ'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: splitting 9 V, right on the first try`,()=>{
  ui.input('answer',6);assert.equal(ui.el('out-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.rampCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(9,3,6);assert.equal(ui.el('divider-equation').textContent,'V_out = 9 × 2 ÷ (1 + 2) = 6 V');assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(6)+' V',sig(6)+' V',l.rAxis])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: designing a divider, swapped, then right; your resistor goes in`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'R₂ =');assert.equal(ui.el('answer-unit').textContent,'kΩ');assert.ok(ui.painted.includes('R₂ = ?'));
  ui.input('answer',1.96);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(1.96,'kΩ'),'slipDesignSwapped'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(fill(l.targetTag,{V:plain(5)})));
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(12,5,5);assert.equal(ui.el('divider-equation').textContent,`R₂ = R₁·V_out ÷ (V − V_out) = ${plain(1.4)} × 5 ÷ 7 = 1 kΩ`);
 });
 test(`${lang}: the light sensor, swapped, then right`,()=>{
  ui.click('mission-2');ui.input('answer',8.182);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(8.182,'V'),'slipLightSwapped'));
  assert.ok(ui.painted.includes(l.lightTag)&&ui.painted.includes(plain(10)+' kΩ'));
  ui.input('answer',.818);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(9,9/11,9/11);assert.equal(ui.el('divider-equation').textContent,`V_out = 9 × 1 ÷ (10 + 1) = ${sig(9/11)} V`);
 });
 test(`${lang}: the thermistor, doubled, then right`,()=>{
  ui.click('mission-3');ui.input('answer',9.4);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(9.4,'kΩ'),'slipDoubled'));assert.ok(ui.painted.includes(l.heatTag));
  ui.input('answer',4.7);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(5,5/9.4,2.5);assert.equal(ui.el('divider-equation').textContent,`R₂ = ${plain(4.7)} × ${plain(2.5)} ÷ (5 − ${plain(2.5)}) = ${plain(4.7)} kΩ`);
 });
 test(`${lang}: three resistors, the wrong node, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(10,'V'),'slipTop'));assert.ok(ui.painted.includes(plain(3)+' kΩ'));
  ui.input('answer',6);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('divider-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(12,2,6);assert.equal(ui.el('divider-equation').textContent,'V = 12 × 3 ÷ (1 + 2 + 3) = 6 V');
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',2.35);en.click('play');en.run(()=>en.el('divider-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipHalf));en.input('answer',4.7);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'4.7');assert.equal(es.el('divider-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('divider-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} voltage divider and multilingual interface checks passed.`);
