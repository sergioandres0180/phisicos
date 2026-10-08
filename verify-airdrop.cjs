// Air Drop: horizontal launch with independent motions, exact landing, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/airdrop.html'),'utf8'),copy=require('./locales/airdrop.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'airdrop-model'),pure);const Drop=pure.AirdropModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[2,150,3,49,44.1];
const make=(i,a=expected[i])=>{const m=new Drop(i);assert.ok(m.setAnswer(a));return m;};

test('each drop has the expected answer',()=>{expected.forEach((v,i)=>near(new Drop(i).exact(),v));});
test('the crate stays below the plane and falls level with a ball dropped from rest',()=>{
 const m=make(0);near(m.landTime(),2);near(m.x(1),40);near(m.y(1),19.6-4.9);near(m.vy(1),-9.8);near(m.vx(),40);near(m.y(2),0);near(m.speed(2),Math.hypot(40,19.6));
 // The fall time does not depend on the forward speed.
 near(make(1).landTime(),make(2).landTime());near(make(2).landX(),240);
});
test('the answer sets the release point or the altitude when there is a target',()=>{
 near(make(1).landX(),0);near(make(1,120).landX(),30);near(make(1,0).landX(),150);
 near(make(4).landX(),0,1e-9);near(make(4,19.6).landX(),-50);assert.equal(make(4).targeted(),true);assert.equal(make(0).targeted(),false);
});
test('the landing is found exactly inside long steps, then the run freezes',()=>{
 const m=make(3);const e=m.advance(9);near(e.t,3);assert.equal(m.status,'landed');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1),b=make(1);a.advance(1e3);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a right answer within 2% earns 100, plus 50 only on the first drop',()=>{
 const m=make(3);m.advance(9);assert.equal(m.score(),150);
 const n=make(3,30);n.advance(9);assert.equal(n.score(),0);n.setAnswer(49.5);n.advance(9);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, including a speed that changes the fall time',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4),'noRoot');assert.equal(slip(0,Math.SQRT2),'noTwo');assert.equal(slip(0,.49),'hOverV');
 assert.equal(slip(1,0),'overhead');assert.equal(slip(1,3),'leadTime');assert.equal(slip(1,450),'leadNoRoot');assert.equal(slip(1,50*Math.sqrt(4.5)),'leadNoTwo');
 assert.equal(slip(2,1.875),'speedTime');assert.equal(slip(2,4.8),'speedTime');
 assert.equal(slip(3,39.2),'onlyX');assert.equal(slip(3,29.4),'onlyY');assert.equal(slip(3,68.6),'sum');
 assert.equal(slip(4,3),'heightTime');assert.equal(slip(4,29.4),'heightSpeed');assert.equal(slip(4,88.2),'noHalf');assert.equal(slip(4,60),null);
});
test('answers are validated and nothing runs without one',()=>{
 assert.equal(new Drop(0).setAnswer(0),false);assert.equal(new Drop(0).setAnswer(-2),false);assert.equal(new Drop(1).setAnswer(0),true);assert.equal(new Drop(4).setAnswer(501),false);assert.equal(new Drop(3).setAnswer(NaN),false);
 const m=new Drop(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,30);m.advance(9);m.setAnswer(44.1);m.advance(1);const n=new Drop();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'landed',attempts:0}]){const k=new Drop();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'airdrop-model'),script(source,'airdrop-model'));
 return mount(html,{scripts:['airdrop-model','airdrop-interface'],locale:'airdrop-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.questionTime);assert.equal(ui.el('answer-symbol').textContent,'t =');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.axisX));
 });
 test(`${lang}: the right fall time on the first drop earns the bonus`,()=>{
  ui.input('answer',2);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));
  ui.click('play');ui.run(()=>ui.el('airdrop-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.landedCopy,{t:fmt(2),v:fmt(Math.hypot(40,19.6),1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.landedBanner,{t:fmt(2),v:fmt(Math.hypot(40,19.6),1)})));assert.ok(ui.painted.includes(fill(l.predictionMark,{p:fmt(2)})));
 });
 test(`${lang}: releasing over the target overshoots and is explained`,()=>{
  ui.click('mission-1');assert.equal(ui.el('question').textContent,l.questionLead);assert.equal(ui.el('answer-unit').textContent,'m');
  ui.input('answer',0);ui.click('play');ui.run(()=>ui.el('airdrop-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.includes(fill(l.pastCopy,{d:fmt(150,1)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipOverhead));
  assert.ok(ui.painted.includes(fill(l.pastBanner,{d:fmt(150,1)})));assert.ok(ui.painted.includes(l.targetLabel));assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',150);ui.click('play');ui.run(()=>ui.el('airdrop-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.painted.includes(l.hitBanner));
 });
 test(`${lang}: the faster plane asks with both speeds, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');assert.equal(ui.el('question').textContent,fill(l.questionCompare,{v:'80',w:'50'}));
  ui.input('answer',3);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('airdrop-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);assert.ok(ui.painted.includes(fill(l.compareLabel,{v:'50'})));
 });
}
test('changing language preserves drop, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',30);en.click('play');en.run(()=>en.el('airdrop-status-text').textContent===copy.en.done);en.input('answer',44.1);en.click('step');
 en.links.find(l=>l.lang==='pt').events.click();assert.equal(storage.size,1);
 const pt=open('pt',storage);assert.equal(storage.size,0);
 assert.equal(pt.el('mission-4').attributes['aria-pressed'],'true');assert.equal(pt.el('answer').value,'44.1');assert.equal(pt.el('airdrop-status-text').textContent,copy.pt.paused);
 pt.click('play');pt.run(()=>pt.el('airdrop-status-text').textContent===copy.pt.done);assert.equal(pt.el('mission-score').textContent,'100');
});
console.log(`\n${checks} air drop horizontal-launch and multilingual interface checks passed.`);
