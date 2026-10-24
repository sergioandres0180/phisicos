// Field Probe: the electric field as force per charge. E = F ÷ q from a probe's force, E = k·Q ÷ r² for a point charge,
// a bigger probe at the same point, the two fields of a + and a − charge adding halfway, and the distance where a charge
// makes 1000 N/C; the probe's path and gauge, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/fieldprobe.html'),'utf8'),copy=require('./locales/fieldprobe.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'fieldprobe-model'),pure);const Probe=pure.FieldProbeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const k=8.99e9;
const expected=[3e5,k*5e-9/.09,1.8,2*k*4e-9/.04,Math.sqrt(k*1e-8/1000)],units=['N/C','N/C','mN','N/C','m'];
const make=(i,a=expected[i])=>{const m=new Probe(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Probe(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
 near(expected[1],499.44,1e-4);near(expected[3],1798,1e-9);near(expected[4],.29983,1e-4);
});
test('the probe rises steadily from 0.15 m below the point over 2 s and is held there',()=>{
 const m=make(1),y=t=>m.probeAt(t)[1];near(y(0)+1,1-.15);near(y(1)+1,1-.075);near(y(2)+1,1);near(y(3)+1,1);near(m.probeAt(3)[0],.3);
 near(m.distance(0),Math.hypot(.3,.15));near(m.distance(3),.3);
});
test('the field is force per charge: the dome makes 3 × 10⁵ N/C at P whatever the probe, and F = q·E',()=>{
 const a=make(0),b=make(2);near(a.strength(.2,0),3e5);near(b.strength(.2,0),3e5);
 near(Math.hypot(...a.force(3)),6e-4);near(Math.hypot(...b.force(3)),1.8e-3);near(Math.hypot(...b.force(3))/Math.hypot(...a.force(3)),3);
 near(Math.hypot(...a.force(1))/2e-9,a.strength(...a.probeAt(1)));
});
test('a point charge makes E = k·Q ÷ r², away from + and toward −',()=>{
 const m=make(1);near(m.strength(.3,0),expected[1]);near(m.strength(.15,0)/m.strength(.3,0),4);assert.ok(m.field(.3,0)[0]>0);assert.ok(m.field(0,.2)[1]>0);
 const d=make(3),[Ex,Ey]=d.field(0,0);near(Ex,expected[3]);near(Ey+1,1,1e-12);assert.ok(d.field(.3,0)[0]<0);
 const [bx,by]=d.field(0,-.1);assert.ok(bx>0);near(by+1,1,1e-12);near(bx,2*k*4e-9/.05*(.2/Math.sqrt(.05)));
});
test('the reach test carries the probe to your distance, where 10 nC makes k·Q ÷ r²',()=>{
 assert.equal(new Probe(4).point(),null);assert.equal(new Probe(4).probeAt(1),null);
 const m=make(4);near(m.strength(...m.probeAt(3)),1000);near(m.distance(3),expected[4]);
 const n=make(4,.2);near(n.probeAt(3)[0],.2);near(n.strength(.2,0),k*1e-8/.04);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,149.8);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[1]);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1.2e-12),'multiplied');assert.equal(slip(0,3.333e-6),'inverted');assert.equal(slip(0,3e-4),'noNano');assert.equal(slip(0,3e8),'noMilli');assert.equal(slip(0,1e5),null);
 assert.equal(slip(1,149.8),'notSquared');assert.equal(slip(1,.04994),'centimetres');assert.equal(slip(1,300),null);
 assert.equal(slip(2,.6),'same');assert.equal(slip(2,.2),'ratioInverted');assert.equal(slip(2,1.8e-3),'newtons');assert.equal(slip(2,1.2),null);
 assert.equal(slip(3,0),'cancelled');assert.equal(slip(3,899),'oneCharge');assert.equal(slip(3,449.5),'fullGap');assert.equal(slip(3,1000),null);
 assert.equal(slip(4,.0899),'notRoot');assert.equal(slip(4,.5),null);
});
test('answers are validated: only the dipole test takes 0, distances stay within 10 m, and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e12])assert.equal(new Probe(0).setAnswer(bad),false);assert.equal(new Probe(3).setAnswer(0),true);assert.equal(new Probe(3).setAnswer(-1),false);
 assert.equal(new Probe(4).setAnswer(10.5),false);assert.equal(new Probe(2).setAnswer(10.5),true);
 const m=new Probe(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,.2);m.advance(1.5);const n=new Probe();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,.2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,answer:11},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Probe(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'fieldprobe-model'),script(source,'fieldprobe-model'));
 return mount(html,{scripts:['fieldprobe-model','fieldprobe-interface'],locale:'fieldprobe-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sig=x=>plain(Number(x.toPrecision(4))),values=[{x:sig(3e5)},{x:num(expected[1],1)},{x:num(1.8)},{x:num(expected[3],0)},{x:num(expected[4],3)}];
 const ui=open(lang),done=()=>ui.el('fieldprobe-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'E =');assert.equal(ui.el('answer-unit').textContent,'N/C');
  assert.equal(ui.el('given-0').textContent,`q = ${plain(2)} nC · F = ${plain(.6)} mN`);assert.equal(ui.el('given-1').textContent,`Q = +5 nC · r = ${plain(.3)} m`);
  assert.equal(ui.el('given-2').textContent,`q: ${plain(2)} → ${plain(6)} nC · F₁ = ${plain(.6)} mN`);assert.equal(ui.el('given-3').textContent,`+4 / ${plain(-4)} nC · d = ${plain(.4)} m`);assert.equal(ui.el('given-4').textContent,`Q = +10 nC · E = ${plain(1000)} N/C`);
  for(const id of ['dist-value','force-value','field-value','probe-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('fieldprobe-equation').textContent,'E = F ÷ q = k·Q ÷ r²');
  for(const key of ['viewTitle','ratioGraph','scaleNote','panelHint','domeTag'])assert.ok(ui.painted.includes(l[key]),key);
  assert.ok(ui.painted.includes(fill(l.arrowNote,{E:plain(1e5),e:25,F:plain(.6)+' mN',f:40})));assert.ok(ui.painted.includes('Q = ?')&&ui.painted.includes('F = ?'));
 });
 test(`${lang}: the gauge reads the force as the probe comes in, right on the first try`,()=>{
  ui.input('answer',3e5);assert.equal(ui.el('force-value').textContent,'—');
  ui.click('step');const m=make(0),p=m.probeAt(.1),F=Math.hypot(...m.force(.1));
  assert.equal(ui.el('dist-value').textContent,num(m.distance(.1),3));assert.equal(ui.el('force-value').textContent,sig(F*1e6));assert.equal(ui.el('field-value').textContent,sig(m.strength(...p)));assert.equal(ui.el('probe-value').textContent,'+'+plain(2));
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,fill(l.carryCopy,{F:sig(F*1e3)+' mN',E:sig(m.strength(...p))}));
  assert.equal(ui.el('fieldprobe-equation').textContent,`E = F ÷ q = ${sig(3e5)} N/C`);
  const hold=fill(l.holdCopy,{F:sig(.6)+' mN',E:sig(3e5)});ui.click('play');ui.run(copyIs(hold));assert.equal(ui.el('lesson-copy').textContent,hold);
  ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('force-value').textContent,sig(600));assert.equal(ui.el('field-value').textContent,sig(3e5));assert.equal(ui.el('dist-value').textContent,num(.2,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(l.slopeTag)&&ui.painted.includes(sig(.6)+' mN'));
 });
 test(`${lang}: the point charge's field, divided by r and then by r²`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'E =');ui.input('answer',149.8);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(149.8)+' N/C'})+' '+l.slipNotSquared);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.distanceGraph));
  ui.input('answer',499.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('field-value').textContent,sig(expected[1]));assert.equal(ui.el('force-value').textContent,sig(expected[1]*1e-3));assert.equal(ui.el('fieldprobe-equation').textContent,`E = k·Q ÷ r² = ${num(expected[1],1)} N/C`);
 });
 test(`${lang}: a bigger probe at the same point feels three times the force`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'mN');ui.input('answer',.6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(.6)+' mN'})+' '+l.slipSame);
  ui.input('answer',1.8);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('force-value').textContent,sig(1800));assert.equal(ui.el('field-value').textContent,sig(3e5));assert.equal(ui.el('probe-value').textContent,'+'+plain(6));assert.equal(ui.el('fieldprobe-equation').textContent,`F = q·E = ${num(1.8)} mN`);
 });
 test(`${lang}: halfway between + and −, the fields don't cancel but add`,()=>{
  ui.click('mission-3');ui.input('answer',0);assert.equal(ui.el('play').disabled,false);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(0)+' N/C'})+' '+l.slipCancelled);
  for(const key of ['pathGraph','eachTag','totalTag','pathAxis'])assert.ok(ui.painted.includes(l[key]),key);
  ui.input('answer',1798);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('field-value').textContent,sig(expected[3]));assert.equal(ui.el('dist-value').textContent,num(.2,3));assert.equal(ui.el('fieldprobe-equation').textContent,`E = E₊ + E₋ = ${num(expected[3],0)} N/C`);
 });
 test(`${lang}: the probe goes to your distance, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'m');assert.ok(ui.painted.includes(l.reachTag));
  ui.input('answer',.0899);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(.0899)+' m'})+' '+l.slipNotRoot);
  assert.ok(ui.painted.includes(fill(l.targetTag,{E:plain(1000)})));
  ui.input('answer',.3);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('fieldprobe-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('dist-value').textContent,num(.3,3));assert.equal(ui.el('field-value').textContent,sig(k*1e-8/.09));assert.equal(ui.el('fieldprobe-equation').textContent,`r = √(k·Q ÷ E) = ${num(expected[4],3)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',0);en.click('play');en.run(()=>en.el('fieldprobe-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipCancelled));en.input('answer',1798);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1798');assert.equal(es.el('fieldprobe-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('fieldprobe-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} field probe and multilingual interface checks passed.`);
