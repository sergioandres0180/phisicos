module.exports = {
kind:'surf',model:'SurfModel',title:"Surfer's Wait",symbol:'T =',unit:'s',equation:'T = λ ÷ v',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','seaLegend'],['white','surferLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['period-value','periodMetric','s','T = λ ÷ v'],['wavelength-value','wavelengthMetric','m','λ','vector'],['speed-value','speedMetric','m/s','v','vector'],['crest-value','crestMetric','','n']],
modelCode:String.raw`
class SurfModel {
  // A swell rolls towards the beach as a train of crests λ apart, moving at v. A surfer waiting in one place rises on each crest
  // as it passes, once every period T = λ ÷ v; the frequency f = 1 ÷ T counts crests per second. Runs are sped up so that two
  // and a half periods take about 4 s.
  static tolerance = .02;
  static missions = [
    {key:'period',ask:'period',l:60,v:10,pace:3.75},
    {key:'perMinute',ask:'perMinute',l:60,v:10,pace:3.75},
    {key:'speed',ask:'speed',l:40,v:8,pace:3.125},
    {key:'wavelength',ask:'wavelength',l:180,v:15,pace:7.5},
    {key:'frequency',ask:'frequency',l:100,v:12.5,pace:5}
  ];
  static units = {period:'s',perMinute:'',speed:'m/s',wavelength:'m',frequency:'Hz'};
  static limits = {period:1e6,perMinute:1e6,speed:1e6,wavelength:1e7,frequency:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SurfModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SurfModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  period(){return this.config.l/this.config.v;}
  // The surfer waits 1.25 wavelengths out; crests reach the surfer at T/2, 3T/2, 5T/2.
  surfer(){return 1.25*this.config.l;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The sea's height (share of the swell's height) at x (m) and time t (s).
  height(x,t){const c=this.config;return Math.sin(2*Math.PI*(this.clamp(t)/this.period()-x/c.l));}
  crestTimes(){const T=this.period(),out=[];for(let k=0;(k+.5)*T<=this.duration()+1e-9;k++)out.push((k+.5)*T);return out;}
  crests(t){return this.crestTimes().filter(q=>q<=this.clamp(t)+1e-9).length;}
  duration(){return 2.5*this.period();}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the third crest reaches the surfer.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,T=this.period();if(c.ask==='period')return T;if(c.ask==='perMinute')return 60/T;if(c.ask==='speed')return c.v;if(c.ask==='wavelength')return c.l;return 1/T;}
  unit(){return SurfModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),T=this.period(),tol=SurfModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='period'){if(near(a,c.l*c.v))slip='multiplied';else if(near(a,c.v/c.l))slip='inverted';}
      else if(c.ask==='perMinute'){if(near(a,T))slip='periodNumber';else if(near(a,60*T))slip='times';else if(near(a,1/T))slip='perSecond';}
      else if(c.ask==='speed'){if(near(a,c.l*T))slip='multipliedSpeed';else if(near(a,T/c.l))slip='invertedSpeed';}
      else if(c.ask==='wavelength'){if(near(a,c.v/T))slip='divided';else if(near(a,T/c.v))slip='invertedLength';}
      else{if(near(a,T))slip='periodInstead';else if(near(a,60/T))slip='perMinuteInstead';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SurfModel.missions[saved.index])return false;
    const probe=new SurfModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={period:'T =',perMinute:'n =',speed:'v =',wavelength:'λ =',frequency:'f ='};
// Givens: the crests' spacing and speed, the period seen from a pier, or the period alone.
function given(m){
  const T=m.l/m.v;
  if(m.ask==='speed')return 'λ = '+plain(m.l)+' m · T = '+plain(T)+' s';
  if(m.ask==='wavelength')return 'v = '+plain(m.v)+' m/s · T = '+plain(T)+' s';
  if(m.ask==='frequency')return 'T = '+plain(T)+' s';
  return 'λ = '+plain(m.l)+' m · v = '+plain(m.v)+' m/s';
}
function equation(){
  const c=model.config,e=model.exact(),T=model.period();
  if(c.ask==='period')return 'T = λ ÷ v = '+plain(c.l)+' ÷ '+plain(c.v)+' = '+number(e)+' s';
  if(c.ask==='perMinute')return 'n = 60 s ÷ T = 60 ÷ '+plain(T)+' = '+number(e,1);
  if(c.ask==='speed')return 'v = λ ÷ T = '+plain(c.l)+' ÷ '+plain(T)+' = '+number(e)+' m/s';
  if(c.ask==='wavelength')return 'λ = v·T = '+plain(c.v)+' × '+plain(T)+' = '+number(e,0)+' m';
  return 'f = 1 ÷ T = 1 ÷ '+plain(T)+' = '+number(e,3)+' Hz';
}
function baseEquation(){const a=model.config.ask;return a==='frequency'?'f = 1 ÷ T':a==='perMinute'?'n = 60 s ÷ T':'T = λ ÷ v';}
function metrics(t,begun){
  const c=model.config;
  $('period-value').textContent=begun?number(model.period(),1):'—';$('wavelength-value').textContent=begun?number(c.l,0):'—';
  $('speed-value').textContent=begun?number(c.v,1):'—';$('crest-value').textContent=begun?plain(model.crests(t)):'—';
}
function values(){const c=model.config,T=model.period();return {T:plain(T),n:plain(60/T),v:plain(c.v),l:plain(c.l),f:number(1/T,3)};}
function runningCopy(t){return text('surfCopy',{n:plain(model.crests(t))});}
// The period the guess stands for (s), when it is a time or a rate.
function guessPeriod(){const c=model.config,a=model.answer;if(c.ask==='period')return a;if(c.ask==='perMinute')return 60/a;if(c.ask==='frequency')return 1/a;return null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,view=2.5*c.l,x0=24,x1=g.area-60,kp=(x1-x0)/view,X=x=>x0+x*kp,ym=height*.5,amp=Math.min(36,height*.085),Y=h=>ym-h*amp;
  // Sky, the swell rolling towards the beach on the right, and the surfer waiting in one place.
  box(16,56,g.area-32,ym-amp-56-6,'#1d3b52');
  const pts=[];for(let i=0;i<=360;i++){const x=view*i/360;pts.push({x:X(x),y:Y(g.begun?model.height(x,s):0)});}
  ctx.fillStyle='#173a50';ctx.beginPath();ctx.moveTo(X(0),height-70);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(X(view),height-70);ctx.closePath();ctx.fill();line(pts,'#77b9ff',3);
  box(X(view),ym-6,g.area-16-X(view),height-70-ym+6,'#c9b79c');
  const xs=model.surfer(),sy=Y(g.begun?model.height(xs,s):0);box(X(xs)-14,sy-4,28,4,'#f2f8fc');line([{x:X(xs),y:sy-4},{x:X(xs),y:sy-20}],'#f2f8fc',3);dot(X(xs),sy-24,4,'#f2f8fc');
  if(g.option){const ry=height-58,step=[5,10,20,25,50,100].find(v=>view/v<=8)||100;line([{x:X(0),y:ry},{x:X(view),y:ry}],'#8aa3b5',1);for(let m=0;m<=view+1e-9;m+=step){const x=X(m);line([{x,y:ry},{x,y:ry+6}],'#9fb6c7',1);label(plain(m)+' m',x,ry+18,'#9fb6c7','center',9);}}
  // The crest that starts at 0.75 λ: white where it is, orange where your speed would put it.
  if(c.ask==='speed'&&g.begun){const xr=.75*c.l+c.v*s;if(xr<=view)dot(X(xr),Y(1)-12,5,'#f2f8fc');if(g.guess){const xg=.75*c.l+model.answer*s;if(xg<=view)dot(X(xg),Y(1)-24,5,'#efb958');}}
  // Your spacing, marked out both ways from the surfer, who rides a crest as the run ends.
  if(c.ask==='wavelength'&&g.guess){const step=model.answer,xs=model.surfer();if(step*kp>=6){for(let k=Math.ceil(-xs/step-1e-9);xs+k*step<=view+1e-9;k++){const x=X(xs+k*step);line([{x,y:Y(1)-44},{x,y:Y(1)-36}],'#efb958',2);}fit(text('guessTag'),X(xs)+6,Y(1)-48,'#efb958',9,g.area*.4);}}
  fit(text('fastTag',{n:plain(c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot}=g;
  fit(text('surferGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=80,py1=height-80,ym=(py0+py1)/2,PX=q=>px0+q/D*(px1-px0),PY=h=>ym-h*(py1-py0)*.4,upto=Math.min(g.t,D),xs=model.surfer();
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);
  const pts=[];for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.height(xs,q))});}line(pts,'#77b9ff',2);
  for(const q of model.crestTimes())if(q<=upto+1e-9)dot(PX(q),PY(1),4,'#f2f8fc');
  const Tg=g.guess?guessPeriod():null;if(Tg&&Tg/D>=.02){for(let q=model.period()/2;q<=D+1e-9;q+=Tg)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.2,[5,4]);}
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
