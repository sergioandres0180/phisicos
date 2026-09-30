const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'src/lander.html'),'utf8'),copy=require('./locales/lander.cjs');
const script=(html,id)=>html.match(new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)<\\/script>'))[1];
const pure=vm.createContext({});vm.runInContext(script(source,'lander-physics'),pure);const Lander=pure.LanderPhysics;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const make=options=>new Lander({...Lander.presets.moon,...options});
test('Moon free fall changes signed velocity by −g each second',()=>{const m=make({h0:100,v0:0});m.advance(1,0);near(m.h,99.19);near(m.v,-1.62);near(m.t,1);near(m.fuel,30);});
test('Mars preset has greater constant gravity',()=>{const m=new Lander({...Lander.presets.mars,h0:100,v0:0});m.advance(1);near(m.h,98.145);near(m.v,-3.71);});
test('upward net acceleration slows a descending module',()=>{const m=make({h0:100,v0:-10});m.advance(1,1);near(m.h,92.19);near(m.v,-5.62);near(m.fuel,29);});
test('balanced acceleration preserves descent and only hovers if velocity is zero',()=>{const a=make({h0:100,v0:-10});a.advance(1,.27);near(a.h,90);near(a.v,-10);const b=make({h0:100,v0:0});b.advance(10,.27);near(b.h,100);near(b.v,0);});
test('fuel exhaustion splits a step exactly before ballistic motion',()=>{const m=make({h0:100,v0:0,fuel0:.5});m.advance(2,1);near(m.h,102.01);near(m.v,-.24);near(m.fuel,0);near(m.acceleration(1).thrust,0);});
test('platform crossing is detected even if the final mathematical height is positive',()=>{const m=make({h0:1,v0:-4,g:2,aMax:8});m.advance(1.2,1);near(m.t,1/3);near(m.h,0);near(m.v,-2);assert.equal(m.status,'crashed');near(m.fuel,30-1/3);});
test('tangential contact at zero velocity is a safe landing',()=>{const m=make({h0:8,v0:-8,g:2,aMax:6});m.advance(3,1);near(m.t,2);near(m.v,0);assert.equal(m.status,'landed');assert.ok(m.score()>0);});
test('a braking trajectory above the platform must not trigger contact',()=>{const m=make({h0:10,v0:-8,g:2,aMax:6});m.advance(3,1);near(m.h,4);near(m.v,4);assert.equal(m.status,'flight');});
test('terminal snapshot retains actual impact velocity and cannot advance',()=>{const m=make({h0:1,v0:0});m.advance(10);near(m.v,-1.8);assert.equal(m.status,'crashed');near(m.impact.velocity,-1.8);near(m.score(),0);const snapshot=JSON.stringify(m.snapshot());m.advance(10,1);assert.equal(JSON.stringify(m.snapshot()),snapshot);});
test('safe speed threshold and precision score are based on precontact velocity',()=>{for(const [v0,status] of [[-1.5,'landed'],[-1.5001,'crashed']]){const m=make({h0:1,v0,g:1.62,aMax:6});m.advance(1,.27);near(m.v,v0);assert.equal(m.status,status);}});
test('fractional throttle burns a proportional allowance',()=>{const m=make({h0:100,v0:0});m.advance(4,.5);near(m.fuel,28);near(m.acceleration(.5).net,1.38);});
test('braking guide states power and fuel limits',()=>{const m=make({v0:-10});near(m.braking(1).distance,100/(2*4.38));assert.ok(m.braking(1).enoughFuel);assert.equal(m.braking(.1).distance,Infinity);m.fuel=1;assert.equal(m.braking(1).enoughFuel,false);});
test('event result is independent of timestep partitioning within numerical tolerance',()=>{for(const options of [{h0:100,v0:-10,fuel0:.5},{h0:8,v0:-8,g:2,aMax:6}]){const a=make(options),b=make(options);a.advance(3,1);for(let i=0;i<360;i++)b.advance(1/120,1);near(a.h,b.h,1e-6);near(a.v,b.v,1e-6);near(a.fuel,b.fuel,1e-6);near(a.t,b.t,1e-6);assert.equal(a.status,b.status);}});
test('default mission admits a safe fuel-saving landing',()=>{
 let low=0,high=8;for(let i=0;i<60;i++){const mid=(low+high)/2,m=make();m.advance(mid);if(m.h>m.braking(1).distance)low=mid;else high=mid;}
 const m=make();m.advance((low+high)/2);m.advance(-m.v/(m.config.aMax-m.config.g)+.01,1);
 assert.equal(m.status,'landed');near(m.v,0,1e-6);assert.ok(m.fuel/m.config.fuel0>.3);
});
test('language transfer restores flight and rejects invalid values',()=>{const m=make();m.advance(2,.5);const n=make();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);near(n.h,m.h);near(n.v,m.v);near(n.t,m.t);assert.equal(n.restore({...m.snapshot(),h:-1}),false);});

