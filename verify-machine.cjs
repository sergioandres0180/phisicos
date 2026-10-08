// Undo Machine: formulas as chains of operations, inverse chains in reverse order, slips, timing, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/machine.html'),'utf8'),copy=require('./locales/machine.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'machine-model'),pure);const Machine=pure.MachineModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const build=(i,tiles)=>{const m=new Machine(i);for(const [op,sym] of tiles)assert.ok(m.addTile(op,sym));return m;};

test('each forward machine turns the true unknown into the known value',()=>{
 Machine.missions.forEach((c,i)=>{const m=new Machine(i),s=m.stagesOf(c.forward,c.values[c.unknown]);near(s[s.length-1],c.values[c.known]);});
});
test('the reversed inverse chain returns the unknown and scores the first run',()=>{
 Machine.missions.forEach((_,i)=>{const m=new Machine(i);for(const [op,sym] of m.correctTiles())assert.ok(m.addTile(op,sym));near(m.result(),m.exact());m.advance(99);assert.equal(m.score(),150);});
 assert.deepEqual([...new Machine(1).correctTiles().map(t=>t.join(' '))],['sub x0','div v']);
});
test('a different valid order of commuting steps is accepted; extra boxes cost the bonus',()=>{
 const m=build(3,[['div','a'],['mul','2'],['root']]);assert.ok(m.evaluate().ok);
 const n=build(0,[['div','v'],['mul','2'],['div','2']]);n.advance(99);const e=n.evaluate();assert.ok(e.ok);assert.equal(e.first,false);assert.equal(n.score(),100);
});
test('wrong order, repeated forward steps, missing steps, and impossible roots are recognized',()=>{
 const order=build(1,[['div','v'],['sub','x0']]);near(order.result(),-10);assert.equal(order.evaluate().slip,'order');
 assert.equal(build(1,[['add','x0'],['div','v']]).evaluate().slip,'same');
 assert.equal(build(1,[['div','v']]).evaluate().slip,'missing');
 const root=build(4,[['sub','v0sq'],['root']]);assert.ok(Number.isNaN(root.result()));assert.equal(root.evaluate().slip,'invalid');
});
test('a run takes 0.8 s per pipe and ends exactly; the token carries the value after each box',()=>{
 const m=build(1,[['sub','x0'],['div','v']]);near(m.duration(),2.4);assert.equal(m.advance(1),null);
 assert.equal(m.position(.85).k,1);near(m.position(.85).value,30);assert.equal(m.position(1.7).k,2);near(m.position(1.7).value,6);
 const e=m.advance(5);near(e.t,2.4);assert.equal(m.status,'done');const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 assert.equal(new Machine(0).advance(1),null);
});
test('boxes must use the palette, and a machine holds at most six',()=>{
 const m=new Machine(0);assert.equal(m.addTile('mul','x0'),false);assert.equal(m.addTile('cube'),false);assert.equal(m.removeTile(),false);
 for(let i=0;i<6;i++)assert.ok(m.addTile('mul','2'));assert.equal(m.addTile('mul','2'),false);m.clearTiles();assert.equal(m.tiles.length,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=build(2,[['div','t'],['sub','v0']]);m.advance(99);m.clearTiles();m.addTile('sub','v0');m.addTile('div','t');m.advance(1);
 const n=new Machine();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);assert.equal(n.tiles.length,2);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,tiles:[['mul','q']]},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,status:'done',attempts:0}]){const k=new Machine();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'machine-model'),script(source,'machine-model'));
 return mount(html,{scripts:['machine-model','machine-interface'],locale:'machine-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>Number(n.toPrecision(6)).toLocaleString(lang,{maximumFractionDigits:4,useGrouping:false}).replace('-','−'),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, the formula, and both machines on the canvas`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.buildTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('chain').textContent,'d → t ?');
  assert.equal(ui.el('question').textContent,fill(l.question,{k:'d',s:'t',f:'d = v·t'}));assert.equal(ui.el('sym-2').hidden,true);assert.equal(ui.el('op-div').textContent,'÷ v');
  assert.ok(ui.painted.includes(fill(l.formulaLabel,{f:'d = v·t'}))&&ui.painted.includes(l.forwardTitle)&&ui.painted.includes(l.inverseTitle));
 });
 test(`${lang}: one inverse box returns t on the first run`,()=>{
  ui.click('op-div');assert.equal(ui.el('chain').textContent,'d → ÷ v → t ?');assert.equal(ui.el('lesson-title').textContent,l.readyTitle);
  ui.click('play');ui.run(()=>ui.el('machine-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,fill(l.goodTitle,{s:'t'}));assert.equal(ui.el('result-value').textContent,plain(8));assert.equal(ui.el('mission-score').textContent,'150');
  assert.ok(ui.painted.includes(fill(l.rightBanner,{s:'t',r:plain(8)})));
 });
 test(`${lang}: the right boxes in the wrong order are explained`,()=>{
  ui.click('mission-1');ui.click('op-div');ui.click('sym-1');ui.click('op-sub');assert.equal(ui.el('chain').textContent,'x → ÷ v → − x₀ → t ?');
  ui.click('play');ui.run(()=>ui.el('machine-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.missCopy,{s:'t',r:plain(-10),e:plain(6)})+' '+l.slipOrder);
  assert.ok(ui.el('insight').classList.has('warning'));
  ui.click('clear-tiles');ui.click('op-sub');ui.click('sym-0');ui.click('op-div');ui.click('play');ui.run(()=>ui.el('machine-status-text').textContent===l.done);assert.equal(ui.el('mission-score').textContent,'100');
 });
 test(`${lang}: focus loss pauses the token`,()=>{
  ui.click('mission-3');ui.click('sym-1');ui.click('op-mul');ui.click('sym-0');ui.click('op-div');ui.click('op-root');ui.click('play');ui.run(()=>false,{limit:3});
  ui.windowEvents.get('blur')();assert.equal(ui.el('machine-status-text').textContent,l.paused);const v=ui.el('stage-value').textContent;ui.run(()=>false,{limit:20});assert.equal(ui.el('stage-value').textContent,v);
 });
}
test('changing language preserves formula, boxes, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-2');en.click('op-div');en.click('sym-1');en.click('op-sub');en.click('play');en.run(()=>en.el('machine-status-text').textContent===copy.en.done);
 en.click('clear-tiles');en.click('op-sub');en.click('sym-0');en.click('op-div');en.click('step');
 en.links.find(l=>l.lang==='fi').events.click();assert.equal(storage.size,1);
 const fi=open('fi',storage);assert.equal(storage.size,0);
 assert.equal(fi.el('mission-2').attributes['aria-pressed'],'true');assert.equal(fi.el('chain').textContent,'v → − v₀ → ÷ t → a ?');assert.equal(fi.el('machine-status-text').textContent,copy.fi.paused);
 fi.click('play');fi.run(()=>fi.el('machine-status-text').textContent===copy.fi.done);assert.equal(fi.el('mission-score').textContent,'100');
});
console.log(`\n${checks} undo machine inverse-operation and multilingual interface checks passed.`);
