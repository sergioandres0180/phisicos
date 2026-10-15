// Hanging Sign: force equilibrium on the ring (ΣF = 0), exact cable tensions, exact snaps, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/sign.html'),'utf8'),copy=require('./locales/sign.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'sign-model'),pure);const Sign=pure.SignModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const W=20*9.8,r=d=>d*Math.PI/180;
const expected=[W,W,W/(2*Math.sin(r(10))),W*Math.cos(r(30)),Math.asin(W/600)*180/Math.PI];
const make=(i,a=expected[i])=>{const m=new Sign(i);assert.ok(m.setAnswer(a));return m;};

test('each sign has the expected answer',()=>{
 expected.forEach((v,i)=>near(new Sign(i).exact(),v));near(expected[2],564.36,1e-4);near(expected[3],169.74,1e-4);near(expected[4],19.0666,1e-5);
});
test('the forces on the ring cancel in every mission: ΣFₓ = 0 and ΣF_y = 0',()=>{
 for(let i=0;i<5;i++){
  const m=make(i),a=m.angles().map(r),T=m.tensions();
  if(a.length===1){near(T[0],W);continue;}
  near(T[0]*Math.cos(a[0])-T[1]*Math.cos(a[1]),0,1e-12);near(T[0]*Math.sin(a[0])+T[1]*Math.sin(a[1]),W);
 }
 const steep=make(3).tensions();near(steep[0],98);near(steep[1],expected[3]);
 assert.ok(make(2).tensions()[0]>2.8*W,'shallow cables pull almost three times the weight');near(make(4).tensions()[0],300);
});
test('the load grows over 2 s, a weak cable snaps exactly at its rating inside long steps, then freezes',()=>{
 const m=make(1,150),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'snap');near(e.t,2*150/196);
 near(m.tension(0,m.now()),150);assert.equal(m.snap().cable,0);near(m.snap().f,150/196);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(3,98),b=make(3,98);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.snap().cable,1);
 const h=make(1);let full=null;while(h.status!=='done'){const x=h.advance(.1);if(x?.full)full=x;}assert.ok(full&&full.t>=2&&full.t<2.1);near(h.t,3);
 near(make(1).load(.5),.25);near(make(1).tension(0,1),98);
});
test('a rating may sit 2% above the tension and rounding never snaps, and a run counts as soon as it starts',()=>{
 const ok=(i,a)=>make(i,a).evaluate().ok;
 assert.equal(ok(0,196),true);assert.equal(ok(0,199.9),true);assert.equal(ok(0,200),false);assert.equal(ok(0,195.91),true);assert.equal(ok(0,195.8),false);
 assert.equal(ok(2,564.4),true);assert.equal(ok(2,564.36),true);assert.equal(ok(3,169.7),true);assert.equal(ok(3,170),true);assert.equal(ok(4,19.07),true);assert.equal(ok(4,19.1),true);assert.equal(ok(4,19),false);
 assert.equal(make(2,564.4).outcome(),'hold');assert.equal(make(4,19.07).outcome(),'hold');assert.equal(make(4,18.9).outcome(),'snap');
 const m=make(2,564.4);m.advance(10);assert.equal(m.score(),150);
 const n=make(0,100);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(196);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,20),'mass');assert.equal(slip(0,98),'half');assert.equal(slip(0,300),'spare');
 assert.equal(slip(1,W/(2*Math.cos(r(30)))),'cos');assert.equal(slip(1,W/Math.sin(r(30))),'noTwo');assert.equal(slip(1,98),'half');
 assert.equal(slip(2,W/(2*Math.cos(r(10)))),'cos');assert.equal(slip(2,W/Math.sin(r(10))),'noTwo');assert.equal(slip(2,W),'weight');
 assert.equal(slip(3,98),'swap');assert.equal(slip(3,W),'weight');assert.equal(slip(3,W/(2*Math.sin(r(60)))),'evenSplit');
 assert.equal(slip(4,Math.acos(W/600)*180/Math.PI),'cosAngle');assert.equal(slip(4,Math.asin(W/300)*180/Math.PI),'noTwoAngle');assert.equal(slip(4,30),'spare');assert.equal(slip(4,10),null);
});
test('answers are validated and nothing hangs without one',()=>{
 assert.equal(new Sign(0).setAnswer(0),false);assert.equal(new Sign(1).setAnswer(-3),false);assert.equal(new Sign(2).setAnswer(Infinity),false);assert.equal(new Sign(4).setAnswer(80),false);assert.equal(new Sign(4).setAnswer(.5),false);
 const m=new Sign(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,120);m.advance(.5);const n=new Sign();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.5);assert.equal(n.answer,120);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Sign();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'sign-model'),script(source,'sign-model'));
 return mount(html,{scripts:['sign-model','sign-interface'],locale:'sign-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('sign-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');
  assert.equal(ui.el('given-0').textContent,'m = 20 kg · θ = 90°');assert.equal(ui.el('given-3').textContent,'m = 20 kg · θ₁ = 30°, θ₂ = 60°');assert.equal(ui.el('given-4').textContent,'m = 20 kg · T_max = 300 N');
  assert.equal(ui.el('t1-value').textContent,'—');assert.equal(ui.el('t2-value').textContent,'—');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.polygonTitle)&&ui.painted.includes(l.arrowScale)&&ui.painted.includes(l.polygonHint));
 });
 test(`${lang}: tensions appear once the crane starts, and the right cables earn the bonus`,()=>{
  ui.click('mission-1');ui.input('answer',196);assert.equal(ui.el('t1-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('t1-value').textContent,fmt(196*.05,0));assert.ok(ui.el('sign-equation').textContent.includes('T₁·'+l.sinName+' θ₁'));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.holdCopy,{W:fmt(196,0)})+' '+fill(l.tensionsTwo,{t1:fmt(196,0),t2:fmt(196,0)})+' '+l.why1);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.holdBanner)&&ui.painted.includes(l.polygonClosed));
 });
 test(`${lang}: the left cable's tension on the steep cable snaps the right cable, and the slip is explained`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'T₂ =');ui.input('answer',98);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.snapCopy,{side:l.rightCable,pct:'58'})+' '+l.neededCopy+' '+fill(l.tensionsTwo,{t1:fmt(98,0),t2:fmt(expected[3],0)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSwap));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(fill(l.snapBanner,{pct:'58'})));
  ui.click('mission-0');ui.input('answer',20);ui.click('play');ui.run(done);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.snapCopy,{side:l.theCable,pct:'10'})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipMass));
 });
 test(`${lang}: the angle mission sets both cables, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'θ =');assert.equal(ui.el('answer-unit').textContent,'°');
  ui.input('answer',19.1);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('sign-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why4));
 });
}
test('changing language preserves sign, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',300);en.click('play');en.run(()=>en.el('sign-status-text').textContent===copy.en.done);en.input('answer',564.4);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'564.4');assert.equal(es.el('sign-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('sign-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} hanging sign force-equilibrium and multilingual interface checks passed.`);
