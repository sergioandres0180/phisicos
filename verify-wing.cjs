// Storm and Wing: Bernoulli's principle in air (F = ½·ρ·(v_over² − v_under²)·A), the exact lift-off moment as the air
// speeds up, roofs, wings, a take-off, a paper strip, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/wing.html'),'utf8'),copy=require('./locales/wing.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'wing-model'),pure);const Wing=pure.WingModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const rip=Math.sqrt(2*39200/120),plane=Math.sqrt(9800/(.6*.21*16)),paper=Math.sqrt(2*.0049/(1.2*.002)),expected=[54,rip,12.48,plane,paper],units=['kN','m/s','kN','m/s','m/s'];
const make=(i,a=expected[i])=>{const m=new Wing(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Wing(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(rip,25.5604,1e-5);near(plane,69.7217,1e-5);near(paper,2.0207,1e-4);});
test('the lift is the pressure difference ½·ρ·(v_over² − v_under²) on the whole area, growing with the speed squared',()=>{
 const s=make(0);near(s.drop(1),540);near(s.force(1),54000);near(s.force(.5),13500);assert.equal(s.weight(),null);assert.equal(s.lifts(),false);
 const w=make(2);near(w.drop(1),780);near(w.force(1),12480);near(w.speeds(.5).over,35);near(w.speeds(.5).under,30);
 const p=make(3,50);near(p.speeds(1).under,50);near(p.speeds(1).over,55);near(p.force(1),.6*(55*55-2500)*16);
});
test('it lifts at the exact moment the lift reaches the weight, and the speeding up stops there',()=>{
 const m=make(1,2*rip);near(m.liftStage(),.5);near(m.liftTime(),1);near(m.force(m.stage(1.6)),39200);near(m.duration(),2);near(m.height(1.5),.5);
 near(make(1).liftTime(),2,1e-6);assert.equal(make(1,25).lifts(),false);assert.equal(make(1,25).liftTime(),null);near(make(1,25).duration(),2);
 assert.equal(make(4,2.02).lifts(),true);assert.equal(make(4,2).lifts(),false);
 const e=make(3,80).advance(100);assert.equal(e.done,true);const k=make(3,80);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,54],[1,30],[1,25],[3,plane],[4,3]]){const p=make(i,a),q=make(i,a);p.advance(100);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
});
test('a force within 2%; a speed must lift with at most 2% to spare; a run counts as soon as it starts',()=>{
 assert.equal(make(0,53).evaluate().ok,true);assert.equal(make(0,55.2).evaluate().ok,false);assert.equal(make(1,26).evaluate().ok,true);assert.equal(make(1,26.2).evaluate().ok,false);
 assert.equal(make(1,25).evaluate().ok,false);assert.equal(make(2,12.6).evaluate().ok,true);assert.equal(make(3,70).evaluate().ok,true);assert.equal(make(3,71.5).evaluate().ok,false);
 assert.equal(make(4,2.02).evaluate().ok,true);assert.equal(make(4,2).evaluate().ok,false);
 const m=make(2);m.advance(10);assert.equal(m.score(),150);assert.equal(make(2).score(),0);
 const n=make(1,30);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(25.6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,108),'noHalf');assert.equal(slip(0,1.8),'noSquare');assert.equal(slip(0,.54),'pressureOnly');assert.equal(slip(0,45000),'waterDensity');assert.equal(slip(0,54000),'units');
 assert.equal(slip(1,8.165),'noG');assert.equal(slip(1,18.07),'noHalf');assert.equal(slip(1,92),'kmh');assert.equal(slip(1,.885),'waterDensity');assert.equal(slip(1,30),'spare');assert.equal(slip(1,25),null);
 assert.equal(slip(2,.96),'diffSquared');assert.equal(slip(2,24.96),'noHalf');assert.equal(slip(2,47.04),'overOnly');assert.equal(slip(2,12480),'units');
 assert.equal(slip(3,22.27),'noG');assert.equal(slip(3,101),'notSquared');assert.equal(slip(3,49.3),'noHalf');assert.equal(slip(3,251),'kmh');assert.equal(slip(3,80),'spare');
 assert.equal(slip(4,.6455),'noG');assert.equal(slip(4,1.429),'noHalf');assert.equal(slip(4,.0202),'unitsArea');assert.equal(slip(4,3),'spare');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e7+1])assert.equal(new Wing(0).setAnswer(bad),false);assert.equal(new Wing(1).setAnswer(1e5),true);assert.equal(new Wing(1).setAnswer(1e5+1),false);
 const m=new Wing(1);assert.equal(m.lifts(),false);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,2*rip);m.advance(1.5);const n=new Wing();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Wing();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'wing-model'),script(source,'wing-model'));
 return mount(html,{scripts:['wing-model','wing-interface'],locale:'wing-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]);
 const speed=n=>fmt(n,Math.abs(n)<10?2:1),newtons=n=>fmt(n,Math.abs(n)<.1?4:Math.abs(n)<10?2:0),pascals=n=>fmt(n,Math.abs(n)<10?2:Math.abs(n)<100?1:0);
 const at=(m,f)=>{const r=m.liftStage()??1,s=m.speeds(r);return f(r,s);};
 const ui=open(lang),done=()=>ui.el('wing-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'kN');
  assert.equal(ui.el('given-0').textContent,'v = 30 m/s · A = 100 m²');assert.equal(ui.el('given-1').textContent,'m = 4000 kg · A = 100 m²');assert.equal(ui.el('given-2').textContent,'v_over = 70 m/s · v_under = 60 m/s · A = 16 m²');
  assert.equal(ui.el('given-3').textContent,`m = 1000 kg · A = 16 m² · v_over = ${plain(1.1)}·v`);assert.equal(ui.el('given-4').textContent,`m = ${plain(.5)} g · A = 20 cm²`);
  for(const id of ['over-value','under-value','drop-value','lift-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('wing-equation').textContent,'F = ½·ρ·(v_over² − v_under²)·A');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the wind blows, and the storm force is right on the first try`,()=>{
  ui.input('answer',54);assert.equal(ui.el('lift-value').textContent,'—');
  ui.click('step');const m=make(0),r=m.stage(12/120),s=m.speeds(r);
  assert.equal(ui.el('over-value').textContent,speed(s.over));assert.equal(ui.el('drop-value').textContent,pascals(m.drop(r)));assert.equal(ui.el('lift-value').textContent,newtons(m.force(r)));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.liftingCopy,{v:speed(s.over),p:pascals(m.drop(r)),f:newtons(m.force(r))}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{p:pascals(540),f:newtons(54000)})+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.liftShort));
 });
 test(`${lang}: too little wind leaves the roof on, then the wind that tears it off`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',25);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.heldCopy,{f:newtons(make(1,25).force(1)),w:newtons(39200)})+' '+fill(l.missCopy,{p:'25 m/s'})+' '+l.hint1);
  assert.ok(ui.painted.includes(l.offBanner+' · '+l.heldBanner)&&ui.painted.includes(l.weightShort));
  ui.input('answer',25.6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.liftedBanner));
  const m=make(1,25.6);assert.equal(ui.el('lesson-copy').textContent,at(m,(r,s)=>fill(l.result1,{v:speed(s.over),p:pascals(m.drop(r)),w:newtons(39200)}))+' '+l.why1);
 });
 test(`${lang}: the wing's lift`,()=>{
  ui.click('mission-2');ui.input('answer',.96);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipDiffSquared));
  ui.input('answer',12.48);ui.click('play');ui.run(done);assert.ok(ui.painted.includes(l.guessTag));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{p:pascals(780),f:newtons(12480)})+' '+l.why2);
 });
 test(`${lang}: the take-off, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',70);assert.ok(ui.painted.includes(l.guessTag+' · v = '+plain(70)+' m/s'));
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('wing-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  const m=make(3,70);assert.equal(ui.el('lesson-copy').textContent,at(m,(r,s)=>fill(l.result3,{u:speed(s.under),w:newtons(9800)}))+' '+l.why3);
 });
 test(`${lang}: the paper strip`,()=>{
  ui.click('mission-4');ui.input('answer',2.02);ui.click('play');ui.run(done);
  const m=make(4,2.02);assert.equal(ui.el('lesson-copy').textContent,at(m,(r,s)=>fill(l.result4,{v:speed(s.over),p:pascals(m.drop(r)),w:newtons(.0049)}))+' '+l.why4);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',30);en.click('play');en.run(()=>en.el('wing-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSpare));en.input('answer',25.6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'25.6');assert.equal(es.el('wing-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('wing-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} storm-and-wing Bernoulli and multilingual interface checks passed.`);
