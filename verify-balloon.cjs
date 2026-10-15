// Balloon Lift: Archimedes' principle in air (lift = (ρ_air − ρ_in)·g·V against the weight carried), the exact lift-off
// moment, hot air with ρ·T constant in kelvin, the fewest balloons, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/balloon.html'),'utf8'),copy=require('./locales/balloon.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'balloon-model'),pure);const Balloon=pure.BalloonModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const hot=293.15*1.2/.9-273.15,person=80/1.02,expected=[5,225,hot,125,person],units=['','kg','°C','kg','m³'],grace=5e-4;
const make=(i,a=expected[i])=>{const m=new Balloon(i);assert.ok(m.setAnswer(a));return m;};

test('each flight has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Balloon(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(hot,117.7167,1e-5);});
test('the lift is the weight of the air pushed aside less the weight of the gas',()=>{
 const p=make(0);near(p.volume(1),.05);near(p.lift(1),.051);near(p.carried(),.045);near(p.liftForce(0),0);
 const h=make(1);near(h.lift(1),625);near(h.carried(),625);near(h.inside(.5),1.075);near(h.weightForce(),6125);
 const t=make(2);for(const s of [0,.3,1])near(t.inside(s)*(t.temperature(s)+273.15),1.2*293.15);near(t.inside(1),.9);near(t.lift(1),750);
 near(make(3).lift(1),525);near(make(4).lift(1),person*1.02);near(make(4).carried(),80);
});
test('it lifts off the moment the lift reaches the load, and filling or heating stops there',()=>{
 const p=make(0);near(p.liftTime(),2*.045/.051,1e-12);near(p.duration(),p.liftTime()+1.5);near(p.liftForce(1.95),p.liftForce(p.liftTime()));near(p.height(p.liftTime()+.75),.5);
 near(make(1).liftTime(),2,1e-12);near(make(4,2*person).liftTime(),1,1e-12);near(make(4,78.43).liftTime(),2);near(make(1).liftForce(2),make(1).weightForce(),1e-12);
 const held=make(0,4);assert.equal(held.lifts(),false);assert.equal(held.liftTime(),null);near(held.duration(),2);near(held.volume(held.stage(2)),.04);
 const e=make(2).advance(100);assert.equal(e.done,true);const m=make(2);m.advance(100);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 assert.equal(make(1,225*(1+4e-4)).lifts(),true);assert.equal(make(1,226).lifts(),false);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,5],[0,4],[2,hot],[3,125],[4,90]]){const p=make(i,a),q=make(i,a);p.advance(100);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
});
test('the fewest balloons; a limit with at most 2% to spare; a run counts as soon as it starts',()=>{
 assert.equal(make(0,5).evaluate().ok,true);assert.equal(make(0,6).evaluate().ok,false);
 assert.equal(make(1,221).evaluate().ok,true);assert.equal(make(1,220).evaluate().ok,false);assert.equal(make(1,226).evaluate().ok,false);
 assert.equal(make(2,120).evaluate().ok,true);assert.equal(make(2,121).evaluate().ok,false);assert.equal(make(2,117).evaluate().ok,false);
 assert.equal(make(4,80).evaluate().ok,true);assert.equal(make(4,80.5).evaluate().ok,false);assert.equal(make(4,78).evaluate().ok,false);
 const m=make(3);m.advance(10);assert.equal(m.score(),150);assert.equal(make(3).score(),0);
 const n=make(1,625);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(225);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4),'roundDown');assert.equal(slip(0,3),'noRubber');assert.equal(slip(0,6),'spareCount');assert.equal(slip(0,1),null);
 assert.equal(slip(1,625),'noBalloon');assert.equal(slip(1,2600),'noGas');assert.equal(slip(1,200),'spareLoad');assert.equal(slip(1,226),null);
 assert.equal(slip(2,hot+273.15),'kelvin');assert.equal(slip(2,26.67),'celsius');assert.equal(slip(2,58.72),'noBalloon');assert.equal(slip(2,150),'spareHeat');assert.equal(slip(2,117),null);
 assert.equal(slip(3,225),'lowland');assert.equal(slip(3,525),'noBalloon');assert.equal(slip(3,2100),'noGas');assert.equal(slip(3,100),'spareLoad');
 assert.equal(slip(4,66.67),'noGas');assert.equal(slip(4,444.4),'gasOnly');assert.equal(slip(4,90),'spareVolume');assert.equal(slip(4,78),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,2.5,Infinity,NaN,1001])assert.equal(new Balloon(0).setAnswer(bad),false);assert.equal(new Balloon(0).setAnswer(1000),true);assert.equal(new Balloon(2).setAnswer(5000),true);
 const m=new Balloon(0);assert.equal(m.lifts(),false);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0);m.advance(2.2);const n=new Balloon();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,2.2);assert.equal(n.answer,5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2.5},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Balloon();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'balloon-model'),script(source,'balloon-model'));
 return mount(html,{scripts:['balloon-model','balloon-interface'],locale:'balloon-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const force=n=>fmt(n,Math.abs(n)<10?3:0),cubic=n=>fmt(n,n<10?3:n<1000?1:0);
 const ui=open(lang),done=()=>ui.el('balloon-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,l.balloonsUnit);
  assert.equal(ui.el('given-0').textContent,`V = 10 L · ρ_He = ${plain(.18)} kg/m³ · m_rubber = 3 g · m_toy = 30 g`);
  assert.equal(ui.el('given-1').textContent,`V = 2500 m³ · ρ_in = ${plain(.95)} kg/m³ · m_balloon = 400 kg`);
  assert.equal(ui.el('given-2').textContent,'V = 2500 m³ · m = 400 kg + 350 kg · T_air = 20 °C');
  assert.equal(ui.el('given-3').textContent,`V = 2500 m³ · ρ_air = 1 kg/m³ · ρ_in = ${plain(.79)} kg/m³ · m_balloon = 400 kg`);
  assert.equal(ui.el('given-4').textContent,`m = 80 kg · ρ_He = ${plain(.18)} kg/m³`);
  for(const id of ['volume-value','inside-value','lift-value','weight-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('balloon-equation').textContent,'F = (ρ_air − ρ_in)·g·V');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('ρ_air = '+fmt(1.2)+' kg/m³'));
 });
 test(`${lang}: the readings appear once the balloons fill, and five lift the toy on the first try`,()=>{
  ui.input('answer',5);assert.equal(ui.el('lift-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120,s=m.stage(t);
  assert.equal(ui.el('volume-value').textContent,cubic(m.volume(s)));assert.equal(ui.el('inside-value').textContent,fmt(.18,3));assert.equal(ui.el('lift-value').textContent,force(m.liftForce(t)));assert.equal(ui.el('weight-value').textContent,force(.441));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.liftingCopy,{l:force(m.liftForce(t)),w:force(.441)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{n:'5',g:fmt(36,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.flewBanner)&&ui.painted.includes(l.liftShort)&&ui.painted.includes(l.weightShort));
 });
 test(`${lang}: rounding down leaves the toy on the ground`,()=>{
  ui.input('answer',4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.heldCopy,{l:force(.39984),w:force(.4116)})+' '+fill(l.missCopy,{p:'4 '+l.balloonsUnit})+' '+l.slipRoundDown);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner+' · '+l.groundBanner));
 });
 test(`${lang}: the hot-air payload`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'kg');
  ui.input('answer',625);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoBalloon));
  ui.input('answer',225);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{m:plain(225)})+' '+l.why1);
 });
 test(`${lang}: how hot, in kelvin and in °C, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'°C');
  ui.input('answer',391);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipKelvin));
  ui.input('answer',118);ui.click('step');const m=make(2,118),t=12/120;
  assert.equal(ui.el('lesson-copy').textContent,fill(l.heatingCopy,{T:fmt(m.temperature(m.stage(t)),1),l:force(m.liftForce(t)),w:force(7350)}));assert.ok(ui.painted.includes('T_in = '+fmt(m.temperature(m.stage(t)),1)+' °C'));
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('balloon-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');const s=m.liftStage();
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{T:fmt(m.temperature(s),1),r:fmt(m.inside(s),3)})+' '+l.why2);
 });
 test(`${lang}: the mountain launch and the person on helium`,()=>{
  ui.click('mission-3');ui.input('answer',225);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipLowland));
  ui.input('answer',125);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{m:plain(125)})+' '+l.why3);
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'m³');ui.input('answer',78.5);ui.click('play');ui.run(done);
  const m=make(4,78.5);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{v:cubic(m.volume(m.liftStage()))})+' '+l.why4);
 });
}
test('changing language preserves flight, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',444.4);en.click('play');en.run(()=>en.el('balloon-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipGasOnly));en.input('answer',78.5);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'78.5');assert.equal(es.el('balloon-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('balloon-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} balloon-lift buoyancy and multilingual interface checks passed.`);
