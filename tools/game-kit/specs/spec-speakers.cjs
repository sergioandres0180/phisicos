module.exports = {
kind:'speakers',model:'SpeakersModel',title:'Two Speakers',symbol:'Δd =',unit:'m',equation:'Δd = (n + ½)·λ',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','fieldLegend'],['white','micLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['freq-value','freqMetric','Hz','f'],['lambda-value','lambdaMetric','m','λ','vector'],['diff-value','diffMetric','m','Δd','vector'],['loud-value','loudMetric','%','A']],
modelCode:String.raw`
class SpeakersModel {
  // Interference of sound. Two speakers play the same note. At a spot one speaker is Δd farther away than the other, so its
  // sound arrives Δd ÷ λ of a wave later. Where Δd is a whole number of wavelengths the waves add up (loud); where it is a
  // whole number and a half they cancel (quiet): quiet at Δd = (n + ½)·λ. With one speaker wired backwards, the two swap.
  // λ = v ÷ f with v = 340 m/s. A microphone walks along a line 4 m from the speakers over a 4 s run; the sound is drawn
  // slowed down to one vibration a second.
  static tolerance = .02;
  static v = 340;
  static gap = 3; // speakers 3 m apart, at (0, ±1.5)
  static line = 4; // the microphone walks along x = 4 m
  static missions = [
    {key:'quiet',ask:'diff',f:340,max:1,pace:1},
    {key:'secondQuiet',ask:'diff',f:340,max:1.9,pace:1},
    {key:'frequency',ask:'freq',f:400,loud:.85,max:1.2,pace:1},
    {key:'reversed',ask:'diff',f:680,flip:true,max:.6,pace:1},
    {key:'wavelength',ask:'lambda',f:680,quietAt:.75,max:1,pace:1}
  ];
  static units = {diff:'m',freq:'Hz',lambda:'m'};
  static limits = {diff:100,freq:1e5,lambda:100};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SpeakersModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SpeakersModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  lambda(){return SpeakersModel.v/this.config.f;}
  // Path difference (m) at a point, and the y on the microphone's line where it equals d.
  static diffAt(x,y){const h=SpeakersModel.gap/2;return Math.hypot(x,y+h)-Math.hypot(x,y-h);}
  static yFor(d){let lo=0,hi=50;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(SpeakersModel.diffAt(SpeakersModel.line,m)<d)lo=m;else hi=m;}return (lo+hi)/2;}
  yEnd(){return SpeakersModel.yFor(this.config.max);}
  micY(t){return this.yEnd()*this.clamp(t)/this.duration();}
  diff(t){return SpeakersModel.diffAt(SpeakersModel.line,this.micY(t));}
  // Loudness as a share of the loudest (both waves adding): |cos(π·Δd ÷ λ)|, or |sin| when one speaker is reversed.
  loudness(d){const p=Math.PI*d/this.lambda();return Math.abs(this.config.flip?Math.sin(p):Math.cos(p));}
  // The drawn field: both waves, slowed to one vibration per second, at a point and time.
  field(x,y,t){const h=SpeakersModel.gap/2,l=this.lambda(),s=this.clamp(t),a=Math.cos(2*Math.PI*(s-Math.hypot(x,y-h)/l)),b=Math.cos(2*Math.PI*(s-Math.hypot(x,y+h)/l));return (a+(this.config.flip?-b:b))/2;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  duration(){return 4;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 4 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,l=this.lambda();if(c.key==='quiet')return l/2;if(c.key==='secondQuiet')return 1.5*l;if(c.key==='frequency')return SpeakersModel.v/c.loud;if(c.key==='reversed')return l/2;return c.quietAt/1.5;}
  unit(){return SpeakersModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),l=this.lambda(),tol=SpeakersModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='quiet'){if(near(a,l))slip='fullWave';else if(near(a,l/4))slip='quarter';}
      else if(c.key==='secondQuiet'){if(near(a,l))slip='nextLoud';else if(near(a,2*l))slip='twoWaves';else if(near(a,l/2))slip='firstQuiet';}
      else if(c.key==='frequency'){if(near(a,SpeakersModel.v/(2*c.loud)))slip='halfWave';else if(near(a,SpeakersModel.v*c.loud))slip='multiplied';else if(near(a,c.loud/SpeakersModel.v))slip='inverted';}
      else if(c.key==='reversed'){if(near(a,l))slip='inPhaseThinking';else if(near(a,l/4))slip='quarterReversed';}
      else{if(near(a,c.quietAt))slip='diffOnly';else if(near(a,2*c.quietAt))slip='firstQuietThinking';else if(near(a,c.quietAt/2))slip='halfDiff';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SpeakersModel.missions[saved.index])return false;
    const probe=new SpeakersModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={diff:'Δd =',freq:'f =',lambda:'λ ='};
// Givens: the note, a loud spot's path difference, the reversed speaker (180°), or the second quiet spot (n = 1).
function given(m){
  if(m.key==='frequency')return 'Δd = '+plain(m.loud)+' m · v = 340 m/s';
  if(m.key==='reversed')return 'f = '+plain(m.f)+' Hz · 180°';
  if(m.key==='wavelength')return 'Δd = '+plain(m.quietAt)+' m · n = 1';
  return 'f = '+plain(m.f)+' Hz · v = 340 m/s';
}
function equation(){
  const c=model.config,e=model.exact(),l=model.lambda();
  if(c.key==='secondQuiet')return 'Δd = (1 + ½)·λ = '+plain(1.5)+' × '+plain(l)+' = '+number(e)+' m';
  if(c.key==='frequency')return 'f = v ÷ λ = 340 ÷ '+plain(c.loud)+' = '+number(e,0)+' Hz';
  if(c.key==='wavelength')return 'λ = Δd ÷ 1.5 = '+plain(c.quietAt)+' ÷ '+plain(1.5)+' = '+number(e)+' m';
  return 'Δd = ½·λ = ½ × '+plain(l)+' = '+number(e)+' m';
}
function baseEquation(){return model.config.key==='frequency'?'Δd = n·λ':'Δd = (n + ½)·λ';}
function metrics(t,begun){
  const c=model.config;
  $('freq-value').textContent=begun?number(c.f,0):'—';$('lambda-value').textContent=begun?number(model.lambda()):'—';
  $('diff-value').textContent=begun?number(model.diff(t)):'—';$('loud-value').textContent=begun?number(model.loudness(model.diff(t))*100,0):'—';
}
function values(){const c=model.config;return {d:number(model.exact()),f:number(model.exact(),0),l:number(model.lambda())};}
function runningCopy(t){const d=model.diff(t);return text('speakersCopy',{d:number(d),p:number(model.loudness(d)*100,0)});}
// The path difference (m) your answer points at.
function guessDiff(){const c=model.config,a=model.answer;if(c.ask==='diff')return a;if(c.ask==='freq')return SpeakersModel.v/a;return 1.5*a;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,y0=-2,y1=4.5,k=Math.min((g.area-40)/8,(height-150)/(y1-y0)),W=Math.min(12,Math.max(8,(g.area-40)/k)),x0=24,top=58,X=x=>x0+x*k,Y=y=>top+(y1-y)*k,h=SpeakersModel.gap/2,L=SpeakersModel.line;
  // The room from above, stretched to fill the scene: the two waves add where bright or dark, and cancel where grey.
  box(X(0),Y(y1),W*k,(y1-y0)*k,'#2b3a48');
  if(g.begun){const cell=Math.min(.125,model.lambda()/6);for(let x=0;x<W;x+=cell)for(let y=y0;y<y1;y+=cell){const v=model.field(x+cell/2,y+cell/2,s),r=Math.round(43+v*70),gg=Math.round(58+v*90),b=Math.round(72+v*110);box(X(x),Y(y+cell),cell*k+.5,cell*k+.5,'rgb('+r+','+gg+','+b+')');}}
  for(const sy of [h,-h]){box(X(0)-12,Y(sy)-10,16,20,'#d9cfb8');}
  label(text('speakerTag'),X(0)+6,Y(h)-14,'#d1e3ed','left',9);if(c.flip)label('180°',X(0)+6,Y(-h)+24,'#efb958','left',9);
  line([{x:X(L),y:Y(0)},{x:X(L),y:Y(model.yEnd())}],'#f2f8fc',1,[3,4]);
  if(g.option){for(let m=0;m<=W;m++){line([{x:X(m),y:Y(y0)},{x:X(m),y:Y(y0)+5}],'#9fb6c7',1);if(m%2===0)label(plain(m)+' m',X(m),Y(y0)+16,'#9fb6c7','center',8);}}
  // Your answer: an orange mark where the path difference has your value.
  if(g.guess){const gd=guessDiff();if(gd<SpeakersModel.gap*.98){const gy=SpeakersModel.yFor(gd);if(gy<=y1){line([{x:X(L)-12,y:Y(gy)},{x:X(L)+12,y:Y(gy)}],'#efb958',3);fit(text('guessTag'),X(L)-16,Y(gy)+4,'#efb958',9,120,'right');}}}
  const my=g.begun?model.micY(s):0;dot(X(L),Y(my),6,'#f2f8fc');label(text('micTag'),X(L)+10,Y(my)-8,'#f2f8fc','left',9);
  fit(text('slowTag'),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('loudGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Loudness against the path difference as the microphone walks: dips where the waves cancel.
  const M=c.max,px0=g.area+14,px1=width-14,py0=90,py1=height-90,PX=d=>px0+d/M*(px1-px0),PY=a=>py1-a*(py1-py0),dn=model.diff(Math.min(g.t,model.duration()));
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  const step=M>1.5?.5:M>.8?.25:.1;for(let d=0;d<=M+1e-9;d+=step){line([{x:PX(d),y:py1},{x:PX(d),y:py1+4}],'#9fb6c7',1);label(plain(Math.round(d*100)/100),PX(d),py1+14,'#9fb6c7','center',8);}
  if(g.guess){const gd=guessDiff();if(gd<=M)line([{x:PX(gd),y:py0},{x:PX(gd),y:py1}],'#efb958',1.5,[5,4]);}
  const pts=[];for(let i=0;i<=300;i++){const d=dn*i/300;pts.push({x:PX(d),y:PY(model.loudness(d))});}line(pts,'#f2f8fc',2);dot(PX(dn),PY(model.loudness(dn)),4,'#f2f8fc');
  fit(text('diffAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
