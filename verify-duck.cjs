// Paddling Duck: the Doppler effect on water. Ripples (v − v_s) ÷ f apart ahead and (v + v_s) ÷ f behind, measured from
// the drawn rings, the duck's speed and paddling rate from a spacing, the bow wave sin θ = v ÷ v_s touching every ring,
// the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/duck.html'),'utf8'),copy=require('./locales/duck.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'duck-model'),pure);const Duck=pure.DuckModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[10,16,12,30,3],units=['cm','cm','cm/s','°','Hz'];
const make=(i,a=expected[i])=>{const m=new Duck(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Duck(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
});
test('the drawn rings are (v − v_s) ÷ f apart ahead and (v + v_s) ÷ f behind, and a fast duck\'s rings all touch the bow wave',()=>{
 for(const i of [0,1,2,4]){const m=new Duck(i),rs=m.ripples(4);assert.ok(rs.length>=8);for(let n=0;n+1<rs.length;n++){const a=rs[n],b=rs[n+1];near((a.x+a.r)-(b.x+b.r),m.ahead(),1e-9);near((b.x-b.r)-(a.x-a.r),m.behind(),1e-9);}}
 const b=new Duck(3),s=4,dx=b.position(s);assert.equal(b.ahead(),null);near(b.bowAngle(),30);for(const rp of b.ripples(s))if(rp.r>0)near(rp.r/(dx-rp.x),.5);
 const m=new Duck(0);assert.equal(m.ripples(0).length,1);assert.equal(m.ripples(.49).length,1);assert.equal(m.ripples(.5).length,2);near(m.position(4),70);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,4);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(16);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,20),'behindInstead');assert.equal(slip(0,15),'stillWater');assert.equal(slip(0,40),'multipliedF');assert.equal(slip(0,12),null);
 assert.equal(slip(1,4),'aheadInstead');assert.equal(slip(1,10),'stillWater');assert.equal(slip(1,100),'multipliedF');assert.equal(slip(1,12),null);
 assert.equal(slip(2,18),'lambdaTimesF');assert.equal(slip(2,28),'dividedF');assert.equal(slip(2,4),'spacingDifference');assert.equal(slip(2,20),null);
 assert.equal(slip(3,60),'complement');assert.equal(slip(3,.5),'sineOnly');assert.equal(slip(3,Math.atan(.5)*180/Math.PI),'tangent');assert.equal(slip(3,45),null);
 assert.equal(slip(4,2.5),'ignoredDuck');assert.equal(slip(4,2),'wrongSide');assert.equal(slip(4,432),'multipliedL');assert.equal(slip(4,4),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e5+1])assert.equal(new Duck(0).setAnswer(bad),false);assert.equal(new Duck(0).setAnswer(1e5),true);assert.equal(new Duck(3).setAnswer(91),false);assert.equal(new Duck(3).setAnswer(90),true);
 const m=new Duck(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,45);m.advance(1);const k=new Duck();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,45);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Duck(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'duck-model'),script(source,'duck-model'));
 return mount(html,{scripts:['duck-model','duck-interface'],locale:'duck-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Duck(i);return {e:num(m.exact(),m.config.ask==='freq'?2:1)};};
 const ui=open(lang),done=()=>ui.el('duck-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,"λ' =");assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.equal(ui.el('given-0').textContent,'v = 30 cm/s · v_s = 10 cm/s · f = 2 Hz');assert.equal(ui.el('given-1').textContent,`v = 25 cm/s · v_s = 15 cm/s · f = ${plain(2.5)} Hz`);assert.equal(ui.el('given-2').textContent,"v = 30 cm/s · f = 3 Hz · λ' = 6 cm");
  assert.equal(ui.el('given-3').textContent,'v = 25 cm/s · v_s = 50 cm/s');assert.equal(ui.el('given-4').textContent,"v = 30 cm/s · v_s = 6 cm/s · λ' = 12 cm");
  for(const id of ['duck-value','freq-value','ahead-value','behind-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('duck-equation').textContent,"λ' = (v ∓ v_s) ÷ f");
  for(const key of ['viewTitle','profileGraph','panelHint','scaleNote','duckTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('50 cm'));
 });
 test(`${lang}: the readings appear once the duck paddles, and the spacing ahead is right on the first try`,()=>{
  ui.input('answer',10);assert.equal(ui.el('duck-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('duck-value').textContent,num(10,1));assert.equal(ui.el('freq-value').textContent,num(2));assert.equal(ui.el('ahead-value').textContent,'?');assert.equal(ui.el('behind-value').textContent,num(20,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.duckCopy,{n:'1'}));
  assert.equal(ui.el('duck-equation').textContent,`λ' = (30 − 10) ÷ 2 = ${num(10,1)} cm`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.pathAxis));assert.equal(ui.el('ahead-value').textContent,num(10,1));
 });
 test(`${lang}: the spacing behind, the spacing ahead first, then (v + v_s) ÷ f`,()=>{
  ui.click('mission-1');ui.input('answer',4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(4)+' cm'})+' '+l.slipAheadInstead);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('duck-equation').textContent,`λ' = (25 + 15) ÷ ${plain(2.5)} = ${num(16,1)} cm`);
  ui.input('answer',16);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the duck's speed stays hidden until the run ends; λ'·f first, then v − λ'·f`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'v_s =');assert.equal(ui.el('answer-unit').textContent,'cm/s');ui.input('answer',18);
  ui.click('step');assert.equal(ui.el('duck-value').textContent,'?');assert.equal(ui.el('ahead-value').textContent,num(6,1));
  ui.click('play');ui.run(done);assert.equal(ui.el('duck-value').textContent,num(12,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(18)+' cm/s'})+' '+l.slipLambdaTimesF);
  assert.equal(ui.el('duck-equation').textContent,`v_s = 30 − 6 × 3 = ${num(12,1)} cm/s`);
  ui.input('answer',12);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: the bow wave of a duck faster than its ripples`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');assert.equal(ui.el('duck-equation').textContent,'sin θ = v ÷ v_s');ui.input('answer',30);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('duck-equation').textContent,`sin θ = 25 ÷ 50 → θ = ${num(30,1)}°`);assert.equal(ui.el('ahead-value').textContent,'—');
 });
 test(`${lang}: the paddling rate from the spacing behind, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'f =');assert.equal(ui.el('answer-unit').textContent,'Hz');ui.input('answer',3);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('duck-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('duck-equation').textContent,`f = (30 + 6) ÷ 12 = ${num(3)} Hz`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',4);en.click('play');en.run(()=>en.el('duck-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipAheadInstead));en.input('answer',16);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'16');assert.equal(es.el('duck-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('duck-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} paddling duck Doppler and multilingual interface checks passed.`);
