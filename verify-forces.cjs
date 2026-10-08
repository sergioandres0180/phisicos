// Force Table: vector sums, friction-limited equilibrium, exact slip events, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/forces.html'),'utf8'),copy=require('./locales/forces.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'forces-model'),pure);const Force=pure.ForceModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const make=(level,magnitude,angle)=>{const m=new Force(level);assert.ok(m.setYours(magnitude,angle));return m;};
// The exact balancing force for each level, and a slider-reachable approximation (0.01 N, 0.5° steps).
const exact=level=>{const s=Force.levels[level].forces.reduce((p,[m,a])=>{const v=Force.vec(m,a);return {x:p.x-v.x,y:p.y-v.y};},{x:0,y:0});return [Math.hypot(s.x,s.y),Force.direction(s.x,s.y)];};
const slider=[[2,180],[5,233],[2.56,244.5],[2.44,259]];

test('the exact balancing force cancels the given forces for every level',()=>{for(let i=0;i<Force.levels.length;i++){const m=make(i,...exact(i));near(m.netMagnitude(),0,1e-9);}});
test('right-angle strings of 3 N and 4 N need exactly 5 N at 233.13°',()=>{const [m,a]=exact(1);near(m,5);near(a,233.1301,1e-6);const t=make(1,m,a);near(t.sumMagnitudes(),12);});
test('slider-reachable settings balance every level within static friction',()=>{slider.forEach(([m,a],i)=>{const t=make(i,m,a);assert.ok(t.balanced(),`level ${i}: ${t.netMagnitude()} N`);assert.ok(t.netMagnitude()<=.05);});});
test('a balanced ring holds still and ends exactly at the hold time',()=>{
 const m=make(1,5,233);assert.equal(m.advance(.3),null);assert.equal(m.displacement(),0);const e=m.advance(1);near(e.t,.5);assert.equal(m.status,'held');assert.equal(m.attempts,1);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('an unbalanced ring accelerates along ΣF and stops exactly at the pin',()=>{
 const m=make(0,1,180);near(m.netMagnitude(),1);near(Force.direction(m.net().x,m.net().y),0,1e-9);near(m.acceleration(),(1-.04)/.2);
 const e=m.advance(1);near(e.t,Math.sqrt(.08/4.8));assert.equal(m.status,'slipped');near(m.displacement(),.04);
});
test('static friction threshold separates holding from sliding',()=>{
 const hold=make(0,1.95,180);near(hold.netMagnitude(),.05);assert.ok(hold.balanced());
 const slide=make(0,1.949,180);assert.ok(!slide.balanced());assert.ok(slide.acceleration()>0);
});
test('slip time is independent of timestep partitioning',()=>{const a=make(3,1,0),b=make(3,1,0);a.advance(10);while(b.status==='active')b.advance(.001);near(a.t,b.t,1e-12);});
test('the sum of magnitudes never predicts motion; only the vector sum does',()=>{
 const balanced=make(1,5,233),unbalanced=make(1,5,53);near(balanced.sumMagnitudes(),unbalanced.sumMagnitudes());assert.ok(balanced.balanced());assert.ok(!unbalanced.balanced());near(unbalanced.netMagnitude(),10,1e-3);
});
test('score rewards balance, no helper, and a first try',()=>{
 const best=make(1,5,233);best.advance(1);assert.equal(best.score(),150);
 const helped=make(1,5,233);helped.helperUsed=true;helped.advance(1);assert.equal(helped.score(),120);
 const retry=make(1,1,0);retry.advance(1);assert.equal(retry.score(),0);retry.setYours(5,233);retry.advance(1);assert.equal(retry.attempts,2);assert.equal(retry.score(),130);
});
test('invalid forces are rejected and edits reset the ring',()=>{const m=make(0,1,180);m.advance(.05);assert.equal(m.setYours(7,0),false);assert.equal(m.setYours(1,360),false);assert.ok(m.t>0);m.setYours(2,180);assert.equal(m.t,0);});
test('language transfer snapshot restores and rejects inconsistent values',()=>{
 const m=make(2,2.56,244.5);m.helperUsed=true;m.advance(.2);const n=new Force();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.level,2);near(n.t,.2);assert.equal(n.helperUsed,true);
 for(const bad of [{...m.snapshot(),level:5},{...m.snapshot(),yours:{magnitude:9,angle:0}},{...m.snapshot(),status:'slipped'},{...m.snapshot(),t:9},{...m.snapshot(),attempts:-1}]){const k=new Force();assert.equal(k.restore(bad),false);assert.equal(k.level,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'forces-model'),script(source,'forces-model'));
 return mount(html,{scripts:['forces-model','forces-interface'],locale:'forces-locale',langs,storage});
};
const set=(ui,m,a)=>{ui.input('magnitude',m);ui.input('angle',a);};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state hides the net force and shows the scalar sum`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('force-status-text').textContent,l.ready);
  assert.equal(ui.el('net-value').textContent,'?');assert.equal(ui.el('net-note').textContent,l.hiddenUntilLaunch);assert.equal(ui.el('sum-value').textContent,fmt(3));
  assert.equal(ui.el('given-2').textContent,'F₁ = '+(2.5).toLocaleString(lang)+' N @ 30° · F₂ = '+(1.5).toLocaleString(lang)+' N @ 135°');
  assert.ok(ui.painted.includes('0°')&&ui.painted.includes('90°'));
 });
 test(`${lang}: an opposite string balances the ring on the first try`,()=>{
  set(ui,2,180);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.01,3));assert.equal(ui.el('lesson-title').textContent,l.holdingTitle);
  ui.click('play');ui.run(()=>ui.el('force-status-text').textContent===l.held);
  assert.equal(ui.el('lesson-title').textContent,l.heldTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('net-magnitude-value').textContent,fmt(0));
  assert.ok(['balanced-badge','helper-badge','first-badge'].every(id=>ui.el(id).classList.has('earned')));assert.ok(ui.painted.includes(l.heldBanner));
 });
 test(`${lang}: an unbalanced table slips, then a helped retry still balances`,()=>{
  ui.click('level-1');assert.equal(ui.el('lesson-title').textContent,l.predictManyTitle);set(ui,1,180);ui.click('play');ui.run(()=>ui.el('force-status-text').textContent===l.slipped);
  assert.ok(ui.el('lesson-title').textContent.startsWith(l.slippedTitle.split('{')[0]));assert.equal(ui.el('ring-value').textContent,fmt(40,1));assert.equal(ui.el('mission-score').textContent,'0');
  ui.el('show-helper').checked=true;ui.el('show-helper').events.change({});assert.ok(ui.painted.includes(l.helperTitle));
  set(ui,5,233);ui.click('play');ui.run(()=>ui.el('force-status-text').textContent===l.held);
  assert.equal(ui.el('mission-score').textContent,'100');assert.ok(!ui.el('helper-badge').classList.has('earned'));assert.ok(!ui.el('first-badge').classList.has('earned'));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('level-2');set(ui,1,0);ui.click('play');ui.run(()=>false,{limit:1});ui.windowEvents.get('blur')();assert.equal(ui.el('force-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves table, string, helper, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('level-3');set(en,2.44,259);en.el('show-helper').checked=true;en.el('show-helper').events.change({});en.click('step');
 en.links.find(l=>l.lang==='fr').events.click();assert.equal(storage.size,1);
 const fr=open('fr',storage);assert.equal(storage.size,0);
 assert.equal(fr.el('level-3').attributes['aria-pressed'],'true');assert.equal(fr.el('magnitude').value,'2.44');assert.equal(fr.el('angle').value,'259');assert.equal(fr.el('show-helper').checked,true);
 assert.equal(fr.el('time-value').textContent,(.01).toLocaleString('fr',{minimumFractionDigits:3}));assert.equal(fr.el('force-status-text').textContent,copy.fr.paused);
});
console.log(`\n${checks} force table vector-sum and multilingual interface checks passed.`);
