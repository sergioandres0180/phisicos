module.exports = {
kind:'tension',model:'TensionModel',title:'Rope Tension Lab',symbol:'v =',unit:'m/s',equation:'v = √(F ÷ μ)',timeUnit:'ms',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','ropeLegend'],['white','beforeLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['tension-value','tensionMetric','N','F','vector'],['density-value','densityMetric','kg/m','μ'],['speed-value','speedMetric','m/s','v','vector'],['position-value','positionMetric','m','x','vector']],
modelCode:String.raw`
class TensionModel {
  // A pulse runs along a rope pulled tight by a hanging weight. Its speed depends only on the rope: v = √(F ÷ μ), with the
  // tension F (N) and the mass per metre μ (kg/m). A run lasts until the pulse reaches the pulley. Time is in milliseconds
  // and runs in slow motion, so every run takes 3 s.
  static tolerance = .02;
  static missions = [
    {key:'speed',ask:'speed',F:40,mu:.1,L:10,pace:500/3},
    {key:'fourTension',ask:'speed',F:160,mu:.1,L:10,pace:250/3,before:{F:40,mu:.1}},
    {key:'heavier',ask:'speed',F:40,mu:.4,L:10,pace:1000/3,before:{F:40,mu:.1}},
    {key:'tension',ask:'tension',F:45,mu:.05,L:12,pace:400/3},
    {key:'time',ask:'time',F:80,mu:.05,L:10,mass:.5,pace:250/3}
  ];
  static units = {speed:'m/s',tension:'N',time:'s'};
  static limits = {speed:1e6,tension:1e7,time:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=TensionModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=TensionModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  speed(){return Math.sqrt(this.config.F/this.config.mu);}
  beforeSpeed(){const b=this.config.before;return b?Math.sqrt(b.F/b.mu):null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The pulse's centre (m from the hand) at time t (ms).
  position(t){return this.speed()*this.clamp(t)/1000;}
  duration(){return this.config.L/this.speed()*1000;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the pulse reaches the pulley.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='tension')return c.F;if(c.ask==='time')return this.duration()/1000;return this.speed();}
  unit(){return TensionModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),v=this.speed(),tol=TensionModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const vb=this.beforeSpeed();
      if(c.key==='speed'){if(near(a,c.F/c.mu))slip='noRoot';else if(near(a,Math.sqrt(c.mu/c.F)))slip='invertedRoot';else if(near(a,c.F*c.mu))slip='multiplied';}
      else if(c.key==='fourTension'){if(near(a,4*vb))slip='linear';else if(near(a,vb))slip='unchanged';}
      else if(c.key==='heavier'){if(near(a,vb/4))slip='linearMass';else if(near(a,2*vb))slip='faster';else if(near(a,vb))slip='unchanged';}
      else if(c.key==='tension'){if(near(a,c.mu*v))slip='notSquared';else if(near(a,v*v/c.mu))slip='invertedForce';else if(near(a,v*v))slip='squareOnly';}
      else{if(near(a,c.L/Math.sqrt(c.F/c.mass)))slip='wholeMass';else if(near(a,v/c.L))slip='invertedTime';else if(near(a,c.L/(c.F/c.mu)))slip='noRootTime';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!TensionModel.missions[saved.index])return false;
    const probe=new TensionModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v =',tension:'F =',time:'t ='};
// Givens: the tension and the rope, a change to one of them, the speed wanted, or a rope's length and mass.
function given(m){
  if(m.key==='fourTension')return 'F: '+plain(m.before.F)+' → '+plain(m.F)+' N · μ = '+plain(m.mu)+' kg/m';
  if(m.key==='heavier')return 'μ: '+plain(m.before.mu)+' → '+plain(m.mu)+' kg/m · F = '+plain(m.F)+' N';
  if(m.key==='tension')return 'v = '+plain(Math.sqrt(m.F/m.mu))+' m/s · μ = '+plain(m.mu)+' kg/m';
  if(m.key==='time')return 'L = '+plain(m.L)+' m · '+plain(m.mass)+' kg · F = '+plain(m.F)+' N';
  return 'F = '+plain(m.F)+' N · μ = '+plain(m.mu)+' kg/m';
}
function equation(){
  const c=model.config,e=model.exact(),v=model.speed();
  if(c.ask==='tension')return 'F = μ·v² = '+plain(c.mu)+' × '+plain(v)+'² = '+number(e,1)+' N';
  if(c.ask==='time')return 't = L ÷ v = '+plain(c.L)+' ÷ '+plain(v)+' = '+number(e,3)+' s';
  return 'v = √(F ÷ μ) = √('+plain(c.F)+' ÷ '+plain(c.mu)+') = '+number(e,1)+' m/s';
}
function baseEquation(){return model.config.ask==='tension'?'F = μ·v²':model.config.ask==='time'?'t = L ÷ v':'v = √(F ÷ μ)';}
function metrics(t,begun){
  const c=model.config;
  $('tension-value').textContent=begun?number(c.F,0):'—';$('density-value').textContent=begun?plain(c.mu):'—';
  $('speed-value').textContent=begun?number(model.speed(),1):'—';$('position-value').textContent=begun?number(model.position(t),1):'—';
}
function values(){const c=model.config;return {v:plain(model.speed()),F:plain(c.F),t:plain(model.duration()/1000)};}
function runningCopy(t){return text('ropeCopy',{x:number(model.position(t),1)});}
// The speed (m/s) your answer stands for.
function guessSpeed(){const c=model.config,a=model.answer;if(c.ask==='tension')return Math.sqrt(a/c.mu);if(c.ask==='time')return c.L/a;return a;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=48,x1=g.area-78,kp=(x1-x0)/c.L,X=x=>x0+x*kp,amp=Math.min(40,height*.09),W=.16*c.L;
  const bump=u=>Math.abs(u)<W/2?.5*(1+Math.cos(2*Math.PI*u/W)):0,two=!!c.before,ry=two?height*.66:height*.55,yb=height*.34;
  // A rope from the hand to a pulley with a hanging weight; the pulse runs along it. Before-and-after tests add the old rope above.
  const rope=(y,pos,colour,width)=>{const pts=[];for(let i=0;i<=300;i++){const x=c.L*i/300;pts.push({x:X(x),y:y-amp*(g.begun?bump(x-pos):0)});}line(pts,colour,width);};
  const pulley=(y,F)=>{dot(x1+14,y+12,12,'#8aa3b5');line([{x:x1+26,y:y+12},{x:x1+26,y:y+32}],'#9fb6c7',2);box(x1+12,y+32,28,22,'#5c6b78');label(plain(F)+' N',x1+6,y+48,'#d1e3ed','right',10);};
  box(16,ry-14,x0-20,28,'#c9b79c');rope(ry,model.position(s),'#77b9ff',3);pulley(ry,c.F);
  if(two){const vb=model.beforeSpeed();box(16,yb-14,x0-20,28,'#8f8574');rope(yb,vb*model.clamp(s)/1000,'#d1e3ed',2);pulley(yb,c.before.F);
    fit(text('beforeTag')+' · '+plain(c.before.F)+' N · '+plain(c.before.mu)+' kg/m',x0,yb-amp-12,'#d1e3ed',10,x1-x0);fit(text('afterTag')+' · '+plain(c.F)+' N · '+plain(c.mu)+' kg/m',x0,ry-amp-12,'#77b9ff',10,x1-x0);}
  if(g.option){const ty=height-58,step=c.L>12?5:2;line([{x:X(0),y:ty},{x:X(c.L),y:ty}],'#8aa3b5',1);for(let m=0;m<=c.L+1e-9;m+=step){line([{x:X(m),y:ty},{x:X(m),y:ty+6}],'#9fb6c7',1);label(plain(m)+' m',X(m),ty+18,'#9fb6c7','center',9);}}
  // Your speed: an orange dot running above the rope.
  if(g.guess&&g.begun){const xg=guessSpeed()*model.clamp(s)/1000;if(xg<=c.L)dot(X(xg),ry-amp-(two?28:14),5,'#efb958');}
  fit(text('slowTag',{n:plain(1000/c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t,0)+' ms',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('positionGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=80,py1=height-80,PX=q=>px0+q/D*(px1-px0),PY=x=>py1-x/c.L*(py1-py0),upto=Math.min(g.t,D);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px1,y:py0}],'#8aa3b5',1,[3,4]);label(plain(c.L)+' m',px0+4,py0-6,'#9fb6c7','left',9);
  const ray=(v,colour,w,dash)=>{const end=Math.min(D,c.L/v*1000);line([{x:PX(0),y:PY(0)},{x:PX(end),y:PY(v*end/1000)}],colour,w,dash);};
  if(c.before)ray(model.beforeSpeed(),'#d1e3ed',1.5,[2,4]);
  if(g.guess)ray(guessSpeed(),'#efb958',1.5,[5,4]);
  line([{x:PX(0),y:PY(0)},{x:PX(upto),y:PY(model.position(upto))}],'#77b9ff',2.5);dot(PX(upto),PY(model.position(upto)),4,'#f2f8fc');
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
