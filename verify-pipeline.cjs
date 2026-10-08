// Unit Pipeline: conversion algebra, exact fill events, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/pipeline.html'),'utf8'),copy=require('./locales/pipeline.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'pipeline-model'),pure);const Fill=pure.FillModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// Known shortest solutions; [id, flipped].
const solutions=[[['L-mL',false]],[['m-cm',true],['m-cm',true],['m-cm',true],['m3-L',false]],[['m3-L',false],['min-s',false]],[['h-min',false],['min-s',false]],[['mL-cm3',true],['min-s',false]]];
const fillTimes=[30,60,90,720,300];
const solved=level=>{const m=new Fill(level);m.chain=solutions[level].map(([id,flipped])=>({id,flipped}));return m;};

test('every conversion tile is an exact equality',()=>{for(const [id,t] of Object.entries(Fill.tiles))near(Fill.toSI(t.top),Fill.toSI(t.bottom),1e-12);});
test('tank dimensions match the stated volume and fill times are as designed',()=>{Fill.levels.forEach((level,i)=>{const m=new Fill(i);near(level.dims[0]*level.dims[1]*level.dims[2],m.volume(),1e-12);near(m.fillTime(),fillTimes[i]);});});
test('each level has a solution that cancels to seconds and equals the fill time',()=>{Fill.levels.forEach((level,i)=>{const m=solved(i),e=m.evaluate();assert.ok(Fill.isSeconds(e.units),Fill.formatUnits(e.units));near(e.value,m.fillTime());assert.equal(m.chain.length,level.optimal);assert.ok(solutions[i].every(([id])=>level.palette.includes(id)));});});
test('no shorter chain from the palette reaches seconds',()=>{
 Fill.levels.forEach((level,i)=>{
  const options=level.palette.flatMap(id=>[{id,flipped:false},{id,flipped:true}]);
  let frontier=[[]];
  for(let length=0;length<level.optimal;length++){
   for(const chain of frontier){const m=new Fill(i);m.chain=chain;assert.ok(!Fill.isSeconds(m.evaluate().units),`level ${i} solved in ${length}`);}
   frontier=frontier.flatMap(chain=>options.map(o=>[...chain,o]));
  }
 });
});
test('unit algebra formats compound units and flags factors that add units',()=>{
 assert.equal(Fill.formatUnits({cm:3,s:1,L:-1}),'cm³·s/L');assert.equal(Fill.formatUnits({mL:1,s:-1}),'mL/s');assert.equal(Fill.formatUnits({s:-1}),'1/s');assert.equal(Fill.formatUnits({cm:4,s:1,m:-1,L:-1}),'cm⁴·s/(m·L)');
 const m=new Fill(1);m.addFactor('m-cm');assert.equal(m.evaluate().steps[0].worse,true);m.flip(0);assert.equal(m.evaluate().steps[0].worse,false);assert.deepEqual({...m.evaluate().units},{m:1,cm:2,s:1,L:-1});
});
test('the tank-full event is solved exactly inside a long step and then freezes',()=>{
 const m=solved(0);assert.equal(m.advance(29.99),null);const event=m.advance(10);near(event.t,30);near(m.t,30);assert.equal(m.status,'full');near(m.filled(),m.volume());assert.equal(m.surfaceSpeed(),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(5),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
});
test('fill result is independent of timestep partitioning',()=>{const a=solved(2),b=solved(2);a.advance(1000);while(b.status!=='full')b.advance(1/120);near(a.t,b.t,1e-12);near(b.t,90);assert.equal(b.t,b.fillTime());});
test('water level and surface velocity follow V / A and Q / A',()=>{const m=solved(1);m.advance(30);near(m.filled(),.015);near(m.filled()/m.area(),.15);near(m.surfaceSpeed(),5e-4/.1);});
test('score rewards valid, short, confirmed chains only',()=>{
 const best=solved(0);best.advance(100);assert.equal(best.score(),150);
 const long=solved(2);long.chain.push({id:'L-mL',flipped:false},{id:'L-mL',flipped:true});long.advance(1000);assert.ok(Fill.isSeconds(long.evaluate().units));assert.equal(long.score(),100);
 const wrong=new Fill(2);wrong.addFactor('m3-L');wrong.advance(1000);assert.equal(wrong.score(),0);
 const unfinished=solved(3);unfinished.advance(1);assert.equal(unfinished.score(),0);
});
test('chain edits reset elapsed time and respect the palette and length limit',()=>{
 const m=new Fill(0);m.advance(5);assert.equal(m.addFactor('h-min'),false);assert.equal(m.t,5);assert.equal(m.addFactor('L-mL'),true);assert.equal(m.t,0);
 for(let i=0;i<10;i++)m.addFactor('min-s');assert.equal(m.chain.length,Fill.maxChain);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=solved(4);m.advance(12);const n=new Fill();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.level,4);near(n.t,12);assert.equal(n.chain.length,2);
 for(const bad of [{...m.snapshot(),level:9},{...m.snapshot(),t:-1},{...m.snapshot(),t:1e6},{...m.snapshot(),chain:[{id:'m-cm',flipped:false}]},{...m.snapshot(),status:'boiling'}]){const k=new Fill();assert.equal(k.restore(bad),false);assert.equal(k.level,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'pipeline-model'),script(source,'pipeline-model'));
 return mount(html,{scripts:['pipeline-model','pipeline-interface'],locale:'pipeline-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const ui=open(lang);
 test(`${lang}: initial state, localized givens, palette and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('fill-status-text').textContent,l.ready);
  assert.equal(ui.el('prediction-value').textContent,fmt(.03)+' L·s/mL');assert.equal(ui.el('units-state').textContent,l.unitsLeft.replace('{units}','L·s/mL'));
  assert.equal(ui.el('given-1').textContent,'V = 30000 cm³ · Q = '+(.5).toLocaleString(lang)+' L/s');
  assert.equal(ui.el('tile-m-cm').hidden,true);assert.equal(ui.el('tile-L-mL').hidden,false);assert.equal(ui.el('slot-0').hidden,true);
  assert.ok(ui.painted.includes(l.timeAxis));assert.ok(ui.painted.includes(l.pumpLabel));
 });
 test(`${lang}: one factor confirms the jug prediction when the tank fills`,()=>{
  ui.click('tile-L-mL');assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{p}',fmt(30)));assert.ok(ui.el('prediction-box').classList.has('ok'));
  assert.ok(ui.el('units-badge').classList.has('earned'));assert.ok(ui.el('short-badge').classList.has('earned'));
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('fill-status-text').textContent,l.paused);
  ui.click('speed-10');ui.click('play');ui.run(()=>ui.el('fill-status-text').textContent===l.full);
  assert.equal(ui.el('time-value').textContent,fmt(30));assert.equal(ui.el('lesson-title').textContent,l.confirmedTitle);assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.el('confirm-badge').classList.has('earned'));assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('surface-value').textContent,fmt(0));
  assert.ok(ui.painted.some(s=>String(s).startsWith(l.fullBanner)));
 });
 test(`${lang}: cubed centimetres need three flipped factors`,()=>{
  ui.click('level-1');assert.equal(ui.el('slot-0').hidden,true);assert.equal(ui.el('level-label').textContent,l.level1);
  ui.click('tile-m-cm');assert.equal(ui.el('lesson-title').textContent,l.flipTitle);assert.ok(ui.el('slot-0').classList.has('wrong'));
  ui.click('flip-0');assert.equal(ui.el('lesson-title').textContent,l.leftoverTitle);assert.ok(!ui.el('slot-0').classList.has('wrong'));
  for(const i of [1,2]){ui.click('tile-m-cm');ui.click('flip-'+i);}
  ui.click('tile-m3-L');assert.equal(ui.el('lesson-title').textContent,l.readyTitle.replace('{p}',fmt(60)));assert.equal(ui.el('factor-3').textContent,'1000 L / 1 m³');
  ui.click('remove-3');assert.equal(ui.el('slot-3').hidden,true);ui.click('clear-chain');assert.equal(ui.el('chain-empty').hidden,false);
 });
 test(`${lang}: leftover minutes are flagged as the fill runs past the number`,()=>{
  ui.click('level-2');ui.click('tile-m3-L');assert.equal(ui.el('prediction-value').textContent,fmt(1.5)+' min');
  ui.click('play');ui.run(()=>ui.el('lesson-title').textContent===l.passedTitle,{limit:20});assert.equal(ui.el('lesson-title').textContent,l.passedTitle);
  ui.run(()=>ui.el('fill-status-text').textContent===l.full);assert.equal(ui.el('lesson-title').textContent,l.mismatchTitle);assert.equal(ui.el('mission-score').textContent,'0');assert.equal(ui.el('time-value').textContent,fmt(90));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('fill-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves tank, chain, playback speed, and elapsed time',()=>{
 const storage=new Map(),en=open('en',storage);en.click('level-3');en.click('tile-h-min');en.click('speed-60');en.click('step');
 en.links.find(l=>l.lang==='de').events.click();assert.equal(storage.size,1);
 const de=open('de',storage);assert.equal(storage.size,0);
 assert.equal(de.el('level-3').attributes['aria-pressed'],'true');assert.equal(de.el('factor-0').textContent,'60 min / 1 h');assert.equal(de.el('speed-60').attributes['aria-pressed'],'true');
 assert.equal(de.el('time-value').textContent,(6).toLocaleString('de',{minimumFractionDigits:2}));assert.equal(de.el('fill-status-text').textContent,copy.de.paused);
});
console.log(`\n${checks} unit pipeline conversion and multilingual interface checks passed.`);
