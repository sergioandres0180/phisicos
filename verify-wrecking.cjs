// Wrecking Ball: a pendulum's energy at any angle (v = √(2·g·Δh), h = L·(1 − cos θ)), the exact large-angle swing, the rope's
// pull at the bottom, Galileo's peg, the angle a speed reaches, the exact end of each run, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/wrecking.html'),'utf8'),copy=require('./locales/wrecking.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'wrecking-model'),pure);const Wreck=pure.WreckingModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const expected=[Math.sqrt(2*g*2*(1-Math.cos(rad(60)))),Math.sqrt(2*g*2*(Math.cos(rad(30))-Math.cos(rad(60)))),100*g*(3-2*Math.cos(rad(45))),.5,deg(Math.acos(1-9/(2*g*2)))],units=['m/s','m/s','N','m','°'];
const make=(i,a=expected[i])=>{const m=new Wreck(i);assert.ok(m.setAnswer(a));return m;};
// The exact period of a pendulum swinging θ₀ each way, from the arithmetic-geometric mean.
const period=(L,start)=>{let a=1,b=Math.cos(rad(start)/2);for(let i=0;i<30;i++)[a,b]=[(a+b)/2,Math.sqrt(a*b)];return 4*Math.sqrt(L/g)*Math.PI/(2*a);};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Wreck(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});near(expected[0],4.42719,1e-5);near(expected[1],3.78790,1e-5);near(expected[2],1554.07,1e-5);near(expected[4],39.6094,1e-5);});
test('the swing is exact at large angles: half the true period to the far side',()=>{
 const m=new Wreck(0),D=m.duration();near(D,period(2,60)/2,1e-6);near(deg(m.position(D).th),60,1e-5);near(m.height(D),1,1e-6);near(deg(m.position(0).th),-60);
 near(m.speed(D/2),expected[0],1e-6);near(m.height(D/2),0,1e-6);near(new Wreck(2).duration(),period(2,45)/2,1e-6);
});
test('height becomes speed: v² + 2·g·h stays the same all the way',()=>{
 for(const i of [0,2,4]){const m=new Wreck(i),D=m.duration(),E=2*g*m.topHeight();for(let t=0;t<=D;t+=D/17)near(m.speed(t)**2+2*g*m.height(t),E,1e-6);}
 const p=new Wreck(1);let at30=null;for(let t=0;t<p.duration();t+=1e-4){if(deg(p.position(t).th)>=-30){at30=t;break;}}near(p.speed(at30),expected[1],2e-3);
});
test('the rope holds the weight and bends the path at the bottom',()=>{
 const m=new Wreck(2),D=m.duration();near(m.tension(D/2),expected[2],1e-6);near(m.tension(0),100*g*Math.cos(rad(45)),1e-9);assert.ok(m.tension(D/2)>m.tension(D/4));
});
test("Galileo's peg: the ball rises back to its starting height on the shorter string",()=>{
 const m=new Wreck(3),D=m.duration(),end=m.position(D);assert.equal(end.seg,1);near(m.height(D),.5,1e-6);near(deg(end.th),60,1e-5);near(m.height(0),.5);near(deg(m.position(0).th),-deg(Math.acos(.75)));
});
test('from a speed at the bottom, the ball climbs to the angle where its motion runs out',()=>{
 const m=new Wreck(4),D=m.duration();near(m.speed(0),3);near(m.height(D),0,1e-9);near(Math.max(...Array.from(m.table,s=>s.th))*180/Math.PI,expected[4],1e-5);near(D,period(2,expected[4])/2,1e-6);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,4.4],[1,3.8],[2,1554],[3,.5],[4,40]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(0);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,980);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1554);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,6.261),'lengthAsHeight');assert.equal(slip(0,3.13),'noTwo');assert.equal(slip(0,19.6),'noRoot');assert.equal(slip(0,5),null);
 assert.equal(slip(1,2.292),'fromThirty');assert.equal(slip(1,2.214),'halfSpeed');assert.equal(slip(1,4.427),'bottomSpeed');assert.equal(slip(1,3),null);
 assert.equal(slip(2,980),'weightOnly');assert.equal(slip(2,574.1),'noWeight');assert.equal(slip(2,405.9),'minus');assert.equal(slip(2,2000),null);
 assert.equal(slip(3,.25),'halved');assert.equal(slip(3,1),'doubled');assert.equal(slip(3,2),'length');assert.equal(slip(3,.7),null);
 assert.equal(slip(4,.6912),'radians');assert.equal(slip(4,76.73),'noOneMinus');assert.equal(slip(4,13.27),'sine');assert.equal(slip(4,30),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Wreck(0).setAnswer(bad),false);assert.equal(new Wreck(4).setAnswer(180),true);assert.equal(new Wreck(4).setAnswer(181),false);assert.equal(new Wreck(2).setAnswer(1e7),true);
 const m=new Wreck(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,.4);m.advance(.8);const n=new Wreck();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,.8);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Wreck(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'wrecking-model'),script(source,'wrecking-model'));
 return mount(html,{scripts:['wrecking-model','wrecking-interface'],locale:'wrecking-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{
  const c=m.config,h=c.at?c.L*(Math.cos(rad(c.at))-Math.cos(rad(c.start))):c.v?c.v*c.v/(2*g):m.startHeight(),D=m.duration(),end=m.position(D);
  return {v:num(c.ask==='angle'?c.v:c.ask==='speedAt'?m.exact():Math.sqrt(2*g*m.startHeight())),vb:num(Math.sqrt(2*g*m.startHeight())),h:num(h),T:num(c.ask==='tension'?m.exact():m.tension(D/2),1),W:num(980,0),r:num(m.height(D)),a:num(c.ask==='angle'?m.exact():Math.abs(deg(end.th)),1)};
 };
 const ui=open(lang),done=()=>ui.el('wrecking-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,'L = 2 m · θ₀ = 60°');assert.equal(ui.el('given-1').textContent,'L = 2 m · θ₀ = 60° → 30°');assert.equal(ui.el('given-2').textContent,'L = 2 m · θ₀ = 45° · m = 100 kg');
  assert.equal(ui.el('given-3').textContent,`L = 2 m · h = ${plain(.5)} m · ${l.pegTag} 1 m`);assert.equal(ui.el('given-4').textContent,'L = 2 m · v = 3 m/s');
  for(const id of ['angle-value','height-value','speed-value','tension-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('wrecking-equation').textContent,'m·g·h = ½·m·v²');
  for(const key of ['viewTitle','energyGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once it swings, and the bottom speed is right on the first try`,()=>{
  ui.input('answer',4.43);assert.equal(ui.el('speed-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0),t=12/120,p=m.position(t);
  assert.equal(ui.el('angle-value').textContent,num(deg(p.th),1));assert.equal(ui.el('height-value').textContent,num(m.height(t)));assert.equal(ui.el('speed-value').textContent,num(m.speed(t)));assert.equal(ui.el('tension-value').textContent,num(m.tension(t),0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.swingingCopy,{a:num(deg(p.th),1),h:num(m.height(t)),v:num(m.speed(t))}));
  assert.equal(ui.el('wrecking-equation').textContent,`h = L·(1 − cos 60°) = ${num(1)} m · v = √(2·g·h) = ${num(expected[0])} m/s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner));
 });
 test(`${lang}: the drop from 30° instead, then the speed partway down`,()=>{
  ui.click('mission-1');ui.input('answer',2.292);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(2.292)+' m/s'})+' '+l.slipFromThirty);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes('30°'));
  assert.equal(ui.el('wrecking-equation').textContent,`v = √(2·g·L·(cos 30° − cos 60°)) = ${num(expected[1])} m/s`);
  ui.input('answer',3.79);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: just the weight, then the rope's pull`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'N');ui.input('answer',980);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipWeightOnly));assert.ok(ui.painted.includes('m·g'));
  ui.input('answer',1554);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('wrecking-equation').textContent,`T = m·g + m·v² ÷ L = ${num(980,0)} + ${num(expected[2]-980,1)} = ${num(expected[2],1)} N`);
 });
 test(`${lang}: Galileo's peg, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h′ =');ui.input('answer',.5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('wrecking-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(make(3)))+' '+l.why3);
  assert.equal(ui.el('wrecking-equation').textContent,`m·g·h = m·g·h′ → h′ = ${num(.5)} m`);assert.ok(ui.painted.includes(l.pegTag));
 });
 test(`${lang}: the angle a speed reaches`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');ui.input('answer',39.6);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('wrecking-equation').textContent,`cos θ = 1 − v² ÷ (2·g·L) = 1 − 9 ÷ ${plain(39.2)} → θ = ${num(expected[4],1)}°`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',980);en.click('play');en.run(()=>en.el('wrecking-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWeightOnly));en.input('answer',1554);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1554');assert.equal(es.el('wrecking-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('wrecking-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} wrecking ball pendulum energy and multilingual interface checks passed.`);
