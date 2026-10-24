// Particle Gun: a potential difference becomes kinetic energy, q·ΔV = ½·m·v². The energy of an electron through 1000 V,
// the speeds of an electron and a proton through 250 V, an alpha particle's energy in eV, and the voltage that stops an
// electron; the motion between and past the grids, energy conservation, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/accelerator.html'),'utf8'),copy=require('./locales/accelerator.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'accelerator-model'),pure);const Gun=pure.AcceleratorModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const e=1.602e-19,me=9.109e-31,mp=1.673e-27,ma=6.645e-27;
const expected=[e*1000,Math.sqrt(2*e*250/me),Math.sqrt(2*e*250/mp),2000,me*16e12/(2*e)],units=['J','m/s','m/s','eV','V'];
const make=(i,a=expected[i])=>{const m=new Gun(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{
 expected.forEach((x,i)=>{const m=new Gun(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});
 near(expected[1],9.3774e6,1e-4);near(expected[2],2.1881e5,1e-4);near(expected[4],45.488,1e-4);
});
test('from rest, steady speed-up between the grids, then coasting to the detector; runs are slowed to about 4 s',()=>{
 const m=make(1),a=e*250/(me*.04),s1=Math.sqrt(2*.04/a),v=Math.sqrt(2*e*250/me);
 const half=m.state(s1*1e9/2);assert.equal(half.phase,'grids');near(half.x,.01);near(half.v,v/2);
 const out=m.state(s1*1e9);near(out.x,.04);near(out.v,v);const T=m.duration();near(T,(s1+.06/v)*1e9);
 assert.equal(m.state(T).phase,'arrived');near(m.state(T).x,.1);near(m.state(T*2).x,.1);
 for(let i=0;i<4;i++)near(new Gun(i).config.pace*4,make(i).duration());
});
test('energy is conserved: U turns into K, and the energy depends on the charge, not the mass',()=>{
 for(const i of [0,1,2,3]){const m=make(i),T=m.duration();for(const f of [0,.2,.5,.8,1]){const E=m.energies(T*f);near(E.U+E.K,E.total,1e-9);}near(m.energies(T).K,m.energies(T).total,1e-9);}
 near(make(0).energies(0).total,1000);near(make(3).energies(0).total,2000);near(make(1).energies(0).total,make(2).energies(0).total);
 near(make(1).finalSpeed()/make(2).finalSpeed(),Math.sqrt(mp/me));near(make(3).finalSpeed(),Math.sqrt(2*2*e*1000/ma));
});
test('stopping: too little voltage lets the electron through slower, enough turns it back, and within 2% it stops at the grid',()=>{
 const low=make(4,30),T=low.duration();near(low.state(T).v,Math.sqrt(16e12-2*e*30/me));near(low.state(T).x,.1);
 const E=low.energies(T/2);near(E.U+E.K,E.total,1e-9);
 const high=make(4,90.98),s0=.015/4e6,a=e*90.98/(me*.04),turn=high.state((s0+4e6/a)*1e9);near(turn.x,.02,1e-3);near(turn.v+1,1,1e-6);
 assert.equal(high.state(high.duration()).phase,'left');near(high.state(high.duration()).x,-.015);near(high.state(high.duration()).v,-4e6);
 for(const v of [44.7,45.49,46.3]){const m=make(4,v);near(m.voltage(),expected[4]);const s=m.state(((s0+2*.04/4e6))*1e9);near(s.x,.04,1e-9);near(s.v+1,1,1e-9);assert.equal(m.state(m.duration()).phase,'left');}
 near(make(4,44).voltage(),44);assert.equal(new Gun(4).voltage(),0);near(make(4).duration(),(2*s0+4*.04/4e6)*1e9);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0],[1],[2],[3],[4],[4,30],[4,90.98]]){const p=make(i,a),q=make(i,a);const r=p.advance(1e7);assert.equal(r.done,true);near(r.t,p.duration());const h=p.duration()/400;while(q.status!=='done')q.advance(h);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(1e6);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(1e6);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,6.631e6);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[1]);n.advance(1e6);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,1000),'noCharge');assert.equal(slip(0,8.01e-17),'halved');assert.equal(slip(0,1e-16),null);
 assert.equal(slip(1,6.631e6),'noTwo');assert.equal(slip(1,8.794e13),'noRoot');assert.equal(slip(1,1e6),null);
 assert.equal(slip(2,9.377e6),'electronMass');assert.equal(slip(2,4.788e10),'noRoot');assert.equal(slip(2,1e5),null);
 assert.equal(slip(3,1000),'oneCharge');assert.equal(slip(3,4000),'squared');assert.equal(slip(3,3.204e-16),'joules');assert.equal(slip(3,500),null);
 assert.equal(slip(4,90.98),'noHalf');assert.equal(slip(4,7.287e-18),'kineticJoules');assert.equal(slip(4,30),null);
});
test('answers are validated, and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e6])assert.equal(new Gun(0).setAnswer(bad),false);assert.equal(new Gun(1).setAnswer(2e20),false);assert.equal(new Gun(4).setAnswer(2e6),false);
 const m=new Gun(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,30);m.advance(10);const n=new Gun();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,10);assert.equal(n.answer,30);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:1e4},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Gun(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'accelerator-model'),script(source,'accelerator-model'));
 return mount(html,{scripts:['accelerator-model','accelerator-interface'],locale:'accelerator-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sci=x=>{const a=Math.abs(x);if(!a||a<1e4)return plain(Number(x.toPrecision(4)));let p=Math.floor(Math.log10(a)),m=Number((x/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);};
 const eV=x=>plain(Number(x.toPrecision(4)));
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=[{x:sci(expected[0])},{x:sci(expected[1])},{x:sci(expected[2])},{x:num(2000,0)},{x:num(expected[4])}];
 const ui=open(lang),done=()=>ui.el('accelerator-status-text').textContent===l.done,copyIs=s=>()=>ui.el('lesson-copy').textContent===s;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'K =');assert.equal(ui.el('answer-unit').textContent,'J');
  assert.equal(ui.el('given-0').textContent,`e⁻ · ΔV = ${plain(1000)} V`);assert.equal(ui.el('given-1').textContent,`e⁻ · ΔV = ${plain(250)} V`);
  assert.equal(ui.el('given-2').textContent,`p⁺ · ΔV = ${plain(250)} V`);assert.equal(ui.el('given-3').textContent,`α (2e) · ΔV = ${plain(1000)} V`);assert.equal(ui.el('given-4').textContent,`e⁻ · v₀ = ${sci(4e6)} m/s`);
  for(const id of ['pos-value','speed-value','kinetic-value','ev-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('accelerator-equation').textContent,'q·ΔV = ½·m·v²');
  for(const key of ['viewTitle','energyGraph','scaleNote','panelHint','electronSource','detectorTag'])assert.ok(ui.painted.includes(l[key]),key);
  assert.ok(ui.painted.includes(fill(l.slowNote,{t:plain(Number(new Gun(0).config.pace.toPrecision(3)))})));assert.ok(ui.painted.includes(`+${plain(1000)} V`)&&ui.painted.includes(`${plain(0)} V`));
 });
 test(`${lang}: the electron speeds up between the grids and coasts on, right on the first try`,()=>{
  ui.input('answer',1.602e-16);assert.equal(ui.el('speed-value').textContent,'—');
  ui.click('step');const m=make(0),t=.1*m.config.pace,st=m.state(t),E=m.energies(t);
  assert.equal(ui.el('time-value').textContent,num(t));assert.equal(ui.el('pos-value').textContent,num(st.x*100));assert.equal(ui.el('speed-value').textContent,sci(st.v));
  assert.equal(ui.el('kinetic-value').textContent,sci(E.K*e));assert.equal(ui.el('ev-value').textContent,eV(E.K));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.accelCopy,{K:eV(E.K),U:eV(E.U),v:sci(st.v)}));assert.equal(ui.el('accelerator-equation').textContent,`K = e·ΔV = ${sci(expected[0])} J`);
  const coast=fill(l.driftCopy,{v:sci(m.finalSpeed()),K:eV(1000)});ui.click('play');ui.run(copyIs(coast));ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('pos-value').textContent,num(10));assert.equal(ui.el('ev-value').textContent,eV(1000));assert.equal(ui.el('kinetic-value').textContent,sci(1000*e));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag)&&ui.painted.includes(fill(l.totalTag,{E:eV(1000)})));
 });
 test(`${lang}: the electron's speed without the 2, then with it`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');ui.input('answer',6.631e6);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+fill(l.missCopy,{p:plain(6.631e6)+' m/s'})+' '+l.slipNoTwo);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',9.377e6);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  assert.equal(ui.el('speed-value').textContent,sci(expected[1]));assert.equal(ui.el('accelerator-equation').textContent,`v = √(2·e·ΔV ÷ m) = ${sci(expected[1])} m/s`);
 });
 test(`${lang}: a proton through the same voltage, with an electron's mass, then its own`,()=>{
  ui.click('mission-2');ui.input('answer',9.377e6);assert.ok(ui.painted.includes(l.protonSource));ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+fill(l.missCopy,{p:plain(9.377e6)+' m/s'})+' '+l.slipElectronMass);
  ui.input('answer',2.188e5);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  assert.equal(ui.el('speed-value').textContent,sci(expected[2]));assert.equal(ui.el('ev-value').textContent,eV(250));assert.equal(ui.el('accelerator-equation').textContent,`v = √(2·e·ΔV ÷ mₚ) = ${sci(expected[2])} m/s`);
 });
 test(`${lang}: an alpha particle with one charge counted, then two`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-unit').textContent,'eV');ui.input('answer',1000);assert.ok(ui.painted.includes(l.alphaSource));ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+fill(l.missCopy,{p:plain(1000)+' eV'})+' '+l.slipOneCharge);
  ui.input('answer',2000);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  assert.equal(ui.el('ev-value').textContent,eV(2000));assert.equal(ui.el('accelerator-equation').textContent,`K = 2e·ΔV = ${num(2000,0)} eV`);
 });
 test(`${lang}: too little voltage lets the electron through, twice too much turns it back; focus loss pauses`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'ΔV =');assert.equal(ui.el('answer-unit').textContent,'V');assert.ok(ui.painted.includes('−? V'));
  ui.input('answer',30);ui.click('play');const m=make(4,30);ui.run(copyIs(fill(l.approachCopy,{v:sci(4e6),K:eV(.5*me*16e12/e)})));ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.throughCopy.split('{')[0]));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(30)+' V'})+' '+l.hint4);assert.equal(ui.el('speed-value').textContent,sci(m.state(m.duration()).v));
  ui.input('answer',90.98);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.backCopy.split('{')[0]));ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+fill(l.missCopy,{p:plain(90.98)+' V'})+' '+l.slipNoHalf);assert.ok(ui.painted.includes(plain(-90.98)+' V'));
  ui.input('answer',45.49);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('accelerator-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  assert.equal(ui.el('pos-value').textContent,num(-1.5));assert.equal(ui.el('accelerator-equation').textContent,`ΔV = m·v₀² ÷ (2e) = ${num(expected[4])} V`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',6.631e6);en.click('play');en.run(()=>en.el('accelerator-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoTwo));en.input('answer',9.377e6);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'9377000');assert.equal(es.el('accelerator-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('accelerator-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} particle gun and multilingual interface checks passed.`);
