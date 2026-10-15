module.exports = {
kind:'spear',model:'SpearModel',title:'Spearfishing',symbol:'d =',unit:'m',equation:'n = d ÷ d_seen',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','airRayLegend'],['white','waterRayLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['index-value','indexMetric','','n'],['air-value','airAngleMetric','°','θ₁'],['water-value','waterAngleMetric','°','θ₂'],['light-value','lightSpeedMetric','10⁸ m/s','c ÷ n','vector']],
modelCode:String.raw`
class SpearModel {
  // Refraction of light. Light is slower in water (refractive index n = 1.33), so a ray crossing the surface bends:
  // n₁·sin θ₁ = n₂·sin θ₂, with angles measured from the normal, the line straight up from the surface. Seen from almost
  // straight above, a fish looks n times shallower than it is. Going from water to air, beyond the critical angle
  // sin θ_c = 1 ÷ n the light can't get out and reflects back. A run draws the light's path over 3 s, paced to 4 s.
  static tolerance = .02;
  static missions = [
    {key:'depth',ask:'depth',n:1.33,seen:1},
    {key:'angle',ask:'angle',n:1.33,air:45},
    {key:'aim',ask:'aim',n:1.33,seen:.9},
    {key:'index',ask:'index',n:Math.sin(60*Math.PI/180)/Math.sin(35*Math.PI/180),air:60},
    {key:'critical',ask:'critical',n:1.33}
  ].map(m=>({...m,pace:.75}));
  static units = {depth:'m',angle:'°',aim:'m',index:'',critical:'°'};
  static limits = {depth:100,angle:90,aim:100,index:10,critical:90};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SpearModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SpearModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  static deg = Math.PI/180;
  // Angles (degrees) in air and in water for the drawn ray. Depth tests look down at 15° in the water; the critical test
  // sweeps the angle in the water from 0 to 80° over the run.
  waterAngle(t){const c=this.config;if(c.air)return Math.asin(Math.sin(c.air*SpearModel.deg)/c.n)/SpearModel.deg;if(c.ask==='critical')return 80*this.clamp(t)/this.duration();return 15;}
  airAngle(t){const s=this.config.n*Math.sin(this.waterAngle(t)*SpearModel.deg);return s<1?Math.asin(s)/SpearModel.deg:null;}
  criticalAngle(){return Math.asin(1/this.config.n)/SpearModel.deg;}
  realDepth(){const c=this.config;return c.seen?c.n*c.seen:1;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  progress(t){return this.clamp(t)/this.duration();}
  duration(){return 3;}
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
  exact(){const c=this.config;if(c.ask==='angle')return this.waterAngle(0);if(c.ask==='aim')return (c.n-1)*c.seen;if(c.ask==='index')return c.n;if(c.ask==='critical')return this.criticalAngle();return c.n*c.seen;}
  unit(){return SpearModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=SpearModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12,d=SpearModel.deg;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='depth'){if(near(a,c.seen/c.n))slip='inverted';else if(near(a,c.seen))slip='unchanged';}
      else if(c.ask==='angle'){const s=Math.sin(c.air*d)*c.n;if(near(a,c.air/c.n))slip='linearAngle';else if(s<1&&near(a,Math.asin(s)/d))slip='invertedAngle';else if(near(a,c.air))slip='unchangedAngle';}
      else if(c.ask==='aim'){if(near(a,c.n*c.seen))slip='realDepth';else if(near(a,c.seen-c.seen/c.n))slip='invertedGap';else if(near(a,c.seen))slip='apparentOnly';}
      else if(c.ask==='index'){if(near(a,60/35))slip='linearN';else if(near(a,1/c.n))slip='invertedN';}
      else{if(near(a,90-e))slip='complementCritical';else if(near(a,1/c.n))slip='sineOnly';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SpearModel.missions[saved.index])return false;
    const probe=new SpearModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={depth:'d =',angle:'θ₂ =',aim:'Δd =',index:'n =',critical:'θ_c ='};
// Givens: how deep the fish looks, the angle in air, two angles, or the index of water.
function given(m){
  if(m.ask==='angle')return 'θ₁ = '+plain(m.air)+'° · n = '+plain(m.n);
  if(m.ask==='index')return '60° → 35°';
  if(m.ask==='critical')return 'n = '+plain(m.n);
  return 'd_seen = '+plain(m.seen)+' m · n = '+plain(m.n);
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='angle')return 'sin θ₂ = sin '+plain(c.air)+'° ÷ '+plain(c.n)+' → θ₂ = '+number(e,1)+'°';
  if(c.ask==='aim')return 'Δd = '+plain(c.n-1)+' × '+plain(c.seen)+' = '+number(e)+' m';
  if(c.ask==='index')return 'n = sin 60° ÷ sin 35° = '+number(e);
  if(c.ask==='critical')return 'sin θ_c = 1 ÷ '+plain(c.n)+' → θ_c = '+number(e,1)+'°';
  return 'd = n·d_seen = '+plain(c.n)+' × '+plain(c.seen)+' = '+number(e)+' m';
}
function baseEquation(){const a=model.config.ask;return a==='angle'||a==='index'?'n₁·sin θ₁ = n₂·sin θ₂':a==='critical'?'sin θ_c = 1 ÷ n':a==='aim'?'Δd = (n − 1)·d_seen':'n = d ÷ d_seen';}
function metrics(t,begun){
  const c=model.config,a=model.airAngle(t);
  $('index-value').textContent=begun?number(c.n):'—';$('air-value').textContent=begun&&a!==null?number(a,1):'—';
  $('water-value').textContent=begun?number(model.waterAngle(t),1):'—';$('light-value').textContent=begun?number(3/c.n):'—';
}
function values(){const c=model.config;return {d:number(model.realDepth()),w:number(model.waterAngle(0),1),g:number((c.n-1)*(c.seen||0)),n:number(c.n),c:number(model.criticalAngle(),1)};}
function runningCopy(t){return text('rayCopy',{w:number(model.waterAngle(t),1)});}
// The angle in the water (degrees) your answer stands for, when it is one.
function guessWater(){const c=model.config,a=model.answer;if(c.ask==='angle'||c.ask==='critical')return a;if(c.ask==='index'){const s=Math.sin(60*SpearModel.deg)/a;return s<1?Math.asin(s)/SpearModel.deg:null;}return null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,d=SpearModel.deg,ys=height*.42,yb=height-84,k=Math.min((g.area-40)/3.2,(yb-ys)/1.6),cx=g.area*.48,X=x=>cx+x*k,Y=y=>ys-y*k;
  // A side view: air above, water (or a tank of liquid) below, the normal dashed at the point where the light crosses.
  box(16,56,g.area-32,ys-56,'#1d3b52');box(16,ys,g.area-32,yb-ys,'#173a50');line([{x:16,y:ys},{x:g.area-16,y:ys}],'#77b9ff',2);
  label(text('airTag'),24,ys-8,'#d1e3ed','left',9);label(text(c.ask==='index'?'liquidTag':'waterTag'),24,ys+16,'#d1e3ed','left',9);
  const fish=(x,y,colour,dash)=>{ctx.save();ctx.strokeStyle=colour;ctx.lineWidth=2;if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.ellipse(X(x),Y(y),16,7,0,0,2*Math.PI);ctx.stroke();ctx.beginPath();ctx.moveTo(X(x)+16,Y(y));ctx.lineTo(X(x)+26,Y(y)-7);ctx.lineTo(X(x)+26,Y(y)+7);ctx.closePath();ctx.stroke();ctx.restore();};
  const p=model.progress(s),pathDraw=(pts,cols)=>{let L=0;const seg=[];for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);L+=l;}let left=p*L;
    for(let i=1;i<pts.length&&left>0;i++){const f=Math.min(1,left/seg[i-1]);line([{x:X(pts[i-1][0]),y:Y(pts[i-1][1])},{x:X(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f),y:Y(pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f)}],cols[i-1],2.5);left-=seg[i-1];}};
  if(c.ask==='depth'||c.ask==='aim'){
    // The fish is deeper than it looks: light from it bends away from the normal as it leaves the water.
    const D=model.realDepth(),w=model.waterAngle(0)*d,a=model.airAngle(0)*d,sx=D*Math.tan(w),E=[sx+.9*Math.tan(a),.9],seenD=sx/Math.tan(a);
    line([{x:X(sx),y:Y(.8)},{x:X(sx),y:Y(-.6)}],'#8aa3b5',1,[3,4]);fish(0,-D,'#c9b79c');label(text('fishTag'),X(0)-22,Y(-D)+4,'#c9b79c','right',9);dot(X(E[0]),Y(E[1]),6,'#d9cfb8');label(text('eyeTag'),X(E[0])+10,Y(E[1])+4,'#d1e3ed','left',9);
    if(g.begun){pathDraw([[0,-D],[sx,0],E],['#f2f8fc','#77b9ff']);if(p>=1){line([{x:X(sx),y:Y(0)},{x:X(0),y:Y(-seenD)}],'#9fb6c7',1.2,[4,4]);fish(0,-seenD,'#9fb6c7',[4,3]);label(text('imageTag'),X(0)+32,Y(-seenD)+4,'#9fb6c7','left',9);}}
    if(g.option){const rx=X(-1.2);line([{x:rx,y:Y(0)},{x:rx,y:Y(-1.5)}],'#8aa3b5',1);for(let m=0;m<=1.5+1e-9;m+=.5){line([{x:rx,y:Y(-m)},{x:rx+6,y:Y(-m)}],'#9fb6c7',1);label(plain(m)+' m',rx-4,Y(-m)+3,'#9fb6c7','right',9);}}
    if(g.guess){const gd=c.ask==='depth'?model.answer:c.seen+model.answer;if(gd<=1.6){fish(0,-gd,'#efb958',[5,3]);fit(text('guessTag'),X(0)+32,Y(-gd)+14,'#efb958',9,120);}}
  }else{
    // A light ray crossing the surface: from a laser into the liquid, or from a lamp underwater up to the surface.
    line([{x:X(0),y:Y(.8)},{x:X(0),y:Y(-.8)}],'#8aa3b5',1,[3,4]);label(text('normalTag'),X(0)+4,Y(.8)+10,'#9fb6c7','left',9);
    if(c.ask==='critical'){const lx=-1.3,ly=-.5;ctx.save();ctx.beginPath();ctx.rect(16,56,g.area-32,yb-56);ctx.clip();dot(X(lx),Y(ly),6,'#efb958');label(text('lampTag'),X(lx)+10,Y(ly)+14,'#d1e3ed','left',9);
      if(g.begun){const w=model.waterAngle(s)*d,a=model.airAngle(s),hx=lx-ly*Math.tan(w);line([{x:X(lx),y:Y(ly)},{x:X(hx),y:Y(0)}],'#f2f8fc',2.5);
        if(a!==null){const r=a*d;line([{x:X(hx),y:Y(0)},{x:X(hx+.8*Math.sin(r)),y:Y(.8*Math.cos(r))}],'#77b9ff',2.5);}else{line([{x:X(hx),y:Y(0)},{x:X(hx-ly*Math.tan(w)),y:Y(ly)}],'#f2f8fc',1.8,[6,3]);label(text('reflectTag'),X(hx),Y(0)+16,'#f2f8fc','center',9);}}
      const gw=g.guess?guessWater():null;if(gw!==null&&gw<89){const r=gw*d,tx=lx-ly*Math.tan(r);line([{x:X(lx),y:Y(ly)},{x:X(tx),y:Y(0)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(tx)+6,Y(0)-6,'#efb958',9,120);}
      ctx.restore();}
    else{const a=c.air*d,w=model.waterAngle(0)*d,L=[-.8*Math.tan(a),.8];box(X(L[0])-14,Y(L[1])-6,18,12,'#d9cfb8');label(text('laserTag'),X(L[0])-16,Y(L[1])-12,'#d1e3ed','center',9);
      if(g.begun)pathDraw([L,[0,0],[.8*Math.tan(w),-.8]],['#77b9ff','#f2f8fc']);}
    const gw=g.guess&&c.ask!=='critical'?guessWater():null;if(gw!==null&&gw<89){const r=gw*d,from=[0,0],to=[.8*Math.tan(r),-.8];if(Math.abs(to[0])<1.5){line([{x:X(from[0]),y:Y(from[1])},{x:X(to[0]),y:Y(to[1])}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(to[0])+6,Y(to[1])+12,'#efb958',9,120);}}
  }
  fit(text('paceTag',{n:plain(c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('angleGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Close-up where the light crosses the surface: the ray in air and in water, with their angles to the normal.
  const px0=g.area+14,px1=width-14,py0=80,py1=height-80,cx=(px0+px1)/2,cy=(py0+py1)/2,R=Math.min(px1-px0,py1-py0)*.42,d=SpearModel.deg,t=Math.min(g.t,model.duration()),w=model.waterAngle(t),a=model.airAngle(t);
  line([{x:px0,y:cy},{x:px1,y:cy}],'#77b9ff',2);line([{x:cx,y:cy-R-6},{x:cx,y:cy+R+6}],'#8aa3b5',1,[3,4]);
  line([{x:cx,y:cy},{x:cx+R*Math.sin(w*d),y:cy+R*Math.cos(w*d)}],'#f2f8fc',2.5);label(number(w,1)+'°',cx+14,cy+R*.6,'#f2f8fc','left',10);
  if(a!==null){line([{x:cx-R*Math.sin(a*d),y:cy-R*Math.cos(a*d)},{x:cx,y:cy}],'#77b9ff',2.5);label(number(a,1)+'°',cx-14,cy-R*.6,'#77b9ff','right',10);}
  const gw=g.guess?guessWater():null;if(gw!==null&&gw<90)line([{x:cx,y:cy},{x:cx+R*Math.sin(gw*d),y:cy+R*Math.cos(gw*d)}],'#efb958',1.5,[5,4]);
  label(text('airTag'),px0+2,cy-8,'#9fb6c7','left',9);label(text(c.ask==='index'?'liquidTag':'waterTag'),px0+2,cy+16,'#9fb6c7','left',9);
}
`
};
