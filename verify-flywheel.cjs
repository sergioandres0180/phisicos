// Flywheel Race: τ_net = I·α with a pulled cord (τ = F·r), masses on the spokes (I = I₀ + Σ m·x²), bearing friction, a
// steady speed at zero net torque, exact arrival at the target speed, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/flywheel.html'),'utf8'),copy=require('./locales/flywheel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'flywheel-model'),pure);const Flywheel=pure.FlywheelModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[3,25,.3,11,3];
const make=(i,a=expected[i])=>{const m=new Flywheel(i);assert.ok(m.setAnswer(a));return m;};

test('each flywheel has the expected answer',()=>{expected.forEach((v,i)=>near(new Flywheel(i).exact(),v));});
test('the right answer reaches the target with the pace wheel, or holds a steady speed at zero net torque',()=>{
 const alphas=[4,5,5,2,0],ends=[3,4,3,5,4];
 for(let i=0;i<5;i++){const m=make(i);near(m.alpha(),alphas[i]);near(m.duration(),ends[i]);}
 near(make(2).inertia(),.2);near(make(3).net(),.8);near(make(4).net(),0,1e-12);
 for(const i of [1,2,3]){const m=make(i),c=m.config;near(m.omega(m.duration()),c.target);near(m.paceOmega(c.pace),c.target);near(m.paceOmega(2*c.pace),c.target);assert.equal(m.outcome(),'onPace');}
 const s=make(4);near(s.omega(4),10);near(s.angle(4),40);assert.equal(s.outcome(),'steady');assert.equal(make(0).outcome(),'reached');
 const p=make(1);near(p.paceAngle(6),.5*5*16+20*2);near(p.angle(2),.5*5*4);
});
test('arrival at the target is exact inside long steps; slow, fast, stuck, and slowing wheels end correctly and freeze',()=>{
 const a=make(1,20),b=make(1,20);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,5);near(b.t,5,1e-12);assert.equal(a.outcome(),'late');
 const slow=make(1,10);slow.advance(100);near(slow.t,8);near(slow.omega(slow.t),16);assert.equal(slow.outcome(),'slow');
 assert.equal(make(1,30).outcome(),'fast');near(make(1,30).duration(),20/6);
 const stuck=make(3,3);stuck.advance(100);assert.equal(stuck.outcome(),'stuck');near(stuck.t,10);near(stuck.omega(stuck.t),0);near(stuck.angle(stuck.t),0);
 const coast=make(4,0);coast.advance(100);near(coast.alpha(),-1.5);near(coast.omega(4),4);assert.equal(coast.outcome(),'slower');assert.equal(make(4,5).outcome(),'faster');near(make(4,5).omega(4),14);
 const frozen=JSON.stringify(slow.snapshot());assert.equal(slow.advance(1),null);assert.equal(JSON.stringify(slow.snapshot()),frozen);
});
test('answers count within 2%, a run counts as soon as it starts, and the first try earns the bonus',()=>{
 assert.equal(make(0,3.06).evaluate().ok,true);assert.equal(make(0,3.07).evaluate().ok,false);assert.equal(make(1,25.5).evaluate().ok,true);assert.equal(make(1,25.6).evaluate().ok,false);
 assert.equal(make(2,.306).evaluate().ok,true);assert.equal(make(4,3.06).evaluate().ok,true);assert.equal(make(4,3.06).outcome(),'steady');
 const m=make(2);m.advance(10);assert.equal(m.score(),150);
 const n=make(1,20);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(25);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.3),'noRadius');assert.equal(slip(0,6),'noInertia');assert.equal(slip(0,48),'inverted');assert.equal(slip(0,1),null);
 assert.equal(slip(1,2.5),'torqueOnly');assert.equal(slip(1,100),'noTime');assert.equal(slip(1,.25),'multiplied');
 assert.equal(slip(2,Math.sqrt(.1)),'noHub');assert.equal(slip(2,Math.sqrt(.18)),'oneMass');assert.equal(slip(2,.09),'notSquared');
 assert.equal(slip(3,8),'noFriction');assert.equal(slip(3,5),'frictionWrongWay');
 assert.equal(slip(4,0),'coast');assert.equal(slip(4,.45),'torqueOnly');assert.equal(slip(4,.0675),'multiplied');
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Flywheel(0).setAnswer(0),false);assert.equal(new Flywheel(0).setAnswer(61),false);assert.equal(new Flywheel(2).setAnswer(.04),false);assert.equal(new Flywheel(2).setAnswer(.51),false);
 assert.equal(new Flywheel(4).setAnswer(0),true);assert.equal(new Flywheel(4).setAnswer(-1),false);assert.equal(new Flywheel(1).setAnswer(0),false);assert.equal(new Flywheel(3).setAnswer(Infinity),false);
 const m=new Flywheel(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,9);m.advance(.3);const n=new Flywheel();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,9);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Flywheel();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'flywheel-model'),script(source,'flywheel-model'));
 return mount(html,{scripts:['flywheel-model','flywheel-interface'],locale:'flywheel-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('flywheel-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'t =');
  assert.equal(ui.el('given-0').textContent,`F = 20 N · r = ${plain(.1)} m · I = ${plain(.5)} kg·m² · ω = 12 rad/s, t = ?`);
  assert.equal(ui.el('given-2').textContent,`F = 10 N · r = ${plain(.1)} m · I₀ = ${plain(.02)} kg·m², 2 × 1 kg, x = ? · ω = 15 rad/s, t = 3 s`);
  assert.equal(ui.el('given-4').textContent,`F = ? · r = ${plain(.15)} m · I = ${plain(.3)} kg·m² · τ_f = ${plain(.45)} N·m · ω₀ = 10 rad/s`);
  assert.equal(ui.el('alpha-value').textContent,'—');assert.equal(ui.el('inertia-value').textContent,'—');assert.equal(ui.el('flywheel-equation').textContent,'τ_net = I·α');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.yourWheel)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes(l.graphHint)&&ui.painted.includes(l.arrowScale)&&ui.painted.includes(l.targetLabel));
  assert.ok(!ui.painted.includes(l.paceWheel),'no pace wheel when the time is the answer');
 });
 test(`${lang}: α appears once the cord is pulled, and the predicted time earns the bonus`,()=>{
  ui.input('answer',3);assert.equal(ui.el('alpha-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('omega-value').textContent,fmt(.4));assert.equal(ui.el('alpha-value').textContent,fmt(4));assert.equal(ui.el('inertia-value').textContent,fmt(.5,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.spinningCopy,{w:fmt(.4),a:fmt(4)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.reachedCopy,{target:'12',th:fmt(3)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.reachedBanner)&&ui.painted.includes(l.predictionLabel));
 });
 test(`${lang}: pulling with the torque instead of the force falls behind the pace wheel`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'F =');ui.input('answer',2.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.slowCopy,{w:fmt(4),tc:fmt(8),target:'20',tp:fmt(4)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipTorqueOnly));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.slowBanner)&&ui.painted.includes(l.paceWheel));
 });
 test(`${lang}: a pull that only matches friction never turns the wheel`,()=>{
  ui.click('mission-3');ui.input('answer',3);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.stuckCopy,{tau:fmt(.3,3),tf:fmt(.3,3)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.hint3));assert.ok(ui.painted.includes(l.stuckBanner));
  assert.equal(ui.el('omega-value').textContent,fmt(0));
 });
 test(`${lang}: a steady wheel at zero net torque, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',3);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('flywheel-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.steadyCopy,{w:fmt(10),tc:fmt(4),tau:fmt(.45,3),tf:fmt(.45,3)})+' '+l.why4);
 });
}
test('changing language preserves flywheel, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',.09);en.click('play');en.run(()=>en.el('flywheel-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNotSquared));en.input('answer',.3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.3');assert.equal(es.el('flywheel-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('flywheel-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} flywheel angular-acceleration and multilingual interface checks passed.`);
