// Electron Beam: a uniform field between two plates bends a beam into a parabola. E = V ÷ d, a = e·E ÷ m, the bend
// y = ½·a·(L ÷ v₀)², the voltage that aims the beam at a target (and a plate that catches it), and a proton bending the
// other way 1836 times less; the path's phases, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/deflect.html'),'utf8'),copy=require('./locales/deflect.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'deflect-model'),pure);const Beam=pure.DeflectModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const e=1.602e-19,me=9.109e-31,mp=1.673e-27,t2=(.05/2e7)**2,ae=e*15000/me;
const expected=[25000,ae,.5*ae*t2*1e3,2*.005*me*.02*4e14/(e*.0025),-.5*e*15000/mp*t2*1e6],units=['V/m','m/s²','mm','V','µm'];
const make=(i,a=expected[i])=>{const m=new Beam(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; runs last from gun to screen',()=>{
 expected.forEach((x,i)=>{const m=new Beam(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});
 near(expected[1],2.63805e15,1e-5);near(expected[2],8.2439,1e-4);near(expected[3],181.95,1e-4);near(expected[4],-4.4886,1e-4);
 near(make(0).duration(),5.6);for(let i=1;i<5;i++)near(make(i).duration(),7);near(new Beam(0).config.pace,1.4);near(new Beam(1).config.pace,1.75);
});
test('straight from the gun, a parabola between the plates, straight again to the screen',()=>{
 const m=make(2),a=m.accel();near(a,ae);
 assert.equal(m.state(.5).phase,'gun');near(m.state(.5).y+1,1);near(m.state(1).x+1,1);
 const s=m.state(2);assert.equal(s.phase,'plates');near(s.x,.02);near(s.y,.5*a*(.02/2e7)**2);near(s.vy,a*1e-9);
 const exit=m.state(3.5);near(exit.x,.05);near(exit.y,m.exitHeight());near(m.exitHeight(),expected[2]/1e3);
 const f=m.state(5);assert.equal(f.phase,'free');near(f.vy,exit.vy);near(f.y,exit.y+exit.vy*1.5e-9);
 const end=m.state(7);assert.equal(end.phase,'screen');near(end.x,.12);near(end.y,exit.y*(1+2*.07/.05));near(m.state(50).y,end.y);
});
test('an electron is pulled up toward the + plate and a proton pushed down, 1836 times less',()=>{
 assert.ok(make(1).accel()>0);assert.ok(make(4).accel()<0);near(-make(1).accel()/make(4).accel(),mp/me);near(make(4).exitHeight()*1e6,expected[4]);
 near(make(0).field(),25000);near(make(0).accel(),e*25000/me);near(make(3).field(),expected[3]/.02);near(make(3).exitHeight(),.005);
});
test('too much voltage lands the beam on the + plate at the exact moment it gets there',()=>{
 const m=make(3,1000),a=e*1000/.02/me,hit=Math.sqrt(.02/a);
 near(m.duration(),(1e-9+hit)*1e9);const s=m.state(m.duration());assert.equal(s.phase,'hit');near(s.y,.01);near(s.x,-.02+2e7*(1e-9+hit));
 assert.equal(make(3,363).state(7).phase,'screen');assert.equal(make(3,365).state(7).phase,'hit');assert.equal(new Beam(3).voltage(),0);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0],[1],[2],[3],[4],[3,1000]]){const p=make(i,a),q=make(i,a);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(100);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(4,-expected[4]).evaluate().ok,false);
 const m=make(0);m.advance(100);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,16.49);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[2]);n.advance(100);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,10),'multiplied');assert.equal(slip(0,250),'centimetres');assert.equal(slip(0,2500),null);
 assert.equal(slip(1,1.436e12),'protonMass');assert.equal(slip(1,2.403e-15),'forceOnly');assert.equal(slip(1,1e15),null);
 assert.equal(slip(2,16.49),'noHalf');assert.equal(slip(2,.008244),'metres');assert.equal(slip(2,4),null);
 assert.equal(slip(3,90.98),'noHalfVoltage');assert.equal(slip(3,9098),'fieldTyped');assert.equal(slip(3,300),null);
 for(const a of [8244,8.244])assert.equal(slip(4,a),'sameAsElectron');for(const a of [-8244,-8.244])assert.equal(slip(4,a),'mirrored');
 assert.equal(slip(4,4.489),'sameDirection');assert.equal(slip(4,-.004489),'millimetres');assert.equal(slip(4,-2),null);
});
test('answers are validated: only the proton test takes a sign, none takes 0, and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e12])assert.equal(new Beam(0).setAnswer(bad),false);assert.equal(new Beam(4).setAnswer(-4.5),true);assert.equal(new Beam(4).setAnswer(0),false);assert.equal(new Beam(3).setAnswer(2e6),false);
 const m=new Beam(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,-8.244);m.advance(2.5);const n=new Beam();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,2.5);assert.equal(n.answer,-8.244);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:7.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Beam(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'deflect-model'),script(source,'deflect-model'));
 return mount(html,{scripts:['deflect-model','deflect-interface'],locale:'deflect-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const sig=x=>plain(Number(x.toPrecision(4))),values=[{x:num(25000,0)},{x:sig(expected[1])},{x:num(expected[2],3)},{x:num(expected[3],1)},{x:sig(expected[4])}];
 const ui=open(lang),done=()=>ui.el('deflect-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'E =');assert.equal(ui.el('answer-unit').textContent,'V/m');
  assert.equal(ui.el('given-0').textContent,`V = ${plain(500)} V · d = ${plain(2)} cm`);assert.equal(ui.el('given-1').textContent,`e⁻ · E = ${plain(15000)} V/m`);
  assert.equal(ui.el('given-2').textContent,`v₀ = ${plain(2e7)} m/s · L = ${plain(5)} cm`);assert.equal(ui.el('given-3').textContent,`y = ${plain(5)} mm · d = ${plain(2)} cm`);assert.equal(ui.el('given-4').textContent,`p⁺ · v₀ = ${plain(2e7)} m/s`);
  for(const id of ['field-value','accel-value','height-value','vy-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('deflect-equation').textContent,'y = ½·(q·E ÷ m)·(L ÷ v₀)²');
  for(const key of ['viewTitle','heightGraph','scaleNote','panelHint','gunTag','screenTag'])assert.ok(ui.painted.includes(l[key]),key);
  assert.ok(ui.painted.includes(fill(l.slowNote,{t:plain(1.4)})));assert.ok(ui.painted.includes(`V = ${plain(500)} V`)&&ui.painted.includes(`L = ${plain(5)} cm · d = ${plain(2)} cm`));
 });
 test(`${lang}: the beam leaves the gun, bends between the plates, and flies on, right on the first try`,()=>{
  ui.input('answer',25000);assert.equal(ui.el('field-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('time-value').textContent,num(.14));assert.equal(ui.el('lesson-copy').textContent,fill(l.gunCopy,{v:plain(2.5e7)}));
  assert.equal(ui.el('field-value').textContent,num(25000,0));assert.equal(ui.el('accel-value').textContent,'0');assert.equal(ui.el('height-value').textContent,plain(0)+' mm');assert.equal(ui.el('vy-value').textContent,'0');
  assert.equal(ui.el('deflect-equation').textContent,`E = V ÷ d = ${plain(500)} ÷ ${plain(.02)} = ${num(25000,0)} V/m`);
  const bend=fill(l.platesCopy,{a:sig(e*25000/me)});ui.click('play');ui.run(copyIs(bend));assert.equal(ui.el('accel-value').textContent,sig(e*25000/me));
  ui.run(copyIs(l.freeCopy));assert.equal(ui.el('accel-value').textContent,'0');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  const m=make(0),end=m.state(10);assert.equal(ui.el('height-value').textContent,sig(end.y*1e3)+' mm');assert.equal(ui.el('vy-value').textContent,sig(end.vy));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes('y = '+sig(m.exitHeight()*1e3)+' mm'));
 });
 test(`${lang}: the push on an electron with a proton's mass, then an electron's`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'a =');assert.equal(ui.el('answer-unit').textContent,'m/s²');ui.input('answer',1.436e12);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(1.436e12)+' m/s²'})+' '+l.slipProtonMass);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',2.638e15);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('field-value').textContent,num(15000,0));assert.equal(ui.el('deflect-equation').textContent,`a = e·E ÷ m = ${sig(expected[1])} m/s²`);
 });
 test(`${lang}: the bend without the ½, then with it`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'y =');assert.equal(ui.el('answer-unit').textContent,'mm');ui.input('answer',16.49);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(16.49)+' mm'})+' '+l.slipNoHalf);
  ui.input('answer',8.244);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('height-value').textContent,sig(make(2).state(10).y*1e3)+' mm');assert.equal(ui.el('deflect-equation').textContent,`y = ½·a·(L ÷ v₀)² = ${num(expected[2],3)} mm`);
 });
 test(`${lang}: too much voltage lands the beam on the plate; the right voltage hits the target`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');assert.ok(ui.painted.includes('V = ?')&&ui.painted.includes(fill(l.targetTag,{y:plain(5)})));
  ui.input('answer',1000);ui.click('play');ui.run(done);assert.ok(ui.painted.includes(l.hitTag));assert.equal(ui.el('height-value').textContent,plain(10)+' mm');
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(1000)+' V'})+' '+l.hint3);
  ui.input('answer',182);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.ok(ui.painted.includes(`V = ${plain(182)} V`));assert.equal(ui.el('field-value').textContent,num(9100,0));assert.equal(ui.el('deflect-equation').textContent,`V = 2·y·m·d·v₀² ÷ (e·L²) = ${num(expected[3],1)} V`);
 });
 test(`${lang}: a proton bends down, far less; focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'y =');assert.equal(ui.el('answer-unit').textContent,'µm');
  ui.input('answer',-8.244);assert.ok(ui.painted.includes(l.tinyTag)&&ui.painted.includes(l.protonGunTag));ui.click('play');
  const push=fill(l.platesDownCopy,{a:sig(e*15000/mp)});ui.run(copyIs(push));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(-8.244)+' µm'})+' '+l.slipMirrored);
  ui.input('answer',-4.49);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('deflect-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('height-value').textContent,sig(make(4).state(10).y*1e6)+' µm');assert.equal(ui.el('deflect-equation').textContent,`y = −½·a_p·(L ÷ v₀)² = ${sig(expected[4])} µm`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',16.49);en.click('play');en.run(()=>en.el('deflect-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoHalf));en.input('answer',8.244);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'8.244');assert.equal(es.el('deflect-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('deflect-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} electron beam and multilingual interface checks passed.`);
