module.exports = {
kind:'quake',model:'QuakeModel',title:'Earthquake P and S',symbol:'d =',unit:'km',equation:'d = Δt ÷ (1/v_S − 1/v_P)',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','pLegend'],['white','sLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['distance-value','distanceMetric','km','d','vector'],['pspeed-value','pSpeedMetric','km/s','v_P','vector'],['sspeed-value','sSpeedMetric','km/s','v_S','vector'],['arrival-value','arrivalMetric','','n']],
modelCode:String.raw`
class QuakeModel {
  // An earthquake sends two waves through the rock. The P wave is longitudinal: rock is squeezed and stretched along the
  // way the wave goes. The S wave is transverse: rock is shaken across it, and it is slower. A station a distance d away
  // feels the P wave at d ÷ v_P and the S wave at d ÷ v_S; the gap between them gives the distance. Each wave is a burst
  // 3 s long. A run ends 4 s after the S wave reaches the station, sped up so that it takes 5 s.
  static tolerance = .02;
  static burst = 3;
  static missions = [
    {key:'distance',ask:'distance',d:84,vP:6,vS:3.5},
    {key:'pTime',ask:'pTime',d:120,vP:6,vS:3.5},
    {key:'gap',ask:'gap',d:210,vP:6,vS:3.5},
    {key:'shake',ask:'shake',d:84,vP:6,vS:3.5},
    {key:'sSpeed',ask:'sSpeed',d:140,vP:7,vS:4}
  ].map(m=>({...m,pace:(m.d/m.vS+4)/5}));
  static units = {distance:'km',pTime:'s',gap:'s',shake:'°',sSpeed:'km/s'};
  static limits = {distance:1e5,pTime:1e5,gap:1e5,shake:360,sSpeed:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=QuakeModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // An angle may be 0; every other answer is positive.
  valid(value){const a=this.config.ask;return Number.isFinite(value)&&(a==='shake'?value>=0:value>0)&&value<=QuakeModel.limits[a];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  pTime(){return this.config.d/this.config.vP;}
  sTime(){return this.config.d/this.config.vS;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // A burst: one shake a second inside a smooth envelope, 0 outside it. s is the time since the front passed.
  static burstShape(s){const B=QuakeModel.burst;return s>0&&s<B?Math.sin(Math.PI*s/B)*Math.sin(2*Math.PI*s):0;}
  // Rock at distance x (km): moved along the path by the P wave (strength 0.4) and across it by the S wave (strength 1).
  along(x,t){return .4*QuakeModel.burstShape(this.clamp(t)-x/this.config.vP);}
  across(x,t){return QuakeModel.burstShape(this.clamp(t)-x/this.config.vS);}
  arrived(t){const s=this.clamp(t)+1e-9;return (s>=this.pTime()?1:0)+(s>=this.sTime()?1:0);}
  duration(){return this.sTime()+4;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly 4 s after the S wave arrives.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='pTime')return this.pTime();if(c.ask==='gap')return this.sTime()-this.pTime();if(c.ask==='shake')return 90;if(c.ask==='sSpeed')return c.vS;return c.d;}
  unit(){return QuakeModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=QuakeModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const gap=this.sTime()-this.pTime();
      if(c.ask==='distance'){if(near(a,gap*c.vP))slip='pOnly';else if(near(a,gap*c.vS))slip='sOnly';else if(near(a,gap*(c.vP-c.vS)))slip='difference';}
      else if(c.ask==='pTime'){if(near(a,this.sTime()))slip='sTime';else if(near(a,c.d*c.vP))slip='multiplied';else if(near(a,c.vP/c.d))slip='inverted';}
      else if(c.ask==='gap'){if(near(a,this.sTime()))slip='sArrival';else if(near(a,this.pTime()))slip='pArrival';else if(near(a,this.sTime()+this.pTime()))slip='added';}
      else if(c.ask==='shake'){if(a<=.5||near(a,180))slip='pLike';}
      else{if(near(a,c.d/gap))slip='gapOnly';else if(near(a,c.vP))slip='pSpeed';else if(near(a,c.d/(this.pTime()-gap)))slip='subtracted';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!QuakeModel.missions[saved.index])return false;
    const probe=new QuakeModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={distance:'d =',pTime:'t_P =',gap:'Δt =',shake:'θ =',sSpeed:'v_S ='};
// Givens: the gap and both speeds, a distance and a speed, or a station's two arrival times.
function given(m){
  if(m.ask==='distance')return 'Δt = '+plain(m.d/m.vS-m.d/m.vP)+' s · P '+plain(m.vP)+' · S '+plain(m.vS)+' km/s';
  if(m.ask==='pTime')return 'd = '+plain(m.d)+' km · v_P = '+plain(m.vP)+' km/s';
  if(m.ask==='sSpeed')return 'd = '+plain(m.d)+' km · '+plain(m.d/m.vP)+' s + '+plain(m.d/m.vS-m.d/m.vP)+' s';
  if(m.ask==='shake')return 'S · v_S = '+plain(m.vS)+' km/s';
  return 'd = '+plain(m.d)+' km · P '+plain(m.vP)+' · S '+plain(m.vS)+' km/s';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='pTime')return 't_P = d ÷ v_P = '+plain(c.d)+' ÷ '+plain(c.vP)+' = '+number(e,1)+' s';
  if(c.ask==='gap')return 'Δt = '+plain(c.d)+' ÷ '+plain(c.vS)+' − '+plain(c.d)+' ÷ '+plain(c.vP)+' = '+number(e,1)+' s';
  if(c.ask==='shake')return 'θ_S = 90° · θ_P = 0°';
  if(c.ask==='sSpeed')return 'v_S = d ÷ t_S = '+plain(c.d)+' ÷ '+plain(model.sTime())+' = '+number(e)+' km/s';
  return 'd = '+plain(model.sTime()-model.pTime())+' ÷ (1/'+plain(c.vS)+' − 1/'+plain(c.vP)+') = '+number(e,1)+' km';
}
function baseEquation(){const a=model.config.ask;return a==='pTime'?'t = d ÷ v':a==='gap'?'Δt = d ÷ v_S − d ÷ v_P':a==='shake'?'θ = ?':a==='sSpeed'?'v_S = d ÷ t_S':'d = Δt ÷ (1/v_S − 1/v_P)';}
function metrics(t,begun){
  const c=model.config;
  $('distance-value').textContent=begun?number(c.d,0):'—';$('pspeed-value').textContent=begun?number(c.vP,1):'—';
  $('sspeed-value').textContent=begun?number(c.vS,1):'—';$('arrival-value').textContent=begun?plain(model.arrived(t)):'—';
}
function values(){const c=model.config;return {d:plain(c.d),t:plain(model.pTime()),g:plain(model.sTime()-model.pTime()),v:plain(c.vS)};}
function runningCopy(t){const c=model.config,s=model.clamp(t);return text('quakeCopy',{p:number(Math.min(c.vP*s,c.d*1.25),0),s:number(Math.min(c.vS*s,c.d*1.25),0)});}
// The arrival times (s) your answer stands for.
function guessTimes(){const c=model.config,a=model.answer;if(c.ask==='distance')return [a/c.vP,a/c.vS];if(c.ask==='pTime')return [a];if(c.ask==='gap')return [model.pTime()+a];if(c.ask==='sSpeed')return [c.d/a];return [];}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=36,x1=g.area-24,view=c.d*1.25,kp=(x1-x0)/view,X=x=>x0+x*kp,ys=136,yb=height-84;
  // A cross-section of the crust: the quake at the left, a station on the surface d away, and the two fronts spreading out.
  box(16,ys,g.area-32,yb-ys,'#2b2a33');line([{x:16,y:ys},{x:g.area-16,y:ys}],'#9fb6c7',2);
  ctx.save();ctx.beginPath();ctx.rect(16,ys,g.area-32,yb-ys);ctx.clip();
  if(g.begun){for(const [v,colour] of [[c.vP,'#77b9ff'],[c.vS,'#f2f8fc']]){const r=v*model.clamp(s)*kp;if(r>0){ctx.strokeStyle=colour;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(X(0),ys,r,0,Math.PI);ctx.stroke();}}}
  ctx.restore();
  dot(X(0),ys+4,6,'#efb958');label(text('focusTag'),X(0),ys+24,'#d1e3ed','center',9);
  // A row of rock grains under the surface: pushed along by P, shaken across by S (enlarged).
  const gy=ys+(yb-ys)*.45;for(let i=0;i<=40;i++){const x=view*i/40;if(x<.5)continue;const a=g.begun?model.along(x,s):0,b=g.begun?model.across(x,s):0;dot(X(x)+a*14,gy-b*14,2.5,'#c9b79c');}
  // The station: a seismometer on the surface.
  const sx=X(c.d);line([{x:sx-9,y:ys},{x:sx,y:ys-16},{x:sx+9,y:ys},{x:sx-9,y:ys}],'#f2f8fc',2);label(text('stationTag'),sx,ys-22,'#d1e3ed','center',9);
  if(c.ask!=='distance'||g.begun)label('d = '+plain(c.d)+' km',(X(0)+sx)/2,ys-8,'#9fb6c7','center',10);
  if(c.ask==='distance'&&g.guess){const gx=X(model.answer);if(model.answer<=view){line([{x:gx-8,y:ys},{x:gx,y:ys-14},{x:gx+8,y:ys},{x:gx-8,y:ys}],'#efb958',2);fit(text('guessTag'),gx,ys-34,'#efb958',9,120,'center');}}
  // The ground at the station, seen from above: P moves it along the path (→), S across it.
  const bx=x0+34,by=60,bw=64;box(bx,by,bw,bw-8,'#1d3b52');const cx=bx+bw/2,cy=by+(bw-8)/2,k=26;
  line([{x:bx+6,y:cy},{x:bx+bw-6,y:cy}],'#8aa3b5',1);line([{x:bx+bw-14,y:cy-4},{x:bx+bw-6,y:cy},{x:bx+bw-14,y:cy+4}],'#8aa3b5',1);
  if(c.ask==='shake'&&g.guess){const a=model.answer*Math.PI/180;line([{x:cx-30*Math.cos(a),y:cy+30*Math.sin(a)},{x:cx+30*Math.cos(a),y:cy-30*Math.sin(a)}],'#efb958',1.5,[4,3]);}
  if(g.begun){const pts=[];for(let i=0;i<=240;i++){const q=model.clamp(s)*i/240;pts.push({x:cx+model.along(c.d,q)*k,y:cy-model.across(c.d,q)*k});}line(pts,'#f2f8fc',1.5);}
  fit(text('motionTag'),bx+bw+8,by+(bw-8)/2+3,'#9fb6c7',9,Math.max(60,(X(0)+sx)/2-bx-bw-20));
  if(g.option){const ry=height-58,step=[10,20,25,50,100].find(v=>view/v<=7);line([{x:X(0),y:ry},{x:X(view),y:ry}],'#8aa3b5',1);for(let k2=0;k2<=view+1e-9;k2+=step){line([{x:X(k2),y:ry},{x:X(k2),y:ry+6}],'#9fb6c7',1);label(plain(k2)+' km',X(k2),ry+18,'#9fb6c7','center',9);}}
  fit(text('fastTag',{n:plain(Math.round(c.pace*10)/10)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t,1)+' s',g.area-110,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('seismoGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=80,py1=height-80,ym=(py0+py1)/2,PX=q=>px0+q/D*(px1-px0),PY=u=>ym-u*(py1-py0)*.4,upto=Math.min(g.t,D);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);
  const step=D>50?10:5;for(let q=0;q<=D;q+=step){line([{x:PX(q),y:py1},{x:PX(q),y:py1+4}],'#9fb6c7',1);label(plain(q),PX(q),py1+14,'#9fb6c7','center',8);}
  if(g.guess)for(const q of guessTimes())if(q<=D+1e-9)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.5,[5,4]);
  const pts=[];for(let i=0;i<=600;i++){const q=upto*i/600;pts.push({x:PX(q),y:PY(model.along(c.d,q)+model.across(c.d,q))});}line(pts,'#f2f8fc',1.5);
  if(upto>=model.pTime())label('P',PX(model.pTime()),py0+12,'#77b9ff','center',11);
  if(upto>=model.sTime())label('S',PX(model.sTime()),py0+12,'#f2f8fc','center',11);
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
