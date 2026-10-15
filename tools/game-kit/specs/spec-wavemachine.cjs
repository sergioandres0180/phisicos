module.exports = {
kind:'wavemachine',model:'WaveMachineModel',title:'Wave Machine',symbol:'λ =',unit:'m',equation:'v = f·λ',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','ropeLegend'],['red','beadLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','Hz','f'],['wavelength-value','wavelengthMetric','m','λ','vector'],['speed-value','speedMetric','m/s','v = f·λ','vector'],['period-value','periodMetric','s','T = 1 ÷ f']],
modelCode:String.raw`
class WaveMachineModel {
  // A motor shakes one end of a rope up and down f times a second. Each shake sends out one wave, so crests leave every period
  // T = 1 ÷ f and travel at the rope's speed v: by the time the next crest leaves, the last one is λ = v·T further on, which
  // gives v = f·λ. The rope sets v; the motor sets f; the wavelength follows. The amplitude changes neither.
  // y(x, t) = A·sin(2π·(f·t − x ÷ λ)) behind the front, which moves out at v.
  static tolerance = .02;
  static bead = 3; // m along the rope
  static run = 3;
  static missions = [
    {key:'count',ask:'wavelength',L:6,f:2,v:3,A:.15,waves:4},
    {key:'speed',ask:'speed',L:6,f:2,v:3,A:.15},
    {key:'faster',ask:'newWavelength',L:6,f:4,f0:2,v:3,A:.15},
    {key:'period',ask:'period',L:6,f:2.5,v:5,A:.15},
    {key:'bigger',ask:'bigSpeed',L:6,f:2,v:3,A:.3,A0:.15}
  ];
  static units = {wavelength:'m',speed:'m/s',newWavelength:'m',period:'s',bigSpeed:'m/s'};
  static limits = {wavelength:1e4,speed:1e4,newWavelength:1e4,period:1e4,bigSpeed:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=WaveMachineModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=WaveMachineModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  wavelength(f=this.config.f){return this.config.v/f;}
  period(){return 1/this.config.f;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  front(t){return Math.min(this.config.v*this.clamp(t),this.config.L);}
  // The rope's height (m) at x; the reference wave is the slower shaking or the smaller amplitude, on the same rope.
  height(x,t,ref=false){
    const c=this.config,s=this.clamp(t),f=ref&&c.f0?c.f0:c.f,A=ref&&c.A0?c.A0:c.A;
    return x<=c.v*s?A*Math.sin(2*Math.PI*(f*s-x*f/c.v)):0;
  }
  bead(t){return this.height(WaveMachineModel.bead,t);}
  duration(){return WaveMachineModel.run;}
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
  exact(){const c=this.config;if(c.ask==='wavelength')return c.L/c.waves;if(c.ask==='newWavelength')return c.v/c.f;if(c.ask==='period')return 1/c.f;return c.v;}
  unit(){return WaveMachineModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=WaveMachineModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const l=this.wavelength();
      if(c.ask==='wavelength'){if(near(a,c.L/(c.waves+1)))slip='crests';else if(near(a,c.L*c.waves))slip='timesWaves';else if(near(a,c.waves/c.L))slip='wavesPerMetre';}
      else if(c.ask==='speed'){if(near(a,l/c.f))slip='divided';else if(near(a,c.f/l))slip='inverted';}
      else if(c.ask==='newWavelength'){const l0=c.v/c.f0;if(near(a,2*l0))slip='longer';else if(near(a,l0))slip='same';}
      else if(c.ask==='period'){if(near(a,c.f))slip='frequency';else if(near(a,l*c.v))slip='multiplied';}
      else{if(near(a,2*c.v))slip='doubled';else if(near(a,c.v/2))slip='halved';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!WaveMachineModel.missions[saved.index])return false;
    const probe=new WaveMachineModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={wavelength:'λ =',speed:'v =',newWavelength:'λ₂ =',period:'T =',bigSpeed:'v ='};
// Givens: the rope and its waves, the motor's frequency and the wavelength, or the speed.
function given(m){
  const l=m.v/(m.f0??m.f);
  if(m.ask==='wavelength')return 'L = '+plain(m.L)+' m · n = '+plain(m.waves);
  if(m.ask==='newWavelength')return 'λ = '+plain(l)+' m · f = '+plain(m.f0)+' → '+plain(m.f)+' Hz';
  if(m.ask==='period')return 'λ = '+plain(m.v/m.f)+' m · v = '+plain(m.v)+' m/s';
  return 'f = '+plain(m.f)+' Hz · λ = '+plain(l)+' m'+(m.A0?' · A ×2':'');
}
function equation(){
  const c=model.config,l=model.wavelength();
  if(c.ask==='wavelength')return 'λ = L ÷ n = '+plain(c.L)+' ÷ '+plain(c.waves)+' = '+number(l)+' m';
  if(c.ask==='newWavelength')return 'λ = v ÷ f = '+plain(c.v)+' ÷ '+plain(c.f)+' = '+number(l)+' m';
  if(c.ask==='period')return 'T = λ ÷ v = '+plain(l)+' ÷ '+plain(c.v)+' = '+number(1/c.f)+' s';
  return 'v = f·λ = '+plain(c.f)+' × '+plain(l)+' = '+number(c.v)+' m/s';
}
function baseEquation(){const a=model.config.ask;return a==='wavelength'?'λ = L ÷ n':a==='period'?'T = 1 ÷ f':'v = f·λ';}
function metrics(t,begun){
  const c=model.config;
  $('frequency-value').textContent=begun?number(c.f):'—';$('wavelength-value').textContent=begun?number(model.wavelength()):'—';
  $('speed-value').textContent=begun?number(c.v):'—';$('period-value').textContent=begun?number(model.period()):'—';
}
function values(){const c=model.config;return {L:plain(c.L),l:number(model.wavelength()),v:number(c.v),f:plain(c.f),T:number(model.period())};}
function runningCopy(t){return text('wavingCopy',{x:number(model.front(t)),y:number(model.bead(t)*100,1)});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=58,x1=g.area-24,kp=(x1-x0)/c.L,X=x=>x0+x*kp,ym=height*.5,ky=Math.min(300,(height*.3)/.32),Y=y=>ym-y*ky;
  // The motor and its arm, the rope (heights exaggerated), the marked bead, and a ruler in metres.
  const arm=Y(model.height(0,s));box(x0-46,ym-40,30,80,'#22384a');line([{x:x0-16,y:ym},{x:x0,y:arm}],'#d1e3ed',3);dot(x0,arm,4,'#d1e3ed');
  if(c.f0||c.A0){const ref=[];for(let i=0;i<=360;i++){const x=c.L*i/360;ref.push({x:X(x),y:Y(model.height(x,s,true))});}line(ref,'#9fb6c7',1.5,[4,3]);}
  const pts=[];for(let i=0;i<=480;i++){const x=c.L*i/480;pts.push({x:X(x),y:Y(model.height(x,s))});}line(pts,'#77b9ff',3);
  const bx=X(WaveMachineModel.bead),by=Y(model.bead(s));line([{x:bx,y:ym-ky*.34},{x:bx,y:ym+ky*.34}],'#9fb6c7',1,[3,4]);dot(bx,by,6,'#ff7b6b');
  if(g.option){line([{x:X(0),y:ym+ky*.4},{x:X(c.L),y:ym+ky*.4}],'#8aa3b5',1);for(let m=0;m<=c.L;m+=.5){const x=X(m);line([{x,y:ym+ky*.4},{x,y:ym+ky*.4+(m%1?4:8)}],'#9fb6c7',1);if(m%1===0)label(plain(m)+' m',x,ym+ky*.4+20,'#9fb6c7','center',9);}}
  // Once running, a bracket from one crest to the next, behind the front.
  const l=model.wavelength();
  if(g.begun){const k=Math.floor(c.f*s-.25),xc=(c.f*s-.25-k)*l,j=Math.min(Math.floor((model.front(s)-xc)/l+1e-9)-1,Math.max(0,Math.floor((c.L/2-xc)/l))),xa=xc+j*l;if(j>=0){const yb=Y(c.A)-14;line([{x:X(xa),y:yb},{x:X(xa+l),y:yb}],'#f2f8fc',1.5);line([{x:X(xa),y:yb-4},{x:X(xa),y:yb+4}],'#f2f8fc',1.5);line([{x:X(xa+l),y:yb-4},{x:X(xa+l),y:yb+4}],'#f2f8fc',1.5);fit('λ = '+number(l)+' m',X(xa+l/2),yb-6,'#f2f8fc',10,kp*l+40,'center');}}
  if(g.guess){
    if(c.ask==='wavelength'||c.ask==='newWavelength'){const step=model.answer;if(step*kp>=6)for(let x=0;x<=c.L+1e-9;x+=step)line([{x:X(x),y:Y(c.A)-34},{x:X(x),y:Y(c.A)-24}],'#efb958',2);fit(text('guessTag'),X(0),Y(c.A)-40,'#efb958',9,g.area*.4);}
    if((c.ask==='speed'||c.ask==='bigSpeed')&&s>0){const gx=X(Math.min(model.answer*s,c.L));line([{x:gx,y:ym-ky*.34},{x:gx,y:ym+ky*.34}],'#efb958',2,[5,3]);fit(text('guessTag'),gx,ym+ky*.34+14,'#efb958',9,110,'center');}
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g;
  fit(text('beadGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,ym=(py0+py1)/2,span=Math.max(c.A,c.A0??0)*1.25,PX=q=>px0+q/D*(px1-px0),PY=v=>ym-v/span*(py1-py0)/2,upto=Math.min(g.t,D);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  const pts=[];for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.bead(q))});}line(pts,'#77b9ff',2);
  if(g.guess&&c.ask==='period'&&model.answer>=.05){const start=WaveMachineModel.bead/c.v;for(let q=start;q<=D+1e-9;q+=model.answer)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.2,[5,4]);}
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
