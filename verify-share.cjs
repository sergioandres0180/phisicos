// Touch and Share: conductors and insulators. Identical metal spheres share their charge equally, spheres joined by a
// long wire share it in proportion to their radii, plastic takes nothing, and the total never changes; contacts happen
// exactly on time, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/share.html'),'utf8'),copy=require('./locales/share.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'share-model'),pure);const Share=pure.ShareModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[6,3,12,4,1.5],durations=[2.5,5,2.5,2.5,5];
const make=(i,a=expected[i])=>{const m=new Share(i);assert.ok(m.setAnswer(a));return m;};
const sum=q=>q.reduce((a,b)=>a+b,0);

test('each test has the expected answer and length',()=>{
 expected.forEach((x,i)=>{const m=new Share(i);near(m.exact(),x);assert.equal(m.unit(),'nC');near(m.duration(),durations[i]);});
});
test('charge moves only at the instant of contact, and the total never changes',()=>{
 for(let i=0;i<5;i++){const m=make(i),q0=sum(m.config.spheres.map(s=>s.q));for(let t=0;t<=m.duration();t+=.05)near(sum(m.charges(t)),q0,1e-12);}
 const p=make(0);assert.equal(JSON.stringify(p.charges(1-1e-6)),'[12,0]');assert.equal(JSON.stringify(p.charges(1)),'[6,6]');assert.equal(JSON.stringify(p.charges(2.5)),'[6,6]');
 const r=make(1);assert.equal(JSON.stringify(r.charges(3.4)),'[6,6,0]');assert.equal(JSON.stringify(r.charges(3.5)),'[6,3,3]');
 const x=make(4);assert.equal(JSON.stringify(x.charges(1)),'[3,3,0]');assert.equal(JSON.stringify(x.charges(5)),'[3,1.5,1.5]');
});
test('plastic takes nothing, and a wire shares in proportion to the radii',()=>{
 assert.equal(JSON.stringify(make(2).charges(2.5)),'[12,0]');
 const s=make(3),q=s.charges(2.5);near(q[0]/3,q[1]/1);near(q[1],4);
});
test('the spheres close in, touch for 0.5 s, and part again',()=>{
 const m=make(1);near(m.closeness(0,0),0);near(m.closeness(0,.5),.5);near(m.closeness(0,1.2),1);near(m.closeness(0,2),.5);near(m.closeness(0,2.5),0);near(m.closeness(1,3.5),1);
 assert.equal(m.touching(0,.99),false);assert.equal(m.touching(0,1),true);assert.equal(m.touching(0,1.5),true);assert.equal(m.touching(0,1.51),false);assert.equal(m.touching(1,3.6),true);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);near(r.t,durations[i]);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(1);k.advance(10);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,4);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(3);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,12),'allMoved');assert.equal(slip(0,0),'noneMoved');assert.equal(slip(0,4),null);
 assert.equal(slip(1,4),'threeWay');assert.equal(slip(1,6),'firstOnly');assert.equal(slip(1,2),null);
 assert.equal(slip(2,6),'likeMetal');assert.equal(slip(2,0),'gaveAll');assert.equal(slip(2,8),null);
 assert.equal(slip(3,8),'equal');assert.equal(slip(3,12),'swapped');assert.equal(slip(3,1.6),'area');assert.equal(slip(3,5),null);
 assert.equal(slip(4,3),'firstOnlyMixed');assert.equal(slip(4,3.5),'ignoredSign');assert.equal(slip(4,2),'threeWayMixed');assert.equal(slip(4,-1.5),null);
});
test('answers are validated: charges may be signed or 0, and nothing moves without one',()=>{
 for(const bad of [NaN,Infinity,1e6+1,-1e6-1])assert.equal(new Share(0).setAnswer(bad),false);for(const ok of [0,-3,1e6])assert.equal(new Share(0).setAnswer(ok),true);
 const m=new Share(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,2);m.advance(1.2);const n=new Share();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1.2);assert.equal(n.answer,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,t:5.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Share(1);assert.equal(k.restore(bad),false);assert.equal(k.index,1);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'share-model'),script(source,'share-model'));
 return mount(html,{scripts:['share-model','share-interface'],locale:'share-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const signed=q=>q===0?'0':(q>0?'+':'')+plain(Number(q.toPrecision(4)));
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const values=i=>({x:plain(new Share(i).exact())});
 const ui=open(lang),done=()=>ui.el('share-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'Q_B =');assert.equal(ui.el('answer-unit').textContent,'nC');
  assert.equal(ui.el('given-0').textContent,'A +12 · B 0 nC');assert.equal(ui.el('given-1').textContent,'A +12 · B 0 · C 0 nC');assert.equal(ui.el('given-2').textContent,'A +12 · B 0 nC · B: PVC');
  assert.equal(ui.el('given-3').textContent,'A +16 nC, r 3 cm · B 0 nC, r 1 cm');assert.equal(ui.el('given-4').textContent,`A +10 · B ${signed(-4)} · C 0 nC`);
  for(const id of ['a-value','b-value','c-value','total-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('share-equation').textContent,'ΣQ = ΣQ₀');
  for(const key of ['viewTitle','chargeGraph','panelHint','scaleNote','markNote','metalTag'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the spheres move, and the pair is right on the first try`,()=>{
  ui.input('answer',6);assert.equal(ui.el('a-value').textContent,'—');
  ui.click('step');
  assert.equal(ui.el('a-value').textContent,'+12');assert.equal(ui.el('b-value').textContent,'0');assert.equal(ui.el('c-value').textContent,'—');assert.equal(ui.el('total-value').textContent,'+12');
  assert.equal(ui.el('time-value').textContent,num(.1));assert.equal(ui.el('lesson-copy').textContent,l.moveCopy);assert.equal(ui.el('share-equation').textContent,`Q_B = (12 + 0) ÷ 2 = ${plain(6)} nC`);
  ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===l.contactCopy);assert.equal(ui.el('lesson-copy').textContent,l.contactCopy);assert.equal(ui.el('b-value').textContent,'+6');
  ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(0))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes('+6 nC')&&ui.painted.includes(fill(l.totalCopy,{q:'+12'})));
 });
 test(`${lang}: passing it along, three ways at once and then in turn`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Q_A =');ui.input('answer',4);ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+fill(l.missCopy,{p:plain(4)+' nC'})+' '+l.slipThreeWay);assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',3);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(1))+' '+l.why1);
  assert.equal(ui.el('share-equation').textContent,`Q_A = 12 ÷ 2 ÷ 2 = ${plain(3)} nC`);assert.equal(ui.el('c-value').textContent,'+3');
 });
 test(`${lang}: metal meets plastic, and no charge flows`,()=>{
  ui.click('mission-2');ui.input('answer',6);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===l.noFlowCopy);assert.equal(ui.el('lesson-copy').textContent,l.noFlowCopy);ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(2))+' '+fill(l.missCopy,{p:plain(6)+' nC'})+' '+l.slipLikeMetal);assert.ok(ui.painted.includes(l.plasticTag));
  ui.input('answer',12);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('share-equation').textContent,`Q_A = ${plain(12)} nC, ΔQ = 0`);
 });
 test(`${lang}: big and small, joined by a wire`,()=>{
  ui.click('mission-3');ui.input('answer',4);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent===l.wireCopy);assert.equal(ui.el('lesson-copy').textContent,l.wireCopy);ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(3))+' '+l.why3);assert.ok(ui.painted.includes(l.wireTag));
  assert.equal(ui.el('share-equation').textContent,`Q_B = 16 × 1 ÷ (3 + 1) = ${plain(4)} nC`);assert.equal(ui.el('a-value').textContent,'+12');
 });
 test(`${lang}: plus meets minus, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'Q_C =');ui.input('answer',1.5);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('share-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(4))+' '+l.why4);
  assert.equal(ui.el('share-equation').textContent,`Q_C = (10 − 4) ÷ 2 ÷ 2 = ${plain(1.5)} nC`);assert.equal(ui.el('c-value').textContent,signed(1.5));assert.equal(ui.el('total-value').textContent,'+6');
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',4);en.click('play');en.run(()=>en.el('share-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipThreeWay));en.input('answer',3);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'3');assert.equal(es.el('share-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('share-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} touch and share and multilingual interface checks passed.`);
