// Formula Test Drive: rearranged-formula choices, unit checks, exact runs with the chosen value, slips, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/pickform.html'),'utf8'),copy=require('./locales/pickform.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'pickform-model'),pure);const Pick=pure.PickModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const make=(i,c=Pick.missions[i].correct)=>{const m=new Pick(i);assert.ok(m.choose(c));return m;};

test('the right formula gives the expected value and exactly reaches the goal in every situation',()=>{
 const values=[6,2.5,40,5,10];
 Pick.missions.forEach((_,i)=>{const m=make(i);near(m.chosen(),values[i]);near(m.outcome(),0,1e-9);assert.ok(m.unitsMatch(m.choice));});
});
test('wrong formulas drive the car to the wrong place or speed',()=>{
 near(make(0,0).outcome(),-150+25/6);near(make(2,0).outcome(),-40);near(make(2,1).outcome(),38);near(make(4,1).outcome(),-5);near(make(1,0).outcome(),10);near(make(3,2).outcome(),-37.5);
});
test('units catch most mistakes, but not all of them',()=>{
 assert.equal(make(0,0).unitsMatch(0),false);assert.equal(make(0,3).unitsMatch(3),false);assert.equal(make(1,0).unitsMatch(0),true);assert.equal(make(2,0).unitsMatch(0),true);
 const slips=Array.from(Pick.missions,m=>m.options.map(o=>o.slip||'-').join(','));assert.deepEqual(slips,['inverted,-,product,mixed','sign,mixed,-,inverted','factor,square,inverted,-','-,root,factor,inverted','root,factor,inverted,-']);
});
test('long runs play faster but still end exactly at the end of the motion',()=>{
 const m=make(0,2);near(m.duration(),3750);near(m.playback(),3750/8);const e=m.advance(1e4);near(e.t,3750);assert.equal(m.status,'done');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);assert.equal(make(0).playback(),1);
 const a=make(2),b=make(2);a.advance(99);while(b.status!=='done')b.advance(1/120);near(a.t,b.t,1e-12);near(b.state(b.now()).x,0,1e-9);
});
test('the right formula earns 100, plus 50 only on the first drive; nothing drives without a choice',()=>{
 const m=make(3);m.advance(99);assert.equal(m.score(),150);
 const n=make(3,1);n.advance(99);assert.equal(n.score(),0);n.choose(0);n.advance(99);assert.equal(n.score(),100);
 const blank=new Pick(0);assert.equal(blank.advance(1),null);assert.equal(blank.choose(4),false);assert.equal(blank.choose(-1),false);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(1,3);m.advance(99);m.choose(2);m.advance(2);const n=new Pick();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,2);assert.equal(n.choice,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,choice:7},{...s,t:999},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Pick();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'pickform-model'),script(source,'pickform-model'));
 return mount(html,{scripts:['pickform-model','pickform-interface'],locale:'pickform-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),plain=n=>Number(n.toPrecision(6)).toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, the options, and the unit check`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.chooseTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,fill(l.question,{s:'t',u:'s'}));
  assert.equal(ui.el('opt-1-f').textContent,'t = d ÷ v');assert.equal(ui.el('opt-0-u').textContent,'');
  ui.el('show-units').checked=true;ui.el('show-units').events.change();assert.equal(ui.el('opt-0-u').textContent,'[1/s] ✗');assert.equal(ui.el('opt-1-u').textContent,'[s] ✓');
  assert.ok(ui.painted.includes(l.roadTitle)&&ui.painted.includes(l.goalLine)&&ui.painted.includes(l.speedTitle));
 });
 test(`${lang}: the right formula on the first drive stops on the line`,()=>{
  ui.click('opt-1');assert.equal(ui.el('lesson-title').textContent,fill(l.readyTitle,{s:'t',r:plain(6)+' s'}));
  ui.click('play');ui.run(()=>ui.el('pickform-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.goodCopy,{s:'t',r:plain(6)+' s'})+' '+l.onLineCopy+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('position-value').textContent,fmt(0));
 });
 test(`${lang}: a formula with the right units can still fail`,()=>{
  ui.click('mission-1');ui.click('opt-0');ui.click('play');ui.run(()=>ui.el('pickform-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.speedCopy,{v:fmt(35,1),w:'25'})+' '+fill(l.slipSign,{s:'a',u:'m/s²'})+' '+l.unitsFooled);assert.ok(ui.el('insight').classList.has('warning'));
 });
 test(`${lang}: a formula with the wrong units overshoots, and a focus loss pauses the drive`,()=>{
  ui.click('mission-2');ui.click('opt-1');ui.click('play');ui.run(()=>ui.el('pickform-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.overCopy,{g:fmt(38,1)})+' '+l.slipSquare+' '+l.unitsWarned);assert.ok(ui.painted.includes(fill(l.overBanner,{g:fmt(38,1)})));
  ui.click('opt-3');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('pickform-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves situation, choice, attempts, and drive',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.click('opt-1');en.click('play');en.run(()=>en.el('pickform-status-text').textContent===copy.en.done);en.click('opt-3');en.click('step');
 en.links.find(l=>l.lang==='nb').events.click();assert.equal(storage.size,1);
 const nb=open('nb',storage);assert.equal(storage.size,0);
 assert.equal(nb.el('mission-4').attributes['aria-pressed'],'true');assert.equal(nb.el('opt-3').attributes['aria-pressed'],'true');assert.equal(nb.el('pickform-status-text').textContent,copy.nb.paused);
 nb.click('play');nb.run(()=>nb.el('pickform-status-text').textContent===copy.nb.done);assert.equal(nb.el('mission-score').textContent,'100');
});
console.log(`\n${checks} formula test drive rearranging and multilingual interface checks passed.`);
