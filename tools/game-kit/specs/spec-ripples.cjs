module.exports = {
kind:'ripples',model:'RipplesModel',title:'Pebble Ripples',symbol:'A =',unit:'cm',equation:'A ∝ 1 ÷ √r',
toggle:['show-floats','floatsToggle'],
legends:[['blue','waterLegend'],['red','floatLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['radius-value','radiusMetric','m','r = v·t','vector'],['height-value','heightMetric','cm','A'],['length-value','lengthMetric','m','2π·r'],['speed-value','speedMetric','m/s','v']],
modelCode:String.raw`
class RipplesModel {
  // A pebble sends out a ring that travels at v. Without losses its energy is shared around the whole ring, whose length is 2π·r,
  // so the energy per metre of ring falls as 1 ÷ r and, since energy grows as A², the height falls as A ∝ 1 ÷ √r. A straight
  // wave from a long plank doesn't spread: its height stays the same. A pebble with n times the energy gives √n times the height.
  static tolerance = .02;
  static v = 1; // m/s
  static start = .2; // m, the ring's radius when the run starts
  static half = .2; // m, half-width of the ring's crest
  static plank = 3; // m, the width of the straight wave
  static missions = [
    {key:'farther',ask:'height',A1:.02,r1:1,r2:4,view:4.6},
    {key:'energy',ask:'energy',A1:.02,r1:1,r2:3,view:3.6},
    {key:'where',ask:'distance',A1:.03,r1:.5,A2:.01,r2:4.5,view:5},
    {key:'bigger',ask:'bigHeight',A1:.01,r1:2,r2:2,E:4,view:2.6},
    {key:'plank',ask:'plankHeight',A1:.02,r1:1,r2:4,line:true,view:4.6}
  ];
  static units = {height:'cm',energy:'',distance:'m',bigHeight:'cm',plankHeight:'cm'};
  static limits = {height:1e4,energy:1e4,distance:1e4,bigHeight:1e4,plankHeight:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=RipplesModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=RipplesModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  front(t){return RipplesModel.start+RipplesModel.v*this.clamp(t);}
  // The crest's height (m) when the ring has radius r; the reference is the small pebble.
  amp(r,ref=false){const c=this.config,base=c.A1*(c.line?1:Math.sqrt(c.r1/Math.max(r,RipplesModel.start)));return c.E&&!ref?base*Math.sqrt(c.E):base;}
  // The water's height (m) at distance x: one smooth crest centred on the ring.
  height(x,t,ref=false){const w=RipplesModel.half,s=x-this.front(t);return Math.abs(s)<w?this.amp(this.front(t),ref)*(1+Math.cos(Math.PI*s/w))/2:0;}
  // The wavefront's length (m): a circle, or the plank's width for a straight wave.
  length(t){return this.config.line?RipplesModel.plank:2*Math.PI*this.front(t);}
  duration(){return (this.config.view-RipplesModel.start)/RipplesModel.v;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends once the ring has passed the farthest float.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='energy')return c.r2/c.r1;if(c.ask==='distance')return c.r1*(c.A1/c.A2)**2;return this.amp(c.r2)*100;}
  unit(){return RipplesModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=RipplesModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12,k=c.r2/c.r1,A=c.A1*100;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='height'){if(near(a,A/k))slip='inverse';else if(near(a,A/k/k))slip='inverseSquare';else if(near(a,A))slip='same';else if(near(a,A*Math.sqrt(k)))slip='grows';else if(near(a,A*k))slip='times';}
      else if(c.ask==='energy'){if(near(a,k*k))slip='squared';else if(near(a,Math.sqrt(k)))slip='amplitudeRatio';else if(near(a,1))slip='noChange';}
      else if(c.ask==='distance'){const q=c.A1/c.A2;if(near(a,c.r1*q))slip='linear';else if(near(a,c.r1*Math.sqrt(q)))slip='root';else if(near(a,c.r1/q/q))slip='inverted';}
      else if(c.ask==='bigHeight'){if(near(a,A*c.E))slip='energyLinear';else if(near(a,A))slip='unchanged';else if(near(a,A*c.E*c.E))slip='energySquared';}
      else{if(near(a,A/Math.sqrt(k)))slip='circle';else if(near(a,A/k))slip='plankInverse';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!RipplesModel.missions[saved.index])return false;
    const probe=new RipplesModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={height:'A =',energy:'E₁ ÷ E₂ =',distance:'r =',bigHeight:'A =',plankHeight:'A ='};
const cm=m=>number(m*100,1);
// Givens: the measured height and distance, and where the question looks.
function given(m){
  if(m.ask==='energy')return 'r: '+plain(m.r1)+' → '+plain(m.r2)+' m';
  if(m.ask==='distance')return 'A: '+plain(m.A1*100)+' → '+plain(m.A2*100)+' cm · r₁ = '+plain(m.r1)+' m';
  if(m.ask==='bigHeight')return 'A₁ = '+plain(m.A1*100)+' cm · r = '+plain(m.r1)+' m · E ×'+plain(m.E);
  return 'A₁ = '+plain(m.A1*100)+' cm · '+(m.line?'x':'r')+': '+plain(m.r1)+' → '+plain(m.r2)+' m';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='height')return 'A₂ = A₁·√(r₁ ÷ r₂) = '+plain(c.A1*100)+' × √('+plain(c.r1)+' ÷ '+plain(c.r2)+') = '+number(e,1)+' cm';
  if(c.ask==='energy')return 'E₁ ÷ E₂ = r₂ ÷ r₁ = '+plain(c.r2)+' ÷ '+plain(c.r1)+' = '+number(e);
  if(c.ask==='distance')return 'r₂ = r₁·(A₁ ÷ A₂)² = '+plain(c.r1)+' × ('+plain(c.A1*100)+' ÷ '+plain(c.A2*100)+')² = '+number(e)+' m';
  if(c.ask==='bigHeight')return 'A = A₁·√(E ÷ E₁) = '+plain(c.A1*100)+' × √'+plain(c.E)+' = '+number(e,1)+' cm';
  return 'A₂ = A₁ = '+number(e,1)+' cm';
}
function baseEquation(){const a=model.config.ask;return a==='energy'||a==='bigHeight'?'E ∝ A²':a==='plankHeight'?'A₂ = A₁':'A ∝ 1 ÷ √r';}
function metrics(t,begun){
  $('radius-value').textContent=begun?number(model.front(t)):'—';$('height-value').textContent=begun?cm(model.amp(model.front(t))):'—';
  $('length-value').textContent=begun?number(model.length(t)):'—';$('speed-value').textContent=begun?number(RipplesModel.v):'—';
}
function values(){const c=model.config;return {a:cm(model.amp(c.r1,true)),b:cm(model.amp(c.r2)),r:plain(c.r2)};}
function runningCopy(t){return text(model.config.line?'straightCopy':'spreadingCopy',{r:number(model.front(t)),a:cm(model.amp(model.front(t))),l:number(model.length(t))});}
// Where the floats sit: at the measured distance and at the one asked about.
function floats(c){return c.r1===c.r2?[c.r2]:[c.r1,c.r2];}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=44,x1=g.area-24,kp=(x1-x0)/c.view,X=x=>x0+x*kp;
  const top=52,bottom=height*.56,yc=(top+bottom)/2,ys=height*.76,ky=Math.min(1100,(height*.16)/.045),Y=y=>ys-y*ky,front=model.front(s);
  // Top view of the pond: the pebble at the left edge and the ring (or the plank's straight wave) moving out.
  box(16,top,g.area-32,bottom-top,'#173a50');
  ctx.save();ctx.beginPath();ctx.rect(16,top,g.area-32,bottom-top);ctx.clip();
  line([{x:x0,y:yc},{x:x1,y:yc}],'#9fb6c7',1,[3,5]);
  if(g.begun){
    const share=Math.min(1,model.amp(front)/Math.max(model.amp(RipplesModel.start),1e-9)),w=1.5+6*share;
    ctx.strokeStyle='rgba(119,185,255,'+(.35+.65*share)+')';ctx.lineWidth=w;ctx.beginPath();
    if(c.line){ctx.moveTo(X(front),top);ctx.lineTo(X(front),bottom);}else ctx.arc(x0,yc,front*kp,-Math.PI/2,Math.PI/2);ctx.stroke();
  }
  ctx.restore();
  if(c.line)box(x0-14,top+6,8,bottom-top-12,'#8a6d4f');else dot(x0,yc,6,'#c9b79c');
  // Side view along the dashed line, heights enlarged: the crest passes under the floats, which bob up and down in place.
  line([{x:x0,y:ys},{x:x1,y:ys}],'#8aa3b5',1);
  if(c.E){const ref=[];for(let i=0;i<=400;i++){const x=c.view*i/400;ref.push({x:X(x),y:Y(model.height(x,s,true))});}line(ref,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=500;i++){const x=c.view*i/500;pts.push({x:X(x),y:Y(model.height(x,s))});}line(pts,'#77b9ff',3);
  for(const r of floats(c)){const fx=X(r),fy=Y(model.height(r,s));dot(fx,fy-5,5,'#ff7b6b');if(g.option){dot(fx,yc,4,'#ff7b6b');fit((c.line?'x':'r')+' = '+plain(r)+' m',fx,ys+18,'#d1e3ed',10,90,'center');}}
  if(g.guess){
    if(c.ask==='distance'){const gx=X(Math.min(model.answer,c.view));line([{x:gx,y:top},{x:gx,y:ys+4}],'#efb958',2,[5,3]);fit(text('guessTag'),gx+4,top+14,'#efb958',9,120);}
    else{const h=c.ask==='energy'?c.A1/Math.sqrt(model.answer):model.answer/100,yy=Y(Math.min(h,.1));line([{x:X(c.r2)-34,y:yy},{x:X(c.r2)+34,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),X(c.r2),yy-6,'#efb958',9,110,'center');}
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('heightGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+14,px1=width-14,py0=70,py1=height-62,peak=Math.max(model.amp(RipplesModel.start),c.A1*1.2),PX=r=>px0+r/c.view*(px1-px0),PY=a=>py1-Math.min(a,peak)/peak*(py1-py0),reach=Math.min(model.front(g.t),c.view);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(c.E){const ref=[];for(let i=0;i<=200;i++){const r=RipplesModel.start+(reach-RipplesModel.start)*i/200;ref.push({x:PX(r),y:PY(model.amp(r,true))});}line(ref,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=200;i++){const r=RipplesModel.start+(reach-RipplesModel.start)*i/200;pts.push({x:PX(r),y:PY(model.amp(r))});}line(pts,'#77b9ff',2);
  for(const r of floats(c))if(reach>=r){dot(PX(r),PY(model.amp(r)),4,'#ff7b6b');label(number(model.amp(r)*100,1)+' cm',PX(r)+6,PY(model.amp(r))-6,'#d1e3ed','left',9);}
  if(g.guess){
    if(c.ask==='distance'){const gx=PX(Math.min(model.answer,c.view));line([{x:gx,y:py0},{x:gx,y:py1}],'#efb958',1.5,[5,3]);}
    else{const h=c.ask==='energy'?c.A1/Math.sqrt(model.answer):model.answer/100;dot(PX(c.r2),PY(h),4,'#efb958');}
  }
  fit(text('distanceAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
