module.exports = {
kind:'beats',model:'BeatsModel',title:'Beat Tuner',symbol:'f_b =',unit:'Hz',equation:'f_b = |f₁ − f₂|',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','soundLegend'],['white','loudLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['f1-value','f1Metric','Hz','f₁'],['f2-value','f2Metric','Hz','f₂'],['beat-value','beatMetric','Hz','f_b'],['count-value','countMetric','','N']],
modelCode:String.raw`
class BeatsModel {
  // Beats. Two notes close in pitch drift in and out of step: when their crests line up the sound is loud, half a beat later
  // they cancel and it is quiet. The loudness rises and falls |f₁ − f₂| times a second, the beat frequency. Tuners listen
  // for the beats to slow down and vanish as two notes come into tune. Time is in seconds; the fast vibrations themselves are
  // drawn far slower than real, but the beats are shown at their real rate (slowed down in the 2 s test).
  static tolerance = .02;
  static missions = [
    {key:'rate',ask:'rate',f1:440,f2:444,run:4,pace:1},
    {key:'tune',ask:'lower',f1:440,f2:444,after:441,run:4,pace:1},
    {key:'period',ask:'period',f1:440,f2:442.5,run:4,pace:1},
    {key:'side',ask:'offset',f1:440,f2:443,after:445,run:4,pace:1},
    {key:'difference',ask:'difference',f1:330,f2:333,run:2,pace:.5}
  ];
  static units = {rate:'Hz',lower:'Hz',period:'s',offset:'Hz',difference:'Hz'};
  static limits = {rate:1e4,lower:1e4,period:1e4,offset:1e3,difference:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BeatsModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // The offset may be negative (a flat string) but not 0; every other answer is positive.
  valid(value){const a=this.config.ask,lim=BeatsModel.limits[a];if(!Number.isFinite(value))return false;return a==='offset'?value!==0&&Math.abs(value)<=lim:value>0&&value<=lim;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The second note at time t: in the tuning tests the string is retuned halfway through.
  f2(t){const c=this.config;return c.after&&this.clamp(t)>=c.run/2?c.after:c.f2;}
  beat(t){return Math.abs(this.f2(t)-this.config.f1);}
  // Beats heard so far, and the loudness envelope (share of the loudest) at time t, continuous across the change.
  count(t){const c=this.config,s=this.clamp(t);if(!c.after)return Math.floor(this.beat(0)*s+1e-9);const h=c.run/2;return s<h?Math.floor(Math.abs(c.f2-c.f1)*s+1e-9):Math.floor(Math.abs(c.f2-c.f1)*h+Math.abs(c.after-c.f1)*(s-h)+1e-9);}
  phase(t){const c=this.config,s=this.clamp(t);if(!c.after)return this.beat(0)*s;const h=c.run/2;return s<h?Math.abs(c.f2-c.f1)*s:Math.abs(c.f2-c.f1)*h+Math.abs(c.after-c.f1)*(s-h);}
  loudness(t){return Math.abs(Math.cos(Math.PI*this.phase(t)));}
  duration(){return this.config.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the end of the listening time.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,b=Math.abs(c.f2-c.f1);if(c.ask==='period')return 1/b;if(c.ask==='lower')return c.f2-c.after;if(c.ask==='offset')return c.f2-c.f1;return b;}
  unit(){return BeatsModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),b=Math.abs(c.f2-c.f1),tol=BeatsModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='rate'){if(near(a,c.f1+c.f2))slip='added';else if(near(a,(c.f1+c.f2)/2))slip='average';else if(near(a,b/2))slip='half';}
      else if(c.ask==='period'){if(near(a,b))slip='rateInstead';else if(near(a,1/c.f1))slip='notePeriod';else if(near(a,1/(2*b)))slip='halved';}
      else if(c.ask==='lower'){if(near(a,b))slip='toZero';else if(near(a,b+1))slip='pastTune';else if(near(a,1))slip='beatOnly';}
      else if(c.ask==='offset'){if(near(a,-e))slip='wrongSide';else if(near(a,c.after-c.f1))slip='newBeats';}
      else{if(near(a,2*b))slip='beatCount';else if(near(a,4*b))slip='multiplied';else if(near(a,1/b))slip='invertedDiff';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BeatsModel.missions[saved.index])return false;
    const probe=new BeatsModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={rate:'f_b =',lower:'Δf =',period:'T_b =',offset:'Δf =',difference:'Δf ='};
// Givens: the two notes (and the beats wanted), the beats before and after tightening, or beats counted.
function given(m){
  if(m.ask==='lower')return plain(m.f1)+' Hz · '+plain(m.f2)+' Hz → 1/s';
  if(m.ask==='offset')return plain(m.f1)+' Hz · '+plain(Math.abs(m.f2-m.f1))+'/s → '+plain(Math.abs(m.after-m.f1))+'/s';
  if(m.ask==='difference')return plain(m.f1)+' Hz · N = '+plain(Math.abs(m.f2-m.f1)*m.run)+' · t = '+plain(m.run)+' s';
  return 'f₁ = '+plain(m.f1)+' Hz · f₂ = '+plain(m.f2)+' Hz';
}
function equation(){
  const c=model.config,e=model.exact(),b=Math.abs(c.f2-c.f1);
  if(c.ask==='period')return 'T_b = 1 ÷ f_b = 1 ÷ '+plain(b)+' = '+number(e)+' s';
  if(c.ask==='lower')return 'Δf = '+plain(c.f2)+' − ('+plain(c.f1)+' + 1) = '+number(e,0)+' Hz';
  if(c.ask==='offset')return 'Δf = '+plain(c.f2)+' − '+plain(c.f1)+' = +'+number(e,0)+' Hz';
  if(c.ask==='difference')return 'Δf = N ÷ t = '+plain(b*c.run)+' ÷ '+plain(c.run)+' = '+number(e,1)+' Hz';
  return 'f_b = |'+plain(c.f1)+' − '+plain(c.f2)+'| = '+number(e,1)+' Hz';
}
function baseEquation(){const a=model.config.ask;return a==='period'?'T_b = 1 ÷ f_b':a==='difference'?'N = f_b·t':'f_b = |f₁ − f₂|';}
function metrics(t,begun){
  const c=model.config;
  $('f1-value').textContent=begun?number(c.f1,1):'—';$('f2-value').textContent=begun?number(model.f2(t),1):'—';
  $('beat-value').textContent=begun?number(model.beat(t),1):'—';$('count-value').textContent=begun?plain(model.count(t)):'—';
}
function values(){const c=model.config;return {b:number(model.exact(),1),p:number(model.exact())};}
function runningCopy(t){return text('beatsCopy',{n:plain(model.count(t))});}
// The loudness pattern your answer stands for: beats a second, before and (in the tuning tests) after retuning.
function guessRates(){const c=model.config,a=model.answer;if(c.ask==='period')return [1/a];if(c.ask==='lower')return [c.f2-c.f1,Math.abs(c.f2-a-c.f1)];if(c.ask==='offset')return [Math.abs(a),Math.abs(a+(c.after-c.f2))];return [a];}
function guessLoud(t){const c=model.config,r=guessRates(),s=Math.min(Math.max(t,0),c.run);if(r.length===1)return Math.abs(Math.cos(Math.PI*r[0]*s));const h=c.run/2;return Math.abs(Math.cos(Math.PI*(s<h?r[0]*s:r[0]*h+r[1]*(s-h))));}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=24,x1=g.area-24,ym=height*.5,amp=Math.min(110,height*.26);
  // Two sources on the left; the sound they make together, drawn with its fast vibration slowed far down and its real
  // loudness envelope, scrolling past; a loudness bar on the right that swells and fades with each beat.
  box(16,56,g.area-32,height-126,'#1d2a36');
  box(x0,ym-amp-20,26,18,'#d9cfb8');label(plain(c.f1)+' Hz',x0+32,ym-amp-6,'#d1e3ed','left',10);
  box(x0,ym+amp+2,26,18,'#9fb6c7');label(plain(g.begun?model.f2(s):c.f2)+' Hz',x0+32,ym+amp+16,'#d1e3ed','left',10);
  line([{x:x0+40,y:ym},{x:x1-60,y:ym}],'#3d556b',1);
  if(g.begun){const span=Math.min(2,c.run),t0=Math.max(0,s-span),pts=[],env=[],fv=25;
    for(let i=0;i<=600;i++){const q=t0+span*i/600;if(q>s)break;const px=x0+40+(q-t0)/span*(x1-100-x0);const a=model.loudness(q);pts.push({x:px,y:ym-amp*a*Math.cos(2*Math.PI*fv*q)});env.push({x:px,y:ym-amp*a});}
    line(pts,'#77b9ff',1.4);line(env,'#f2f8fc',2);line(env.map(p=>({x:p.x,y:2*ym-p.y})),'#f2f8fc',2);}
  const lv=g.begun?model.loudness(s):0,bx=x1-36;box(bx,ym-amp,20,2*amp,'#2b3a48');box(bx,ym+amp-2*amp*lv,20,2*amp*lv,'#f2f8fc');label(text('loudTag'),bx+10,ym+amp+16,'#d1e3ed','center',9);
  if(g.option){const ry=height-58,span=Math.min(2,c.run),t0=Math.max(0,s-span);for(let k=Math.ceil(t0*4);k<=Math.floor((t0+span)*4);k++){const q=k/4,px=x0+40+(q-t0)/span*(x1-100-x0);line([{x:px,y:ry},{x:px,y:ry+(k%4?3:6)}],'#9fb6c7',1);if(k%4===0)label(plain(q)+' s',px,ry+16,'#9fb6c7','center',8);}}
  fit(text('slowTag',{n:plain(c.pace)}),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('loudGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Loudness over the whole run: one swell per beat. Your answer is the dashed orange pattern.
  const T=c.run,px0=g.area+14,px1=width-14,py0=90,py1=height-90,PX=q=>px0+q/T*(px1-px0),PY=a=>py1-a*(py1-py0),upto=Math.min(g.t,T);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);for(let q=0;q<=T+1e-9;q+=1){line([{x:PX(q),y:py1},{x:PX(q),y:py1+4}],'#9fb6c7',1);label(plain(q),PX(q),py1+14,'#9fb6c7','center',8);}
  if(c.after)line([{x:PX(T/2),y:py0},{x:PX(T/2),y:py1}],'#8aa3b5',1,[3,4]);
  if(g.guess){const gp=[];for(let i=0;i<=600;i++){const q=T*i/600;gp.push({x:PX(q),y:PY(guessLoud(q))});}line(gp,'#efb958',1.3,[5,4]);}
  const pts=[];for(let i=0;i<=600;i++){const q=upto*i/600;pts.push({x:PX(q),y:PY(model.loudness(q))});}line(pts,'#f2f8fc',2);
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