function mount(lang,storage=new Map()){
 const html=fs.readFileSync(path.join(__dirname,'dist',copy[lang].route,'index.html'),'utf8');
 const elements=new Map(),frames=[],events=new Map(),windowEvents=new Map(),painted=[];
 const drawing=new Proxy({measureText:s=>({width:s.length*9})}, {get:(o,k)=>o[k]??((...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),'nonfinite canvas coordinate');if(k==='fillText')painted.push(args[0]);}),set:(o,k,v)=>(o[k]=v,true)});
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const tag=m[0],id=m[1];assert.ok(!elements.has(id));elements.set(id,{id,value:tag.match(/value="([^"]*)"/)?.[1]??'',checked:/\bchecked\b/.test(tag),hidden:/\bhidden\b/.test(tag),disabled:/\bdisabled\b/.test(tag),textContent:id==='lander-locale'?script(html,id):'',events:{},attributes:{},classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k);}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.events[k]=f;},getContext(){return drawing;},getBoundingClientRect(){return{width:800,height:410};}});}
 const el=id=>{assert.ok(elements.has(id),'Missing ID '+id);return elements.get(id);};
 const links=Object.keys(copy).map(lang=>({lang,events:{},addEventListener(k,f){this.events[k]=f;}}));
 const doc={hidden:false,getElementById:el,querySelectorAll(selector){assert.equal(selector,'.language-menu a');return links;},addEventListener(k,f){events.set(k,f);}};
 const win={devicePixelRatio:2,addEventListener(k,f){windowEvents.set(k,f);}};
 const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const env=vm.createContext({document:doc,window:win,sessionStorage,requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}},console});
 assert.equal(script(html,'lander-physics'),script(source,'lander-physics'));
 vm.runInContext(script(html,'lander-physics'),env);vm.runInContext(script(html,'lander-interface'),env);
 return {el,doc,links,events,windowEvents,painted,storage,click(id){assert.ok(!el(id).disabled,id+' disabled');el(id).events.click({target:el(id)});},input(id,value){el(id).value=String(value);el(id).events.input({target:el(id)});},tick(time){frames.splice(0).forEach(fn=>fn(time));}};
}
for(const lang of Object.keys(copy)){
 const l=copy[lang],ui=mount(lang),fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 test(`${lang}: controls, canvas labels, instructions and local numeric formats initialize`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('flight-status-text').textContent,l.ready);assert.ok(ui.painted.includes(l.platform));ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.1));assert.equal(ui.el('flight-status-text').textContent,l.paused);
  assert.equal(ui.el('velocity-value').textContent,fmt(-4.162));
 });
 test(`${lang}: thrust toggles, balanced descent, setup reset and Mars preset work`,()=>{
  ui.click('reset');ui.input('throttle',27);ui.click('thruster');ui.click('step');assert.equal(ui.el('lesson-title').textContent,l.balancedTitle);assert.equal(ui.el('net-value').textContent,fmt(0));
  ui.input('gravity',2);assert.equal(ui.el('time-value').textContent,fmt(0));assert.equal(ui.el('thruster').attributes['aria-pressed'],'false');
  ui.click('mars');assert.equal(ui.el('gravity-value').textContent,fmt(3.71)+' m/s²');assert.equal(ui.el('planet-label').textContent,l.marsScene);
 });
 test(`${lang}: hold-to-thrust clears on release and focus loss without changing paused time`,()=>{
  ui.click('moon');ui.input('throttle',100);ui.events.get('keydown')({code:'Space',repeat:false,target:{tagName:'BODY'},preventDefault(){}});assert.equal(ui.el('thruster').attributes['aria-pressed'],'true');
  ui.click('step');assert.equal(ui.el('lesson-title').textContent,l.brakeTitle);ui.events.get('keyup')({code:'Space',preventDefault(){}});assert.equal(ui.el('thruster').attributes['aria-pressed'],'false');
  ui.click('play');ui.tick(0);ui.tick(100);ui.windowEvents.get('blur')();assert.equal(ui.el('flight-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.tick(200);assert.equal(ui.el('time-value').textContent,time);
 });
 test(`${lang}: hard landing preserves nonzero contact velocity and localizes the result`,()=>{
  ui.click('reset');ui.click('play');ui.tick(1000);for(let i=1;i<=200;i++)ui.tick(1000+i*100);
  assert.equal(ui.el('flight-status-text').textContent,l.crashed);assert.equal(ui.el('lesson-title').textContent,l.crashTitle);assert.equal(ui.el('velocity-label').textContent,l.contactLabel);assert.equal(ui.el('contact-note').hidden,false);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('mission-score').textContent,0);assert.notEqual(ui.el('velocity-value').textContent,fmt(0));
 });
}
test('changing language preserves flight position, velocity, fuel and controls while pausing',()=>{
 const storage=new Map(),en=mount('en',storage);en.input('throttle',55);en.click('thruster');en.click('play');en.tick(0);en.tick(100);en.click('pause');
 const alt=en.el('altitude-value').textContent,vel=en.el('velocity-value').textContent;
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=mount('es',storage);assert.equal(storage.size,0);assert.equal(es.el('flight-status-text').textContent,copy.es.paused);near(Number(es.el('altitude-value').textContent.replace(',','.')),Number(alt));near(Number(es.el('velocity-value').textContent.replace(',','.')),Number(vel));assert.equal(es.el('throttle').value,55);assert.equal(es.el('thruster').attributes['aria-pressed'],'true');
});
test('small positive velocities and accelerations retain the correct teaching state',()=>{
 const ui=mount('en');ui.input('initial-speed',0);ui.input('max-thrust',1.7);ui.click('thruster');ui.click('step');assert.equal(ui.el('lesson-title').textContent,copy.en.riseTitle);
 ui.input('initial-speed',4);ui.input('max-thrust',1.63);ui.click('thruster');ui.click('step');assert.equal(ui.el('lesson-title').textContent,copy.en.brakeTitle);assert.equal(ui.el('net-value').textContent,'+0.01');
});
for(const lang of Object.keys(copy))test(`${lang}: soft touchdown earns precision and eco badges with localized contact feedback`,()=>{
 const m=make();m.h=.1;m.v=-.5;m.t=5;m.fuel=29;
 const storage=new Map([['motion-lab-lander-language-transfer',JSON.stringify({flight:m.snapshot(),power:.27,latched:true})]]),ui=mount(lang,storage);
 for(let i=0;i<4&&!ui.el('step').disabled;i++)ui.click('step');
 assert.equal(ui.el('flight-status-text').textContent,copy[lang].landed);assert.equal(ui.el('lesson-title').textContent,copy[lang].safeTitle);assert.ok(ui.el('precision-badge').classList.values.has('earned'));assert.ok(ui.el('eco-badge').classList.values.has('earned'));assert.ok(Number(ui.el('mission-score').textContent)>100);
});
console.log(`\n${checks} lander physics and multilingual interface checks passed.`);
