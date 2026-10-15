// Antenna Workshop: λ = c ÷ f for radio waves. FM and AM wavelengths, a quarter-wave antenna, Wi-Fi in cm, a microwave oven's
// standing wave with hot spots half a wavelength apart, slowed-down display, the exact end of each run, slips, scoring, and
// every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/antenna.html'),'utf8'),copy=require('./locales/antenna.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'antenna-model'),pure);const Antenna=pure.AntennaModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[3,.75,12.5,3e8/2.45e9/2*100,300],units=['m','m','cm','cm','m'];
const make=(i,a=expected[i])=>{const m=new Antenna(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Antenna(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});near(expected[3],6.12245,1e-5);});
test('every wave travels at c, so λ = c ÷ f, shown one wavelength per displayed second',()=>{
 near(new Antenna(0).wavelength(),3);near(new Antenna(2).wavelength(),.125);near(new Antenna(4).wavelength(),300);
 const m=make(0);near(m.front(1),3);near(m.front(2.5),7.5);near(m.field(0,.25),1);assert.equal(m.field(4,1),0);near(m.field(.6,2.2),m.field(3.6,2.2),1e-9);
});
test('the oven builds a standing wave with hot spots half a wavelength apart and still points at the walls',()=>{
 const m=make(3),l=m.wavelength(),spots=m.hotspots(3.5*l);for(let i=1;i<spots.length;i++)near(spots[i]-spots[i-1],l/2);near(spots[0],l/4);
 for(const t of [1,1.3,2.6])near(m.field(0,t),0,1e-9);for(const t of [1,2,3])near(Math.abs(m.field(l/4,t)),1);near(m.field(l/2,2),0,1e-9);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,3],[1,.75],[2,12.5],[3,6.12],[4,300]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,3);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.75);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,3e16),'multiplied');assert.equal(slip(0,3e6),'megahertzAsHz');assert.equal(slip(0,.3333),'inverted');assert.equal(slip(0,3.4e-6),'soundSpeed');assert.equal(slip(0,1),null);
 assert.equal(slip(1,3),'fullWave');assert.equal(slip(1,1.5),'halfWave');assert.equal(slip(1,1),null);
 assert.equal(slip(2,.125),'metres');assert.equal(slip(2,12500),'gigaAsMega');assert.equal(slip(2,125),'unitsMm');assert.equal(slip(2,25),null);
 assert.equal(slip(3,12.24),'fullWavelength');assert.equal(slip(3,3.06),'quarter');assert.equal(slip(3,.0612),'metres');assert.equal(slip(3,10),null);
 assert.equal(slip(4,.3),'kilometres');assert.equal(slip(4,3e5),'megaAsKilo');assert.equal(slip(4,30),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e20*1.01])assert.equal(new Antenna(0).setAnswer(bad),false);assert.equal(new Antenna(0).setAnswer(3e16),true);
 const m=new Antenna(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,20);m.advance(1);const n=new Antenna();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Antenna(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'antenna-model'),script(source,'antenna-model'));
 return mount(html,{scripts:['antenna-model','antenna-interface'],locale:'antenna-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const oven=3e8/2.45e9,values=[{f:'100',l:num(3)},{f:'100',l:plain(3),a:num(.75)},{g:plain(2.4),l:num(12.5,1)},{a:num(oven*50),l:num(oven*100,1)},{f:'1',l:num(300,0),a:num(75,0)}];
 const ui=open(lang),done=()=>ui.el('antenna-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,'f = 100 MHz');assert.equal(ui.el('given-1').textContent,'f = 100 MHz · λ = 3 m');assert.equal(ui.el('given-2').textContent,`f = ${plain(2.4)} GHz`);
  assert.equal(ui.el('given-3').textContent,`f = ${plain(2.45)} GHz`);assert.equal(ui.el('given-4').textContent,'f = 1 MHz');
  for(const id of ['frequency-value','wavelength-value','period-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('antenna-equation').textContent,'λ = c ÷ f');
  for(const key of ['viewTitle','spectrumGraph','amTag','fmTag','microwaveTag','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(fill(l.slowTag,{n:'10⁸'})));
 });
 test(`${lang}: the readings appear once the transmitter starts, and the FM wavelength is right on the first try`,()=>{
  ui.input('answer',3);assert.equal(ui.el('wavelength-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('frequency-value').textContent,'100');assert.equal(ui.el('wavelength-value').textContent,num(3));assert.equal(ui.el('period-value').textContent,num(10,1));assert.equal(ui.el('speed-value').textContent,'3 × 10⁸');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.travellingCopy,{n:num(.1,1),d:num(.3)+' m'}));
  assert.equal(ui.el('antenna-equation').textContent,`λ = c ÷ f = 3 × 10⁸ ÷ 10⁸ = ${num(3)} m`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: a full-wave antenna, then a quarter-wave one`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('antenna-equation').textContent,'L = λ ÷ 4');ui.input('answer',3);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(3)+' m'})+' '+l.slipFullWave);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('antenna-equation').textContent,`L = λ ÷ 4 = 3 ÷ 4 = ${num(.75)} m`);
  ui.input('answer',.75);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
 });
 test(`${lang}: Wi-Fi in centimetres`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',12.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('antenna-equation').textContent,`λ = c ÷ f = 3 × 10⁸ ÷ (${plain(2.4)} × 10⁹) = ${num(12.5,1)} cm`);assert.ok(ui.painted.includes(fill(l.slowTag,{n:plain(2.4)+' × 10⁹'})));
 });
 test(`${lang}: the oven's whole wavelength, then the hot spots`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'d =');ui.input('answer',12.24);ui.click('step');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.standingCopy,{n:num(.1,1),d:''}));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(12.24)+' cm'})+' '+l.slipFullWavelength);
  ui.input('answer',6.12);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('antenna-equation').textContent,`d = c ÷ (2·f) = 3 × 10⁸ ÷ (2 × ${plain(2.45)} × 10⁹) = ${num(oven*50)} cm`);
 });
 test(`${lang}: AM radio, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');ui.input('answer',300);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('antenna-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('antenna-equation').textContent,`λ = c ÷ f = 3 × 10⁸ ÷ 10⁶ = ${num(300,0)} m`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',3);en.click('play');en.run(()=>en.el('antenna-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipFullWave));en.input('answer',.75);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.75');assert.equal(es.el('antenna-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('antenna-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} antenna wavelength and multilingual interface checks passed.`);
