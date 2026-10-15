// Spearfishing: refraction of light. A fish's real depth d = n·d_seen, a laser's angle in water from Snell's law, how far
// below its image to aim, a liquid's index from two angles, the critical angle sin θ_c = 1 ÷ n with the sweeping lamp, the
// exact end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/spear.html'),'utf8'),copy=require('./locales/spear.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'spear-model'),pure);const Spear=pure.SpearModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const d=Math.PI/180,n=1.33,expected=[1.33,Math.asin(Math.sin(45*d)/n)/d,.33*.9,Math.sin(60*d)/Math.sin(35*d),Math.asin(1/n)/d],units=['m','°','m','','°'];
const make=(i,a=expected[i])=>{const m=new Spear(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s of real time',()=>{
 expected.forEach((x,i)=>{const m=new Spear(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);near(m.duration(),3);near(m.duration()/m.config.pace,4);});
});
test('the ray obeys Snell\'s law, and light past the critical angle cannot leave the water',()=>{
 for(let i=0;i<4;i++){const m=make(i),a=m.airAngle(0),w=m.waterAngle(0);near(Math.sin(a*d),m.config.n*Math.sin(w*d));}
 near(make(1).airAngle(0),45);near(make(3).waterAngle(0),35);near(make(0).realDepth(),1.33);near(make(2).realDepth(),1.197);
 const c=make(4),tc=c.criticalAngle()/80*3;near(c.waterAngle(1.5),40);assert.ok(c.airAngle(tc-.01)!==null);assert.equal(c.airAngle(tc+.01),null);near(c.waterAngle(3),80);near(c.progress(1.5),.5);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e4);assert.equal(r.done,true);near(r.t,3);while(q.status!=='done')q.advance(q.config.pace/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(1e4);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e4);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const k=make(1,45/n);k.advance(.01);assert.equal(k.attempts,1);k.setAnswer(32.1);k.advance(1e4);assert.equal(k.score(),100);assert.equal(k.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1/n),'inverted');assert.equal(slip(0,1),'unchanged');assert.equal(slip(0,2),null);
 assert.equal(slip(1,45/n),'linearAngle');assert.equal(slip(1,Math.asin(Math.sin(45*d)*n)/d),'invertedAngle');assert.equal(slip(1,45),'unchangedAngle');assert.equal(slip(1,40),null);
 assert.equal(slip(2,1.197),'realDepth');assert.equal(slip(2,.9-.9/n),'invertedGap');assert.equal(slip(2,.9),'apparentOnly');assert.equal(slip(2,.5),null);
 assert.equal(slip(3,60/35),'linearN');assert.equal(slip(3,1/expected[3]),'invertedN');assert.equal(slip(3,2),null);
 assert.equal(slip(4,90-expected[4]),'complementCritical');assert.equal(slip(4,1/n),'sineOnly');assert.equal(slip(4,60),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,91])assert.equal(new Spear(1).setAnswer(bad),false);assert.equal(new Spear(1).setAnswer(90),true);assert.equal(new Spear(3).setAnswer(10.1),false);assert.equal(new Spear(0).setAnswer(100),true);
 const m=new Spear(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,1.7);m.advance(1);const k=new Spear();assert.equal(k.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(k.index,3);assert.equal(k.attempts,1);near(k.t,1);assert.equal(k.answer,1.7);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:4},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Spear(1);assert.equal(q.restore(bad),false);assert.equal(q.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'spear-model'),script(source,'spear-model'));
 return mount(html,{scripts:['spear-model','spear-interface'],locale:'spear-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=x=>x.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(x,dd=2)=>Math.abs(x)<.5*10**-dd?(0).toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd}):x.toLocaleString(lang,{minimumFractionDigits:dd,maximumFractionDigits:dd,useGrouping:false});
 const values=i=>{const m=new Spear(i),c=m.config;return {d:num(m.realDepth()),w:num(m.waterAngle(0),1),g:num((c.n-1)*(c.seen||0)),n:num(c.n),c:num(m.criticalAngle(),1)};};
 const ui=open(lang),done=()=>ui.el('spear-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'d =');assert.equal(ui.el('answer-unit').textContent,'m');
  assert.equal(ui.el('given-0').textContent,`d_seen = 1 m · n = ${plain(1.33)}`);assert.equal(ui.el('given-1').textContent,`θ₁ = 45° · n = ${plain(1.33)}`);assert.equal(ui.el('given-2').textContent,`d_seen = ${plain(.9)} m · n = ${plain(1.33)}`);
  assert.equal(ui.el('given-3').textContent,'60° → 35°');assert.equal(ui.el('given-4').textContent,`n = ${plain(1.33)}`);
  for(const id of ['index-value','air-value','water-value','light-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('spear-equation').textContent,'n = d ÷ d_seen');
  for(const key of ['viewTitle','angleGraph','panelHint','scaleNote','airTag','waterTag','fishTag','eyeTag'])assert.ok(ui.painted.includes(l[key]),key);assert.ok(ui.painted.includes('1 m'));
 });
 test(`${lang}: the readings appear once the light is traced, and the real depth is right on the first try`,()=>{
  ui.input('answer',1.33);assert.equal(ui.el('index-value').textContent,'—');
  ui.click('step');
  const m=new Spear(0);
  assert.equal(ui.el('index-value').textContent,num(1.33));assert.equal(ui.el('air-value').textContent,num(m.airAngle(0),1));assert.equal(ui.el('water-value').textContent,num(15,1));assert.equal(ui.el('light-value').textContent,num(3/1.33));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.rayCopy,{w:num(15,1)}));
  assert.equal(ui.el('spear-equation').textContent,`d = n·d_seen = ${plain(1.33)} × 1 = ${num(1.33)} m`);assert.ok(ui.painted.includes(fill(l.paceTag,{n:plain(.75)})));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.imageTag));
 });
 test(`${lang}: a laser into water, the angle divided first, then by Snell's law`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'θ₂ =');assert.equal(ui.el('answer-unit').textContent,'°');assert.equal(ui.el('spear-equation').textContent,'n₁·sin θ₁ = n₂·sin θ₂');ui.input('answer',33.83);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(33.83)+' °'})+' '+l.slipLinearAngle);assert.ok(ui.painted.includes(l.offBanner)&&ui.painted.includes(l.laserTag));
  assert.equal(ui.el('spear-equation').textContent,`sin θ₂ = sin 45° ÷ ${plain(1.33)} → θ₂ = ${num(expected[1],1)}°`);
  ui.input('answer',32.1);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: where to aim below the image`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'Δd =');assert.equal(ui.el('spear-equation').textContent,'Δd = (n − 1)·d_seen');ui.input('answer',.3);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('spear-equation').textContent,`Δd = ${plain(.33)} × ${plain(.9)} = ${num(.297)} m`);
 });
 test(`${lang}: a mystery liquid, angles divided first, then their sines`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',1.714);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(1.714)})+' '+l.slipLinearN);assert.ok(ui.painted.includes(l.liquidTag));
  ui.input('answer',1.51);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('spear-equation').textContent,`n = sin 60° ÷ sin 35° = ${num(expected[3])}`);
 });
 test(`${lang}: the critical angle, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'θ_c =');assert.equal(ui.el('spear-equation').textContent,'sin θ_c = 1 ÷ n');ui.input('answer',48.8);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('spear-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('spear-equation').textContent,`sin θ_c = 1 ÷ ${plain(1.33)} → θ_c = ${num(expected[4],1)}°`);assert.ok(ui.painted.includes(l.lampTag)&&ui.painted.includes(l.reflectTag));assert.equal(ui.el('air-value').textContent,'—');
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',33.83);en.click('play');en.run(()=>en.el('spear-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLinearAngle));en.input('answer',32.1);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'32.1');assert.equal(es.el('spear-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('spear-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} spearfishing refraction and multilingual interface checks passed.`);
