// Harbour Buoy: amplitude (A = (y_max − y_min) ÷ 2), a period that doesn't depend on it, the distance travelled (4·A per
// period), the top speed (2π·A ÷ T), energy growing as A², the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/buoy.html'),'utf8'),copy=require('./locales/buoy.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'buoy-model'),pure);const Buoy=pure.BuoyModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=2*Math.PI,expected=[1.2,8,36,P*1.2/8,4],units=['m','s','m','m/s',''];
const make=(i,a=expected[i])=>{const m=new Buoy(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Buoy(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[3],.942478,1e-5);});
test('the amplitude is measured from the middle, half of top to bottom',()=>{
 const m=make(0);near(m.amplitude(),1.2);near(m.middle(),2.2);near(m.height(0),2.2);near(m.height(2),3.4);near(m.height(6),1);near(m.offset(4),0,1e-9);
 assert.deepEqual([1,2,3,4].map(i=>new Buoy(i).amplitude()),[1.5,1.2,1.2,2]);assert.equal(new Buoy(1).reference(),.5);assert.equal(new Buoy(0).reference(),null);near(new Buoy(3).middle(),2.2);
});
test('a bigger swell keeps the same period, in step with the smaller one',()=>{
 const m=make(1);for(const t of [0,1,2,3.3,4,6,8,13])near(m.offset(t),3*m.offset(t,.5),1e-9);
 near(m.offset(2),1.5);near(m.offset(10),1.5);near(m.offset(2,.5),.5);near(m.omega(),P/8);
});
test('each period the buoy travels 4·A, fastest through the middle',()=>{
 const m=make(2);near(m.path(2),1.2);near(m.path(4),2.4);near(m.path(8),4.8);near(m.path(60),36);near(m.path(1),1.2*Math.SQRT1_2);near(m.path(3),1.2+1.2*(1-Math.SQRT1_2));near(m.path(5),2.4+1.2*Math.SQRT1_2);
 let last=0;for(let t=0;t<=60;t+=.37){const d=m.path(t);assert.ok(d>=last-1e-12);last=d;}
 const s=make(3);near(s.velocity(0),P*1.2/8);near(s.velocity(2),0,1e-12);near(Math.abs(s.velocity(4)),P*1.2/8);
});
test('a swell\'s energy grows as the square of its amplitude',()=>{
 const m=make(4);near(m.energy(1),5022.5);near(m.energy(),20090);near(m.energy()/m.energy(1),4);near(new Buoy(0).energy(),1025*9.8*1.44/2);
});
test('every run ends exactly inside long steps',()=>{
 assert.deepEqual([0,1,2,3,4].map(i=>new Buoy(i).duration()),[8,16,60,8,8]);
 for(const [i,a] of [[0,1.2],[1,8],[2,36],[3,.94],[4,4]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(2);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);near(k.path(1e3),36);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,24);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(8);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2.4),'peakToPeak');assert.equal(slip(0,3.4),'crestReading');assert.equal(slip(0,2.2),'middle');assert.equal(slip(0,1),null);
 assert.equal(slip(1,24),'scaled');assert.equal(slip(1,2.667),'shrunk');assert.equal(slip(1,13.86),'rootPeriod');assert.equal(slip(1,10),null);
 assert.equal(slip(2,18),'twoA');assert.equal(slip(2,9),'oneA');assert.equal(slip(2,33.6),'wholePeriods');assert.equal(slip(2,72),null);
 assert.equal(slip(3,.6),'average');assert.equal(slip(3,.15),'noTwoPi');assert.equal(slip(3,.785),'noAmplitude');assert.equal(slip(3,1.2),null);
 assert.equal(slip(4,2),'linear');assert.equal(slip(4,8),'cubed');assert.equal(slip(4,1.414),'rootEnergy');assert.equal(slip(4,3),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e3+1])assert.equal(new Buoy(0).setAnswer(bad),false);assert.equal(new Buoy(0).setAnswer(1e3),true);assert.equal(new Buoy(2).setAnswer(1e5),true);assert.equal(new Buoy(4).setAnswer(1e4+1),false);
 const m=new Buoy(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2);m.advance(30);const n=new Buoy();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,30);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:61},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Buoy(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'buoy-model'),script(source,'buoy-model'));
 return mount(html,{scripts:['buoy-model','buoy-interface'],locale:'buoy-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const kilo=n=>num(n/1000,1);
 const values=m=>{const c=m.config,A=m.amplitude(),mid=m.middle(),E1=c.A0?m.energy(c.A0):0,E2=m.energy();
  return {top:plain(mid+A),bottom:plain(mid-A),A:num(A),mid:num(mid),T:num(c.T),t:plain(c.run),n:num(c.run/c.T,1),d:num(m.path(c.run),1),v:num(A*m.omega()),E1:kilo(E1),E2:kilo(E2),r:num(E1?E2/E1:0,1)};};
 const ui=open(lang),done=()=>ui.el('buoy-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'A =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`y_max = ${plain(3.4)} m · y_min = 1 m`);assert.equal(ui.el('given-1').textContent,`A = ${plain(.5)} m → ×3 · T = 8 s`);assert.equal(ui.el('given-2').textContent,`A = ${plain(1.2)} m · T = 8 s · t = 60 s`);
  assert.equal(ui.el('given-3').textContent,`A = ${plain(1.2)} m · T = 8 s`);assert.equal(ui.el('given-4').textContent,'A = 1 m → ×2');
  for(const id of ['height-value','offset-value','speed-value','path-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('buoy-equation').textContent,'A = (y_max − y_min) ÷ 2');
  for(const key of ['viewTitle','heightGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(l.crestTag+' '+plain(3.4)+' m')&&ui.painted.includes(l.troughTag+' 1 m'));
 });
 test(`${lang}: the readings appear once it bobs, and the amplitude is right on the first try`,()=>{
  ui.input('answer',1.2);assert.equal(ui.el('height-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0),t=12*2/120;
  assert.equal(ui.el('height-value').textContent,num(m.height(t)));assert.equal(ui.el('offset-value').textContent,num(m.offset(t)));assert.equal(ui.el('speed-value').textContent,num(Math.abs(m.velocity(t))));assert.equal(ui.el('path-value').textContent,num(m.path(t),1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.bobbingCopy,{y:num(m.offset(t)),v:num(Math.abs(m.velocity(t))),d:num(m.path(t),1)}));
  assert.equal(ui.el('buoy-equation').textContent,`A = (y_max − y_min) ÷ 2 = (${plain(3.4)} − 1) ÷ 2 = ${num(1.2)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: a period scaled with the swell, then the unchanged period`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',24);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:'24 s'})+' '+l.slipScaled);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(`A = ${plain(.5)} m`));
  assert.equal(ui.el('buoy-equation').textContent,`A = ${plain(.5)} m → ${plain(1.5)} m: T = ${num(8)} s → ${num(8)} s`);
  ui.input('answer',8);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: a minute of bobbing`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'d =');ui.input('answer',36);ui.click('play');ui.run(done);
  const m=make(2);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('path-value').textContent,num(36,1));assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(m))+' '+l.why2);
  assert.equal(ui.el('buoy-equation').textContent,`d = (t ÷ T)·4·A = (60 ÷ 8) × 4 × ${plain(1.2)} = ${num(36,1)} m`);assert.ok(ui.painted.includes(l.pathGraph));
 });
 test(`${lang}: the top speed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'v_max =');ui.input('answer',.942);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('buoy-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
  assert.equal(ui.el('buoy-equation').textContent,`v_max = 2π·A ÷ T = 2π × ${plain(1.2)} ÷ 8 = ${num(P*1.2/8)} m/s`);
 });
 test(`${lang}: energy that grows linearly, then as A²`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'E₂ ÷ E₁ =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',2);ui.click('play');ui.run(done);
  const m=make(4);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+fill(l.missCopy,{p:'2'})+' '+l.slipLinear);
  ui.input('answer',4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+l.why4);
  assert.equal(ui.el('buoy-equation').textContent,'E = ½·ρ·g·A² → (2 ÷ 1)² = 4');assert.ok(ui.painted.includes(l.energyGraph)&&ui.painted.includes(kilo(5022.5)+' kJ/m²')&&ui.painted.includes(kilo(20090)+' kJ/m²'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',2);en.click('play');en.run(()=>en.el('buoy-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLinear));en.input('answer',4);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'4');assert.equal(es.el('buoy-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('buoy-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} harbour buoy amplitude and multilingual interface checks passed.`);
