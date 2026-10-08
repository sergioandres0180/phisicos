// Dog Walk: piecewise-linear position graphs, exact readings, slips, attempts, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/dog.html'),'utf8'),copy=require('./locales/dog.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'dog-model'),pure);const Dog=pure.DogModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[4,-1,17,9,12,9];
const make=(i,a=expected[i])=>{const m=new Dog(i);m.setAnswer(a);return m;};

test('each question has the expected exact answer',()=>{expected.forEach((v,i)=>near(new Dog(i).exact(),v));});
test('position is piecewise linear and velocity is constant on each stretch',()=>{
 const m=new Dog(1);near(m.x(0),2);near(m.x(3),8);near(m.x(4.5),3.5);near(m.x(6),-1);near(m.x(8),1);
 m.setAnswer(0);m.advance(1);near(m.v(m.t),2);m.advance(3);near(m.v(m.t),-3);
});
test('distance adds every rise and fall, and is never less than |displacement|',()=>{
 const m=new Dog(2);near(m.distance(0,8),17);near(m.distance(2,4),2+1*3);near(m.distance(4,7),3*2+1);
 for(const [a,b] of [[0,8],[1,5],[3,6],[2.5,7.5]])assert.ok(m.distance(a,b)>=Math.abs(m.x(b)-m.x(a))-1e-12);
});
test('the return to the bench is solved exactly on the crossing stretch',()=>{near(new Dog(3).returnTime(),9);near(new Dog(4).returnTime(),1);});
test('the walk ends exactly inside a long step, then freezes',()=>{
 const m=make(0);assert.equal(m.advance(9.9),null);const e=m.advance(5);near(e.t,10);assert.equal(m.status,'done');near(m.x(m.now()),2);near(m.v(m.now()),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(2),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(5),b=make(5);a.advance(1e3);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a right answer earns 100, plus 50 only on the first walk',()=>{
 const m=make(0);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(0,5);n.advance(1e3);assert.equal(n.score(),0);n.setAnswer(4);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
 const p=make(2,17.04);p.advance(1e3);assert.equal(p.score(),150);assert.equal(make(0).score(),0);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,8),'positionDistance');assert.equal(slip(0,-4),'sign');assert.equal(slip(1,17),'displacementDistance');assert.equal(slip(1,1),'final');
 assert.equal(slip(1,1.5),null);assert.equal(slip(4,0),'distanceDisplacement');assert.equal(slip(5,3),'farthestFinal');assert.equal(slip(5,20),'farthestDistance');
});
test('answers must be numbers, edits restart the walk, and nothing moves without an answer',()=>{
 const m=make(0);m.advance(3);assert.equal(m.setAnswer(NaN),false);assert.equal(m.t,3);m.setAnswer(5);assert.equal(m.t,0);
 const blank=new Dog(0);assert.equal(blank.advance(5),null);assert.equal(blank.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,8);m.advance(1e3);m.setAnswer(9);m.advance(4);const n=new Dog();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,4);
 const s=m.snapshot();for(const bad of [{...s,index:6},{...s,answer:'x'},{...s,t:1e6},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Dog();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'dog-model'),script(source,'dog-model'));
 return mount(html,{scripts:['dog-model','dog-interface'],locale:'dog-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('dog-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('question').textContent,l.questionPosition.replace('{t1}','8'));assert.equal(ui.el('answer-symbol').textContent,'x(8 s) =');
  assert.ok(ui.painted.includes(l.bench)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes('t = 8 s'));
 });
 test(`${lang}: a right reading on the first walk earns the bonus`,()=>{
  ui.input('answer',4);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('dog-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('dog-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why0));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('correct-badge').classList.has('earned')&&ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('distance-value').textContent,fmt(10));assert.equal(ui.el('disp-value').textContent,'+'+fmt(2));
 });
 test(`${lang}: confusing distance with displacement is explained`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'s =');assert.equal(ui.el('question').textContent,l.questionDistance.replace('{t1}','0').replace('{t2}','8'));
  ui.input('answer',0);ui.click('play');ui.run(()=>ui.el('dog-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.equal(ui.el('lesson-copy').textContent,l.missCopy.replace('{a}','12 m')+' '+l.slipDistanceDisplacement);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('answer',12);ui.click('play');ui.run(()=>ui.el('dog-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(!ui.el('first-badge').classList.has('earned'));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',9);assert.equal(ui.el('answer-unit').textContent,'s');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('dog-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves question, answer, attempts, and walk',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-5');en.input('answer',3);en.click('play');en.run(()=>en.el('dog-status-text').textContent===copy.en.done);en.input('answer',9);en.click('step');
 en.links.find(l=>l.lang==='fr').events.click();assert.equal(storage.size,1);
 const fr=open('fr',storage);assert.equal(storage.size,0);
 assert.equal(fr.el('mission-5').attributes['aria-pressed'],'true');assert.equal(fr.el('answer').value,'9');assert.equal(fr.el('dog-status-text').textContent,copy.fr.paused);
 fr.click('play');fr.run(()=>fr.el('dog-status-text').textContent===copy.fr.done);assert.equal(fr.el('mission-score').textContent,'100');
});
console.log(`\n${checks} dog walk position–time graph and multilingual interface checks passed.`);
