// Rope Pulse: what a wave is. A pulse's speed, a ribbon that never moves along the rope, amplitude measured from the
// resting line, two pulses adding where they overlap, an inverted echo from a fixed end, the exact end of each run, slips,
// the 0 answer, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/pulse.html'),'utf8'),copy=require('./locales/pulse.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'pulse-model'),pure);const Pulse=pure.PulseModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[4,0,15,16,3],units=['m/s','cm','cm','cm','s'];
const make=(i,a=expected[i])=>{const m=new Pulse(i);assert.ok(m.setAnswer(a));return m;};

test('each test has the expected answer and unit',()=>{expected.forEach((x,i)=>{const m=new Pulse(i);near(m.exact(),x);assert.equal(m.unit(),units[i]);});});
test('the pulse travels at v while the ribbon only moves up and down',()=>{
 const m=make(0);near(m.duration(),2);near(m.front(.5),2);near(m.front(2),8);
 for(const t of [.25,.8,1.3])near(m.height(4*t+.3,t),m.bump(.3));
 const r=make(1);let top=0;for(let t=0;t<=2;t+=.005)top=Math.max(top,r.ribbonHeight(t));near(top,.15,1e-6);near(r.ribbonHeight(1),.15);near(r.ribbonHeight(0),0);near(r.ribbonHeight(2),0);
 near(r.ribbonHeight(.5),0);assert.equal(r.config.ribbon,4);
});
test('the amplitude test sends one full wave: the ribbon goes 15 cm up and 15 cm down',()=>{
 const m=make(2);let hi=0,lo=0;for(let t=0;t<=2;t+=.001){const y=m.ribbonHeight(t);hi=Math.max(hi,y);lo=Math.min(lo,y);}near(hi,.15,1e-5);near(lo,-.15,1e-5);near(m.ribbonHeight(2),0);
});
test('pulses add where they overlap, then carry on unchanged',()=>{
 const m=make(3);near(m.height(4,1),.16);near(m.height(4,0),0);near(m.height(8,2),.1);near(m.height(0,2),.06);
 for(const x of [1,2.5,4,5.5,7])near(m.height(x,.6),m.bump(x-2.4)+m.bump(x-5.6,.06));
});
test('at the fixed end the rope stays still and the pulse comes back upside down',()=>{
 const m=make(4);near(m.duration(),3);for(let t=0;t<=3;t+=.1)near(m.height(6,t),0,1e-12);
 near(m.height(0,3),-.12);near(m.height(1,.25),.12);near(m.front(1),4);near(m.front(2),4);near(m.front(3),0);
});
test('every run ends exactly inside long steps',()=>{
 for(const [i,a] of [[0,4],[1,0],[2,15],[3,16],[4,3],[4,1.5]]){const p=make(i,a),q=make(i,a);const r=p.advance(100);assert.equal(r.done,true);near(r.t,p.duration());while(q.status!=='done')q.advance(1/120);near(p.t,q.t,1e-12);}
 const k=make(4);k.advance(100);const frozen=JSON.stringify(k.snapshot());assert.equal(k.advance(1),null);assert.equal(JSON.stringify(k.snapshot()),frozen);
});
test('every answer counts within 2%; the ribbon counts up to half a centimetre; a run counts as soon as it starts',()=>{
 for(const [i,x] of expected.entries()){if(!x)continue;assert.equal(make(i,x*1.019).evaluate().ok,true);assert.equal(make(i,x*.981).evaluate().ok,true);assert.equal(make(i,x*1.021).evaluate().ok,false);assert.equal(make(i,x*.979).evaluate().ok,false);}
 assert.equal(make(1,0).evaluate().ok,true);assert.equal(make(1,.5).evaluate().ok,true);assert.equal(make(1,.6).evaluate().ok,false);
 const m=make(0);m.advance(10);assert.equal(m.score(),150);assert.equal(make(0).score(),0);
 const n=make(1,800);n.advance(.01);assert.equal(n.attempts,1);n.setAnswer(0);n.advance(10);assert.equal(n.score(),100);assert.equal(n.attempts,2);
});
test('classic slips are recognized',()=>{
 const slip=(i,a)=>make(i,a).evaluate().slip;
 assert.equal(slip(0,16),'multiplied');assert.equal(slip(0,.25),'inverted');assert.equal(slip(0,6),null);
 assert.equal(slip(1,800),'pulseDistance');assert.equal(slip(1,15),'upDown');assert.equal(slip(1,30),'upAndDown');assert.equal(slip(1,4),null);
 assert.equal(slip(2,30),'crestToTrough');assert.equal(slip(2,.15),'unitsM');assert.equal(slip(2,7.5),null);
 assert.equal(slip(3,4),'subtracted');assert.equal(slip(3,10),'bigger');assert.equal(slip(3,8),'average');assert.equal(slip(3,60),null);
 assert.equal(slip(4,1.5),'oneWay');assert.equal(slip(4,24),'timesSpeed');assert.equal(slip(4,1/3),'speedOverDistance');assert.equal(slip(4,6),null);
});
test('answers are validated; 0 is allowed only for the ribbon; nothing moves without an answer',()=>{
 for(const bad of [0,-1,Infinity,NaN,1e4+1])assert.equal(new Pulse(0).setAnswer(bad),false);assert.equal(new Pulse(0).setAnswer(1e4),true);
 assert.equal(new Pulse(1).setAnswer(0),true);assert.equal(new Pulse(1).setAnswer(-.1),false);for(const i of [2,3,4])assert.equal(new Pulse(i).setAnswer(0),false);
 const m=new Pulse(1);assert.equal(m.advance(1),null);assert.equal(m.t,0);assert.equal(m.attempts,0);assert.throws(()=>make(0).advance(-1));
});
test('language transfer snapshot restores and rejects invalid values',()=>{
 const m=make(4,2);m.advance(1);const n=new Pulse();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);assert.equal(n.index,4);assert.equal(n.attempts,1);near(n.t,1);
 const z=make(1,0);z.advance(.5);const w=new Pulse();assert.equal(w.restore(JSON.parse(JSON.stringify(z.snapshot()))),true);assert.equal(w.answer,0);
 const s=m.snapshot();for(const bad of [{...s,index:5},{...s,answer:'x'},{...s,answer:0},{...s,t:9},{...s,status:'lost'},{...s,attempts:-1},{...s,attempts:0},{...s,answer:null}]){const k=new Pulse(2);assert.equal(k.restore(bad),false);assert.equal(k.index,2);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'pulse-model'),script(source,'pulse-model'));
 return mount(html,{scripts:['pulse-model','pulse-interface'],locale:'pulse-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],plain=n=>n.toLocaleString(lang,{maximumFractionDigits:3,useGrouping:false}),fill=(s,x)=>s.replace(/\{(\w+)\}/g,(_,k)=>x[k]??'{'+k+'}');
 const num=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
 const cm=m=>num(m*100,1);
 const values=m=>{const c=m.config;return {v:num(c.v),d:num(c.L,1),t:num(m.duration()),h:cm(c.A),A:cm(c.A),p:cm(c.A+(c.A2??0))};};
 const ui=open(lang),done=()=>ui.el('pulse-status-text').textContent===l.done;
 test(`${lang}: initial state, localized question, givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('play').disabled,true);assert.equal(ui.el('question').textContent,l.question0);assert.equal(ui.el('answer-symbol').textContent,'v =');assert.equal(ui.el('answer-unit').textContent,'m/s');
  assert.equal(ui.el('given-0').textContent,'L = 8 m · t = 2 s');assert.equal(ui.el('given-1').textContent,'d = 8 m · '+l.ribbonTag);assert.equal(ui.el('given-2').textContent,'+15 cm · −15 cm');
  assert.equal(ui.el('given-3').textContent,'10 cm + 6 cm');assert.equal(ui.el('given-4').textContent,'L = 6 m · v = 4 m/s');
  for(const id of ['front-value','ribbon-value','along-value','speed-value'])assert.equal(ui.el(id).textContent,'—');assert.equal(ui.el('pulse-equation').textContent,'v = d ÷ t');
  for(const key of ['viewTitle','frontGraph','panelHint','scaleNote','ribbonTag'])assert.ok(ui.painted.includes(l[key]),key);
 });
 test(`${lang}: the readings appear once the pulse starts, and its speed is right on the first try`,()=>{
  ui.input('answer',4);assert.equal(ui.el('front-value').textContent,'—');
  ui.click('step');const m=make(0),t=12/120;
  assert.equal(ui.el('front-value').textContent,num(m.front(t)));assert.equal(ui.el('ribbon-value').textContent,cm(m.ribbonHeight(t)));assert.equal(ui.el('along-value').textContent,num(4));assert.equal(ui.el('speed-value').textContent,num(4));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.movingCopy,{x:num(m.front(t)),y:cm(m.ribbonHeight(t))}));
  assert.equal(ui.el('pulse-equation').textContent,`v = d ÷ t = 8 ÷ 2 = ${num(4)} m/s`);
  ui.click('play');ui.run(done);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('mission-score').textContent,'150');assert.ok(ui.el('first-badge').classList.has('earned'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result0,values(m))+' '+l.why0);assert.ok(ui.painted.includes(l.rightBanner)&&ui.painted.includes(l.guessTag));
 });
 test(`${lang}: the pulse's distance for the ribbon, then 0`,()=>{
  ui.click('mission-1');assert.equal(ui.el('answer-symbol').textContent,'Δx =');assert.equal(ui.el('answer-unit').textContent,'cm');ui.input('answer',800);ui.click('play');ui.run(done);const m=make(1);
  assert.equal(ui.el('lesson-title').textContent,l.missTitle);assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+fill(l.missCopy,{p:plain(800)+' cm'})+' '+l.slipPulseDistance);assert.ok(ui.painted.includes(l.offBanner));
  assert.equal(ui.el('pulse-equation').textContent,`d_pulse = v·t = ${num(8,1)} m · Δx_ribbon = ${num(0,1)} cm`);assert.ok(ui.painted.includes(l.ribbonGraph));
  ui.input('answer',0);assert.equal(ui.el('play').disabled,false);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result1,values(m))+' '+l.why1);
 });
 test(`${lang}: the amplitude is measured from the resting line`,()=>{
  ui.click('mission-2');assert.equal(ui.el('answer-symbol').textContent,'A =');ui.input('answer',15);ui.click('play');ui.run(done);
  assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result2,values(make(2)))+' '+l.why2);
  assert.equal(ui.el('pulse-equation').textContent,`A = (y_max − y_min) ÷ 2 = 30 ÷ 2 = ${num(15,1)} cm`);
 });
 test(`${lang}: subtracting overlapping pulses, then adding them`,()=>{
  ui.click('mission-3');assert.equal(ui.el('answer-symbol').textContent,'y =');ui.input('answer',4);ui.click('play');ui.run(done);const m=make(3);
  assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+fill(l.missCopy,{p:plain(4)+' cm'})+' '+l.slipSubtracted);
  ui.input('answer',16);ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'100');assert.equal(ui.el('lesson-copy').textContent,fill(l.result3,values(m))+' '+l.why3);
  assert.equal(ui.el('pulse-equation').textContent,`y = y₁ + y₂ = 10 + 6 = ${num(16,1)} cm`);assert.ok(ui.painted.includes(l.middleGraph));
 });
 test(`${lang}: the echo, and focus loss pauses without advancing time`,()=>{
  ui.click('mission-4');assert.equal(ui.el('answer-symbol').textContent,'t =');assert.equal(ui.el('answer-unit').textContent,'s');ui.input('answer',3);
  ui.click('play');ui.run(()=>false,{limit:2});ui.windowEvents.get('blur')();assert.equal(ui.el('pulse-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
  ui.click('play');ui.run(done);assert.equal(ui.el('mission-score').textContent,'150');assert.equal(ui.el('lesson-copy').textContent,fill(l.result4,values(make(4)))+' '+l.why4);
  assert.equal(ui.el('pulse-equation').textContent,`t = 2·L ÷ v = 2 × 6 ÷ 4 = ${num(3)} s`);
 });
}
test('changing language preserves test, answer, attempts, and run',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-1');en.input('answer',800);en.click('play');en.run(()=>en.el('pulse-status-text').textContent===copy.en.done);
 assert.ok(en.el('lesson-copy').textContent.endsWith(copy.en.slipPulseDistance));en.input('answer',0);en.click('step');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-1').attributes['aria-pressed'],'true');assert.equal(es.el('answer').value,'0');assert.equal(es.el('pulse-status-text').textContent,copy.es.paused);
 es.click('play');es.run(()=>es.el('pulse-status-text').textContent===copy.es.done);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} rope pulse wave and multilingual interface checks passed.`);
