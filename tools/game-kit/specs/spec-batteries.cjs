module.exports = {
kind:'batteries',model:'BatteryModel',title:'Battery Stack',symbol:'V =',unit:'V',equation:'V = ΣV_cell, W = Q·V',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .batteries-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','wireLegend'],['orange','guessLegend']],
metrics:[['volt-value','voltMetric','V','V','scalar'],['current-value','currentMetric','A','I = V ÷ R','vector'],['power-value','powerMetric','W','P = V·I','scalar'],['charge-value','chargeMetric','C','Q = I·t','scalar']],
modelCode:String.raw`
class BatteryModel {
  // Cells in a row add their voltages, a cell turned round takes its voltage away, and cells side by side give the voltage of
  // one. A voltage moves charge: each coulomb that goes round gains V joules, W = Q·V. Cells are ideal (no internal
  // resistance), wires are ideal, the voltmeter takes no current, and the lamp is a fixed resistance; the current is steady
  // the moment the switch closes. The cells click into the holder one after another over 2 s, the switch closes at 2.5 s, and
  // the run ends at 4 s; in the energy test the switch is closed from 1 s to 3 s with 0.25 A flowing.
  static T = 4;
  static fill = 2;
  static close = 2.5;
  static tolerance = .02;
  static missions = [
    {key:'stack',ask:'voltage',layout:'series',emf:1.5,cells:[1,1,1,1],lamp:12,full:3},
    {key:'flipped',ask:'voltage',layout:'series',emf:1.5,cells:[1,1,-1,1],lamp:12,full:3},
    {key:'side',ask:'voltage',layout:'parallel',emf:1.5,cells:[1,1,1],lamp:12,full:3},
    {key:'energy',ask:'energy',layout:'battery',emf:9,cells:[1],lamp:36,full:2.25,on:[1,3]},
    {key:'enough',ask:'count',layout:'series',emf:1.2,cells:null,lamp:9,full:9,target:9}
  ];
  static units = {voltage:'V',energy:'J',count:''};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BatteryModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // The count is a whole number of cells from 1 to 20; voltages and energies are positive.
  valid(value){if(!Number.isFinite(value))return false;return this.config.ask==='count'?Number.isInteger(value)&&value>=1&&value<=20:value>0&&value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The cells' orientations: given, or your number of cells in the last test.
  cells(){const c=this.config;return c.cells??(this.ready()?Array(this.answer).fill(1):[]);}
  // How far each cell has slid in at time t (0 to 1); a battery is in place from the start.
  inserted(t){const c=this.config,n=this.cells().length;if(c.layout==='battery')return [1];return this.cells().map((_,i)=>Math.min(1,Math.max(0,(t-i*BatteryModel.fill/n)/(BatteryModel.fill/n))));}
  // The voltage across the holder at time t: cells count once they are fully in.
  voltage(t){
    const c=this.config,cells=this.cells(),f=this.inserted(t);
    if(c.layout==='parallel')return f.some(x=>x>=1)?c.emf:0;
    return cells.reduce((V,s,i)=>V+(f[i]>=1?s*c.emf:0),0);
  }
  closed(t){const c=this.config;return c.on?t>=c.on[0]&&t<c.on[1]:t>=BatteryModel.close;}
  current(t){return this.closed(t)?this.voltage(t)/this.config.lamp:0;}
  power(t){return this.voltage(t)*this.current(t);}
  // The charge that has gone round the circuit by time t (C); the voltage is steady while the switch is closed.
  charge(t){const c=this.config,a=c.on?c.on[0]:BatteryModel.close,b=c.on?c.on[1]:BatteryModel.T,dt=Math.max(0,Math.min(t,b)-a);return dt*this.voltage(b)/c.lamp;}
  duration(){return BatteryModel.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at 4 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const k=this.config.key;return {stack:6,flipped:3,side:1.5,energy:4.5,enough:8}[k];}
  unit(){return BatteryModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=BatteryModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    // The fewest cells is a whole number: only 8 works.
    const ok=c.ask==='count'?a===x:near(a,x);let slip=null;
    if(!ok){
      if(c.key==='stack'){if(near(a,1.5))slip='parallel';}
      else if(c.key==='flipped'){if(near(a,4.5))slip='dropped';else if(near(a,6))slip='ignored';}
      else if(c.key==='side'){if(near(a,4.5))slip='added';}
      else if(c.key==='energy'){if(near(a,18))slip='divided';else if(near(a,.5/9))slip='inverted';}
      else if(a===7)slip='roundedDown';else if(a===6)slip='oneFive';
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BatteryModel.missions[saved.index])return false;
    const probe=new BatteryModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={voltage:'V =',energy:'W =',count:'n =',};
const v2=x=>number(x,2);
// Givens: how many cells and how they sit, the battery and the charge, or the voltage needed.
function given(m){return text(['givenStack','givenFlipped','givenSide','givenEnergy','givenEnough'][BatteryModel.missions.indexOf(m)],{e:plain(m.emf),V:plain(9),Q:plain(.5)});}
function equation(){
  const c=model.config,p=plain(1.5);
  if(c.key==='stack')return 'V = '+[p,p,p,p].join(' + ')+' = '+number(6,1)+' V';
  if(c.key==='flipped')return 'V = '+p+' + '+p+' − '+p+' + '+p+' = '+number(3,1)+' V';
  if(c.key==='side')return 'V = V_cell = '+number(1.5,1)+' V';
  if(c.key==='energy')return 'W = Q·V = '+plain(.5)+' × 9 = '+number(4.5,1)+' J';
  return 'n ≥ 9 ÷ '+plain(1.2)+' = '+plain(7.5)+' → n = 8';
}
function baseEquation(){return 'V = ΣV_cell, W = Q·V';}
function metrics(t,begun){
  if(!begun){for(const id of ['volt-value','current-value','power-value','charge-value'])$(id).textContent='—';return;}
  $('volt-value').textContent=v2(model.voltage(t));$('current-value').textContent=number(model.current(t),3);
  $('power-value').textContent=v2(model.power(t));$('charge-value').textContent=number(model.charge(t),3);
}
function values(){const c=model.config,x=model.exact();return {x:c.ask==='count'?plain(x):number(x,1)};}
function runningCopy(t){
  const c=model.config,V=model.voltage(t),vals={V:v2(V),P:v2(model.power(t)),Q:number(model.charge(t),2),W:number(model.charge(t)*V,2)};
  if(c.on)return text(t<c.on[0]?'readyFlowCopy':t<c.on[1]?'flowCopy':'stopCopy',vals);
  if(!model.closed(t))return text('insertCopy',vals);
  if(c.target&&V<c.target)return text('dimCopy',vals);
  return text('litCopy',vals);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.1,R=area*.9,cx=(L+R)/2,Ty=96,By=height-122,sy=(Ty+By)/2,cells=model.cells(),n=cells.length,f=model.inserted(t);
  const V=g.begun?model.voltage(t):0,I=g.begun?model.current(t):0,on=g.begun&&model.closed(t),dir=V<0?-1:1;
  // The holder's ends, where the wires join.
  let hx0,hx1;
  if(c.layout==='series'){const cw=Math.min(56,(R-L)*.62/Math.max(n,4));hx0=cx-Math.max(n,1)*cw/2;hx1=cx+Math.max(n,1)*cw/2;}
  else if(c.layout==='parallel'){hx0=cx-40;hx1=cx+40;}else{hx0=cx-46;hx1=cx+46;}
  // The loop of wire: from the holder's right end, round past the switch and the lamp, back to its left end.
  const path=[[hx1,By],[R,By],[R,Ty],[L,Ty],[L,By],[hx0,By]];
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',2);
  // The switch on the right-hand wire: open, or closed once the run reaches it.
  box(R-4,sy-14,8,28,'#102637');dot(R,sy+12,3,'#d1e3ed');dot(R,sy-12,3,'#d1e3ed');
  line(on?[{x:R,y:sy+12},{x:R,y:sy-12}]:[{x:R,y:sy+12},{x:R+15,y:sy-8}],'#f2f8fc',2.5);fit('S',R+10,sy+18,'#9fb6c7',10,20);
  // The lamp (IEC symbol), glowing with the power it uses.
  const b=Math.min(1,model.power(t)/c.full)*(g.begun?1:0);box(cx-17,Ty-17,34,34,'#102637');
  if(b>0){dot(cx,Ty,16+22*b,'rgba(255,214,120,'+(.12+.3*b)+')');dot(cx,Ty,14,'rgba(255,230,160,'+(.25+.6*b)+')');}
  ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.arc(cx,Ty,14,0,Math.PI*2);ctx.stroke();
  line([{x:cx-10,y:Ty-10},{x:cx+10,y:Ty+10}],'#f2f8fc',2);line([{x:cx-10,y:Ty+10},{x:cx+10,y:Ty-10}],'#f2f8fc',2);
  if(c.target)fit(text('ratedTag',{V:plain(c.target)}),cx,Ty-24,'#d1e3ed',10,area*.5,'center');
  // The cells: sliding into the holder, a flipped one with its + end to the left.
  const cell=(x,y,w,h,s,emf,fr)=>{
    const yy=y-(1-fr)*60;ctx.globalAlpha=.35+.65*fr;box(x+2,yy-h/2,w-6,h,'#3a5468');ctx.strokeStyle='#9fb6c7';ctx.lineWidth=1;ctx.strokeRect(x+2,yy-h/2,w-6,h);
    box(s>0?x+w-4:x-2,yy-5,6,10,'#c9d6e0');if(w>=20)fit(plain(emf)+(w>=44?' V':''),x+w/2-1,yy+4,'#f2f8fc',9,w-8,'center');
    label('+',s>0?x+w-8:x+8,yy-h/2-3,'#75efc7','center',10);label('−',s>0?x+8:x+w-8,yy-h/2-3,'#77b9ff','center',10);ctx.globalAlpha=1;
  };
  if(c.layout==='series'){if(!n)fit('?',cx,By+5,'#d1e3ed',14,40,'center');const cw=(hx1-hx0)/Math.max(n,1);cells.forEach((s,i)=>cell(hx0+i*cw,By,cw,26,s,c.emf,f[i]));}
  else if(c.layout==='parallel'){line([{x:hx0,y:By-50},{x:hx0,y:By+12}],'#c9d6e0',2);line([{x:hx1,y:By-50},{x:hx1,y:By+12}],'#c9d6e0',2);cells.forEach((s,i)=>cell(hx0+8,By-46+i*29,hx1-hx0-16,20,s,c.emf,f[i]));}
  else{box(hx0,By-17,hx1-hx0,34,'#3a5468');ctx.strokeStyle='#9fb6c7';ctx.strokeRect(hx0,By-17,hx1-hx0,34);box(hx1,By-6,5,12,'#c9d6e0');fit(plain(9)+' V',cx,By+5,'#f2f8fc',13,hx1-hx0-10,'center');label('+',hx1-8,By-21,'#75efc7','center',11);label('−',hx0+8,By-21,'#77b9ff','center',11);}
  // The voltmeter across the holder.
  const my=By+54;line([{x:hx0-6,y:By},{x:hx0-6,y:my},{x:cx-13,y:my}],'#9fb6c7',1);line([{x:hx1+6,y:By},{x:hx1+6,y:my},{x:cx+13,y:my}],'#9fb6c7',1);
  dot(cx,my,13,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(cx,my,13,0,Math.PI*2);ctx.stroke();label('V',cx,my+4,'#f2f8fc','center',12);
  box(cx+20,my-11,74,22,'#0b1c29');fit(g.begun?v2(V)+' V':'? V',cx+57,my+4,'#f2f8fc',11,68,'center');
  // Your prediction beside the meter.
  if(g.guess&&c.ask==='voltage')fit(text('guessTag')+': '+plain(model.answer)+' V',cx-20,my+4,'#efb958',10,area*.3,'right');
  // The two directions: mint arrows for the current, sky dots for the electrons, moving the other way.
  if(g.option&&on&&I>0){
    const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
    const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const u=(d-s0)/l;return [a[0]+(bb[0]-a[0])*u,a[1]+(bb[1]-a[1])*u,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
    const skip=(x,y)=>Math.hypot(x-cx,y-Ty)<22||(Math.abs(x-R)<10&&Math.abs(y-sy)<18);
    const shift=model.charge(t)*120/Math.max(.2,model.charge(BatteryModel.T)),gap=32;
    for(let d=0;d<total;d+=gap){const [x,y]=at(d-dir*shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    // Current arrows sit just outside the wire, so the electron dots stay readable.
    for(const fr of [.08,.3,.6,.9]){const [x0,y0,ux,uy]=at(fr*total),sx=ux*dir,syy=uy*dir,x=x0-uy*10,y=y0+ux*10;if(skip(x0,y0))continue;line([{x:x-sx*11,y:y-syy*11},{x:x+sx*11,y:y+syy*11}],'#75efc7',3);line([{x:x+sx*11-sx*7+syy*5,y:y+syy*11-syy*7-sx*5},{x:x+sx*11,y:y+syy*11},{x:x+sx*11-sx*7-syy*5,y:y+syy*11-syy*7+sx*5}],'#75efc7',3);label('I',x+syy*12,y-sx*12+4,'#75efc7','center',10);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text(c.layout==='battery'?'energyGraph':'stairGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64;
  if(c.layout==='battery'){
    // Energy against charge: a straight line whose slope is the battery's voltage.
    const qmax=.6,top=6,PX=q=>px0+q/qmax*(px1-px0),PY=w=>py1-Math.min(w,top)/top*(py1-py0),Q=model.charge(t);
    line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:PX(0),y:PY(0)},{x:PX(qmax),y:PY(9*qmax)}],'#5c7a8f',1,[3,3]);line([{x:PX(0),y:PY(0)},{x:PX(Q),y:PY(9*Q)}],'#d1e3ed',2);
    if(g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(Math.min(model.answer,top))-5,'#efb958',9,px1-px0);}
    dot(PX(Q),PY(9*Q),5,'#f2f8fc');fit(text('slopeTag',{V:plain(9)}),PX(.36),PY(9*.36)-10,'#9fb6c7',9,px1-px0,'right');
    for(const q of [0,.2,.4,.6])label(plain(q),PX(q),py1+14,'#9fb6c7','center',9);for(const w of [2,4,6])label(plain(w)+' J',px0-4,PY(w)+3,'#9fb6c7','right',9);
    fit(text('chargeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);return;
  }
  // The potential staircase: one step up for each cell in a row, one down for a flipped cell; side by side, one step.
  const cells=model.cells(),f=model.inserted(t),steps=c.layout==='parallel'?[1]:cells,m=Math.max(steps.length,1);
  const levels=[0];steps.forEach((s,i)=>levels.push(levels[i]+s*c.emf));
  const hi=Math.max(...levels,c.target||0,g.guess&&c.ask==='voltage'?Math.min(model.answer,2*Math.max(...levels,1.5)):0)*1.2||3,PX=i=>px0+i/m*(px1-px0),PY=v=>py1-(v-Math.min(0,...levels))/(hi-Math.min(0,...levels))*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  steps.forEach((s,i)=>{const inn=c.layout==='parallel'?f.some(x=>x>=1):f[i]>=1,col=inn?(s>0?'#75efc7':'#77b9ff'):'#5c7a8f',dash=inn?[]:[3,3];
    line([{x:PX(i),y:PY(levels[i])},{x:PX(i+.3),y:PY(levels[i])},{x:PX(i+.7),y:PY(levels[i+1])},{x:PX(i+1),y:PY(levels[i+1])}],col,2,dash);});
  if(c.layout==='parallel')fit(text('sideTag'),PX(.5),PY(levels[1])-8,'#9fb6c7',9,px1-px0,'center');
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{V:plain(c.target)}),px0+4,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6);}
  if(g.guess&&c.ask==='voltage'){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(model.answer)-5,'#efb958',9,px1-px0);}
  const Vn=model.voltage(t);label(v2(Vn)+' V',px1,PY(Vn)+14,'#f2f8fc','right',10);
  label('0 V',px0-4,PY(0)+3,'#9fb6c7','right',9);fit(text('stairAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
