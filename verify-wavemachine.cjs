// Wave Machine: wavelength from counting waves, v = f·λ, shaking faster on the same rope, the period at a bead, a bigger
// amplitude that changes nothing, the exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/wavemachine.html'),'utf8'),copy=require('./locales/wavemachine.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'wavemachine-model'),pure);const Wave=pure.WaveMachineModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[1.5,3,.75,.4,3],units=['m','m/s','m','s','m/s'];
const make=(i,a=expected[i])=>{const m=new Wave(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Wave(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});});
test('the waves leave at f, move at v, and sit λ = v ÷ f apart',()=>{
 const m=make(0);near(m.wavelength(),1.5);near(m.period(),.5);near(m.front(1),3);near(m.front(3),6);assert.equal(m.height(4,1),0);
 for(const x of [.2,1.1,2.3,3.9])near(m.height(x,3),m.height(x+1.5,3),1e-9);
 let crossings=0;for(let i=1;i<=6000;i++){const a=m.height((i-1)/1000,3),b=m.height(i/1000,3);if(a<0&&b>=0)crossings++;}assert.equal(crossings,4);
});
test('the bead goes up and down once each period once the waves reach it',()=>{
 const m=make(3);near(m.period(),.4);near(m.wavelength(),2);assert.equal(m.bead(.5),0);
 for(const t of [.7,1.13,1.9,2.4])near(m.bead(t+.4),m.bead(t),1e-9);near(m.bead(.6+.1),.15,1e-9);
});
test('shaking faster on the same rope shortens the waves; a bigger amplitude changes neither speed nor wavelength',()=>{
 const f=make(2);near(f.wavelength(),.75);near(f.wavelength(f.config.f0),1.5);near(f.front(1),3);
 for(const x of [.1,.5,1.2])near(f.height(x,2,true),.15*Math.sin(2*Math.PI*(2*2-x/1.5)));
 const b=make(4);near(b.wavelength(),1.5);near(b.front(1.5),4.5);for(const x of [.3,1.7,2.9])near(b.height(x,2.5),2*b.height(x,2.5,true));
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,1.5],[1,3],[2,.75],[3,.4],[4,6]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,.75);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1.2),'crests');assert.equal(slip(0,24),'timesWaves');assert.equal(slip(0,.667),'wavesPerMetre');assert.equal(slip(0,2),null);
 assert.equal(slip(1,.75),'divided');assert.equal(slip(1,1.333),'inverted');assert.equal(slip(1,5),null);
 assert.equal(slip(2,3),'longer');assert.equal(slip(2,1.5),'same');assert.equal(slip(2,.5),null);
 assert.equal(slip(3,2.5),'frequency');assert.equal(slip(3,10),'multiplied');assert.equal(slip(3,1),null);
 assert.equal(slip(4,6),'doubled');assert.equal(slip(4,1.5),'halved');assert.equal(slip(4,4),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Wave(0).setAnswer(bad),false);assert.equal(new Wave(0).setAnswer(1e4),true);
 const m=new Wave(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,2.5);m.advance(1);const n=new Wave();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Wave(2);assert.equal(k.restore(bad),false);assert.equal(k.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'wavemachine-model'),script(source,'wavemachine-model'));
 return mount(html,{scripts:['wavemachine-model','wavemachine-interface'],locale:'wavemachine-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config;return {L:plain(c.L),l:num(m.wavelength()),v:num(c.v),f:plain(c.f),T:num(m.period())};};
 const ui=open(lang),done=()=>ui.el('wavemachine-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'L = 6 m · n = 4');assert.equal(ui.el('given-1').textContent,`f = 2 Hz · λ = ${plain(1.5)} m`);assert.equal(ui.el('given-2').textContent,`λ = ${plain(1.5)} m · f = 2 → 4 Hz`);
  assert.equal(ui.el('given-3').textContent,'λ = 2 m · v = 5 m/s');assert.equal(ui.el('given-4').textContent,`f = 2 Hz · λ = ${plain(1.5)} m · A ×2`);
  for(const id of ['frequency-value','wavelength-value','speed-value','period-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('wavemachine-equation').textContent,'λ = L ÷ n');
  for(const key of ['viewTitle','beadGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the motor starts, and the wavelength is right on the first try`,()=>{
  ui.input('answer',1.5);assert.equal(ui.el('wavelength-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('frequency-value').textContent,num(2));assert.equal(ui.el('wavelength-value').textContent,num(1.5));assert.equal(ui.el('speed-value').textContent,num(3));assert.equal(ui.el('period-value').textContent,num(.5));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.wavingCopy,{x:num(m.front(t)),y:num(m.bead(t)*100,1)}));
  assert.equal(ui.el('wavemachine-equation').textContent,`λ = L ÷ n = 6 ÷ 4 = ${num(1.5)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: dividing instead of multiplying, then the wave speed`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',.75);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(.75)+' m/s'})+' '+l.slipDivided);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('wavemachine-equation').textContent,`v = f·λ = 2 × ${plain(1.5)} = ${num(3)} m/s`);
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: shaking faster shortens the waves`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'λ₂ =');ui.input('answer',.75);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('wavemachine-equation').textContent,`λ = v ÷ f = 3 ÷ 4 = ${num(.75)} m`);
 });
 test(`${lang}: the frequency instead of the period, then the period`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'T =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',2.5);ui.click('play');ui.run(done);const m=make(3);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:plain(2.5)+' s'})+' '+l.slipFrequency);
  ui.input('answer',.4);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('wavemachine-equation').textContent,`T = λ ÷ v = 2 ÷ 5 = ${num(.4)} s`);
 });
 test(`${lang}: bigger waves, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',3);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('wavemachine-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('wavemachine-equation').textContent,`v = f·λ = 2 × ${plain(1.5)} = ${num(3)} m/s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',2.5);en.click('play');en.run(()=>en.el('wavemachine-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipFrequency));en.input('answer',.4);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.4');assert.equal(es.el('wavemachine-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('wavemachine-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} wave machine and multilingual interface checks passed.`);
