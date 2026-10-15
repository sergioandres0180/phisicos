// Carousel: uniform circular motion, θ = ω·t, v = ω·r, T = 2π ÷ ω, exact laps and stops, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/carousel.html'),'utf8'),copy=require('./locales/carousel.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'carousel-model'),pure);const Carousel=pure.CarouselModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=Math.PI,expected=[4*P,2*P/10,2.5,4*180/P,3*P];
const make=(i,a=expected[i])=>{const m=new Carousel(i);assert.ok(m.setAnswer(a));return m;};

test('each ride has the expected answer',()=>{expected.forEach((v,i)=>near(new Carousel(i).exact(),v));near(expected[3],229.1831,1e-6);});
test('the angle grows uniformly, v = ω·r, and one lap is 2π rad in T = 2π ÷ ω',()=>{
 const m=make(0);near(m.omega(),.5);near(m.speed(),2);near(m.angle(3),1.5);near(m.angle(6)-m.angle(3),m.angle(3));
 m.advance(1e3);near(m.angle(m.now()),2*P);near(m.now()*m.speed(),2*P*4);
 const k=make(1);k.advance(1e3);near(k.angle(k.now()),2*P);near(make(2).duration(),4*P);near(make(3).angle(5),4);near(make(4).angle(3*P),1.5*P);
});
test('laps and the stop are found exactly inside long steps, then the ride freezes',()=>{
 const m=make(0,30),e=m.advance(1e3);assert.equal(e.done,true);near(e.t,30);assert.equal(e.lap,2);assert.equal(m.status,'stopped');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const n=make(0,30);let laps=[];while(n.status!=='stopped'){const r=n.advance(1/120);if(r?.lap)laps.push(r.lap);}assert.deepEqual(laps,[1,2]);
 const a=make(4),b=make(4);a.advance(1e3);while(b.status!=='stopped')b.advance(1/120);near(a.t,b.t,1e-12);near(b.angle(b.now()),1.5*P);
});
test('rides play ×2, and long rides play faster so they last at most 15 s',()=>{
 assert.equal(make(0).playback(),2);const long=make(4,540);assert.equal(long.playback(),36);assert.ok(long.duration()/long.playback()<=15);
});
test('a drone at the right speed stays over the horse, and a slower one falls behind',()=>{
 const m=make(2);m.advance(1e3);near(m.droneAngle(m.now()),m.angle(m.now()));
 const n=make(2,2);n.advance(1e3);near(n.angle(n.now())-n.droneAngle(n.now()),2*P*.2);
});
test('answers count within 2%, and a ride counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,12.8).evaluate().ok,true);assert.equal(make(0,12.9).evaluate().ok,false);assert.equal(make(3,232).evaluate().ok,true);
 const m=make(1);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(1,.7);n.advance(.1);assert.equal(n.attempts,1);n.setAnswer(expected[1]);n.advance(1e3);assert.equal(n.attempts,2);assert.equal(n.score(),100);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,2),'radius');assert.equal(slip(0,2*P),'halfLap');assert.equal(slip(0,8*P),'distance');assert.equal(slip(0,1/(4*P)),'frequency');
 assert.equal(slip(1,36),'degrees');assert.equal(slip(1,.1),'frequencyOmega');assert.equal(slip(1,.6*10),'rpm');assert.equal(slip(1,10/(2*P)),'inverted');
 assert.equal(slip(2,.1),'divide');assert.equal(slip(2,10),'invertedSpeed');assert.equal(slip(2,.5*180/P*5),'degreesSpeed');assert.equal(slip(2,5*P),'circumference');
 assert.equal(slip(3,4),'radians');assert.equal(slip(3,.16),'angleDivide');assert.equal(slip(3,6.25),'angleInverted');
 assert.equal(slip(4,540),'timeDegrees');assert.equal(slip(4,1.5*P*.5),'timeTimes');assert.equal(slip(4,5),null);
});
test('answers are validated and nothing turns without one',()=>{
 assert.equal(new Carousel(0).setAnswer(0),false);assert.equal(new Carousel(1).setAnswer(41),false);assert.equal(new Carousel(3).setAnswer(-10),false);assert.equal(new Carousel(4).setAnswer(601),false);
 const m=new Carousel(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(3,200);m.advance(9);m.setAnswer(expected[3]);m.advance(1);const n=new Carousel();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,2);near(n.t,1);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:2000},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Carousel();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'carousel-model'),script(source,'carousel-model'));
 return mount(html,{scripts:['carousel-model','carousel-interface'],locale:'carousel-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'T =');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.graphTitle)&&ui.painted.includes(l.startLabel+' · '+l.gateLabel));
 });
 test(`${lang}: the right period on the first ride stops the horse at the gate and earns the bonus`,()=>{
  ui.input('answer',12.566);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.2));
  ui.click('play');ui.run(()=>ui.el('carousel-status-text').textContent===l.done);
  const th=.5*12.566;assert.equal(ui.el('lesson-title').textContent,l.goodTitle);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.stoppedCopy,{t:fmt(12.566),rad:fmt(th),deg:fmt(th*180/Math.PI,1)})+' '+l.gateHitCopy+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.hitBanner,{deg:fmt(th*180/Math.PI,1)})));
 });
 test(`${lang}: the drone's speed stays hidden until the ride starts, then the drone keeps pace`,()=>{
  ui.click('mission-2');assert.equal(ui.el('question').textContent,l.question2);assert.equal(ui.el('speed-value').textContent,'—');
  ui.input('answer',2.5);assert.equal(ui.el('speed-value').textContent,'—');ui.click('step');assert.equal(ui.el('speed-value').textContent,fmt(2.5));assert.ok(ui.painted.includes(l.droneLabel));
  ui.click('play');ui.run(()=>ui.el('carousel-status-text').textContent===l.done);assert.ok(ui.el('lesson-copy').textContent.includes(l.droneHitCopy));assert.equal(ui.el('mission-score').textContent,'150');
 });
 test(`${lang}: an angle left in radians is explained, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-3');ui.input('answer',4);assert.ok(ui.painted.includes(l.yourFlag));ui.click('play');ui.run(()=>ui.el('carousel-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipRadians));assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('given-4').textContent,'ω = '+fmt(.5,1)+' rad/s · '+fill(l.gateGiven,{a:'270'}));
  ui.click('mission-4');ui.input('answer',9.42);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('carousel-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);assert.ok(ui.painted.includes(l.gateLabel));
 });
}
test('changing language preserves ride, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',.3);en.click('play');en.run(()=>en.el('carousel-status-text').textContent===copy.en.done);en.input('answer',.6283);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0.6283');assert.equal(es.el('carousel-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('carousel-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} carousel uniform-circular-motion and multilingual interface checks passed.`);
