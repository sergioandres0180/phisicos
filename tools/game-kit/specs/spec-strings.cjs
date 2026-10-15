module.exports = {
kind:'strings',model:'StringModel',title:'String Tuner',symbol:'f =',unit:'Hz',equation:'f = v ÷ (2·L)',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','stringLegend'],['white','fingerLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','Hz','f = v ÷ (2·L)','vector'],['length-value','lengthMetric','cm','L'],['wavelength-value','wavelengthMetric','m','λ = 2·L'],['speed-value','speedMetric','m/s','v','vector']],
modelCode:String.raw`
class StringModel {
  // A plucked string vibrates as a standing wave fixed at both ends: its longest wave is twice the vibrating length, λ = 2·L,
  // so it sounds f = v ÷ (2·L), where v is the speed of waves along the string. Halving the length doubles the frequency (an
  // octave); the wave speed grows as the square root of the tension, v = √(T ÷ μ). The vibration is shown slowed down f
  // times, one vibration per second on screen.
  static tolerance = .02;
  static run = 3;
  static missions = [
    {key:'fundamental',ask:'frequency',L:.65,v:286},
    {key:'octave',ask:'octave',L:.65,v:286,press:.5},
    {key:'fret',ask:'length',L:.65,v:286,target:330},
    {key:'tension',ask:'tension',L:.65,v:286,T:4},
    {key:'period',ask:'period',L:.65,v:286}
  ];
  static units = {frequency:'Hz',octave:'Hz',length:'cm',tension:'Hz',period:'ms'};
  static limits = {frequency:1e6,octave:1e6,length:1e6,tension:1e6,period:1e6};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=StringModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=StringModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The vibrating length (m): the whole string, half of it, or, when the length is asked, the one you chose.
  length(){const c=this.config;if(c.ask==='octave')return c.L*c.press;if(c.ask==='length')return this.answer===null?this.exact()/100:Math.min(Math.max(this.answer/100,.05),c.L);return c.L;}
  speed(){const c=this.config;return c.T?c.v*Math.sqrt(c.T):c.v;}
  frequency(){return this.speed()/(2*this.length());}
  // The string's displacement (as a share of its largest) at distance s from the bridge, slowed down: one vibration per second.
  shape(s,t){const L=this.length();return s<0||s>L?0:Math.sin(Math.PI*s/L)*Math.cos(2*Math.PI*this.clamp(t));}
  duration(){return StringModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after three slowed vibrations.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,f0=c.v/(2*c.L);if(c.ask==='frequency')return f0;if(c.ask==='octave')return c.v/(2*c.L*c.press);if(c.ask==='length')return c.v/(2*c.target)*100;if(c.ask==='tension')return f0*Math.sqrt(c.T);return 1000/f0;}
  unit(){return StringModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),f0=c.v/(2*c.L),tol=StringModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='frequency'){if(near(a,c.v/c.L))slip='noTwo';else if(near(a,c.v/(4*c.L)))slip='quarter';else if(near(a,2*c.L*c.v))slip='multiplied';}
      else if(c.ask==='octave'){if(near(a,f0/2))slip='halved';else if(near(a,f0))slip='same';else if(near(a,4*f0))slip='quadrupled';}
      else if(c.ask==='length'){if(near(a,c.v/c.target*100))slip='noTwoLength';else if(near(a,c.L*c.target/f0*100))slip='inverseRatio';else if(near(a,e/100))slip='metres';}
      else if(c.ask==='tension'){if(near(a,f0*c.T))slip='linear';else if(near(a,f0))slip='unchanged';else if(near(a,f0*Math.sqrt(2)))slip='rootTwo';}
      else{if(near(a,e/1000))slip='seconds';else if(near(a,e/2))slip='halfPeriod';else if(near(a,f0))slip='frequencyNumber';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!StringModel.missions[saved.index])return false;
    const probe=new StringModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={frequency:'f =',octave:'f₂ =',length:'L =',tension:'f₂ =',period:'T ='};
// Givens: the string and its wave speed, the half-length, the note wanted, or the tension.
function given(m){
  const f0=m.v/(2*m.L);
  if(m.ask==='frequency')return 'L = '+plain(m.L*100)+' cm · v = '+plain(m.v)+' m/s';
  if(m.ask==='octave')return 'L = '+plain(m.L*100)+' cm → ½';
  if(m.ask==='length')return 'f = '+plain(m.target)+' Hz · v = '+plain(m.v)+' m/s';
  if(m.ask==='tension')return 'f = '+plain(f0)+' Hz · F ×'+plain(m.T);
  return 'f = '+plain(f0)+' Hz';
}
function equation(){
  const c=model.config,e=model.exact(),f0=c.v/(2*c.L);
  if(c.ask==='frequency')return 'f = v ÷ (2·L) = '+plain(c.v)+' ÷ (2 × '+plain(c.L)+') = '+number(e,0)+' Hz';
  if(c.ask==='octave')return 'f₂ = v ÷ (2·L₂) = '+plain(c.v)+' ÷ (2 × '+plain(c.L*c.press)+') = '+number(e,0)+' Hz';
  if(c.ask==='length')return 'L = v ÷ (2·f) = '+plain(c.v)+' ÷ (2 × '+plain(c.target)+') = '+number(e,1)+' cm';
  if(c.ask==='tension')return 'f₂ = f₁·√(F₂ ÷ F₁) = '+plain(f0)+' × √'+plain(c.T)+' = '+number(e,0)+' Hz';
  return 'T = 1 ÷ f = 1 ÷ '+plain(f0)+' = '+number(e)+' ms';
}
function baseEquation(){const a=model.config.ask;return a==='period'?'T = 1 ÷ f':a==='tension'?'v = √(F ÷ μ)':'f = v ÷ (2·L)';}
function metrics(t,begun){
  $('frequency-value').textContent=begun?number(model.frequency(),0):'—';$('length-value').textContent=begun?number(model.length()*100,1):'—';
  $('wavelength-value').textContent=begun?number(2*model.length()):'—';$('speed-value').textContent=begun?number(model.speed(),0):'—';
}
function values(){const c=model.config,f0=c.v/(2*c.L),L=c.ask==='octave'?c.L*c.press:c.ask==='length'?c.v/(2*c.target):c.L,v=c.T?c.v*Math.sqrt(c.T):c.v,f=v/(2*L);return {f:number(f,0),l:number(L*100,1),v:number(v,0),T:number(1000/f0)};}
function runningCopy(t){return text('vibratingCopy',{n:number(model.clamp(t),1),f:number(model.frequency(),0)});}
// The note the guess stands for, in Hz.
function guessHz(){const c=model.config,a=model.answer;if(c.ask==='period')return 1000/a;if(c.ask==='length')return c.v/(2*a/100);return a;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=50,x1=g.area-40,kp=(x1-x0)/.72,B=x1,X=d=>B-d*kp,ym=height*.42,amp=Math.min(60,height*.15),L=model.length();
  // The neck from the nut to the bridge, the frets, and the string: still from the nut to your finger, vibrating beyond it.
  box(X(c.L)-6,ym-26,X(0)-X(c.L)+12,52,'#2b2a33');for(let k=1;k<=12;k++){const d=c.L/2**(k/12);line([{x:X(d),y:ym-26},{x:X(d),y:ym+26}],'#5c6b78',1);}
  box(X(c.L)-8,ym-30,6,60,'#d9cfb8');box(B,ym-34,10,68,'#d9cfb8');
  if(L<c.L-1e-9)line([{x:X(c.L),y:ym},{x:X(L),y:ym}],'#9fb6c7',2);
  if(g.begun){const env=[],env2=[];for(let i=0;i<=120;i++){const d=L*i/120;env.push({x:X(d),y:ym-Math.sin(Math.PI*d/L)*amp});env2.push({x:X(d),y:ym+Math.sin(Math.PI*d/L)*amp});}line(env,'#9fb6c7',1,[3,4]);line(env2,'#9fb6c7',1,[3,4]);}
  const pts=[];for(let i=0;i<=240;i++){const d=L*i/240;pts.push({x:X(d),y:ym-(g.begun?model.shape(d,s):0)*amp});}line(pts,'#77b9ff',3);
  if(L<c.L-1e-9)dot(X(L),ym-10,7,c.ask==='length'?'#efb958':'#f2f8fc');
  if(g.option){const ry=ym+amp+30;line([{x:X(0),y:ry},{x:X(.7),y:ry}],'#8aa3b5',1);for(let cm=0;cm<=70;cm+=5){const x=X(cm/100);line([{x,y:ry},{x,y:ry+(cm%10?4:8)}],'#9fb6c7',1);if(cm%10===0)label(plain(cm)+' cm',x,ry+20,'#9fb6c7','center',9);}}
  if(g.begun)fit(text('slowTag',{n:number(model.frequency(),0)}),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,label}=g,cx=g.area+(width-g.area)/2,cy=height*.66,r=Math.min((width-g.area)/2-26,height*.42),A=f=>Math.PI*(1-Math.min(Math.max(f,0),1000)/1000),P=(f,k)=>({x:cx+Math.cos(A(f))*r*k,y:cy-Math.sin(A(f))*r*k});
  fit(text('tunerGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  // A tuner dial from 0 to 1000 Hz with familiar notes marked; the blue needle is the string, the orange one your prediction.
  const arc=[];for(let i=0;i<=100;i++)arc.push(P(i*10,1));line(arc,'#8aa3b5',1.5);
  for(let f=0;f<=1000;f+=100){line([P(f,.92),P(f,1)],'#9fb6c7',1);if(f%200===0){const q=P(f,1.12);label(plain(f),q.x,q.y+3,'#9fb6c7','center',9);}}
  for(const [key,f] of [['noteA3',220],['noteE4',330],['noteA4',440],['noteA5',880]]){line([P(f,.8),P(f,.92)],'#d9cfb8',2);const q=P(f,.7);fit(text(key),q.x,q.y+3,'#d9cfb8',9,40,'center');}
  if(g.guess){const p=P(guessHz(),.95);line([{x:cx,y:cy},p],'#efb958',2);}
  if(g.begun){const p=P(model.frequency(),.95);line([{x:cx,y:cy},p],'#77b9ff',3);}
  line([{x:cx-5,y:cy},{x:cx+5,y:cy}],'#f2f8fc',3);
}
`
};
