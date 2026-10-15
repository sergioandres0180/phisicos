module.exports = {
kind:'fading',model:'FadingModel',title:'Big and Fading Swings',symbol:'T =',unit:'s',equation:'T₀ = 2π·√(L ÷ g)',
toggle:['show-ideal','idealToggle'],
legends:[['blue','realLegend'],['gray','idealLegend'],['orange','guessLegend'],['white','envelopeLegend']],
metrics:[['angle-value','angleMetric','°','θ','vector'],['size-value','sizeMetric','°','θ_max'],['period-value','periodMetric','s','T'],['swings-value','swingsMetric','','n = t ÷ T']],
modelCode:String.raw`
class FadingModel {
  // The small-swing formula T₀ = 2π·√(L ÷ g) leaves two things out. Big swings take longer: the exact period is
  // T = 4·√(L ÷ g)·K(sin(θ₀ ÷ 2)), with K the complete elliptic integral (computed with the arithmetic-geometric mean), and
  // the motion is integrated exactly. Real swings also fade: here each full swing keeps the same share of its size,
  // θ = θ₀·kⁿ·cos(2π·t ÷ T₀) with n = t ÷ T₀, so the energy, which goes with the size squared, keeps k² each swing.
  static g = 9.8;
  static tolerance = .02;
  static step = 1/2000;
  static missions = [
    {key:'big',ask:'period',L:1,start:60,periods:3,pace:1},
    {key:'clock',ask:'percent',L:1,start:30,periods:4,pace:1},
    {key:'damp',ask:'angle',L:1,start:20,keep:.9,swings:5,pace:2},
    {key:'halflife',ask:'swings',L:1,start:20,keep:.9,swings:8,pace:3},
    {key:'energy',ask:'lost',L:1,start:20,keep:.9,swings:1,pace:1}
  ];
  static units = {period:'s',percent:'%',angle:'°',swings:'',lost:'%'};
  static limits = {period:1e3,percent:1e4,angle:180,swings:1e4,lost:100};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=FadingModel.missions[index];this.answer=null;this.attempts=0;this.table=this.damped()?null:this.build();this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=FadingModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  damped(){return !!this.config.keep;}
  rad(d){return d*Math.PI/180;}
  small(){return 2*Math.PI*Math.sqrt(this.config.L/FadingModel.g);}
  // The exact period for a swing of θ₀ each way: 4·√(L ÷ g)·K(k), K = π ÷ (2·AGM(1, √(1 − k²))), k = sin(θ₀ ÷ 2).
  big(start=this.config.start){let a=1,b=Math.sqrt(1-Math.sin(this.rad(start)/2)**2);for(let i=0;i<30;i++){[a,b]=[(a+b)/2,Math.sqrt(a*b)];}return 4*Math.sqrt(this.config.L/FadingModel.g)*Math.PI/(2*a);}
  period(){return this.damped()?this.small():this.big();}
  // RK4 for θ'' = −(g ÷ L)·sin θ from rest at θ₀, sampled evenly over the run.
  build(){
    const c=this.config,g=FadingModel.g,dt=FadingModel.step,n=Math.ceil(c.periods*this.big()/dt)+2,out=new Float64Array(n+1);
    let th=this.rad(c.start),w=0;const acc=a=>-g/c.L*Math.sin(a);out[0]=th;
    for(let i=1;i<=n;i++){const k1v=acc(th),k1x=w,k2v=acc(th+dt/2*k1x),k2x=w+dt/2*k1v,k3v=acc(th+dt/2*k2x),k3x=w+dt/2*k2v,k4v=acc(th+dt*k3x),k4x=w+dt*k3v;th+=dt/6*(k1x+2*k2x+2*k3x+k4x);w+=dt/6*(k1v+2*k2v+2*k3v+k4v);out[i]=th;}
    return out;
  }
  duration(){const c=this.config;return c.keep?c.swings*this.small():c.periods*this.big();}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The swing's size each way now (degrees): fading for the damped tests, constant otherwise.
  size(t){const c=this.config;return c.keep?c.start*c.keep**(this.clamp(t)/this.small()):c.start;}
  angle(t){
    const c=this.config,s=this.clamp(t);
    if(c.keep)return this.size(s)*Math.cos(2*Math.PI*s/this.small());
    const i=s/FadingModel.step,j=Math.floor(i),f=i-j;return (this.table[j]+(this.table[j+1]-this.table[j])*f)*180/Math.PI;
  }
  ideal(t){return this.config.start*Math.cos(2*Math.PI*this.clamp(t)/this.small());}
  swings(t){return this.clamp(t)/this.period();}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after its whole number of swings.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config;
    if(c.ask==='period')return this.big();
    if(c.ask==='percent')return (this.big()/this.small()-1)*100;
    if(c.ask==='angle')return c.start*c.keep**c.swings;
    if(c.ask==='swings')return Math.log(2)/Math.log(1/c.keep);
    return (1-c.keep*c.keep)*100;
  }
  unit(){return FadingModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=FadingModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='period'){if(near(a,this.small()))slip='smallAngle';else if(near(a,e/2))slip='halfSwing';}
      else if(c.ask==='percent'){if(near(a,e/100))slip='fraction';else if(near(a,this.big()))slip='seconds';}
      else if(c.ask==='angle'){const loss=c.start*(1-c.keep);if(near(a,c.start-c.swings*loss))slip='linear';else if(near(a,c.start*c.keep))slip='oneSwing';else if(near(a,c.start*c.keep**(c.swings-1)))slip='fourSwings';else if(near(a,c.start*c.keep**(2*c.swings)))slip='energyKept';}
      else if(c.ask==='swings'){if(near(a,.5/(1-c.keep)))slip='linear';else if(near(a,e/2))slip='energyHalf';}
      else{if(near(a,(1-c.keep)*100))slip='amplitudeOnly';else if(near(a,c.keep*c.keep*100))slip='kept';else if(near(a,(1-c.keep)**2*100))slip='squaredLoss';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!FadingModel.missions[saved.index])return false;
    const probe=new FadingModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={period:'T =',percent:'ΔT ÷ T₀ =',angle:'θ₅ =',swings:'n =',lost:'ΔE ÷ E ='};
// Givens: the pendulum, how far it swings, and the share each swing keeps.
function given(m){return 'L = '+plain(m.L)+' m · θ₀ = '+plain(m.start)+'°'+(m.keep?' · '+plain(m.keep*100)+'%':'');}
function equation(){
  const c=model.config,T0=model.small();
  if(c.ask==='period')return 'T₀ = 2π·√(L ÷ g) = '+number(T0,3)+' s → T('+plain(c.start)+'°) = '+number(model.big()/T0,3)+' × T₀ = '+number(model.big(),3)+' s';
  if(c.ask==='percent')return 'T('+plain(c.start)+'°) ÷ T₀ = '+number(model.big(),3)+' ÷ '+number(T0,3)+' = '+number(model.big()/T0,4)+' → +'+number(model.exact())+' %';
  if(c.ask==='angle')return 'θ₅ = '+plain(c.start)+'° × '+plain(c.keep)+'⁵ = '+number(model.exact())+'°';
  if(c.ask==='swings')return plain(c.keep)+'ⁿ = ½ → n = log ½ ÷ log '+plain(c.keep)+' = '+number(model.exact())+'';
  return 'E ∝ θ² → '+plain(c.keep)+'² = '+plain(c.keep*c.keep)+' → '+number(model.exact(),0)+' %';
}
function baseEquation(){return model.damped()?(model.config.ask==='lost'?'E ∝ θ²':'θₙ = θ₀ × kⁿ'):'T₀ = 2π·√(L ÷ g)';}
function metrics(t,begun){
  $('angle-value').textContent=begun?number(model.angle(t),1):'—';$('size-value').textContent=begun?number(model.size(t),1):'—';
  $('period-value').textContent=begun?number(model.period(),3):'—';$('swings-value').textContent=begun?number(model.swings(t)):'—';
}
function values(){
  const c=model.config;
  return {T:number(model.big(),3),T0:number(model.small(),3),p:number(c.keep?0:model.exact()),a:number(c.keep?c.start*c.keep**c.swings:0,1),n:number(c.keep?Math.log(2)/Math.log(1/c.keep):0,1),k:number(c.keep?c.keep*c.keep*100:0,0),e:number(c.keep?(1-c.keep*c.keep)*100:0,0)};
}
function runningCopy(t){return text('swingingCopy',{n:number(model.swings(t)),a:number(model.size(t),1)});}
function scene(g){
  const c=g.c,{line,fit,dot,box}=g,s=g.ready?g.t:0,top=60;
  const kp=Math.max(60,Math.min((height-top-60)/(c.L+.1),(g.area-80)/(2*c.L*Math.sin(Math.PI/3)+.3))),px=g.area*.5,P=d=>{const r=d*Math.PI/180;return {x:px+c.L*kp*Math.sin(r),y:top+c.L*kp*Math.cos(r)};};
  box(px-60,top-10,120,10,'#22384a');line([{x:px-60,y:top},{x:px+60,y:top}],'#8aa3b5',2);
  const arc=[];for(let d=-c.start;d<=c.start;d+=1)arc.push(P(d));line(arc,'#8aa3b5',1,[2,4]);
  for(const d of [-c.start,c.start]){const q=P(d);line([{x:px,y:top},q],'#8aa3b5',1,[2,5]);}
  fit(plain(c.start)+'°',P(c.start).x+8,P(c.start).y,'#9fb6c7',10,60);
  if(model.damped()&&g.begun){const z=model.size(s);for(const d of [-z,z]){const q=P(d);line([{x:q.x-6,y:q.y+6},{x:q.x+6,y:q.y-6}],'#f2f8fc',2);}}
  if(g.guess&&c.ask==='angle'){for(const d of [-model.answer,model.answer]){const q=P(Math.max(Math.min(d,80),-80));line([{x:px,y:top},q],'#efb958',1.5,[5,3]);}fit(text('guessTag'),P(Math.min(model.answer,80)).x+8,P(Math.min(model.answer,80)).y+14,'#efb958',9,g.area*.3);}
  if(g.option){const q=P(g.ready?model.ideal(s):c.start);line([{x:px,y:top},q],'#9fb6c7',1.5,[5,4]);ctx.strokeStyle='#9fb6c7';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(q.x,q.y,11,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  const b=P(g.ready?model.angle(s):c.start);line([{x:px,y:top},b],'#d1e3ed',2);dot(b.x,b.y,11,'#77b9ff');
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box}=g;
  if(c.ask==='lost'){
    fit(text('energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
    if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
    const px0=g.area+16,px1=width-14,py0=76,py1=height-62,bw=(px1-px0)/2-12,now=(model.size(g.t)/c.start)**2*100,BY=v=>py1-v/110*(py1-py0);
    box(px0,BY(100),bw,py1-BY(100),'#9fb6c7');box(px0+bw+24,BY(now),bw,py1-BY(now),'#77b9ff');
    fit('100 %',px0+bw/2,BY(100)+15,'#0f2233',10,bw-4,'center');fit(number(now,0)+' %',px0+bw*1.5+24,py1-BY(now)>22?BY(now)+15:BY(now)-6,py1-BY(now)>22?'#0f2233':'#d1e3ed',10,bw-4,'center');
    fit('t = 0',px0+bw/2,py1+14,'#9fb6c7',9,bw+20,'center');fit('t = '+number(g.t)+' s',px0+bw*1.5+24,py1+14,'#9fb6c7',9,bw+20,'center');
    if(g.guess){const yy=BY(100-model.answer);line([{x:px0+bw+18,y:yy},{x:px1+4,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),px1,yy-5,'#efb958',9,bw,'right');}
    return;
  }
  fit(text('graphTitle'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,ym=(py0+py1)/2,span=c.start*1.15,PX=q=>px0+q/D*(px1-px0),PY=v=>ym-v/span*(py1-py0)/2,upto=Math.min(g.t,D);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  const curve=(f,to,color,w,dash=[])=>{const pts=[];for(let i=0;i<=240;i++){const q=to*i/240;pts.push({x:PX(q),y:PY(f(q))});}line(pts,color,w,dash);};
  if(g.option)curve(q=>model.ideal(q),upto,'#9fb6c7',1.5,[4,3]);
  if(model.damped()){curve(q=>model.size(q),upto,'#f2f8fc',1,[2,3]);curve(q=>-model.size(q),upto,'#f2f8fc',1,[2,3]);}
  curve(q=>model.angle(q),upto,'#77b9ff',2);
  if(g.guess){
    if(c.ask==='period'||c.ask==='percent'){const T=c.ask==='period'?model.answer:model.small()*(1+model.answer/100);if(T>=.2)for(let q=T;q<=D+1e-9;q+=T)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.2,[5,4]);}
    if(c.ask==='angle')for(const v of [model.answer,-model.answer]){const yy=PY(Math.max(Math.min(v,span),-span));line([{x:PX(D*.8),y:yy},{x:px1,y:yy}],'#efb958',1.5,[5,3]);}
    if(c.ask==='swings'){const x=PX(Math.min(model.answer*model.small(),D));line([{x,y:py0},{x,y:py1}],'#efb958',1.5,[5,3]);for(const v of [c.start/2,-c.start/2])line([{x:px0,y:PY(v)},{x:px1,y:PY(v)}],'#9fb6c7',1,[2,4]);}
  }
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
