module.exports = {
kind:'accelerator',model:'AcceleratorModel',title:'Particle Gun',symbol:'K =',unit:'J',equation:'q·ΔV = ½·m·v²',sci:true,timeUnit:'ns',
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .accelerator-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-arrows','arrowsToggle'],
legends:[['white','velocityLegend'],['blue','forceLegend'],['gray','fieldLegend'],['orange','guessLegend']],
metrics:[['pos-value','posMetric','cm','x','scalar'],['speed-value','speedMetric','m/s','v','vector'],['kinetic-value','kineticMetric','J','K = ½·m·v²','scalar'],['ev-value','evMetric','eV','K ÷ e','scalar']],
modelCode:String.raw`
class AcceleratorModel {
  // A potential difference turns into kinetic energy: a charge q that falls through ΔV gains q·ΔV = ½·m·v². Two grids
  // 4.0 cm apart hold a uniform field E = ΔV ÷ d between them and none outside. In the first four tests the particle starts
  // from rest at the first grid, speeds up steadily between the grids, and coasts to a detector at 10 cm. In the stopping
  // test an electron arrives at v₀ and the grids push back: if q·ΔV is less than its kinetic energy it gets through slower,
  // otherwise it stops inside and is pushed back out. Gravity is ignored and every speed stays under 7% of the speed of
  // light, so the model is non-relativistic. Time is in ns; each run is slowed so it lasts about 4 s.
  static e = 1.602e-19;
  static mass = {electron:9.109e-31,proton:1.673e-27,alpha:6.645e-27};
  static charges = {electron:1,proton:1,alpha:2};
  static d = .04;
  static end = .1;
  static start = -.015;
  static tolerance = .02;
  // How long a run lasts with the given voltage (ns): across the grids and on to the detector, or, when stopping, long
  // enough for an electron that just stops at the second grid to come back out.
  static nominal(m){
    const D=AcceleratorModel;
    if(m.V===null)return (2*-D.start/m.v0+4*D.d/m.v0)*1e9;
    const v=Math.sqrt(2*D.charges[m.particle]*D.e*m.V/D.mass[m.particle]);return (2*D.d/v+(D.end-D.d)/v)*1e9;
  }
  static missions = [
    {key:'energy',ask:'energy',particle:'electron',V:1000},
    {key:'speed',ask:'speed',particle:'electron',V:250},
    {key:'proton',ask:'speed',particle:'proton',V:250},
    {key:'alpha',ask:'ev',particle:'alpha',V:1000},
    {key:'stop',ask:'voltage',particle:'electron',V:null,v0:4e6}
  ].map(m=>({...m,pace:AcceleratorModel.nominal(m)/4}));
  static units = {energy:'J',speed:'m/s',ev:'eV',voltage:'V'};
  static limits = {energy:1e6,speed:1e20,ev:1e9,voltage:1e6};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=AcceleratorModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=AcceleratorModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  mass(){return AcceleratorModel.mass[this.config.particle];}
  charge(){return AcceleratorModel.charges[this.config.particle]*AcceleratorModel.e;}
  // The grids' voltage: given, or yours in the stopping test. Within 2% of the stopping voltage the electron is moved as if
  // it stops exactly at the second grid, so what it does always matches the verdict.
  voltage(){const c=this.config;if(c.V!==null)return c.V;if(!this.ready())return 0;const x=this.exact();return Math.abs(this.answer-x)<=AcceleratorModel.tolerance*x?x:this.answer;}
  finalSpeed(){return Math.sqrt(2*this.charge()*this.voltage()/this.mass());}
  // Where the particle is at time t (ns), its velocity (m/s, + to the right), and what it is doing.
  state(t){
    const c=this.config,D=AcceleratorModel,m=this.mass(),d=D.d,s=Math.max(t,0)*1e-9;
    if(c.V!==null){
      const a=this.charge()*c.V/(m*d),s1=Math.sqrt(2*d/a),v=a*s1;
      if(s<s1)return {x:.5*a*s*s,v:a*s,phase:'grids'};
      const se=s1+(D.end-d)/v,u=Math.min(s,se);return {x:d+v*(u-s1),v,phase:s>=se?'arrived':'drift'};
    }
    const v0=c.v0,s0=-D.start/v0;
    if(s<s0)return {x:D.start+v0*s,v:v0,phase:'approach'};
    const a=this.charge()*this.voltage()/(m*d),u=s-s0;
    if(v0*v0>2*a*d){
      const v1=Math.sqrt(v0*v0-2*a*d),u1=a?(v0-v1)/a:d/v0;
      if(u<u1)return {x:v0*u-.5*a*u*u,v:v0-a*u,phase:'grids'};
      const ue=u1+(D.end-d)/v1,w=Math.min(u,ue);return {x:d+v1*(w-u1),v:v1,phase:u>=ue?'arrived':'through'};
    }
    const ur=2*v0/a;
    if(u<ur)return {x:v0*u-.5*a*u*u,v:v0-a*u,phase:u<v0/a?'grids':'back'};
    const w=Math.min(u-ur,-D.start/v0);return {x:-v0*w,v:-v0,phase:u-ur>=-D.start/v0?'left':'back'};
  }
  // The energies (eV): electric potential energy U, measured from the second grid's level in the first four tests and
  // from the first grid's when stopping, and kinetic energy K. Their total never changes.
  energies(t){
    const c=this.config,D=AcceleratorModel,st=this.state(t),K=.5*this.mass()*st.v*st.v/D.e,f=Math.min(Math.max(st.x,0),D.d)/D.d;
    const U=c.V!==null?this.charge()*c.V*(1-f)/D.e:this.voltage()*f;
    return {K,U,total:c.V!==null?this.charge()*c.V/D.e:.5*this.mass()*c.v0*c.v0/D.e};
  }
  duration(){
    const c=this.config,D=AcceleratorModel;if(c.V!==null)return AcceleratorModel.nominal(c);
    const cap=AcceleratorModel.nominal(c),v0=c.v0,s0=-D.start/v0,a=this.charge()*this.voltage()/(this.mass()*D.d);
    if(v0*v0>2*a*D.d){const v1=Math.sqrt(v0*v0-2*a*D.d),u1=a?(v0-v1)/a:D.d/v0;return Math.min(cap,(s0+u1+(D.end-D.d)/v1)*1e9);}
    return Math.min(cap,(2*s0+2*v0/a)*1e9);
  }
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the detector, back out of the grids, or at the cap.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,D=AcceleratorModel,e=D.e;
    if(c.key==='energy')return e*1000;
    if(c.key==='speed')return Math.sqrt(2*e*250/D.mass.electron);
    if(c.key==='proton')return Math.sqrt(2*e*250/D.mass.proton);
    if(c.key==='alpha')return 2000;
    return D.mass.electron*c.v0*c.v0/(2*e);
  }
  unit(){return AcceleratorModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),D=AcceleratorModel,e=D.e,me=D.mass.electron,tol=D.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='energy'){if(near(a,1000))slip='noCharge';else if(near(a,e*500))slip='halved';}
      else if(c.key==='speed'){if(near(a,Math.sqrt(e*250/me)))slip='noTwo';else if(near(a,2*e*250/me))slip='noRoot';}
      else if(c.key==='proton'){if(near(a,Math.sqrt(2*e*250/me)))slip='electronMass';else if(near(a,2*e*250/D.mass.proton))slip='noRoot';}
      else if(c.key==='alpha'){if(near(a,1000))slip='oneCharge';else if(near(a,4000))slip='squared';else if(near(a,2*e*1000))slip='joules';}
      else{if(near(a,2*x))slip='noHalf';else if(near(a,me*c.v0*c.v0/2))slip='kineticJoules';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!AcceleratorModel.missions[saved.index])return false;
    const probe=new AcceleratorModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>(probe.ready()?probe.duration():1e12)*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={energy:'K =',speed:'v =',ev:'K =',voltage:'ΔV =',};
// Speeds and energies to 4 figures, written a × 10ⁿ from 10⁴ up so a speed never shows as a long row of digits.
const sci=x=>{const a=Math.abs(x);if(!a||a<1e4)return plain(Number(x.toPrecision(4)));let p=Math.floor(Math.log10(a)),m=Number((x/10**p).toPrecision(4));if(Math.abs(m)>=10){m/=10;p++;}return m.toLocaleString(locale.lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−')+' × 10'+sup(p);};
const eV=x=>plain(Number(x.toPrecision(4)));
// Givens: the particle and the voltage, or the speed to stop.
function given(m){
  if(m.key==='energy')return 'e⁻ · ΔV = '+plain(1000)+' V';
  if(m.key==='speed')return 'e⁻ · ΔV = '+plain(250)+' V';
  if(m.key==='proton')return 'p⁺ · ΔV = '+plain(250)+' V';
  if(m.key==='alpha')return 'α (2e) · ΔV = '+plain(1000)+' V';
  return 'e⁻ · v₀ = '+sci(4e6)+' m/s';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='energy')return 'K = e·ΔV = '+sci(x)+' J';
  if(c.key==='speed')return 'v = √(2·e·ΔV ÷ m) = '+sci(x)+' m/s';
  if(c.key==='proton')return 'v = √(2·e·ΔV ÷ mₚ) = '+sci(x)+' m/s';
  if(c.key==='alpha')return 'K = 2e·ΔV = '+number(x,0)+' eV';
  return 'ΔV = m·v₀² ÷ (2e) = '+number(x,2)+' V';
}
function baseEquation(){return 'q·ΔV = ½·m·v²';}
function metrics(t,begun){
  if(!begun){for(const id of ['pos-value','speed-value','kinetic-value','ev-value'])$(id).textContent='—';return;}
  const st=model.state(t),E=model.energies(t);
  $('pos-value').textContent=number(st.x*100,2);$('speed-value').textContent=sci(st.v);
  $('kinetic-value').textContent=sci(E.K*AcceleratorModel.e);$('ev-value').textContent=eV(E.K);
}
function values(){const c=model.config,x=model.exact();return {x:c.ask==='ev'?number(x,0):c.ask==='voltage'?number(x,2):sci(x)};}
function runningCopy(t){
  const st=model.state(t),E=model.energies(t),v={v:sci(Math.abs(st.v)),K:eV(E.K),U:eV(E.U)};
  if(st.phase==='grids')return text(model.config.V===null?'slowCopy':'accelCopy',v);
  if(st.phase==='approach')return text('approachCopy',v);
  if(st.phase==='through'||(st.phase==='arrived'&&model.config.V===null))return text('throughCopy',v);
  if(st.phase==='back'||st.phase==='left')return text('backCopy',v);
  return text('driftCopy',v);
}
// The energy your answer implies (eV), and the speed it gives, for the orange line and the orange ghost.
function guessEnergy(){
  const c=model.config,a=model.answer,e=AcceleratorModel.e;
  if(c.ask==='energy')return a/e;
  if(c.ask==='speed')return .5*model.mass()*a*a/e;
  return a;
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,D=AcceleratorModel;
  const X=x=>40+(x+.025)/.135*(area-80),yc=height*.5,h=46;
  const arrow=(x,y,dx,colour,w,tag)=>{if(Math.abs(dx)<3)return;const e=x+dx,s=Math.sign(dx);line([{x,y},{x:e,y}],colour,w);line([{x:e-7*s,y:y-4},{x:e,y},{x:e-7*s,y:y+4}],colour,w);if(tag)label(tag,e+s*6,y+4,colour,s>0?'left':'right',10);};
  // The tube, the source, the two grids with their potentials, the field between them, and the detector.
  ctx.strokeStyle='#3a5468';ctx.lineWidth=1.5;ctx.strokeRect(X(-.025),yc-h,X(.11)-X(-.025),2*h);
  box(X(-.025),yc-15,X(c.V===null?-.019:-.004)-X(-.025),30,'#5c6b78');fit(text(c.particle+'Source'),X(-.025),yc+h+14,'#9fb6c7',9,X(.03)-X(-.025));
  const V=model.voltage(),high=c.V===null?null:c.particle==='electron'?1:0;
  const pot=i=>c.V===null?(i?(g.ready?plain(-Number(model.answer.toPrecision(4))):'−?')+' V':plain(0)+' V'):(i===high?'+'+plain(c.V)+' V':plain(0)+' V');
  for(const [i,x] of [[0,0],[1,D.d]]){line([{x:X(x),y:yc-h},{x:X(x),y:yc+h}],'#9fb6c7',2,[3,3]);fit(pot(i),X(x),yc-h-8,'#d1e3ed',10,X(D.d)-X(0),'center');}
  fit('d = '+plain(4)+' cm',(X(0)+X(D.d))/2,yc+h+14,'#9fb6c7',9,X(D.d)-X(0),'center');
  // The field points from the higher grid to the lower one.
  if(g.option&&V>0){const dir=c.V===null?1:high?-1:1;for(const y of [yc-28,yc+28])arrow((X(0)+X(D.d))/2-dir*14,y,dir*28,'#6f8799',1);label('E',(X(0)+X(D.d))/2,yc-34,'#9fb6c7','center',10);}
  box(X(D.end)-3,yc-36,6,72,'#2c5a8c');fit(text('detectorTag'),X(D.end),yc+h+14,'#9fb6c7',9,X(.11)-X(.075),'center');
  const col=c.particle==='electron'?'#1d4f86':'#1f6f5a',sign=c.particle==='electron'?'−':c.particle==='alpha'?'2+':'+';
  // Your ghost: a particle moving at the speed your answer implies, set off as the real one leaves the grids.
  if(g.guess&&c.V!==null){
    const vg=Math.sqrt(2*guessEnergy()*D.e/model.mass()),a=model.charge()*c.V/(model.mass()*D.d),s1=Math.sqrt(2*D.d/a),s=t*1e-9;
    const xg=Math.min(.108,D.d+(s>s1?vg*(s-s1):0));ctx.beginPath();ctx.strokeStyle='#efb958';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.arc(X(xg),yc+20,7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    fit(text('guessTag'),X(xg),yc+42,'#efb958',9,90,'center');
  }
  if(!g.ready)return clock();
  const st=model.state(t),px=X(st.x);
  dot(px,yc,7,col);label(sign,px,yc+4,'#f2f8fc','center',sign.length>1?8:11);
  if(g.begun&&g.option&&st.phase!=='arrived'&&st.phase!=='left'){
    const vref=c.V===null?c.v0:model.finalSpeed();arrow(px,yc-16,Math.max(-120,Math.min(120,st.v/vref*60)),'#f2f8fc',2,'v');
    if(st.x>0&&st.x<D.d)arrow(px,yc+16,(c.V===null?-1:1)*30,'#77b9ff',2.5,'F');
  }
  clock();
  function clock(){fit('t = '+number(t)+' ns',area-16,44,'#f2f8fc',13,area*.3,'right');if(g.option)fit(text('slowNote',{t:plain(Number(c.pace.toPrecision(3)))}),16,height-24,'#9fb6c7',10,area-28);}
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g,t=model.now();
  fit(text('energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Two bars, electric potential energy and kinetic energy, always adding up to the dashed total.
  const px0=g.area+30,px1=width-14,py0=80,py1=height-70,E=model.energies(t),gE=g.guess?guessEnergy():null;
  const top=1.25*Math.max(E.total,gE!==null?Math.min(gE,2*E.total):0),PY=v=>py1-Math.min(v,top)/top*(py1-py0),w=Math.min(48,(px1-px0)/5);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  const bars=[[E.U,'#77b9ff','uTag'],[E.K,'#f2f8fc','kTag']];
  bars.forEach(([v,colour,key],i)=>{const x=px0+(px1-px0)*(i?.62:.22)-w/2;box(x,PY(v),w,py1-PY(v),colour);fit(eV(v)+' eV',x+w/2,PY(v)-5,'#d1e3ed',9,w*2,'center');fit(text(key),x+w/2,py1+14,'#9fb6c7',9,(px1-px0)/2,'center');});
  line([{x:px0,y:PY(E.total)},{x:px1,y:PY(E.total)}],'#9fb6c7',1.5,[5,4]);fit(text('totalTag',{E:eV(E.total)}),px1,PY(E.total)-6,'#9fb6c7',9,px1-px0,'right');
  if(gE!==null){line([{x:px0,y:PY(gE)},{x:px1,y:PY(gE)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+(px1-px0)*.42,PY(gE)-6,'#efb958',9,(px1-px0)*.3,'center');}
  fit(text('evNote'),px0,py1+30,'#9fb6c7',9,px1-px0);
}
`
};
