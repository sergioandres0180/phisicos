// Plank Bridge: support reactions from ΣF = 0 and ΣM = 0, the plank's own weight, exact cracking and tipping, slips,
// scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bridge.html'),'utf8'),copy=require('./locales/bridge.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bridge-model'),pure);const Bridge=pure.BridgeModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[400,600,700,4.25,.5];
const make=(i,a=expected[i])=>{const m=new Bridge(i);assert.ok(m.setAnswer(a));return m;};

test('each load has the expected answer',()=>{expected.forEach((v,i)=>near(new Bridge(i).exact(),v));});
test('the reactions satisfy ΣF = 0 and ΣM = 0 about A at every position',()=>{
 for(let i=0;i<5;i++){const m=make(i),c=m.config;for(const x of [0,1,2,3.3,c.span]){const [A,B]=m.reactions(x);near(A+B,c.load.W+c.plank.w);near(B*c.span,c.load.W*x+c.plank.w*m.centre());}}
 assert.deepEqual([...make(1).reactions(1)],[600,200]);assert.deepEqual([...make(2).reactions(1)],[700,300]);
 near(make(3).reactions(4.25)[1],1000);near(make(4).reactions(4.5)[0],0,1e-12);assert.ok(make(4).reactions(4.6)[0]<0,'past the limit A would have to pull down');
});
test('a support cracks exactly at its rating and the plank tips exactly at R_A = 0, inside long steps',()=>{
 const m=make(0,300),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'crack');near(e.t,1.5);near(m.reactionsAt(m.now())[0],300);
 const h=make(2,600);h.advance(100);near(h.t,2*(600-100)/600);near(h.reactionsAt(h.now())[0],600);
 const truck=make(3,5);truck.advance(100);assert.deepEqual(JSON.parse(JSON.stringify(truck.failure())),{kind:'crack',support:1,t:2.25});near(truck.x(truck.now()),4.25);
 const walk=make(4,1);walk.advance(100);assert.equal(walk.outcome(),'tip');near(walk.t,1.5);near(walk.reactionsAt(walk.now())[0],0,1e-12);
 const frozen=JSON.stringify(walk.snapshot());assert.equal(walk.advance(1),null);assert.equal(JSON.stringify(walk.snapshot()),frozen);
 const a=make(3,6),b=make(3,6);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
 near(make(0).duration(),3);near(make(3).duration(),3.25);near(make(4).duration(),2.5);near(make(0).share(.5),.25);near(make(3).x(1),3);
});
test('ratings hold with at most 2% to spare, stops count within 2% of the limit, and a run counts as soon as it starts',()=>{
 const ok=(i,a)=>make(i,a).evaluate().ok;
 assert.equal(ok(0,400),true);assert.equal(ok(0,408),true);assert.equal(ok(0,409),false);assert.equal(ok(0,399.9),true);assert.equal(ok(0,399.7),false);
 assert.equal(ok(3,4.25),true);assert.equal(ok(3,4.2),true);assert.equal(ok(3,4.1),false);assert.equal(ok(3,4.26),false);
 assert.equal(ok(4,.5),true);assert.equal(ok(4,.49),true);assert.equal(ok(4,.48),false);assert.equal(make(4,.5).outcome(),'hold');assert.equal(make(4,.5025).outcome(),'tip');
 const m=make(3,4.25);m.advance(10);assert.equal(m.score(),150);
 const n=make(1,300);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(600);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,800),'whole');assert.equal(slip(0,500),'spare');assert.equal(slip(0,300),null);
 assert.equal(slip(1,400),'half');assert.equal(slip(1,200),'otherSupport');assert.equal(slip(1,800),'whole');
 assert.equal(slip(2,600),'noPlank');assert.equal(slip(2,800),'wholePlank');assert.equal(slip(2,500),'half');
 assert.equal(slip(3,5),'noPlankTruck');assert.equal(slip(3,6),'end');assert.equal(slip(3,3),'early');
 assert.equal(slip(4,2),'invertedLever');assert.equal(slip(4,1.5),'fromEnd');assert.equal(slip(4,0),'noPlankTip');assert.equal(slip(4,1),null);
});
test('answers are validated and nothing loads without one',()=>{
 assert.equal(new Bridge(0).setAnswer(0),false);assert.equal(new Bridge(1).setAnswer(-3),false);assert.equal(new Bridge(3).setAnswer(1),false);assert.equal(new Bridge(3).setAnswer(7),false);assert.equal(new Bridge(4).setAnswer(2.5),false);assert.equal(new Bridge(2).setAnswer(NaN),false);
 const m=new Bridge(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,5);m.advance(.5);const n=new Bridge();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.5);assert.equal(n.answer,5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Bridge();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bridge-model'),script(source,'bridge-model'));
 return mount(html,{scripts:['bridge-model','bridge-interface'],locale:'bridge-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('bridge-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'R_A =');
  assert.equal(ui.el('given-0').textContent,'L_AB = 4 m · W = 800 N, x = 2 m');assert.equal(ui.el('given-3').textContent,'L_AB = 6 m · W = 1200 N · w = 300 N · R_max = 1000 N');assert.equal(ui.el('given-4').textContent,'L_AB = 4 m · W = 600 N · w = 300 N, 6 m');
  assert.equal(ui.el('ra-value').textContent,'—');assert.equal(ui.el('rb-value').textContent,'—');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.reactionTitle)&&ui.painted.includes(l.reactionHint)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: reactions appear once the crane starts, and the right rating earns the bonus`,()=>{
  ui.input('answer',400);assert.equal(ui.el('ra-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('ra-value').textContent,fmt(20,0));assert.ok(ui.painted.includes(fill(l.craneLabel,{n:fmt(760,0)})));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.loweringCopy,{A:fmt(20,0),B:fmt(20,0)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{A:fmt(400,0),B:fmt(400,0)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.holdBanner));
 });
 test(`${lang}: forgetting the plank's weight cracks support B under the truck`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'x =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.crackCopy,{support:'B',A:fmt(500,0),B:fmt(1000,0),x:fmt(4.25)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoPlankTruck));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(fill(l.crackBanner,{support:'B'})));
  assert.equal(ui.el('x-value').textContent,fmt(4.25));
 });
 test(`${lang}: walking too far tips the plank, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'d =');ui.input('answer',1);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.tipCopy,{x:fmt(4.5)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.hint4));assert.ok(ui.painted.includes(l.tipBanner));
  ui.input('answer',.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('bridge-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why4));
 });
}
test('changing language preserves load, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',600);en.click('play');en.run(()=>en.el('bridge-status-text').textContent===copy.en.done);en.input('answer',700);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'700');assert.equal(es.el('bridge-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('bridge-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} plank bridge support-reaction and multilingual interface checks passed.`);
