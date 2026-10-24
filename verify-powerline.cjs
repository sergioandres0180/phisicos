// Power Line: a line carries I = P ÷ V and loses P_loss = I²·R; the loss at 1000 V and at 10 kV, the voltage that loses
// 1%, a line's heating, and a heater at the house; slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/powerline.html'),'utf8'),copy=require('./locales/powerline.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'powerline-model'),pure);const Pow=pure.PowerlineModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const expected=[5000,50,1e6/Math.sqrt(5000),1600,26.45],units=['W','W','V','W','Ω'];
const make=(i,a=expected[i])=>{const m=new Pow(i);assert.ok(m.setAnswer(a));return m;};
// The heater test's figures: the house takes V² ÷ R and the line carries that, plus its own small loss, at 11 kV.
const heaterRun=R=>{const h=230*230/R,i=h/11000,full=h+i*i*4,I=full/11000;return {full,I,loss:I*I*4};};

test('each test has the expected answer and unit; every run lasts 3 s',()=>{
 near(expected[2],14142.1356,1e-8);
 expected.forEach((x,i)=>{const m=new Pow(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);assert.equal(m.duration(),3);});
});
test('I = P ÷ V and P_loss = I²·R: ten times the voltage, a hundredth of the loss',()=>{
 const l=make(0),h=make(1);near(l.current(3),100);near(l.loss(3),5000);near(l.delivered(3),95000);near(h.current(3),10);near(l.loss(3)/h.loss(3),100);near(l.sent(1),5e4);
 const d=make(2);near(d.loss(3)/d.sent(3),.01);assert.equal(new Pow(2).current(3),0);
 const s=make(3);near(s.current(3),20);near(s.loss(3),1600);
 const q=make(4),f=heaterRun(26.45);near(q.heater(),2000);near(q.sent(3),f.full);near(q.loss(3),f.loss);
});
test('every run ends exactly inside long steps',()=>{
 for(let i=0;i<5;i++){const p=make(i),q=make(i);const r=p.advance(1e6);assert.equal(r.done,true);assert.equal(r.t,3);while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const m=make(1);m.advance(10);const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('answers count within 2%, purely relative; a run counts as soon as it starts',()=>{
 for(let i=0;i<5;i++){const x=expected[i];assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(2,200);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(14142);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2e6),'VsquaredR');assert.equal(slip(0,50),'drop');assert.equal(slip(0,500),null);
 assert.equal(slip(1,500),'tenth');assert.equal(slip(1,5000),'same');assert.equal(slip(1,5),null);
 assert.equal(slip(2,200),'noRoot');assert.equal(slip(2,70.71),'current');assert.equal(slip(2,1e5),null);
 assert.equal(slip(3,80),'IR');assert.equal(slip(3,160),null);
 assert.equal(slip(4,.115),'VoverP');assert.equal(slip(4,8.696),'currentHeater');assert.equal(slip(4,230),null);
});
test('answers are validated, and nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,2e9])assert.equal(new Pow(0).setAnswer(bad),false);for(const bad of [0,2e7])assert.equal(new Pow(2).setAnswer(bad),false);
 assert.equal(new Pow(2).setAnswer(1e7),true);assert.equal(new Pow(4).setAnswer(1e9),true);
 const m=new Pow(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,200);m.advance(1.5);const n=new Pow();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,2);assert.equal(n.attempts,1);near(n.t,1.5);assert.equal(n.answer,200);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:-4},{...s,t:3.1},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const q=new Pow(2);assert.equal(q.restore(bad),false);assert.equal(q.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'powerline-model'),script(source,'powerline-model'));
 return mount(html,{scripts:['powerline-model','powerline-interface'],locale:'powerline-locale',langs,storage});
};
const sup=p=>String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
for(const lang of langs){
 const l=copy[lang],fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,key)=>x[key]??'{'+key+'}');
 const plain=n=>{const a=Math.abs(n);if(a&&(a<1e-3||a>=1e7)){let p=Math.floor(Math.log10(a)),m=Number((n/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);}return n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');};
 const sig=x=>Number(x.toPrecision(10)).toLocaleString(lang,{maximumSignificantDigits:4,useGrouping:false});
 const amount=(v,u)=>plain(Number(v.toPrecision(5)))+(u?' '+u:'');
 const values=expected.map(x=>({x:sig(x)}));
 const ui=open(lang),done=()=>ui.el('powerline-status-text').textContent===l.done;
 const result=(i,p,slip)=>fill(l['result'+i],values[i])+' '+fill(l.missCopy,{p})+' '+l[slip];
 const meters=(P,I,L)=>{assert.equal(ui.el('sent-value').textContent,sig(P));assert.equal(ui.el('current-value').textContent,sig(I));assert.equal(ui.el('loss-value').textContent,sig(L));};
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);
  assert.equal(ui.el('answer-symbol').textContent,'P_loss =');assert.equal(ui.el('answer-unit').textContent,'W');
  assert.equal(ui.el('given-0').textContent,fill(l.givenLow,{P:plain(100),V:plain(1000),R:plain(.5)}));assert.equal(ui.el('given-1').textContent,fill(l.givenHigh,{V:plain(10000)}));
  assert.equal(ui.el('given-2').textContent,fill(l.givenDesign,{P:plain(1000),R:plain(2),s:plain(1)}));assert.equal(ui.el('given-3').textContent,fill(l.givenLoss,{I:plain(20),R:plain(4)}));
  assert.equal(ui.el('given-4').textContent,fill(l.givenHeater,{H:plain(2000),h:plain(230)}));
  for(const id of ['sent-value','current-value','loss-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('powerline-equation').textContent,'P_loss = I²·R, I = P ÷ V');
  for(const key of ['viewTitle','lossGraph','scaleNote','panelHint','stationTag','stepUpTag','stepDownTag','townTag'])assert.ok(ui.painted.includes(l[key]),key);
  for(const s of ['I = ? A','? W',`${plain(1000)} V · ${fill(l.lineTag,{R:plain(.5)})}`])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: at 1000 V, right on the first try`,()=>{
  ui.input('answer',5000);assert.equal(ui.el('loss-value').textContent,'—');ui.click('step');assert.ok(ui.el('lesson-copy').textContent.startsWith(l.rampCopy.split('{')[0]));
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  meters(1e5,100,5000);assert.equal(ui.el('powerline-equation').textContent,`I = 100000 ÷ 1000 = 100 A, P_loss = 100² × ${plain(.5)} = 5000 W`);assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values[0])+' '+l.why0);
  for(const s of [l.rightBanner,l.guessTag+': '+plain(5000)+' W',fill(l.shareTag,{p:sig(5)}),l.sentBar,l.lostBar,l.deliveredBar,sig(95000)+' W','I = '+sig(100)+' A'])assert.ok(ui.painted.includes(s),s);
 });
 test(`${lang}: at 10 kV, a tenth, then right`,()=>{
  ui.click('mission-1');ui.input('answer',500);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,result(1,amount(500,'W'),'slipTenth'));assert.ok(ui.painted.includes(l.offBanner));
  ui.input('answer',50);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values[1])+' '+l.why1);
  meters(1e5,10,50);
 });
 test(`${lang}: losing only 1%, no root, then right; your voltage goes on the line`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'V =');assert.equal(ui.el('answer-unit').textContent,'V');assert.ok(ui.painted.includes(`? V · ${fill(l.lineTag,{R:plain(2)})}`));
  ui.input('answer',200);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(2,amount(200,'V'),'slipNoRoot'));
  ui.input('answer',14142);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values[2])+' '+l.why2);
  const I=1e6/14142;meters(1e6,I,I*I*2);
 });
 test(`${lang}: a line's heating, I·R, then right; focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',80);ui.click('play');ui.run(done);assert.equal(ui.el('lesson-copy').textContent,result(3,amount(80,'W'),'slipIR'));
  ui.input('answer',1600);ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('powerline-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values[3])+' '+l.why3);
  meters(2.2e5,20,1600);assert.equal(ui.el('powerline-equation').textContent,'P_loss = I²·R = 20² × 4 = 1600 W');
 });
 test(`${lang}: the heater, V over P, then right; your heater goes in the house`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'R =');assert.equal(ui.el('answer-unit').textContent,'Ω');assert.ok(ui.painted.includes('R = ?')&&ui.painted.includes(fill(l.heaterTag,{P:'?'})));
  ui.input('answer',.115);ui.click('play');ui.run(()=>ui.el('lesson-copy').textContent.startsWith(l.heaterCopy.split('{')[0])&&ui.el('powerline-status-text').textContent===l.running);ui.run(done);
  assert.equal(ui.el('lesson-copy').textContent,result(4,amount(.115,'Ω'),'slipVoverP'));
  ui.input('answer',26.45);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values[4])+' '+l.why4);
  const f=heaterRun(26.45);meters(f.full,f.I,f.loss);assert.ok(ui.painted.includes(fill(l.heaterTag,{P:sig(2000)})));
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('answer',200);en.click('play');en.run(()=>en.el('powerline-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipNoRoot));en.input('answer',14142);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-2').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'14142');assert.equal(es.el('powerline-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('powerline-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} power line and multilingual interface checks passed.`);
