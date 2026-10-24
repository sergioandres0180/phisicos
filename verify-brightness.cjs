// Bulb Brightness: power is P = V·I = I²·R = V² ÷ R and a rating only fixes a bulb's resistance; volts times amps, a
// rated bulb's resistance, two in series, a 60 W bulb beside a 100 W one, and half the voltage; slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/brightness.html'),'utf8'),copy=require('./locales/brightness.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'brightness-model'),pure);const Bri=pure.BrightnessModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const r60=230*230/60,r100=230*230/100,i2=230/(r60+r100),expected=[24,r60,15,i2*i2*r60,25],units=['W','Ω','W','W','W'];
const make=(i,a=expected[i])=>{const m=new Bri(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(expected[3],23.4375);
 expected.forEach((x,i)=>{const m=new Bri(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('P = V·I = I²·R; a rating fixes the resistance, and the circuit sets the power',()=>{
 const m=make(0);near(m.current(3),2);near(m.power(0,3),24);near(m.power(0,1),6);near(m.glow(0,3),.24);
 const r=make(1);near(r.power(0,3),60);assert.equal(new Bri(1).power(0,3),0);
 const c=make(2);near(c.power(0,3),15);near(c.power(1,3),15);near(c.across(0,3),115);
 const s=make(3);near(s.power(0,3),23.4375);near(s.power(1,3),14.0625);assert.ok(s.glow(0,3)>s.glow(1,3));
 const h=make(4);near(h.power(0,3),25);near(h.current(3),115/529);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(3,60);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(23.44);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,6),'divided');assert.equal(slip(0,.1667),'inverted');assert.equal(slip(0,14),null);
 assert.equal(slip(1,3.833),'VoverP');assert.equal(slip(1,.2609),'current');assert.equal(slip(1,230),null);
 assert.equal(slip(2,30),'halved');assert.equal(slip(2,60),'rated');assert.equal(slip(2,120),null);
 assert.equal(slip(3,60),'rated');assert.equal(slip(3,14.06),'swapped');assert.equal(slip(3,100),null);
 assert.equal(slip(4,50),'halved');assert.equal(slip(4,100),'rated');assert.equal(slip(4,12.5),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e7])assert.equal(new Bri(0).setAnswer(bad),false);assert.equal(new Bri(1).setAnswer(1e7),true);
 const m=new Bri(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,14.06);m.advance(1.5);const n=new Bri();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,14.06);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Bri(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'brightness-model'),script(source,'brightness-model'));
 return mount(html,{scripts:['brightness-model','brightness-interface'],locale:'brightness-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('brightness-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(V,I,P)=>{assert.equal(ui.el('supply-value').textContent,sig(V));assert.equal(ui.el('current-value').textContent,sig(I));assert.equal(ui.el('power-value').textContent,sig(P));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'P =');assert.equal(ui.el('answer-unit').textContent,'W');
  assert.equal(ui.el('given-0').textContent,fill(l.givenPower,{V:plain(12),I:plain(2)}));assert.equal(ui.el('given-1').textContent,fill(l.givenRating,{a:plain(60),r:plain(230)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenChain,{a:plain(60),V:plain(230)}));assert.equal(ui.el('given-3').textContent,fill(l.givenSurprise,{a:plain(60),b:plain(100),V:plain(230)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenHalf,{a:plain(100),r:plain(230),V:plain(115)}));
  for(const id of ['supply-value','current-value','power-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('brightness-equation').textContent,'P = V·I = I²·R = V² ÷ R');
  for(const key of ['viewTitle','powerGraph','scaleNote','panelHint','supplyTag'])assert.ok(ui.painted.includes(l[key]),key);for(const s of ['? W','? A',plain(6)+' Ω'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: volts times amps, right on the first try`,()=>{
  ui.input('answer',24);assert.equal(ui.el('power-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.rampCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(12,2,24);assert.equal(ui.el('brightness-equation').textContent,'P = V·I = 12 × 2 = 24 W');assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(24)+' W',sig(24)+' W'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: a bulb's resistance, V over P, then right; your resistance goes in`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');assert.ok(ui.painted.includes('R = ?'));
  ui.input('answer',3.833);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(3.833,'Ω'),'slipVoverP'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(fill(l.ratedTag,{P:plain(60),V:plain(230)})));
  ui.input('answer',881.7);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(230,230/881.7,230*230/881.7);assert.equal(ui.el('brightness-equation').textContent,`R = V² ÷ P = 230² ÷ 60 = ${sig(r60)} Ω`);
 });
 test(`${lang}: two in series, halved, then right`,()=>{
  ui.click('mission-2');ui.input('answer',30);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.twoCopy.split('{')[0])&&ui.el('brightness-status-text').textContent===l.running);ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(2,amount(30,'W'),'slipHalved'));assert.ok(ui.painted.includes(fill(l.labelTag,{P:plain(60)})));
  ui.input('answer',15);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  meters(230,230/(2*r60),15);
 });
 test(`${lang}: 60 W against 100 W, the label, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',60);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(60,'W'),'slipRated'));assert.ok(ui.painted.includes(fill(l.ratedTag,{P:plain(100),V:plain(230)})));
  ui.input('answer',23.44);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('brightness-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(230,i2,expected[3]);assert.ok(ui.painted.includes(sig(i2*i2*r100)+' W'));
 });
 test(`${lang}: half the voltage, halved, then right`,()=>{
  ui.click('mission-4');ui.input('answer',50);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(4,amount(50,'W'),'slipHalved'));
  ui.input('answer',25);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  meters(115,115/529,25);assert.equal(ui.el('brightness-equation').textContent,`P = V² ÷ R = 115² ÷ ${sig(529)} = 25 W`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',14.06);en.click('play');en.run(()=>en.el('brightness-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSwapped));en.input('answer',23.44);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'23.44');assert.equal(es.el('brightness-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('brightness-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} bulb brightness and multilingual interface checks passed.`);
