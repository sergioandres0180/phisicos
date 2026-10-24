// Charge Tug: forces between charges on a rod. F = k·q₁·q₂ ÷ r², equal and opposite, for a pull between +2 and −3 µC,
// the balance point between +4 and +1 µC and what a third bead does when let go there, the two forces on a bead caught in
// the middle, a charge from its force, and doubling charges and gap; gauges, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/coulomb.html'),'utf8'),copy=require('./locales/coulomb.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'coulomb-model'),pure);const Coulomb=pure.CoulombModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const k=8.99e9;
const expected=[k*6e-12/.09,.6,k*1e-12*(1/.01+1/.04),1.8*.25/(k*5e-6)*1e6,k*4e-12/.04],units=['N','m','N','µC','N'];
const make=(i,a=expected[i])=>{const m=new Coulomb(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Coulomb(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
 near(expected[0],.5993,1e-4);near(expected[2],1.1238,1e-4);near(expected[3],10.011,1e-4);near(expected[4],.899);
});
test('the moving bead comes in over 2 s; the pull is equal and opposite and grows as 1 ÷ r²',()=>{
 const m=make(0),B=t=>m.beads(t).find(b=>b.name==='B').x;
 near(B(0),.9);near(B(1),.6);near(B(2),.3);near(B(3),.3);
 near(m.force('B',3),-expected[0]);near(m.force('A',3),expected[0]);near(m.force('B',1),-k*6e-12/.36);near(m.force('B',3)/m.force('B',1),4);
});
test('the balance point: zero force at 0.6 m, a push back toward it between A and B, and away beyond B',()=>{
 const m=make(1);near(m.forceAt(.6)+1,1,1e-12);assert.ok(m.forceAt(.5)>0);assert.ok(m.forceAt(.7)<0);assert.ok(m.forceAt(1.2)>0);
 assert.equal(m.stays(),true);near(m.probeX(3),.6);near(m.force('C',3)+1,1,1e-12);assert.equal(make(1,.61).stays(),true);assert.equal(make(1,.62).stays(),false);
 const slide=make(1,.45);near(slide.probeX(2),.45);near(slide.probeX(3),.6);assert.ok(slide.probeX(2.5)>.45&&slide.probeX(2.5)<.6);
 const away=make(1,1.8);near(away.probeX(2),1.8);near(away.probeX(3),1.92);assert.equal(new Coulomb(1).beads(0).length,2);
});
test('the two forces on the middle bead add; the charge and scaling tests reach their forces',()=>{
 const m=make(2);near(m.pair('C','A',3),k*1e-12/.01);near(m.pair('C','B',3),k*1e-12/.04);near(m.force('C',3),expected[2]);
 near(make(3).force('B',3),1.8);assert.equal(new Coulomb(3).beads(3).find(b=>b.name==='B').q,0);near(make(3,20).force('B',3),k*100e-12/.25);
 near(make(4).force('B',3),.899);near(make(4).force('B',3),k*1e-12/.01);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,.45);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.1798),'notSquared');assert.equal(slip(0,5.993e-5),'centimetres');assert.equal(slip(0,.3),null);
 assert.equal(slip(1,.45),'midpoint');assert.equal(slip(1,.72),'noRoot');assert.equal(slip(1,1.8),'outside');assert.equal(slip(1,.3),null);
 assert.equal(slip(2,.674),'subtracted');assert.equal(slip(2,.899),'firstOnly');assert.equal(slip(2,.225),null);
 assert.equal(slip(3,20.02),'notSquaredCharge');assert.equal(slip(3,1.0011e-5),'coulombs');assert.equal(slip(3,5),null);
 assert.equal(slip(4,1.798),'doubled');assert.equal(slip(4,3.596),'quadrupled');assert.equal(slip(4,.4495),'halved');assert.equal(slip(4,.2),null);
});
test('answers are validated, positions stay on a 10 m rod, and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e7])assert.equal(new Coulomb(0).setAnswer(bad),false);assert.equal(new Coulomb(1).setAnswer(10.5),false);assert.equal(new Coulomb(0).setAnswer(10.5),true);
 const m=new Coulomb(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,.45);m.advance(1.5);const n=new Coulomb();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,.45);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,answer:11},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Coulomb(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'coulomb-model'),script(source,'coulomb-model'));
 return mount(html,{scripts:['coulomb-model','coulomb-interface'],locale:'coulomb-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const fN=x=>num(x,3),values=[{x:fN(expected[0])},{x:num(.6)},{x:fN(expected[2])},{x:num(expected[3],1)},{x:fN(expected[4])}];
 const ui=open(lang),done=()=>ui.el('coulomb-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'N');
  assert.equal(ui.el('given-0').textContent,`+2 µC · ${plain(-3)} µC · r = ${plain(.3)} m`);assert.equal(ui.el('given-1').textContent,`+4 µC (0) · +1 µC (${plain(.9)} m)`);
  assert.equal(ui.el('given-2').textContent,`+1 · +1 · ${plain(-1)} µC · 0 / ${plain(.1)} / ${plain(.3)} m`);assert.equal(ui.el('given-3').textContent,`+5 µC · F = ${plain(1.8)} N · r = ${plain(.5)} m`);assert.equal(ui.el('given-4').textContent,`F = ${plain(.899)} N · 2q, 2r`);
  for(const id of ['dist-value','force-value','react-value','product-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('coulomb-equation').textContent,'F = k·q₁·q₂ ÷ r²');
  for(const key of ['viewTitle','forceGraph','scaleNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(fill(l.arrowNote,{F:plain(.6)})));
 });
 test(`${lang}: the gauges read the pull as B comes in, right on the first try`,()=>{
  ui.input('answer',.599);assert.equal(ui.el('force-value').textContent,'—');
  ui.click('step');const m=make(0),x=m.beads(.1).find(b=>b.name==='B').x;
  assert.equal(ui.el('dist-value').textContent,num(x,3));assert.equal(ui.el('force-value').textContent,fN(m.force('B',.1)));assert.equal(ui.el('react-value').textContent,fN(m.force('A',.1)));assert.equal(ui.el('product-value').textContent,plain(-6));
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,l.approachCopy);assert.equal(ui.el('coulomb-equation').textContent,`F = k·q₁·q₂ ÷ r² = ${fN(expected[0])} N`);
  const hold=fill(l.holdCopy,{F:fN(expected[0])});ui.click('play');ui.run(copyIs(hold));assert.equal(ui.el('lesson-copy').textContent,hold);
  ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('force-value').textContent,fN(-expected[0]));assert.equal(ui.el('react-value').textContent,fN(expected[0]));assert.equal(ui.el('dist-value').textContent,num(.3,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(fN(expected[0])+' N'));
 });
 test(`${lang}: the balance bead slides back from halfway, slides off beyond B, and stays at 0.6 m`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'m');assert.ok(ui.painted.includes(l.probeTag)&&ui.painted.includes(l.balanceGraph));
  ui.input('answer',.45);ui.click('play');ui.run(copyIs(l.slideCopy));ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(.45)+' m'})+' '+l.slipMidpoint);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',1.8);ui.click('play');ui.run(copyIs(l.awayCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(1.8)+' m'})+' '+l.slipOutside);
  ui.input('answer',.6);ui.click('play');ui.run(copyIs(l.stayCopy));ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('dist-value').textContent,num(.6,3));assert.equal(ui.el('force-value').textContent,fN(0));assert.equal(ui.el('product-value').textContent,plain(4));
  assert.equal(ui.el('coulomb-equation').textContent,`4 ÷ x² = 1 ÷ (${plain(.9)} − x)² → x = ${num(.6)} m`);
 });
 test(`${lang}: the two forces on the middle bead subtracted, then added`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'F =');ui.input('answer',.674);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(.674)+' N'})+' '+l.slipSubtracted);assert.ok(ui.painted.includes('F_A')&&ui.painted.includes('F_B'));
  ui.input('answer',1.124);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('force-value').textContent,fN(expected[2]));assert.equal(ui.el('react-value').textContent,fN(make(2).force('A',3)));assert.equal(ui.el('coulomb-equation').textContent,`F = F_A + F_B = ${fN(expected[2])} N`);
 });
 test(`${lang}: the missing charge pushes B with 1.8 N`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'q =');assert.equal(ui.el('answer-unit').textContent,'µC');ui.input('answer',10.01);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);assert.ok(ui.painted.includes(fill(l.targetTag,{F:plain(1.8)})));
  assert.equal(ui.el('force-value').textContent,fN(make(3,10.01).force('B',3)));assert.equal(ui.el('product-value').textContent,plain(50.05));assert.equal(ui.el('coulomb-equation').textContent,`q = F·r² ÷ (k·q₁) = ${num(expected[3])} µC`);
 });
 test(`${lang}: doubling charges and gap, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.ok(ui.painted.includes(fill(l.referenceTag,{F:plain(.899)})));ui.input('answer',.899);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('coulomb-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('dist-value').textContent,num(.2,3));assert.equal(ui.el('coulomb-equation').textContent,`F = k·2q·2q ÷ (2r)² = ${fN(expected[4])} N`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',.45);en.click('play');en.run(()=>en.el('coulomb-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMidpoint));en.input('answer',.6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.6');assert.equal(es.el('coulomb-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('coulomb-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} charge tug and multilingual interface checks passed.`);
