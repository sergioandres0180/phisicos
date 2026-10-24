// Floating Bead: Coulomb's law against gravity. A charged bead lowered on a thread over a fixed one floats where
// k·q₁·q₂ ÷ r² = m·g; the gap, the charge, doubling one charge, the floor's push on the bottom bead, and the mass that
// floats at 2 cm; the thread going slack exactly at r*, the cap and touching cases, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/levitate.html'),'utf8'),copy=require('./locales/levitate.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'levitate-model'),pure);const Levitate=pure.LevitateModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const k=8.99e9,g=9.8,gap=(q1,q2,m)=>100*Math.sqrt(k*q1*q2/(m*g));
const expected=[gap(40e-9,40e-9,1e-3),1e9*.05*Math.sqrt(1.5e-3*g/k),gap(40e-9,80e-9,1e-3),1e3*4e-3*g,1e3*k*900e-18/(g*.02**2)],units=['cm','nC','cm','mN','g'];
const make=(i,a=expected[i])=>{const m=new Levitate(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Levitate(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
 near(expected[0],3.8311,1e-4);near(expected[1],63.936,1e-4);near(expected[2],5.4180,1e-4);near(expected[3],39.2);near(expected[4],2.0640,1e-4);
});
test('the bead follows the thread down until the push equals its weight, then floats at r*',()=>{
 const m=make(0),r=expected[0]/100,slack=(.16-r)/(.154/2);
 near(m.height(0),.16);near(m.height(1),.16-.077);near(m.slackTime(),slack);near(m.height(slack),r);near(m.height(2.5),r);near(m.height(3),r);
 const before=m.forces(slack-.1);assert.ok(before.T>0);near(before.T,before.W-before.F);
 const after=m.forces(3);near(after.F,after.W);assert.equal(after.T,0);assert.equal(after.N,null);near(after.W,1e-3*g);
});
test('twice one charge floats √2 times higher; the floor holds the bottom bead\'s weight and the push',()=>{
 near(make(2).height(3),Math.SQRT2*expected[0]/100);
 const f=make(3).forces(3);near(f.F,1e-3*g);near(f.N,4e-3*g);near(f.N*1e3,expected[3]);
 near(make(1).height(3),.05);near(make(1).forces(3).F,1.5e-3*g);near(make(4).height(3),.02);near(make(4).forces(3).W,expected[4]*1e-3*g);
});
test('a bead pushed harder than its weight stays at the cap; one too heavy rests on the bottom bead',()=>{
 const cap=make(1,1000);assert.equal(cap.slackTime(),0);near(cap.height(0),.16);near(cap.height(3),.16);assert.ok(cap.forces(3).F>cap.forces(3).W);
 const heavy=make(4,1e5);assert.equal(heavy.slackTime(),null);near(heavy.height(3),.006);assert.ok(heavy.forces(3).T>0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,7.66);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[2]);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.14678),'notSquared');assert.equal(slip(0,.038311),'metres');assert.equal(slip(0,5),null);
 assert.equal(slip(1,8.1758e-5),'notSquaredCharge');assert.equal(slip(1,6.3936e-8),'coulombs');assert.equal(slip(1,40),null);
 assert.equal(slip(2,7.6623),'doubled');assert.equal(slip(2,3.8311),'same');assert.equal(slip(2,15.325),'quadrupled');assert.equal(slip(2,4.5),null);
 assert.equal(slip(3,29.4),'noPush');assert.equal(slip(3,19.6),'minus');assert.equal(slip(3,9.8),'topOnly');assert.equal(slip(3,35),null);
 assert.equal(slip(4,.041281),'notSquaredMass');assert.equal(slip(4,.002064),'kilograms');assert.equal(slip(4,1),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e7])assert.equal(new Levitate(0).setAnswer(bad),false);assert.equal(new Levitate(1).setAnswer(1e-9),true);
 const m=new Levitate(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,7.66);m.advance(1.5);const n=new Levitate();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,7.66);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Levitate(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'levitate-model'),script(source,'levitate-model'));
 return mount(html,{scripts:['levitate-model','levitate-interface'],locale:'levitate-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const four=x=>plain(Number(x.toPrecision(4)));
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const mN=x=>num(x*1e3,2),values=i=>({x:four(new Levitate(i).exact())});
 const ui=open(lang),done=()=>ui.el('levitate-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.equal(ui.el('given-0').textContent,'40 nC · 40 nC · m = 1 g');assert.equal(ui.el('given-1').textContent,`q₁ = q₂ · m = ${plain(1.5)} g · r = 5 cm`);assert.equal(ui.el('given-2').textContent,'40 nC · 80 nC · m = 1 g');
  assert.equal(ui.el('given-3').textContent,'40 nC · 40 nC · m = 1 g · m₁ = 3 g');assert.equal(ui.el('given-4').textContent,'30 nC · 30 nC · r = 2 cm');
  for(const id of ['height-value','force-value','pull-value','floor-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('levitate-equation').textContent,'k·q₁·q₂ ÷ r² = m·g');
  for(const key of ['viewTitle','forceGraph','scaleNote','arrowNote','panelHint'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the thread pulls while the push is too weak, goes slack at the floating gap, right on the first try`,()=>{
  ui.input('answer',3.83);assert.equal(ui.el('height-value').textContent,'—');
  ui.click('step');const m=make(0),f=m.forces(.1);
  assert.equal(ui.el('height-value').textContent,num(m.height(.1)*100));assert.equal(ui.el('force-value').textContent,mN(f.F));assert.equal(ui.el('pull-value').textContent,mN(f.T));assert.equal(ui.el('floor-value').textContent,'—');
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,fill(l.lowerCopy,{T:mN(f.T)}));assert.equal(ui.el('levitate-equation').textContent,`r = √(k·q₁·q₂ ÷ m·g) = ${num(expected[0],3)} cm`);
  const floating=fill(l.floatCopy,{r:num(expected[0])});
  ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===floating);assert.equal(ui.el('pull-value').textContent,num(0));assert.equal(ui.el('force-value').textContent,num(9.8));
  ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('height-value').textContent,num(expected[0]));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes('r = '+num(expected[0])+' cm'));
 });
 test(`${lang}: a charge without the square on r, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'q =');assert.equal(ui.el('answer-unit').textContent,'nC');ui.input('answer','8.1758e-5');ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(8.1758e-5)+' nC'})+' '+l.slipNotSquaredCharge);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',63.94);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
  assert.equal(ui.el('height-value').textContent,num(5));assert.ok(ui.painted.includes(l.targetTag));assert.equal(ui.el('levitate-equation').textContent,`q = r·√(m·g ÷ k) = ${num(expected[1])} nC`);
 });
 test(`${lang}: twice the charge taken as twice the gap, then √2 times`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'r =');ui.input('answer',7.66);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(7.66)+' cm'})+' '+l.slipDoubled);
  ui.input('answer',5.42);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('levitate-equation').textContent,`r = √(k·q₁·q₂ ÷ m·g) = ${num(expected[2],3)} cm`);
 });
 test(`${lang}: the floor's push in force bars`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'N =');assert.equal(ui.el('answer-unit').textContent,'mN');ui.input('answer',39.2);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.equal(ui.el('floor-value').textContent,num(39.2));
  assert.ok(ui.painted.includes(l.barGraph)&&ui.painted.includes(num(39.2)+' mN'));assert.equal(ui.el('levitate-equation').textContent,`N = m₁·g + F = ${num(39.2,1)} mN`);
 });
 test(`${lang}: the mass that floats at 2 cm, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'g');ui.input('answer',2.064);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('levitate-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('height-value').textContent,num(2));assert.equal(ui.el('levitate-equation').textContent,`m = k·q² ÷ (g·r²) = ${num(expected[4],3)} g`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',7.66);en.click('play');en.run(()=>en.el('levitate-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipDoubled));en.input('answer',5.42);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'5.42');assert.equal(es.el('levitate-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('levitate-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} floating bead and multilingual interface checks passed.`);
