module.exports = {
kind:'ohm',model:'OhmModel',title:"Ohm's Law Lab",symbol:'I =',unit:'A',equation:'V = I·R',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .ohm-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','meterLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V_supply','scalar'],['volt-value','voltMetric','V','V = I·R','scalar'],['current-value','currentMetric','A','I = V ÷ R','vector']],
modelCode:String.raw`
class OhmModel {
  // Ohm's law: the current through a fixed resistor is proportional to the voltage across it, V = I·R, so its I–V graph
  // is a straight line through the origin with slope 1 ÷ R. A variable supply ramps steadily from 0 to its set voltage over
  // 2 s and holds for 1 s; the ammeter and voltmeter are ideal and the current is steady at once. The LED is ideal: no
  // current below 2.0 V, and a constant 2.0 V drop once it conducts.
  static T = 3;
  static ramp = 2;
  static led = 2;
  static tolerance = .02;
  static missions = [
    {key:'current',ask:'current',V:12,R:4},
    {key:'resistor',ask:'resistance',V:6,R:24,I:.25},
    {key:'supply',ask:'voltage',V:null,R:220,target:.5},
    {key:'graph',ask:'current',V:9,R:20,point:[2,.1]},
    {key:'led',ask:'resistance',V:9,R:null,led:true,target:.02}
  ];
  static units = {current:'A',resistance:'Ω',voltage:'V'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=OhmModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=(this.config.ask==='voltage'?1e4:1e7);}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The set voltage (your voltage in the supply test) and the resistor (your resistor in the LED test).
  setV(){const c=this.config;return c.V??(this.ready()?this.answer:0);}
  resistor(){const c=this.config;return c.R??(this.ready()?this.answer:Infinity);}
  supply(t){return this.setV()*Math.min(1,Math.max(0,t/OhmModel.ramp));}
  // The current, and the voltage across the resistor (the LED takes its 2.0 V first).
  current(t){const V=this.supply(t),R=this.resistor();if(!Number.isFinite(R))return 0;return this.config.led?Math.max(0,V-OhmModel.led)/R:V/R;}
  across(t){return this.current(t)*(Number.isFinite(this.resistor())?this.resistor():0);}
  duration(){return OhmModel.T;}
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
  exact(){const c=this.config;return {current:()=>c.V/c.R,resistor:()=>c.V/c.I,supply:()=>c.target*c.R,graph:()=>c.V*c.point[1]/c.point[0],led:()=>(c.V-OhmModel.led)/c.target}[c.key]();}
  unit(){return OhmModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=OhmModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='current'){if(near(a,c.V*c.R))slip='currentTimes';else if(near(a,c.R/c.V))slip='currentInverted';}
      else if(c.key==='resistor'){if(near(a,c.V*c.I))slip='resistorTimes';else if(near(a,c.I/c.V))slip='resistorInverted';}
      else if(c.key==='supply'){if(near(a,c.R/c.target))slip='supplyDivided';else if(near(a,c.target/c.R))slip='supplyInverted';}
      else if(c.key==='graph'){if(near(a,c.V*c.point[0]/c.point[1]))slip='graphTimes';else if(near(a,c.point[0]/c.point[1]))slip='graphResistance';}
      else{if(near(a,c.V/c.target))slip='noLed';else if(near(a,OhmModel.led/c.target))slip='ledOnly';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!OhmModel.missions[saved.index])return false;
    const probe=new OhmModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={current:'I =',resistance:'R =',voltage:'V =',};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the supply and the resistor, the meter readings, the point on the line, or the LED's drop and current.
function given(m){
  const keys={current:'givenCurrent',resistor:'givenResistor',supply:'givenSupply',graph:'givenGraph',led:'givenLed'};
  return text(keys[m.key],{V:plain(m.V??0),R:plain(m.R??0),I:plain(m.I??m.target??0),v:plain(m.point?.[0]??OhmModel.led),i:plain(m.point?.[1]??0),m:plain(20)});
}
function equation(){
  const k=model.config.key;
  if(k==='current')return 'I = V ÷ R = 12 ÷ 4 = 3 A';
  if(k==='resistor')return 'R = V ÷ I = 6 ÷ '+plain(.25)+' = 24 Ω';
  if(k==='supply')return 'V = I·R = '+plain(.5)+' × 220 = 110 V';
  if(k==='graph')return 'R = 2 ÷ '+plain(.1)+' = 20 Ω, I = 9 ÷ 20 = '+plain(.45)+' A';
  return 'R = (9 − 2) ÷ '+plain(.02)+' = 350 Ω';
}
function baseEquation(){return 'V = I·R';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','volt-value','current-value'])$(id).textContent='—';return;}
  $('supply-value').textContent=sig(model.supply(t));$('volt-value').textContent=sig(model.across(t));$('current-value').textContent=sig(model.current(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={V:sig(model.supply(t)),U:sig(model.across(t)),I:sig(model.current(t))};
  if(c.led&&model.supply(t)<=OhmModel.led)return text('ledOffCopy',v);
  return text(c.led?'ledCopy':'rampCopy',v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.12,R=area*.88,Ty=110,By=height-120,I=g.begun?model.current(t):0,Vs=g.begun?model.supply(t):0;
  const sx=L,sy=(Ty+By)/2,rx=(L+R)/2+(c.led?-50:0),ax=R,ay=sy,lx=(L+R)/2+60;
  // The loop: supply on the left, resistor on top, the LED beside it in the last test, the ammeter on the right.
  const path=[[sx,sy-30],[sx,Ty],[R,Ty],[R,By],[sx,By],[sx,sy+30]];
  // The supply's label sits on the wire below it, or under the bottom wire when the loop is too short (phones).
  const tagY=By-sy>=80?sy+60:By+16;
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',2);
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(g.begun?sig(Vs)+' V':'? V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  // A chip behind the supply's label, which sits on the wire below the supply.
  const tag=text('supplyTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // The resistor (IEC rectangle).
  box(rx-30,Ty-11,60,22,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.strokeRect(rx-30,Ty-11,60,22);
  fit(c.R?plain(c.R)+' Ω':(model.ready()?plain(model.answer)+' Ω':'R = ?'),rx,Ty-18,'#d1e3ed',10,90,'center');
  // The LED: a triangle and bar, lit by the current it carries.
  if(c.led){
    const b=Math.min(1,I/c.target);if(b>0){dot(lx,Ty,10+18*b,'rgba(255,90,90,'+(.15+.35*b)+')');}
    ctx.beginPath();ctx.moveTo(lx-10,Ty-10);ctx.lineTo(lx-10,Ty+10);ctx.lineTo(lx+8,Ty);ctx.closePath();ctx.fillStyle=b>0?'#ff7b6b':'#102637';ctx.fill();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.stroke();
    line([{x:lx+8,y:Ty-10},{x:lx+8,y:Ty+10}],'#f2f8fc',2);fit(text('ledTag'),lx,Ty-18,'#d1e3ed',10,90,'center');
  }
  // The voltmeter across the resistor, the ammeter in the loop.
  const vy=Ty+52;line([{x:rx-30,y:Ty},{x:rx-30,y:vy},{x:rx-14,y:vy}],'#9fb6c7',1);line([{x:rx+30,y:Ty},{x:rx+30,y:vy},{x:rx+14,y:vy}],'#9fb6c7',1);
  for(const [x,y,s,val] of [[rx,vy,'V',g.begun?sig(model.across(t))+' V':'? V'],[ax,ay,'A',g.begun?sig(I)+' A':'? A']]){
    dot(x,y,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();label(s,x,y+4,'#f2f8fc','center',12);
    box(x-40,y+20,80,20,'#0b1c29');fit(val,x,y+34,'#f2f8fc',11,74,'center');
  }
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),(L+R)/2,By+30,'#efb958',10,area*.6,'center');
  // The two directions: mint current arrows, sky electrons the other way.
  if(g.option&&I>0){
    const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
    const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const u=(d-s0)/l;return [a[0]+(bb[0]-a[0])*u,a[1]+(bb[1]-a[1])*u,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
    const skip=(x,y)=>Math.abs(y-Ty)<14&&(Math.abs(x-rx)<36||(c.led&&Math.abs(x-lx)<16))||Math.hypot(x-ax,y-ay)<18||Math.abs(x-ax)<8&&y>ay&&y<ay+44||Math.abs(x-sx)<8&&y>tagY-16&&y<tagY+8;
    const qEnd=model.current(model.duration())*model.duration()||1,shift=t*I/qEnd*120;
    for(let d=0;d<total;d+=32){const [x,y]=at(d-shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    for(const fr of [.15,.45,.7,.92]){const [x0,y0,ux,uy]=at(fr*total),x=x0-uy*11,y=y0+ux*11;if(skip(x0,y0))continue;line([{x:x-ux*11,y:y-uy*11},{x:x+ux*11,y:y+uy*11}],'#75efc7',3);line([{x:x+ux*4-uy*5,y:y+uy*4+ux*5},{x:x+ux*11,y:y+uy*11},{x:x+ux*4+uy*5,y:y+uy*4-ux*5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('ivGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,R=model.resistor();
  // Voltage across the resistor against current: a straight line through the origin.
  const Vend=Math.max(model.across(model.duration()),c.key==='supply'?c.target*c.R:0,c.point?c.V:0,1e-9)*1.15;
  const Iend=Math.max(model.current(model.duration()),c.target||0,c.key==='current'&&g.guess?Math.min(model.answer,3*c.V/c.R):0,c.key==='graph'&&g.guess?Math.min(model.answer,3*.45):0,1e-9)*1.2;
  const PX=v=>px0+Math.max(0,Math.min(v,Vend))/Vend*(px1-px0),PY=i=>py1-Math.max(0,Math.min(i,Iend))/Iend*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(Number.isFinite(R))line([{x:PX(0),y:PY(0)},{x:PX(Vend),y:PY(Vend/R)}],'#5c7a8f',1,[3,3]);
  if(c.point){dot(PX(c.point[0]),PY(c.point[1]),5,'#d1e3ed');fit(text('pointTag',{v:plain(c.point[0]),i:plain(c.point[1])}),PX(c.point[0])+8,PY(c.point[1])+4,'#d1e3ed',9,(px1-px0)*.6);}
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{I:plain(c.target)}),px0+4,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6);}
  if(g.guess){const a=model.answer;
    if(c.ask==='current'){line([{x:px0,y:PY(a)},{x:px1,y:PY(a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-4,PY(a)+12,'#efb958',9,px1-px0,'right');}
    else if(c.ask==='voltage'){line([{x:PX(a),y:py0},{x:PX(a),y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(a)-4,py0+10,'#efb958',9,px1-px0,'right');}
    else if(!c.led){line([{x:PX(0),y:PY(0)},{x:PX(Vend),y:PY(Vend/a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-4,PY(Math.min(Vend/a,Iend))+12,'#efb958',9,px1-px0,'right');}}
  const pts=[];for(let i=0;i<=40;i++){const s=t*i/40;pts.push({x:PX(model.across(s)),y:PY(model.current(s))});}line(pts,'#d1e3ed',2);dot(PX(model.across(t)),PY(model.current(t)),4,'#f2f8fc');
  label(sig(model.current(t))+' A',PX(model.across(t))-8,PY(model.current(t))-8,'#f2f8fc','right',10);
  for(const v of [0,Vend/2,Vend])label(sig(v),PX(v),py1+14,'#9fb6c7','center',9);
  fit(text('voltAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
