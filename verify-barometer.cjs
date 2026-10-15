// Torricelli's Tube: a liquid column held up by the air (ρ·g·h = p), mercury and water barometers, the air on a mountain,
// a suction pump's limit, a liquid's density, exact run ends, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/barometer.html'),'utf8'),copy=require('./locales/barometer.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'barometer-model'),pure);const Baro=pure.BarometerModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const hg=101300/(13600*9.8),water=101300/9800,mountain=13600*9.8*.6/1000,pump=80000/9800,gly=101300/(9.8*8.2);
const expected=[hg*1000,water,mountain,pump,gly],units=['mm','m','kPa','m','kg/m³'];
const make=(i,a=expected[i])=>{const m=new Baro(i);assert.ok(m.setAnswer(a));return m;};

test('each tube has the expected answer and unit',()=>{expected.forEach((v,i)=>{const m=new Baro(i);near(m.exact(),v);assert.equal(m.unit(),units[i]);});near(new Baro(0).exact(),760.05,1e-4);});
test('the column falls steadily from the full tube to where ρ·g·h equals the air pressure',()=>{
 for(const i of [0,1,2,4]){const m=make(i),c=m.config;near(m.column(0),c.L);near(m.column(2),m.height());near(m.column(1),(c.L+m.height())/2);near(m.columnPressure(m.height()),m.pressure());near(m.column(9),m.height());}
 near(make(2).pressure(),mountain);near(make(4).density(),gly);near(make(4).height(),8.2);near(make(1).height(),water);
});
test('the pump lifts water only as high as the air can push it, and the water reaches it exactly',()=>{
 const a=make(3,8);assert.equal(a.lifts(),true);near(a.rise(1),pump/2);near(a.rise(2),8);near(a.rise(1.99),8);
 const b=make(3,9);assert.equal(b.lifts(),false);near(b.rise(2),pump);near(b.rise(1),pump/2);
 const c=make(3,pump*(1+4e-4));assert.equal(c.lifts(),true);near(c.rise(2),pump*(1+4e-4));assert.equal(make(3,pump*1.001).lifts(),false);
});
test('the run ends exactly at 2 s inside long steps, and nothing moves afterwards',()=>{
 const m=make(0),e=m.advance(100);assert.equal(e.done,true);near(m.t,2);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(1),b=make(1);a.advance(100);let n=0;while(b.status!=='done'){b.advance(1/120);n++;}near(a.t,b.t,1e-12);assert.equal(n,240);
});
test('answers count within 2%, a pump height with at most 2% to spare, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,760).evaluate().ok,true);assert.equal(make(0,780).evaluate().ok,false);assert.equal(make(2,80).evaluate().ok,true);assert.equal(make(4,1261).evaluate().ok,true);
 assert.equal(make(3,8).evaluate().ok,true);assert.equal(make(3,7.9).evaluate().ok,false);assert.equal(make(3,8.2).evaluate().ok,false);
 const m=make(1);m.advance(10);assert.equal(m.score(),150);assert.equal(make(1).score(),0);
 const n=make(3,10);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(8.1);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,water*1000),'water');assert.equal(slip(0,hg),'meters');assert.equal(slip(0,101300/13600*1000),'noG');assert.equal(slip(0,500),null);
 assert.equal(slip(1,hg),'mercury');assert.equal(slip(1,water*1000),'millimetres');assert.equal(slip(1,101.3),'noG');
 assert.equal(slip(2,101.3),'sea');assert.equal(slip(2,8.16),'noG');assert.equal(slip(2,mountain*1000),'mm');
 assert.equal(slip(3,water),'seaPump');assert.equal(slip(3,7),'spare');assert.equal(slip(3,12),null);
 assert.equal(slip(4,101300/8.2),'noG');assert.equal(slip(4,1000),'waterDensity');
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1001])assert.equal(new Baro(3).setAnswer(bad),false);assert.equal(new Baro(0).setAnswer(1e5),true);assert.equal(new Baro(2).setAnswer(1e6+1),false);
 const m=new Baro(3);assert.equal(m.depth(),0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,10);m.advance(.3);const n=new Baro();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.3);assert.equal(n.answer,10);assert.equal(n.index,3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Baro();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'barometer-model'),script(source,'barometer-model'));
 return mount(html,{scripts:['barometer-model','barometer-interface'],locale:'barometer-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('barometer-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'h =');assert.equal(ui.el('answer-unit').textContent,'mm');
  assert.equal(ui.el('given-0').textContent,`ρ = 13600 kg/m³ · p = ${plain(101.3)} kPa · L = 1 m`);
  assert.equal(ui.el('given-2').textContent,'ρ = 13600 kg/m³ · h = 600 mm · L = 1 m');
  assert.equal(ui.el('given-3').textContent,`ρ = 1000 kg/m³ · p = 80 kPa · g = ${plain(9.8)} m/s²`);
  assert.equal(ui.el('given-4').textContent,`p = ${plain(101.3)} kPa · h = ${plain(8.2)} m · L = 10 m`);
  for(const id of ['height-value','column-value','gap-value','air-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('barometer-equation').textContent,'p = ρ·g·h');
  for(const key of ['viewTitle','balanceTitle','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
  assert.ok(ui.painted.includes(l.airLabel+' · p = '+plain(101.3)+' kPa')&&ui.painted.includes(plain(200)+' mm'));
 });
 test(`${lang}: the column appears once the tube turns over, and the mercury barometer is right on the first try`,()=>{
  ui.input('answer',760);assert.equal(ui.el('height-value').textContent,'—');assert.ok(ui.painted.includes(l.guessTag));
  ui.click('step');const m=make(0,760),t=12/120,col=m.column(t),pc=m.columnPressure(col);
  assert.equal(ui.el('height-value').textContent,fmt(col,3));assert.equal(ui.el('column-value').textContent,fmt(pc,1));assert.equal(ui.el('gap-value').textContent,fmt(1-col,3));assert.equal(ui.el('air-value').textContent,fmt(101.3,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{h:fmt(col,3),pc:fmt(pc,1)}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,{hmm:fmt(hg*1000,0),gap:fmt(1-hg,3),p:fmt(101.3,1)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.vacuumLabel)&&ui.painted.includes(l.airShort)&&ui.painted.includes(l.columnShort));
 });
 test(`${lang}: sea-level air on a mountain is explained, and the mountain pressure is right`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'p =');assert.equal(ui.el('answer-unit').textContent,'kPa');ui.input('answer',101.3);
  assert.ok(ui.painted.includes(l.airLabel+' · p = ? kPa'));ui.click('step');assert.equal(ui.el('air-value').textContent,'—');
  ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,{p:fmt(mountain,1)})+' '+fill(l.missCopy,{p:plain(101.3)+' kPa'})+' '+l.slipSea);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('air-value').textContent,fmt(mountain,1));
  ui.input('answer',80);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why2));
 });
 test(`${lang}: the suction pump, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'h_max =');ui.input('answer',10.34);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.stuckCopy,{max:fmt(pump),short:fmt(10.34-pump)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSeaPump));
  assert.ok(ui.painted.includes(l.offBanner+' · '+l.stuckBanner)&&ui.painted.includes(l.pumpLabel));
  ui.input('answer',8.1);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('barometer-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,{hm:fmt(8.1,3),max:fmt(pump)})+' '+l.why3);assert.ok(ui.painted.includes(l.rightBanner+' · '+l.liftedBanner));
 });
 test(`${lang}: the mystery liquid's density`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'ρ =');ui.input('answer',1261);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,{hm:fmt(8.2,3),p:fmt(101.3,1),rho:fmt(gly,0)})+' '+l.why4);
 });
}
test('changing language preserves tube, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',.76);en.click('play');en.run(()=>en.el('barometer-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipMercury));en.input('answer',10.34);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'10.34');assert.equal(es.el('barometer-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('barometer-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} torricelli's-tube air-pressure and multilingual interface checks passed.`);
