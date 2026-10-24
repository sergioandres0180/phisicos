// Material Tester: conductors, insulators, and resistivity. R = ρ·L ÷ A and I = V ÷ R for nichrome and glass, the length
// of a heater wire, the aluminium that matches a copper cable, and a pencil lead; the switch closing exactly on time, the
// resistivity an answer implies, the purely relative window near 10⁻¹⁴ A, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/tester.html'),'utf8'),copy=require('./locales/tester.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'tester-model'),pure);const Tester=pure.TesterModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const cu=1.68e-8,al=2.65e-8,ni=1.1e-6,gr=3.5e-5;
const expected=[12/(ni/.5e-6),12/(1e12*.1/1e-4),10*.5e-6/ni,al/cu,gr*.06/(Math.PI*.35e-3**2)],units=['A','A','m','mm²','Ω'],rhos=[ni,1e12,ni,al,gr];
const make=(i,a=expected[i])=>{const m=new Tester(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 expected.forEach((x,i)=>{const m=new Tester(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);near(m.resistivity(),rhos[i]);});
});
test('the current is 0 until the switch closes at 0.5 s, then I = V ÷ R',()=>{
 const m=make(0);assert.equal(m.current(.49),0);near(m.current(.5),12/2.2);near(m.current(3),12/2.2);near(m.resistance(),2.2);
 near(make(1).current(1),1.2e-14);near(make(4).resistance(),expected[4]);
});
test('the right length and area give the target currents: 10 Ω for the heater, the copper cable for the aluminium',()=>{
 const h=make(2);near(h.resistance(),10);near(h.current(1),1.2);near(h.target(),1.2);
 const a=make(3);near(a.resistance(),cu*100/1e-6);near(a.current(1),a.target());near(a.target(),12/1.68);
 assert.equal(make(0).target(),null);assert.equal(new Tester(2).length(),undefined);
});
test('the resistivity a right answer implies is the material\'s own',()=>{
 for(let i=0;i<5;i++)near(make(i).impliedRho(),rhos[i]);near(make(1,1.2e-10).impliedRho(),1e8);assert.equal(new Tester(0).impliedRho(),null);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(10);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%, a purely relative window even near 10⁻¹⁴ A; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(1,1e-30).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,22);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(expected[2]);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,26.4),'multiplied');assert.equal(slip(0,2.2/12),'inverted');assert.equal(slip(0,12/2.2e-6),'noMm');assert.equal(slip(0,3),null);
 assert.equal(slip(1,1.2e16),'multiplied');assert.equal(slip(1,1.2e-10),'noArea');assert.equal(slip(1,1.2e-12),'units');assert.equal(slip(1,1.2e-13),null);
 assert.equal(slip(2,22),'invertedLength');assert.equal(slip(2,10*.5/ni),'noMmLength');assert.equal(slip(2,9),null);
 assert.equal(slip(3,cu/al),'invertedArea');assert.equal(slip(3,1),'sameArea');assert.equal(slip(3,2),null);
 assert.equal(slip(4,gr*.06/(Math.PI*.7e-3**2)),'diameterAsRadius');assert.equal(slip(4,gr*.06/.35e-3**2),'noPi');assert.equal(slip(4,3),null);
});
test('answers are validated and nothing moves without one',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e21])assert.equal(new Tester(0).setAnswer(bad),false);assert.equal(new Tester(1).setAnswer(1e-14),true);
 const m=new Tester(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,22);m.advance(1.5);const n=new Tester();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,22);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-1},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Tester(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'tester-model'),script(source,'tester-model'));
 return mount(html,{scripts:['tester-model','tester-interface'],locale:'tester-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const four=x=>plain(Number(x.toPrecision(4)));
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>({x:four(new Tester(i).exact())});
 const ui=open(lang),done=()=>ui.el('tester-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'I =');assert.equal(ui.el('answer-unit').textContent,'A');
  assert.equal(ui.el('given-0').textContent,`L = 1 m · A = ${plain(.5)} mm² · 12 V`);assert.equal(ui.el('given-1').textContent,'L = 10 cm · A = 1 cm² · 12 V');assert.equal(ui.el('given-2').textContent,`A = ${plain(.5)} mm² · R = 10 Ω`);
  assert.equal(ui.el('given-3').textContent,'L = 100 m · Cu: 1 mm²');assert.equal(ui.el('given-4').textContent,`L = 6 cm · d = ${plain(.7)} mm`);
  for(const id of ['volt-value','res-value','cur-value','rho-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('tester-equation').textContent,'R = ρ·L ÷ A, I = V ÷ R');
  for(const key of ['viewTitle','ladderGraph','scaleNote','nichromeTag','copperTag','glassTag','rubberTag','dotNote','conductorsTag','insulatorsTag','panelHint','openTag'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the test starts, and the nichrome current is right on the first try`,()=>{
  ui.input('answer',5.45);assert.equal(ui.el('cur-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('volt-value').textContent,'12');assert.equal(ui.el('res-value').textContent,four(2.2));assert.equal(ui.el('cur-value').textContent,'0');assert.equal(ui.el('rho-value').textContent,four(ni));
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,l.switchCopy);assert.equal(ui.el('tester-equation').textContent,`I = V·A ÷ (ρ·L) = ${four(expected[0])} A`);
  ui.click('play');ui.run(()=>ui.el('cur-value').textContent!=='0');assert.equal(ui.el('cur-value').textContent,four(expected[0]));assert.equal(ui.el('lesson-copy').textContent,fill(l.currentCopy,{I:four(expected[0])}));
  ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.closedTag)&&ui.painted.includes(four(expected[0])+' A'));
 });
 test(`${lang}: the glass rod without its area, then right`,()=>{
  ui.click('mission-1');ui.input('answer','1.2e-10');ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(1.2e-10)+' A'})+' '+l.slipNoArea);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer','1.2e-14');ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
  assert.equal(ui.el('cur-value').textContent,four(1.2e-14));assert.equal(ui.el('res-value').textContent,four(1e15));
 });
 test(`${lang}: a heater wire built upside down, then the right length`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'L =');assert.equal(ui.el('answer-unit').textContent,'m');ui.input('answer',22);ui.click('play');
  const I=four(12/(ni*22/.5e-6));ui.run(()=>ui.el('lesson-copy').textContent===fill(l.compareCopy,{I,ref:four(1.2)}));assert.equal(ui.el('lesson-copy').textContent,fill(l.compareCopy,{I,ref:four(1.2)}));
  ui.run(done);assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(22)+' m'})+' '+l.slipInvertedLength);assert.ok(ui.painted.includes(fill(l.targetTag,{I:four(1.2)})));
  ui.input('answer',4.5455);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('tester-equation').textContent,`L = R·A ÷ ρ = ${num(expected[2],3)} m`);
 });
 test(`${lang}: the aluminium cable that matches the copper one`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-unit').textContent,'mm²');ui.input('answer',1.58);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.ok(ui.painted.includes(l.aluminiumTag));
  assert.equal(ui.el('tester-equation').textContent,`A_Al = A_Cu·ρ_Al ÷ ρ_Cu = ${num(expected[3],3)} mm²`);
 });
 test(`${lang}: a pencil lead, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');ui.input('answer',5.46);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('tester-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('tester-equation').textContent,`R = ρ·L ÷ (π·d² ÷ 4) = ${num(expected[4],3)} Ω`);assert.ok(ui.painted.includes(l.graphiteTag));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',22);en.click('play');en.run(()=>en.el('tester-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipInvertedLength));en.input('answer',4.5455);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'4.5455');assert.equal(es.el('tester-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('tester-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} material tester and multilingual interface checks passed.`);
