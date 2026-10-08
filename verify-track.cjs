// Train Track: positions in a chosen frame, displacement invariance, exact arrival, slips, scoring, and every localized interface.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,script}=require('./verify-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'src/track.html'),'utf8'),copy=require('./locales/track.cjs');
const root=path.resolve(__dirname,process.env.SITE_OUTPUT||'dist');
const pure=vm.createContext({});vm.runInContext(script(source,'track-model'),pure);const Track=pure.TrackModel;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const expected=[[700,700],[-500,-500],[900,600],[-300,600],[300,900],[-600,-900]];
const make=(i,[f,d]=expected[i])=>{const m=new Track(i);m.setPrediction(f,d);return m;};

test('each mission has the expected final position and displacement in its frame',()=>{
 expected.forEach(([xf,dx],i)=>{const a=new Track(i).answers();near(a.xf,xf);near(a.dx,dx);near(a.xf-a.xi,a.dx);});
});
test('moving the origin changes positions but never the displacement; flipping +x flips both signs',()=>{
 const m=make(2);m.advance(1e3);const base=m.displacement();
 for(let o=0;o<5;o++){assert.equal(m.setFrame(o,1),true);near(m.displacement(),base);near(m.position(),Track.stations[3]-Track.stations[o]);}
 m.setFrame(2,-1);near(m.displacement(),-base);near(m.position(),-(900-500));
});
test('the train runs at 20 m/s and arrives exactly inside a long step, then freezes',()=>{
 const m=make(0);m.advance(10);near(m.u(),700);near(m.distance(),200);near(m.velocity(),20);
 assert.equal(m.advance(24.9),null);const e=m.advance(5);near(e.t,35);assert.equal(m.status,'arrived');near(m.position(),700);near(m.velocity(),0);
 const frozen=JSON.stringify(m.snapshot());assert.equal(m.advance(3),null);assert.equal(JSON.stringify(m.snapshot()),frozen);
 const a=make(5),b=make(5);a.advance(1e3);while(b.status!=='arrived')b.advance(1/120);near(a.t,b.t,1e-12);near(a.t,45);
});
test('velocity is signed by the frame: moving west with +x east is negative',()=>{const m=make(1);m.advance(1);near(m.velocity(),-20);const w=make(4);w.advance(1);near(w.velocity(),20);});
test('the frame is locked until arrival, and Reset returns to the mission frame',()=>{
 const m=make(0);assert.equal(m.setFrame(0,1),false);m.advance(1e3);assert.equal(m.setFrame(4,-1),true);assert.equal(m.setFrame(7,1),false);assert.equal(m.setFrame(1,0),false);
 m.reset();assert.equal(m.origin,2);assert.equal(m.dir,1);assert.equal(m.t,0);
});
test('scoring is judged in the mission frame, even after exploring another frame',()=>{
 const m=make(3);m.advance(1e3);assert.equal(m.score(),100);m.setFrame(0,-1);assert.equal(m.score(),100);
 const half=make(0,[700,0]);half.advance(1e3);assert.equal(half.score(),50);assert.equal(make(0).score(),0);
 const p=make(0,[700.4,699.6]);p.advance(1e3);assert.equal(p.score(),100);
});
test('classic slips are recognized',()=>{
 const e=(i,f,d)=>make(i,[f,d]).evaluate();
 assert.equal(e(1,500,-500).finalSlip,'sign');assert.equal(e(3,900,600).finalSlip,'track');assert.equal(e(3,600,600).finalSlip,'distance');
 assert.equal(e(2,900,900).dispSlip,'final');assert.equal(e(5,-600,900).dispSlip,'sign');assert.equal(e(0,650,650).finalSlip,null);
});
test('predictions must be numbers, and edits restart the trip',()=>{
 const m=make(0);m.advance(3);assert.equal(m.setPrediction(NaN,1),false);assert.equal(m.t,3);m.setPrediction(700,10);assert.equal(m.t,0);
 const blank=new Track(0);assert.equal(blank.advance(5),null);assert.equal(blank.t,0);
});
test('language transfer snapshot restores the trip and an explored frame, and rejects invalid values',()=>{
 const m=make(4);m.advance(1e3);m.setFrame(0,1);const n=new Track();assert.equal(n.restore(JSON.parse(JSON.stringify(m.snapshot()))),true);
 assert.equal(n.status,'arrived');assert.equal(n.origin,0);assert.equal(n.dir,1);near(n.position(),0);
 const r=make(2);r.advance(4);const s=r.snapshot();assert.equal(new Track().restore(s),true);
 for(const bad of [{...s,index:8},{...s,final:'x'},{...s,t:1e6},{...s,status:'lost'},{...s,origin:4},{...s,final:null}]){const k=new Track();assert.equal(k.restore(bad),false);assert.equal(k.index,0);}
});

