// Magdeburg Hemispheres: the force of air pressure (F = Δp·π·r²), parting the halves at the exact moment, horse teams,
// a half vacuum, a mountain, a suction cup's load, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/hemispheres.html'),'utf8'),copy=require('./locales/hemispheres.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'hemispheres-model'),pure);const Hemi=pure.HemispheresModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const A=Math.PI*.25**2,Ac=Math.PI*.04**2,pull=80*A,cupHold=50*Ac,cupMax=cupHold*1000/9.8;
const expected=[pull,11,50.65*A,60*A,cupMax],units=['kN','','kN','kN','kg'];
const make=(i,a=expected[i])=>{const m=new Hemi(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Hemi(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(new Hemi(0).exact(),15.708,1e-4);near(new Hemi(4).exact(),25.646,1e-4);});
test('the air holds with Δp·π·r², and the pull grows steadily until the halves part at the exact moment',()=>{
 const m=make(0,20);near(m.hold(),pull);near(m.dp(),80);near(m.area(),A);near(m.applied(.5),5);
 const tb=2*pull/20;near(m.breakTime(),tb);near(m.applied(1.9),pull);near(m.duration(),tb+1);near(m.separation(tb+.5),.5);near(m.separation(9),1);
 const e=m.advance(100);assert.equal(e.done,true);near(m.t,tb+1);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const held=make(0,15);assert.equal(held.breaks(),false);assert.equal(held.breakTime(),null);near(held.applied(2),15);near(held.duration(),2);
 assert.equal(make(0,pull*(1-4e-4)).breaks(),true);assert.equal(make(0,pull*.999).breaks(),false);
 near(make(1,11).target(),16.5);near(make(4,25).target(),.245);
});
test('the suction cup lets go only when the load passes the hold',()=>{
 const m=make(4,25.6);assert.equal(m.breaks(),false);near(m.applied(2),25.6*9.8/1000);
 const n=make(4,30);assert.equal(n.breaks(),true);near(n.breakTime(),2*cupHold/(30*9.8/1000));assert.equal(make(4,cupMax*(1+4e-4)).breaks(),false);
});
test('every run ends exactly inside long steps',()=>{
 for(const a of [10,20,100]){const p=make(0,a),q=make(0,a);p.advance(100);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const r=make(1,22),s=make(1,22);r.advance(100);let n=0;while(s.status!=='done'){s.advance(1/120);n++;}near(r.t,s.t,1e-12);
});
test('a pull with at most 2% to spare, the fewest horses, a load with at most 2% to spare; a run counts as soon as it starts',()=>{
 assert.equal(make(0,15.9).evaluate().ok,true);assert.equal(make(0,16.1).evaluate().ok,false);assert.equal(make(0,15).evaluate().ok,false);
 assert.equal(make(1,11).evaluate().ok,true);assert.equal(make(1,12).evaluate().ok,false);
 assert.equal(make(4,25.2).evaluate().ok,true);assert.equal(make(4,25).evaluate().ok,false);assert.equal(make(4,26).evaluate().ok,false);
 const m=make(2);m.advance(10);assert.equal(m.score(),150);assert.equal(make(2).score(),0);
 const n=make(1,22);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(11);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,101.3*A),'fullPressure');assert.equal(slip(0,80*2*A),'surface');assert.equal(slip(0,80*4*A),'area');assert.equal(slip(0,18),'spare');assert.equal(slip(0,14),null);
 assert.equal(slip(1,6),'half');assert.equal(slip(1,22),'double');assert.equal(slip(1,10),'roundDown');assert.equal(slip(1,13),'moreHorses');assert.equal(slip(1,5),null);
 assert.equal(slip(2,101.3*A),'fullPressure');
 assert.equal(slip(3,70*A),'noInside');assert.equal(slip(3,91.3*A),'seaLevel');
 assert.equal(slip(4,cupHold*1000),'noG');assert.equal(slip(4,50*4*Ac*1000/9.8),'diameter');assert.equal(slip(4,101.3*Ac*1000/9.8),'cupFull');assert.equal(slip(4,20),'cupSpare');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1001])assert.equal(new Hemi(0).setAnswer(bad),false);assert.equal(new Hemi(1).setAnswer(10.5),false);assert.equal(new Hemi(1).setAnswer(101),false);assert.equal(new Hemi(1).setAnswer(100),true);
 const m=new Hemi(0);assert.equal(m.target(),0);assert.equal(m.breaks(),false);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,20);m.advance(2.3);const n=new Hemi();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,2.3);assert.equal(n.answer,20);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Hemi();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'hemispheres-model'),script(source,'hemispheres-model'));
 return mount(html,{scripts:['hemispheres-model','hemispheres-interface'],locale:'hemispheres-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('hemispheres-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'kN');
  assert.equal(ui.el('given-0').textContent,`r = ${plain(.25)} m · p_out = ${plain(101.3)} kPa · p_in = ${plain(21.3)} kPa`);
  assert.equal(ui.el('given-1').textContent,`r = ${plain(.25)} m · p_out = ${plain(101.3)} kPa · p_in = ${plain(21.3)} kPa · 1 × ${plain(1.5)} kN`);
  assert.equal(ui.el('given-4').textContent,`r = ${plain(.04)} m · p_out = ${plain(101.3)} kPa · p_in = ${plain(51.3)} kPa`);
  for(const id of ['pull-value','hold-value','dp-value','area-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('hemispheres-equation').textContent,'F = Δp·A');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
  assert.ok(ui.painted.includes('p_out = '+plain(101.3)+' kPa')&&ui.painted.includes('F = ? kN')&&ui.painted.includes('p_in = '+plain(21.3)));
 });
 test(`${lang}: the forces appear once the pull starts, and the halves part with the right pull on the first try`,()=>{
  ui.input('answer',15.71);assert.equal(ui.el('pull-value').textContent,'—');
  ui.click('step');const f=make(0,15.71).applied(12/120);
  assert.equal(ui.el('pull-value').textContent,fmt(f));assert.equal(ui.el('hold-value').textContent,fmt(pull));assert.equal(ui.el('dp-value').textContent,fmt(80));assert.equal(ui.el('area-value').textContent,fmt(A,4));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{f:fmt(f),hold:fmt(pull)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.apartCopy,{hold:fmt(pull)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.apartBanner)&&ui.painted.includes(l.pullShort)&&ui.painted.includes(l.holdShort)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: doubling the horses is explained, and 11 a side is right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,l.horsesUnit);
  ui.input('answer',22);assert.ok(ui.painted.includes(fill(l.teamTag,{n:plain(22)})));ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.apartCopy,{hold:fmt(pull)})+' '+fill(l.missCopy,{p:'22 '+l.horsesUnit})+' '+l.slipDouble);
  ui.input('answer',11);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why1));
 });
 test(`${lang}: the suction cup, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'kg');
  ui.input('answer',251);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.droppedCopy,{max:fmt(cupMax,1),hold:fmt(cupHold)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoG));
  assert.ok(ui.painted.includes(l.offBanner+' · '+l.droppedBanner)&&ui.painted.includes(l.loadShort));
  ui.input('answer',25.6);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('hemispheres-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.cupHeldCopy,{m:plain(25.6),max:fmt(cupMax,1)})+' '+l.why4);assert.ok(ui.painted.includes(l.rightBanner+' · '+l.heldBanner));
 });
 test(`${lang}: half the air out, and a pull that is too weak`,()=>{
  ui.click('mission-2');ui.input('answer',9);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.heldCopy,{f:fmt(9),hold:fmt(50.65*A)})+' '+fill(l.missCopy,{p:'9 kN'})+' '+l.hint2);
  ui.input('answer',9.95);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why2));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',13.74);en.click('play');en.run(()=>en.el('hemispheres-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoInside));en.input('answer',11.8);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'11.8');assert.equal(es.el('hemispheres-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('hemispheres-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} magdeburg-hemispheres force and multilingual interface checks passed.`);
