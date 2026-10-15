module.exports = {
kind:'echo',model:'EchoModel',title:'Echo Sounder',symbol:'d =',unit:'m',equation:'d = v·t ÷ 2',timeUnit:'ms',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','pingLegend'],['white','echoLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['speed-value','speedMetric','m/s','v','vector'],['distance-value','distanceMetric','m','d','vector'],['travel-value','travelMetric','m','v·t','vector'],['echo-value','echoMetric','','n']],
modelCode:String.raw`
class EchoModel {
  // A sound pulse goes out, bounces off something, and comes back. The echo returns after t = 2d ÷ v, so the distance is
  // d = v·t ÷ 2: half the round trip. Sound runs at 1500 m/s in sea water and 340 m/s in air. Time is in milliseconds and
  // slowed so every run takes 4 s; a run ends as the last echo gets back.
  static tolerance = .02;
  static missions = [
    {key:'depth',ask:'distance',geo:'down',v:1500,d:300},
    {key:'bat',ask:'distance',geo:'across',v:340,d:1.7},
    {key:'time',ask:'time',geo:'across',v:340,d:85},
    {key:'speed',ask:'speed',geo:'down',v:1500,d:600},
    {key:'fish',ask:'gap',geo:'down',v:1500,d:300,fish:75}
  ].map(m=>({...m,pace:2*m.d/m.v*1000/4}));
  static units = {distance:'m',time:'s',speed:'m/s',gap:'m'};
  static limits = {distance:1e6,time:1e4,speed:1e6,gap:1e6};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=EchoModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=EchoModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The round-trip time (s) for a reflector d metres away, and the reflectors: the seabed, the cliff, or the moth, and a shoal.
  echoTime(d){return 2*d/this.config.v;}
  reflectors(){const c=this.config;return c.fish?[c.fish,c.d]:[c.d];}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // How far the sound has gone (m) at time t (ms), out and back.
  travelled(t){return this.config.v*this.clamp(t)/1000;}
  heard(t){return this.reflectors().filter(d=>this.echoTime(d)*1000<=this.clamp(t)+1e-9).length;}
  duration(){return this.echoTime(this.config.d)*1000;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the last echo returns.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='time')return this.echoTime(c.d);if(c.ask==='speed')return c.v;if(c.ask==='gap')return c.d-c.fish;return c.d;}
  unit(){return EchoModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),t=this.echoTime(c.d),tol=EchoModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='depth'){if(near(a,c.v*t))slip='noHalf';else if(near(a,c.v/t))slip='divided';else if(near(a,340*t/2))slip='airSpeed';}
      else if(c.key==='bat'){if(near(a,c.v*t))slip='noHalf';else if(near(a,c.v/t))slip='divided';else if(near(a,e*100))slip='centimetres';}
      else if(c.key==='time'){if(near(a,t/2))slip='oneWay';else if(near(a,1/t))slip='inverted';}
      else if(c.key==='speed'){if(near(a,c.d/t))slip='oneWaySpeed';else if(near(a,c.d*t))slip='multipliedSpeed';}
      else{if(near(a,2*e))slip='noHalfGap';else if(near(a,c.fish))slip='fishDepth';else if(near(a,c.d))slip='seabedDepth';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!EchoModel.missions[saved.index])return false;
    const probe=new EchoModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={distance:'d =',time:'t =',speed:'v =',gap:'h ='};
// Givens: the speed and echo time, the speed and distance, the depth and time, or two echo times.
function given(m){
  const t=2*m.d/m.v;
  if(m.ask==='time')return 'v = '+plain(m.v)+' m/s · d = '+plain(m.d)+' m';
  if(m.ask==='speed')return 'd = '+plain(m.d)+' m · t = '+plain(t)+' s';
  if(m.ask==='gap')return 'v = '+plain(m.v)+' m/s · '+plain(2*m.fish/m.v)+' s · '+plain(t)+' s';
  return 'v = '+plain(m.v)+' m/s · t = '+plain(t)+' s';
}
function equation(){
  const c=model.config,e=model.exact(),t=model.echoTime(c.d);
  if(c.ask==='time')return 't = 2d ÷ v = '+plain(2*c.d)+' ÷ '+plain(c.v)+' = '+number(e,3)+' s';
  if(c.ask==='speed')return 'v = 2d ÷ t = '+plain(2*c.d)+' ÷ '+plain(t)+' = '+number(e,0)+' m/s';
  if(c.ask==='gap')return 'h = v·Δt ÷ 2 = '+plain(c.v)+' × '+plain(t-model.echoTime(c.fish))+' ÷ 2 = '+number(e,0)+' m';
  return 'd = v·t ÷ 2 = '+plain(c.v)+' × '+plain(t)+' ÷ 2 = '+number(e,e<10?2:0)+' m';
}
function baseEquation(){const a=model.config.ask;return a==='time'?'t = 2d ÷ v':a==='speed'?'v = 2d ÷ t':a==='gap'?'h = v·Δt ÷ 2':'d = v·t ÷ 2';}
function fmt(x){return number(x,x<10?2:0);}
function metrics(t,begun){
  const c=model.config;
  $('speed-value').textContent=begun?number(c.v,0):'—';$('distance-value').textContent=begun?fmt(c.d):'—';
  $('travel-value').textContent=begun?fmt(model.travelled(t)):'—';$('echo-value').textContent=begun?plain(model.heard(t)):'—';
}
function values(){const c=model.config;return {d:plain(c.d),t:plain(model.echoTime(c.d)),v:plain(c.v),h:plain(c.d-(c.fish||0))};}
function runningCopy(t){return text('echoCopy',{s:fmt(model.travelled(t))});}
// The echo times (ms) your answer stands for.
function guessTimes(){const c=model.config,a=model.answer;if(c.ask==='distance')return [2*a/c.v*1000];if(c.ask==='time')return [a*1000];if(c.ask==='speed')return [2*c.d/a*1000];return c.d-a>0?[2*(c.d-a)/c.v*1000]:[];}
// Where your answer puts the reflector (m from the source), when it is a distance.
function guessDistance(){const c=model.config,a=model.answer;return c.ask==='distance'?a:c.ask==='gap'?c.d-a:null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?model.travelled(g.t):0,down=c.geo==='down';
  const arc=(x,y,r,a0,a1,colour,w)=>{if(r<=0)return;ctx.strokeStyle=colour;ctx.lineWidth=w;ctx.beginPath();ctx.arc(x,y,r,a0,a1);ctx.stroke();};
  if(down){
    // A ship over the sea; the ping spreads down and each echo spreads back up from what it hit.
    const ys=104,yb=height-86,k=(yb-ys)/c.d,cx=g.area*.42,Y=d=>ys+d*k;
    box(16,56,g.area-32,ys-56,'#1d3b52');box(16,ys,g.area-32,yb-ys,'#173a50');box(16,yb,g.area-32,10,'#5c4f40');line([{x:16,y:ys},{x:g.area-16,y:ys}],'#77b9ff',2);
    box(cx-34,ys-16,68,14,'#d9cfb8');box(cx-10,ys-28,20,12,'#d9cfb8');label(text('shipTag'),cx,ys-34,'#d1e3ed','center',9);
    label(text('seabedTag'),g.area-24,yb+24,'#9fb6c7','right',9);
    if(c.fish){for(let i=0;i<9;i++)dot(cx-30+(i%3)*30+(i>2?6:0),Y(c.fish)-6+Math.floor(i/3)*6,2.5,'#c9b79c');label(text('fishTag'),cx+60,Y(c.fish)+3,'#c9b79c','left',9);}
    ctx.save();ctx.beginPath();ctx.rect(16,ys,g.area-32,yb-ys);ctx.clip();
    if(g.begun){if(s<c.d)arc(cx,ys,s*k,0,Math.PI,'#77b9ff',2.5);for(const d of model.reflectors())if(s>d&&s<2*d)arc(cx,Y(d),(s-d)*k,Math.PI,2*Math.PI,'#f2f8fc',2.5);}
    ctx.restore();
    if(g.option){const rx=g.area-40,step=[10,20,50,100,200].find(v=>c.d/v<=6);line([{x:rx,y:ys},{x:rx,y:yb}],'#8aa3b5',1);for(let m=0;m<=c.d+1e-9;m+=step){line([{x:rx-6,y:Y(m)},{x:rx,y:Y(m)}],'#9fb6c7',1);label(plain(m)+' m',rx-9,Y(m)+3,'#9fb6c7','right',9);}}
    const gd=g.guess?guessDistance():null;if(gd!==null&&gd<=c.d*1.05){line([{x:24,y:Y(gd)},{x:g.area-60,y:Y(gd)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),28,Y(gd)-5,'#efb958',9,g.area*.3);}
  }else{
    // A bat and a moth, or you and a cliff: the sound runs across and its echo comes back.
    const x0=70,x1=g.area-60,k=(x1-x0)/(c.d*1.15),X=d=>x0+d*k,ym=height*.48,cliff=c.key==='time';
    box(16,56,g.area-32,height-126,'#1d3b52');
    if(cliff){box(X(c.d),70,g.area-16-X(c.d),height-140,'#5c6b78');box(16,ym+40,g.area-32,8,'#5c4f40');label(text('cliffTag'),X(c.d)+8,86,'#d1e3ed','left',9);dot(x0,ym+14,7,'#d9cfb8');line([{x:x0,y:ym+21},{x:x0,y:ym+40}],'#d9cfb8',3);label(text('youTag'),x0,ym-2,'#d1e3ed','center',9);}
    else{dot(X(c.d),ym,4,'#c9b79c');line([{x:X(c.d)-8,y:ym-6},{x:X(c.d)+8,y:ym+6}],'#c9b79c',2);line([{x:X(c.d)-8,y:ym+6},{x:X(c.d)+8,y:ym-6}],'#c9b79c',2);label(text('mothTag'),X(c.d),ym-14,'#d1e3ed','center',9);
      line([{x:x0-24,y:ym-8},{x:x0-10,y:ym},{x:x0-24,y:ym+8}],'#d9cfb8',2);line([{x:x0+24,y:ym-8},{x:x0+10,y:ym},{x:x0+24,y:ym+8}],'#d9cfb8',2);dot(x0,ym,6,'#d9cfb8');label(text('batTag'),x0,ym+24,'#d1e3ed','center',9);}
    if(g.begun){ctx.save();ctx.beginPath();ctx.rect(16,56,(cliff?X(c.d):g.area-16)-16,height-126);ctx.clip();if(s<c.d)arc(x0,ym,s*k,-Math.PI/2,Math.PI/2,'#77b9ff',2.5);if(s>c.d&&s<2*c.d)arc(X(c.d),ym,(s-c.d)*k,Math.PI/2,1.5*Math.PI,'#f2f8fc',2.5);ctx.restore();}
    if(g.option){const ry=height-58,span=c.d*1.15,step=[.2,.5,1,2,5,10,20,50].find(v=>span/v<=6);line([{x:X(0),y:ry},{x:X(span),y:ry}],'#8aa3b5',1);for(let m=0;m<=span+1e-9;m+=step){line([{x:X(m),y:ry},{x:X(m),y:ry+6}],'#9fb6c7',1);label(plain(m)+' m',X(m),ry+18,'#9fb6c7','center',9);}}
    const gd=g.guess?guessDistance():null;if(gd!==null&&gd<=c.d*1.15){line([{x:X(gd),y:70},{x:X(gd),y:height-80}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(gd)+4,80,'#efb958',9,g.area*.3);}
  }
  fit(text('slowTag',{n:plain(Math.round(1000/c.pace))}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t,c.pace<10?2:0)+' ms',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('recorderGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // What the receiver hears: the ping at 0, then an echo for each reflector, smaller from the fish.
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=80,py1=height-80,ym=(py0+py1)/2,PX=q=>px0+q/D*(px1-px0)*.92,upto=Math.min(g.t,D),w=D/60;
  const blips=[[0,1]].concat(model.reflectors().map(d=>[model.echoTime(d)*1000,d===c.d?.8:.45]));
  const sig=q=>blips.reduce((sum,[at,a])=>sum+a*Math.exp(-(((q-at)/w)**2))*Math.sin((q-at)/w*6),0);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);
  if(g.guess)for(const q of guessTimes())if(q<=D*1.08)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.5,[5,4]);
  const pts=[];for(let i=0;i<=500;i++){const q=upto*i/500;pts.push({x:PX(q),y:ym-sig(q)*(py1-py0)*.35});}line(pts,'#f2f8fc',1.5);
  for(const [at] of blips.slice(1))if(at<=upto+1e-9)label(number(at,at<100?1:0)+' ms',PX(at),py0+12,'#d1e3ed','center',9);
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,px1-px0);
}
`
};
