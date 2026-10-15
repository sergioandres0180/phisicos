module.exports = {
kind:'tsunami',model:'TsunamiModel',title:'Tsunami Race',symbol:'v =',unit:'m/s',equation:'v = √(g·h)',timeUnit:'min',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','seaLegend'],['white','waveLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['depth-value','depthMetric','m','h'],['speed-value','speedMetric','m/s','v','vector'],['kmh-value','kmhMetric','km/h','v','vector'],['distance-value','distanceMetric','km','d','vector']],
modelCode:String.raw`
class TsunamiModel {
  // A tsunami is a wave far longer than the sea is deep, so it moves as a shallow-water wave: v = √(g·h), set only by the
  // depth h. A run follows the wave across a stretch of sea of length d. Time is in minutes and sped up so each run takes 4 s.
  static tolerance = .02;
  static g = 9.8;
  static missions = [
    {key:'speed',ask:'speed',h:4000,d:2e6},
    {key:'kmh',ask:'kmh',h:4000,d:2e6},
    {key:'cross',ask:'cross',h:4000,d:2e6},
    {key:'shallow',ask:'shallow',h:10,d:2000},
    {key:'depth',ask:'depth',h:2500/9.8,d:1e4}
  ].map(m=>({...m,pace:m.d/Math.sqrt(9.8*m.h)/60/4}));
  static units = {speed:'m/s',kmh:'km/h',cross:'h',shallow:'m/s',depth:'m'};
  static limits = {speed:1e6,kmh:1e7,cross:1e5,shallow:1e6,depth:1e7};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=TsunamiModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=TsunamiModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  speed(){return Math.sqrt(TsunamiModel.g*this.config.h);}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The wave's distance (m) from the left edge at time t (min).
  position(t){return this.speed()*this.clamp(t)*60;}
  duration(){return this.config.d/this.speed()/60;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the wave reaches the far side.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,v=this.speed();if(c.ask==='kmh')return 3.6*v;if(c.ask==='cross')return c.d/v/3600;if(c.ask==='depth')return c.h;return v;}
  unit(){return TsunamiModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),v=this.speed(),g=TsunamiModel.g,tol=TsunamiModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='speed'){if(near(a,g*c.h))slip='noRoot';else if(near(a,Math.sqrt(c.h)))slip='noGravity';else if(near(a,Math.sqrt(c.h/g)))slip='divided';}
      else if(c.ask==='kmh'){if(near(a,v))slip='metresPerSecond';else if(near(a,v/3.6))slip='dividedBy36';}
      else if(c.ask==='cross'){if(near(a,c.d/v))slip='seconds';else if(near(a,c.d/v/60))slip='minutes';else if(near(a,3.6*v/(c.d/1000)))slip='invertedTime';}
      else if(c.ask==='shallow'){if(near(a,g*c.h))slip='noRootShallow';else if(near(a,Math.sqrt(c.h)))slip='noGravityShallow';else if(near(a,Math.sqrt(g*4000)*c.h/4000))slip='linear';}
      else{if(near(a,v/g))slip='notSquared';else if(near(a,g*v*v))slip='multiplied';else if(near(a,v*v))slip='squareOnly';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!TsunamiModel.missions[saved.index])return false;
    const probe=new TsunamiModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v =',kmh:'v =',cross:'t =',shallow:'v =',depth:'h ='};
// Givens: the ocean's depth, the distance to cross, the shallow shelf, or a measured speed.
function given(m){
  if(m.ask==='speed')return 'h = '+plain(m.h)+' m · g = '+plain(9.8)+' m/s²';
  if(m.ask==='cross')return 'd = '+plain(m.d/1000)+' km · h = '+plain(m.h)+' m';
  if(m.ask==='shallow')return 'h: 4000 → '+plain(m.h)+' m';
  if(m.ask==='depth')return 'v = '+plain(Math.sqrt(9.8*m.h))+' m/s';
  return 'h = '+plain(m.h)+' m';
}
function equation(){
  const c=model.config,e=model.exact(),v=model.speed();
  if(c.ask==='kmh')return 'v = '+number(v,1)+' m/s × '+plain(3.6)+' = '+number(e,0)+' km/h';
  if(c.ask==='cross')return 't = d ÷ v = '+plain(c.d/1000)+' km ÷ '+number(3.6*v,0)+' km/h = '+number(e)+' h';
  if(c.ask==='depth')return 'h = v² ÷ g = '+plain(v)+'² ÷ '+plain(9.8)+' = '+number(e,0)+' m';
  return 'v = √(g·h) = √('+plain(9.8)+' × '+plain(c.h)+') = '+number(e,1)+' m/s';
}
function baseEquation(){return model.config.ask==='depth'?'h = v² ÷ g':model.config.ask==='cross'?'t = d ÷ v':'v = √(g·h)';}
function metrics(t,begun){
  const c=model.config,v=model.speed();
  $('depth-value').textContent=begun?number(c.h,0):'—';$('speed-value').textContent=begun?number(v,1):'—';
  $('kmh-value').textContent=begun?number(3.6*v,0):'—';$('distance-value').textContent=begun?number(model.position(t)/1000,c.d>=1e5?0:2):'—';
}
function values(){const g=TsunamiModel.g,deep=Math.sqrt(g*4000),tc=2e6/deep;return {v:number(deep,0),k:number(3.6*deep,0),t:number(tc/3600),m:number(tc/60,0),s:number(Math.sqrt(g*10),1),h:number(2500/g,0)};}
function runningCopy(t){const c=model.config;return text('tsunamiCopy',{d:number(model.position(t)/1000,c.d>=1e5?0:2)});}
// The speed (m/s) your answer stands for.
function guessSpeed(){const c=model.config,a=model.answer;if(c.ask==='kmh')return a/3.6;if(c.ask==='cross')return c.d/(a*3600);if(c.ask==='depth')return Math.sqrt(TsunamiModel.g*a);return a;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=16,x1=g.area-76,kp=(x1-x0)/c.d,X=x=>x0+x*kp,ys=height*.36,yb=height-96,amp=Math.min(28,height*.065),W=.14*c.d;
  const bump=u=>Math.abs(u)<W/2?.5*(1+Math.cos(2*Math.PI*u/W)):0;
  // A cross-section of the sea, depth enlarged, with the coast on the right; the tsunami's hump runs over the surface.
  box(x0,56,g.area-32,ys-56,'#1d3b52');
  const pos=model.position(s),pts=[];for(let i=0;i<=360;i++){const x=c.d*i/360;pts.push({x:X(x),y:ys-amp*(g.begun?bump(x-pos):0)});}
  ctx.fillStyle='#173a50';ctx.beginPath();ctx.moveTo(X(0),yb);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(X(c.d),yb);ctx.closePath();ctx.fill();line(pts,'#77b9ff',3);
  box(X(c.d),ys,g.area-16-X(c.d),yb-ys,'#173a50');box(x0,yb,X(c.d)-x0,8,'#5c4f40');
  ctx.fillStyle='#c9b79c';ctx.beginPath();ctx.moveTo(X(c.d),yb+8);ctx.lineTo(X(c.d),yb);ctx.lineTo(g.area-16,ys-22);ctx.lineTo(g.area-16,yb+8);ctx.closePath();ctx.fill();
  if(c.ask!=='depth'||g.begun){line([{x:x0+10,y:ys+4},{x:x0+10,y:yb-2}],'#d1e3ed',1.5);fit('h = '+plain(Math.round(c.h))+' m',x0+16,(ys+yb)/2,'#d1e3ed',11,160);}
  if(g.option){const ry=height-58,dk=c.d/1000,step=[.5,1,2,5,10,20,50,100,200,500,1000].find(v=>dk/v<=5);line([{x:X(0),y:ry},{x:X(c.d),y:ry}],'#8aa3b5',1);for(let k=0;k<=dk+1e-9;k+=step){line([{x:X(k*1000),y:ry},{x:X(k*1000),y:ry+6}],'#9fb6c7',1);label(plain(k)+' km',X(k*1000),ry+18,'#9fb6c7','center',9);}}
  // Your speed: an orange dot running above the surface.
  if(g.guess&&g.begun){const xg=guessSpeed()*model.clamp(s)*60;if(xg<=c.d)dot(X(xg),ys-amp-16,5,'#efb958');}
  fit(text('fastTag',{n:plain(Math.round(c.pace*60))}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t,1)+' min',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('distanceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=80,py1=height-80,PX=q=>px0+q/D*(px1-px0),PY=x=>py1-x/c.d*(py1-py0),upto=Math.min(g.t,D);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px1,y:py0}],'#8aa3b5',1,[3,4]);label(plain(c.d/1000)+' km',px0+4,py0-6,'#9fb6c7','left',9);
  if(g.guess){const v=guessSpeed(),end=Math.min(D,c.d/v/60);line([{x:PX(0),y:PY(0)},{x:PX(end),y:PY(v*end*60)}],'#efb958',1.5,[5,4]);}
  line([{x:PX(0),y:PY(0)},{x:PX(upto),y:PY(model.position(upto))}],'#77b9ff',2.5);dot(PX(upto),PY(model.position(upto)),4,'#f2f8fc');
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
