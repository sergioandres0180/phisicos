module.exports = {
kind:'beach',model:'BeachModel',title:'Shallow Beach',symbol:'λ₂ =',unit:'m',equation:'λ₂ ÷ λ₁ = v₂ ÷ v₁',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','deepLegend'],['white','shallowLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['speed1-value','speed1Metric','m/s','v₁','vector'],['speed2-value','speed2Metric','m/s','v₂','vector'],['wavelength2-value','wavelength2Metric','m','λ₂','vector'],['frequency-value','frequencyMetric','Hz','f']],
modelCode:String.raw`
class BeachModel {
  // Refraction of water waves. Waves slow down where the water gets shallow, over a sandbank. The frequency is set by
  // whatever makes the waves, so it stays the same; the wavelength shrinks with the speed, λ₂ = λ₁·v₂ ÷ v₁; and waves that
  // meet the edge at an angle bend towards the normal: sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂. Shallow-water waves run at v = √(g·h).
  // Angles are measured from the normal, the line straight across the edge. A run shows three periods, paced to 4 s.
  static tolerance = .02;
  static g = 9.8;
  static missions = [
    {key:'wavelength',ask:'wavelength',v1:5,v2:3,f:.5,theta:0},
    {key:'frequency',ask:'frequency',v1:5,v2:3,f:.5,theta:0},
    {key:'angle',ask:'angle',v1:5,v2:3,f:.5,theta:30},
    {key:'speed',ask:'speed',v1:6,v2:6*Math.sin(25*Math.PI/180)/Math.sin(40*Math.PI/180),f:.5,theta:40},
    {key:'depth',ask:'depth',v1:5,v2:3,f:.5,theta:0}
  ].map(m=>({...m,pace:1.5}));
  static units = {wavelength:'m',frequency:'Hz',angle:'°',speed:'m/s',depth:'m'};
  static limits = {wavelength:1e4,frequency:1e3,angle:90,speed:1e4,depth:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BeachModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=BeachModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  lambda1(){return this.config.v1/this.config.f;}
  lambda2(){return this.config.v2/this.config.f;}
  // The angle (degrees) to the normal over the sandbank, from sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂.
  theta2(){const c=this.config;return Math.asin(Math.sin(c.theta*Math.PI/180)*c.v2/c.v1)*180/Math.PI;}
  static edge = 20; // the edge of the sandbank is the line x = 20 m
  // How many wavelengths from the origin a point is: the phase, continuous across the edge.
  phase(x,y){const c=this.config,a=c.theta*Math.PI/180,b=this.theta2()*Math.PI/180,e=BeachModel.edge;
    return x<e?(x*Math.cos(a)+y*Math.sin(a))/this.lambda1():(e*Math.cos(a)+y*Math.sin(a))/this.lambda1()+(x-e)*Math.cos(b)/this.lambda2();}
  // The water's height (share of the wave's height) at a point and time: crests where phase − f·t is a whole number.
  height(x,y,t){return Math.cos(2*Math.PI*(this.phase(x,y)-this.config.f*this.clamp(t)));}
  crossed(t){return Math.floor(this.config.f*this.clamp(t)+1e-9);}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  duration(){return 3/this.config.f;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after three periods.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='frequency')return c.f;if(c.ask==='angle')return this.theta2();if(c.ask==='speed')return c.v2;if(c.ask==='depth')return c.v2*c.v2/BeachModel.g;return this.lambda2();}
  unit(){return BeachModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=BeachModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12,d=Math.PI/180;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const l1=this.lambda1();
      if(c.ask==='wavelength'){if(near(a,l1*c.v1/c.v2))slip='invertedRatio';else if(near(a,l1))slip='unchanged';else if(near(a,l1-(c.v1-c.v2)))slip='speedDifference';}
      else if(c.ask==='frequency'){if(near(a,c.f*c.v2/c.v1))slip='slowedFreq';else if(near(a,c.f*c.v1/c.v2))slip='speededFreq';}
      else if(c.ask==='angle'){if(near(a,c.theta*c.v2/c.v1))slip='linearAngle';else if(Math.sin(c.theta*d)*c.v1/c.v2<1&&near(a,Math.asin(Math.sin(c.theta*d)*c.v1/c.v2)/d))slip='invertedAngle';else if(near(a,c.theta))slip='unchangedAngle';}
      else if(c.ask==='speed'){if(near(a,c.v1*Math.sin(c.theta*d)/Math.sin(this.theta2()*d)))slip='invertedSpeed';else if(near(a,c.v1*this.theta2()/c.theta))slip='linearSpeed';}
      else{if(near(a,c.v2/BeachModel.g))slip='notSquared';else if(near(a,BeachModel.g*c.v2*c.v2))slip='multiplied';else if(near(a,c.v2*c.v2))slip='squareOnly';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BeachModel.missions[saved.index])return false;
    const probe=new BeachModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={wavelength:'λ₂ =',frequency:'f₂ =',angle:'θ₂ =',speed:'v₂ =',depth:'h ='};
// Givens: the deep-water wavelength and the change of speed, the angle in, two angles, or the shallow speed.
function given(m){
  if(m.ask==='angle')return 'θ₁ = '+plain(m.theta)+'° · v: '+plain(m.v1)+' → '+plain(m.v2)+' m/s';
  if(m.ask==='speed')return 'v₁ = '+plain(m.v1)+' m/s · 40° → 25°';
  if(m.ask==='depth')return 'v₂ = '+plain(m.v2)+' m/s · g = '+plain(9.8)+' m/s²';
  return 'λ₁ = '+plain(m.v1/m.f)+' m · v: '+plain(m.v1)+' → '+plain(m.v2)+' m/s';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='frequency')return 'f₂ = f₁ = v₁ ÷ λ₁ = '+plain(c.v1)+' ÷ '+plain(model.lambda1())+' = '+number(e)+' Hz';
  if(c.ask==='angle')return 'sin θ₂ = sin '+plain(c.theta)+'° × '+plain(c.v2)+' ÷ '+plain(c.v1)+' → θ₂ = '+number(e,1)+'°';
  if(c.ask==='speed')return 'v₂ = v₁·sin 25° ÷ sin 40° = '+number(e)+' m/s';
  if(c.ask==='depth')return 'h = v₂² ÷ g = '+plain(c.v2)+'² ÷ '+plain(9.8)+' = '+number(e)+' m';
  return 'λ₂ = λ₁·v₂ ÷ v₁ = '+plain(model.lambda1())+' × '+plain(c.v2)+' ÷ '+plain(c.v1)+' = '+number(e,1)+' m';
}
function baseEquation(){const a=model.config.ask;return a==='frequency'?'f₂ = f₁':a==='angle'||a==='speed'?'sin θ₁ ÷ sin θ₂ = v₁ ÷ v₂':a==='depth'?'v = √(g·h)':'λ₂ ÷ λ₁ = v₂ ÷ v₁';}
function metrics(t,begun){
  const c=model.config;
  $('speed1-value').textContent=begun?number(c.v1,1):'—';$('speed2-value').textContent=begun?number(c.v2,2):'—';
  $('wavelength2-value').textContent=begun?number(model.lambda2(),1):'—';$('frequency-value').textContent=begun?number(c.f):'—';
}
function values(){const c=model.config;return {l:plain(model.lambda2()),f:plain(c.f),a:number(model.theta2(),1),v:number(c.v2),h:number(c.v2*c.v2/BeachModel.g)};}
function runningCopy(t){return text('beachCopy',{n:plain(model.crossed(t))});}
// The wavelength (m) or angle (degrees) over the sandbank that your answer stands for.
function guessLambda(){const c=model.config,a=model.answer;if(c.ask==='wavelength')return a;if(c.ask==='frequency')return c.v2/a;if(c.ask==='depth')return Math.sqrt(BeachModel.g*a)/c.f;return null;}
function guessAngle(){const c=model.config,a=model.answer,s=Math.sin(c.theta*Math.PI/180)*(c.ask==='speed'?a:c.v2)/c.v1;if(c.ask==='angle')return a;if(c.ask==='speed'&&s<1)return Math.asin(s)*180/Math.PI;return null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,W=40,H=30,e=BeachModel.edge,x0=20,y0=58,k=Math.min((g.area-40)/W,(height-150)/H),X=x=>x0+x*k,Y=y=>y0+(H/2-y)*k,deg=Math.PI/180;
  // The sea from above: deep water on the left, the sandbank on the right; crests are lines where the phase is whole.
  box(X(0),Y(H/2),e*k,H*k,'#173a50');box(X(e),Y(H/2),(W-e)*k,H*k,'#2a6272');line([{x:X(e),y:Y(H/2)},{x:X(e),y:Y(-H/2)}],'#c9b79c',2,[6,4]);
  label(text('deepTag'),X(2),Y(H/2)+14,'#d1e3ed','left',10);label(text('shallowTag'),X(W)-6,Y(H/2)+14,'#d1e3ed','right',10);
  if(g.begun){const ft=c.f*model.clamp(s),ys=[];for(let i=0;i<=40;i++)ys.push(-H/2+H*i/40);
    let pmin=Infinity,pmax=-Infinity;for(const x of [0,W])for(const y of [-H/2,H/2]){const p=model.phase(x,y);pmin=Math.min(pmin,p);pmax=Math.max(pmax,p);}
    for(let m=Math.ceil(pmin-ft)-1;m<=Math.floor(pmax-ft)+1;m++){const deep=[],shallow=[];
      for(const y of ys){let lo=0,hi=W,target=m+ft;if(model.phase(lo,y)>target||model.phase(hi,y)<target)continue;for(let it=0;it<40;it++){const mid=(lo+hi)/2;if(model.phase(mid,y)<target)lo=mid;else hi=mid;}(lo<e?deep:shallow).push({x:X(lo),y:Y(y)});}
      if(deep.length>1)line(deep,'#77b9ff',2);if(shallow.length>1)line(shallow,'#f2f8fc',2);}}
  // The path of the waves: straight in, bending at the edge; the dashed normal.
  const a=c.theta*deg,b=model.theta2()*deg,L=16;line([{x:X(e-L),y:Y(0)},{x:X(e+L),y:Y(0)}],'#9fb6c7',1,[3,4]);
  line([{x:X(e-L*Math.cos(a)),y:Y(-L*Math.sin(a))},{x:X(e),y:Y(0)}],'#77b9ff',2.5);if(g.begun)line([{x:X(e),y:Y(0)},{x:X(e+L*Math.cos(b)),y:Y(L*Math.sin(b))}],'#f2f8fc',2.5);
  label(text('normalTag'),X(e+L)-4,Y(0)-6,'#9fb6c7','right',9);
  if(g.option){const ry=Y(-H/2)+16;for(let m=0;m<=W;m+=5){line([{x:X(m),y:ry-4},{x:X(m),y:ry+2}],'#9fb6c7',1);label(plain(m)+' m',X(m),ry+14,'#9fb6c7','center',8);}}
  // Your answer: an orange path at your angle, or orange marks your wavelength apart along the path over the sandbank.
  if(g.guess){const ga=guessAngle(),gl=guessLambda();
    if(ga!==null){const r=ga*deg;line([{x:X(e),y:Y(0)},{x:X(e+L*Math.cos(r)),y:Y(L*Math.sin(r))}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(e+L*Math.cos(r))-4,Y(L*Math.sin(r))-6,'#efb958',9,120,'right');}
    if(gl!==null&&g.begun){const ft=c.f*model.clamp(s),s0=(Math.ceil(ft+1e-9)-ft)*model.lambda2();if(gl*k>=5)for(let q=s0;q<=W-e;q+=gl){const px=e+q*Math.cos(b),py=q*Math.sin(b);line([{x:X(px),y:Y(py)-10},{x:X(px),y:Y(py)+10}],'#efb958',2.5);}
      fit(text('guessTag'),X(e)+6,Y(0)+24,'#efb958',9,120);}}
  fit(text('paceTag',{n:plain(c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('profileGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The water along the waves' path: crests closer together and the seabed higher over the sandbank.
  const px0=g.area+14,px1=width-14,py0=80,py1=height-80,S=20,PX=q=>px0+(q+S)/(2*S)*(px1-px0),ym=py0+(py1-py0)*.32,amp=(py1-py0)*.12,ft=c.f*model.clamp(g.t),l1=model.lambda1(),l2=model.lambda2();
  const P=q=>q<0?q/l1:q/l2,pts=[];for(let i=0;i<=400;i++){const q=-S+2*S*i/400;pts.push({x:PX(q),y:ym-amp*Math.cos(2*Math.PI*(P(q)-ft))});}
  line(pts.filter(p=>p.x<=PX(0)),'#77b9ff',2);line(pts.filter(p=>p.x>=PX(0)),'#f2f8fc',2);
  line([{x:px0,y:py1},{x:PX(0),y:py1},{x:PX(0),y:ym+amp+30},{x:px1,y:ym+amp+30}],'#c9b79c',2);line([{x:PX(0),y:py0},{x:PX(0),y:py1}],'#9fb6c7',1,[3,4]);
  const gl=g.guess?guessLambda():null;if(gl!==null&&gl*(px1-px0)/(2*S)>=5){const s0=(Math.ceil(ft+1e-9)-ft)*l2;for(let q=s0;q<=S;q+=gl)line([{x:PX(q),y:ym-amp-14},{x:PX(q),y:ym-amp-4}],'#efb958',2.5);}
  fit(text('distanceAxis'),px0,py1+14,'#9fb6c7',9,px1-px0);
}
`
};
