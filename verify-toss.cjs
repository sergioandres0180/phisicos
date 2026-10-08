// Straight Up: vertical throw with one constant acceleration, exact top and catch, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/toss.html'),'utf8'),copy=require('./locales/toss.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'toss-model'),pure);const Toss=pure.TossModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[1,19.6,3,-9.8,-14.7];
const make=(i,a=expected[i])=>{const m=new Toss(i);assert.ok(m.setAnswer(a));return m;};

test('each throw has the expected answer',()=>{expected.forEach((v,i)=>near(new Toss(i).exact(),v));});
test('the motion is symmetric: v = 0 at the top, −v₀ at the catch, and a = −g throughout',()=>{
 const m=make(1);near(m.topTime(),2);near(m.y(2),19.6);near(m.v(2),0);near(m.y(1),m.y(3));near(m.v(1),-m.v(3));near(m.v(4),-19.6);near(m.y(4),0);near(m.highest(3.5),19.6);
});
test('the top and the catch are found exactly inside long steps, then the run freezes',()=>{
 const m=make(2);const top=m.advance(2);assert.equal(top.top,true);assert.equal(top.done,false);
 const e=m.advance(5);assert.equal(e.done,true);near(e.t,3);assert.equal(m.status,'caught');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1),b=make(1);a.advance(1e3);while(b.status!=='caught')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a right answer within 2% earns 100, plus 50 only on the first throw',()=>{
 const m=make(3);m.advance(9);assert.equal(m.score(),150);
 const n=make(3,0);n.advance(9);assert.equal(n.score(),0);n.setAnswer(-9.8);n.advance(9);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized, including zero acceleration at the top',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2),'whole');assert.equal(slip(1,39.2),'noHalf');assert.equal(slip(1,2),'timeH');assert.equal(slip(2,1.5),'half');
 assert.equal(slip(3,0),'zeroTop');assert.equal(slip(3,9.8),'signA');assert.equal(slip(4,14.7),'signV');assert.equal(slip(4,0),'zeroV');assert.equal(slip(4,-10),null);
});
test('signed answers are allowed only where the question asks for a sign',()=>{
 assert.equal(new Toss(0).setAnswer(-1),false);assert.equal(new Toss(1).setAnswer(201),false);assert.equal(new Toss(3).setAnswer(-9.8),true);assert.equal(new Toss(3).setAnswer(150),false);
 const m=new Toss(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,5);m.advance(9);m.setAnswer(-14.7);m.advance(1);const n=new Toss();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'caught',attempts:0}]){const k=new Toss();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'toss-model'),script(source,'toss-model'));
 return mount(html,{scripts:['toss-model','toss-interface'],locale:'toss-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.questionTopTime);assert.equal(ui.el('answer-symbol').textContent,'t_top =');
  assert.ok(ui.painted.includes(l.columnTitle)&&ui.painted.includes(l.hand)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: the right time to the top on the first throw earns the bonus`,()=>{
  ui.input('answer',1);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));
  ui.click('play');ui.run(()=>ui.el('toss-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.goodCopy,{top:fmt(1),h:fmt(4.9,1),T:fmt(2),v:fmt(-9.8,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.topLabel,{a:fmt(-9.8,1)})));assert.equal(ui.el('highest-value').textContent,fmt(4.9));
 });
 test(`${lang}: zero acceleration at the top is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('question').textContent,l.questionTopAcceleration);assert.equal(ui.el('answer-unit').textContent,'m/s²');
  ui.input('answer',0);ui.click('play');ui.run(()=>ui.el('toss-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipZeroTop));assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('answer',-9.8);ui.click('play');ui.run(()=>ui.el('toss-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('mission-2');ui.input('answer',3);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('toss-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves throw, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',14.7);en.click('play');en.run(()=>en.el('toss-status-text').textContent===copy.en.done);en.input('answer',-14.7);en.click('step');
 en.links.find(l=>l.lang==='da').events.click();assert.equal(storage.size,1);
 const da=open('da',storage);assert.equal(storage.size,0);
 assert.equal(da.el('mission-4').attributes['aria-pressed'],'true');assert.equal(da.el('answer').value,'-14.7');assert.equal(da.el('toss-status-text').textContent,copy.da.paused);
 da.click('play');da.run(()=>da.el('toss-status-text').textContent===copy.da.done);assert.equal(da.el('mission-score').textContent,'100');
});
console.log(`\n${checks} straight up vertical-throw and multilingual interface checks passed.`);
