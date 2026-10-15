module.exports = {
kind:'tide',model:'TideModel',title:'Tide Clock',symbol:'T =',unit:'h',equation:'h = A·cos(2π·t ÷ T)',timeUnit:'h',
toggle:['show-gauge','gaugeToggle'],
legends:[['blue','seaLegend'],['white','highLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['clock-value','clockMetric','','t'],['level-value','levelMetric','m','h','vector'],['high-value','highMetric','','n'],['period-value','periodMetric','h','T']],
modelCode:String.raw`
class TideModel {
  // The tide is a very long wave: the sea rises and falls about twice a day as the Moon's pull sweeps round the Earth. Here a
  // high tide comes every period T = 12 h 25 min, and the water's height follows h = A·cos(2π·t ÷ T) about its middle level,
  // starting at a high tide at 06:10. Time is in hours and runs fast: a day passes in about 4 s.
  static tolerance = .02;
  static T = 12+25/60; // h
  static A = 2; // m
  static start = 6+10/60; // clock hours of the first high tide
  static missions = [
    {key:'period',ask:'period',run:50,pace:12.5},
    {key:'low',ask:'low',run:26,pace:6.5},
    {key:'perDay',ask:'perDay',run:26,pace:6.5},
    {key:'later',ask:'later',run:50,pace:12.5},
    {key:'length',ask:'length',run:26,pace:6.5,v:200}
  ];
  static units = {period:'h',low:'h',perDay:'',later:'min',length:'km'};
  static limits = {period:1e4,low:1e4,perDay:1e4,later:1e5,length:1e9};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=TideModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=TideModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  level(t){return TideModel.A*Math.cos(2*Math.PI*this.clamp(t)/TideModel.T);}
  highs(){const out=[];for(let k=0;k*TideModel.T<=this.duration()+1e-9;k++)out.push(k*TideModel.T);return out;}
  highCount(t){return this.highs().filter(q=>q<=this.clamp(t)+1e-9).length;}
  // Clock time (minutes since midnight, 0 to 1439) and the day number, 1 on the first day.
  minutes(t){return Math.round((TideModel.start+this.clamp(t))*60)%1440;}
  day(t){return Math.floor((TideModel.start+this.clamp(t))/24+1e-9)+1;}
  duration(){return this.config.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends after 26 or 50 hours.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,T=TideModel.T;if(c.ask==='period')return T;if(c.ask==='low')return T/2;if(c.ask==='perDay')return 24/T;if(c.ask==='later')return (2*T-24)*60;return c.v*T*3600/1000;}
  unit(){return TideModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),T=TideModel.T,tol=TideModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='period'){const span=4*T;if(near(a,span/5))slip='extraTide';else if(near(a,span-48))slip='clockOnly';else if(near(a,12))slip='twelve';}
      else if(c.ask==='low'){if(near(a,T/4))slip='quarter';else if(near(a,T))slip='fullPeriod';else if(near(a,6))slip='sixHours';}
      else if(c.ask==='perDay'){if(near(a,2))slip='two';else if(near(a,1/T))slip='perHour';else if(near(a,T/24))slip='invertedDay';}
      else if(c.ask==='later'){if(near(a,e/60))slip='hours';else if(near(a,e/2))slip='oneTide';else if(near(a,2*e))slip='doubled';}
      else{if(near(a,c.v*T/1000))slip='hoursNotSeconds';else if(near(a,e*1000))slip='metres';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!TideModel.missions[saved.index])return false;
    const probe=new TideModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={period:'T =',low:'t =',perDay:'n =',later:'Δt =',length:'λ ='};
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
// Givens: two high tides, or the period with the first high tide, or the period and the wave's speed.
function given(m){
  if(m.ask==='period')return 'Δt = 49 h 40 min · 4 T';
  if(m.ask==='low')return '06:10 · T = 12 h 25 min';
  if(m.ask==='length')return 'v = '+plain(m.v)+' m/s · T = 12 h 25 min';
  return 'T = 12 h 25 min';
}
function equation(){
  const c=model.config,e=model.exact(),T=TideModel.T;
  if(c.ask==='period')return 'T = Δt ÷ 4 = '+number(4*T)+' ÷ 4 = '+number(e)+' h';
  if(c.ask==='low')return 't = T ÷ 2 = '+number(T)+' ÷ 2 = '+number(e)+' h';
  if(c.ask==='perDay')return 'n = 24 h ÷ T = 24 ÷ '+number(T)+' = '+number(e);
  if(c.ask==='later')return 'Δt = 2·T − 24 h = '+number(2*T)+' − 24 = '+number(e,0)+' min';
  return 'λ = v·T = '+plain(c.v)+' × '+plain(T*3600)+' s = '+number(e,0)+' km';
}
function baseEquation(){return model.config.ask==='length'?'λ = v·T':'h = A·cos(2π·t ÷ T)';}
function metrics(t,begun){
  $('clock-value').textContent=begun?hhmm(model.minutes(t)):'—';$('level-value').textContent=begun?number(model.level(t)):'—';
  $('high-value').textContent=begun?plain(model.highCount(t)):'—';$('period-value').textContent=begun?number(TideModel.T):'—';
}
function values(){const T=TideModel.T,c=model.config;return {c:hhmm(Math.round((TideModel.start+T)*60)%1440),l:hhmm(Math.round((TideModel.start+T/2)*60)%1440),T:number(T),t:number(T/2),n:number(24/T),m:plain(Math.round((2*T-24)*60)),k:number(c.v?c.v*T*3.6:0,0)};}
function runningCopy(t){return text('tideCopy',{c:hhmm(model.minutes(t)),h:number(model.level(t))});}
// The time (h after 06:10) the guess points to, when it is a time or a rate.
function guessTimes(){const c=model.config,a=model.answer,T=TideModel.T;if(c.ask==='low')return [a];if(c.ask==='period'){const out=[];for(let q=a;q<=c.run+1e-9&&out.length<60;q+=a)out.push(q);return out;}if(c.ask==='perDay'){const out=[];for(let q=0;q<=c.run+1e-9;q+=24/a)out.push(q);return out.length<60?out:[];}if(c.ask==='later')return [24+a/60];return [];}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=16,x1=g.area-16,ym=height*.5,ky=Math.min(34,height*.075),Y=h=>ym-h*ky,hour=(TideModel.start+s)%24,dayLight=Math.max(0,Math.sin(Math.PI*(hour-6)/12));
  // Sky by the time of day, the sea against a harbour wall with a tide gauge, a moored boat, and a big clock.
  const mix=(a,b,k)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*k)).join(',')+')';
  box(x0,56,x1-x0,height-126,mix([12,22,36],[70,120,160],dayLight));
  const lvl=g.begun?model.level(s):TideModel.A,wall=x1-90;
  box(x0,Y(lvl),wall-x0,height-70-Y(lvl),'#173a50');line([{x:x0,y:Y(lvl)},{x:wall,y:Y(lvl)}],'#77b9ff',3);
  box(wall,Y(3.2),90,height-70-Y(3.2),'#5c6b78');
  if(g.option){const gx=wall-6;line([{x:gx,y:Y(-3)},{x:gx,y:Y(3)}],'#f2f8fc',2);for(let m=-3;m<=3;m++){line([{x:gx-8,y:Y(m)},{x:gx,y:Y(m)}],'#f2f8fc',1.5);label((m>0?'+':m<0?'−':'')+plain(Math.abs(m))+' m',gx-12,Y(m)+3,'#d1e3ed','right',9);}line([{x:x0,y:Y(0)},{x:wall,y:Y(0)}],'#9fb6c7',1,[4,4]);}
  const bx=x0+(wall-x0)*.4;box(bx-30,Y(lvl)-10,60,10,'#d9cfb8');line([{x:bx,y:Y(lvl)-10},{x:bx,y:Y(lvl)-42}],'#d9cfb8',2);line([{x:bx,y:Y(lvl)-5},{x:wall,y:Y(1.5)}],'#9fb6c7',1);
  fit(hhmm(model.minutes(s)),x0+12,96,'#f2f8fc',30,160);
  if(model.day(s)>1)fit(text('dayTag',{n:plain(model.day(s))}),x0+14,116,'#d1e3ed',11,160);
  // The tide's wavelength on a scale up to half way round the Earth.
  if(c.ask==='length'){const sx0=x0+20,sx1=wall-36,sy=height-84,K=km=>sx0+Math.min(km,20000)/20000*(sx1-sx0);line([{x:sx0,y:sy},{x:sx1,y:sy}],'#8aa3b5',1);for(let k=0;k<=20000;k+=5000){line([{x:K(k),y:sy-4},{x:K(k),y:sy+4}],'#9fb6c7',1);label(plain(k)+' km',K(k),sy+16,'#9fb6c7','center',9);}fit(text('earthTag'),sx1,sy-8,'#d1e3ed',9,180,'right');
    if(g.begun)line([{x:sx0,y:sy-12},{x:K(model.exact()),y:sy-12}],'#77b9ff',4);if(g.guess)line([{x:sx0,y:sy-20},{x:K(model.answer),y:sy-20}],'#efb958',3);}
  fit(text('fastTag',{n:plain(c.pace*3600)}),16,height-24,'#9fb6c7',10,g.area*.6);
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,D=model.duration();
  fit(text('tideGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+14,px1=width-14,py0=80,py1=height-80,ym=(py0+py1)/2,PX=q=>px0+q/D*(px1-px0),PY=h=>ym-h/TideModel.A*(py1-py0)*.42,upto=Math.min(g.t,D);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);for(let q=0;q<=D;q+=6){line([{x:PX(q),y:py1},{x:PX(q),y:py1+4}],'#9fb6c7',1);label(plain(q),PX(q),py1+14,'#9fb6c7','center',8);}
  const pts=[];for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.level(q))});}line(pts,'#77b9ff',2);
  for(const q of model.highs())if(q<=upto+1e-9)dot(PX(q),PY(TideModel.A),4,'#f2f8fc');
  if(g.guess)for(const q of guessTimes())if(q<=D+1e-9)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.5,[5,4]);
  fit(text('hoursAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
