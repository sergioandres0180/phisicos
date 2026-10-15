// Laser Slit: diffraction of light by a single slit. Dark bands at y = n·λ·L ÷ a, the central band 2·λ·L ÷ a wide, a slit's
// width and a laser's wavelength from a dark band, the brightness pattern (sin β ÷ β)², the light meter's sweep, the exact
// end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/slit.html'),'utf8'),copy=require('./locales/slit.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'slit-model'),pure);const Slit=pure.SlitModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[13,7.98,.065,450,15.6],units=['mm','mm','mm','nm','mm'];
const make=(i,a=expected[i])=>{const m=new Slit(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Slit(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),4);near(m.duration()/m.config.pace,4);});
 near(new Slit(0).dark(),13);near(new Slit(1).dark(),3.99);near(new Slit(2).dark(),20);near(new Slit(3).dark(),9);near(new Slit(4).dark(),7.8);
});
test('dark bands are evenly spaced at n·λ·L ÷ a; the meter sweeps out after the light arrives',()=>{
 for(let i=0;i<5;i++){const m=new Slit(i),y=m.dark();near(m.brightness(0),1);for(const n of [1,2,3])near(m.brightness(n*y),0,1e-12);near(m.brightness(-y),0,1e-12);assert.ok(m.brightness(1.43*y)>.04&&m.brightness(1.43*y)<.05);assert.ok(m.brightness(y/2)>.4);}
 const m=new Slit(0);near(m.front(.4).laser,.5);near(m.front(.8).laser,1);near(m.front(.8).spread,0);near(m.front(1.4).spread,.5);near(m.front(2).spread,1);
 near(m.meter(2),0);near(m.meter(3),19.5);near(m.meter(4),39);near(m.meter(9),39);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,4);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,3.99);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(7.98);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,26),'widthInstead');assert.equal(slip(0,6.5),'halfDark');assert.equal(slip(0,.013),'metres');assert.equal(slip(0,10),null);
 assert.equal(slip(1,3.99),'halfWidth');assert.equal(slip(1,15.96),'twiceWidth');assert.equal(slip(1,.00798),'metresWidth');assert.equal(slip(1,6),null);
 assert.equal(slip(2,.13),'widthReading');assert.equal(slip(2,20/1.3),'invertedSlit');assert.equal(slip(2,.000065),'metresSlit');assert.equal(slip(2,.1),null);
 assert.equal(slip(3,225),'secondDark');assert.equal(slip(3,900),'doubled');assert.equal(slip(3,.45),'micrometres');assert.equal(slip(3,600),null);
 assert.equal(slip(4,7.8),'firstOnly');assert.equal(slip(4,11.7),'brightFringe');assert.equal(slip(4,31.2),'squared');assert.equal(slip(4,20),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e6+1])assert.equal(new Slit(0).setAnswer(bad),false);assert.equal(new Slit(0).setAnswer(1e6),true);assert.equal(new Slit(2).setAnswer(1e-6),true);
 const m=new Slit(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,500);m.advance(1);const k=new Slit();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,500);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:5},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Slit(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'slit-model'),script(source,'slit-model'));
 return mount(html,{scripts:['slit-model','slit-interface'],locale:'slit-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Slit(i),a=m.config.ask;return {e:num(m.exact(),a==='a'?3:a==='lambda'?0:a==='w'?2:1)};};
 const ui=open(lang),done=()=>ui.el('slit-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'y =');assert.equal(ui.el('answer-unit').textContent,'mm');
  assert.equal(ui.el('given-0').textContent,`650 nm · a = ${plain(.1)} mm · L = 2 m`);assert.equal(ui.el('given-1').textContent,`532 nm · a = ${plain(.2)} mm · L = ${plain(1.5)} m`);assert.equal(ui.el('given-2').textContent,'650 nm · L = 2 m · y = 20 mm');
  assert.equal(ui.el('given-3').textContent,`a = ${plain(.15)} mm · L = 3 m · y = 9 mm`);assert.equal(ui.el('given-4').textContent,`650 nm · a = ${plain(.2)} mm · L = ${plain(2.4)} m`);
  for(const id of ['lambda-value','slit-value','dist-value','meter-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('slit-equation').textContent,'y = λ·L ÷ a');
  for(const key of ['viewTitle','brightGraph','panelHint','scaleNote','laserTag','slitTag','screenTag','scaleTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('L = 2 m')&&ui.painted.includes(`a = ${plain(.1)} mm`));
 });
 test(`${lang}: the readings appear once the laser is on, and the first dark band is right on the first try`,()=>{
  ui.input('answer',13);assert.equal(ui.el('lambda-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('lambda-value').textContent,num(650,0));assert.equal(ui.el('slit-value').textContent,num(.1,3));assert.equal(ui.el('dist-value').textContent,num(2,1));assert.equal(ui.el('meter-value').textContent,num(0,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.slitCopy,{y:num(0,1),p:num(100,0)}));
  assert.equal(ui.el('slit-equation').textContent,`y = 650 nm × 2 m ÷ ${plain(.1)} mm = ${num(13,1)} mm`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.distAxis));assert.equal(ui.el('meter-value').textContent,num(39,1));
 });
 test(`${lang}: the central band's width, half of it first, then 2·λ·L ÷ a`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'w =');assert.equal(ui.el('slit-equation').textContent,'w = 2·λ·L ÷ a');ui.input('answer',3.99);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(3.99)+' mm'})+' '+l.slipHalfWidth);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('slit-equation').textContent,`w = 2·λL ÷ a = 2 × ${num(3.99)} = ${num(7.98)} mm`);
  ui.input('answer',7.98);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: the slit's width stays hidden until the run ends; the full width first, then a = λ·L ÷ y`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'a =');assert.ok(ui.painted.includes('a = ?'));ui.input('answer',.13);
  ui.click('step');assert.equal(ui.el('slit-value').textContent,'?');assert.equal(ui.el('lambda-value').textContent,num(650,0));
  ui.click('play');ui.run(done);assert.equal(ui.el('slit-value').textContent,num(.065,3));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(.13)+' mm'})+' '+l.slipWidthReading);
  assert.equal(ui.el('slit-equation').textContent,`a = 650 nm × 2 m ÷ 20 mm = ${num(.065,3)} mm`);
  ui.input('answer',.065);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
 });
 test(`${lang}: the mystery laser's wavelength`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'nm');ui.input('answer',450);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('slit-equation').textContent,`λ = ${plain(.15)} mm × 9 mm ÷ 3 m = ${num(450,0)} nm`);assert.equal(ui.el('lambda-value').textContent,num(450,0));
 });
 test(`${lang}: the second dark band, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'y₂ =');assert.equal(ui.el('slit-equation').textContent,'y_n = n·λ·L ÷ a');ui.input('answer',15.6);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('slit-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('slit-equation').textContent,`y₂ = 2·λL ÷ a = 2 × ${num(7.8,1)} = ${num(15.6,1)} mm`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',.13);en.click('play');en.run(()=>en.el('slit-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipWidthReading));en.input('answer',.065);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.065');assert.equal(es.el('slit-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('slit-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} laser slit diffraction and multilingual interface checks passed.`);
