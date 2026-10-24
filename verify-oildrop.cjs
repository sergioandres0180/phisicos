// Oil Drop: Millikan's experiment. A drop hovers when q·V ÷ d = m·g; its charge, its electrons, the voltage that holds it,
// e from three drops, the voltage after it catches one more electron; the closed-form terminal-speed motion against
// stepping, the exact moment a drop reaches a plate, the end of each run, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/oildrop.html'),'utf8'),copy=require('./locales/oildrop.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'oildrop-model'),pure);const Drop=pure.OilDropModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const e=1.602e-19,g=9.8,expected=[3.27e-15*g*.01/1000,3.27e-15*g*.01/1000/e,4.9e-15*g*.012/(3*e),1.6e-19,600],units=['C','','V','C','V'];
const make=(i,a=expected[i])=>{const m=new Drop(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 4 s',()=>{
 expected.forEach((x,i)=>{const m=new Drop(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),4);});
 near(make(2).runVoltage(),expected[2]);assert.equal(make(0,1e-19).runVoltage(),1000);near(make(4).voltage(1),300);near(make(4).voltage(3),600);
});
test('the closed-form motion matches small steps of the terminal speed',()=>{
 for(const [i,a] of [[2,expected[2]*1.3],[4,500],[1,3]]){
  const m=make(i,a),d=i===1?m.ghost():m.drops()[0];let y=0;const h=1e-4;
  for(let t=0;t<4-1e-12;t+=h){const v1=m.free(d,t).v,v2=m.free(d,t+h/2).v,v3=m.free(d,t+h).v;y+=h*(v1+4*v2+v3)/6;}
  near(m.free(d,4).y,y,1e-8);
 }
});
test('at the right voltage the electric force equals the weight and the drop stops after the ramp',()=>{
 for(const i of [0,1,2,4]){const m=make(i),d=m.drops()[0],f=m.forces(d,4);near(f.F,f.W,i<2?3e-4:1e-12);assert.ok(Math.abs(m.position(d,4).v)<1e-7);assert.ok(Math.abs(m.position(d,4).y-m.position(d,2).y)<2e-7);}
 const u=make(3);for(const d of u.drops()){const f=u.forces(d,3);near(f.F,f.W,1e-12);assert.ok(Math.abs(u.position(d,4).v)<1e-15);}
 const m=make(2),d=m.drops()[0];assert.ok(m.position(d,1).y<0);assert.equal(m.contact(d),null);
});
test('a drop reaches a plate at the exact moment, then stays on it',()=>{
 const m=make(2,99920),d=m.drops()[0],tc=m.contact(d);assert.ok(tc>0&&tc<2);near(m.free(d,tc).y,.006,1e-12);
 assert.equal(m.position(d,tc).stuck,true);assert.equal(m.position(d,3).y,.006);assert.equal(m.position(d,3).v,0);assert.equal(m.position(d,tc*(1-1e-9)).stuck,false);
 const n=make(2,1),dn=n.drops()[0];assert.equal(n.contact(dn),null);assert.ok(n.position(dn,4).y<0);
 // 30 times the hovering force: the drop is still between the plates when the ramp ends and reaches the top one after it.
 const o=make(2,36000),dO=o.drops()[0],to=o.contact(dO);assert.ok(to>2&&to<4);near(o.free(dO,to).y,.006,1e-12);
});
test('the orange drop carries the charge your answer gives it',()=>{
 near(make(1,3).ghost().q,3*e);near(make(0,4e-19).ghost().q,4e-19);assert.equal(make(2).ghost(),null);assert.equal(make(3).ghost(),null);
 const m=make(1,3);assert.ok(m.position(m.ghost(),4).v>0);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,4);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(10);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window even for 10⁻¹⁹ C; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(3,1e-30).evaluate().ok,false);assert.equal(make(0,1e-25).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,3597);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(1199);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,3.27e-20),'noGravity');assert.equal(slip(0,3.2046e-17),'noDistance');assert.equal(slip(0,2),'electronCount');assert.equal(slip(0,3.2),'noPower');assert.equal(slip(0,6.4e-19),null);
 assert.equal(slip(1,.5),'inverted');assert.equal(slip(1,3.2e-19),'chargeTyped');assert.equal(slip(1,3),null);
 assert.equal(slip(2,3597),'oneElectron');assert.equal(slip(2,99920),'noGap');assert.equal(slip(2,2000),null);
 assert.equal(slip(3,4.8e-19),'smallest');assert.equal(slip(3,3.2e-19),'difference');assert.equal(slip(3,8e-19),'average');assert.equal(slip(3,.8e-19),'halfUnit');assert.equal(slip(3,1.6),'noPower');assert.equal(slip(3,2.4e-19),null);
 assert.equal(slip(4,1350),'multiplied');assert.equal(slip(4,450),'halved');assert.equal(slip(4,900),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1001])assert.equal(new Drop(0).setAnswer(bad),false);assert.equal(new Drop(0).setAnswer(1000),true);assert.equal(new Drop(1).setAnswer(1e9+1),false);assert.equal(new Drop(2).setAnswer(1e7+1),false);
 const m=new Drop(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,3597);m.advance(1.5);const n=new Drop();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,3597);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:4.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Drop(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'oildrop-model'),script(source,'oildrop-model'));
 return mount(html,{scripts:['oildrop-model','oildrop-interface'],locale:'oildrop-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const four=x=>plain(Number(x.toPrecision(4)));
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>({x:four(new Drop(i).exact())});
 const ui=open(lang),done=()=>ui.el('oildrop-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'q =');assert.equal(ui.el('answer-unit').textContent,'C');
  assert.equal(ui.el('given-0').textContent,`${plain(3.27e-15)} kg · 1 kV · 1 cm`);assert.equal(ui.el('given-2').textContent,`${plain(4.9e-15)} kg · 3 e⁻ · ${plain(1.2)} cm`);
  assert.equal(ui.el('given-3').textContent,[4.8e-19,8e-19,11.2e-19].map(q=>plain(q*1e19)).join(' · ')+' × 10⁻¹⁹ C');assert.equal(ui.el('given-4').textContent,'900 V · 2 → 3 e⁻');
  for(const id of ['volt-value','field-value','ratio-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('oildrop-equation').textContent,'q·V ÷ d = m·g');
  for(const key of ['viewTitle','heightGraph','panelHint','scaleNote','eyepieceTag','arrowNote'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the plates switch on, and the charge is right on the first try`,()=>{
  ui.input('answer','3.2e-19');assert.equal(ui.el('volt-value').textContent,'—');
  ui.click('step');
  const m=make(0,3.2e-19),d=m.drops()[0],f=m.forces(d,.1);
  assert.equal(ui.el('volt-value').textContent,num(50,0));assert.equal(ui.el('field-value').textContent,num(5,1));assert.equal(ui.el('ratio-value').textContent,num(f.F/f.W));assert.equal(ui.el('speed-value').textContent,num(m.position(d,.1).v*1000,3));
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,fill(l.rampCopy,{V:num(50,0)}));
  assert.equal(ui.el('oildrop-equation').textContent,`q = m·g·d ÷ V = ${four(expected[0])} C`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.timeAxis)&&ui.painted.includes(l.guessTag));
  assert.equal(ui.el('volt-value').textContent,num(1000,0));assert.equal(ui.el('ratio-value').textContent,num(1));
 });
 test(`${lang}: the electrons counted upside down, then right`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'n =');assert.equal(ui.el('answer-unit').textContent,'');ui.input('answer',.5);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(.5)})+' '+l.slipInverted);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('oildrop-equation').textContent,`n = m·g·d ÷ (V·e) = ${num(expected[1])}`);
  ui.input('answer',2);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
 });
 test(`${lang}: a voltage that slams the drop into the top plate, then the one that holds it`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');ui.input('answer',99920);ui.click('play');
  ui.run(()=>ui.el('lesson-copy').textContent===l.stuckCopy);assert.equal(ui.el('lesson-copy').textContent,l.stuckCopy);assert.equal(ui.el('speed-value').textContent,num(0,3));
  ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(99920)+' V'})+' '+l.slipNoGap);
  ui.input('answer',1199);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+l.why2);
  assert.equal(ui.el('oildrop-equation').textContent,`V = m·g·d ÷ (n·e) = ${num(expected[2],0)} V`);
 });
 test(`${lang}: e from three drops, after forgetting the power of ten`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'e =');assert.equal(ui.el('oildrop-equation').textContent,'q = n·e');ui.input('answer',1.6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+fill(l.missCopy,{p:plain(1.6)+' C'})+' '+l.slipNoPower);assert.ok(ui.painted.includes(l.ladderGraph)&&ui.painted.includes(l.chargeAxis));
  ui.input('answer','1.6e-19');ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);
  assert.equal(ui.el('oildrop-equation').textContent,`e = ${four(1.6e-19)} C (3e · 5e · 7e)`);
 });
 test(`${lang}: one more electron, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'V₂ =');ui.input('answer',600);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('oildrop-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('oildrop-equation').textContent,`V₂ = V₁·n₁ ÷ n₂ = ${num(600,0)} V`);assert.equal(ui.el('volt-value').textContent,num(600,0));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',3597);en.click('play');en.run(()=>en.el('oildrop-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipOneElectron));en.input('answer',1199);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'1199');assert.equal(es.el('oildrop-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('oildrop-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} oil drop and multilingual interface checks passed.`);
