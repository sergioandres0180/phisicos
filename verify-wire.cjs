// Wire Stretcher: a wire's resistance grows with its length and falls with its cross-section, R = ρ·L ÷ A; twice the
// length doubles it, twice the diameter quarters it, stretching to twice the length at the same volume quadruples it, and
// the length of nichrome that makes 20 Ω; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/wire.html'),'utf8'),copy=require('./locales/wire.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'wire-model'),pure);const Wire=pure.WireModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const coil=20*Math.PI*1e-8/1.1e-6,expected=[.0672,6,2,20,coil],units=['Ω','Ω','Ω','Ω','m'];
const make=(i,a=expected[i])=>{const m=new Wire(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(coil,.5711987,1e-6);expected.forEach((x,i)=>{const m=new Wire(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('R = ρ·L ÷ A follows each change, made steadily over 2 s and held',()=>{
 const c=make(0);assert.equal(c.resistance(0),0);near(c.resistance(1),.0336);near(c.resistance(2),.0672);near(c.resistance(3),.0672);near(c.length(1),1);
 const l=make(1);near(l.resistance(0),3);near(l.resistance(1),4.5);near(l.resistance(2),6);near(l.area(1),.5);
 const t=make(2);near(t.resistance(0),8);near(t.resistance(1),8/2.25);near(t.resistance(2),2);near(t.area(2),Math.PI*.16);
 const s=make(3);near(s.resistance(0),5);near(s.resistance(1),5*1.5**2);near(s.resistance(2),20);near(s.area(2),.25);near(s.area(1)*s.length(1),s.area(0)*s.length(0));
 const k=make(4,1);near(k.length(3),1);near(k.resistance(3),20/coil);near(make(4).resistance(3),20);assert.equal(new Wire(4).length(3),0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,1.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,6.72e-8),'noMm');assert.equal(slip(0,.1),null);
 assert.equal(slip(1,1.5),'halved');assert.equal(slip(1,12),'squared');assert.equal(slip(1,3),null);
 assert.equal(slip(2,4),'thickHalved');assert.equal(slip(2,16),'doubled');assert.equal(slip(2,8),null);
 assert.equal(slip(3,10),'lengthOnly');assert.equal(slip(3,5),'unchanged');assert.equal(slip(3,40),null);
 assert.equal(slip(4,2.285),'diameterAsRadius');assert.equal(slip(4,.1818),'noPi');assert.equal(slip(4,1),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Wire(0).setAnswer(bad),false);for(const bad of [0,-2,1001])assert.equal(new Wire(4).setAnswer(bad),false);
 assert.equal(new Wire(4).setAnswer(1000),true);assert.equal(new Wire(0).setAnswer(1e-9),true);
 const m=new Wire(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,2.285);m.advance(1.5);const n=new Wire();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,2.285);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Wire(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'wire-model'),script(source,'wire-model'));
 return mount(html,{scripts:['wire-model','wire-interface'],locale:'wire-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>x.toLocaleString(lang,{maximumSignificantDigits:3,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+' '+u;
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('wire-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');
  assert.equal(ui.el('given-0').textContent,fill(l.givenCopper,{L:plain(2),A:plain(.5)}));assert.equal(ui.el('given-1').textContent,fill(l.givenLonger,{R:plain(3)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenThicker,{R:plain(8)}));assert.equal(ui.el('given-3').textContent,fill(l.givenStretch,{R:plain(5)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenCoil,{d:plain(.2),R:plain(20)}));
  for(const id of ['resistance-value','length-value','area-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('wire-equation').textContent,'R = ρ·L ÷ A');
  for(const key of ['viewTitle','resistanceGraph','scaleNote','panelHint','copperTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('R = ? Ω'));
 });
 test(`${lang}: two metres of copper unroll, right on the first try`,()=>{
  ui.input('answer',.0672);assert.equal(ui.el('resistance-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.unrollCopy.split('{')[0])||l.unrollCopy.startsWith('{'));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('resistance-value').textContent,sig(.0672));assert.equal(ui.el('length-value').textContent,sig(2));assert.equal(ui.el('area-value').textContent,sig(.5));
  assert.equal(ui.el('wire-equation').textContent,`R = ρ·L ÷ A = ${plain(1.68e-8)} × 2 ÷ ${plain(5e-7)} = ${sig(.0672)} Ω`);assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(.0672)+' Ω','R = '+sig(.0672)+' Ω','L = '+sig(2)+' m','A = '+sig(.5)+' mm²',l.lengthAxis])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: twice as long, halved, squared, then doubled`,()=>{
  ui.click('mission-1');ui.input('answer',1.5);ui.click('play');ui.run(starts(l.longerCopy));ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(1.5,'Ω'),'slipHalved'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.nichromeTag)&&ui.painted.includes(l.stretchAxis));
  ui.input('answer',12);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(1,amount(12,'Ω'),'slipSquared'));
  ui.input('answer',6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('resistance-value').textContent,sig(6));assert.equal(ui.el('wire-equation').textContent,'R ∝ L: 3 × 2 = 6 Ω');
 });
 test(`${lang}: twice as thick, halved, doubled, then a quarter`,()=>{
  ui.click('mission-2');ui.input('answer',4);ui.click('play');ui.run(starts(l.thickerCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(4,'Ω'),'slipThickHalved'));assert.ok(ui.painted.includes(l.widthAxis));
  ui.input('answer',16);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(16,'Ω'),'slipDoubled'));
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('area-value').textContent,sig(Math.PI*.16));assert.equal(ui.el('wire-equation').textContent,'R ∝ 1 ÷ d²: 8 ÷ 2² = 2 Ω');
 });
 test(`${lang}: stretched, counting the length only, unchanged, then four times`,()=>{
  ui.click('mission-3');ui.input('answer',10);ui.click('play');ui.run(starts(l.stretchCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(10,'Ω'),'slipLengthOnly'));
  ui.input('answer',5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(5,'Ω'),'slipUnchanged'));
  ui.input('answer',20);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('area-value').textContent,sig(.25));assert.equal(ui.el('wire-equation').textContent,'L × 2, A ÷ 2: 5 × 2 × 2 = 20 Ω');
 });
 test(`${lang}: the coil's length, with the diameter as radius, without π, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'m');
  ui.input('answer',2.285);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(2.285,'m'),'slipDiameterAsRadius'));assert.ok(ui.painted.includes(fill(l.targetTag,{R:plain(20)})));
  ui.input('answer',.1818);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(.1818,'m'),'slipNoPi'));
  ui.input('answer',.571);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('wire-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('length-value').textContent,sig(.571));assert.equal(ui.el('wire-equation').textContent,`L = R·A ÷ ρ = 20 × π × (${plain(1e-4)})² ÷ ${plain(1.1e-6)} = ${sig(coil)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',1.5);en.click('play');en.run(()=>en.el('wire-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipHalved));en.input('answer',6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'6');assert.equal(es.el('wire-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('wire-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} wire stretcher and multilingual interface checks passed.`);
