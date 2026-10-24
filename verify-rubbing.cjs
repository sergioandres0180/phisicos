// Static Rub: charge by rubbing. Q = −n·e on what gains electrons and +n·e on what loses them, the total staying 0; the
// electrons on a comb, a dust grain's whole number of electrons, an ion's charge, the purely relative 2% window for
// charges near 10⁻¹⁹ C, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/rubbing.html'),'utf8'),copy=require('./locales/rubbing.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'rubbing-model'),pure);const Rub=pure.RubbingModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const e=1.602e-19,expected=[-480.6,480.6,8e-9/e,2.4e-18/e,2*e],units=['nC','nC','','','C'],durations=[2,2,2,3,2];
const make=(i,a=expected[i])=>{const m=new Rub(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length',()=>{
 expected.forEach((x,i)=>{const m=new Rub(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),durations[i]);});
});
test('charge is moved, never made: the two charges always add to 0',()=>{
 for(let i=0;i<5;i++){const m=make(i);for(const t of [0,.37,1,1.5,2,3]){const c=m.charges(t);assert.equal(c.gain+c.lose,0);near(c.lose,m.moved(t)*e);}}
 near(make(0).moved(1),1.5e12);near(make(0).moved(2),3e12);near(make(2).moved(2),8e-9/e);
});
test('the dust grain and the atom gain or lose whole electrons, the last one exactly at the end',()=>{
 const g=make(3);assert.equal(g.moved(0),0);assert.equal(g.moved(.2-1e-6),0);assert.equal(g.moved(.2),1);assert.equal(g.moved(1.5),7);assert.equal(g.moved(3-1e-6),14);assert.equal(g.moved(3),15);
 const a=make(4);assert.equal(a.moved(.99),0);assert.equal(a.moved(1),1);assert.equal(a.moved(1.99),1);assert.equal(a.moved(2),2);near(a.charges(2).lose,2*e);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(10);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window even for 10⁻¹⁹ C; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(4,1e-30).evaluate().ok,false);assert.equal(make(4,0).evaluate().ok,false);assert.equal(make(3,15).evaluate().ok,true);assert.equal(make(3,14).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,-480.6);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(480.6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,480.6),'sign');assert.equal(slip(0,-4.806e-7),'coulombs');assert.equal(slip(0,3e12/e*1e9),'divided');assert.equal(slip(0,-300),null);
 assert.equal(slip(1,-480.6),'sameSign');assert.equal(slip(1,0),'none');assert.equal(slip(1,300),null);
 assert.equal(slip(2,8e-9*e),'multiplied');assert.equal(slip(2,8/e),'nano');assert.equal(slip(2,1e9),null);
 assert.equal(slip(3,e/2.4e-18),'inverted');assert.equal(slip(3,30),null);
 assert.equal(slip(4,-3.204e-19),'ionSign');assert.equal(slip(4,1.602e-19),'oneElectron');assert.equal(slip(4,2),'electrons');assert.equal(slip(4,6.4e-19),null);
});
test('answers are validated: charges may be signed or 0, counts are positive, and nothing moves without one',()=>{
 for(const bad of [NaN,Infinity,-Infinity,1e46])assert.equal(new Rub(0).setAnswer(bad),false);for(const ok of [0,-5,5,-1e45])assert.equal(new Rub(0).setAnswer(ok),true);
 for(const bad of [0,-1,1e31,NaN])assert.equal(new Rub(2).setAnswer(bad),false);assert.equal(new Rub(3).setAnswer(1e30),true);
 const m=new Rub(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,2);m.advance(.5);const n=new Rub();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,.5);assert.equal(n.answer,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:2.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Rub(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
 const c=new Rub(3);assert.equal(c.restore({...make(3,15).snapshot(),answer:0}),false);
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'rubbing-model'),script(source,'rubbing-model'));
 return mount(html,{scripts:['rubbing-model','rubbing-interface'],locale:'rubbing-locale',langs,storage});
};
// The page writes very small and very large values as a × 10ⁿ (mantissa to 4 figures).
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const four=x=>plain(Number(x.toPrecision(4))),charge=q=>q===0?'0':(q>0?'+':'')+four(q);
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>{const x=new Rub(i).exact();return {q:four(x),n:four(x)};};
 const ui=open(lang),done=()=>ui.el('rubbing-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'Q =');assert.equal(ui.el('answer-unit').textContent,'nC');
  assert.equal(ui.el('given-0').textContent,'n = 3 × 10¹² e⁻');assert.equal(ui.el('given-2').textContent,`Q = ${plain(-8)} nC`);assert.equal(ui.el('given-3').textContent,`Q = ${plain(-2.4e-18)} C`);assert.equal(ui.el('given-4').textContent,'6 p⁺ · 6 → 4 e⁻');
  for(const id of ['moved-value','gain-value','lose-value','total-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('rubbing-equation').textContent,'Q = ±n·e');
  for(const key of ['viewTitle','chargeGraph','panelHint','scaleNote','balloonTag','woolTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(fill(l.markNote,{n:plain(3e11)})));
 });
 test(`${lang}: the readings appear once the rub starts, and the balloon is right on the first try`,()=>{
  ui.input('answer',-480.6);assert.equal(ui.el('moved-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('moved-value').textContent,four(1.5e11));assert.equal(ui.el('gain-value').textContent,charge(-1.5e11*e));assert.equal(ui.el('lose-value').textContent,charge(1.5e11*e));assert.equal(ui.el('total-value').textContent,'0');
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,fill(l.rubCopy,{n:four(1.5e11)}));
  assert.equal(ui.el('rubbing-equation').textContent,`Q = −n·e = ${four(-480.6)} nC`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis)&&ui.painted.includes(l.totalTag));
  assert.ok(ui.painted.includes('Q = '+charge(-480.6)+' nC')&&ui.painted.includes('Q = '+charge(480.6)+' nC'));
 });
 test(`${lang}: the wool given the balloon's sign, then the right one`,()=>{
  ui.click('mission-1');ui.input('answer',-480.6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(-480.6)+' nC'})+' '+l.slipSameSign);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('rubbing-equation').textContent,`Q = +n·e = +${four(480.6)} nC`);
  ui.input('answer',480.6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the electrons on a comb, typed in scientific notation`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');assert.equal(ui.el('rubbing-equation').textContent,'n = |Q| ÷ e');
  ui.input('answer','4.99e10');ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);assert.ok(ui.painted.includes(l.combTag)&&ui.painted.includes(l.hairTag)&&ui.painted.includes(l.countGraph));
  assert.equal(ui.el('rubbing-equation').textContent,`n = |Q| ÷ e = ${four(8e-9/e)}`);assert.equal(ui.el('moved-value').textContent,four(8e-9/e));
 });
 test(`${lang}: the dust grain's whole number of electrons`,()=>{
  ui.click('mission-3');ui.input('answer',15);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.ok(ui.painted.includes(l.grainTag));
  assert.equal(ui.el('rubbing-equation').textContent,`n = |Q| ÷ e = ${num(2.4e-18/e)} ≈ 15`);assert.equal(ui.el('moved-value').textContent,'15');
 });
 test(`${lang}: an ion's charge, the electron-count slip, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'q =');assert.equal(ui.el('answer-unit').textContent,'C');
  ui.input('answer',2);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+fill(l.missCopy,{p:'2 C'})+' '+l.slipElectrons);
  ui.input('answer','3.204e-19');ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('rubbing-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('rubbing-equation').textContent,`q = +2·e = +${four(2*e)} C`);assert.ok(ui.painted.includes(l.ionTag)&&ui.painted.includes(l.freeTag));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',-480.6);en.click('play');en.run(()=>en.el('rubbing-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSameSign));en.input('answer',480.6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'480.6');assert.equal(es.el('rubbing-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('rubbing-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} static rub and multilingual interface checks passed.`);
