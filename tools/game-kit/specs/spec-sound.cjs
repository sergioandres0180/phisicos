module.exports = {
kind:'sound',model:'SoundModel',title:'Sound in Slow Motion',symbol:'λ =',unit:'m',equation:'v = f·λ',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','airLegend'],['white','squeezeLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','Hz','f'],['wavelength-value','wavelengthMetric','m','λ = v ÷ f','vector'],['period-value','periodMetric','ms','T = 1 ÷ f'],['travel-value','travelMetric','m','d = v·t','vector']],
modelCode:String.raw`
class SoundModel {
  // Sound is a longitudinal wave: a vibrating speaker squeezes and stretches the air in front of it, and the air moves back and
  // forth along the direction the sound goes. Squeezes leave f times a second and travel at 340 m/s, so they sit λ = v ÷ f
  // apart and each vibration lasts T = 1 ÷ f. Tones are shown slowed down f times, one vibration per displayed second; thunder
  // and the echo play in real time. Light arrives almost at once, so the delay is the sound's travel time.
  static v = 340;
  static tolerance = .02;
  static missions = [
    {key:'note',ask:'wavelength',kind:'tone',f:340},
    {key:'tuning',ask:'period',kind:'tone',f:440},
    {key:'thunder',ask:'distance',kind:'thunder',delay:3},
    {key:'echo',ask:'cliff',kind:'echo',delay:2},
    {key:'highest',ask:'tiny',kind:'tone',f:20000}
  ];
  static units = {wavelength:'m',period:'ms',distance:'m',cliff:'m',tiny:'cm'};
  static limits = {wavelength:1e7,period:1e7,distance:1e7,cliff:1e7,tiny:1e7};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SoundModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SoundModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  tone(){return this.config.kind==='tone';}
  wavelength(){return SoundModel.v/this.config.f;}
  // Real time (s) for a displayed time: tones are slowed f times.
  real(t){return this.tone()?this.clamp(t)/this.config.f:this.clamp(t);}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // How far the sound has gone (m).
  travelled(t){return SoundModel.v*this.real(t);}
  // The air's sideways shift (as a share of its largest) at x for a tone, behind the front.
  shift(x,t){const l=this.wavelength(),r=this.real(t);return x<=SoundModel.v*r?Math.sin(2*Math.PI*(this.config.f*r-x/l)):0;}
  pressure(x,t){const l=this.wavelength(),r=this.real(t);return x<=SoundModel.v*r?Math.cos(2*Math.PI*(this.config.f*r-x/l)):0;}
  // Where the thunder or the shout is now, measured from the listener (m).
  front(t){const c=this.config,d=this.travelled(t);if(c.kind==='thunder')return Math.max(c.delay*SoundModel.v-d,0);const D=c.delay*SoundModel.v/2;return d<=D?d:Math.max(2*D-d,0);}
  duration(){const c=this.config;return c.kind==='tone'?3:c.delay+(c.kind==='thunder'?.4:.3);}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends after three slowed vibrations, or once the sound has arrived.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,v=SoundModel.v;if(c.ask==='wavelength')return v/c.f;if(c.ask==='period')return 1000/c.f;if(c.ask==='distance')return v*c.delay;if(c.ask==='cliff')return v*c.delay/2;return v/c.f*100;}
  unit(){return SoundModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),v=SoundModel.v,tol=SoundModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='wavelength'){if(near(a,v*c.f))slip='multiplied';else if(near(a,1/c.f))slip='periodInstead';}
      else if(c.ask==='period'){if(near(a,e/1000))slip='seconds';else if(near(a,v/c.f))slip='wavelengthInstead';}
      else if(c.ask==='distance'){if(near(a,v/c.delay))slip='divided';else if(near(a,e/2))slip='halved';else if(near(a,e/1000))slip='kilometres';}
      else if(c.ask==='cliff'){if(near(a,2*e))slip='roundTrip';else if(near(a,v/c.delay))slip='divided';else if(near(a,e/1000))slip='kilometres';}
      else{if(near(a,e/100))slip='unitsM';else if(near(a,e*10))slip='unitsMm';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SoundModel.missions[saved.index])return false;
    const probe=new SoundModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={wavelength:'λ =',period:'T =',distance:'d =',cliff:'d =',tiny:'λ ='};
// Givens: the note, or the delay; the speed of sound.
function given(m){const v=' · v = 340 m/s';if(m.kind==='tone')return 'f = '+plain(m.f)+' Hz'+(m.ask==='period'?'':v);return 't = '+plain(m.delay)+' s'+v;}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='wavelength')return 'λ = v ÷ f = 340 ÷ '+plain(c.f)+' = '+number(e)+' m';
  if(c.ask==='period')return 'T = 1 ÷ f = 1 ÷ '+plain(c.f)+' = '+number(e)+' ms';
  if(c.ask==='distance')return 'd = v·t = 340 × '+plain(c.delay)+' = '+number(e,0)+' m';
  if(c.ask==='cliff')return 'd = v·t ÷ 2 = 340 × '+plain(c.delay)+' ÷ 2 = '+number(e,0)+' m';
  return 'λ = v ÷ f = 340 ÷ '+plain(c.f)+' = '+number(e)+' cm';
}
function baseEquation(){return model.tone()?'v = f·λ':'d = v·t';}
function metrics(t,begun){
  const c=model.config,tone=model.tone();
  $('frequency-value').textContent=begun&&tone?plain(c.f):'—';$('wavelength-value').textContent=begun&&tone?number(model.wavelength(),3):'—';
  $('period-value').textContent=begun&&tone?number(1000/c.f,3):'—';$('travel-value').textContent=begun?number(model.travelled(t),model.tone()?3:0):'—';
}
function values(){
  const c=model.config,tone=model.tone(),l=tone?model.wavelength():0;
  return {f:tone?plain(c.f):'',l:c.ask==='tiny'?number(l*100):number(l),T:tone?number(1000/c.f):'',t:plain(c.delay??0),d:tone?'':number(model.exact(),0)};
}
function runningCopy(t){return model.tone()?text('vibratingCopy',{n:number(model.clamp(t),1),d:number(model.travelled(t),3)}):text('travellingCopy',{d:number(model.travelled(t),0)});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0;
  if(model.tone()){
    // The speaker and the air in front of it, to scale along the sound's path: 3.5 wavelengths in view.
    const l=model.wavelength(),view=3.5*l,x0=70,x1=g.area-20,kp=(x1-x0)/view,X=x=>x0+x*kp,top=86,bottom=height-74,rows=7,cols=56,dx=view/cols,amp=.09*l*kp;
    const cone=(g.ready?model.shift(0,s):0)*amp;box(x0-46,top-6,30,bottom-top+12,'#22384a');line([{x:x0-10+cone,y:top},{x:x0-10+cone,y:bottom}],'#d1e3ed',4);
    for(let i=0;i<=cols;i++){const xr=i*dx,sh=g.ready?model.shift(xr,s):0;for(let r=0;r<rows;r++){const y=top+(bottom-top)*(r+.5)/rows;dot(X(xr)+sh*amp,y,2.6,'#77b9ff');}}
    // The spot whose pressure the right panel plots, one wavelength from the speaker.
    line([{x:X(l),y:top-4},{x:X(l),y:bottom+4}],'#9fb6c7',1,[2,4]);
    if(g.begun){const f=c.f,rr=model.real(s),k=Math.floor(f*rr),xc=(f*rr-k)*l,j=Math.floor((model.travelled(s)-xc)/l+1e-9)-1;if(j>=0){const xa=xc+Math.min(j,1)*l,yb=top-16;line([{x:X(xa),y:yb},{x:X(xa+l),y:yb}],'#f2f8fc',1.5);line([{x:X(xa),y:yb-4},{x:X(xa),y:yb+4}],'#f2f8fc',1.5);line([{x:X(xa+l),y:yb-4},{x:X(xa+l),y:yb+4}],'#f2f8fc',1.5);fit('λ = '+(c.ask==='tiny'?number(l*100)+' cm':number(l)+' m'),X(xa+l/2),yb-6,'#f2f8fc',10,kp*l+40,'center');}}
    if(g.option){const unit=c.ask==='tiny'?.01:.5,lab=c.ask==='tiny'?(m=>plain(Math.round(m*100))+' cm'):(m=>plain(m)+' m');line([{x:X(0),y:bottom+16},{x:X(view),y:bottom+16}],'#8aa3b5',1);for(let m=0;m<=view+1e-9;m+=unit){const x=X(m);line([{x,y:bottom+16},{x,y:bottom+22}],'#9fb6c7',1);label(lab(m),x,bottom+34,'#9fb6c7','center',9);}}
    if(g.guess&&(c.ask==='wavelength'||c.ask==='tiny')){const step=c.ask==='tiny'?model.answer/100:model.answer;if(step*kp>=8)for(let x=0;x<=view+1e-9;x+=step)line([{x:X(x),y:top-34},{x:X(x),y:top-26}],'#efb958',2);fit(text('guessTag'),X(0),top-38,'#efb958',9,g.area*.4);}
    fit(text('slowTag',{n:plain(c.f)}),16,height-24,'#9fb6c7',10,g.area*.5);
  }else{
    // A map of the ground, to scale: you at the left, the storm or the cliff at its true distance once the run starts.
    const D=c.delay*SoundModel.v/(c.kind==='echo'?2:1),span=Math.max(D,g.guess?Math.min(model.answer,D*3):0)*1.15,x0=50,x1=g.area-24,X=m=>x0+m/span*(x1-x0),yg=height*.62;
    line([{x:16,y:yg},{x:g.area-16,y:yg}],'#8aa3b5',2);
    dot(x0,yg-30,7,'#f2f8fc');line([{x:x0,y:yg-23},{x:x0,y:yg}],'#f2f8fc',3);fit(text('youTag'),x0,yg+16,'#d1e3ed',10,80,'center');
    if(g.option){const step=[50,100,200,250,500,1000,2000].find(v=>span/v<=7)??5000;for(let m=step;m<span;m+=step){line([{x:X(m),y:yg},{x:X(m),y:yg+6}],'#9fb6c7',1);label(plain(m)+' m',X(m),yg+30,'#9fb6c7','center',9);}}
    if(g.begun){
      if(c.kind==='thunder'){const cx=X(D);box(cx-30,yg-190,60,22,'#5c6b78');if(s<.15)line([{x:cx,y:yg-168},{x:cx-10,y:yg-110},{x:cx+6,y:yg-95},{x:cx-4,y:yg}],'#f6e27a',3);}
      else box(X(D),yg-120,14,120,'#7d6a58');
      const fx=X(model.front(s));if(model.travelled(s)<(c.kind==='echo'?2*D:D)){ctx.strokeStyle='#77b9ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(fx,yg,40,c.kind==='thunder'||(c.kind==='echo'&&model.travelled(s)>D)?Math.PI*.6:-Math.PI*.4,c.kind==='thunder'||(c.kind==='echo'&&model.travelled(s)>D)?Math.PI*1.4:Math.PI*.4);ctx.stroke();}
    }else fit('?',X(span/1.15),yg-40,'#9fb6c7',28,60,'center');
    if(g.guess){const gx=X(Math.min(model.answer,span));line([{x:gx,y:yg-130},{x:gx,y:yg}],'#efb958',2,[5,3]);fit(text('guessTag'),gx,yg-136,'#efb958',9,120,'center');}
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g,tone=model.tone();
  fit(text(tone?'pressureGraph':'distanceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,PX=q=>px0+q/D*(px1-px0),upto=Math.min(g.t,D),pts=[];
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  if(tone){
    const xe=model.wavelength(),ym=(py0+py1)/2,PY=v=>ym-v*(py1-py0)*.4;line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);
    for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.pressure(xe,q))});}line(pts,'#77b9ff',2);
    if(g.guess&&c.ask==='period'){const step=model.answer/1000*c.f;if(step>=.05)for(let q=1;q<=D+1e-9;q+=step)line([{x:PX(q),y:py0},{x:PX(q),y:py1}],'#efb958',1.2,[5,4]);}
  }else{
    const far=c.delay*SoundModel.v/(c.kind==='echo'?2:1),span=Math.max(far,g.guess?Math.min(model.answer,far*2):0)*1.15,PY=v=>py1-v/span*(py1-py0);line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
    for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.front(q))});}line(pts,'#77b9ff',2);
    if(g.guess){const yy=PY(Math.min(model.answer,span));line([{x:px0,y:yy},{x:px1,y:yy}],'#efb958',1.5,[5,3]);fit(text('guessTag'),px1,yy-4,'#efb958',9,px1-px0,'right');}
  }
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
