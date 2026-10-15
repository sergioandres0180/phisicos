// Density Detective: ρ = m ÷ V, volume from the water an object pushes aside, the level as an object goes in, a bead in a
// layered column, exact run ends, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/density.html'),'utf8'),copy=require('./locales/density.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'density-model'),pure);const Density=pure.DensityModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[500,965/60,195,5,1000/19.3/20],units=['mL','g/cm³','g','cm','cm'];
const make=(i,a=expected[i])=>{const m=new Density(i);assert.ok(m.setAnswer(a));return m;};

test('each object has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Density(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(new Density(0).rho(),2.7);near(new Density(4).rho(),19.3);});
test('an object pushes aside water as it goes in, and its whole volume once under',()=>{
 for(const i of [0,1,2,4]){
  const m=make(i),c=m.config;near(m.y(0),m.base()+1);near(m.y(2),0);assert.equal(m.sunk(0),0);assert.equal(m.full(0),false);
  near(m.displaced(2),c.V);near(m.reading(2),c.V0+c.V);near(m.level(2),(c.V0+c.V)/c.A);assert.equal(m.full(2),true);
  // While partly in, the box sits s deep below the raised surface: s = level − y, and the level rose by a·s ÷ A.
  let partial=0;for(let t=.02;t<2;t+=.02){const s=m.sunk(t);if(s>0&&s<m.tall()-1e-9){partial++;near(m.level(t)-m.y(t),s);near(m.level(t),m.base()+c.a*s/c.A);}}
  assert.ok(partial>3);
 }
 const a=make(0);assert.equal(a.displaced(.1),0);near(a.y(.5),9.75);near(a.sunk(.5),(12-9.75)*25/9);near(a.sunk(1),12.5);
});
test('the bead sinks through every layer less dense than itself and rests on the first denser one',()=>{
 const m=make(3);near(m.rho(),1.2);near(m.depth(),15);near(m.rest(),5);near(m.y(2),5);near(m.y(0),20);assert.equal(m.displaced(1),0);near(m.reading(1),375);assert.equal(m.full(0),false);assert.equal(m.full(2),true);
 const light=new Density(3);light.config={...light.config,m:9};near(light.rest(),15);
 const heavy=new Density(3);heavy.config={...heavy.config,m:15};near(heavy.rest(),0);
 const between=new Density(3);between.config={...between.config,m:9.6};near(between.rest(),10);
});
test('the run ends exactly at 2 s inside long steps, and nothing moves afterwards',()=>{
 const m=make(1),e=m.advance(100);assert.equal(e.done,true);near(m.t,2);assert.equal(m.status,'done');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(0),b=make(0);a.advance(100);let n=0;while(b.status!=='done'){b.advance(1/120);n++;}near(a.t,b.t,1e-12);assert.equal(n,240);
 near(make(0).y(9),0);near(make(0).y(-1),13);
});
test('answers count within 2%, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,509).evaluate().ok,true);assert.equal(make(0,511).evaluate().ok,false);assert.equal(make(1,16.08).evaluate().ok,true);assert.equal(make(4,2.6).evaluate().ok,true);assert.equal(make(3,4.9).evaluate().ok,true);
 const m=make(2);m.advance(10);assert.equal(m.score(),150);assert.equal(make(2).score(),0);
 const n=make(3,15);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(5);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,200),'riseOnly');assert.equal(slip(0,840),'massAsVolume');assert.equal(slip(0,1458),'inverted');assert.equal(slip(0,1758),'inverted');assert.equal(slip(0,700),null);
 assert.equal(slip(1,60/965),'inverted');assert.equal(slip(1,965/460),'wholeLevel');assert.equal(slip(1,19.3),'gold');
 assert.equal(slip(2,75/2.6),'inverted');assert.equal(slip(2,425*2.6),'wholeLevel');assert.equal(slip(2,75),'volumeAsMass');
 assert.equal(slip(3,15),'floatsTop');assert.equal(slip(3,0),'bottom');assert.equal(slip(3,10),'water');
 assert.equal(slip(4,1000/19.3),'volumeOnly');assert.equal(slip(4,1000*19.3/20),'inverted');assert.equal(slip(4,(200+1000/19.3)/20),'wholeLevel');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,2001])assert.equal(new Density(0).setAnswer(bad),false);
 assert.equal(new Density(3).setAnswer(0),true);assert.equal(new Density(3).setAnswer(15.1),false);assert.equal(new Density(4).setAnswer(0),false);
 const m=new Density(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,19.3);m.advance(.3);const n=new Density();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,19.3);assert.equal(n.index,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Density();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'density-model'),script(source,'density-model'));
 return mount(html,{scripts:['density-model','density-interface'],locale:'density-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('density-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'mL');
  assert.equal(ui.el('given-0').textContent,`m = 540 g · ρ = ${plain(2.7)} g/cm³ · V₀ = 300 mL`);
  assert.equal(ui.el('given-1').textContent,'m = 965 g · V₀ = 400 mL · V₁ = 460 mL');
  assert.equal(ui.el('given-4').textContent,`m = 1 kg · ρ = ${plain(19.3)} g/cm³ · A = 20 cm²`);
  for(const id of ['level-value','displaced-value','density-value','height-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('density-equation').textContent,'ρ = m ÷ V');
  for(const key of ['viewTitle','chartTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('mL'));
 });
 test(`${lang}: the reading appears once the block is lowered, and the aluminium block is right on the first try`,()=>{
  ui.input('answer',500);assert.equal(ui.el('level-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');assert.equal(ui.el('level-value').textContent,fmt(300,1));assert.equal(ui.el('displaced-value').textContent,fmt(0,1));assert.equal(ui.el('density-value').textContent,'—');assert.equal(ui.el('height-value').textContent,fmt(12.35,2));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{level:fmt(300,1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{level:fmt(500,1),dv:fmt(200,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('density-value').textContent,fmt(2.7));
  assert.equal(ui.el('density-equation').textContent,`ρ = m ÷ V = 540 ÷ ${fmt(200,1)} = ${fmt(2.7)} g/cm³`);
  assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.objectLabel)&&ui.painted.includes(l.waterLabel));
 });
 test(`${lang}: assuming the crown is gold is explained, and measuring it is right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'ρ =');assert.equal(ui.el('answer-unit').textContent,'g/cm³');ui.input('answer',19.3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{dv:fmt(60,1),rho:fmt(965/60)})+' '+fill(l.missCopy,{p:plain(19.3)+' g/cm³'})+' '+l.slipGold);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.goldLabel));
  ui.input('answer',16.08);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why1));
 });
 test(`${lang}: the bead in the column, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.ok(ui.painted.includes(l.honeyLabel+' · '+plain(1.42))&&ui.painted.includes(l.oilLabel+' · '+plain(.92))&&ui.painted.includes(l.waterLabel+' · 1'));
  ui.input('answer',15);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipFloatsTop));
  ui.input('answer',5);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('density-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{h:fmt(5)})+' '+l.why3);assert.equal(ui.el('density-value').textContent,fmt(1.2));
 });
 test(`${lang}: the gold bar's rise, and an empty rise keeps the run locked`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'Δh =');ui.input('answer',0);assert.equal(ui.el('play').disabled,true);
  ui.input('answer',2.59);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{dv:fmt(1000/19.3,1),rise:fmt(1000/19.3/20)})+' '+l.why4);
 });
}
test('changing language preserves object, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',75);en.click('play');en.run(()=>en.el('density-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipVolumeAsMass));en.input('answer',195);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'195');assert.equal(es.el('density-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('density-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} density-detective density and multilingual interface checks passed.`);
