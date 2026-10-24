// Fuse Test: I = V ÷ R and a fuse that melts the moment the current reaches its rating; a kettle, the least resistance a
// fuse survives, wet skin on the mains, the most voltage on a rated resistor, and a short circuit; slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/fuse.html'),'utf8'),copy=require('./locales/fuse.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'fuse-model'),pure);const Fuse=pure.FuseModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[230/26.45,6,230,4.7,240],units=['A','Ω','mA','V','A'];
const make=(i,a=expected[i])=>{const m=new Fuse(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(expected[0],8.69565,1e-5);
 expected.forEach((x,i)=>{const m=new Fuse(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('the supply ramps over 2 s and I = V ÷ R, with the battery’s own resistance in a short',()=>{
 const k=make(0);near(k.supply(1),115);near(k.current(1),115/26.45);near(k.current(3),expected[0]);assert.equal(k.melts(),false);assert.equal(k.meltTime(),Infinity);
 const s=make(2);near(s.current(3),.23);assert.equal(s.melts(),false);const sh=make(4);near(sh.resistance(),.05);near(sh.current(3),240);assert.equal(sh.melts(),false);
 assert.equal(new Fuse(1).current(3),0);assert.equal(new Fuse(3).supply(3),0);
});
test('the fuse melts the moment the current reaches its rating, within 0.05% grace',()=>{
 const m=make(1,5.9);assert.equal(m.melts(),true);near(m.meltTime(),2*2/(12/5.9));near(m.current(m.meltTime()-1e-6),2,1e-5);assert.equal(m.current(m.meltTime()),0);assert.equal(m.current(3),0);
 assert.equal(make(1,12/(2*1.0004)).melts(),false);assert.equal(make(1,12/(2*1.0006)).melts(),true);assert.equal(make(1).melts(),false);
 const r=make(3,4.8);assert.equal(r.melts(),true);near(r.meltTime(),2*4.7/4.8);assert.equal(make(3).melts(),false);near(make(3).current(3),.1);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('currents count within 2%; a limit must hold with at most 2% to spare; a run counts as soon as it starts',()=>{
 for(const i of [0,2,4]){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(1,6.11).evaluate().ok,true);assert.equal(make(1,6.13).evaluate().ok,false);assert.equal(make(1,5.99).evaluate().ok,false);assert.equal(make(1,12/(2*1.0004)).evaluate().ok,true);
 assert.equal(make(3,4.61).evaluate().ok,true);assert.equal(make(3,4.6).evaluate().ok,false);assert.equal(make(3,4.71).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,5.9);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,6083.5),'kettleTimes');assert.equal(slip(0,.115),'kettleInverted');assert.equal(slip(0,13),null);
 assert.equal(slip(1,24),'leastTimes');assert.equal(slip(1,.1667),'leastInverted');assert.equal(slip(1,5.9),'melted');assert.equal(slip(1,6.5),'spare');
 assert.equal(slip(2,.23),'amps');assert.equal(slip(2,23),null);
 assert.equal(slip(3,470),'ratingDivided');assert.equal(slip(3,4.8),'melted');assert.equal(slip(3,4.5),'spare');
 assert.equal(slip(4,.6),'shortTimes');assert.equal(slip(4,.00417),'shortInverted');assert.equal(slip(4,12),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Fuse(0).setAnswer(bad),false);assert.equal(new Fuse(3).setAnswer(1e6),true);
 const m=new Fuse(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,4.8);m.advance(1.5);const n=new Fuse();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,4.8);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Fuse(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'fuse-model'),script(source,'fuse-model'));
 return mount(html,{scripts:['fuse-model','fuse-interface'],locale:'fuse-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('fuse-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,I,load)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('current-value').textContent,sig(I));assert.equal(ui.el('load-value').textContent,num(load,1));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  assert.equal(ui.el('given-0').textContent,fill(l.givenKettle,{R:plain(26.45),V:plain(230)}));assert.equal(ui.el('given-1').textContent,fill(l.givenLeast,{V:plain(12),F:plain(2)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenSkin,{R:plain(1000),V:plain(230)}));assert.equal(ui.el('given-3').textContent,fill(l.givenRating,{R:plain(47),F:plain(.1)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenShort,{V:plain(12),r:plain(.05)}));
  for(const id of ['supply-value','current-value','load-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('fuse-equation').textContent,'I = V ÷ R');
  for(const key of ['viewTitle','currentGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);
  for(const s of ['? V','? A',fill(l.fuseTag,{F:plain(13)}),fill(l.kettleTag,{R:plain(26.45)})])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the kettle, right on the first try`,()=>{
  ui.input('answer',8.7);assert.equal(ui.el('current-value').textContent,'—');ui.click('step');assert.ok(starts(l.rampCopy)());
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(230,expected[0],100*expected[0]/13);assert.equal(ui.el('fuse-equation').textContent,`I = V ÷ R = 230 ÷ ${plain(26.45)} = ${sig(expected[0])} A`);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(8.7)+' A',fill(l.ratingTag,{F:plain(13)}),sig(expected[0])+' A',l.voltAxis])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the least resistance melts the fuse, has too much to spare, then holds`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');assert.ok(ui.painted.includes('R = ?'));
  ui.input('answer',5.9);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===fill(l.meltCopy,{F:plain(2)}));assert.equal(ui.el('fuse-status-text').textContent,l.running);ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('lesson-copy').textContent,result(1,amount(5.9,'Ω'),'slipMelted'));
  meters(12,0,0);assert.ok(ui.painted.includes(l.meltedTag)&&ui.painted.includes(l.offBanner));
  ui.input('answer',6.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(1,amount(6.5,'Ω'),'slipSpare'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(12,2,100);assert.equal(ui.el('fuse-equation').textContent,'R = V ÷ I = 12 ÷ 2 = 6 Ω');
 });
 test(`${lang}: wet skin, in amperes, then right; the fuse is far off the scale`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'mA');
  ui.input('answer',.23);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(.23,'mA'),'slipAmps'));
  assert.ok(ui.painted.includes(fill(l.offScaleTag,{F:plain(13)}))&&ui.painted.includes(fill(l.skinTag,{R:plain(1000)})));
  ui.input('answer',230);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(230,.23,100*.23/13);assert.equal(ui.el('fuse-equation').textContent,`I = 230 ÷ 1000 = ${plain(.23)} A = 230 mA`);
 });
 test(`${lang}: the most voltage, divided, then right; the fuse holds`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  ui.input('answer',470);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(470,'V'),'slipRatingDivided'));
  assert.ok(ui.painted.includes(fill(l.ratedTag,{R:plain(47),F:plain(.1)}))&&ui.painted.includes(fill(l.fuseTag,{F:plain(.1)})));
  ui.input('answer',4.7);ui.click('play');ui.run(()=>ui.el('time-value').textContent===num(2.5));assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{I:sig(.1),F:plain(.1)}));
  ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(4.7,.1,100);assert.equal(ui.el('fuse-equation').textContent,`V = I·R = ${plain(.1)} × 47 = ${plain(4.7)} V`);
 });
 test(`${lang}: the short circuit, multiplied, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',.6);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(.6,'A'),'slipShortTimes'));
  assert.ok(ui.painted.includes(l.shortTag)&&ui.painted.includes(fill(l.internalTag,{r:plain(.05)}))&&ui.painted.includes(fill(l.fuseTag,{F:plain(300)})));
  ui.input('answer',240);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('fuse-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(12,240,80);assert.equal(ui.el('fuse-equation').textContent,`I = V ÷ r = 12 ÷ ${plain(.05)} = 240 A`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',4.8);en.click('play');en.run(()=>en.el('fuse-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMelted));en.input('answer',4.7);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'4.7');assert.equal(es.el('fuse-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('fuse-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} fuse test and multilingual interface checks passed.`);
