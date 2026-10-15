// Balance Point: the centre of mass of masses on a beam (x_cm = Σm·x ÷ Σm), the beam's own mass, a narrow support,
// exact tipping, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/beam.html'),'utf8'),copy=require('./locales/beam.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'beam-model'),pure);const Beam=pure.BeamModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[.5,.95,.5,1.6,2];
const make=(i,a=expected[i])=>{const m=new Beam(i);assert.ok(m.setAnswer(a));return m;};

test('each beam has the expected answer',()=>{expected.forEach((v,i)=>near(new Beam(i).exact(),v));});
test('the right answer puts the centre of mass over the support, the beam included',()=>{
 for(let i=0;i<5;i++){const m=make(i);near(m.offset(),0,1e-12);assert.equal(m.balanced(),true);assert.equal(m.outcome(),'level');near(m.duration(),2);near(m.angle(5),0);}
 near(make(2).total(),6);near(make(2).moment(),3);near(make(4).total(),5);near(make(1).moment(),3.8);
 const s=make(0).sides();near(s.left,3*g*.5);near(s.right,1*g*1.5);
});
test('an off-centre beam tips over the support edge from rest and touches the table exactly, inside long steps',()=>{
 const m=make(0,1),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'left');near(m.edge(),.99);
 near(Math.abs(m.angle(m.now())),Math.asin(.15/.99));assert.ok(m.angle(m.now())<0,'left end down');near(m.t,Math.sqrt(2*m.stopAngle()/m.alpha()));
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1,.5),b=make(1,.5);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.outcome(),'right');
 near(a.alpha(),g*4*(.95-.51)/a.inertia());
});
test('the 2 cm support holds within 1 cm, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,.509).balanced(),true);assert.equal(make(0,.511).balanced(),false);assert.equal(make(0,.491).evaluate().ok,true);
 assert.equal(make(4,2.06).balanced(),true);assert.equal(make(4,2.07).balanced(),false);
 const m=make(2);m.advance(10);assert.equal(m.score(),150);
 const n=make(3,1);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1.6);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1),'midpoint');assert.equal(slip(0,1.5),'inverted');assert.equal(slip(0,.3),null);
 assert.equal(slip(1,1),'positionsOnly');assert.equal(slip(1,.8),'heaviest');
 assert.equal(slip(2,.25),'noBeam');assert.equal(slip(2,.625),'positionsOnly');assert.equal(slip(2,1),'midpoint');
 assert.equal(slip(3,1),'mirror');assert.equal(slip(4,1.5),'noBeam');
});
test('answers are validated and nothing tips without one',()=>{
 assert.equal(new Beam(0).setAnswer(-.1),false);assert.equal(new Beam(0).setAnswer(2.1),false);assert.equal(new Beam(0).setAnswer(0),true);assert.equal(new Beam(4).setAnswer(0),false);assert.equal(new Beam(4).setAnswer(Infinity),false);
 const m=new Beam(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,1.2);m.advance(.1);const n=new Beam();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.1);assert.equal(n.answer,1.2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Beam();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'beam-model'),script(source,'beam-model'));
 return mount(html,{scripts:['beam-model','beam-interface'],locale:'beam-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('beam-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'x_s =');
  assert.equal(ui.el('given-0').textContent,'3 kg @ 0 m · 1 kg @ 2 m · x_s = ?');
  assert.equal(ui.el('given-3').textContent,`3 kg @ ${plain(.4)} m · 1 kg @ x = ? · x_s = ${plain(.7)} m`);
  assert.equal(ui.el('given-4').textContent,`1 kg @ 0 m · m = ? @ 2 m · m_b = 2 kg · x_s = ${plain(1.2)} m`);
  assert.equal(ui.el('cm-value').textContent,'—');assert.equal(ui.el('sum-value').textContent,'—');assert.equal(ui.el('mass-value').textContent,fmt(4));assert.equal(ui.el('beam-equation').textContent,'x_cm = Σm·x ÷ Σm');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.momentTitle)&&ui.painted.includes(l.momentHint)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: the centre of mass appears once the beam is released, and a level beam earns the bonus`,()=>{
  ui.input('answer',.5);assert.equal(ui.el('cm-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('cm-value').textContent,fmt(.5,3));assert.equal(ui.el('sum-value').textContent,fmt(2,3));assert.equal(ui.el('lesson-copy').textContent,l.restingCopy);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.levelCopy,{cm:fmt(.5,3),s:fmt(.5,3)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.levelBanner)&&ui.painted.includes(l.leftShort)&&ui.painted.includes(l.supportLabel)&&ui.painted.includes('x_cm'));
 });
 test(`${lang}: forgetting the beam's own mass tips it, and the slip is explained`,()=>{
  ui.click('mission-2');ui.input('answer',.25);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.rightCopy,{cm:fmt(.5,3),s:fmt(.25,3)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoBeam));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.rightDownBanner)&&ui.painted.includes(l.beamLabel));
  assert.notEqual(ui.el('angle-value').textContent,fmt(0,1));
 });
 test(`${lang}: choosing a mass, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'kg');assert.equal(ui.el('mass-value').textContent,'—');
  ui.input('answer',1.5);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.leftCopy,{cm:fmt(5/4.5,3),s:fmt(1.2,3)})));assert.ok(ui.painted.includes(l.leftDownBanner));
  ui.input('answer',2);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('beam-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why4));
 });
}
test('changing language preserves beam, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',1);en.click('play');en.run(()=>en.el('beam-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMirror));en.input('answer',1.6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1.6');assert.equal(es.el('beam-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('beam-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} balance-point centre-of-mass and multilingual interface checks passed.`);
