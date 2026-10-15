// Hanging Mobile: the centre of mass of a rod and its ornaments, lower mobiles as single masses (bottom up), the knot's
// grip, exact tilting, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/mobile.html'),'utf8'),copy=require('./locales/mobile.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'mobile-model'),pure);const Mobile=pure.MobileModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const g=9.8,expected=[.15,.3,.48,100,.75];
const make=(i,a=expected[i])=>{const m=new Mobile(i);assert.ok(m.setAnswer(a));return m;};

test('each mobile has the expected answer',()=>{expected.forEach((v,i)=>near(new Mobile(i).exact(),v));});
test('the right answer puts the top rod\'s centre of mass at the knot, lower mobiles counted whole',()=>{
 for(let i=0;i<5;i++){const m=make(i);near(m.offset(),0,1e-12);assert.equal(m.balanced(),true);assert.equal(m.outcome(),'level');near(m.duration(),2);near(m.angle(5),0);}
 near(make(2).total(),.5);near(make(4).total(),.4);near(make(4).rodCm(1),.4);near(make(4).knotOf(2),.2);near(make(3).total(),.3);
 const s=make(0).sides();near(s.left,.3*g*.15);near(s.right,.1*g*.45);
});
test('an off-centre rod turns from rest about the knot to 20° exactly, inside long steps, then freezes',()=>{
 const m=make(0,.3),e=m.advance(100);assert.equal(e.done,true);assert.equal(e.outcome,'left');near(Math.abs(m.angle(m.now())),20*Math.PI/180);assert.ok(m.angle(m.now())<0);
 near(m.alpha(),g*.4*.15/(.3*.09+.1*.09+1e-4));
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2,.4),b=make(2,.4);a.advance(100);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);assert.equal(a.outcome(),'right');
});
test('the knot holds within 0.5 cm, and a run counts as soon as it starts',()=>{
 assert.equal(make(0,.154).balanced(),true);assert.equal(make(0,.156).balanced(),false);assert.equal(make(3,103).balanced(),true);assert.equal(make(3,104).balanced(),false);
 const m=make(4);m.advance(10);assert.equal(m.score(),150);
 const n=make(1,.4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(.3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.45),'inverted');assert.equal(slip(0,.3),'midpoint');assert.equal(slip(0,.1),null);
 assert.equal(slip(1,.4),'midpoint');assert.equal(slip(1,.08/.3),'missingMiddle');
 assert.equal(slip(2,.8/3),'lowerAsOne');assert.equal(slip(2,.4),'lowerAsOne');
 assert.equal(slip(3,200),'sameMass');assert.equal(slip(3,400),'invertedMass');
 assert.equal(slip(4,2/3),'lowerAsOne');assert.equal(slip(4,.5),'lowerAsOne');
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Mobile(0).setAnswer(-.1),false);assert.equal(new Mobile(0).setAnswer(.61),false);assert.equal(new Mobile(0).setAnswer(0),true);assert.equal(new Mobile(3).setAnswer(0),false);assert.equal(new Mobile(3).setAnswer(5001),false);
 const m=new Mobile(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,.3);m.advance(.05);const n=new Mobile();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,.05);assert.equal(n.answer,.3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Mobile();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'mobile-model'),script(source,'mobile-model'));
 return mount(html,{scripts:['mobile-model','mobile-interface'],locale:'mobile-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>n.toLocaleString(lang,{maximumFractionDigits:2,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang),done=()=>ui.el('mobile-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'x_k =');
  assert.equal(ui.el('given-0').textContent,`L = ${plain(.6)} m · 300 g @ 0 m, 100 g @ ${plain(.6)} m · x_k = ?`);
  assert.equal(ui.el('given-2').textContent,`L = ${plain(.8)} m · 200 g @ 0 m, [100 g @ 0 m, 200 g @ ${plain(.4)} m] @ ${plain(.8)} m · x_k = ?`);
  assert.equal(ui.el('given-3').textContent,`L = ${plain(.6)} m · 200 g @ 0 m, m = ? @ ${plain(.6)} m · x_k = ${plain(.2)} m`);
  assert.equal(ui.el('cm-value').textContent,'—');assert.equal(ui.el('mass-value').textContent,'—');assert.equal(ui.el('mobile-equation').textContent,'x_cm = Σm·x ÷ Σm');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.momentTitle)&&ui.painted.includes(l.momentHint)&&ui.painted.includes(l.arrowScale)&&ui.painted.includes('?'));
 });
 test(`${lang}: the centre of mass appears once the mobile is released, and a level rod earns the bonus`,()=>{
  ui.input('answer',.15);assert.equal(ui.el('cm-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('cm-value').textContent,fmt(.15,3));assert.equal(ui.el('mass-value').textContent,fmt(400,0));assert.equal(ui.el('sum-value').textContent,fmt(60,1));assert.equal(ui.el('lesson-copy').textContent,l.restingCopy);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.levelCopy,{cm:fmt(.15,3),h:fmt(.15,3)})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(l.rightBanner+' · '+l.levelBanner)&&ui.painted.includes(l.knotLabel)&&ui.painted.includes('x_cm')&&ui.painted.includes(l.leftShort));
 });
 test(`${lang}: counting only part of the lower mobile tilts the rod, and the slip is explained`,()=>{
  ui.click('mission-2');ui.input('answer',.4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.rightCopy,{cm:fmt(.48,3),h:fmt(.4,3)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipLowerAsOne));assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.rightDownBanner));
  assert.equal(ui.el('angle-value').textContent,fmt(20,1));
 });
 test(`${lang}: choosing an ornament in grams, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'m =');assert.equal(ui.el('answer-unit').textContent,'g');
  ui.input('answer',200);ui.click('play');ui.run(done);assert.ok(ui.el('lesson-copy').textContent.startsWith(fill(l.rightCopy,{cm:fmt(.3,3),h:fmt(.2,3)})));assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipSameMass));
  ui.input('answer',100);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('mobile-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why3));
 });
}
test('changing language preserves mobile, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('answer',.5);en.click('play');en.run(()=>en.el('mobile-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipLowerAsOne));en.input('answer',.75);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.75');assert.equal(es.el('mobile-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('mobile-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} hanging-mobile centre-of-mass and multilingual interface checks passed.`);
