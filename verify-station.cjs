// Spin Station: centripetal acceleration a = v² ÷ r = ω²·r, exact turns, playback factors, slips, scoring, and every
// localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/station.html'),'utf8'),copy=require('./locales/station.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'station-model'),pure);const Station=pure.StationModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const P=Math.PI,expected=[8,6.25,Math.sqrt(9.8/200),2*P*Math.sqrt(100/9.8),1.62*3600/(4*P*P)];
const make=(i,a=expected[i])=>{const m=new Station(i);assert.ok(m.setAnswer(a));return m;};

test('each station has the expected answer',()=>{expected.forEach((v,i)=>near(new Station(i).exact(),v));near(expected[4],147.7263,1e-6);});
test('a = v² ÷ r = ω²·r, and the right spin, period, or radius gives the target',()=>{
 const m=make(0);near(m.accel(),m.speed()**2/m.radius());near(m.accel(),8);near(m.period(),2*P*50/20);
 near(make(1).speed(),25);near(make(2).accel(),9.8);near(make(3).accel(),9.8);near(make(4).accel(),1.62);
 near(make(2,2*expected[2]).accel(),4*9.8);near(new Station(4).radius(),0);
});
test('one turn and the half turn are found exactly inside long steps, then the spin freezes',()=>{
 const m=make(3),half=m.advance(m.period()/2+.01);assert.equal(half.half,true);assert.equal(half.done,false);
 const e=m.advance(1e3);assert.equal(e.done,true);near(e.t,expected[3]);near(m.angle(m.now()),2*P);assert.equal(m.status,'spun');
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(1),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(4),b=make(4);a.advance(1e3);while(b.status!=='spun')b.advance(1/120);near(a.t,b.t,1e-12);
});
test('turns play ×4, and long turns play faster so they last at most 10 s',()=>{
 assert.equal(make(0).playback(),4);assert.equal(make(4).playback(),6);const slow=make(2,.049);assert.equal(slow.playback(),Math.ceil(2*P/.049/10));assert.ok(slow.period()/slow.playback()<=10);
});
test('answers count within 2%, and a spin counts as an attempt as soon as it starts',()=>{
 assert.equal(make(0,8.15).evaluate().ok,true);assert.equal(make(0,8.2).evaluate().ok,false);assert.equal(make(4,150).evaluate().ok,true);
 const m=make(1);m.advance(1e3);assert.equal(m.score(),150);
 const n=make(3,15);n.advance(.1);assert.equal(n.attempts,1);n.setAnswer(20.1);n.advance(1e3);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,.4),'noSquare');assert.equal(slip(0,20000),'timesR');assert.equal(slip(0,4),'half');
 assert.equal(slip(1,25),'speedOnly');assert.equal(slip(1,625),'squareAll');assert.equal(slip(1,.000625),'divideR');
 assert.equal(slip(2,.049),'noRoot');assert.equal(slip(2,Math.sqrt(200/9.8)),'invertedOmega');
 assert.equal(slip(3,Math.sqrt(100/9.8)),'noTwoPi');assert.equal(slip(3,2*P*100/9.8),'noRootPeriod');
 assert.equal(slip(4,1.62*60/(2*P)),'speedRadius');assert.equal(slip(4,100),null);
});
test('answers are validated and nothing spins without one',()=>{
 assert.equal(new Station(0).setAnswer(0),false);assert.equal(new Station(2).setAnswer(.01),false);assert.equal(new Station(2).setAnswer(6),false);assert.equal(new Station(4).setAnswer(300),false);assert.equal(new Station(3).setAnswer(.5),false);
 const m=new Station(0);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(2,.3);m.advance(1);const n=new Station();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.attempts,1);near(n.t,1);near(n.answer,.3);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:9},{...s,t:99},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0}]){const k=new Station();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'station-model'),script(source,'station-model'));
 return mount(html,{scripts:['station-model','station-interface'],locale:'station-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=2)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
 const ui=open(lang);
 test(`${lang}: initial state, localized question, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'a =');
  assert.equal(ui.el('omega-value').textContent,fmt(.4,4));assert.equal(ui.el('accel-value').textContent,'—');
  assert.ok(ui.painted.includes(l.viewTitle)&&ui.painted.includes(l.gaugeTitle)&&ui.painted.includes(l.gaugeHint));
 });
 test(`${lang}: the acceleration appears only once the spin starts, and the right prediction earns the bonus`,()=>{
  ui.input('answer',8);assert.ok(ui.painted.includes(l.yourFlag));assert.equal(ui.el('accel-value').textContent,'—');
  ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.4));assert.equal(ui.el('accel-value').textContent,fmt(8));assert.ok(ui.painted.includes(fill(l.feelBanner,{pct:'82'})));
  ui.click('play');ui.run(()=>ui.el('station-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,fill(l.lapCopy,{T:fmt(5*P),a:fmt(8),pct:'82'})+' '+l.why0);
  assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.painted.includes(fill(l.hitBanner,{a:fmt(8)})));
 });
 test(`${lang}: ω² left unrooted falls short of Earth gravity and is explained`,()=>{
  ui.click('mission-2');assert.equal(ui.el('omega-value').textContent,'—');assert.ok(ui.painted.includes(l.earthLabel));
  ui.input('answer',.049);assert.ok(ui.painted.includes(fill(l.playbackLabel,{k:'13'})));ui.click('play');ui.run(()=>ui.el('station-status-text').textContent===l.done);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('lesson-copy').textContent.includes(fill(l.targetLowCopy,{g:fmt(9.8,1),d:fmt(9.8-.049*.049*200)})));
  assert.ok(ui.el('lesson-copy').textContent.endsWith(l.slipNoRoot));assert.ok(ui.el('insight').classList.has('warning'));
 });
 test(`${lang}: the Moon radius hits the target, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('given-4').textContent,'T = 60 s · '+fill(l.targetGiven,{a:fmt(1.62)}));assert.ok(ui.painted.includes(l.moonLabel));
  ui.input('answer',147.73);ui.click('play');ui.run(()=>ui.el('station-status-text').textContent===l.done);assert.ok(ui.el('lesson-copy').textContent.includes(fill(l.targetHitCopy,{g:fmt(1.62)})));assert.equal(ui.el('mission-score').textContent,'150');
  ui.click('mission-3');ui.input('answer',20);ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('station-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves station, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-3');en.input('answer',15);en.click('play');en.run(()=>en.el('station-status-text').textContent===copy.en.done);en.input('answer',20.07);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-3').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'20.07');assert.equal(es.el('station-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('station-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} spin station centripetal-acceleration and multilingual interface checks passed.`);
