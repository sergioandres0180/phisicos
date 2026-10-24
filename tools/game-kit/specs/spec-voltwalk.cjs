module.exports = {
kind:'voltwalk',model:'VoltWalkModel',title:'Voltmeter Walk',symbol:'V =',unit:'V',equation:'V = V_red − V_black',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .voltwalk-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['red','redLegend'],['orange','guessLegend']],
metrics:[['reading-value','readingMetric','V','V_red − V_black','scalar'],['red-value','redMetric','V','V_red','scalar'],['black-value','blackMetric','V','V_black','scalar'],['current-value','currentMetric','A','I','vector']],
modelCode:String.raw`
class VoltWalkModel {
  // A voltage is always between two points: a voltmeter reads the potential at its red probe minus the potential at its
  // black probe, V = V_red − V_black. Round a circuit, a cell lifts the potential by its voltage, each resistor or bulb lets
  // it fall by I·R, and wires keep it level; an open switch stops the current, so nothing drops anywhere and the whole
  // voltage appears across the gap. Cells, wires, and the meter are ideal (the meter takes no current), resistors and the
  // bulb are fixed resistances, and the current is steady at once. The loop is a rectangle followed from the − end of the
  // first cell (s = 0) all the way round (s = 1); the probes walk onto their points over 2 s and rest there 1 s.
  static T = 3;
  static reach = 2;
  static tolerance = .02;
  static zeroWindow = .05;
  static missions = [
    {key:'backwards',ask:'voltage',parts:[{type:'cell',s:[.12,.21],emf:9},{type:'res',s:[.62,.71],R:18,bulb:true}],red:.09,black:.24},
    {key:'gap',ask:'voltage',parts:[{type:'cell',s:[.12,.21],emf:9},{type:'switch',s:[.37,.46]},{type:'res',s:[.62,.71],R:18,bulb:true}],red:.355,black:.475},
    {key:'wire',ask:'voltage',parts:[{type:'cell',s:[.12,.21],emf:9},{type:'res',s:[.62,.71],R:18,bulb:true}],red:.355,black:.475},
    {key:'junction',ask:'voltage',parts:[{type:'cell',s:[.12,.21],emf:12},{type:'res',s:[.55,.62],R:2},{type:'res',s:[.71,.78],R:4}],red:.665,black:.09},
    {key:'opposed',ask:'voltage',parts:[{type:'cell',s:[.05,.13],emf:9},{type:'cell',s:[.19,.26],emf:-1.5},{type:'res',s:[.62,.71],R:5}],red:.29,black:.02}
  ];
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=VoltWalkModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // Readings are signed and may be 0.
  valid(value){return Number.isFinite(value)&&Math.abs(value)<=1000;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  open(){return this.config.parts.some(p=>p.type==='switch');}
  // The current round the loop (A): every cell's voltage over every resistance, or none with the switch open.
  current(){if(this.open())return 0;const P=this.config.parts,E=P.reduce((s,p)=>s+(p.emf||0),0),R=P.reduce((s,p)=>s+(p.R||0),0);return E/R;}
  // The potential (V) at s round the loop: up through cells, down I·R through resistors, and an open gap takes the rest.
  potential(s){
    const I=this.current(),P=this.config.parts,E=P.reduce((a,p)=>a+(p.emf||0),0);let V=0;
    for(const p of P){const d=p.type==='cell'?p.emf:p.type==='res'?-I*p.R:-E,[a,b]=p.s;if(s>=b)V+=d;else if(s>a)V+=d*(s-a)/(b-a);}
    return V;
  }
  landed(t){return t>=VoltWalkModel.reach;}
  reading(t){const c=this.config;return this.landed(t)?this.potential(c.red)-this.potential(c.black):null;}
  duration(){return VoltWalkModel.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at 3 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){return {backwards:-9,gap:9,wire:0,junction:8,opposed:7.5}[this.config.key];}
  unit(){return 'V';}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=VoltWalkModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q),zero=v=>Math.abs(v)<=VoltWalkModel.zeroWindow;
    // A reading of 0 needs its own window of 0.05 V.
    const ok=x===0?zero(a):near(a,x);let slip=null;
    if(!ok){
      if(c.key==='backwards'){if(near(a,9))slip='sign';}
      else if(c.key==='gap'){if(zero(a))slip='zero';else if(near(a,-9))slip='swappedGap';}
      else if(c.key==='wire'){if(near(Math.abs(a),9))slip='battery';}
      else if(c.key==='junction'){if(near(a,4))slip='drop';else if(near(a,-4))slip='againstPlus';else if(near(a,12))slip='wholeBattery';}
      else{if(near(a,10.5))slip='added';else if(near(a,9))slip='ignoredCell';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!VoltWalkModel.missions[saved.index])return false;
    const probe=new VoltWalkModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={voltage:'V =',};
const v2=x=>number(x,2).replace('-','−');
// Givens: the circuit and where the probes go.
function given(m){return text(['givenBackwards','givenGap','givenWire','givenJunction','givenOpposed'][VoltWalkModel.missions.indexOf(m)],{V:plain(9),W:plain(12),a:plain(2),b:plain(4),c:plain(1.5),R:plain(5)});}
function equation(){
  const k=model.config.key;
  if(k==='backwards')return 'V = V_red − V_black = 0 − 9 = '+plain(-9)+' V';
  if(k==='gap')return 'I = 0: V = 9 − 0 = 9 V';
  if(k==='wire')return 'V = I·R_wire = I × 0 = 0 V';
  if(k==='junction')return 'V = 12 − 2 A × 2 Ω = 8 V';
  return 'V = 9 − '+plain(1.5)+' = '+plain(7.5)+' V';
}
function baseEquation(){return 'V = V_red − V_black';}
function metrics(t,begun){
  const c=model.config,on=begun&&model.landed(t);
  $('reading-value').textContent=on?v2(model.reading(t)):'—';$('red-value').textContent=on?v2(model.potential(c.red)):'—';
  $('black-value').textContent=on?v2(model.potential(c.black)):'—';$('current-value').textContent=begun?number(model.current(),3):'—';
}
function values(){return {x:plain(model.exact())};}
function runningCopy(t){
  if(!model.landed(t))return text('walkCopy');
  const c=model.config;return text('readCopy',{r:v2(model.potential(c.red)),b:v2(model.potential(c.black)),V:v2(model.reading(t))});
}
// Where s round the loop lies on the rectangle: u along the front and back, v from front (0) to back (1).
function plane(s){const d=((s%1)+1)%1*3;if(d<1)return [d,0];if(d<1.5)return [1,(d-1)/.5];if(d<2.5)return [1-(d-1.5),1];return [0,1-(d-2.5)/.5];}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,P=c.parts;
  const x0=area*.08,y0=height*.8,Wp=area*.6,Dp=height*.2,skew=Wp*.36;
  let vmax=1;for(let i=0;i<=200;i++)vmax=Math.max(vmax,Math.abs(model.potential(i/200)));const k=150/vmax;
  const base=s=>{const [u,v]=plane(s);return {x:x0+u*Wp+v*skew,y:y0-v*Dp};},up=s=>{const b=base(s);return {x:b.x,y:b.y-model.potential(s)*k};};
  // The ground: the circuit's outline at 0 V, and faint walls up to the potential of every point.
  ctx.beginPath();ctx.fillStyle='#0d2232';const corners=[0,1/3,.5,5/6].map(base);ctx.moveTo(corners[0].x,corners[0].y);for(const q of corners.slice(1))ctx.lineTo(q.x,q.y);ctx.closePath();ctx.fill();
  line([...corners,corners[0]],'#2f4a5e',1,[4,4]);fit('0 V',corners[0].x-6,corners[0].y+4,'#9fb6c7',9,40,'right');
  for(let i=0;i<200;i++){const s=i/200,a=base(s),b=up(s);if(Math.abs(a.y-b.y)>1&&i%2===0)line([a,b],'#183448',1);}
  // The elevated circuit: wires level, cells ramps up, resistors and the bulb ramps down; an open switch is a gap.
  const inPart=s=>P.find(p=>s>p.s[0]&&s<p.s[1]);
  let run=[],kind=null;const flush=()=>{if(run.length>1)line(run,kind==='cell'?'#75efc7':kind==='res'?'#9fb6c7':'#c9d6e0',kind&&kind!=='wire'?4:2.5);run=[];};
  for(let i=0;i<=600;i++){const s=i/600,p=inPart(s),kd=p?p.type:'wire';if(kd!==kind){const last=run[run.length-1];flush();if(last&&kd!=='switch'&&kind!=='switch')run.push(last);kind=kd;}if(kd!=='switch')run.push(up(s));}
  flush();
  for(const p of P){
    const m=up((p.s[0]+p.s[1])/2),a=up(p.s[0]),b=up(p.s[1]);
    if(p.type==='cell'){const hiEnd=p.emf>0?b:a,loEnd=p.emf>0?a:b;label('+',hiEnd.x,hiEnd.y-8,'#75efc7','center',12);label('−',loEnd.x,loEnd.y-8,'#77b9ff','center',12);fit(plain(Math.abs(p.emf))+' V',m.x,m.y-16,'#f2f8fc',11,70,'center');}
    else if(p.type==='res'){if(p.bulb){const on=g.begun&&model.current()>0;if(on)dot(m.x,m.y,20,'rgba(255,214,120,.3)');dot(m.x,m.y,11,'#102637');ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.arc(m.x,m.y,11,0,Math.PI*2);ctx.stroke();line([{x:m.x-7,y:m.y-7},{x:m.x+7,y:m.y+7}],'#f2f8fc',2);line([{x:m.x-7,y:m.y+7},{x:m.x+7,y:m.y-7}],'#f2f8fc',2);}
      else{box(m.x-14,m.y-7,28,14,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.strokeRect(m.x-14,m.y-7,28,14);fit(plain(p.R)+' Ω',m.x,m.y-13,'#f2f8fc',10,60,'center');}}
    else{dot(a.x,a.y,3.5,'#d1e3ed');dot(b.x,b.y,3.5,'#d1e3ed');line([a,{x:a.x+(b.x-a.x)*.7,y:a.y-18}],'#f2f8fc',2.5);fit('S',(a.x+b.x)/2+12,(a.y+b.y)/2,'#9fb6c7',10,20);}
  }
  // The two directions while current flows: mint arrows for the current, sky dots for the electrons going the other way.
  const I=model.current();
  if(g.option&&g.begun&&I>0){
    const off=t*I*.06;
    for(let s=0;s<1;s+=.035){const q=((s-off)%1+1)%1,p=inPart(q);if(p)continue;const pt=up(q);dot(pt.x,pt.y,4,'#77b9ff');line([{x:pt.x-2.5,y:pt.y},{x:pt.x+2.5,y:pt.y}],'#0b1c29',1.5);}
    for(const s of [.3,.45,.88]){if(inPart(s))continue;const a=up(s),b=up(s+.01),L=Math.hypot(b.x-a.x,b.y-a.y)||1,ux=(b.x-a.x)/L,uy=(b.y-a.y)/L,x=a.x-uy*12,y=a.y+ux*12;
      line([{x:x-ux*10,y:y-uy*10},{x:x+ux*10,y:y+uy*10}],'#75efc7',3);line([{x:x+ux*10-ux*7+uy*5,y:y+uy*10-uy*7-ux*5},{x:x+ux*10,y:y+uy*10},{x:x+ux*10-ux*7-uy*5,y:y+uy*10-uy*7+ux*5}],'#75efc7',3);}
  }
  // The voltmeter and its probes, which walk from the meter onto their points over 2 s.
  const mx=area-104,my=54;box(mx,my,92,40,'#0b1c29');ctx.strokeStyle='#8aa3b5';ctx.lineWidth=1;ctx.strokeRect(mx,my,92,40);
  const rd=g.begun?model.reading(t):null;fit(rd===null?'? V':v2(rd)+' V',mx+46,my+18,'#f2f8fc',14,84,'center');label('V',mx+12,my+34,'#9fb6c7','center',9);
  dot(mx+30,my+34,4,'#ff7b6b');dot(mx+62,my+34,4,'#2a3640');ctx.strokeStyle='#d1e3ed';ctx.beginPath();ctx.arc(mx+62,my+34,4,0,Math.PI*2);ctx.stroke();
  const ease=Math.min(1,t/2),e2=ease*ease*(3-2*ease);
  for(const [s,col,jack] of [[c.red,'#ff7b6b',[mx+30,my+38]],[c.black,'#c9d6e0',[mx+62,my+38]]]){
    const tg=up(s),px=jack[0]+(tg.x-jack[0])*e2,py=jack[1]+(tg.y-jack[1])*e2;
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.moveTo(jack[0],jack[1]);ctx.quadraticCurveTo(px,jack[1]+10,px,py);ctx.stroke();
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.arc(tg.x,tg.y,8,0,Math.PI*2);ctx.stroke();
    dot(px,py,5,col===('#ff7b6b')?'#ff7b6b':'#2a3640');if(col!=='#ff7b6b'){ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(px,py,5,0,Math.PI*2);ctx.stroke();}
  }
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' V',mx+46,my+56,'#efb958',10,area*.3,'center');
  if(g.option)fit(text('heightNote',{V:plain(Math.round(vmax))}),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',mx-10,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('profileGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The potential all the way round the loop, unrolled, with the two probe points and the reading between them.
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64;let lo=0,hi=1;for(let i=0;i<=200;i++){const v=model.potential(i/200);lo=Math.min(lo,v);hi=Math.max(hi,v);}
  const Vb=model.potential(c.black),Vr=model.potential(c.red),gv=g.guess?Vb+model.answer:null;if(gv!==null){hi=Math.max(hi,Math.min(gv,hi+12));lo=Math.min(lo,Math.max(gv,lo-12));}
  const span=(hi-lo)*1.15||1,top=hi+span*.08,bot=top-span,PX=s=>px0+s*(px1-px0),PY=v=>py1-(Math.max(bot,Math.min(top,v))-bot)/(top-bot)*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(0)},{x:px1,y:PY(0)}],'#5c7a8f',1,[3,3]);
  for(const p of c.parts){const a=PX(p.s[0]),b=PX(p.s[1]);ctx.fillStyle=p.type==='cell'?'rgba(117,239,199,.12)':p.type==='res'?'rgba(159,182,199,.12)':'rgba(239,185,88,.08)';ctx.fillRect(a,py0,b-a,py1-py0);}
  const pts=[];for(let i=0;i<=400;i++)pts.push({x:PX(i/400),y:PY(model.potential(i/400))});line(pts,'#d1e3ed',2);
  if(model.landed(t)){line([{x:PX(c.red),y:py0},{x:PX(c.red),y:py1}],'#ff7b6b',1.5);line([{x:PX(c.black),y:py0},{x:PX(c.black),y:py1}],'#c9d6e0',1.5,[2,2]);
    dot(PX(c.red),PY(Vr),5,'#ff7b6b');dot(PX(c.black),PY(Vb),5,'#2a3640');const bx=px1-8;line([{x:bx,y:PY(Vb)},{x:bx,y:PY(Vr)}],'#75efc7',2);line([{x:PX(c.black),y:PY(Vb)},{x:bx,y:PY(Vb)}],'#5c7a8f',1,[2,3]);line([{x:PX(c.red),y:PY(Vr)},{x:bx,y:PY(Vr)}],'#5c7a8f',1,[2,3]);}
  if(gv!==null){line([{x:px0,y:PY(gv)},{x:px1,y:PY(gv)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(gv)-5,'#efb958',9,px1-px0);}
  for(const v of [Math.round(hi),0])label(plain(v)+' V',px0-4,PY(v)+3,'#9fb6c7','right',9);
  fit(text('loopAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
