// Pebble Ripples: amplitude and energy of a spreading wave. The ring's height falls as 1 ÷ √r because its energy is shared
// around 2π·r, a straight wave keeps its height, 4 times the energy gives twice the height, the exact end of each run, slips,
// scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/ripples.html'),'utf8'),copy=require('./locales/ripples.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'ripples-model'),pure);const Ripples=pure.RipplesModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[1,3,4.5,2,2],units=['cm','','m','cm','cm'];
const make=(i,a=expected[i])=>{const m=new Ripples(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer, unit, and length',()=>{expected.forEach((x,i)=>{const m=new Ripples(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});[4.4,3.4,4.8,2.4,4.4].forEach((d,i)=>near(new Ripples(i).duration(),d));});
test('the ring keeps its energy: height falls as 1 ÷ √r and A²·2π·r stays the same',()=>{
 const m=make(0);near(m.amp(1),.02);near(m.amp(4),.01);near(m.amp(.25),.04);
 for(const r of [.5,1.3,2.7,4.4])near(m.amp(r)**2*2*Math.PI*r,.02**2*2*Math.PI);
 near(m.front(0),.2);near(m.front(1.8),2);near(m.length(1.8),4*Math.PI);
 near(m.height(2,1.8),m.amp(2));assert.equal(m.height(2.5,1.8),0);assert.equal(m.height(1.5,1.8),0);
 let peak=0;for(let t=0;t<=m.duration();t+=.001)peak=Math.max(peak,m.height(4,t));near(peak,.01,1e-3);
});
test('energy per metre falls as 1 ÷ r; a third of the height is nine times as far',()=>{
 const e=make(1);near((e.amp(1)/e.amp(3))**2,3);const w=make(2);near(w.amp(.5),.03);near(w.amp(4.5),.01);
});
test('four times the energy is twice the height; a straight wave keeps its height',()=>{
 const b=make(3);near(b.amp(2),.02);near(b.amp(2,true),.01);near(b.height(2,1.8)/b.height(2,1.8,true),2);
 const p=make(4);for(const x of [.3,1,2.5,4.4])near(p.amp(x),.02);near(p.length(2),3);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,1],[1,3],[2,4.5],[2,1.5],[3,2],[4,2]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,9);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.5),'inverse');assert.equal(slip(0,.125),'inverseSquare');assert.equal(slip(0,2),'same');assert.equal(slip(0,4),'grows');assert.equal(slip(0,8),'times');assert.equal(slip(0,1.5),null);
 assert.equal(slip(1,9),'squared');assert.equal(slip(1,1.732),'amplitudeRatio');assert.equal(slip(1,1),'noChange');assert.equal(slip(1,6),null);
 assert.equal(slip(2,1.5),'linear');assert.equal(slip(2,.866),'root');assert.equal(slip(2,.0556),'inverted');assert.equal(slip(2,3),null);
 assert.equal(slip(3,4),'energyLinear');assert.equal(slip(3,1),'unchanged');assert.equal(slip(3,16),'energySquared');assert.equal(slip(3,3),null);
 assert.equal(slip(4,1),'circle');assert.equal(slip(4,.5),'plankInverse');assert.equal(slip(4,4),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Ripples(0).setAnswer(bad),false);assert.equal(new Ripples(0).setAnswer(1e4),true);
 const m=new Ripples(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,3);m.advance(1);const n=new Ripples();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Ripples(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'ripples-model'),script(source,'ripples-model'));
 return mount(html,{scripts:['ripples-model','ripples-interface'],locale:'ripples-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const cm=m=>num(m*100,1);
 const values=m=>{const c=m.config;return {a:cm(m.amp(c.r1,true)),b:cm(m.amp(c.r2)),r:plain(c.r2)};};
 const ui=open(lang),done=()=>ui.el('ripples-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'A =');assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.equal(ui.el('given-0').textContent,'A₁ = 2 cm · r: 1 → 4 m');assert.equal(ui.el('given-1').textContent,'r: 1 → 3 m');assert.equal(ui.el('given-2').textContent,`A: 3 → 1 cm · r₁ = ${plain(.5)} m`);
  assert.equal(ui.el('given-3').textContent,'A₁ = 1 cm · r = 2 m · E ×4');assert.equal(ui.el('given-4').textContent,'A₁ = 2 cm · x: 1 → 4 m');
  for(const id of ['radius-value','height-value','length-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('ripples-equation').textContent,'A ∝ 1 ÷ √r');
  for(const key of ['viewTitle','heightGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('r = 4 m'));
 });
 test(`${lang}: the readings appear once the pebble drops, and the far height is right on the first try`,()=>{
  ui.input('answer',1);assert.equal(ui.el('radius-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120,r=m.front(t);
  assert.equal(ui.el('radius-value').textContent,num(r));assert.equal(ui.el('height-value').textContent,cm(m.amp(r)));assert.equal(ui.el('length-value').textContent,num(2*Math.PI*r));assert.equal(ui.el('speed-value').textContent,num(1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.spreadingCopy,{r:num(r),a:cm(m.amp(r)),l:num(2*Math.PI*r)}));
  assert.equal(ui.el('ripples-equation').textContent,`A₂ = A₁·√(r₁ ÷ r₂) = 2 × √(1 ÷ 4) = ${num(1,1)} cm`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(l.distanceAxis));
 });
 test(`${lang}: squaring the distance, then the energy per metre`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'E₁ ÷ E₂ =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',9);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(9)})+' '+l.slipSquared);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('ripples-equation').textContent,`E₁ ÷ E₂ = r₂ ÷ r₁ = 3 ÷ 1 = ${num(3)}`);
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: where the ripple is 1 cm high`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'r =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',4.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('ripples-equation').textContent,`r₂ = r₁·(A₁ ÷ A₂)² = ${plain(.5)} × (3 ÷ 1)² = ${num(4.5)} m`);
 });
 test(`${lang}: energy taken as height, then the bigger pebble`,()=>{
  ui.click('mission-3');ui.input('answer',4);ui.click('play');ui.run(done);const m=make(3);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:plain(4)+' cm'})+' '+l.slipEnergyLinear);
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('ripples-equation').textContent,`A = A₁·√(E ÷ E₁) = 1 × √4 = ${num(2,1)} cm`);
 });
 test(`${lang}: the straight wave, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',2);ui.click('step');const m=make(4),t=12/120;
  assert.equal(ui.el('lesson-copy').textContent,fill(l.straightCopy,{r:num(m.front(t)),a:cm(.02),l:num(3)}));assert.equal(ui.el('length-value').textContent,num(3));
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('ripples-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(m))+' '+l.why4);
  assert.equal(ui.el('ripples-equation').textContent,`A₂ = A₁ = ${num(2,1)} cm`);assert.ok(ui.painted.includes('x = 4 m'));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',9);en.click('play');en.run(()=>en.el('ripples-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipSquared));en.input('answer',3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3');assert.equal(es.el('ripples-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('ripples-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} pebble ripples amplitude and multilingual interface checks passed.`);
