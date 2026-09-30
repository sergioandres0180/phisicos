// Runs the exact embedded source. No dependencies, network, or browser required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/src/velocity.html', 'utf8');
const physics = html.match(/<script id="physics-engine">([\s\S]*?)<\/script>/)[1];
const ui = html.match(/<script id="interface">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(physics, context);
const Engine = context.MotionPhysics;
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function near(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}
test('t = 0 averages are undefined', () => {
  const e = new Engine(); assert.equal(e.metrics().avgSpeed, null); assert.equal(e.metrics().avgVx, null);
});
test('constant straight travel', () => {
  const e = new Engine({start:0,speed:2}); e.advance(3);
  near(e.t,3);near(e.distance,6);near(e.q,6);near(e.metrics().avgSpeed,2);near(e.metrics().avgVx,2);
});
test('negative direction preserves positive speed and distance', () => {
  const e = new Engine({start:0,speed:2,direction:-1});e.advance(3);
  near(e.q,-6);near(e.distance,6);near(e.metrics().avgVx,-2);near(e.metrics().vx,-2);
});
test('linear return is captured inside an overshooting step', () => {
  const e = new Engine({start:-6,speed:4});assert.equal(e.advance(8.5,true),true);
  near(e.t,8);near(e.distance,32);near(e.q,-6);near(e.metrics().avgVx,0);near(e.metrics().vx,-4);assert.ok(e.targetVisited);
});
test('multiple wall crossings preserve full distance and elapsed time', () => {
  const e = new Engine({start:0,speed:4});e.advance(25);
  near(e.t,25);near(e.distance,100);near(e.q,0);assert.equal(e.dir,-1);assert.equal(e.returns,5);
});
test('braking integrates stopping distance and time at rest exactly', () => {
  const e = new Engine({start:0,speed:4,acceleration:-2});e.advance(3);
  near(e.t,3);near(e.distance,4);near(e.speed,0);near(e.q,4);near(e.metrics().avgSpeed,4/3);
});
test('positive acceleration starts from rest', () => {
  const e = new Engine({start:-6,speed:0,acceleration:2});e.advance(2);
  near(e.speed,4);near(e.distance,4);near(e.q,-2);near(e.metrics().avgSpeed,2);
});
test('a full circular lap has zero average velocity and nonzero instantaneous velocity', () => {
  const e = new Engine({mode:'circular',start:0,speed:4});e.advance(10,true);
  near(e.t,3*Math.PI);near(e.distance,12*Math.PI);near(e.metrics().displacement,0);near(e.metrics().avgVx,0);near(e.metrics().avgVy,0);near(e.metrics().vy,4);
});
test('clockwise circle from a nonzero angle returns exactly', () => {
  const e = new Engine({mode:'circular',start:135,speed:4,direction:-1});e.advance(10,true);
  near(e.metrics().displacement,0);near(e.t,3*Math.PI);assert.equal(e.returns,1);
});
test('quarter circle uses arc length, vector components, and tangent velocity', () => {
  const e = new Engine({mode:'circular',start:0,speed:3});e.advance(Math.PI);
  const m=e.metrics();near(e.distance,3*Math.PI);near(m.dx,-6);near(m.dy,6);near(m.displacement,Math.sqrt(72));near(m.vx,-3);near(m.vy,0);near(m.avgVx,-6/Math.PI);
});
test('reversing partway around a circle returns without claiming a full lap', () => {
  const e = new Engine({mode:'circular',start:0,speed:3});e.advance(1);e.dir=-1;e.advance(2,true);
  near(e.t,2);near(e.distance,6);near(e.metrics().displacement,0);assert.ok(e.maxExcursion<12*Math.PI);
});
test('accelerated return uses exact event time', () => {
  const e = new Engine({start:-6,speed:2,acceleration:1});e.advance(10,true);
  near(e.distance,32);near(e.t,-2+Math.sqrt(68));near(e.speed,Math.sqrt(68));near(e.q,-6);
});
test('near-start crossings have no floating-point dead zone', () => {
  const line = new Engine({start:-6,speed:4});
  line.advance(4);line.advance(3.99999999875);assert.equal(line.advance(.1,true),true);near(line.q,-6);near(line.t,8);
  for(const direction of [-1,1]){
    const circle = new Engine({mode:'circular',start:75,speed:4,direction});
    circle.advance((12*Math.PI-5e-9)/4);assert.equal(circle.advance(.1,true),true);near(circle.t,3*Math.PI);near(circle.metrics().displacement,0);
    assert.equal(circle.advance(.1,true),false);assert.equal(circle.returns,1);
  }
});
test('partitioning time does not change the physical result', () => {
  for(const mode of ['linear','circular']){
    const options={mode,start:mode==='linear'?-6:45,speed:3,acceleration:.7};
    const a=new Engine(options),b=new Engine(options);a.advance(30);
    for(let i=0;i<3600;i++)b.advance(1/120);
    near(a.q,b.q,1e-7);near(a.distance,b.distance,1e-7);near(a.speed,b.speed,1e-7);near(a.t,b.t,1e-7);
  }
});
test('distance and average-speed inequalities survive control changes', () => {
  for(const mode of ['linear','circular']){
    const e = new Engine({mode,start:mode==='linear'?-4:75,speed:5});
    for(let i=0;i<15000;i++){
      if(i%333===0)e.dir*=-1;
      if(i%470===0)e.a=Math.sin(i)*2;
      if(i%721===0)e.speed=3+(i%7);
      e.advance(1/120);const m=e.metrics();
      assert.ok(e.distance+1e-7>=m.displacement);assert.ok(m.avgSpeed+1e-7>=Math.hypot(m.avgVx,m.avgVy));assert.ok(e.speed>=0);
      if(mode==='linear')assert.ok(Math.abs(e.q)<=10+1e-7);
    }
  }
});
test('resting time and invalid timestep behavior', () => {
  const e = new Engine({speed:0,acceleration:-2});e.advance(10);near(e.distance,0);near(e.t,10);near(e.speed,0);
  assert.throws(()=>e.advance(-1));assert.throws(()=>e.advance(Infinity));
});

// In-memory DOM adapter exercises the actual event handlers and render calls.
const elements = new Map();
const drawing = new Proxy({}, {get:(o,k)=>o[k] ?? (()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function element(id){
  if(!elements.has(id))elements.set(id,{id,value:'',checked:['vectors','trail','pause-return'].includes(id),disabled:false,textContent:'',events:{},classList:{toggle(){}},setAttribute(){},addEventListener(name,handler){this.events[name]=handler;},getBoundingClientRect(){return {width:800,height:367};},getContext(){return drawing;}});
  return elements.get(id);
}
for(const match of html.matchAll(/\bid="([^"]+)"/g))element(match[1]);
let nextFrame;
const document={getElementById:element,hidden:false,addEventListener(name,handler){this[name]=handler;}};
const browser=vm.createContext({document,window:{devicePixelRatio:2,addEventListener(){}},requestAnimationFrame(fn){nextFrame=fn;},ResizeObserver:class{observe(){}},console});
vm.runInContext(physics,browser);vm.runInContext(ui,browser);
function click(id){const el=element(id);assert.ok(!el.disabled, id+' disabled');el.events.click({target:el});}
function input(id,value){const el=element(id);el.value=String(value);el.events.input({target:el});}
function tick(time){nextFrame(time);}
test('interface initializes without runtime errors',()=>{
  assert.equal(element('speed-metric').textContent,'—');assert.equal(element('time-metric').textContent,'0.00');assert.equal(element('instant-value').textContent,'4.00 m/s · (+4.00, 0.00) m/s');
});
test('step, pause, and reset update measurements and transport state',()=>{
  click('step');assert.equal(element('time-metric').textContent,'0.10');assert.equal(element('status-text').textContent,'Paused');assert.equal(element('distance-metric').textContent,'0.40');
  click('play');assert.equal(element('step').disabled,true);tick(0);tick(100);click('pause');assert.equal(element('time-metric').textContent,'0.20');
  click('reset');assert.equal(element('time-metric').textContent,'0.00');
});
test('live speed, braking, reversal, and geometry controls are wired',()=>{
  input('speed',6);input('acceleration',-2);click('reverse');click('step');
  assert.equal(element('distance-metric').textContent,'0.59');assert.match(element('instant-value').textContent,/5\.80 m\/s/);assert.equal(element('direction-value').textContent,'Left (−x)');
  click('circular');assert.equal(element('time-metric').textContent,'0.00');assert.equal(element('start-label').textContent,'Initial angle');
  input('start',90);click('step');assert.match(element('displacement-components').textContent,/\(/);
});
test('round-trip challenge completes and pauses with zero average velocity',()=>{
  click('linear');input('speed',4);input('acceleration',0);click('challenge-start');
  tick(1000);for(let i=1;i<=90;i++)tick(1000+i*100);
  assert.equal(element('challenge-badge').textContent,'COMPLETE');assert.equal(element('time-metric').textContent,'8.00');assert.equal(element('velocity-metric').textContent,'0.00');assert.equal(element('status-text').textContent,'Paused');
});
test('circular challenge completes without clearing instantaneous speed',()=>{
  click('circular');click('challenge-start');tick(11000);for(let i=1;i<=100;i++)tick(11000+i*100);
  assert.equal(element('challenge-badge').textContent,'COMPLETE');assert.equal(element('distance-metric').textContent,'37.70');assert.equal(element('velocity-metric').textContent,'0.00');assert.match(element('instant-value').textContent,/^4\.00 m\/s/);
});
test('visibility change pauses a running simulation',()=>{
  click('play');document.hidden=true;document.visibilitychange();assert.equal(element('pause').disabled,true);assert.equal(element('status-text').textContent,'Paused');
});
test('all referenced UI IDs exist and local blueprint link resolves',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(ids.size,[...html.matchAll(/\bid="([^"]+)"/g)].length);
  for(const m of ui.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),'Missing '+m[1]);
  assert.ok(fs.existsSync(__dirname+'/public/BLUEPRINT.md'));assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
});
console.log(`\n${checks} checks passed.`);
