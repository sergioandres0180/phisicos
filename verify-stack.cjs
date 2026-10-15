// Block Tower: the centre of mass resting on each edge of a stack of blocks (the harmonic overhang), a counterweight, a heavy
// block on top, exact toppling, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/stack.html'),'utf8'),copy=require('./locales/stack.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'stack-model'),pure);const Stack=pure.StackModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[.2,.1,1/15,2/3,.05];
const make=(i,a=expected[i])=>{const m=new Stack(i);assert.ok(m.setAnswer(a));return m;};

test('each stack has the expected answer, the harmonic overhang included',()=>{expected.forEach((v,i)=>near(new Stack(i).exact(),v));near(make(2).top(),.4*(1/2+1/4+1/6));near(make(1).top(),.3);});
test('the right answer puts every centre of mass right over the edge below it',()=>{
 for(let i=0;i<5;i++){const m=make(i);assert.equal(m.stable(),true);assert.equal(m.outcome(),'hold');near(m.duration(),2);near(m.angle(5),0);for(const k of m.levels())assert.ok(Math.abs(m.margin(k))<1e-12,`level ${k}`);}
 near(make(3).total(),2+2/3);near(make(4).above(1).x,.05);near(make(2).edge(2),1/15+.1);
});
test('an overhanging stack topples about the lowest failing edge from rest, exactly inside long steps, then freezes',()=>{
 const m=make(0,.3),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'topple');assert.equal(m.failLevel(),0);
 near(m.inertia(),.1**2+.05**2+(.16+.01)/12);near(m.alpha(),g*.1/m.inertia());near(m.angle(m.now()),Math.PI/6);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2,.1),b=make(2,.1);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.failLevel(),0);near(a.margin(0),.1-1/15);
});
test('within 0.2 mm counts as over the edge, answers count within 2%, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,.2001).stable(),true);assert.equal(make(0,.2003).stable(),false);assert.equal(make(0,.196).evaluate().ok,true);assert.equal(make(0,.195).evaluate().slip,'short');
 assert.equal(make(3,.675).evaluate().ok,true);assert.equal(make(3,.69).evaluate().slip,'spare');assert.equal(make(3,.66).stable(),false);
 const m=make(4);m.advance(10);assert.equal(m.score(),150);
 const n=make(1,.3);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.1);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.4),'whole');assert.equal(slip(0,.1),'quarter');assert.equal(slip(0,.35),null);
 assert.equal(slip(1,.2),'ignoreTop');assert.equal(slip(1,.3),'total');
 assert.equal(slip(2,.1),'sameShift');assert.equal(slip(2,.05),'halving');assert.equal(slip(2,.2),'ignoreTop');
 assert.equal(slip(3,2),'sameMass');assert.equal(slip(3,6),'invertedMass');
 assert.equal(slip(4,.1),'equalMasses');assert.equal(slip(4,.2),'ignoreTop');assert.equal(slip(4,.03),'short');
});
test('answers are validated and nothing topples without one',()=>{
 assert.equal(new Stack(0).setAnswer(0),false);assert.equal(new Stack(0).setAnswer(.41),false);assert.equal(new Stack(3).setAnswer(0),false);assert.equal(new Stack(3).setAnswer(51),false);
 const m=new Stack(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,.3);m.advance(.05);const n=new Stack();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.05);assert.equal(n.answer,.3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Stack();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'stack-model'),script(source,'stack-model'));
 return mount(html,{scripts:['stack-model','stack-interface'],locale:'stack-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('stack-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');
  assert.equal(ui.el('given-0').textContent,`L = ${plain(.4)} m · 1 kg · d = ?`);
  assert.equal(ui.el('given-2').textContent,`L = ${plain(.4)} m · 1 kg · 1 kg +${plain(.1)} m · 1 kg +${plain(.2)} m · d = ?`);
  assert.equal(ui.el('given-3').textContent,`L = ${plain(.4)} m · 2 kg · d = ${plain(.25)} m · m = ?`);
  assert.equal(ui.el('cm-value').textContent,'—');assert.equal(ui.el('top-value').textContent,'—');assert.equal(ui.el('mass-value').textContent,fmt(1));assert.equal(ui.el('stack-equation').textContent,'x_cm = Σm·x ÷ Σm');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.checkTitle)&&ui.painted.includes(l.checkHint)&&ui.painted.includes(l.tableName)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: the centre of mass appears once the stack is released, and a block at half its length stays put`,()=>{
  ui.input('answer',.2);assert.equal(ui.el('cm-value').textContent,'—');assert.equal(ui.el('top-value').textContent,fmt(.2,3));
  ui.click('step');assert.equal(ui.el('cm-value').textContent,fmt(0,3));assert.equal(ui.el('lesson-copy').textContent,l.restingCopy);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{top:fmt(.2,3)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.holdBanner)&&ui.painted.includes(l.tableName+': '+fmt(0,3)+' m ✓'));
 });
 test(`${lang}: repeating the shift topples the three-block stack at the table, and the slip is explained`,()=>{
  ui.click('mission-2');ui.input('answer',.1);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.toppleCopy,{edge:l.tableEdge,cm:'+'+fmt(.1-1/15,3),e:fmt(0,3)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSameShift));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.toppleBanner));
  assert.ok(ui.painted.includes(fill(l.blockName,{n:1})+': '+fmt(0,3)+' m ✓')&&ui.painted.includes(l.tableName+': +'+fmt(.1-1/15,3)+' m ✗'));
  assert.equal(ui.el('angle-value').textContent,fmt(30,1));
 });
 test(`${lang}: the counterweight, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'kg');assert.equal(ui.el('mass-value').textContent,'—');assert.equal(ui.el('top-value').textContent,fmt(.25,3));
  ui.input('answer',2);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.holdCopy,{top:fmt(.25,3)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSameMass));
  ui.input('answer',.6667);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('stack-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why3));
 });
}
test('changing language preserves stack, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',.1);en.click('play');en.run(()=>en.el('stack-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipEqualMasses));en.input('answer',.05);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.05');assert.equal(es.el('stack-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('stack-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} block-tower centre-of-mass and multilingual interface checks passed.`);
