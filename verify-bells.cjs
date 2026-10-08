// Galileo's Bells: motion from rest, exact ring times, the odd-number rule, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/bells.html'),'utf8'),copy=require('./locales/bells.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'bells-model'),pure);const Bells=pure.BellsModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const answers=[[.5,2,4.5,8],[1,4,9,16],[2,8,18,32]];
const make=(i,bells=answers[i])=>{const m=new Bells(i);bells.forEach((d,k)=>assert.ok(m.setBell(k,d)));return m;};
const findA=(a=1.5)=>{const m=new Bells(3);assert.ok(m.setAcceleration(a));return m;};

test('each ramp has the expected bell positions, and the gaps follow 1 : 3 : 5 : 7',()=>{
 answers.forEach((p,i)=>new Bells(i).exact().forEach((d,k)=>near(d,p[k])));near(new Bells(3).exact(),1.5);
 for(const p of answers){const gaps=p.map((d,k)=>d-(p[k-1]||0));gaps.forEach((g,k)=>near(g/gaps[0],2*k+1));}
});
test('from rest, x = ½·a·t² and v = a·t, up to the end stop',()=>{
 const m=make(1);near(m.x(1.5),2.25);near(m.v(1.5),3);near(m.endTime(),Math.sqrt(34));near(m.x(10),34);near(m.v(10),2*Math.sqrt(34));
});
test('each bell rings exactly on its beat when placed correctly, for every ramp',()=>{
 for(const m of [make(0),make(1),make(2),findA()])m.rings().forEach((r,k)=>near(r.t,(k+1)*m.config.beat));
});
test('rings inside a long step are reported exactly, and the end stop freezes the run',()=>{
 const m=make(0);const e=m.advance(2.5);assert.deepEqual([...e.rung],[0,1]);assert.equal(e.done,false);near(m.t,2.5);
 const f=m.advance(5);assert.deepEqual([...f.rung],[2,3]);assert.equal(f.done,true);near(m.t,6);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(2),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(2),b=make(2);a.advance(1e3);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('a steady beat earns 100, plus 50 only on the first run, within ±0.05 s',()=>{
 const m=make(0);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(0,[.5,2,4.5,7]);n.advance(1e3);assert.equal(n.score(),0);n.setBell(3,8);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
 assert.ok(make(0,[.5*1.04**2,2,4.5,8]).evaluate().ok);assert.ok(!make(0,[.5*1.06**2,2,4.5,8]).evaluate().ok);
 assert.ok(make(1,[16,9,4,1]).evaluate().ok,'bells may be typed in any order');
});
test('classic slips are recognized',()=>{
 const slip=(i,p)=>make(i,p).evaluate().slip;
 assert.equal(slip(0,[1,4,9,16]),'noHalf');assert.equal(slip(0,[1,2,3,4]),'speed');assert.equal(slip(0,[.5,1,1.5,2]),'even');assert.equal(slip(1,[4,8,12,16]),'even');
 assert.equal(slip(0,[.5,2,4.5,7]),null);assert.equal(findA(.75).evaluate().slip,'halfA');assert.equal(findA(2).evaluate().slip,null);
 const e=make(1,[4,8,12,16]).evaluate();assert.equal(e.worst,0);near(e.errors[0],1);
});
test('inputs must fit the ramp, the fixed bells cannot move, and nothing rolls until every value is set',()=>{
 const m=new Bells(0);for(const bad of [0,-1,18.5,NaN])assert.equal(m.setBell(0,bad),false);assert.equal(m.setAcceleration(1),false);
 m.setBell(0,.5);assert.equal(m.ready(),false);assert.equal(m.advance(5),null);assert.equal(m.t,0);
 const f=new Bells(3);assert.equal(f.setBell(0,1),false);for(const bad of [0,-1,6,NaN])assert.equal(f.setAcceleration(bad),false);assert.equal(f.ready(),false);
 const r=make(0);r.advance(1);r.setBell(3,8);assert.equal(r.t,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(0,[1,2,3,4]);m.advance(1e3);m.setBell(0,.5);m.advance(1.5);const n=new Bells();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1.5);assert.deepEqual([...n.bells],[.5,2,3,4]);
 const s=m.snapshot();for(const bad of [{...s,index:4},{...s,bells:[1,2,3]},{...s,bells:[1,2,3,99]},{...s,a:3},{...s,t:1e6},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Bells();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
 const fixed=findA(1.2).snapshot();assert.equal(new Bells().restore(fixed),true);assert.equal(new Bells().restore({...fixed,bells:[1,3,6.75,12]}),false);
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'bells-model'),script(source,'bells-model'));
 return mount(html,{scripts:['bells-model','bells-interface'],locale:'bells-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('bells-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('question').textContent,l.questionPositions);assert.equal(ui.el('accel-row').hidden,true);assert.equal(ui.el('rung-value').textContent,'0 / 4');
  assert.ok(ui.painted.includes(l.rampTitle)&&ui.painted.includes(l.rhythmTitle)&&ui.painted.includes('4 s'));
 });
 test(`${lang}: four bells on the beat on the first run earn the bonus`,()=>{
  answers[0].forEach((d,i)=>ui.input('bell-'+i,d));assert.equal(ui.el('lesson-title').textContent,l.readyTitle);
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('bells-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('bells-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.goodCopy,{max:fmt(0)})+' '+l.why0);assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('beat-badge').classList.has('earned')&&ui.el('first-badge').classList.has('earned'));assert.equal(ui.el('rung-value').textContent,'4 / 4');
  assert.equal(ui.el('position-value').textContent,fmt(18));assert.ok(ui.painted.includes(l.beatBanner));
 });
 test(`${lang}: equally spaced bells are explained`,()=>{
  ui.click('mission-1');assert.equal(ui.el('play').disabled,true);[4,8,12,16].forEach((d,i)=>ui.input('bell-'+i,d));
  ui.click('play');ui.run(()=>ui.el('bells-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.missLateCopy,{n:1,e:fmt(1)})+' '+l.slipEven);
  assert.ok(ui.el('insight').classList.has('warning'));assert.equal(ui.el('mission-score').textContent,'0');
  answers[1].forEach((d,i)=>ui.input('bell-'+i,d));ui.click('play');ui.run(()=>ui.el('bells-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');assert.ok(!ui.el('first-badge').classList.has('earned'));
 });
 test(`${lang}: the fixed bells ask for the acceleration instead`,()=>{
  ui.click('mission-3');assert.equal(ui.el('accel-row').hidden,false);assert.equal(ui.el('bell-0').disabled,true);assert.equal(ui.el('bell-3').value,'12');assert.equal(ui.el('question').textContent,l.questionAcceleration);
  ui.input('accel',.75);ui.click('play');ui.run(()=>ui.el('bells-status-text').textContent===l.done);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipHalfA));
  ui.input('accel',1.5);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('bells-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves ramp, bells, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');[2,8,18,30].forEach((d,i)=>en.input('bell-'+i,d));en.click('play');en.run(()=>en.el('bells-status-text').textContent===copy.en.done);en.input('bell-3',32);en.click('step');
 en.links.find(l=>l.lang==='fi').events.click();assert.equal(storage.size,1);
 const fi=open('fi',storage);assert.equal(storage.size,0);
 assert.equal(fi.el('mission-2').attributes['aria-pressed'],'true');assert.equal(fi.el('bell-3').value,'32');assert.equal(fi.el('bells-status-text').textContent,copy.fi.paused);
 fi.click('play');fi.run(()=>fi.el('bells-status-text').textContent===copy.fi.done);assert.equal(fi.el('mission-score').textContent,'100');
});
console.log(`\n${checks} galileo's bells uniform-acceleration and multilingual interface checks passed.`);
