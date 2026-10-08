// Ferris Wheel: exact-value parsing, unit-circle coordinates, exact stops, sign and swap detection, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/wheel.html'),'utf8'),copy=require('./locales/wheel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'wheel-model'),pure);const Wheel=pure.WheelModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const exactForms=[['√3/2','1/2'],['-√2/2','√2/2'],['-√3/2','-1/2'],['0','-1'],['1/2','-√3/2'],['√2/2','√2/2']];
const make=(i,[c,s]=exactForms[i])=>{const m=new Wheel(i);m.setAnswer('cos',c);m.setAnswer('sin',s);return m;};

test('exact forms and decimals are parsed, and exactness is detected',()=>{
 const cases=[['√3/2',Math.sqrt(3)/2,true],['sqrt(3)/2',Math.sqrt(3)/2,true],['−√2/2',-Math.SQRT1_2,true],['1/√2',Math.SQRT1_2,true],['-1/2',-.5,true],['1',1,true],['0',0,true],['2√2/4',Math.SQRT1_2,true],['√(3) / 2',Math.sqrt(3)/2,true],
  ['0.866',.866,false],['-0,5',-.5,false],['.5',.5,false],['√0.75',Math.sqrt(.75),false]];
 for(const [raw,value,exact] of cases){const p=Wheel.parse(raw);assert.ok(p,raw);near(p.value,value);assert.equal(p.exact,exact,raw);}
 for(const bad of ['','abc','1/0','√','1//2','2/3/4','√-3','--1','1e2'])assert.equal(Wheel.parse(bad),null,bad);
});
test('sine and cosine are limited to [−1, 1]',()=>{
 const m=new Wheel(0);assert.equal(m.setAnswer('cos','1.2'),false);assert.equal(m.cos,null);assert.equal(m.setAnswer('cos','√3'),false);assert.equal(m.setAnswer('cos','-1'),true);assert.equal(m.setAnswer('tan','1'),false);
});
test('the cabin moves on the circle with a tangent velocity of size R · ω',()=>{
 const m=make(0);m.advance(10);near(m.angle(),15);const p=m.position(),v=m.velocity();near(Math.hypot(p.x,p.y),10);
 near(Math.hypot(v.x,v.y),10*1.5*Math.PI/180);near(p.x*v.x+p.y*v.y,0,1e-12);assert.ok(v.y>0,'counter-clockwise at the start');
});
test('the cabin stops exactly at the target angle, then the state freezes',()=>{
 const m=make(2);assert.equal(m.advance(139.9),null);const e=m.advance(5);near(e.t,140);assert.equal(m.status,'stopped');
 near(m.position().x,-10*Math.sqrt(3)/2);near(m.position().y,-5);near(m.velocity().x,0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(3),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(5),b=make(5);a.advance(1e4);while(b.status!=='stopped')b.advance(1/120);near(a.t,b.t,1e-12);near(a.t,270);near(a.position().x,b.position().x);
});
test('405° ends where 45° would, after one full turn',()=>{const m=make(5);m.advance(1e4);near(m.position().x,10*Math.SQRT1_2);near(m.position().y,10*Math.SQRT1_2);near(m.angle(),405);});
test('exact values earn the bonus, decimals within 0.01 earn the position',()=>{
 const score=(i,c,s)=>{const m=make(i,[c,s]);m.advance(1e4);return m.score();};
 exactForms.forEach((f,i)=>assert.equal(score(i,...f),150,'mission '+i));
 assert.equal(score(0,'0.866','0.5'),100);assert.equal(score(0,'0.87','0.5'),100);assert.equal(score(0,'0.88','0.5'),0);assert.equal(score(1,'-0.707','√2/2'),100);
 assert.equal(make(0).score(),0);
});
test('swapped and sign errors are recognized',()=>{
 const e=(i,c,s)=>make(i,[c,s]).evaluate();
 assert.ok(e(0,'1/2','√3/2').swap);assert.ok(e(2,'√3/2','1/2').sign);assert.ok(e(2,'-√3/2','1/2').sign);assert.ok(e(3,'0','1').sign);
 const miss=e(0,'1','0');assert.ok(!miss.swap&&!miss.sign&&!miss.found);near(miss.miss,10*Math.hypot(1-Math.sqrt(3)/2,.5));
});
test('without both values nothing turns, and edits restart the turn',()=>{
 const m=new Wheel(0);m.setAnswer('cos','√3/2');assert.equal(m.advance(5),null);assert.equal(m.t,0);
 m.setAnswer('sin','1/2');m.advance(5);assert.equal(m.t,5);m.setAnswer('sin','0.5');assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,['1/2','-0.866']);m.advance(30);const n=new Wheel();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);
 assert.equal(n.index,4);near(n.t,30);assert.equal(n.cosText,'1/2');near(n.sin.value,-.866);
 const s=m.snapshot();for(const bad of [{...s,index:6},{...s,cosText:5},{...s,t:1e6},{...s,status:'spinning'},{...s,sinText:''},{...s,cosText:'x'.repeat(41)}]){const k=new Wheel();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'wheel-model'),script(source,'wheel-model'));
 return mount(html,{scripts:['wheel-model','wheel-interface'],locale:'wheel-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sep=lang==='en'?', ':'; ';
 const ui=open(lang);
 test(`${lang}: initial state, localized sine name, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('wheel-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('sin-symbol').textContent,l.sinName+' θ =');assert.equal(ui.el('prediction-note').textContent,l.predictionEmpty);
  assert.equal(ui.el('position-value').textContent,'('+fmt(10)+sep+fmt(0)+')');assert.equal(ui.el('height-value').textContent,fmt(12));
  assert.ok(ui.painted.includes(l.graphTitle)&&ui.painted.includes('θ = 30°'));
 });
 test(`${lang}: exact values find the cabin and earn the bonus`,()=>{
  ui.input('cos-answer','√3/2');assert.equal(ui.el('cos-form').textContent,l.exactForm);assert.equal(ui.el('play').disabled,true);
  ui.input('sin-answer','1/2');assert.equal(ui.el('prediction-value').textContent,'('+fmt(10*Math.sqrt(3)/2)+sep+fmt(5)+') m');
  assert.equal(ui.el('prediction-note').textContent,l.predictionHeight.replace('{h}',fmt(17)));assert.ok(ui.painted.includes(l.yourCabin));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(2,1));assert.equal(ui.el('angle-value').textContent,fmt(3,1)+'°');
  ui.click('play');ui.run(()=>ui.el('wheel-status-text').textContent===l.stopped);
  assert.equal(ui.el('lesson-title').textContent,l.foundTitle);assert.equal(ui.el('lesson-copy').textContent,l.why0+' '+l.exactPraise);assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('found-badge').classList.has('earned')&&ui.el('exact-badge').classList.has('earned'));assert.equal(ui.el('unit-value').textContent,'('+fmt(Math.sqrt(3)/2,3)+sep+fmt(.5,3)+')');
  assert.ok(ui.painted.includes(l.foundBanner));
 });
 test(`${lang}: decimals, sign errors, and invalid values get their own feedback`,()=>{
  ui.click('mission-2');assert.equal(ui.el('cos-answer').value,'');
  ui.input('cos-answer','2');assert.equal(ui.el('prediction-note').textContent,l.invalidValue);
  ui.input('cos-answer',(-0.866).toLocaleString(lang));ui.input('sin-answer','1/2');assert.equal(ui.el('cos-form').textContent,l.decimalForm);
  ui.click('play');ui.run(()=>ui.el('wheel-status-text').textContent===l.stopped,{limit:800});
  assert.equal(ui.el('lesson-title').textContent,l.signTitle);assert.equal(ui.el('lesson-copy').textContent,l.signCopy.replace('{q}','III').replace('{cs}',l.negative).replace('{ss}',l.negative));
  assert.equal(ui.el('mission-score').textContent,'0');assert.ok(ui.el('insight').classList.has('warning'));
  ui.input('sin-answer','-0.5');ui.click('play');ui.run(()=>ui.el('wheel-status-text').textContent===l.stopped,{limit:800});
  assert.equal(ui.el('lesson-title').textContent,l.foundTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.exactNudge));assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: the root button and focus loss work without advancing time`,()=>{
  ui.click('mission-3');ui.click('insert-root');assert.equal(ui.el('cos-answer').value,'√');ui.input('cos-answer','0');ui.input('sin-answer','-1');
  ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('wheel-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves target, predictions, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('cos-answer','1/2');en.input('sin-answer','-√3/2');en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('cos-answer').value,'1/2');assert.equal(es.el('sin-answer').value,'-√3/2');
 assert.equal(es.el('time-value').textContent,(2).toLocaleString('es',{minimumFractionDigits:1}));assert.equal(es.el('wheel-status-text').textContent,copy.es.paused);
});
console.log(`\n${checks} ferris wheel unit-circle and multilingual interface checks passed.`);
