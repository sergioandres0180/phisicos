const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname+'/public/index.html','utf8');
const original = fs.readFileSync(__dirname+'/public/lab-v1.html','utf8');
const script = (source,id) => source.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>'))[1];
let checks = 0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const modelContext = vm.createContext({});vm.runInContext(script(html,'chase-physics'),modelContext);
const Chase = modelContext.ChasePhysics;
test('original physics engine is unchanged and original HTML is archived',()=>{
  assert.equal(script(html,'physics-engine'),script(original,'physics-engine'));
  assert.ok(original.includes('The round-trip challenge'));assert.ok(!original.includes('chase-panel'));
});
test('route corners and signed outgoing tangents',()=>{
  const game=new Chase();const corners=[[0,-8,-4],[16,8,-4],[24,8,4],[40,-8,4],[48,-8,-4],[-8,-8,4]];
  for(const [q,x,y] of corners){near(game.position(q).x,x);near(game.position(q).y,y);}
  near(game.tangent(16,1).y,1);near(game.tangent(16,-1).x,-1);near(game.tangent(0,-1).y,1);
});
test('4 versus 2 m/s catches at exactly 6 s and 24 m',()=>{
  const game=new Chase();const event=game.advance(10);
  assert.equal(event.kind,'caught');assert.equal(game.finished,true);near(game.t,6);near(game.distance,24);
  near(game.metrics().dx,16);near(game.metrics().dy,8);near(game.metrics().avgSpeed,4);near(game.metrics().gap,0);
  near(game.metrics().vx,-4);assert.equal(game.pellets.size,12);assert.equal(game.metrics().score,320);
  assert.equal(game.advance(1),null);near(game.t,6);
});
test('equal speeds keep the track gap constant and pause on a full lap',()=>{
  const game=new Chase({speed:4,ghostSpeed:4});const result=game.advance(20);
  assert.equal(result.kind,'return');assert.equal(game.finished,false);near(game.t,12);near(game.distance,48);
  near(game.metrics().displacement,0);near(game.metrics().avgVx,0);near(game.metrics().avgVy,0);near(game.metrics().avgSpeed,4);
  near(game.metrics().gap,12);near(game.metrics().vx,4);assert.equal(game.laps,1);assert.equal(game.pellets.size,23);assert.equal(game.metrics().score,330);
});
test('catch and lap events at the same instant both earn credit',()=>{
  const game=new Chase({speed:4,ghostSpeed:3});const event=game.advance(20);
  assert.equal(event.kind,'caught');near(game.t,12);near(game.distance,48);near(game.metrics().displacement,0);assert.equal(game.laps,1);assert.equal(game.metrics().score,530);
});
test('a stationary Pac-Man does not win when the ghost laps him',()=>{
  const game=new Chase({speed:0,ghostSpeed:2});const event=game.advance(20);
  assert.equal(event.kind,'contact');assert.equal(game.caught,false);near(game.t,18);near(game.distance,0);near(game.metrics().avgSpeed,0);near(game.metrics().score,0);
});
test('both stationary actors still accumulate simulation time',()=>{
  const game=new Chase({speed:0,ghostSpeed:0});assert.equal(game.metrics().avgSpeed,null);game.advance(5);
  near(game.t,5);near(game.distance,0);near(game.metrics().gap,12);assert.equal(game.finished,false);
});
test('reverse direction produces contact, not a pursuit catch',()=>{
  const game=new Chase();game.dir=-1;const event=game.advance(20);
  assert.equal(event.kind,'contact');near(game.t,6);near(game.distance,24);assert.equal(game.caught,false);
  near(game.metrics().displacement,Math.hypot(16,8));
});
test('partial out-and-back gives zero average velocity without a full-lap badge',()=>{
  const game=new Chase({speed:4,ghostSpeed:4});game.advance(1);game.dir=-1;const event=game.advance(2);
  assert.equal(event.kind,'return');near(game.t,2);near(game.distance,8);near(game.metrics().displacement,0);assert.equal(game.laps,0);
});
test('trail includes exact corners rather than diagonal shortcuts',()=>{
  const game=new Chase({speed:4,ghostSpeed:4});game.advance(12);
  assert.ok(game.trail.some(p=>p.x===8&&p.y===-4));assert.ok(game.trail.some(p=>p.x===8&&p.y===4));assert.ok(game.trail.some(p=>p.x===-8&&p.y===4));
});
test('fixed-step integration matches direct event integration',()=>{
  for(const ghostSpeed of [2,3,4,5]){
    const a=new Chase({speed:4,ghostSpeed}),b=new Chase({speed:4,ghostSpeed});a.advance(20);
    for(let i=0;i<2400;i++){const event=b.advance(1/120);if(event)break;}
    near(a.t,b.t);near(a.q,b.q);near(a.ghostQ,b.ghostQ);near(a.distance,b.distance);assert.equal(a.caught,b.caught);assert.equal(a.laps,b.laps);
  }
});
test('near-corner and near-return events do not skip crossings',()=>{
  const game=new Chase({speed:4,ghostSpeed:4});game.advance(4-1e-9);game.advance(2e-9);
  assert.equal(game.turns,1);game.advance(8-2e-9);const event=game.advance(.01);
  assert.equal(event.kind,'return');near(game.t,12);near(game.q,48);
});
test('collectibles score once per run despite multiple laps',()=>{
  const game=new Chase({speed:4,ghostSpeed:4});game.advance(36,false);near(game.t,36);near(game.distance,144);assert.equal(game.pellets.size,23);assert.equal(game.laps,3);assert.equal(game.metrics().score,330);
});
test('distance and average-velocity invariants hold throughout the chase',()=>{
  const game=new Chase({speed:3,ghostSpeed:3});
  for(let i=0;i<10000;i++){game.advance(1/120,false);const m=game.metrics();assert.ok(game.distance+1e-8>=m.displacement);assert.ok(m.avgSpeed+1e-8>=Math.hypot(m.avgVx,m.avgVy));near(Math.hypot(m.vx,m.vy),game.speed);}
});

