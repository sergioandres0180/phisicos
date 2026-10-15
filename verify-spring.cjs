// Spring Bounce: Hooke's law (k·x₀ = m·g) and a mass bouncing on a spring (T = 2π·√(m ÷ k), v_max = A·ω), the period
// from the stretch alone, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/spring.html'),'utf8'),copy=require('./locales/spring.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'spring-model'),pure);const Spring=pure.SpringModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=2*Math.PI,expected=[.05,P*Math.sqrt(.5/49),4*Math.PI**2*.2/.25,.5,P*Math.sqrt(.25/9.8)],units=['m','s','N/m','m/s','s'];
const make=(i,a=expected[i])=>{const m=new Spring(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Spring(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[1],.63470,1e-5);near(expected[2],31.5827,1e-5);near(expected[4],1.00354,1e-5);});
test('Hooke\'s law: the mass rests where the spring pulls up with its weight',()=>{
 const m=make(0);near(m.rest(),.05);near(m.stiffness()*m.rest(),.5*9.8);near(m.stretch(0),0);near(m.stretch(2),.05);near(m.stretch(1),.025);near(m.velocity(0),0);near(m.velocity(2),0,1e-12);
 assert.equal(m.lowering(),true);near(m.offset(1),0);near(m.topSpeed(),0);assert.equal(make(1).lowering(),false);
 near(make(4).stiffness(),9.8/.25);near(make(4).rest(),.25);near(make(4).period(),expected[4]);
});
test('the bounce is simple harmonic: the period depends on m and k, the top speed on A·ω',()=>{
 const m=make(1);near(m.omega(),Math.sqrt(98));near(m.period(),expected[1]);near(m.offset(0),.05);near(m.offset(m.period()/2),-.05);near(m.stretch(0),m.rest()+.05);near(Math.abs(m.velocity(m.period()/4)),.05*Math.sqrt(98));
 const s=make(3);near(s.topSpeed(),.5);near(Math.abs(s.velocity(s.period()/4)),.5);
 near(new Spring(2).stiffness(),expected[2]);near(new Spring(2).period(),.5);near(make(2,40).stiffness(),40);near(make(2,40).period(),P*Math.sqrt(.2/40));
 for(let t=0;t<2;t+=.13){const x=m.offset(t),v=m.velocity(t);near(.5*49*x*x+.5*.5*v*v,.5*49*.05**2);}
});
test('every run lasts exactly 2 s, even inside long steps',()=>{
 for(const [i,a] of [[0,.05],[1,.1],[2,31.6],[3,.5],[4,1]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,2);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,.1);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.635);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.0051),'noG');assert.equal(slip(0,20),'inverted');assert.equal(slip(0,5),'unitsCm');assert.equal(slip(0,.1),null);
 assert.equal(slip(1,.101),'noTwoPi');assert.equal(slip(1,62.2),'inverted');assert.equal(slip(1,9.9),'omega');assert.equal(slip(1,1),null);
 assert.equal(slip(2,15.79),'noSquare');assert.equal(slip(2,.8),'noTwoPi');assert.equal(slip(2,.03166),'inverted');assert.equal(slip(2,100),null);
 assert.equal(slip(3,10),'noAmplitude');assert.equal(slip(3,5),'noRoot');assert.equal(slip(3,50),'unitsCm');assert.equal(slip(3,1),null);
 assert.equal(slip(4,.1597),'noTwoPi');assert.equal(slip(4,39.34),'inverted');assert.equal(slip(4,6.261),'omega');assert.equal(slip(4,2),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Spring(0).setAnswer(bad),false);assert.equal(new Spring(0).setAnswer(1e4),true);assert.equal(new Spring(2).setAnswer(1e6),true);assert.equal(new Spring(2).setAnswer(1e6+1),false);
 const m=new Spring(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,.5);m.advance(1.5);const n=new Spring();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,1);assert.equal(n.attempts,1);near(n.t,1.5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Spring();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'spring-model'),script(source,'spring-model'));
 return mount(html,{scripts:['spring-model','spring-interface'],locale:'spring-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const T=m.period();return {x:num(m.rest(),3),F:num(m.config.m*9.8,1),T:num(T,3),n:num(2/T,1),k:num(m.stiffness(),1),v:num(m.topSpeed())};};
 const ui=open(lang),done=()=>ui.el('spring-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'x₀ =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`m = ${plain(.5)} kg · k = 98 N/m`);assert.equal(ui.el('given-1').textContent,`m = ${plain(.5)} kg · k = 49 N/m · A = 5 cm`);assert.equal(ui.el('given-2').textContent,`m = ${plain(.2)} kg · T = ${plain(.5)} s`);
  assert.equal(ui.el('given-3').textContent,`m = ${plain(.5)} kg · k = 50 N/m · A = 5 cm`);assert.equal(ui.el('given-4').textContent,`x₀ = ${plain(.25)} m`);
  for(const id of ['rest-value','offset-value','speed-value','period-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('spring-equation').textContent,'x₀ = m·g ÷ k');
  for(const key of ['viewTitle','lowerTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once it is lowered, and the stretch is right on the first try`,()=>{
  ui.input('answer',.05);assert.equal(ui.el('rest-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('rest-value').textContent,num(.05,3));assert.equal(ui.el('speed-value').textContent,num(Math.abs(m.velocity(t))));assert.equal(ui.el('lesson-copy').textContent,fill(l.loweringCopy,{x:num(m.stretch(t),3)}));
  assert.equal(ui.el('spring-equation').textContent,`x₀ = m·g ÷ k = ${plain(.5)} × ${plain(9.8)} ÷ 98 = ${num(.05,3)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: a forgotten 2π, then the bounce period`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',.101);
  ui.click('step');const m=make(1,.101),t=12/120;assert.equal(ui.el('offset-value').textContent,num(m.offset(t)*100,1));assert.equal(ui.el('period-value').textContent,num(m.period(),3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.bouncingCopy,{y:num(m.offset(t)*100,1),v:num(Math.abs(m.velocity(t)))}));
  ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(.101)+' s'})+' '+l.slipNoTwoPi);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.graphTitle));
  ui.input('answer',.635);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: the spring that bounces every half second`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'k =');assert.equal(ui.el('answer-unit').textContent,'N/m');ui.input('answer',31.6);ui.click('play');ui.run(done);
  const m=make(2,31.6);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(m))+' '+l.why2);
  assert.equal(ui.el('spring-equation').textContent,`T = 2π·√(m ÷ k) = 2π × √(${plain(.2)} ÷ ${num(31.6,1)}) = ${num(m.period(),3)} s`);assert.ok(ui.painted.includes(fill(l.targetTag,{T:plain(.5)})));
 });
 test(`${lang}: the top speed, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'v_max =');ui.input('answer',.5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('spring-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
 });
 test(`${lang}: the period from the stretch alone`,()=>{
  ui.click('mission-4');ui.input('answer',39.34);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipInverted));
  ui.input('answer',1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',.101);en.click('play');en.run(()=>en.el('spring-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoTwoPi));en.input('answer',.635);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.635');assert.equal(es.el('spring-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('spring-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} spring bounce Hooke's law and multilingual interface checks passed.`);
