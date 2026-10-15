// Ripple Tank Ruler: measuring wavelength. n crests span n − 1 gaps, a half-size photo, v = f·λ, ripples bunching up over a
// shallow end with the same frequency, the time to cross the tank, the exact end of each run, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/rippletank.html'),'utf8'),copy=require('./locales/rippletank.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'rippletank-model'),pure);const Tank=pure.RippleTankModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[5,5,40,3,1.5],units=['cm','cm','cm/s','cm','s'];
const make=(i,a=expected[i])=>{const m=new Tank(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Tank(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),2.5);});});
test('crests leave 8 times a second and sit λ = v ÷ f apart; 10 crests span 9 gaps',()=>{
 const m=make(0),xs=m.crests(2.5);near(m.wavelength(),5);for(let i=1;i<xs.length;i++)near(xs[i]-xs[i-1],5);near(xs[9]-xs[0],45);
 near(m.front(1),40);near(m.front(2.5),60);assert.equal(m.height(50,1),0);for(const x of [3,17,29])near(m.height(x,2.1),m.height(x,2.1+1/8),1e-9);
 const p=make(1);near(p.config.photo/p.config.scale,p.wavelength());
});
test('over the shallow end the ripples slow down and bunch up; the frequency stays the same',()=>{
 const m=make(3);near(m.wavelength(10),5);near(m.wavelength(40),3);near(m.delay(60),.75+30/24);near(m.front(1),30+.25*24);near(m.front(2.5),60);
 const xs=m.crests(2.5).filter(x=>x>31);for(let i=1;i<xs.length;i++)near(xs[i]-xs[i-1],3);
 for(const x of [12,45,58])near(m.height(x,2.2),m.height(x,2.2+1/8),1e-9);
});
test('the first ripple crosses the tank in L ÷ v',()=>{const m=make(4);near(m.delay(60),1.5);near(m.front(1.5),60);});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,5],[1,5],[2,40],[3,3],[4,1.5]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,2.5);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,2.5);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(5);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,4.5),'dividedByCount');assert.equal(slip(0,4.091),'extraGap');assert.equal(slip(0,.2222),'countPerCm');assert.equal(slip(0,6),null);
 assert.equal(slip(1,2.5),'photoValue');assert.equal(slip(1,1.25),'wrongWay');assert.equal(slip(1,10),null);
 assert.equal(slip(2,.625),'divided');assert.equal(slip(2,1.6),'inverted');assert.equal(slip(2,.4),'metresPerSecond');assert.equal(slip(2,30),null);
 assert.equal(slip(3,5),'sameWavelength');assert.equal(slip(3,8.333),'longer');assert.equal(slip(3,192),'multiplied');assert.equal(slip(3,4),null);
 assert.equal(slip(4,12),'countWaves');assert.equal(slip(4,7.5),'usedFrequency');assert.equal(slip(4,.125),'period');assert.equal(slip(4,2),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Tank(0).setAnswer(bad),false);assert.equal(new Tank(0).setAnswer(1e4),true);assert.equal(new Tank(2).setAnswer(1e5),true);
 const m=new Tank(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,4);m.advance(1);const n=new Tank();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,3);assert.equal(n.attempts,1);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tank(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'rippletank-model'),script(source,'rippletank-model'));
 return mount(html,{scripts:['rippletank-model','rippletank-interface'],locale:'rippletank-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=m=>{const c=m.config,x=c.v2?c.edge+1:0;return {l:num(m.wavelength(x),1),v:plain(m.speedAt(x)),t:num(60/c.v)};};
 const ui=open(lang),done=()=>ui.el('rippletank-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'λ =');assert.equal(ui.el('answer-unit').textContent,'cm');
  assert.equal(ui.el('given-0').textContent,'n = 10 · d = 45 cm');assert.equal(ui.el('given-1').textContent,`λ_photo = ${plain(2.5)} cm · ×½`);assert.equal(ui.el('given-2').textContent,'f = 8 Hz · λ = 5 cm');
  assert.equal(ui.el('given-3').textContent,'f = 8 Hz · v: 40 → 24 cm/s');assert.equal(ui.el('given-4').textContent,'L = 60 cm · f = 8 Hz · λ = 5 cm');
  for(const id of ['frequency-value','wavelength-value','speed-value','front-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('rippletank-equation').textContent,'λ = d ÷ (n − 1)');
  for(const key of ['viewTitle','profileGraph','panelHint','scaleNote'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes(plain(60)+' cm'));
 });
 test(`${lang}: the readings appear once the bar starts, and the spacing is right on the first try`,()=>{
  ui.input('answer',5);assert.equal(ui.el('front-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('frequency-value').textContent,'8');assert.equal(ui.el('wavelength-value').textContent,num(5,1));assert.equal(ui.el('speed-value').textContent,'40');assert.equal(ui.el('front-value').textContent,num(4,1));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.rippleCopy,{x:num(4,1),l:num(5,1)}));
  assert.equal(ui.el('rippletank-equation').textContent,`λ = d ÷ (n − 1) = 45 ÷ 9 = ${num(5,1)} cm`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(make(0)))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(fill(l.countTag,{n:'10',d:'45'})));
 });
 test(`${lang}: the photo's spacing, then the real one`,()=>{
  ui.click('mission-1');assert.ok(ui.painted.includes(l.photoTag));ui.input('answer',2.5);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(2.5)+' cm'})+' '+l.slipPhotoValue);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('rippletank-equation').textContent,`λ = λ_photo ÷ ½ = ${plain(2.5)} × 2 = ${num(5,1)} cm`);
  ui.input('answer',5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: the ripples' speed`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'cm/s');assert.equal(ui.el('rippletank-equation').textContent,'v = f·λ');ui.input('answer',40);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('rippletank-equation').textContent,`v = f·λ = 8 × 5 = ${num(40,1)} cm/s`);
 });
 test(`${lang}: the same wavelength over the shallow end, then the shorter one`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'λ₂ =');assert.ok(ui.painted.includes(l.shallowTag));ui.input('answer',5);ui.click('play');ui.run(done);const m=make(3);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:plain(5)+' cm'})+' '+l.slipSameWavelength);
  assert.equal(ui.el('wavelength-value').textContent,num(3,1));assert.equal(ui.el('speed-value').textContent,'24');
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('rippletank-equation').textContent,`λ₂ = v₂ ÷ f = 24 ÷ 8 = ${num(3,1)} cm`);
 });
 test(`${lang}: across the tank, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',1.5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('rippletank-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('rippletank-equation').textContent,`t = L ÷ (f·λ) = 60 ÷ (8 × 5) = ${num(1.5)} s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',2.5);en.click('play');en.run(()=>en.el('rippletank-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipPhotoValue));en.input('answer',5);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'5');assert.equal(es.el('rippletank-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('rippletank-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} ripple tank wavelength and multilingual interface checks passed.`);
