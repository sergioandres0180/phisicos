// Reaction Ruler: free fall of a ruler, exact catches, the test-yourself drop, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ruler.html'),'utf8'),copy=require('./locales/ruler.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ruler-model'),pure);const Ruler=pure.RulerModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[Math.sqrt(.4/9.8),11.025,19.6,Math.sqrt(.6/9.8)];
const make=(i,a=expected[i])=>{const m=new Ruler(i);assert.ok(m.setAnswer(a));return m;};

test('each catch has the expected answer, and twice the time gives four times the distance',()=>{expected.forEach((v,i)=>near(new Ruler(i).exact(),v));near(Ruler.fall(.2)/Ruler.fall(.1),4);});
test('the run ends exactly at the catch, or when the whole ruler has slipped through',()=>{
 const m=make(1);const e=m.advance(1);near(e.t,.15);assert.equal(e.caught,true);near(m.d(m.now()),.11025);
 const s=make(3);const f=s.advance(1);assert.equal(f.caught,false);near(f.t,Math.sqrt(.6/9.8));near(s.d(s.now()),.3);
 const frozen=JSON.stringify(s.snapshot());assert.equal(s.advance(1),null);assert.equal(JSON.stringify(s.snapshot()),frozen);
 const a=make(0),b=make(0);a.advance(9);while(b.status!=='done')b.advance(1/1200);near(a.t,b.t,1e-12);
});
test('a time within 0.005 s, or a mark within 0.5 cm, earns 100, plus 50 on the first drop',()=>{
 const m=make(0,.205);m.advance(9);assert.equal(m.score(),150);
 const n=make(1,12);n.advance(9);assert.equal(n.score(),0);n.setAnswer(11.4);n.advance(9);assert.equal(n.score(),100);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.0408),'noRoot');assert.equal(slip(0,.1429),'noTwo');assert.equal(slip(0,2.02),'centimetres');assert.equal(slip(3,.175),'noTwo');assert.equal(slip(3,.0612),'noRoot');
 assert.equal(slip(1,22.05),'noHalf');assert.equal(slip(1,.11),'metres');assert.equal(slip(1,147),'speed');assert.equal(slip(2,9.8),'linear');assert.equal(slip(2,39.2),'noHalf');assert.equal(slip(1,15),null);
});
test('test yourself: a false start, a real catch, and a miss',()=>{
 const m=new Ruler();assert.equal(m.startPractice(-1),false);
 m.startPractice(1.5);assert.equal(m.advancePractice(1),'waiting');assert.equal(m.catchPractice(),'early');assert.equal(m.advancePractice(1),null);
 m.startPractice(1);assert.equal(m.advancePractice(1.15),'falling');assert.equal(m.catchPractice(),'caught');near(m.practice.reaction,.15,1e-9);near(m.practice.distance,.11025,1e-9);
 m.startPractice(0);assert.equal(m.advancePractice(.3),'missed');near(m.practice.t,Math.sqrt(.6/9.8));near(m.practiceFall(),.3);
});
test('answers must be in range, edits restart the drop, and nothing falls without an answer',()=>{
 const m=new Ruler(0);for(const bad of [0,-1,6,NaN])assert.equal(m.setAnswer(bad),false);assert.equal(m.advance(1),null);assert.equal(m.t,0);
 const d=new Ruler(1);assert.equal(d.setAnswer(201),false);assert.equal(d.setAnswer(150),true);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,9.8);m.advance(9);m.setAnswer(19.6);m.advance(.1);const n=new Ruler();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.1);
 const s=m.snapshot();for(const bad of [{...s,index:4},{...s,answer:'x'},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Ruler();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ruler-model'),script(source,'ruler-model'));
 return mount(html,{scripts:['ruler-model','ruler-interface'],locale:'ruler-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('catch').disabled,true);
  assert.equal(ui.el('question').textContent,l.questionTime);assert.equal(ui.el('given-0').textContent,'d = 20 cm');assert.equal(ui.el('try-result').textContent,l.tryIdle);
  assert.ok(ui.painted.includes(l.rulerTitle)&&ui.painted.includes(l.fingers)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: the right reaction time on the first drop earns the bonus, in slow motion`,()=>{
  ui.input('answer',.202);ui.click('play');ui.run(()=>ui.el('ruler-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.caughtCopy,{t:fmt(Math.sqrt(.4/9.8),3),d:fmt(20,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('playback-value').textContent,'×'+plain(.1));
 });
 test(`${lang}: the slowest catch, with the 2 left out, is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('question').textContent,l.questionLongest);ui.input('answer',.175);ui.click('play');ui.run(()=>ui.el('ruler-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.slipCopy,{t:fmt(Math.sqrt(.6/9.8),3),d:fmt(30,1)})+' '+fill(l.missCopy,{p:plain(.175)+' s'})+' '+l.slipNoTwo);
 });
 test(`${lang}: test yourself catches a false start and a miss`,()=>{
  ui.click('try');assert.equal(ui.el('try-result').textContent,l.tryWatch);assert.equal(ui.el('catch').disabled,false);
  ui.click('catch');assert.equal(ui.el('try-result').textContent,l.tryEarly);assert.equal(ui.el('catch').disabled,true);
  ui.click('try');ui.run(()=>ui.el('try-result').textContent===l.tryMissed,{limit:60});assert.equal(ui.el('try-result').textContent,l.tryMissed);assert.equal(ui.el('catch').disabled,true);
  ui.click('mission-0');assert.equal(ui.el('try-result').textContent,l.tryIdle);
 });
}
test('changing language preserves catch, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',22);en.click('play');en.run(()=>en.el('ruler-status-text').textContent===copy.en.done);en.input('answer',11);en.click('step');
 en.links.find(l=>l.lang==='fr').events.click();assert.equal(storage.size,1);
 const fr=open('fr',storage);assert.equal(storage.size,0);
 assert.equal(fr.el('mission-1').attributes['aria-pressed'],'true');assert.equal(fr.el('answer').value,'11');assert.equal(fr.el('ruler-status-text').textContent,copy.fr.paused);
 fr.click('play');fr.run(()=>fr.el('ruler-status-text').textContent===copy.fr.done);assert.equal(fr.el('mission-score').textContent,'100');
});
console.log(`\n${checks} reaction ruler free-fall and multilingual interface checks passed.`);
