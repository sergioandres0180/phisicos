// Weighed Under Water: Archimedes' principle on a spring scale (F_b = ρ·g·V for the part under the liquid, R = W − F_b),
// the overflow cup catching exactly the volume that goes under, oil, a depth, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/weigh.html'),'utf8'),copy=require('./locales/weigh.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'weigh-model'),pure);const Weigh=pure.WeighModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[11.76,500,2700,6.8,5],units=['N','cm³','kg/m³','N','cm'],metal=10/9.8*1000,block=4/9.8*1000;
const make=(i,a=expected[i])=>{const m=new Weigh(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Weigh(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});});
test('the push is the weight of the liquid under, and the scale reads the weight minus the push',()=>{
 const m=make(0);near(m.weight(),19.6);near(m.length(),8);near(m.reading(.2),19.6);assert.equal(m.under(.2),0);
 near(m.under(1),3.5);near(m.displaced(1),350);near(m.buoyancy(1),3.43);near(m.reading(1),16.17);near(m.reading(2),11.76);near(m.displaced(2),800);
 for(const i of [0,1,2,3,4])for(const t of [.3,.9,1.4,2]){const k=make(i);near(k.buoyancy(t),k.config.rho*9.8*k.config.A*k.under(t)*1e-6);near(k.reading(t)+k.buoyancy(t),k.weight());}
 near(make(1).mass(),3);near(make(1).volume(),500);near(make(2).volume(),metal);near(make(2).density(),2700);
 const oil=make(3);near(oil.volume(),block);near(oil.reading(2),6.8);near(oil.buoyancy(2),3.2);near(oil.weight()-1000*9.8*block*1e-6,6);
});
test('the cylinder stops at your depth, but never deeper than 2 cm past full submersion',()=>{
 const m=make(4);near(m.end(),5);near(m.under(2),5);near(m.reading(2),12.25);near(m.displaced(2),250);
 const deep=make(4,49);near(deep.end(),12);near(deep.under(2),10);near(deep.reading(2),9.8);near(make(0,3).end(),10);
});
test('every run ends exactly after 2 s, even inside long steps',()=>{
 for(const i of [0,2,4]){const p=make(i),q=make(i);const e=p.advance(100);assert.equal(e.done,true);near(p.t,2);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);
  const frozen=JSON.stringify(p.snapshot());assert.equal(p.advance(1),null);assert.equal(JSON.stringify(p.snapshot()),frozen);}
});
test('answers within 2%; a run counts as soon as it starts',()=>{
 assert.equal(make(0,11.9).evaluate().ok,true);assert.equal(make(0,12.1).evaluate().ok,false);assert.equal(make(1,505).evaluate().ok,true);
 assert.equal(make(2,2650).evaluate().ok,true);assert.equal(make(2,2600).evaluate().ok,false);assert.equal(make(4,5.09).evaluate().ok,true);assert.equal(make(4,5.2).evaluate().ok,false);
 const m=make(3);m.advance(10);assert.equal(m.score(),150);assert.equal(make(3).score(),0);
 const n=make(1,4900);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(500);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,18.8),'noG');assert.equal(slip(0,7.84),'buoyancy');assert.equal(slip(0,27.44),'added');assert.equal(slip(0,1.2),'mass');assert.equal(slip(0,3),null);
 assert.equal(slip(1,4900),'noG');assert.equal(slip(1,3000),'whole');assert.equal(slip(1,2500),'whole');assert.equal(slip(1,.0005),'unitsVolume');assert.equal(slip(1,.5),'unitsVolume');
 assert.equal(slip(2,1700),'waterReading');assert.equal(slip(2,370.4),'invertedDensity');assert.equal(slip(2,2.7),'unitsDensity');
 assert.equal(slip(3,6),'sameLiquid');assert.equal(slip(3,5),'invertedOil');assert.equal(slip(3,3.2),'buoyancy');
 assert.equal(slip(4,49),'noG');assert.equal(slip(4,25),'readingAsPush');assert.equal(slip(4,250),'volume');assert.equal(slip(4,.05),'unitsDepth');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Weigh(0).setAnswer(bad),false);assert.equal(new Weigh(1).setAnswer(1e9),true);
 const m=new Weigh(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0);m.advance(1.2);const n=new Weigh();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1.2);assert.equal(n.answer,11.76);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Weigh();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'weigh-model'),script(source,'weigh-model'));
 return mount(html,{scripts:['weigh-model','weigh-interface'],locale:'weigh-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('weigh-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'N');
  assert.equal(ui.el('given-0').textContent,'m = 2 kg · V = 800 cm³');
  assert.equal(ui.el('given-1').textContent,`R_air = ${plain(29.4)} N · R_water = ${plain(24.5)} N`);
  assert.equal(ui.el('given-3').textContent,'R_air = 10 N · R_water = 6 N · ρ_oil = 800 kg/m³');
  assert.equal(ui.el('given-4').textContent,`m = ${plain(1.5)} kg · A = 50 cm² · L = 10 cm · R = ${plain(12.25)} N`);
  for(const id of ['depth-value','reading-value','buoyancy-value','spilled-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('weigh-equation').textContent,'R = W − F_b');
  for(const key of ['viewTitle','forceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('R = ? N'));
 });
 test(`${lang}: the readings appear once the stone goes down, and the scale reading is right on the first try`,()=>{
  ui.input('answer',11.76);assert.equal(ui.el('reading-value').textContent,'—');
  for(let i=0;i<5;i++)ui.click('step');const m=make(0);for(let i=0;i<60;i++)m.advance(1/120);const t=m.t;
  assert.equal(ui.el('depth-value').textContent,fmt(m.under(t),1));assert.equal(ui.el('reading-value').textContent,fmt(m.reading(t)));assert.equal(ui.el('buoyancy-value').textContent,fmt(m.buoyancy(t)));assert.equal(ui.el('spilled-value').textContent,fmt(m.displaced(t),0));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{s:fmt(m.under(t),1),v:fmt(m.displaced(t),0),r:fmt(m.reading(t))}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{v:fmt(800,0),b:fmt(7.84),w:fmt(19.6),r:fmt(11.76)})+' '+l.why0);
  assert.equal(ui.el('weigh-equation').textContent,`R = W − F_b = ${fmt(19.6)} N − ${fmt(7.84)} N = ${fmt(11.76)} N`);
  assert.equal(ui.el('mission-score').textContent,'150');for(const key of ['rightBanner','weightShort','readingShort','spilledShort'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: forgetting g for the volume is explained, then the volume from the loss`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'cm³');ui.input('answer',4900);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,{b:fmt(4.9),v:fmt(500,0)})+' '+fill(l.missCopy,{p:plain(4900)+' cm³'})+' '+l.slipNoG);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.guessTag));
  ui.input('answer',500);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: the density of the metal`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'ρ =');ui.input('answer',2700);assert.ok(ui.painted.includes(l.guessTag+' · ρ = '+plain(2700)+' kg/m³'));ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{b:fmt(10),v:fmt(metal,0),w:fmt(27),d:fmt(2700,0)})+' '+l.why2);
 });
 test(`${lang}: the reading in oil, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',6);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSameLiquid));
  ui.input('answer',6.8);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('weigh-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{v:fmt(block,0),b:fmt(3.2),r:fmt(6.8)})+' '+l.why3);
 });
 test(`${lang}: the depth for a target reading`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'s =');assert.equal(ui.el('answer-unit').textContent,'cm');
  ui.input('answer',5);ui.click('play');ui.run(done);assert.ok(ui.painted.includes(l.targetTag));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{s:fmt(5,1),v:fmt(250,0),b:fmt(2.45),r:fmt(12.25)})+' '+l.why4);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',1700);en.click('play');en.run(()=>en.el('weigh-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWaterReading));en.input('answer',2700);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'2700');assert.equal(es.el('weigh-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('weigh-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} weighed-under-water buoyancy and multilingual interface checks passed.`);
