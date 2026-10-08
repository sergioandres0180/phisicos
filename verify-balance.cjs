// Formula Balance: equations as balances, same-on-both-sides algebra, one-sided slips, weighing, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/balance.html'),'utf8'),copy=require('./locales/balance.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'balance-model'),pure);const Balance=pure.BalanceModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// The fewest steps for each formula, all on both sides.
const solutions=[[['div','v']],[['div','a']],[['mul','t'],['div','v']],[['mul2'],['div','t'],['div','t']],[['mul2'],['div','m'],['sqrt']]];
const solve=i=>{const m=new Balance(i);for(const [op,sym] of solutions[i])assert.ok(m.apply(op,'both',sym));return m;};

test('formulas are written in their own letter order, with fractions and roots',()=>{
 assert.equal(new Balance(0).equation(),'d = v·t');assert.equal(new Balance(2).equation(),'v = d / t');assert.equal(new Balance(3).equation(),'x = ½·a·t²');
 assert.equal(solve(0).equation(),'d / v = t');assert.equal(solve(2).equation(),'t = d / v');assert.equal(solve(3).equation(),'2·x / t² = a');assert.equal(solve(4).equation(),'√(2·E / m) = v');
});
test('the fewest steps isolate the unknown, keep the balance level, and give its true value',()=>{
 solutions.forEach((s,i)=>{const m=solve(i);assert.ok(m.isolatedSide());assert.ok(m.balanced());near(m.result(),m.config.values[m.config.target]);assert.equal(m.steps,m.config.optimal);});
});
test('a step on one side only breaks the balance and tips the beam toward the heavier side',()=>{
 const m=new Balance(0);m.apply('div','right','v');assert.equal(m.equation(),'d = t');assert.equal(m.isolatedSide(),'right');assert.equal(m.balanced(),false);assert.ok(m.equilibrium()>0);
 m.advance(9);const e=m.evaluate();assert.equal(e.ok,false);assert.equal(e.slip,'oneSide');near(e.result,120);assert.equal(m.score(),0);
});
test('weighing needs the unknown isolated, settles exactly after 4 s, and scores the steps',()=>{
 const m=new Balance(0);assert.equal(m.advance(1),null);m.apply('div','both','v');assert.equal(m.advance(1),null);assert.equal(m.status,'weighing');
 m.advance(9);assert.equal(m.status,'done');near(m.t,4);assert.equal(m.score(),150);near(m.angle(4),0);
 const n=new Balance(0);n.apply('mul2','both');n.apply('div2','both');n.apply('div','both','v');n.advance(9);const e=n.evaluate();assert.ok(e.ok);assert.equal(e.fewest,false);assert.equal(e.slip,'long');assert.equal(n.score(),100);
 const tipped=new Balance(0);tipped.apply('div','right','v');near(tipped.angle(40),tipped.equilibrium(),1e-6);
});
test('undo, start over, and invalid operations',()=>{
 const m=new Balance(4);m.apply('mul2','both');m.apply('div','left','m');assert.equal(m.oneSided,true);assert.ok(m.undo());assert.equal(m.oneSided,false);assert.equal(m.steps,1);
 assert.equal(m.apply('mul','both','q'),false);assert.equal(m.apply('cube','both'),false);assert.equal(m.apply('sqrt','middle'),false);
 m.restart();assert.equal(m.equation(),'E = ½·m·v²');assert.equal(m.undo(),false);
 const k=new Balance(0);for(let i=0;i<12;i++)assert.ok(k.apply('mul2','both'));assert.equal(k.apply('mul2','both'),false);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=new Balance(3);m.apply('mul2','both');m.apply('div','both','t');const n=new Balance();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.equation(),'2·x / t = a·t');assert.equal(n.steps,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,left:{c:1,p:{q:1}}},{...s,steps:-1},{...s,status:'lost'},{...s,t:9},{...s,attempts:-1}]){const k=new Balance();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'balance-model'),script(source,'balance-model'));
 return mount(html,{scripts:['balance-model','balance-interface'],locale:'balance-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, the goal, and the balance on the canvas`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.buildTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('equation-now').textContent,'d = v·t');
  assert.equal(ui.el('question').textContent,fill(l.question,{s:'t'}));assert.equal(ui.el('sym-3').hidden,true);assert.equal(ui.el('op-div').textContent,'÷ d');
  assert.ok(ui.painted.includes(fill(l.canvasGoal,{s:'t'}))&&ui.painted.includes(l.leftSide)&&ui.painted.includes('d = v·t'));
 });
 test(`${lang}: dividing both sides by v isolates t and the balance stays level`,()=>{
  ui.click('sym-1');assert.equal(ui.el('op-div').textContent,'÷ v');ui.click('op-div');assert.equal(ui.el('equation-now').textContent,'d / v = t');
  assert.equal(ui.el('balance-status-text').textContent,l.isolated);assert.equal(ui.el('lesson-title').textContent,fill(l.isolatedTitle,{s:'t'}));
  ui.click('play');ui.run(()=>ui.el('balance-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,fill(l.goodTitle,{s:'t',r:plain(8)}));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('level-badge').classList.has('earned')&&ui.el('fewest-badge').classList.has('earned'));assert.ok(ui.painted.includes(fill(l.levelBanner,{s:'t',r:plain(8)})));
 });
 test(`${lang}: a step on one side only tips the balance, and the live view shows it at once`,()=>{
  ui.click('mission-0');ui.click('where-right');ui.click('sym-1');ui.click('op-div');assert.equal(ui.el('equation-now').textContent,'d = t');
  assert.equal(ui.el('tilt-value').textContent,(0).toLocaleString(lang,{minimumFractionDigits:1,maximumFractionDigits:1}));
  ui.el('show-live').checked=true;ui.el('show-live').events.change();assert.notEqual(ui.el('tilt-value').textContent,(0).toLocaleString(lang,{minimumFractionDigits:1,maximumFractionDigits:1}));
  ui.click('play');ui.run(()=>ui.el('balance-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.missCopy,{s:'t',r:plain(120),e:plain(8)})+' '+l.slipOneSide+' '+l.hint0);
  assert.ok(ui.el('insight').classList.has('warning'));assert.ok(ui.painted.includes(l.tippedBanner));
  ui.el('show-live').checked=false;ui.el('show-live').events.change();
 });
 test(`${lang}: undo, start over, and a focus loss while weighing`,()=>{
  ui.click('undo');assert.equal(ui.el('equation-now').textContent,'d = v·t');ui.click('where-both');ui.click('op-div');ui.click('restart');assert.equal(ui.el('equation-now').textContent,'d = v·t');
  ui.click('mission-4');assert.equal(ui.el('equation-now').textContent,'E = ½·m·v²');ui.click('op-mul2');ui.click('sym-1');ui.click('op-div');ui.click('op-sqrt');assert.equal(ui.el('equation-now').textContent,'√(2·E / m) = v');
  ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('balance-status-text').textContent,l.paused);
  const tilt=ui.el('tilt-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('tilt-value').textContent,tilt);
 });
}
test('changing language preserves formula, steps, and attempts',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.click('op-mul2');en.click('sym-2');en.click('op-div');
 en.links.find(l=>l.lang==='de').events.click();assert.equal(storage.size,1);
 const de=open('de',storage);assert.equal(storage.size,0);
 assert.equal(de.el('mission-3').attributes['aria-pressed'],'true');assert.equal(de.el('equation-now').textContent,'2·x / t = a·t');assert.equal(de.el('steps-value').textContent,'2');
 de.click('sym-2');de.click('op-div');de.click('play');de.run(()=>de.el('balance-status-text').textContent===copy.de.done);assert.equal(de.el('mission-score').textContent,'150');
});
console.log(`\n${checks} formula balance rearranging and multilingual interface checks passed.`);
