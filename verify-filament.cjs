// Hot Filament: a metal's resistance rises with temperature, R = R₀·(1 + α·(T − T₀)); warm copper, a glowing tungsten
// filament, a lamp's switch-on surge, a Pt100 sensor read backwards, and the temperature that doubles copper's
// resistance; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/filament.html'),'utf8'),copy=require('./locales/filament.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'filament-model'),pure);const Fil=pure.FilamentModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const hot=40*(1+.0045*2480),expected=[10*(1+.00393*50),hot,hot/40,50,20+1/.00393],units=['Ω','Ω','','°C','°C'];
const make=(i,a=expected[i])=>{const m=new Fil(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(expected[0],11.965);near(hot,486.4);near(expected[2],12.16);near(expected[4],274.453,1e-5);
 expected.forEach((x,i)=>{const m=new Fil(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('the coil heats steadily over 2 s, and R = R₀·(1 + α·(T − T₀)) follows it',()=>{
 const w=make(0);near(w.temperature(0),20);near(w.temperature(1),45);near(w.temperature(2),70);near(w.temperature(3),70);near(w.resistance(1),10*(1+.00393*25));near(w.resistance(3),expected[0]);
 const g=make(1);near(g.resistance(3),hot);near(g.resistance(0),40);
 const s=make(3);near(s.temperature(0),0);near(s.resistance(0),100);near(s.resistance(3),119.25);
 const d=make(4,100);near(d.temperature(3),100);near(d.resistance(3),10*(1+.00393*80));near(make(4).resistance(3),20);assert.equal(new Fil(4).temperature(3),20);
});
test('on 230 V the cold lamp takes 12.16 times the current it takes glowing',()=>{
 const l=make(2);near(l.current(0),230/40);near(l.current(3),230/hot);near(l.current(0)/l.current(3),expected[2]);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,446.4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(486.4);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1.965),'warmNoBase');assert.equal(slip(0,12.75),'absolute');assert.equal(slip(0,10),null);
 assert.equal(slip(1,446.4),'glowNoBase');assert.equal(slip(1,40),null);
 assert.equal(slip(2,.0822),'inverted');assert.equal(slip(2,2),null);
 assert.equal(slip(3,309.7),'sensorNoBase');assert.equal(slip(3,19.25),null);
 assert.equal(slip(4,254.5),'rise');assert.equal(slip(4,40),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Fil(0).setAnswer(bad),false);for(const bad of [-273.15,-300,1e4+1,NaN])assert.equal(new Fil(3).setAnswer(bad),false);
 assert.equal(new Fil(3).setAnswer(-100),true);assert.equal(new Fil(4).setAnswer(0),true);assert.equal(new Fil(2).setAnswer(.5),true);
 const m=new Fil(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,254.5);m.advance(1.5);const n=new Fil();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,254.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-400},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Fil(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'filament-model'),script(source,'filament-model'));
 return mount(html,{scripts:['filament-model','filament-interface'],locale:'filament-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false}),sig5=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:5,useGrouping:false}),deg=x=>num(x,1).replace('-','−');
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('filament-status-text').textContent===l.done,starts=s=>()=>ui.el('lesson-copy').textContent.startsWith(s.split('{')[0]);
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');
  assert.equal(ui.el('given-0').textContent,fill(l.givenWarm,{R:plain(10),T0:plain(20),T1:plain(70)}));assert.equal(ui.el('given-1').textContent,fill(l.givenGlow,{R:plain(40),T0:plain(20),T1:plain(2500)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenInrush,{V:plain(230)}));assert.equal(ui.el('given-3').textContent,fill(l.givenSensor,{r:plain(119.25)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenDouble,{R:plain(10),T0:plain(20)}));
  for(const id of ['temp-value','resistance-value','rise-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('filament-equation').textContent,'R = R₀·(1 + α·(T − T₀))');
  for(const key of ['viewTitle','resistanceGraph','scaleNote','panelHint','copperTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('R = ? Ω')&&ui.painted.includes('? °C'));
 });
 test(`${lang}: warm copper, right on the first try`,()=>{
  ui.input('answer',11.97);assert.equal(ui.el('temp-value').textContent,'—');ui.click('step');assert.ok(starts(l.heatCopy)()||l.heatCopy.startsWith('{'));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('temp-value').textContent,deg(70));assert.equal(ui.el('resistance-value').textContent,sig5(expected[0]));assert.equal(ui.el('rise-value').textContent,sig5(expected[0]-10));
  assert.equal(ui.el('filament-equation').textContent,`R = 10 × (1 + ${sig(.00393)} × 50) = ${sig(expected[0])} Ω`);assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(11.97)+' Ω','R = '+sig5(expected[0])+' Ω',deg(70)+' °C',l.tempAxis])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: the glowing filament, the rise only, then the whole`,()=>{
  ui.click('mission-1');ui.input('answer',446.4);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(446.4,'Ω'),'slipGlowNoBase'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.tungstenTag));
  ui.input('answer',486.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('temp-value').textContent,deg(2500));assert.equal(ui.el('filament-equation').textContent,`R = 40 × (1 + ${sig(.0045)} × 2480) = ${sig(hot)} Ω`);
 });
 test(`${lang}: the switch-on surge, inverted, then right`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'I_cold ÷ I_hot =');assert.equal(ui.el('answer-unit').textContent,'');
  ui.input('answer',.0822);ui.click('play');ui.run(starts(l.lampCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(.0822,''),'slipInverted'));
  assert.ok(ui.painted.includes(l.currentGraph)&&ui.painted.includes(fill(l.supplyTag,{V:plain(230)}))&&ui.painted.includes('I = '+sig5(230/hot)+' A'));
  ui.input('answer',12.16);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('filament-equation').textContent,`I_cold ÷ I_hot = R_hot ÷ R_cold = ${sig(486.4)} ÷ 40 = ${sig(expected[2])}`);
 });
 test(`${lang}: the platinum sensor, dividing the whole reading, then right`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'°C');
  ui.input('answer',309.7);ui.click('play');ui.run(starts(l.sensorCopy));ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(309.7,'°C'),'slipSensorNoBase'));
  assert.ok(ui.painted.includes(fill(l.readingTag,{r:plain(119.25)}))&&ui.painted.includes(l.platinumTag));
  ui.input('answer',50);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('resistance-value').textContent,sig5(119.25));assert.equal(ui.el('filament-equation').textContent,`T = (${plain(119.25)} ÷ 100 − 1) ÷ ${sig(.00385)} = ${sig(50)} °C`);
 });
 test(`${lang}: doubling copper's resistance, the rise only, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',254.5);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(254.5,'°C'),'slipRise'));assert.ok(ui.painted.includes(fill(l.targetTag,{R:plain(20)})));
  ui.input('answer',274.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('filament-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('temp-value').textContent,deg(274.5));assert.equal(ui.el('filament-equation').textContent,`T = 20 + (2 − 1) ÷ ${sig(.00393)} = ${sig(expected[4])} °C`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',446.4);en.click('play');en.run(()=>en.el('filament-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipGlowNoBase));en.input('answer',486.4);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'486.4');assert.equal(es.el('filament-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('filament-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} hot filament and multilingual interface checks passed.`);
