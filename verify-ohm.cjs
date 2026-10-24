// Ohm's Law Lab: V = I·R for a fixed resistor; a current, a resistance, the voltage for a current, a current read from an
// I–V line, and the resistor that sets an LED's current; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ohm.html'),'utf8'),copy=require('./locales/ohm.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ohm-model'),pure);const Ohm=pure.OhmModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[3,24,110,.45,350],units=['A','Ω','V','A','Ω'];
const make=(i,a=expected[i])=>{const m=new Ohm(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Ohm(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('the supply ramps over 2 s and the current follows V = I·R',()=>{
 const m=make(0);near(m.supply(0),0);near(m.supply(1),6);near(m.supply(2),12);near(m.supply(3),12);near(m.current(1),1.5);near(m.current(3),3);near(m.across(3),12);
 const r=make(1);near(r.current(3),.25);const s=make(2);near(s.supply(3),110);near(s.current(3),.5);near(s.across(3),110);
 const g=make(3);near(g.current(3),.45);near(g.across(1),4.5);assert.equal(new Ohm(2).supply(3),0);
});
test('the LED passes nothing below 2 V, then leaves the rest to your resistor',()=>{
 const m=make(4);assert.equal(m.current(.4),0);assert.equal(m.across(.4),0);near(m.current(3),.02);near(m.across(3),7);near(m.current(1),(4.5-2)/350);
 assert.equal(new Ohm(4).current(3),0);assert.equal(new Ohm(4).across(3),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,1.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(24);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,48),'currentTimes');assert.equal(slip(0,.3333),'currentInverted');assert.equal(slip(0,4),null);
 assert.equal(slip(1,1.5),'resistorTimes');assert.equal(slip(1,.04167),'resistorInverted');assert.equal(slip(1,6),null);
 assert.equal(slip(2,440),'supplyDivided');assert.equal(slip(2,.00227),'supplyInverted');assert.equal(slip(2,220),null);
 assert.equal(slip(3,180),'graphTimes');assert.equal(slip(3,20),'graphResistance');assert.equal(slip(3,.1),null);
 assert.equal(slip(4,450),'noLed');assert.equal(slip(4,100),'ledOnly');assert.equal(slip(4,9),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e7])assert.equal(new Ohm(0).setAnswer(bad),false);for(const bad of [0,-5,1e4+1])assert.equal(new Ohm(2).setAnswer(bad),false);
 assert.equal(new Ohm(2).setAnswer(1e4),true);assert.equal(new Ohm(4).setAnswer(1e7),true);
 const m=new Ohm(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,450);m.advance(1.5);const n=new Ohm();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,450);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Ohm(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ohm-model'),script(source,'ohm-model'));
 return mount(html,{scripts:['ohm-model','ohm-interface'],locale:'ohm-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('ohm-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,U,I)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('volt-value').textContent,sig(U));assert.equal(ui.el('current-value').textContent,sig(I));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  assert.equal(ui.el('given-0').textContent,fill(l.givenCurrent,{V:plain(12),R:plain(4)}));assert.equal(ui.el('given-1').textContent,fill(l.givenResistor,{V:plain(6),I:plain(.25)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenSupply,{I:plain(.5),R:plain(220)}));assert.equal(ui.el('given-3').textContent,fill(l.givenGraph,{v:plain(2),i:plain(.1),V:plain(9)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenLed,{V:plain(9),v:plain(2),m:plain(20)}));
  for(const id of ['supply-value','volt-value','current-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('ohm-equation').textContent,'V = I·R');
  for(const key of ['viewTitle','ivGraph','scaleNote','panelHint','supplyTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? V','? A',plain(4)+' Ω'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the current, right on the first try`,()=>{
  ui.input('answer',3);assert.equal(ui.el('current-value').textContent,'—');ui.click('step');assert.ok(starts(l.rampCopy)());
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(12,12,3);assert.equal(ui.el('ohm-equation').textContent,'I = V ÷ R = 12 ÷ 4 = 3 A');assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(3)+' A',sig(3)+' A',sig(12)+' V',l.voltAxis])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the resistance, multiplied, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');
  ui.input('answer',1.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(1.5,'Ω'),'slipResistorTimes'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',24);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(6,6,.25);assert.equal(ui.el('ohm-equation').textContent,`R = V ÷ I = 6 ÷ ${plain(.25)} = 24 Ω`);
 });
 test(`${lang}: the supply voltage, inverted, then right; your voltage sets the supply`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  ui.input('answer',.00227);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(.00227,'V'),'slipSupplyInverted'));
  ui.input('answer',110);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(110,110,.5);assert.ok(ui.painted.includes(fill(l.targetTag,{I:plain(.5)})));assert.equal(ui.el('ohm-equation').textContent,`V = I·R = ${plain(.5)} × 220 = 110 V`);
 });
 test(`${lang}: reading the line, the resistance instead, then right`,()=>{
  ui.click('mission-3');ui.input('answer',20);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(20,'A'),'slipGraphResistance'));
  assert.ok(ui.painted.includes(fill(l.pointTag,{v:plain(2),i:plain(.1)})));
  ui.input('answer',.45);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(9,9,.45);assert.equal(ui.el('ohm-equation').textContent,`R = 2 ÷ ${plain(.1)} = 20 Ω, I = 9 ÷ 20 = ${plain(.45)} A`);
 });
 test(`${lang}: the LED's resistor, the whole supply, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.ok(ui.painted.includes('R = ?')&&ui.painted.includes(l.ledTag));
  ui.input('answer',450);ui.click('step');assert.equal(ui.el('lesson-copy').textContent,fill(l.ledOffCopy,{V:sig(.45)}));
  ui.click('play');ui.run(starts(l.ledCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(450,'Ω'),'slipNoLed'));
  ui.input('answer',350);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('ohm-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(9,7,.02);assert.ok(ui.painted.includes(plain(350)+' Ω'));assert.equal(ui.el('ohm-equation').textContent,`R = (9 − 2) ÷ ${plain(.02)} = 350 Ω`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',100);en.click('play');en.run(()=>en.el('ohm-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLedOnly));en.input('answer',350);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'350');assert.equal(es.el('ohm-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('ohm-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} Ohm's law lab and multilingual interface checks passed.`);
