// Bulb Chain: a series circuit shares one path, so one current flows through every bulb and the resistances add; the
// current, the total resistance, a bulb's share of the voltage, a fourth bulb, and the fewest fairy lights for 230 V;
// slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/series.html'),'utf8'),copy=require('./locales/series.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'series-model'),pure);const Series=pure.SeriesModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[1,10,10,.75,92],units=['A','Ω','V','A',''];
const make=(i,a=expected[i])=>{const m=new Series(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Series(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('one current through every bulb; the resistances add and the voltages share in proportion',()=>{
 const m=make(0);near(m.total(),12);near(m.supply(1),6);near(m.current(1),.5);near(m.current(3),1);for(let i=0;i<3;i++)near(m.across(i,3),4);near(m.glow(0,3),.25);
 const s=make(2);near(s.total(),10);near(s.current(3),2);near(s.across(0,3),4);near(s.across(1,3),10);near(s.across(2,3),6);near(s.marked(3),10);assert.equal(s.glow(1,3),1);
 const f=make(3);near(f.current(3),.75);near(f.marked(3),3);assert.ok(f.glow(0,3)<m.glow(0,3));
});
test('fairy lights share 230 V; too few and one burns out, putting every bulb out',()=>{
 const m=make(4);assert.equal(m.blows(),false);near(m.current(3),.2);near(m.across(0,3),2.5);near(m.glow(0,3),1);assert.equal(m.resistances().length,92);
 const b=make(4,91);assert.equal(b.blows(),true);near(b.blowTime(),2*2.5*91/230);near(b.across(0,b.blowTime()-1e-6),2.5,1e-5);assert.equal(b.current(b.blowTime()),0);assert.equal(b.current(3),0);
 assert.equal(new Series(4).current(3),0);assert.equal(new Series(4).count(),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%; the fairy lights need the exact fewest; a run counts as soon as it starts',()=>{
 for(let i=0;i<4;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(4,92).evaluate().ok,true);assert.equal(make(4,93).evaluate().ok,false);assert.equal(make(4,91).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(4,91);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(92);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,3),'oneBulb');assert.equal(slip(0,12),'resistance');assert.equal(slip(0,4),null);
 assert.equal(slip(1,.968),'parallel');assert.equal(slip(1,3.333),'average');assert.equal(slip(1,30),null);
 assert.equal(slip(2,6.667),'equalShare');assert.equal(slip(2,2),'current');assert.equal(slip(2,20),null);
 assert.equal(slip(3,1),'same');assert.equal(slip(3,1.333),'more');assert.equal(slip(3,3),null);
 assert.equal(slip(4,575),'multiplied');assert.equal(slip(4,91),'blown');assert.equal(slip(4,46),'blown');assert.equal(slip(4,93),'notFewest');
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Series(0).setAnswer(bad),false);for(const bad of [0,91.5,-3,1001])assert.equal(new Series(4).setAnswer(bad),false);
 assert.equal(new Series(4).setAnswer(1000),true);assert.equal(new Series(4).setAnswer(1),true);assert.equal(new Series(2).setAnswer(.5),true);
 const m=new Series(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,91);m.advance(1.5);const n=new Series();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,91);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2.5},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Series(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'series-model'),script(source,'series-model'));
 return mount(html,{scripts:['series-model','series-interface'],locale:'series-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('series-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,I,U)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('current-value').textContent,sig(I));assert.equal(ui.el('bulb-value').textContent,sig(U));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  const g={V:plain(12),R:plain(4),a:plain(4),b:plain(4),c:plain(4),v:plain(0)};assert.equal(ui.el('given-0').textContent,fill(l.givenThree,g));
  assert.equal(ui.el('given-1').textContent,fill(l.givenTotal,{V:plain(20),R:plain(2),a:plain(2),b:plain(5),c:plain(3)}));assert.equal(ui.el('given-2').textContent,fill(l.givenShare,{V:plain(20),R:plain(2),a:plain(2),b:plain(5),c:plain(3)}));
  assert.equal(ui.el('given-3').textContent,fill(l.givenFourth,g));assert.equal(ui.el('given-4').textContent,fill(l.givenLights,{V:plain(230),v:plain(2.5)}));
  for(const id of ['supply-value','current-value','bulb-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('series-equation').textContent,'R = R₁ + R₂ + …');
  for(const key of ['viewTitle','barGraph','scaleNote','panelHint','supplyTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? V','? A',plain(4)+' Ω',plain(12)+' V'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: three bulbs, right on the first try`,()=>{
  ui.input('answer',1);assert.equal(ui.el('current-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.rampCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(12,1,4);assert.equal(ui.el('series-equation').textContent,'I = V ÷ (R₁ + R₂ + R₃) = 12 ÷ 12 = 1 A');assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(1)+' A',`${sig(4)} + ${sig(4)} + ${sig(4)} = ${sig(12)} V`,sig(1)+' A'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the total resistance, combined as if side by side, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');
  ui.input('answer',.968);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(.968,'Ω'),'slipParallel'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(20,2,10);assert.equal(ui.el('series-equation').textContent,'R = R₁ + R₂ + R₃ = 2 + 5 + 3 = 10 Ω');
 });
 test(`${lang}: sharing the voltage, equally, then in proportion`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');
  ui.input('answer',6.667);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(6.667,'V'),'slipEqualShare'));
  ui.input('answer',10);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(20,2,10);assert.ok(ui.painted.includes(`${sig(4)} + ${sig(10)} + ${sig(6)} = ${sig(20)} V`)&&ui.painted.includes(l.guessTag));assert.equal(ui.el('series-equation').textContent,'I = 20 ÷ 10 = 2 A, V₂ = I·R₂ = 2 × 5 = 10 V');
 });
 test(`${lang}: a fourth bulb, the same current, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(1,'A'),'slipSame'));
  ui.input('answer',.75);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('series-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(12,.75,3);assert.equal(ui.el('series-equation').textContent,`I = 12 ÷ (4 × 4) = ${plain(.75)} A`);
 });
 test(`${lang}: fairy lights, too few burn out, too many to spare, then the fewest`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'N =');assert.equal(ui.el('answer-unit').textContent,'');assert.ok(ui.painted.includes('N = ?'));
  ui.input('answer',91);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===fill(l.blownCopy,{v:plain(2.5)}));assert.equal(ui.el('series-status-text').textContent,l.running);
  ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(91,''),'slipBlown'));meters(230,0,0);assert.ok(ui.painted.includes(l.blownTag)&&ui.painted.includes(fill(l.bulbsTag,{N:plain(91)})));
  ui.input('answer',93);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(93,''),'slipNotFewest'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('answer',92);ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.lightsCopy.split('{')[0]));ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);meters(230,.2,2.5);
  for(const s of [fill(l.ratedTag,{v:plain(2.5)}),fill(l.eachTag,{N:plain(92)}),`${plain(92)} × ${sig(2.5)} V = ${sig(230)} V`])assert.ok(ui.painted.includes(s),s);
  assert.equal(ui.el('series-equation').textContent,`N = 230 ÷ ${plain(2.5)} = 92`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',91);en.click('play');en.run(()=>en.el('series-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipBlown));en.input('answer',92);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'92');assert.equal(es.el('series-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('series-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} bulb chain and multilingual interface checks passed.`);
