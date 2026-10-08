// Drop Test: free fall from rest, exact touchdown, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/drop.html'),'utf8'),copy=require('./locales/drop.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'drop-model'),pure);const Drop=pure.DropModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[1,2,19.6,3,2];
const make=(i,a=expected[i])=>{const m=new Drop(i);assert.ok(m.setAnswer(a));return m;};

test('each drop has the expected answer, and four times the height doubles the time',()=>{expected.forEach((v,i)=>near(new Drop(i).exact(),v));near(new Drop(1).landTime()/new Drop(0).landTime(),2);});
test('from rest, y = h − ½·g·t² and v = −g·t, with the velocity kept at touchdown',()=>{
 const m=make(1);near(m.y(1),19.6-4.9);near(m.v(1),-9.8);near(m.y(5),0);near(m.v(5),-19.6);
 const moon=make(4);near(moon.v(moon.landTime()),-3.24);
});
test('touchdown is solved exactly inside a long step, then the run freezes',()=>{
 const m=make(3);assert.equal(m.advance(2.9),null);const e=m.advance(5);near(e.t,3);assert.equal(m.status,'landed');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1),b=make(1);a.advance(1e3);while(b.status!=='landed')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a right answer within 2% earns 100, plus 50 only on the first drop',()=>{
 const m=make(0);m.advance(9);assert.equal(m.score(),150);
 const n=make(0,1.03);n.advance(9);assert.equal(n.score(),0);n.setAnswer(1.02);n.advance(9);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(1,4),'noRoot');assert.equal(slip(1,Math.SQRT2),'noTwo');assert.equal(slip(3,4.5),'hOverG');assert.equal(slip(3,Math.sqrt(4.5)),'noTwo');
 assert.equal(slip(4,Math.sqrt(2*3.24/9.8)),'earth');assert.equal(slip(3,2.5),'mass');assert.equal(slip(3,3.5),null);
 assert.equal(slip(2,9.8*19.6),'noRootV');assert.equal(slip(2,Math.sqrt(9.8*19.6)),'noTwoV');assert.equal(slip(2,2),'timeV');
});
test('answers must be positive and plausible, edits restart the drop, and nothing falls without an answer',()=>{
 const m=new Drop(0);for(const bad of [0,-1,31,NaN])assert.equal(m.setAnswer(bad),false);assert.equal(m.advance(1),null);assert.equal(m.t,0);
 const s=new Drop(2);assert.equal(s.setAnswer(201),false);assert.equal(s.setAnswer(150),true);
 const r=make(0);r.advance(.5);r.setAnswer(2);assert.equal(r.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,2);m.advance(9);m.setAnswer(3);m.advance(1);const n=new Drop();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'landed',attempts:0}]){const k=new Drop();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'drop-model'),script(source,'drop-model'));
 return mount(html,{scripts:['drop-model','drop-interface'],locale:'drop-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('drop-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('question').textContent,l.questionTime);assert.equal(ui.el('given-0').textContent,'h = '+plain(4.9)+' m · g = '+plain(9.8)+' m/s²');
  assert.ok(ui.painted.includes(l.towerTitle)&&ui.painted.includes(l.graphTitle));
 });
 test(`${lang}: the right fall time on the first drop earns the bonus`,()=>{
  ui.input('answer',1);assert.equal(ui.el('lesson-title').textContent,fill(l.readyTitle,{p:'1 s'}));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('drop-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('drop-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.goodCopy,{t:fmt(1),v:fmt(9.8,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('right-badge').classList.has('earned')&&ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('height-value').textContent,fmt(0));assert.equal(ui.el('velocity-value').textContent,fmt(-9.8));
 });
 test(`${lang}: thinking the heavy ball falls faster is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('question').textContent,l.questionMass);
  ui.input('answer',2.5);ui.click('play');ui.run(()=>ui.el('drop-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.missCopy,{t:fmt(3),v:fmt(29.4,1),p:plain(2.5)+' s'})+' '+l.slipMass);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');assert.ok(ui.painted.includes('5 kg'));
 });
 test(`${lang}: the Moon drop and a focus loss`,()=>{
  ui.click('mission-4');assert.ok(ui.painted.includes(l.moonTitle));ui.input('answer',2);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('drop-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(()=>ui.el('drop-status-text').textContent===l.done);assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
 });
}
test('changing language preserves drop, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',13);en.click('play');en.run(()=>en.el('drop-status-text').textContent===copy.en.done);en.input('answer',19.6);en.click('step');
 en.links.find(l=>l.lang==='nl').events.click();assert.equal(storage.size,1);
 const nl=open('nl',storage);assert.equal(storage.size,0);
 assert.equal(nl.el('mission-2').attributes['aria-pressed'],'true');assert.equal(nl.el('answer').value,'19.6');assert.equal(nl.el('drop-status-text').textContent,copy.nl.paused);
 nl.click('play');nl.run(()=>nl.el('drop-status-text').textContent===copy.nl.done);assert.equal(nl.el('mission-score').textContent,'100');
});
console.log(`\n${checks} drop test free-fall and multilingual interface checks passed.`);
