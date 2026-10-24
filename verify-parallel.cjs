// Room Wiring: parallel branches each get the full voltage, the currents add, and 1/R = 1/R₁ + 1/R₂ + …; a combined
// resistance, a main current, an unplugged lamp, a resistor that makes 4 Ω, and the most lamps on a 16 A breaker; slips,
// scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/parallel.html'),'utf8'),copy=require('./locales/parallel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'parallel-model'),pure);const Par=pure.ParallelModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[2,6,2,20/3,32],units=['Ω','A','A','Ω',''];
const make=(i,a=expected[i])=>{const m=new Par(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Par(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('branches switch on in turn; each draws V ÷ R and the main current is the sum',()=>{
 const m=make(0);near(m.onTime(0),1);near(m.onTime(1),2);assert.equal(m.main(.5),0);assert.equal(m.total(.5),Infinity);near(m.main(1.5),2);near(m.main(2.5),6);near(m.total(3),2);near(m.branch(1,3),4);
 const u=make(2);near(u.main(2.4),3);near(u.main(2.6),2);assert.equal(u.on(0,2.6),false);assert.equal(u.lit(3),2);
 const p=make(3);near(p.main(3),3);near(p.total(3),4);assert.equal(new Par(3).branch(1,3),0);
});
test('the breaker trips the moment the main current passes 16 A, and every branch goes off',()=>{
 const m=make(4);assert.equal(m.trips(),false);near(m.main(3),16);assert.equal(m.count(),32);
 const b=make(4,33);assert.equal(b.trips(),true);near(b.tripTime(),2);near(b.main(1.99),16);assert.equal(b.main(2),0);assert.equal(b.lit(3),0);
 const c=make(4,40);near(c.tripTime(),2*33/40);assert.equal(new Par(4).count(),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%; the breaker needs the exact most; a run counts as soon as it starts',()=>{
 for(let i=0;i<4;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(4,32).evaluate().ok,true);assert.equal(make(4,33).evaluate().ok,false);assert.equal(make(4,31).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(4,33);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(32);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,9),'added');assert.equal(slip(0,4.5),'average');assert.equal(slip(0,.5),'sumInverse');assert.equal(slip(0,3),null);
 assert.equal(slip(1,1.333),'series');assert.equal(slip(1,4),'oneBranch');assert.equal(slip(1,2),'oneBranch');assert.equal(slip(1,12),null);
 assert.equal(slip(2,3),'same');assert.equal(slip(2,1),'oneLamp');assert.equal(slip(2,12),null);
 assert.equal(slip(3,6),'subtracted');assert.equal(slip(3,.15),'inverted');assert.equal(slip(3,14),null);
 assert.equal(slip(4,8),'multiplied');assert.equal(slip(4,33),'tripped');assert.equal(slip(4,31),'spare');
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Par(0).setAnswer(bad),false);for(const bad of [0,32.5,-3,1001])assert.equal(new Par(4).setAnswer(bad),false);
 assert.equal(new Par(4).setAnswer(1000),true);assert.equal(new Par(3).setAnswer(1e6),true);
 const m=new Par(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,33);m.advance(1.5);const n=new Par();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,33);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2.5},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Par(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'parallel-model'),script(source,'parallel-model'));
 return mount(html,{scripts:['parallel-model','parallel-interface'],locale:'parallel-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('parallel-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,I,R)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('main-value').textContent,sig(I));assert.equal(ui.el('total-value').textContent,Number.isFinite(R)?sig(R):'∞');};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');
  assert.equal(ui.el('given-0').textContent,fill(l.givenPair,{a:plain(6),b:plain(3)}));assert.equal(ui.el('given-1').textContent,fill(l.givenDraw,{V:plain(12)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenUnplug,{a:plain(12),V:plain(12)}));assert.equal(ui.el('given-3').textContent,fill(l.givenMatch,{a:plain(10),t:plain(4)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenBreaker,{e:plain(.5),B:plain(16)}));
  for(const id of ['supply-value','main-value','total-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('parallel-equation').textContent,'1/R = 1/R₁ + 1/R₂ + …');
  for(const key of ['viewTitle','mainGraph','scaleNote','panelHint','supplyTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? A',plain(6)+' Ω',plain(3)+' Ω'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: two side by side, right on the first try`,()=>{
  ui.input('answer',2);assert.equal(ui.el('main-value').textContent,'—');ui.click('step');assert.equal(ui.el('lesson-copy').textContent,fill(l.switchCopy,{n:plain(0),N:plain(2),I:sig(0),V:plain(12)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(12,6,2);assert.equal(ui.el('parallel-equation').textContent,'1/R = 1/6 + 1/3 = 1/2, R = 2 Ω');assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(2)+' Ω',`R = ${plain(12)} V ÷ ${sig(6)} A = ${sig(2)} Ω`,l.timeAxis,sig(4)+' A'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the main current, in series, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  ui.input('answer',1.333);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(1.333,'A'),'slipSeries'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(12,6,2);assert.equal(ui.el('parallel-equation').textContent,'I = 12 ÷ 6 + 12 ÷ 3 = 2 + 4 = 6 A');
 });
 test(`${lang}: unplugging a lamp, the same current, then right`,()=>{
  ui.click('mission-2');ui.input('answer',3);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===fill(l.unplugCopy,{V:plain(12),I:sig(2)}));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(2,amount(3,'A'),'slipSame'));assert.ok(ui.painted.includes(l.unpluggedTag));
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(12,2,6);assert.equal(ui.el('parallel-equation').textContent,'I = 12 ÷ 12 + 12 ÷ 12 = 2 A');
 });
 test(`${lang}: making 4 Ω, subtracted, then right; your resistor goes in`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'R₂ =');assert.ok(ui.painted.includes('R₂ = ?'));
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(6,'Ω'),'slipSubtracted'));assert.ok(ui.painted.includes(fill(l.targetTag,{R:plain(4),I:plain(3)})));
  ui.input('answer',6.667);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  const I=1.2+12/6.667;meters(12,I,12/I);assert.equal(ui.el('parallel-equation').textContent,`1/R₂ = 1/4 − 1/10, R₂ = ${sig(20/3)} Ω`);
 });
 test(`${lang}: the breaker, tripped, too few, then the most; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'N =');assert.equal(ui.el('answer-unit').textContent,'');assert.ok(ui.painted.includes('N = ?'));
  ui.input('answer',33);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===fill(l.tripCopy,{m:plain(33),B:plain(16)}));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(4,amount(33,''),'slipTripped'));meters(230,0,Infinity);assert.ok(ui.painted.includes(l.trippedTag)&&ui.painted.includes(fill(l.lampsTag,{N:plain(33)})));
  ui.input('answer',31);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(31,''),'slipSpare'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('answer',32);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('parallel-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(230,16,230/16);assert.ok(ui.painted.includes(fill(l.breakerTag,{B:plain(16)})));assert.equal(ui.el('parallel-equation').textContent,`N = 16 ÷ ${plain(.5)} = 32`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',33);en.click('play');en.run(()=>en.el('parallel-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipTripped));en.input('answer',32);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'32');assert.equal(es.el('parallel-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('parallel-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} room wiring and multilingual interface checks passed.`);
