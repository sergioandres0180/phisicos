// Graph Rider: piecewise-constant acceleration, exact v–t and x–t, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/graph.html'),'utf8'),copy=require('./locales/graph.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'graph-model'),pure);const Graph=pure.GraphModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const plans=[[1.5,0],[2,0,-1.5],[-1,0,.5],[-2,0,1]];
const make=(i,plan=plans[i])=>{const m=new Graph(i);plan.forEach((a,k)=>assert.ok(m.setAcceleration(k,a)));return m;};

test('each target has the expected slopes, displacement, and final velocity',()=>{
 plans.forEach((p,i)=>assert.deepEqual([...new Graph(i).exact()],p));
 const ends=[[36,6],[39,0],[52,6],[-16,0]];
 ends.forEach(([x,v],i)=>{const pts=new Graph(i).targetPoints(),e=pts[pts.length-1];near(e.x,x);near(e.v,v);});
});
test('velocity is continuous and position follows x = x₀ + v₀t + ½at² on each leg',()=>{
 const m=make(1);near(m.state(1.5).v,3);near(m.state(1.5).x,2.25);near(m.state(3).v,6);near(m.state(4.5).x,9+9);near(m.state(8).v,6-1.5*2);near(m.state(8).x,27+12-3);
 for(const t of [3,6])near(m.state(t-1e-9).v,m.state(t+1e-9).v,1e-6);
 assert.equal(m.state(2).a,2);assert.equal(m.state(5).a,0);assert.equal(m.state(9).a,-1.5);
});
test('passing through zero velocity reverses the cart while the acceleration stays the same',()=>{
 const m=make(3);near(m.state(2).v,0);assert.equal(m.state(2).a,-2);assert.equal(m.state(2.5).a,-2);assert.ok(m.state(3).v<0);
 near(m.state(2).x,4);near(m.state(4).x,0);near(m.distance(10),24);near(m.state(10).x,-16);
});
test('distance is never less than |displacement|',()=>{for(let i=0;i<4;i++){const m=make(i);for(const t of [1,3.3,5,7.7,10])if(t<=m.duration())assert.ok(m.distance(t)>=Math.abs(m.state(t).x)-1e-9);}});
test('the run ends exactly inside a long step, then freezes',()=>{
 const m=make(0);assert.equal(m.advance(7.9),null);const e=m.advance(5);near(e.t,8);assert.equal(m.status,'done');near(m.state(m.now()).x,36);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(2),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2),b=make(2);a.advance(1e3);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('matching every leg earns 100, plus 50 only on the first run',()=>{
 const m=make(1);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(1,[2,0,-1]);n.advance(1e3);assert.equal(n.score(),0);n.setAcceleration(2,-1.5);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
 assert.equal(make(0).score(),0);
});
test('slips are recognized for the first wrong leg, and the widest gap is at a leg boundary',()=>{
 const slip=(i,p)=>make(i,p).evaluate();
 assert.equal(slip(0,[1.5,.5]).slip,'flat');assert.equal(slip(0,[1.5,.5]).wrong,1);
 assert.equal(slip(1,[2,0,1.5]).slip,'sign');assert.equal(slip(3,[2,0,1]).slip,'sign');
 assert.equal(slip(2,[0,0,.5]).slip,'zero');assert.equal(slip(2,[-1,0,-1]).slip,'direction');
 assert.equal(slip(0,[3,0]).slip,'steep');assert.equal(slip(0,[1,0]).slip,'shallow');
 near(slip(0,[1,0]).gap,2);near(slip(1,[2,0,1.5]).gap,12);assert.equal(slip(1,plans[1]).slip,null);
});
test('accelerations must be finite and within ±3 m/s², and edits restart the run',()=>{
 const m=make(0);m.advance(3);for(const bad of [NaN,Infinity,3.5,-4])assert.equal(m.setAcceleration(0,bad),false);assert.equal(m.setAcceleration(2,1),false);
 assert.equal(m.t,3);m.setAcceleration(0,1);assert.equal(m.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,[1,0,1]);m.advance(1e3);m.setAcceleration(0,-2);m.advance(4);const n=new Graph();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,4);assert.deepEqual([...n.plan],[-2,0,1]);
 const s=m.snapshot();for(const bad of [{...s,index:4},{...s,plan:[1,0]},{...s,plan:[9,0,1]},{...s,t:1e6},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Graph();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'graph-model'),script(source,'graph-model'));
 return mount(html,{scripts:['graph-model','graph-interface'],locale:'graph-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, leg labels, hidden third leg, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.readyTitle);assert.equal(ui.el('graph-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,false);
  assert.equal(ui.el('acc-0-label').textContent,fill(l.legLabel,{n:1,t1:0,t2:4}));assert.equal(ui.el('leg-field-2').hidden,true);
  assert.ok(ui.painted.includes(l.ghostLabel)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes(fill(l.legShort,{n:2})));
 });
 test(`${lang}: the right slopes on the first run earn the bonus`,()=>{
  ui.input('acc-0',1.5);assert.equal(ui.el('acc-0-value').textContent,'a₁ = +'+fmt(1.5,1)+' m/s²');
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('graph-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('graph-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.why0));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('match-badge').classList.has('earned')&&ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('disp-value').textContent,'+'+fmt(36));assert.equal(ui.el('velocity-value').textContent,'+'+fmt(6));
 });
 test(`${lang}: a slope with the wrong sign is explained for the right leg`,()=>{
  ui.click('mission-1');assert.equal(ui.el('leg-field-2').hidden,false);assert.equal(ui.el('acc-2-label').textContent,fill(l.legLabel,{n:3,t1:6,t2:10}));
  ui.input('acc-0',2);ui.input('acc-2',1.5);ui.click('play');ui.run(()=>ui.el('graph-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,fill(l.missTitle,{n:3}));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.missCopy,{t1:6,t2:10,gap:fmt(12,1)})+' '+fill(l.slipSign,{n:3}));
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');
  ui.input('acc-2',-1.5);ui.click('play');ui.run(()=>ui.el('graph-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(!ui.el('first-badge').classList.has('earned'));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('graph-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves target, plan, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.input('acc-0',-1);en.input('acc-2',1);en.click('play');en.run(()=>en.el('graph-status-text').textContent===copy.en.done);en.input('acc-2',.5);en.click('step');
 en.links.find(l=>l.lang==='de').events.click();assert.equal(storage.size,1);
 const de=open('de',storage);assert.equal(storage.size,0);
 assert.equal(de.el('mission-2').attributes['aria-pressed'],'true');assert.equal(de.el('acc-2').value,'0.5');assert.equal(de.el('graph-status-text').textContent,copy.de.paused);
 de.click('play');de.run(()=>de.el('graph-status-text').textContent===copy.de.done);assert.equal(de.el('mission-score').textContent,'100');
});
console.log(`\n${checks} graph rider velocity–time and multilingual interface checks passed.`);