const langs=Object.keys(copy);
const open=(lang,storage)=>{
 const html=fs.readFileSync(path.join(root,copy[lang].route,'index.html'),'utf8');
 assert.equal(script(html,'track-model'),script(source,'track-model'));
 return mount(html,{scripts:['track-model','track-interface'],locale:'track-locale',langs,storage});
};
for(const lang of langs){
 const l=copy[lang],fmt=(n,d=0)=>n.toLocaleString(lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}),sg=n=>(n>0?'+':'')+fmt(n);
 const ui=open(lang);
 test(`${lang}: initial state, localized frame givens, and canvas labels`,()=>{
  assert.equal(ui.el('lesson-title').textContent,l.predictTitle);assert.equal(ui.el('train-status-text').textContent,l.ready);assert.equal(ui.el('play').disabled,true);
  assert.equal(ui.el('given-4').textContent.replace(/ /g,' '),l.givenFrame.replace('{o}','B').replace('{dir}',l.towardWest)+' · D → A');
  assert.equal(ui.el('origin-0').disabled,true);assert.ok(ui.painted.includes(l.origin)&&ui.painted.includes('300 m')&&ui.painted.includes(l.east));
 });
 test(`${lang}: a right prediction scores, then exploring the frame changes x but not Δx`,()=>{
  ui.input('final-answer',700);ui.input('disp-answer',700);ui.click('step');assert.equal(ui.el('time-value').textContent,fmt(.5,1));assert.equal(ui.el('train-status-text').textContent,l.paused);
  ui.click('play');ui.run(()=>ui.el('train-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.goodTitle);assert.equal(ui.el('lesson-copy').textContent,l.why0);assert.equal(ui.el('mission-score').textContent,'100');
  assert.ok(ui.el('final-badge').classList.has('earned')&&ui.el('disp-badge').classList.has('earned'));assert.equal(ui.el('position-value').textContent,sg(700));
  ui.click('origin-4');assert.equal(ui.el('position-value').textContent,fmt(0));assert.equal(ui.el('disp-value').textContent,sg(700));
  assert.equal(ui.el('lesson-title').textContent,l.exploreTitle.replace('{o}','E').replace('{dir}',l.towardEast));assert.equal(ui.el('mission-score').textContent,'100');
  ui.click('dir-west');assert.equal(ui.el('disp-value').textContent,sg(-700));
  ui.click('reset');assert.equal(ui.el('origin-2').attributes['aria-pressed'],'true');assert.equal(ui.el('origin-0').disabled,true);
 });
 test(`${lang}: slips get their own explanation`,()=>{
  ui.click('mission-3');assert.equal(ui.el('final-answer').value,'');
  ui.input('final-answer',900);ui.input('disp-answer',-300);ui.click('play');ui.run(()=>ui.el('train-status-text').textContent===l.arrived);
  assert.equal(ui.el('lesson-title').textContent,l.checkTitle);assert.equal(ui.el('mission-score').textContent,'0');assert.ok(ui.el('insight').classList.has('warning'));
  assert.equal(ui.el('lesson-copy').textContent,[l.finalTrack.replace('{mo}','E'),l.dispFinal,l.tryExplore].join(' '));
 });
 test(`${lang}: focus loss pauses without advancing time`,()=>{
  ui.click('reset');ui.click('play');ui.run(()=>false,{limit:3});ui.windowEvents.get('blur')();assert.equal(ui.el('train-status-text').textContent,l.paused);
  const time=ui.el('time-value').textContent;ui.run(()=>false,{limit:3});assert.equal(ui.el('time-value').textContent,time);
 });
}
test('changing language preserves mission, predictions, trip, and explored frame',()=>{
 const storage=new Map(),en=open('en',storage);en.click('mission-4');en.input('final-answer',300);en.input('disp-answer',900);en.click('play');en.run(()=>en.el('train-status-text').textContent===copy.en.arrived);en.click('origin-0');
 en.links.find(l=>l.lang==='es').events.click();assert.equal(storage.size,1);
 const es=open('es',storage);assert.equal(storage.size,0);
 assert.equal(es.el('mission-4').attributes['aria-pressed'],'true');assert.equal(es.el('origin-0').attributes['aria-pressed'],'true');assert.equal(es.el('origin-0').disabled,false);
 assert.equal(es.el('train-status-text').textContent,copy.es.arrived);assert.equal(es.el('mission-score').textContent,'100');
});
console.log(`\n${checks} train track position and multilingual interface checks passed.`);
