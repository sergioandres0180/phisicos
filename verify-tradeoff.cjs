// Force for Distance: a lever's distances (s_l ÷ s_e = d_l ÷ d_e), work in = work out, the speed gain of a class 3 lever,
// exact run ends, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tradeoff.html'),'utf8'),copy=require('./locales/tradeoff.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tradeoff-model'),pure);const Tradeoff=pure.TradeoffModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[.2,30,.0875,1.6,150],units=['m','J','m/s','m','N'];
const make=(i,a=expected[i])=>{const m=new Tradeoff(i);assert.ok(m.setAnswer(a));return m;};

test('each lever has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Tradeoff(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});});
test('both ends keep s_l ÷ s_e = d_l ÷ d_e, and the work in equals the work out, at every moment',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;for(const t of [.3,1,1.7,2]){near(m.loadMove(t)/m.effortMove(t),c.dl/c.de);near(c.de*Math.sin(m.angle(t)),m.effortMove(t));}
  near(c.driver==='load'?m.loadMove(2):m.effortMove(2),c.D);near(m.ratio(),c.dl/c.de);
  if(c.W!==null){near(m.effortForce(),c.W*c.dl/c.de);for(const t of [.5,2])near(m.workIn(t),m.workOut(t));}else{assert.equal(m.workOut(1),null);assert.equal(m.workIn(1),null);}}
 near(make(1).effortForce(),200);near(make(1).effortMove(2),.15);near(make(4).effortMove(2),.6);near(make(4).effortForce(),150);
 const curl=make(2);near(curl.speed(),curl.loadMove(2)/2);near((curl.loadMove(1.5)-curl.loadMove(.5))/1,.0875);
});
test('the run ends exactly at 2 s inside long steps, and nothing moves afterwards',()=>{
 const m=make(3),e=m.advance(100);assert.equal(e.done,true);near(m.t,2);assert.equal(m.status,'done');near(m.loadMove(m.now()),1.6);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(0),b=make(0);a.advance(100);let n=0;while(b.status!=='done'){b.advance(1/120);n++;}near(a.t,b.t,1e-12);assert.equal(n,240);
 near(make(0).loadMove(9),.04);assert.equal(make(0).loadMove(-1),0);
});
test('answers count within 2%, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,.204).evaluate().ok,true);assert.equal(make(0,.205).evaluate().ok,false);assert.equal(make(4,147).evaluate().ok,true);assert.equal(make(2,.09).evaluate().ok,false);
 const m=make(1);m.advance(10);assert.equal(m.score(),150);assert.equal(make(1).score(),0);
 const n=make(2,.01);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.0875);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.008),'inverted');assert.equal(slip(0,.04),'same');assert.equal(slip(0,.5),null);
 assert.equal(slip(1,10),'mixed');assert.equal(slip(1,90),'mixed');assert.equal(slip(1,600),'forceOnly');
 assert.equal(slip(2,.01),'same');assert.equal(slip(2,.01*.04/.35),'inverted');
 assert.equal(slip(3,.2),'same');assert.equal(slip(3,.025),'inverted');
 assert.equal(slip(4,900),'fullLoad');assert.equal(slip(4,5400),'inverted');assert.equal(slip(4,90),'noDivide');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,6])assert.equal(new Tradeoff(0).setAnswer(bad),false);assert.equal(new Tradeoff(2).setAnswer(11),false);
 const m=new Tradeoff(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,90);m.advance(.3);const n=new Tradeoff();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,90);assert.equal(n.index,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tradeoff();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tradeoff-model'),script(source,'tradeoff-model'));
 return mount(html,{scripts:['tradeoff-model','tradeoff-interface'],locale:'tradeoff-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('tradeoff-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'s_e =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`#1 · d_e = 1 m · d_l = ${plain(.2)} m · s_l = ${plain(.04)} m`);
  assert.equal(ui.el('given-4').textContent,`#1 · d_e = ${plain(1.2)} m · d_l = ${plain(.2)} m · W = 900 N · s_l = ${plain(.1)} m · s_e = ${plain(.6)} m`);
  for(const id of ['effort-value','load-value','ratio-value','work-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tradeoff-equation').textContent,'s_l ÷ s_e = d_l ÷ d_e');
  for(const key of ['viewTitle','class1','fulcrumLabel','effortTag','loadTag','distanceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the distances appear once the lever moves, and the crowbar stroke is right on the first try`,()=>{
  ui.input('answer',.2);assert.equal(ui.el('effort-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');assert.equal(ui.el('effort-value').textContent,fmt(.01,3));assert.equal(ui.el('load-value').textContent,fmt(.002,3));assert.equal(ui.el('ratio-value').textContent,fmt(.2));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{se:fmt(.01,3),sl:fmt(.002,3)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{se:fmt(.2,3),sl:fmt(.04,3)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.effortShort)&&ui.painted.includes(l.loadShort));
 });
 test(`${lang}: taking the load's force as the work is explained, and the work in matches the work out`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'W_out =');ui.input('answer',600);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{se:fmt(.15,3),sl:fmt(.05,3),win:fmt(30),wout:fmt(30)})+' '+fill(l.missCopy,{p:'600 J'})+' '+l.slipForceOnly);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('work-value').textContent,fmt(30));
  assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.workTitle)&&ui.painted.includes(l.workInShort)&&ui.painted.includes(l.workOutShort));
  ui.input('answer',30);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why1));
 });
 test(`${lang}: the fishing rod tip, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'s_l =');assert.ok(ui.painted.includes(l.class3));
  ui.input('answer',.2);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSame));
  ui.input('answer',1.6);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tradeoff-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{se:fmt(.2,3),sl:fmt(1.6,3)})+' '+l.why3);
 });
 test(`${lang}: the curl's hand speed and the force from work`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  ui.input('answer',.0875);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{v:fmt(.0875,4)})+' '+l.why2);
  ui.click('mission-4');ui.input('answer',90);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoDivide));
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.result4,{se:fmt(.6,3),sl:fmt(.1,3),wout:fmt(90)})));
 });
}
test('changing language preserves lever, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',10);en.click('play');en.run(()=>en.el('tradeoff-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMixed));en.input('answer',30);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'30');assert.equal(es.el('tradeoff-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tradeoff-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} force-for-distance lever trade-off and multilingual interface checks passed.`);
