module.exports = {
kind:'powerline',model:'PowerlineModel',title:'Power Line',symbol:'P =',unit:'W',equation:'P_loss = I²·R, I = P ÷ V',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .powerline-page .mission-list span{unicode-bidi:plaintext}.powerline-page .line-key.heat{background:linear-gradient(90deg,#c9d6e0,#ff7b4a)}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['heat','heatLegend'],['orange','guessLegend']],
metrics:[['sent-value','sentMetric','W','P = V·I','scalar'],['current-value','currentMetric','A','I = P ÷ V','vector'],['loss-value','lossMetric','W','P_loss = I²·R','scalar']],
modelCode:String.raw`
class PowerlineModel {
  // A power station sends power P along a line at voltage V, so the line carries I = P ÷ V and heats itself by
  // P_loss = I²·R; the town gets the rest. Raising the voltage tenfold cuts the current tenfold and the loss a
  // hundredfold. The transformers are ideal. The station's output ramps steadily over 2 s and holds for 1 s. Teaching
  // values: the line resistance is the whole route there and back.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static missions = [
    {key:'low',ask:'loss',P:1e5,V:1000,R:.5},
    {key:'high',ask:'loss',P:1e5,V:1e4,R:.5},
    {key:'design',ask:'voltage',P:1e6,V:null,R:2,share:.01},
    {key:'loss',ask:'loss',P:2.2e5,V:11000,R:4},
    {key:'heater',ask:'resistance',V:11000,R:4,house:230,heat:2000}
  ];
  static units = {loss:'W',voltage:'V',resistance:'Ω'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=PowerlineModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=(this.config.ask==='voltage'?1e7:1e9);}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The line voltage (yours in the design test) and the heater at the house (yours in the heater test).
  lineV(){const c=this.config;return c.V??(this.ready()?this.answer:Infinity);}
  heater(){const c=this.config;return c.house&&this.ready()?c.house*c.house/this.answer:0;}
  full(){const c=this.config;if(!c.house)return c.P;const h=this.heater(),i=h/c.V;return h+i*i*c.R;}
  ramp(t){return Math.min(1,Math.max(0,t/PowerlineModel.ramp));}
  sent(t){return this.ready()?this.full()*this.ramp(t):0;}
  current(t){const V=this.lineV();return Number.isFinite(V)?this.sent(t)/V:0;}
  loss(t){const I=this.current(t);return I*I*this.config.R;}
  delivered(t){return this.sent(t)-this.loss(t);}
  duration(){return PowerlineModel.T;}
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
  exact(){
    const c=this.config;
    if(c.key==='design')return c.P/Math.sqrt(c.share*c.P/c.R);
    if(c.key==='heater')return c.house*c.house/c.heat;
    return (c.P/c.V)**2*c.R;
  }
  unit(){return PowerlineModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=PowerlineModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='low'){if(near(a,c.V*c.V/c.R))slip='VsquaredR';else if(near(a,c.P/c.V*c.R))slip='drop';}
      else if(c.key==='high'){if(near(a,x*10))slip='tenth';else if(near(a,x*100))slip='same';}
      else if(c.key==='design'){if(near(a,c.P/(c.share*c.P/c.R)))slip='noRoot';else if(near(a,Math.sqrt(c.share*c.P/c.R)))slip='current';}
      else if(c.key==='loss'){if(near(a,c.P/c.V*c.R))slip='IR';}
      else{if(near(a,c.house/c.heat))slip='VoverP';else if(near(a,c.heat/c.house))slip='currentHeater';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!PowerlineModel.missions[saved.index])return false;
    const probe=new PowerlineModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={loss:'P_loss =',voltage:'V =',resistance:'R ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the power sent (in kW), the line voltage and resistance, the share allowed to be lost, or the heater.
function given(m){
  const keys={low:'givenLow',high:'givenHigh',design:'givenDesign',loss:'givenLoss',heater:'givenHeater'};
  return text(keys[m.key],{P:plain((m.P??0)/1000),V:plain(m.V??0),R:plain(m.R),s:plain(100*(m.share??0)),I:plain(20),H:plain(m.heat??0),h:plain(m.house??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='low')return 'I = 100000 ÷ 1000 = 100 A, P_loss = 100² × '+plain(.5)+' = 5000 W';
  if(k==='high')return 'I = 100000 ÷ 10000 = 10 A, P_loss = 10² × '+plain(.5)+' = 50 W';
  if(k==='design')return 'I = √(10000 ÷ 2) = '+sig(Math.sqrt(5000))+' A, V = 1000000 ÷ '+sig(Math.sqrt(5000))+' = '+sig(1e6/Math.sqrt(5000))+' V';
  if(k==='loss')return 'P_loss = I²·R = 20² × 4 = 1600 W';
  return 'R = V² ÷ P = 230² ÷ 2000 = '+sig(26.45)+' Ω';
}
function baseEquation(){return 'P_loss = I²·R, I = P ÷ V';}
function metrics(t,begun){
  if(!begun){for(const id of ['sent-value','current-value','loss-value'])$(id).textContent='—';return;}
  $('sent-value').textContent=sig(model.sent(t));$('current-value').textContent=sig(model.current(t));$('loss-value').textContent=sig(model.loss(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={P:sig(model.sent(t)),V:sig(model.lineV()),I:sig(model.current(t)),L:sig(model.loss(t)),H:sig(model.heater()*model.ramp(t)),h:plain(c.house??0)};
  return text(c.house?'heaterCopy':'rampCopy',v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const sy=(110+height-120)/2,sx=area*.1,ux=area*.25,dx=area*.75,hx=area*.9,yT=sy-34,yB=sy+34;
  const I=g.begun?model.current(t):0,share=g.begun&&model.sent(t)>0?model.loss(t)/model.sent(t):0,u=Math.min(1,share/.05);
  // The line between the two transformers, warming from gray to orange with the share it loses.
  const hot='rgb('+Math.round(201+54*u)+','+Math.round(214-100*u)+','+Math.round(224-150*u)+')';
  if(u>.2)for(const y of [yT,yB])line([{x:ux+16,y},{x:dx-16,y}],'rgba(255,140,80,'+(.15+.3*u)+')',8);
  line([{x:ux+16,y:yT},{x:dx-16,y:yT}],hot,2.5);line([{x:ux+16,y:yB},{x:dx-16,y:yB}],hot,2.5);
  // The station, the step-up and step-down transformers (paired coils), and the house.
  line([{x:sx,y:sy-20},{x:sx,y:yT},{x:ux-16,y:yT}],'#c9d6e0',2);line([{x:sx,y:sy+20},{x:sx,y:yB},{x:ux-16,y:yB}],'#c9d6e0',2);
  box(sx-30,sy-24,60,48,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-30,sy-24,60,48);box(sx+8,sy-40,10,16,'#5c7a8f');
  fit(text('stationTag'),sx,sy+4,'#d1e3ed',9,56,'center');fit(g.begun?sig(model.sent(t))+' W':'? W',sx,sy+42,'#f2f8fc',10,area*.2,'center');
  for(const [x,key] of [[ux,'stepUpTag'],[dx,'stepDownTag']]){const lx=key==='stepDownTag'?Math.min(x,area*.62):x;
    for(const y of [yT,yB]){ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(x-6,y,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x+6,y,9,0,Math.PI*2);ctx.stroke();}
    line([{x,y:yT+12},{x,y:yB-12}],'#5c7a8f',1,[2,2]);fit(text(key),lx,yB+28,'#9fb6c7',9,area*.2,'center');}
  line([{x:dx+16,y:yT},{x:hx,y:yT},{x:hx,y:sy-14}],'#c9d6e0',2);line([{x:dx+16,y:yB},{x:hx,y:yB},{x:hx,y:sy+14}],'#c9d6e0',2);
  ctx.beginPath();ctx.moveTo(hx-16,sy+14);ctx.lineTo(hx-16,sy-6);ctx.lineTo(hx,sy-20);ctx.lineTo(hx+16,sy-6);ctx.lineTo(hx+16,sy+14);ctx.closePath();ctx.fillStyle='#102637';ctx.fill();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.stroke();
  // The house's labels hang under it, right-aligned to the scene's edge so long ones stay inside on phones.
  const hr=area-8,room=area*.34;
  fit(c.house?text('heaterTag',{P:model.ready()?sig(model.heater()):'?'}):text('townTag'),hr,yB+28,'#d1e3ed',9,room,'right');
  if(c.house)fit(model.ready()?'R = '+plain(model.answer)+' Ω':'R = ?',hr,yB+42,'#efb958',9,room,'right');
  else fit(g.begun?sig(model.delivered(t))+' W':'? W',hr,yB+42,'#f2f8fc',10,room,'right');
  // Labels on the line: its voltage, resistance, and current.
  const mx=(ux+dx)/2;fit((Number.isFinite(model.lineV())?plain(model.lineV()):'?')+' V · '+text('lineTag',{R:plain(c.R)}),mx,yT-14,'#d1e3ed',10,dx-ux-20,'center');
  box(mx-46,sy-10,92,20,'#0b1c29');fit(g.begun?'I = '+sig(I)+' A':'I = ? A',mx,sy+4,'#f2f8fc',11,86,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),area/2,height-60,'#efb958',10,area*.7,'center');
  // The two directions along the line: mint current arrows, sky electrons the other way, at a speed in step with the current.
  if(g.option&&I>0){
    const off=((t*Math.min(240,120*I/100+8))%26+26)%26;
    for(const [y,dir] of [[yT,1],[yB,-1]]){for(let x=ux+20+off;x<dx-20;x+=26){const ex=dir>0?ux+20+(dx-ux-40)-(x-ux-20):x;dot(ex,y,3.5,'#77b9ff');line([{x:ex-2,y},{x:ex+2,y}],'#0b1c29',1.2);}
      const ax=ux+(dx-ux)*.15,ay=y+(dir>0?14:-14);line([{x:ax-10*dir,y:ay},{x:ax+10*dir,y:ay}],'#75efc7',3);line([{x:ax+4*dir,y:ay-5},{x:ax+10*dir,y:ay},{x:ax+4*dir,y:ay+5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g,t=model.now();
  fit(text('lossGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+20,px1=width-14,py0=92,py1=height-64,T=model.duration();
  // Power sent, lost in the line, and delivered: the loss bar is often a sliver, so its value is written above it.
  const vals=[model.sent(t),model.loss(t),model.delivered(t)],cols=['#d1e3ed','#ff9a6a','#75efc7'],keys=['sentBar','lostBar','deliveredBar'],top=Math.max(model.sent(T),1e-9)*1.2;
  const PY=v=>py1-Math.max(0,Math.min(v,top))/top*(py1-py0),w=Math.min(46,(px1-px0)/3*.55);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  vals.forEach((v,i)=>{const x=px0+(px1-px0)*(i+.5)/3;box(x-w/2,Math.min(PY(v),py1-1),w,Math.max(1,py1-PY(v)),cols[i]);label(sig(v)+' W',x,Math.min(PY(v),py1-1)-6,'#f2f8fc','center',9);fit(text(keys[i]),x,py1+14,'#9fb6c7',9,(px1-px0)/3-4,'center');});
  if(vals[0]>0)fit(text('shareTag',{p:sig(100*vals[1]/vals[0])}),g.area+8,66,'#ff9a6a',10,width-g.area-16);
}
`
};
