module.exports = {
kind:'oildrop',model:'OilDropModel',title:'Oil Drop',symbol:'q =',unit:'C',equation:'q·V ÷ d = m·g',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter, so a trailing e⁻ stays put.
css:'[dir=rtl] .oildrop-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-forces','forcesToggle'],
legends:[['white','velocityLegend'],['blue','forceLegend'],['orange','weightLegend'],['gray','referenceLegend']],
metrics:[['volt-value','voltMetric','V','V','scalar'],['field-value','fieldMetric','kV/m','E = V ÷ d','vector'],['ratio-value','ratioMetric','','F_E ÷ W','scalar'],['speed-value','speedMetric','mm/s','v','vector']],
modelCode:String.raw`
class OilDropModel {
  // Millikan's oil drop. Between two plates d apart, top plate positive, a drop with n extra electrons feels the electric
  // force F_E = q·V ÷ d upwards and its weight W = m·g down. Air drag keeps it at its terminal speed at every instant,
  // v = (F_E − W) ÷ (6π·η·r) with η = 1.8 × 10⁻⁵ Pa·s and r from the oil's density (886 kg/m³), so it hovers exactly
  // when q·V ÷ d = m·g. The voltage rises steadily for 2 s and then holds for 2 s; a drop that reaches a plate stays on it.
  static e = 1.602e-19;
  static g = 9.8;
  static eta = 1.8e-5;
  static rho = 886;
  static ramp = 2;
  static T = 4;
  static tolerance = .02;
  static missions = [
    {key:'charge',ask:'charge',m:3.27e-15,n:2,d:.01,V:1000},
    {key:'count',ask:'count',m:3.27e-15,n:2,d:.01,V:1000},
    {key:'voltage',ask:'voltage',m:4.9e-15,n:3,d:.012},
    {key:'unit',ask:'unit',d:.01,V:1000,charges:[4.8e-19,8e-19,11.2e-19]},
    {key:'gain',ask:'gain',m:2*1.602e-19*900/(9.8*.01),n:3,n0:2,V0:900,d:.01}
  ];
  static units = {charge:'C',count:'',voltage:'V',unit:'C',gain:'V'};
  static limits = {charge:1e3,count:1e9,voltage:1e7,unit:1e3,gain:1e7};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=OilDropModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=OilDropModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Your voltage drives the plates when a voltage is asked; otherwise the given one does.
  runVoltage(){const c=this.config;return c.ask==='voltage'||c.ask==='gain'?this.answer:c.V;}
  voltage(t){return this.runVoltage()*Math.min(Math.max(t,0)/OilDropModel.ramp,1);}
  // The drops in view, each with its charge q (C) and mass m (kg): the unit test's three drops all hover at 1000 V.
  drops(){const c=this.config;if(c.ask==='unit')return c.charges.map(q=>({q,m:q*c.V/(OilDropModel.g*c.d)}));return [{q:c.n*OilDropModel.e,m:c.m}];}
  // The orange drop: the same mass with the charge your answer gives it.
  ghost(){const c=this.config;if(!this.ready())return null;if(c.ask==='charge')return {q:this.answer,m:c.m};if(c.ask==='count')return {q:this.answer*OilDropModel.e,m:c.m};return null;}
  drag(m){return 6*Math.PI*OilDropModel.eta*Math.cbrt(3*m/(4*Math.PI*OilDropModel.rho));}
  forces(drop,t){return {F:drop.q*this.voltage(t)/this.config.d,W:drop.m*OilDropModel.g};}
  // Height above the start (m) and upward speed (m/s) in closed form, as if no plate were in the way.
  free(drop,t){
    const R=OilDropModel.ramp,b=this.drag(drop.m),W=drop.m*OilDropModel.g,F=drop.q*this.runVoltage()/this.config.d;
    if(t<=R)return {y:(F*t*t/(2*R)-W*t)/b,v:(F*t/R-W)/b};
    return {y:(F*R/2-W*R)/b+(F-W)/b*(t-R),v:(F-W)/b};
  }
  // The exact moment the drop reaches a plate, half the gap from its start, or null if it never does.
  contact(drop){
    const R=OilDropModel.ramp,L=this.config.d/2,b=this.drag(drop.m),W=drop.m*OilDropModel.g,F=drop.q*this.runVoltage()/this.config.d;
    const A=F/(2*R*b),B=-W/b;let best=null;
    for(const s of [1,-1]){const D=B*B+4*A*s*L;if(D<0)continue;const q=Math.sqrt(D);for(const r of [(-B+q)/(2*A),(-B-q)/(2*A)])if(r>0&&r<=R&&(best===null||r<best))best=r;}
    if(best!==null)return best;
    const y=(F*R/2-W*R)/b,v=(F-W)/b;
    if(v!==0){const r=R+(Math.sign(v)*L-y)/v;if(r>R&&r<=OilDropModel.T)return r;}
    return null;
  }
  position(drop,t){
    const tc=this.contact(drop),c=Math.min(Math.max(t,0),OilDropModel.T);
    if(tc!==null&&c>=tc)return {y:Math.sign(this.free(drop,tc).y)*this.config.d/2,v:0,stuck:true};
    return {...this.free(drop,c),stuck:false};
  }
  duration(){return OilDropModel.T;}
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
  exact(){
    const c=this.config,e=OilDropModel.e,g=OilDropModel.g;
    if(c.ask==='charge')return c.m*g*c.d/c.V;
    if(c.ask==='count')return c.m*g*c.d/(c.V*e);
    if(c.ask==='voltage')return c.m*g*c.d/(c.n*e);
    if(c.ask==='unit')return 1.6e-19;
    return c.V0*c.n0/c.n;
  }
  unit(){return OilDropModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    // The window is purely relative: charges near 10⁻¹⁹ C would fit inside any fixed slack.
    const c=this.config,a=this.answer,x=this.exact(),e=OilDropModel.e,g=OilDropModel.g,tol=OilDropModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.ask==='charge'){if(near(a,c.m*c.d/c.V))slip='noGravity';else if(near(a,c.m*g/c.V))slip='noDistance';else if(near(a,c.n))slip='electronCount';else if(near(a,x*1e19))slip='noPower';}
      else if(c.ask==='count'){if(near(a,1/x))slip='inverted';else if(near(a,c.m*g*c.d/c.V))slip='chargeTyped';}
      else if(c.ask==='voltage'){if(near(a,c.m*g*c.d/e))slip='oneElectron';else if(near(a,c.m*g/(c.n*e)))slip='noGap';}
      else if(c.ask==='unit'){if(near(a,c.charges[0]))slip='smallest';else if(near(a,c.charges[1]-c.charges[0]))slip='difference';else if(near(a,(c.charges[0]+c.charges[1]+c.charges[2])/3))slip='average';else if(near(a,x/2))slip='halfUnit';else if(near(a,x*1e19))slip='noPower';}
      else{if(near(a,c.V0*c.n/c.n0))slip='multiplied';else if(near(a,c.V0/2))slip='halved';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!OilDropModel.missions[saved.index])return false;
    const probe=new OilDropModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={charge:'q =',count:'n =',voltage:'V =',unit:'e =',gain:'V₂ ='};
const four=x=>plain(Number(x.toPrecision(4))),SPAN=6e-4;
// Givens: the drop's mass, the voltage or its extra electrons, and the gap; or the three measured charges.
function given(m){
  if(m.ask==='unit')return m.charges.map(q=>plain(q*1e19)).join(' · ')+' × 10⁻¹⁹ C';
  if(m.ask==='gain')return plain(m.V0)+' V · '+m.n0+' → '+m.n+' e⁻';
  if(m.ask==='voltage')return plain(m.m)+' kg · '+m.n+' e⁻ · '+plain(m.d*100)+' cm';
  return plain(m.m)+' kg · '+plain(m.V/1000)+' kV · '+plain(m.d*100)+' cm';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.ask==='charge')return 'q = m·g·d ÷ V = '+four(x)+' C';
  if(c.ask==='count')return 'n = m·g·d ÷ (V·e) = '+number(x,2);
  if(c.ask==='voltage')return 'V = m·g·d ÷ (n·e) = '+number(x,0)+' V';
  if(c.ask==='unit')return 'e = '+four(x)+' C (3e · 5e · 7e)';
  return 'V₂ = V₁·n₁ ÷ n₂ = '+number(x,0)+' V';
}
function baseEquation(){return model.config.ask==='unit'?'q = n·e':'q·V ÷ d = m·g';}
function metrics(t,begun){
  const d=model.drops()[0],f=model.forces(d,t),p=model.position(d,t),V=model.voltage(t);
  $('volt-value').textContent=begun?number(V,0):'—';$('field-value').textContent=begun?number(V/model.config.d/1000,1):'—';
  $('ratio-value').textContent=begun?number(f.F/f.W):'—';$('speed-value').textContent=begun?number(p.v*1000,3):'—';
}
function values(){return {x:four(model.exact())};}
function runningCopy(t){
  const p=model.position(model.drops()[0],t);
  if(p.stuck)return text('stuckCopy');
  if(t<OilDropModel.ramp)return text('rampCopy',{V:number(model.voltage(t),0)});
  return text('driftCopy',{v:number(p.v*1000,3)});
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,V=g.ready?model.voltage(t):0,drops=model.drops();
  // Left: the plates and the drop to scale. Right: the microscope's view around the drop's start, magnified.
  const ix0=20,ix1=Math.max(90,Math.min(150,area*.24)),yT=72,yB=height-58,mid=(yT+yB)/2,k=(yB-yT)/c.d;
  box(ix0,yT-8,ix1-ix0,8,'#c9d6e0');box(ix0,yB,ix1-ix0,8,'#c9d6e0');
  fit('+ '+plain(Math.round(V))+' V',ix0,yT-14,'#75efc7',10,ix1-ix0);fit('0 V',ix0,yB+22,'#9fb6c7',10,ix1-ix0);
  if(V>0)for(let i=0;i<3;i++){const x=ix0+(i+.5)*(ix1-ix0)/3;line([{x,y:yT+10},{x,y:yB-10}],'#5c6b78',1);line([{x:x-4,y:yB-18},{x,y:yB-10},{x:x+4,y:yB-18}],'#5c6b78',1);}
  fit('d = '+plain(c.d*100)+' cm',ix0+2,mid-50,'#9fb6c7',9,ix1-ix0);
  drops.forEach((d,i)=>{const p=g.begun?model.position(d,t):{y:0};dot((ix0+ix1)/2+(i-(drops.length-1)/2)*12,mid-p.y*k,3,'#d9cfb8');});
  const R=Math.max(60,Math.min((area-ix1-36)/2,(height-128)/2)),cx=(ix1+area)/2,cy=mid,s=R/SPAN,Y=y=>cy-y*s;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle='#0b1c29';ctx.fill();ctx.clip();
  for(let m=-6;m<=6;m++)line([{x:cx-R,y:Y(m*1e-4)},{x:cx+R,y:Y(m*1e-4)}],m?'#1d3b52':'#33526b',1);
  // Grid labels sit just inside the eyepiece's edge, clear of the drops in the middle.
  if(g.option)for(let m=-4;m<=4;m+=2)if(m){const h=(Y(m*1e-4)-cy)/R;label(plain(m/10)+' mm',cx-R*Math.sqrt(1-h*h)+8,Y(m*1e-4)-3,'#9fb6c7','left',9);}
  const xs=i=>cx+(i-(drops.length-1)/2)*R*.42-(model.ghost()&&g.guess?R*.18:0);
  // A drop out of view is drawn at the edge with an arrow.
  const place=(x,y,colour,ring)=>{const yy=Math.max(cy-R+14,Math.min(cy+R-14,Y(y)));if(ring){ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.setLineDash([3,2]);ctx.beginPath();ctx.arc(x,yy,6,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}else dot(x,yy,6,colour);if(yy!==Y(y))label(Y(y)<yy?'↑':'↓',x+12,yy+4,colour,'left',13);return {yy,out:yy!==Y(y)};};
  const arrow=(x,y,len,colour,tag)=>{if(Math.abs(len)<3)return;const e=y-len,dir=Math.sign(len);line([{x,y},{x,y:e}],colour,2.5);line([{x:x-5,y:e+6*dir},{x,y:e},{x:x+5,y:e+6*dir}],colour,2.5);label(tag,x+8,e+(dir>0?10:-2),colour,'left',10);};
  drops.forEach((d,i)=>{
    const p=g.begun?model.position(d,t):{y:0,v:0,stuck:false},x=xs(i),{yy,out}=place(x,p.y,'#d9cfb8',false);
    // A drop out of view keeps only its arrow mark: its force arrows would be cut off by the eyepiece.
    if(g.option&&g.begun&&!out){const f=model.forces(d,t);arrow(x-14,yy,-36,'#efb958','W');arrow(x-14,yy,Math.min(110,36*f.F/f.W),'#77b9ff','F_E');}
    if(g.begun&&!p.stuck&&!out)arrow(x+14,yy,Math.max(-100,Math.min(100,p.v/1e-4*36)),'#f2f8fc','v');
    if(c.ask==='unit')fit(plain(d.q*1e19)+'·10⁻¹⁹ C',x,cy-R*.6,'#d1e3ed',9,R*.4,'center');
  });
  const gh=g.guess?model.ghost():null;
  if(gh){const p=g.begun?model.position(gh,t):{y:0};place(cx+R*.42,p.y,'#efb958',true);fit(text('guessTag'),cx+R*.42,cy+R-24,'#efb958',9,R*.5,'center');}
  ctx.restore();ctx.strokeStyle='#5c6b78';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  fit(text('eyepieceTag'),cx,cy+R+16,'#9fb6c7',9,2*R,'center');
  if(g.option)fit(text('arrowNote'),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text(c.ask==='unit'?'ladderGraph':'heightGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64;
  if(c.ask==='unit'){
    // A charge ladder: with the right e, every measured charge sits on a rung.
    const top=12.5e-19,PY=q=>py1-q/top*(py1-py0),a=model.answer;
    line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
    for(let q=0;q<=12e-19+1e-30;q+=2e-19)label(plain(Math.round(q*1e19)),px0-5,PY(q)+3,'#9fb6c7','right',9);
    if(g.guess&&a>=top/40)for(let n=1;n*a<=top;n++)line([{x:px0,y:PY(n*a)},{x:px1,y:PY(n*a)}],'#efb958',1,[4,3]);
    c.charges.forEach((q,i)=>{const x=px0+(i+1)*(px1-px0)/4;dot(x,PY(q),5,'#d9cfb8');label(plain(q*1e19),x+8,PY(q)+3,'#d1e3ed','left',9);});
    fit(text('chargeAxis'),px0,py1+16,'#9fb6c7',9,px1-px0);return;
  }
  // The drop's height over time on the eyepiece's scale; the orange line is the drop your answer describes.
  const T=OilDropModel.T,t=model.now(),PX=q=>px0+q/T*(px1-px0),PY=y=>(py0+py1)/2-Math.max(-SPAN,Math.min(SPAN,y))/SPAN*(py1-py0)/2;
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(0)},{x:px1,y:PY(0)}],'#8aa3b5',1,[3,3]);
  for(const m of [-.5,.5])label(plain(m)+' mm',px0-5,PY(m/1000)+3,'#9fb6c7','right',9);label('0',px0-5,PY(0)+3,'#9fb6c7','right',9);
  line([{x:PX(OilDropModel.ramp),y:py0},{x:PX(OilDropModel.ramp),y:py1}],'#33526b',1);
  const trace=(d,colour,dash)=>{const pts=[];for(let i=0;i<=200;i++){const q=t*i/200;pts.push({x:PX(q),y:PY(model.position(d,q).y)});}line(pts,colour,2,dash);};
  const gh=g.guess?model.ghost():null;if(gh)trace(gh,'#efb958',[5,4]);
  trace(model.drops()[0],'#f2f8fc',[]);
  fit(text('timeAxis'),px0,py1+16,'#9fb6c7',9,px1-px0);
}
`
};
