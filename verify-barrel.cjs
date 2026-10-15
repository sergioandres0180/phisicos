// Pascal's Barrel: extra pressure passed on everywhere (Δp = ρ·g·h on the lid, ρ·g·(h + H) on the bottom), the height
// that pops a lid at the exact moment, a wider tube, a cork in a bottle, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/barrel.html'),'utf8'),copy=require('./locales/barrel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'barrel-model'),pure);const Barrel=pure.BarrelModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const pop=20000/(9800*.5),expected=[pop,pop,29.4,24.5,500],units=['m','m','kN','kN','N'];
const make=(i,a=expected[i])=>{const m=new Barrel(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Barrel(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(pop,4.0816,1e-4);});
test('the extra pressure ρ·g·h reaches the lid and the bottom alike, whatever the tube',()=>{
 for(const i of [2,3]){const m=make(i);for(const t of [.5,1,2]){const h=m.level(t);near(m.added(t),9800*h);near(m.lidForce(t),9800*h*.5);near(m.bottomPressure(t),9800*(h+1));near(m.bottomForce(t),9800*(h+1)*.5);}}
 near(make(2).input(2),5.88);near(make(2).litres(2),.6);near(make(3).output(2),24500);near(make(2).output(2),29400);
 const a=make(0,4),b=make(1,4);near(a.added(2),b.added(2));near(b.litres(2),10*a.litres(2));
 const c=make(4);near(c.push(1),10);near(c.added(2),100000);near(c.bottomForce(2),500);near(c.input(2),20);assert.equal(c.level(2),0);
});
test('the lid pops at the exact moment its force reaches its strength, and pouring stops',()=>{
 const m=make(0,5),tp=2*pop/5;near(m.popTime(),tp);near(m.level(1.9),pop);near(m.lidForce(1.9),20000);near(m.duration(),tp+1);near(m.lift(tp+.5),.5);
 const e=m.advance(100);assert.equal(e.done,true);near(m.t,tp+1);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const held=make(0,4);assert.equal(held.pops(),false);assert.equal(held.popTime(),null);near(held.duration(),2);near(held.level(2),4);
 assert.equal(make(0,pop*(1-4e-4)).pops(),true);assert.equal(make(0,pop*.999).pops(),false);assert.equal(make(2).pops(),false);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,5],[0,4],[2,29.4],[4,500]]){const p=make(i,a),q=make(i,a);p.advance(100);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
});
test('a height with at most 2% to spare, a force within 2%; a run counts as soon as it starts',()=>{
 assert.equal(make(0,4.1).evaluate().ok,true);assert.equal(make(0,4.2).evaluate().ok,false);assert.equal(make(0,4).evaluate().ok,false);
 assert.equal(make(2,29).evaluate().ok,true);assert.equal(make(3,25.5).evaluate().ok,false);assert.equal(make(4,505).evaluate().ok,true);
 const m=make(3);m.advance(10);assert.equal(m.score(),150);assert.equal(make(3).score(),0);
 const n=make(1,.4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(4.1);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(1,pop/10),'width');assert.equal(slip(1,pop*10),'width');assert.equal(slip(0,20000/.98),'tubeArea');assert.equal(slip(0,40),'noG');assert.equal(slip(0,5),'spare');assert.equal(slip(0,3),null);
 assert.equal(slip(2,.00588),'tubeArea');assert.equal(slip(2,5.88),'tubeArea');assert.equal(slip(2,3),'noG');assert.equal(slip(2,34.3),'withBarrel');
 assert.equal(slip(3,19.6),'tubeOnly');assert.equal(slip(3,4.9),'barrelOnly');
 assert.equal(slip(4,20),'same');assert.equal(slip(4,.8),'inverted');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e5+1])assert.equal(new Barrel(0).setAnswer(bad),false);assert.equal(new Barrel(4).setAnswer(1e7),true);
 const m=new Barrel(0);assert.equal(m.target(),0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,5);m.advance(2.2);const n=new Barrel();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,2.2);assert.equal(n.answer,5);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Barrel();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'barrel-model'),script(source,'barrel-model'));
 return mount(html,{scripts:['barrel-model','barrel-interface'],locale:'barrel-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('barrel-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`A_lid = ${plain(.5)} m² · A_tube = 1 cm² · F_max = 20 kN`);
  assert.equal(ui.el('given-3').textContent,`A_lid = ${plain(.5)} m² · A_tube = 1 cm² · h = 4 m · H = 1 m`);
  assert.equal(ui.el('given-4').textContent,'A_cork = 2 cm² · A_bottom = 50 cm² · F = 20 N');
  for(const id of ['height-value','pressure-value','force-value','poured-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('barrel-equation').textContent,'F = p·A');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(plain(2)+' m'));
 });
 test(`${lang}: the readings appear once the water is poured, and the lid pops at the right height on the first try`,()=>{
  ui.input('answer',4.09);assert.equal(ui.el('height-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0,4.09),h=m.level(12/120);
  assert.equal(ui.el('height-value').textContent,fmt(h));assert.equal(ui.el('pressure-value').textContent,fmt(9.8*h,1));assert.equal(ui.el('force-value').textContent,fmt(4.9*h));assert.equal(ui.el('poured-value').textContent,fmt(.98*h));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{h:fmt(h),p:fmt(9.8*h,1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{h:fmt(pop),p:fmt(40,1),f:fmt(20),v:fmt(pop/10)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.poppedBanner)&&ui.painted.includes(l.strengthTag)&&ui.painted.includes(l.lidShort)&&ui.painted.includes(l.inShort));
 });
 test(`${lang}: thinking a wider tube needs less height is explained, and the same height pops it`,()=>{
  ui.click('mission-1');ui.input('answer',.408);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.heldCopy,{h:fmt(.408),p:fmt(9.8*.408,1),f:fmt(4.9*.408)})+' '+fill(l.missCopy,{p:plain(.408)+' m'})+' '+l.slipWidth);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner+' · '+l.heldBanner));
  ui.input('answer',4.1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{h:fmt(pop),v:fmt(pop)})+' '+l.why1);
 });
 test(`${lang}: the force on the lid`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'F =');assert.equal(ui.el('answer-unit').textContent,'kN');ui.input('answer',29.4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{p:fmt(58.8,1),f:fmt(29.4),w:fmt(5.88)})+' '+l.why2);
 });
 test(`${lang}: the bottom, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',19.6);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipTubeOnly));assert.ok(ui.painted.includes(l.bottomShort));
  ui.input('answer',24.5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('barrel-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{p:fmt(49,1),f:fmt(24.5)})+' '+l.why3);
 });
 test(`${lang}: the cork in the bottle`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-unit').textContent,'N');assert.ok(ui.painted.includes('F = ? N')&&ui.painted.includes(l.bottleNote));
  ui.input('answer',20);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSame));assert.equal(ui.el('height-value').textContent,'—');
  ui.input('answer',500);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{p:fmt(100,1),f:fmt(500,0)})+' '+l.why4);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',3);en.click('play');en.run(()=>en.el('barrel-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoG));en.input('answer',29.4);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'29.4');assert.equal(es.el('barrel-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('barrel-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} pascal's-barrel pressure and multilingual interface checks passed.`);
