module.exports = {
kind:'springshop',model:'SpringShopModel',title:'Spring Shop',symbol:'x =',unit:'cm',equation:'k = k₁ + k₂',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','graphLegend'],['white','springLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['stretch-value','stretchMetric','cm','x'],['force-value','forceMetric','N','F = k·x','vector'],['stiffness-value','stiffnessMetric','N/m','k'],['period-value','periodMetric','s','T = 2π·√(m ÷ k)','vector']],
modelCode:String.raw`
class SpringShopModel {
  // Springs combined. Side by side (parallel) they stretch together and share the load, so their stiffnesses add:
  // k = k₁ + k₂. End to end (series) each carries the whole load and the stretches add: 1/k = 1/k₁ + 1/k₂. A spring cut in
  // half stretches half as much under the same load, so each half is twice as stiff. A load is lowered gently over 2 s to
  // its rest position, where k·x = m·g; the bounce runs for 2 s from 3 cm below rest, with T = 2π·√(m ÷ k).
  static g = 9.8;
  static tolerance = .02;
  static run = 2;
  static natural = .18; // m, each spring before it stretches (for the drawing)
  static missions = [
    {key:'parallel',ask:'stretch',springs:[100,100],mode:'parallel',m:2},
    {key:'series',ask:'stretch',springs:[100,100],mode:'series',m:2},
    {key:'cut',ask:'stiffness',k0:120,pieces:2,m:1},
    {key:'mixed',ask:'stiffness',springs:[100,300],mode:'series',m:1},
    {key:'bounce',ask:'period',springs:[50,50],mode:'parallel',m:.5,A:.03}
  ];
  static units = {stretch:'cm',stiffness:'N/m',period:'s'};
  static limits = {stretch:1e4,stiffness:1e6,period:1e3};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SpringShopModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SpringShopModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The spring in play: the half of the cut spring, or the pair combined side by side or end to end.
  stiffness(){const c=this.config;if(c.k0)return c.k0*c.pieces;return c.mode==='parallel'?c.springs[0]+c.springs[1]:1/(1/c.springs[0]+1/c.springs[1]);}
  weight(){return this.config.m*SpringShopModel.g;}
  rest(){return this.weight()/this.stiffness();}
  bouncing(){return this.config.ask==='period';}
  omega(){return Math.sqrt(this.stiffness()/this.config.m);}
  period(){return 2*Math.PI/this.omega();}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  lowered(t){return (1-Math.cos(Math.PI*this.clamp(t)/SpringShopModel.run))/2;}
  // Total stretch below the unloaded hook (m), and its rate.
  stretch(t){return this.bouncing()?this.rest()+this.config.A*Math.cos(this.omega()*this.clamp(t)):this.rest()*this.lowered(t);}
  velocity(t){const s=this.clamp(t);return this.bouncing()?-this.config.A*this.omega()*Math.sin(this.omega()*s):this.rest()*Math.PI/(2*SpringShopModel.run)*Math.sin(Math.PI*s/SpringShopModel.run);}
  force(t){return this.stiffness()*this.stretch(t);}
  // Each spring's own stretch: equal side by side, shared in proportion to 1/k end to end; the whole spring beside the cut half.
  parts(t){
    const c=this.config,x=this.stretch(t);
    if(c.k0)return [this.weight()/c.k0*this.lowered(t),x];
    if(c.mode==='parallel')return [x,x];
    const k=this.stiffness();return c.springs.map(ki=>x*k/ki);
  }
  duration(){return SpringShopModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 2 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='stretch')return this.rest()*100;if(c.ask==='stiffness')return this.stiffness();return this.period();}
  unit(){return SpringShopModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),W=this.weight(),tol=SpringShopModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const [k1,k2]=c.springs??[],sum=k1+k2,ser=1/(1/k1+1/k2);
      if(c.key==='parallel'){if(near(a,W/k1*100))slip='oneSpring';else if(near(a,W/ser*100))slip='seriesInstead';else if(near(a,e/100))slip='unitsM';}
      else if(c.key==='series'){if(near(a,W/sum*100))slip='addedK';else if(near(a,W/k1*100))slip='oneOfTwo';else if(near(a,e/100))slip='unitsM';}
      else if(c.key==='cut'){if(near(a,c.k0/c.pieces))slip='halved';else if(near(a,c.k0))slip='same';}
      else if(c.key==='mixed'){if(near(a,sum))slip='addedK';else if(near(a,sum/2))slip='average';}
      else{if(near(a,2*Math.PI*Math.sqrt(c.m/k1)))slip='singleSpring';else if(near(a,2*Math.PI*Math.sqrt(c.m/ser)))slip='seriesInstead';else if(near(a,Math.sqrt(c.m/sum)))slip='noTwoPi';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SpringShopModel.missions[saved.index])return false;
    const probe=new SpringShopModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={stretch:'x =',stiffness:'k =',period:'T ='};
// Givens: the two springs (or the spring to cut) and the load.
function given(m){
  if(m.k0)return 'k = '+plain(m.k0)+' N/m · ½';
  const [a,b]=m.springs,ks=a===b?'k₁ = k₂ = '+plain(a)+' N/m':'k₁ = '+plain(a)+' N/m · k₂ = '+plain(b)+' N/m';
  return m.ask==='stiffness'?ks:ks+' · m = '+plain(m.m)+' kg';
}
const cm=x=>number(x*100,1);
function equation(){
  const c=model.config,k=model.stiffness();
  if(c.key==='parallel')return 'k = k₁ + k₂ = '+plain(c.springs[0])+' + '+plain(c.springs[1])+' = '+plain(k)+' N/m · x = m·g ÷ k = '+cm(model.rest())+' cm';
  if(c.key==='series')return '1/k = 1/'+plain(c.springs[0])+' + 1/'+plain(c.springs[1])+' → k = '+number(k,1)+' N/m · x = m·g ÷ k = '+cm(model.rest())+' cm';
  if(c.key==='cut')return 'k_½ = 2·k = 2 × '+plain(c.k0)+' = '+plain(k)+' N/m';
  if(c.key==='mixed')return '1/k = 1/'+plain(c.springs[0])+' + 1/'+plain(c.springs[1])+' → k = '+number(k,1)+' N/m';
  return 'k = '+plain(c.springs[0])+' + '+plain(c.springs[1])+' = '+plain(k)+' N/m · T = 2π·√(m ÷ k) = '+number(model.period(),3)+' s';
}
function baseEquation(){return {parallel:'k = k₁ + k₂',series:'1/k = 1/k₁ + 1/k₂',cut:'k ∝ 1 ÷ L',mixed:'1/k = 1/k₁ + 1/k₂',bounce:'T = 2π·√(m ÷ k)'}[model.config.key];}
function metrics(t,begun){
  $('stretch-value').textContent=begun?cm(model.stretch(t)):'—';$('force-value').textContent=begun?number(model.force(t),1):'—';
  $('stiffness-value').textContent=begun?number(model.stiffness(),1):'—';$('period-value').textContent=begun?number(model.period(),3):'—';
}
function values(){
  const c=model.config,[p1,p2]=model.parts(model.duration()),k=model.stiffness();
  return {x:cm(model.rest()),x1:cm(c.k0?p2:p1),x2:cm(p2),x0:cm(p1),k:number(k,1),F:number(model.weight(),1),F2:number(model.weight()/2,1),T:number(model.period(),3)};
}
function runningCopy(t){return model.bouncing()?text('bouncingCopy',{y:number((model.stretch(t)-model.rest())*100,1),v:number(Math.abs(model.velocity(t)))}):text('loweringCopy',{x:cm(model.stretch(t)),F:number(model.force(t),1)});}
// A zigzag spring between two heights.
function coil(line,x,y0,y1,color,w=10,n=12){const pts=[{x,y:y0}];for(let i=1;i<n;i++)pts.push({x:x+(i%2?w:-w),y:y0+6+(y1-y0-12)*i/n});pts.push({x,y:y1-6},{x,y:y1});line(pts,color,2);}
function scene(g){
  const c=g.c,{line,fit,box,label}=g,top=52,N=SpringShopModel.natural,kp=Math.max(120,(height-top-56)/1)*1,s=g.ready?g.t:0;
  const k=Math.min(kp,(height-top-50)/(2*N+.5)),Y=m=>top+m*k,bw=Math.min(54,g.area*.13),bh=Math.max(16,.07*k);
  const [p1,p2]=g.ready?model.parts(s):model.bouncing()?model.parts(0):[0,0],hold=c.k0?N/2:c.mode==='series'?2*N:N,cx=c.k0?g.area*.62:g.area*.5;
  box(cx-90,top-10,180,10,'#22384a');line([{x:cx-90,y:top},{x:cx+90,y:top}],'#8aa3b5',2);
  const block=(x,y,tag)=>{box(x-bw/2,y,bw,bh,'#8f9daa');line([{x:x-bw/2,y},{x:x+bw/2,y},{x:x+bw/2,y:y+bh},{x:x-bw/2,y:y+bh},{x:x-bw/2,y}],'#f2f8fc',1.5);fit(tag,x,y+bh/2+4,'#0f2233',11,bw-4,'center');};
  const hook0=Y(hold);let yb;
  if(c.k0){
    const xr=g.area*.3;box(xr-60,top-10,120,10,'#22384a');const yw=Y(N+p1);coil(line,xr,top,yw,'#9fb6c7');block(xr,yw,plain(c.m)+' kg');fit('k = '+plain(c.k0)+' N/m',xr,yw+bh+16,'#9fb6c7',10,g.area*.25,'center');
    yb=Y(N/2+p2);coil(line,cx,top,yb,'#f2f8fc',10,6);block(cx,yb,plain(c.m)+' kg');fit('½ · k = '+(g.begun?plain(model.stiffness())+' N/m':'?'),cx,yb+bh+16,'#d1e3ed',10,g.area*.3,'center');
  }else if(c.mode==='parallel'){
    yb=Y(N+p1);coil(line,cx-22,top,yb,'#f2f8fc',8);coil(line,cx+22,top,yb,'#f2f8fc',8);line([{x:cx-34,y:yb},{x:cx+34,y:yb}],'#d1e3ed',3);block(cx,yb,plain(c.m)+' kg');
    fit(plain(c.springs[0])+' N/m',cx-40,top+N*k*.5,'#9fb6c7',10,g.area*.3,'right');fit(plain(c.springs[1])+' N/m',cx+40,top+N*k*.5,'#9fb6c7',10,g.area*.3);
  }else{
    const ym=Y(N+p1);yb=Y(2*N+p1+p2);coil(line,cx,top,ym,'#f2f8fc',c.springs[0]===c.springs[1]?10:12);g.dot(cx,ym,4,'#d1e3ed');coil(line,cx,ym,yb,c.springs[0]===c.springs[1]?'#f2f8fc':'#d9c38a',c.springs[0]===c.springs[1]?10:6,c.springs[0]===c.springs[1]?12:16);block(cx,yb,plain(c.m)+' kg');
    fit(plain(c.springs[0])+' N/m',cx+18,(top+ym)/2,'#9fb6c7',10,g.area-cx-24);fit(plain(c.springs[1])+' N/m',cx+18,(ym+yb)/2,'#9fb6c7',10,g.area-cx-24);
  }
  // The ruler from the unloaded hook, the rest position, and your prediction.
  const rx=cx-bw-34;
  if(g.option){line([{x:rx,y:hook0},{x:rx,y:Y(hold+.45)}],'#8aa3b5',1);for(let q=0;q<=45;q+=5){const yy=Y(hold+q/100);line([{x:rx-(q%10?4:8),y:yy},{x:rx,y:yy}],'#8aa3b5',1);if(q%10===0)label(plain(q)+' cm',rx-12,yy+4,'#9fb6c7','right',9);}}
  if(g.begun){const yr=Y(hold+model.rest());line([{x:cx-bw,y:yr},{x:cx+bw,y:yr}],'#9fb6c7',1.5,[5,4]);}
  const gx=c.ask==='stretch'?g.ready&&model.answer/100:c.ask==='stiffness'&&g.ready?model.weight()/model.answer:null;
  if(g.guess&&gx!==null&&gx!==false){const yy=Y(hold+Math.min(gx,.45));line([{x:cx-bw-8,y:yy},{x:cx+bw+8,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag')+(gx>.45?' ↓':''),cx+bw+12,yy+4,'#efb958',9,g.area-cx-bw-16);}
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g,bounce=model.bouncing();
  fit(text(bounce?'graphTitle':'lowerTitle'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,PX=q=>px0+q/D*(px1-px0),upto=Math.min(g.t,D);
  const ref=c.k0?model.weight()/c.k0:0,gx=g.guess&&c.ask!=='period'?(c.ask==='stretch'?model.answer/100:model.weight()/model.answer):0;
  const span=bounce?c.A*1.3:Math.max(model.rest(),ref,Math.min(gx,1))*1.15,PY=v=>bounce?(py0+py1)/2+v/span*(py1-py0)/2:py0+Math.min(v,span)/span*(py1-py0);
  line([{x:px0,y:bounce?(py0+py1)/2:py0},{x:px1,y:bounce?(py0+py1)/2:py0}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  if(ref){const r=[];for(let i=0;i<=120;i++){const q=upto*i/120;r.push({x:PX(q),y:PY(model.parts(q)[0])});}line(r,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=160;i++){const q=upto*i/160;pts.push({x:PX(q),y:PY(bounce?model.stretch(q)-model.rest():model.stretch(q))});}line(pts,'#77b9ff',2);
  if(gx){const yy=PY(gx);line([{x:px0,y:yy},{x:px1,y:yy}],'#efb958',1.5,[5,3]);fit(text('guessTag'),px1,yy-4,'#efb958',9,px1-px0,'right');}
  if(bounce&&g.guess&&model.answer>=.05)for(let q=model.answer;q<=D+1e-9;q+=model.answer)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.2,[5,4]);
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
