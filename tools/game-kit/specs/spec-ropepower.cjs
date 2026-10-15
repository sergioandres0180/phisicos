module.exports = {
kind:'ropepower',model:'RopePowerModel',title:'Power on a Rope',symbol:'P₂ ÷ P₁ =',unit:'',equation:'P = ½·μ·ω²·A²·v',
toggle:['show-reference','referenceToggle'],
legends:[['blue','ropeLegend'],['white','absorberLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['power-value','powerMetric','W','P','vector'],['energy-value','energyMetric','J','E = P·t'],['frequency-value','frequencyMetric','Hz','f'],['speed-value','speedMetric','m/s','v']],
modelCode:String.raw`
class RopePowerModel {
  // A motor shakes one end of a rope; the far end runs into an absorber, so nothing comes back. Each bit of rope moves as a small
  // oscillator with energy ½·(μ·dx)·ω²·A², and the wave carries that energy along at v, so the power reaching the absorber is
  // P = ½·μ·ω²·A²·v with ω = 2π·f. Power grows as the square of the amplitude and of the frequency. For the same tension a rope
  // four times as heavy per metre carries waves at half the speed, and twice the power for the same shaking.
  static tolerance = .02;
  static L = 6; // m
  static run = 3; // s
  static missions = [
    {key:'amplitude',ask:'ratioA',mu:.2,v:10,f:2,A:.1,ref:{mu:.2,v:10,f:2,A:.05}},
    {key:'both',ask:'ratioBoth',mu:.2,v:10,f:4,A:.1,ref:{mu:.2,v:10,f:2,A:.05}},
    {key:'compute',ask:'power',mu:.2,v:10,f:2,A:.1},
    {key:'faster',ask:'amplitude',mu:.2,v:10,f:4,A:null,ref:{mu:.2,v:10,f:2,A:.1}},
    {key:'heavier',ask:'ratioRope',mu:.8,v:5,f:2,A:.05,ref:{mu:.2,v:10,f:2,A:.05}}
  ];
  static units = {ratioA:'',ratioBoth:'',power:'W',amplitude:'cm',ratioRope:''};
  static limits = {ratioA:1e4,ratioBoth:1e4,power:1e6,amplitude:1e4,ratioRope:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=RopePowerModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=RopePowerModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The shaking in play: when the amplitude is asked, the motor uses yours (in cm).
  wave(ref=false){const c=this.config;if(ref)return c.ref;return c.A===null?{...c,A:this.answer===null?this.exact()/100:this.answer/100}:c;}
  power(ref=false){const w=this.wave(ref);return w?.5*w.mu*(2*Math.PI*w.f)**2*w.A**2*w.v:0;}
  arrival(ref=false){return RopePowerModel.L/this.wave(ref).v;}
  front(t,ref=false){return Math.min(this.wave(ref).v*this.clamp(t),RopePowerModel.L);}
  height(x,t,ref=false){const w=this.wave(ref),s=this.clamp(t);return x<=w.v*s?w.A*Math.sin(2*Math.PI*w.f*(s-x/w.v)):0;}
  // Energy taken in by the absorber so far (J).
  delivered(t,ref=false){return this.power(ref)*Math.max(0,this.clamp(t)-this.arrival(ref));}
  duration(){return RopePowerModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 3 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,P=w=>.5*w.mu*(2*Math.PI*w.f)**2*w.A**2*w.v;
    if(c.ask==='power')return P(c);if(c.ask==='amplitude')return c.ref.A*c.ref.f/c.f*100;return P(c)/P(c.ref);
  }
  unit(){return RopePowerModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=RopePowerModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='ratioA'){const k=c.A/c.ref.A;if(near(a,k))slip='linear';else if(near(a,1))slip='unchanged';else if(near(a,Math.sqrt(k)))slip='root';else if(near(a,k**3))slip='cubed';}
      else if(c.ask==='ratioBoth'){const k=c.A/c.ref.A*c.f/c.ref.f;if(near(a,k))slip='bothLinear';else if(near(a,k*c.A/c.ref.A))slip='oneSquared';}
      else if(c.ask==='power'){if(near(a,2*e))slip='noHalf';else if(near(a,e/(4*Math.PI**2)))slip='frequency';else if(near(a,e/(2*Math.PI*c.f)))slip='omegaNotSquared';else if(near(a,e*1e4))slip='unitsCm';}
      else if(c.ask==='amplitude'){const A0=c.ref.A*100,k=c.f/c.ref.f;if(near(a,A0/k/k))slip='quarter';else if(near(a,A0/Math.sqrt(k)))slip='rootSwing';else if(near(a,A0))slip='sameSwing';else if(near(a,A0*k))slip='double';}
      else{if(near(a,c.mu/c.ref.mu))slip='massOnly';else if(near(a,c.v/c.ref.v))slip='speedOnly';else if(near(a,1))slip='sameRope';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!RopePowerModel.missions[saved.index])return false;
    const probe=new RopePowerModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={ratioA:'P₂ ÷ P₁ =',ratioBoth:'P₂ ÷ P₁ =',power:'P =',amplitude:'A₂ =',ratioRope:'P₂ ÷ P₁ ='};
const cmOf=m=>plain(m*100);
// Givens: what changes between the earlier shaking and the new one, or the rope and the shaking.
function given(m){
  if(m.ask==='power')return 'μ = '+plain(m.mu)+' kg/m · v = '+plain(m.v)+' m/s · f = '+plain(m.f)+' Hz · A = '+cmOf(m.A)+' cm';
  if(m.ask==='amplitude')return 'f: '+plain(m.ref.f)+' → '+plain(m.f)+' Hz · A₁ = '+cmOf(m.ref.A)+' cm';
  if(m.ask==='ratioRope')return 'μ ×'+plain(m.mu/m.ref.mu)+' · v: '+plain(m.ref.v)+' → '+plain(m.v)+' m/s';
  return 'A: '+cmOf(m.ref.A)+' → '+cmOf(m.A)+' cm · f'+(m.f===m.ref.f?' = '+plain(m.f):': '+plain(m.ref.f)+' → '+plain(m.f))+' Hz';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='ratioA')return 'P₂ ÷ P₁ = (A₂ ÷ A₁)² = ('+cmOf(c.A)+' ÷ '+cmOf(c.ref.A)+')² = '+number(e);
  if(c.ask==='ratioBoth')return 'P₂ ÷ P₁ = (A₂ ÷ A₁)²·(f₂ ÷ f₁)² = '+plain(c.A/c.ref.A)+'² × '+plain(c.f/c.ref.f)+'² = '+number(e);
  if(c.ask==='power')return 'P = ½·μ·(2π·f)²·A²·v = ½ × '+plain(c.mu)+' × (2π × '+plain(c.f)+')² × '+plain(c.A)+'² × '+plain(c.v)+' = '+number(e)+' W';
  if(c.ask==='amplitude')return 'A₂ = A₁·f₁ ÷ f₂ = '+cmOf(c.ref.A)+' × '+plain(c.ref.f)+' ÷ '+plain(c.f)+' = '+number(e,1)+' cm';
  return 'P₂ ÷ P₁ = (μ₂·v₂) ÷ (μ₁·v₁) = ('+plain(c.mu)+' × '+plain(c.v)+') ÷ ('+plain(c.ref.mu)+' × '+plain(c.ref.v)+') = '+number(e);
}
function baseEquation(){return model.config.ask==='amplitude'?'P ∝ f²·A²':'P = ½·μ·ω²·A²·v';}
function metrics(t,begun){
  const w=model.wave();
  $('power-value').textContent=begun?number(model.power()):'—';$('energy-value').textContent=begun?number(model.delivered(t)):'—';
  $('frequency-value').textContent=begun?plain(w.f):'—';$('speed-value').textContent=begun?number(w.v):'—';
}
function values(){const c=model.config,P=w=>.5*w.mu*(2*Math.PI*w.f)**2*w.A**2*w.v,now=c.A===null?{...c,A:c.ref.A*c.ref.f/c.f}:c;return {p:number(P(now)),p0:c.ref?number(P(c.ref)):'',a:number(now.A*100,1)};}
function runningCopy(t){return text('shakingCopy',{x:number(model.front(t)),e:number(model.delivered(t))});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,L=RopePowerModel.L,x0=58,x1=g.area-78,kp=(x1-x0)/L,X=x=>x0+x*kp,ym=height*.48,ky=Math.min(700,(height*.22)/.1),Y=y=>ym-Math.max(Math.min(y,.3),-.3)*ky;
  // The motor, the rope (heights enlarged), the earlier shaking for comparison, and the absorber with its lamp.
  const arm=Y(model.height(0,s));box(x0-46,ym-40,30,80,'#22384a');line([{x:x0-16,y:ym},{x:x0,y:arm}],'#d1e3ed',3);dot(x0,arm,4,'#d1e3ed');
  if(c.ref&&g.option){const ref=[];for(let i=0;i<=360;i++){const x=L*i/360;ref.push({x:X(x),y:Y(model.height(x,s,true))});}line(ref,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=480;i++){const x=L*i/480;pts.push({x:X(x),y:Y(model.height(x,s))});}line(pts,'#77b9ff',3);
  box(x1+2,ym-34,30,68,'#3b5468');line([{x:x1+2,y:ym-34},{x:x1+2,y:ym+34}],'#f2f8fc',2);
  const lit=g.begun&&s>model.arrival()?1:0,most=Math.max(model.power(),c.ref?model.power(true):0,1e-9),glow=lit*model.power()/most;
  dot(x1+17,ym-58,9+9*glow,'rgba(246,226,122,'+(.12+.8*glow)+')');dot(x1+17,ym-58,6,glow>0?'#f6e27a':'#5c6b78');
  if(g.option){line([{x:X(0),y:ym+ky*.16+18},{x:X(L),y:ym+ky*.16+18}],'#8aa3b5',1);for(let m=0;m<=L;m++){const x=X(m);line([{x,y:ym+ky*.16+18},{x,y:ym+ky*.16+26}],'#9fb6c7',1);label(plain(m)+' m',x,ym+ky*.16+38,'#9fb6c7','center',9);}}
  if(g.guess&&c.ask==='amplitude'){const yy=Y(model.answer/100);line([{x:X(.3),y:yy},{x:X(1.6),y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),X(.3),yy-6,'#efb958',9,120);}
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g;
  fit(text('energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,PX=q=>px0+q/D*(px1-px0),upto=Math.min(g.t,D);
  // Your prediction as a power: a multiple of the earlier power, a power in watts, or none when your amplitude drives the motor.
  const guessP=!g.guess||c.ask==='amplitude'?null:c.ask==='power'?model.answer:model.answer*model.power(true);
  const top=Math.max(model.delivered(D),c.ref?model.delivered(D,true):0,guessP===null?0:Math.min(guessP,3*model.power())*(D-model.arrival()))*1.15||1,PY=e=>py1-Math.min(e,top)/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(c.ref){const ref=[];for(let i=0;i<=200;i++){const q=upto*i/200;ref.push({x:PX(q),y:PY(model.delivered(q,true))});}line(ref,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=200;i++){const q=upto*i/200;pts.push({x:PX(q),y:PY(model.delivered(q))});}line(pts,'#77b9ff',2);
  if(guessP!==null){const a=model.arrival();line([{x:PX(a),y:PY(0)},{x:PX(D),y:PY(guessP*(D-a))}],'#efb958',1.5,[5,3]);}
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
