module.exports = {
kind:'drift',model:'DriftModel',title:'Snail Electrons',symbol:'v_d =',unit:'mm/s',equation:'I = n·e·A·v_d',sci:true,timeUnits:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .drift-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-arrows','arrowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','taggedLegend'],['orange','guessLegend']],
metrics:[['speed-value','speedMetric','mm/s','v_d = I ÷ (n·e·A)','vector'],['dist-value','distMetric','mm','x = v_d·t','scalar'],['current-value','currentMetric','A','I','scalar']],
modelCode:String.raw`
class DriftModel {
  // Electrons in a copper wire jitter at about 10⁶ m/s, but on top of that they drift slowly against the current:
  // I = n·e·A·v_d, with n = 8.5 × 10²⁸ free electrons per m³, so 1 A in 1 mm² of copper drifts at only 0.0734 mm/s. The
  // signal that sets them all moving runs along the wire at about 2 × 10⁸ m/s, so a lamp lights at once. The current is
  // steady from the start. Times are in each test's own unit (s, h, or ns), shown sped up or slowed so a run takes 4 s.
  static n = 8.5e28;
  static e = 1.602e-19;
  static signal = 2e8;
  static seconds = {s:1,h:3600,ns:1e-9};
  static tolerance = .02;
  static missions = [
    {key:'crawl',ask:'speed',view:'wire',I:1,A:1,tu:'s',T:4},
    {key:'trip',ask:'time',view:'metre',I:1,A:1,L:1,tu:'h',T:1/(1/(8.5e28*1.602e-19*1e-6))/3600},
    {key:'current',ask:'current',view:'wire',v:.1,A:2.5,tu:'s',T:4},
    {key:'thick',ask:'speed',view:'wire',I:1,A:4,ref:1,tu:'s',T:4},
    {key:'signal',ask:'signal',view:'circuit',I:1,A:1,L:3,tu:'ns',T:20}
  ].map(m=>({...m,pace:m.T/4}));
  static units = {speed:'mm/s',time:'h',current:'A',signal:'ns'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=DriftModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e30;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The drift speed in mm/s (A in mm²), given or from I = n·e·A·v_d; the current in A.
  static speedOf(I,A){return I/(DriftModel.n*DriftModel.e*A*1e-6)*1e3;}
  speed(){const c=this.config;return c.v??DriftModel.speedOf(c.I,c.A);}
  current(){const c=this.config;return c.I??DriftModel.n*DriftModel.e*c.A*1e-6*c.v*1e-3;}
  // How far an electron has drifted by time t (in the test's unit), in mm.
  drift(t){return this.speed()*t*DriftModel.seconds[this.config.tu];}
  // The signal's front along the wire (m), and the lamp, lit once it arrives.
  front(t){const c=this.config;return Math.min(c.L,DriftModel.signal*t*1e-9);}
  lit(t){return this.front(t)>=this.config.L;}
  duration(){return this.config.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the test's time.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;return {crawl:this.speed(),trip:c.T,current:this.current(),thick:this.speed(),signal:c.L/DriftModel.signal*1e9}[c.key];}
  unit(){return DriftModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=DriftModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='crawl'){if(near(a,x*1e-6))slip='crawlArea';else if(near(a,x*1e-3))slip='metres';}
      else if(c.key==='trip'){if(near(a,x*3600))slip='tripSeconds';else if(near(a,x*60))slip='tripMinutes';}
      else if(c.key==='current'){if(near(a,x*1e6))slip='currentArea';else if(near(a,x*1e3))slip='speedMetres';}
      else if(c.key==='thick'){if(near(a,x*2))slip='half';else if(near(a,x*4))slip='same';}
      else{if(near(a,c.L/(DriftModel.speedOf(1,1)*1e-3)*1e9))slip='electrons';else if(near(a,x*1e-9))slip='signalSeconds';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!DriftModel.missions[saved.index])return false;
    const probe=new DriftModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v_d =',time:'t =',current:'I =',signal:'t =',};
function timeUnit(){return model.config.tu;}
// Givens: the current and the wire's cross-section, the distance, the drift speed, or the signal's path and speed.
function given(m){
  const keys={crawl:'givenCrawl',trip:'givenTrip',current:'givenCurrent',thick:'givenThick',signal:'givenSignal'};
  return text(keys[m.key],{I:plain(m.I??1),A:plain(m.A),v:plain(m.v??0),L:plain(m.L??1),c:plain(DriftModel.signal)});
}
const neA=A=>Math.round(DriftModel.n*DriftModel.e*A*1e-6);
function equation(){
  const c=model.config,k=c.key;
  if(k==='crawl'||k==='thick')return 'v_d = I ÷ (n·e·A) = 1 ÷ '+neA(c.A)+' = '+plain(Number((model.speed()*1e-3).toPrecision(4)))+' m/s = '+number(model.speed(),4)+' mm/s';
  if(k==='trip')return 't = L ÷ v_d = 1 ÷ '+plain(Number((model.speed()*1e-3).toPrecision(4)))+' = '+Math.round(c.T*3600)+' s = '+number(c.T,2)+' h';
  if(k==='current')return 'I = n·e·A·v_d = '+[8.5e28,DriftModel.e,2.5e-6,1e-4].map(plain).join(' × ')+' = '+number(model.current(),2)+' A';
  return 't = L ÷ v = 3 ÷ '+plain(DriftModel.signal)+' = '+plain(1.5e-8)+' s = 15 ns';
}
function baseEquation(){return 'I = n·e·A·v_d';}
const short=x=>plain(Number(x.toPrecision(4)));
function metrics(t,begun){
  if(!begun){for(const id of ['speed-value','dist-value','current-value'])$(id).textContent='—';return;}
  $('speed-value').textContent=number(model.speed(),4);$('dist-value').textContent=short(model.drift(t));$('current-value').textContent=number(model.current(),2);
}
function values(){const k=model.config.key,x=model.exact();return {x:k==='signal'?plain(x):number(x,k==='crawl'||k==='thick'?4:2)};}
function runningCopy(t){
  const c=model.config;
  if(c.view==='metre')return text('tripCopy',{x:number(model.drift(t)/1000,2),t:number(t)+' h'});
  if(c.view==='circuit')return model.lit(t)?text('litCopy',{d:short(model.drift(t))}):text('signalCopy',{x:number(model.front(t),2)});
  return text('crawlCopy',{x:short(model.drift(t))});
}
// A repeatable scatter: the same electrons in the same places every frame.
const frac=x=>x-Math.floor(x);
// Electrons are sky dots marked −.
let pen=null;
function electron(x,y){pen.dot(x,y,4,'#77b9ff');pen.line([{x:x-2.2,y},{x:x+2.2,y}],'#0b1c29',1.3);}
function scene(g){
  const c=g.c,{line,fit,box,label}=g,area=g.area,t=g.begun?model.now():0;pen=g;
  const L=area*.06,R=area*.94,W=R-L,cy=height*.5,arrow=(x,y,len)=>{line([{x:x-len/2,y},{x:x+len/2,y}],'#75efc7',3);line([{x:x+len/2-7,y:y-5},{x:x+len/2,y},{x:x+len/2-7,y:y+5}],'#75efc7',3);label('I',x,y-8,'#75efc7','center',11);};
  if(c.view==='wire'){
    // A magnified copper wire, 0.5 mm of it across the view; its height grows with √A.
    const h=70*Math.sqrt(c.A),top=cy-h/2,mm=W/.5,shift=model.drift(t)*mm;
    box(L,top,W,h,'#1d3346');line([{x:L,y:top},{x:R,y:top}],'#c9a27a',2);line([{x:L,y:top+h},{x:R,y:top+h}],'#c9a27a',2);
    ctx.save();ctx.beginPath();ctx.rect(L,top,W,h);ctx.clip();
    for(let x=L+11;x<R;x+=22)for(let y=top+11;y<top+h;y+=22)g.dot(x,y,2,'#3a5468');
    // Electrons drift to the left, against the current, while they jitter (thermal motion, not to scale).
    const N=Math.round(W*h/650);
    for(let i=1;i<=N;i++){const bx=frac(i*.6180339)*(W+20),by=top+6+frac(i*.4142136+.17)*(h-12),jx=5*Math.sin(t*(11+i%7)+i),jy=4*Math.cos(t*(13+i%5)+2*i);
      const x=L-10+((bx-shift)%(W+20)+(W+20))%(W+20)+jx;electron(x,by+jy);}
    // The tagged electron, with its trail.
    const x0=L+W*.9,x=x0-shift,tj=3*Math.sin(t*17),ty=cy+3*Math.cos(t*19);
    if(shift>2)line([{x:x0,y:cy},{x:Math.max(L,x),y:cy}],'#f2f8fc',1,[3,3]);
    if(x>L-6){electron(x+tj,ty);ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x+tj,ty,8,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    if(g.option){for(const fr of [.2,.5,.8])arrow(L+fr*W,top-18,32);fit(text('jitterNote'),16,height-24,'#9fb6c7',10,area-28);}
    // Scale bar: 0.1 mm.
    const sb=.1*mm,sy=top+h+22;line([{x:L,y:sy},{x:L+sb,y:sy}],'#d1e3ed',2);line([{x:L,y:sy-4},{x:L,y:sy+4}],'#d1e3ed',1.5);line([{x:L+sb,y:sy-4},{x:L+sb,y:sy+4}],'#d1e3ed',1.5);
    fit(plain(.1)+' mm',L+sb+8,sy+4,'#d1e3ed',10,120);fit(text('areaTag',{A:plain(c.A)}),R,sy+4,'#d1e3ed',10,area*.5,'right');
  }
  else if(c.view==='metre'){
    // One metre of the same wire; the tagged electron crawls along it.
    const y=cy,frac1=model.drift(t)/1000;box(L,y-7,W,14,'#1d3346');line([{x:L,y:y-7},{x:R,y:y-7}],'#c9a27a',1.5);line([{x:L,y:y+7},{x:R,y:y+7}],'#c9a27a',1.5);
    for(let i=0;i<=10;i++){const x=L+i/10*W;line([{x,y:y+10},{x,y:y+(i%5?16:22)}],'#9fb6c7',1);}
    // The ruler counts from the right-hand end, where the tagged electron starts.
    for(const [v,s] of [[0,'0'],[.5,plain(.5)+' m'],[1,'1 m']])label(s,R-v*W,y+36,'#9fb6c7','center',10);
    const ex=R-frac1*W;electron(ex,y);ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(ex,y,8,0,Math.PI*2);ctx.stroke();
    if(frac1>0)line([{x:R,y:y-14},{x:ex,y:y-14}],'#f2f8fc',1,[3,3]);
    if(g.option){for(const fr of [.25,.75])arrow(L+fr*W,y-34,32);fit(text('jitterNote'),16,height-24,'#9fb6c7',10,area-28);}
    if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' h',R,y-56,'#efb958',10,area*.5,'right');
  }
  else{
    // A battery, a switch closed at t = 0, and 3 m of wire to a lamp; the signal runs along the wire at 2 × 10⁸ m/s.
    const x0=L+40,x1=R-30,ty=cy-60,by=cy+60,f=model.front(t)/c.L,fx=x0+f*(x1-x0),on=model.lit(t)&&g.begun;
    line([{x:x0,y:ty},{x:x1,y:ty},{x:x1,y:by},{x:L,y:by},{x:L,y:ty},{x:L+16,y:ty}],'#c9d6e0',2);
    line([{x:L+16,y:ty},{x:x0,y:ty}],'#f2f8fc',2.5);g.dot(L+16,ty,3,'#d1e3ed');g.dot(x0,ty,3,'#d1e3ed');
    box(L-14,cy-4,28,8,'#0b1c29');line([{x:L-12,y:cy-4},{x:L+12,y:cy-4}],'#f2f8fc',2.5);line([{x:L-6,y:cy+4},{x:L+6,y:cy+4}],'#f2f8fc',2.5);label('+',L+16,cy-6,'#75efc7','left',11);label('−',L+16,cy+12,'#77b9ff','left',11);
    if(g.begun&&f>0){line([{x:x0,y:ty},{x:fx,y:ty}],'rgba(255,230,160,.55)',8);g.dot(fx,ty,6,'rgba(255,230,160,.9)');}
    const ly=cy;box(x1-17,ly-17,34,34,'#102637');if(on){g.dot(x1,ly,34,'rgba(255,214,120,.35)');g.dot(x1,ly,14,'rgba(255,230,160,.85)');}
    ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.arc(x1,ly,14,0,Math.PI*2);ctx.stroke();line([{x:x1-10,y:ly-10},{x:x1+10,y:ly+10}],'#f2f8fc',2);line([{x:x1-10,y:ly+10},{x:x1+10,y:ly-10}],'#f2f8fc',2);
    for(let i=0;i<=6;i++){const x=x0+i/6*(x1-x0);line([{x,y:ty-10},{x,y:ty-(i%2?14:18)}],'#9fb6c7',1);}
    for(const [v,s] of [[0,'0'],[1/3,'1 m'],[2/3,'2 m'],[1,'3 m']])label(s,x0+v*(x1-x0),ty-24,'#9fb6c7','center',10);
    for(let x=x0+14;x<x1-14;x+=24)electron(x,ty);
    if(g.option&&g.begun)for(const fr of [.25,.5,.75])if(fr<=f)arrow(x0+fr*(x1-x0),ty+32,30);
    fit(text('signalTag'),x0,by+24,'#d1e3ed',10,area*.6);
    if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' ns',R,by+24,'#efb958',10,area*.35,'right');
  }
  fit('t = '+number(t)+' '+c.tu,area-16,44,'#f2f8fc',13,area*.3,'right');
  fit(text('paceNote',{t:plain(Number(c.pace.toPrecision(3)))+' '+c.tu}),area-16,62,'#9fb6c7',10,area*.4,'right');
}
function panel(g){
  const c=g.c,{line,fit,label}=g,t=model.now(),k=c.key;
  const title={wire:k==='current'?'chargeGraph':'driftGraph',metre:'driftGraph',circuit:'signalGraph'}[c.view];
  fit(text(title),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+40,px1=width-14,py0=70,py1=height-64,T=c.T,timed=c.ask==='time'||c.ask==='signal',xmax=timed?T*1.25:T;
  // What is plotted against time: drift (mm), charge through a cut (C), distance along the metre (m), or the signal's front (m).
  const sec=DriftModel.seconds[c.tu],f=k==='current'?s=>model.current()*s*sec:c.view==='metre'?s=>model.drift(s)/1000:c.view==='circuit'?s=>model.front(s):s=>model.drift(s);
  const unit=k==='current'?'C':c.view==='wire'?'mm':'m',total=c.view==='circuit'?c.L:f(T);
  let top=total*1.25;if(g.guess&&!timed){const gt=model.answer*T*sec;if(gt>top&&gt<total*3)top=gt*1.1;}
  const PX=s=>px0+Math.max(0,Math.min(s,xmax))/xmax*(px1-px0),PY=q=>py1-Math.max(0,Math.min(q,top))/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(c.ref){const r=s=>DriftModel.speedOf(c.I,c.ref)*s;const s1=Math.min(T,top/DriftModel.speedOf(c.I,c.ref));line([{x:PX(0),y:PY(0)},{x:PX(s1),y:PY(r(s1))}],'#5c7a8f',1.5,[3,3]);fit(text('areaTag',{A:plain(c.ref)}),PX(s1)-4,PY(r(s1))+12,'#9fb6c7',9,px1-px0,'right');}
  if(g.guess){
    const a=model.answer;
    if(timed){line([{x:PX(a),y:py0},{x:PX(a),y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(a)-4,py0+10,'#efb958',9,px1-px0,'right');}
    else{const q=s=>a*s*sec,s1=Math.min(T,top/(q(1)||1));line([{x:PX(0),y:PY(0)},{x:PX(s1),y:PY(q(s1))}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(s1)-4,PY(q(s1))-6,'#efb958',9,px1-px0,'right');}
  }
  const steps=40,pts=[];for(let i=0;i<=steps;i++){const s=t*i/steps;pts.push({x:PX(s),y:PY(f(s))});}line(pts,'#d1e3ed',2);g.dot(PX(t),PY(f(t)),4,'#f2f8fc');
  for(const s of [0,T/2,T])label(plain(Number(s.toPrecision(3))),PX(s),py1+14,'#9fb6c7','center',9);
  line([{x:px0-3,y:PY(total)},{x:px0+3,y:PY(total)}],'#9fb6c7',1);fit(short(total)+' '+unit,px0+6,PY(total)-4,'#9fb6c7',9,(px1-px0)*.5);
  fit(text('timeAxis',{u:c.tu}),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
