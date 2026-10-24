module.exports = {
kind:'tester',model:'TesterModel',title:'Material Tester',symbol:'I =',unit:'A',equation:'R = ρ·L ÷ A, I = V ÷ R',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .tester-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['volt-value','voltMetric','V','V','scalar'],['res-value','resMetric','Ω','R = ρ·L ÷ A','scalar'],['cur-value','curMetric','A','I = V ÷ R','vector'],['rho-value','rhoMetric','Ω·m','ρ','scalar']],
modelCode:String.raw`
class TesterModel {
  // A 12 V battery, a switch, an ammeter, and a sample held between two clips. The sample's resistance is R = ρ·L ÷ A,
  // set by its material (resistivity ρ) and its shape; the current is I = V ÷ R. Battery, wires, clips, and ammeter
  // are ideal. Resistivities run over twenty powers of ten, from metals (conductors) to glass and rubber (insulators).
  // The switch closes at 0.5 s and the run lasts 3 s; a current is steady as soon as it flows.
  static tolerance = .02;
  static rho = {copper:1.68e-8,aluminium:2.65e-8,nichrome:1.1e-6,graphite:3.5e-5,glass:1e12,rubber:1e13};
  static close = .5;
  static T = 3;
  static missions = [
    {key:'nichrome',ask:'current',material:'nichrome',L:1,A:.5e-6,V:12},
    {key:'glass',ask:'current',material:'glass',L:.1,A:1e-4,V:12},
    {key:'heater',ask:'length',material:'nichrome',A:.5e-6,V:12,target:10},
    {key:'aluminium',ask:'area',material:'aluminium',L:100,V:12,copperA:1e-6},
    {key:'pencil',ask:'resistance',material:'graphite',L:.06,A:Math.PI*.35e-3**2,V:12}
  ];
  static units = {current:'A',length:'m',area:'mm²',resistance:'Ω'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=TesterModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e20;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  resistivity(){return TesterModel.rho[this.config.material];}
  // Your length or area shapes the sample when one is asked; otherwise the given shape does.
  length(){const c=this.config;return c.ask==='length'&&this.ready()?this.answer:c.L;}
  area(){const c=this.config;return c.ask==='area'&&this.ready()?this.answer*1e-6:c.A;}
  resistance(){return this.resistivity()*this.length()/this.area();}
  current(t){return t>=TesterModel.close-1e-12?this.config.V/this.resistance():0;}
  // What the current should be: 10 Ω for the heater, the same as 100 m of 1 mm² copper for the aluminium reel.
  target(){const c=this.config;if(c.ask==='length')return c.V/c.target;if(c.ask==='area')return c.V/(TesterModel.rho.copper*c.L/c.copperA);return null;}
  // The resistivity your answer implies: on the right material when the answer is right.
  impliedRho(){
    const c=this.config,a=this.answer;if(!this.ready())return null;
    if(c.ask==='current')return c.V*c.A/(a*c.L);
    if(c.ask==='length')return c.target*c.A/a;
    if(c.ask==='area')return TesterModel.rho.copper*a/(c.copperA*1e6);
    return a*c.A/c.L;
  }
  duration(){return TesterModel.T;}
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
    const c=this.config,rho=this.resistivity();
    if(c.ask==='current')return c.V*c.A/(rho*c.L);
    if(c.ask==='length')return c.target*c.A/rho;
    if(c.ask==='area')return rho/TesterModel.rho.copper*c.copperA*1e6;
    return rho*c.L/c.A;
  }
  unit(){return TesterModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    // The window is purely relative: currents through insulators are near 10⁻¹⁴ A.
    const c=this.config,a=this.answer,x=this.exact(),rho=this.resistivity(),tol=TesterModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='nichrome'){const R=rho*c.L/c.A;if(near(a,c.V*R))slip='multiplied';else if(near(a,R/c.V))slip='inverted';else if(near(a,c.V/(rho*c.L/(c.A*1e6))))slip='noMm';}
      else if(c.key==='glass'){if(near(a,c.V*rho*c.L/c.A))slip='multiplied';else if(near(a,c.V/(rho*c.L)))slip='noArea';else if(near(a,c.V/(rho*c.L*100/(c.A*1e4))))slip='units';}
      else if(c.key==='heater'){if(near(a,c.target*rho/c.A))slip='invertedLength';else if(near(a,c.target*c.A*1e6/rho))slip='noMmLength';}
      else if(c.key==='aluminium'){if(near(a,TesterModel.rho.copper/rho))slip='invertedArea';else if(near(a,1))slip='sameArea';}
      else{const r=Math.sqrt(c.A/Math.PI);if(near(a,rho*c.L/(Math.PI*(2*r)**2)))slip='diameterAsRadius';else if(near(a,rho*c.L/r**2))slip='noPi';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!TesterModel.missions[saved.index])return false;
    const probe=new TesterModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={current:'I =',length:'L =',area:'A =',resistance:'R ='};
const four=x=>plain(Number(x.toPrecision(4))),MATERIALS=['copper','aluminium','nichrome','graphite','glass','rubber'];
const COLOURS={copper:'#c98a5a',aluminium:'#c9d6e0',nichrome:'#8a9aa6',graphite:'#3d4650',glass:'#a9d8e8',rubber:'#2f2f33'};
// Givens: the sample's length and cross-section (or diameter), and the battery or the resistance wanted.
function given(m){
  if(m.key==='nichrome')return 'L = 1 m · A = '+plain(.5)+' mm² · 12 V';
  if(m.key==='glass')return 'L = 10 cm · A = 1 cm² · 12 V';
  if(m.key==='heater')return 'A = '+plain(.5)+' mm² · R = 10 Ω';
  if(m.key==='aluminium')return 'L = 100 m · Cu: 1 mm²';
  return 'L = 6 cm · d = '+plain(.7)+' mm';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.ask==='current')return 'I = V·A ÷ (ρ·L) = '+four(x)+' A';
  if(c.ask==='length')return 'L = R·A ÷ ρ = '+number(x,3)+' m';
  if(c.ask==='area')return 'A_Al = A_Cu·ρ_Al ÷ ρ_Cu = '+number(x,3)+' mm²';
  return 'R = ρ·L ÷ (π·d² ÷ 4) = '+number(x,3)+' Ω';
}
function baseEquation(){return 'R = ρ·L ÷ A, I = V ÷ R';}
function metrics(t,begun){
  $('volt-value').textContent=begun?plain(model.config.V):'—';$('res-value').textContent=begun?four(model.resistance()):'—';
  $('cur-value').textContent=begun?(model.current(t)?four(model.current(t)):'0'):'—';$('rho-value').textContent=begun?four(model.resistivity()):'—';
}
function values(){return {x:four(model.exact())};}
function runningCopy(t){
  if(t<TesterModel.close)return text('switchCopy');
  const ref=model.target(),I=four(model.current(t));
  return ref===null?text('currentCopy',{I}):text('compareCopy',{I,ref:four(ref)});
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,I=g.begun?model.current(t):0,on=g.begun&&t>=TesterModel.close;
  // A loop: battery on the left (+ at the top), ammeter on top, switch on the right, the sample along the bottom.
  const x0=64,x1=area-56,ax=(x0+x1)/2,yT=96,yB=height-120,xs0=area*.3,xs1=area*.72,yb=(yT+yB)/2,ys=(yT+yB)/2;
  const wire='#c9d6e0';
  line([{x:x0,y:yb-22},{x:x0,y:yT},{x:x1,y:yT},{x:x1,y:ys-24}],wire,2);line([{x:x1,y:ys+4},{x:x1,y:yB},{x:xs1,y:yB}],wire,2);line([{x:xs0,y:yB},{x:x0,y:yB},{x:x0,y:yb+14}],wire,2);
  // Conventional current (mint) goes from + round to −; electrons (sky dots) go the other way, at a display speed set by log I.
  const path=[{x:x0,y:yb-22},{x:x0,y:yT},{x:x1,y:yT},{x:x1,y:yB},{x:x0,y:yB},{x:x0,y:yb+14}];
  if(on){
    line([{x:ax+70,y:yT-14},{x:ax+110,y:yT-14}],'#75efc7',2);line([{x:ax+104,y:yT-19},{x:ax+110,y:yT-14},{x:ax+104,y:yT-9}],'#75efc7',2);fit('I',ax+88,yT-20,'#75efc7',11,20,'center');
    if(g.option){
      const segs=[];let total=0;for(let i=1;i<path.length;i++){const d=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);segs.push([path[i-1],path[i],total,d]);total+=d;}
      const speed=70*Math.min(1,Math.max(0,(Math.log10(I)+15)/17)),shift=speed*(t-TesterModel.close);
      for(let s=0;s<total;s+=26){const at=((s-shift)%total+total)%total;const sg=segs.find(q=>at>=q[2]&&at<q[2]+q[3]);if(!sg)continue;const f=(at-sg[2])/sg[3];dot(sg[0].x+(sg[1].x-sg[0].x)*f,sg[0].y+(sg[1].y-sg[0].y)*f,3,'#77b9ff');}
    }
  }
  // Battery: long plate positive, short plate negative.
  line([{x:x0-18,y:yb-14},{x:x0+18,y:yb-14}],'#f2f8fc',3);line([{x:x0-10,y:yb+6},{x:x0+10,y:yb+6}],'#f2f8fc',5);
  fit('+ '+plain(c.V)+' V',x0+24,yb-10,'#75efc7',11,80);fit('−',x0+24,yb+12,'#77b9ff',12,20);
  // Switch: a blade that closes at 0.5 s.
  const sw=on?0:-.6;dot(x1,ys+4,3,wire);dot(x1,ys-24,3,wire);line([{x:x1,y:ys+4},{x:x1+28*Math.sin(sw),y:ys+4-28*Math.cos(sw)}],on?'#75efc7':wire,3);
  fit(text(on?'closedTag':'openTag'),x1-10,ys-6,'#9fb6c7',9,x1-x0-150,'right');
  // Ammeter on the top wire.
  box(ax-62,yT-24,124,48,'#0b1c29');ctx.strokeStyle='#8aa3b5';ctx.lineWidth=1.5;ctx.strokeRect(ax-62,yT-24,124,48);
  fit('A',ax-54,yT-10,'#9fb6c7',10,20);fit(on?four(I)+' A':'0 A',ax,yT+8,'#f2f8fc',15,116,'center');
  const gI=g.guess&&c.ask==='current'?model.answer:g.guess&&c.ask==='resistance'?c.V/model.answer:null;
  if(gI!==null)fit(text('guessTag')+': '+four(gI)+' A',ax,yT+40,'#efb958',10,170,'center');
  const ref=model.target();if(ref!==null)fit(text('targetTag',{I:four(ref)}),ax,yT+40,'#9fb6c7',10,190,'center');
  // The sample between two clips.
  box(xs0-8,yB-14,10,28,'#5c6b78');box(xs1-2,yB-14,10,28,'#5c6b78');box(xs0+2,yB-7,xs1-xs0-4,14,COLOURS[c.material]);
  fit(text(c.material+'Tag'),(xs0+xs1)/2,yB+30,'#d1e3ed',11,xs1-xs0,'center');
  // The shape: your length or area once there is one, ? before.
  const L=model.length(),A=model.area(),ls=Number.isFinite(L)?(L<1?plain(L*100)+' cm':plain(Number(L.toPrecision(4)))+' m'):'?',as=Number.isFinite(A)?(A<1e-5?plain(Number((A*1e6).toPrecision(4)))+' mm²':plain(A*1e4)+' cm²'):'?';
  fit('L = '+ls+' · A = '+as,(xs0+xs1)/2,yB+46,'#9fb6c7',10,xs1-xs0+80,'center');
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('ladderGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  // A logarithmic ladder of resistivity, 10⁻⁹ to 10¹⁴ Ω·m; the orange mark is the resistivity your answer implies.
  const lo=-9,hi=14,px=g.area+64,py0=70,py1=height-60,Y=r=>py1-(Math.log10(r)-lo)/(hi-lo)*(py1-py0);
  line([{x:px,y:py0},{x:px,y:py1}],'#8aa3b5',1.5);
  for(let p=lo+1;p<=hi;p+=4){line([{x:px-4,y:Y(10**p)},{x:px,y:Y(10**p)}],'#8aa3b5',1);label('10'+String(p).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]),px-7,Y(10**p)+3,'#9fb6c7','right',9);}
  fit(text('conductorsTag'),px+8,py1+16,'#9fb6c7',9,width-px-16);fit(text('insulatorsTag'),px+8,py0-10,'#9fb6c7',9,width-px-16);
  MATERIALS.forEach((m,i)=>{const y=Y(TesterModel.rho[m]),mine=m===c.material,dy=(m==='aluminium'?10:m==='copper'?-2:0)+(m==='rubber'?-8:m==='glass'?6:0);dot(px,y,mine?5:3,mine?'#f2f8fc':'#8aa3b5');fit(text(m+'Tag'),px+10,y+dy+3,mine?'#f2f8fc':'#9fb6c7',9,width-px-20);});
  const r=g.guess&&g.begun?model.impliedRho():null;
  if(r!==null&&r>0){const y=Math.max(py0,Math.min(py1,Y(r)));line([{x:px-12,y},{x:px+12,y}],'#efb958',3);fit((Y(r)<py0?'↑ ':Y(r)>py1?'↓ ':'')+text('guessTag'),width-14,y-5,'#efb958',9,width-px-90,'right');}
  if(!g.begun)fit(text('panelHint'),g.area+8,height-30,'#9fb6c7',10,width-g.area-16);
}
`
};