// Test both real UI scripts together, with requestAnimationFrame scheduling and
// a strict, in-memory DOM/canvas adapter. This is not visual browser QA.
const elements=new Map(), documentEvents=new Map(), frames=[];
const drawing = new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),'Non-finite drawing coordinate');}),set:(o,k,v)=>(o[k]=v,true)});
for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const tag=match[0],id=match[1];
  assert.ok(!elements.has(id),'Duplicate ID '+id);
  elements.set(id,{id,hidden:/\bhidden\b/.test(tag),checked:/\bchecked\b/.test(tag),disabled:/\bdisabled\b/.test(tag),value:tag.match(/\bvalue="([^"]*)"/)?.[1]??'',textContent:'',tabIndex:Number(tag.match(/tabindex="([^"]*)"/)?.[1]??0),attributes:{},events:{},classList:{values:new Set(),toggle(name,on){on?this.values.add(name):this.values.delete(name);}},setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,fn){this.events[name]=fn;},getBoundingClientRect(){return {width:800,height:365};},getContext(){return drawing;},focus(){this.focused=true;}});
}
const el=id=>{assert.ok(elements.has(id),'Unknown ID '+id);return elements.get(id);};
const doc={hidden:false,getElementById:el,addEventListener(name,fn){if(!documentEvents.has(name))documentEvents.set(name,[]);documentEvents.get(name).push(fn);}};
const win={devicePixelRatio:2,addEventListener(){}};
const env=vm.createContext({document:doc,window:win,requestAnimationFrame(fn){frames.push(fn);},ResizeObserver:class{observe(){}},console});
for(const id of ['physics-engine','chase-physics','interface','chase-interface','experience-tabs'])vm.runInContext(script(html,id),env);
const click=id=>{assert.ok(!el(id).disabled,id+' disabled');el(id).events.click({target:el(id)});};
const input=(id,value)=>{el(id).value=String(value);el(id).events.input({target:el(id)});};
const tick=time=>{const pending=frames.splice(0);pending.forEach(fn=>fn(time));};
test('tabs preserve original run and pause it while the chase is active',()=>{
  click('step');click('play');tick(0);tick(100);click('chase-tab');
  assert.equal(el('lab-panel').hidden,true);assert.equal(el('chase-panel').hidden,false);assert.equal(el('pause').disabled,true);
  const t=el('time-metric').textContent;click('chase-step');tick(200);assert.equal(el('time-metric').textContent,t);
  click('lab-tab');assert.equal(el('chase-status-text').textContent,'Paused');assert.equal(el('time-metric').textContent,t);assert.equal(el('lab-panel').hidden,false);
});
test('arrow keys and Home/End control accessible tabs',()=>{
  el('lab-tab').events.keydown({key:'End',preventDefault(){}});assert.equal(el('chase-tab').attributes['aria-selected'],'true');assert.equal(el('chase-tab').tabIndex,0);assert.equal(el('chase-tab').focused,true);
  el('chase-tab').events.keydown({key:'Home',preventDefault(){}});assert.equal(el('lab-tab').attributes['aria-selected'],'true');
});
test('chase speed, ghost speed, reversal, and stepping update live values',()=>{
  click('chase-tab');click('chase-reset');input('chase-speed',6);input('ghost-speed',3);click('chase-step');
  assert.equal(el('chase-distance').textContent,'0.60');assert.match(el('chase-instant').textContent,/u = 6\.00/);click('chase-reverse');assert.match(el('chase-instant').textContent,/v = \(-6\.00, 0\.00\)/);assert.match(el('chase-lesson').textContent,/left/);
});
test('prediction and catch explanations follow changed speeds and a straight catch',()=>{
  click('chase-catch-mode');input('chase-speed',8);input('ghost-speed',0);
  assert.match(el('chase-lesson').textContent,/Pac-Man: 8\.0 m\/s\. Ghost: 0\.0 m\/s/);
  for(let i=0;i<15;i++)click('chase-step');
  assert.equal(el('chase-time').textContent,'1.50');assert.equal(el('chase-distance').textContent,'12.00');assert.equal(el('chase-displacement').textContent,'12.00');assert.match(el('chase-lesson-title').textContent,/Distance = \|displacement\|/);
});
test('catch mission completes, awards points, and pauses both actors',()=>{
  click('chase-catch-mode');click('chase-play');tick(1000);for(let i=1;i<=70;i++)tick(1000+i*100);
  assert.equal(el('chase-time').textContent,'6.00');assert.equal(el('chase-mission-status').textContent,'COMPLETE');assert.equal(el('chase-status-text').textContent,'Caught!');assert.equal(el('chase-score').textContent,'0320');assert.equal(el('chase-play').disabled,true);assert.equal(el('chase-step').disabled,true);
});
test('lap mission reports zero average velocity but positive instantaneous speed',()=>{
  click('chase-lap-mode');click('chase-play');tick(10000);for(let i=1;i<=130;i++)tick(10000+i*100);
  assert.equal(el('chase-time').textContent,'12.00');assert.equal(el('chase-distance').textContent,'48.00');assert.equal(el('chase-average-velocity').textContent,'0.00');assert.equal(el('chase-average-speed').textContent,'4.00');assert.equal(el('chase-mission-status').textContent,'COMPLETE');assert.equal(el('chase-status-text').textContent,'Paused');assert.match(el('chase-instant').textContent,/u = 4\.00/);
});
test('backgrounding pauses the chase, and both simulations have visibility handlers',()=>{
  click('chase-play');doc.hidden=true;documentEvents.get('visibilitychange').forEach(fn=>fn());assert.equal(el('chase-pause').disabled,true);assert.equal(documentEvents.get('visibilitychange').length,2);
});
test('switching away from a running chase preserves its time without background motion',()=>{
  doc.hidden=false;click('chase-play');tick(25000);tick(25100);click('lab-tab');const t=el('chase-time').textContent;tick(25200);tick(25300);click('chase-tab');assert.equal(el('chase-time').textContent,t);assert.equal(el('chase-status-text').textContent,'Paused');
});
console.log(`\n${checks} chase and tab checks passed.`);
