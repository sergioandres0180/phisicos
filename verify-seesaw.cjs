// Seesaw: torque balance about the pivot (ΣM = 0), the plank's own weight, a lever, exact tipping, slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/seesaw.html'),'utf8'),copy=require('./locales/seesaw.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'seesaw-model'),pure);const Seesaw=pure.SeesawModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[1.5,30,65/1.8,12.5,147];
const make=(i,a=expected[i])=>{const m=new Seesaw(i);assert.ok(m.setAnswer(a));return m;};

test('each seesaw has the expected answer',()=>{expected.forEach((v,i)=>near(new Seesaw(i).exact(),v));near(expected[2],36.11,1e-3);});
test('the right answer cancels the torques about the pivot, including the plank and the lift',()=>{
 for(let i=0;i<5;i++){const m=make(i);near(m.net(),0,1e-12);assert.equal(m.balanced(),true);assert.equal(m.outcome(),'balanced');near(m.duration(),3);}
 near(make(0).ccw(),30*g*2);near(make(3).cw(),12.5*g*4+10*g*1);near(make(3).ccw(),30*g*2);near(make(4).ccw(),147*2);near(make(4).cw(),60*g*.5);
});
test('an unbalanced plank turns from rest and touches the ground exactly, inside long steps, then freezes',()=>{
 const m=make(0,2),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'right');near(m.net(),30*g*2-40*g*2);
 near(Math.abs(m.angle(m.now())),12*Math.PI/180);near(m.t,Math.sqrt(2*m.stopAngle()/Math.abs(m.alpha())));assert.ok(m.angle(m.now())<0,'clockwise tilt');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1,50),b=make(1,50);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.outcome(),'right');assert.equal(make(1,20).outcome(),'left');
 const up=make(4,200),down=make(4,100);assert.equal(up.outcome(),'up');assert.equal(down.outcome(),'down');near(down.stopAngle(),Math.asin(.3/2.2));
});
test('pivot friction holds within 2%, answers count within 2%, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,1.53).balanced(),true);assert.equal(make(0,1.53).evaluate().ok,true);assert.equal(make(0,1.54).balanced(),false);assert.equal(make(0,1.54).evaluate().ok,false);
 assert.equal(make(2,36.1).evaluate().ok,true);assert.equal(make(3,12.7).evaluate().ok,true);assert.equal(make(4,149.9).evaluate().ok,true);assert.equal(make(4,150).evaluate().ok,false);
 const m=make(2,36.1);m.advance(10);assert.equal(m.score(),150);
 const n=make(1,50);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(30);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,40*2/30),'inverted');assert.equal(slip(0,2),'sameDistance');assert.equal(slip(0,1),null);
 assert.equal(slip(1,50*2.5/1.5),'inverted');assert.equal(slip(1,50),'sameMass');
 assert.equal(slip(2,45),'massesOnly');assert.equal(slip(2,40/1.8),'missingChild');assert.equal(slip(2,25/1.8),'missingChild');
 assert.equal(slip(3,15),'noPlank');assert.equal(slip(3,17.5),'plankWrongSide');
 assert.equal(slip(4,588),'fullWeight');assert.equal(slip(4,2352),'invertedLever');assert.equal(slip(4,294),'halfWeight');
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Seesaw(0).setAnswer(0),false);assert.equal(new Seesaw(0).setAnswer(3.5),false);assert.equal(new Seesaw(1).setAnswer(-3),false);assert.equal(new Seesaw(4).setAnswer(Infinity),false);
 const m=new Seesaw(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,20);m.advance(.3);const n=new Seesaw();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,20);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Seesaw();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'seesaw-model'),script(source,'seesaw-model'));
 return mount(html,{scripts:['seesaw-model','seesaw-interface'],locale:'seesaw-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('seesaw-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');
  assert.equal(ui.el('given-0').textContent,`m = 30 kg, x = ${plain(-2)} m · m = 40 kg, x = ?`);
  assert.equal(ui.el('given-3').textContent,`m = 30 kg, x = ${plain(-2)} m · m = ?, x = 4 m · m_p = 10 kg, x_p = 1 m`);
  assert.equal(ui.el('given-4').textContent,`m = 60 kg, x = ${plain(.5)} m · F: x = 2 m`);
  assert.equal(ui.el('ccw-value').textContent,'—');assert.equal(ui.el('net-value').textContent,'—');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.torqueTitle)&&ui.painted.includes(l.torqueHint)&&ui.painted.includes(l.pivotLabel)&&ui.painted.includes(l.arrowScale));
 });
 test(`${lang}: torques appear once the plank is released, and a level plank earns the bonus`,()=>{
  ui.input('answer',1.5);assert.equal(ui.el('ccw-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('ccw-value').textContent,fmt(588,1));assert.equal(ui.el('cw-value').textContent,fmt(588,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.levelCopy,{ccw:fmt(588,1),cw:fmt(588,1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.balancedCopy,{ccw:fmt(588,1),cw:fmt(588,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.balancedBanner)&&ui.painted.includes(l.ccwShort)&&ui.painted.includes(l.cwShort));
 });
 test(`${lang}: forgetting the plank tips it, and the slip is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'m =');ui.input('answer',15);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.rightCopy,{ccw:fmt(588,1),cw:fmt(15*g*4+98,1)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoPlank));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.rightSideBanner)&&ui.painted.includes(l.plankLabel));
  assert.notEqual(ui.el('angle-value').textContent,fmt(0,1));
 });
 test(`${lang}: the wheelbarrow lever, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'F =');ui.input('answer',588);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.upCopy,{ccw:fmt(1176,1),cw:fmt(294,1)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipFullWeight));assert.ok(ui.painted.includes(l.upBanner));
  ui.input('answer',147);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('seesaw-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why4));
 });
}
test('changing language preserves seesaw, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',45);en.click('play');en.run(()=>en.el('seesaw-status-text').textContent===copy.en.done);en.input('answer',36.1);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'36.1');assert.equal(es.el('seesaw-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('seesaw-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} seesaw torque-balance and multilingual interface checks passed.`);
