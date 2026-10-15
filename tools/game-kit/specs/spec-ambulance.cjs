module.exports = {
kind:'ambulance',model:'AmbulanceModel',title:'Ambulance Pass-by',symbol:"f' =",unit:'Hz',equation:"f' = f·v ÷ (v ∓ v_s)",
toggle:['show-ruler','rulerToggle'],
legends:[['blue','waveLegend'],['white','pitchLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['siren-value','sirenMetric','Hz','f'],['speed-value','speedMetric','m/s','v_s'],['ahead-value','aheadMetric','Hz',"f'"],['behind-value','behindMetric','Hz',"f'"]],
modelCode:String.raw`
class AmbulanceModel {
  // The Doppler effect for a moving source. A siren of frequency f moves at v_s through still air where sound travels at
  // v = 340 m/s. Each wave crest leaves from where the siren is at that moment, so crests bunch up ahead and spread out
  // behind: a listener it approaches hears f·v ÷ (v − v_s), one it leaves behind hears f·v ÷ (v + v_s). A run shows the
  // crests spreading as circles (sound drawn far slower than real, keeping v_s ÷ v) and the pitch heard by someone 10 m
  // from the road as the ambulance passes, from 2 s before to 2 s after.
  static tolerance = .02;
  static v = 340;
  static missions = [
    {key:'approach',ask:'ahead',f:700,vs:30,pace:1},
    {key:'leave',ask:'behind',f:700,vs:30,pace:1},
    {key:'speed',ask:'speed',f:700,heard:750,pace:1},
    {key:'source',ask:'siren',heard:680,vs:20,pace:1},
    {key:'octave',ask:'speed',f:700,factor:2,pace:1}
  ];
  static units = {ahead:'Hz',behind:'Hz',speed:'m/s',siren:'Hz'};
  static limits = {ahead:1e5,behind:1e5,speed:1e4,siren:1e5};
  static roadside = 10;
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=AmbulanceModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=AmbulanceModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The real siren frequency and speed of each test.
  siren(){const c=this.config;return c.f??c.heard*(AmbulanceModel.v+c.vs)/AmbulanceModel.v;}
  speed(){const c=this.config,v=AmbulanceModel.v;if(c.heard&&c.f)return v*(1-c.f/c.heard);if(c.factor)return v*(1-1/c.factor);return c.vs;}
  ahead(){return this.siren()*AmbulanceModel.v/(AmbulanceModel.v-this.speed());}
  behind(){return this.siren()*AmbulanceModel.v/(AmbulanceModel.v+this.speed());}
  // Where the ambulance is (m along the road, 0 when level with the roadside listener), and the pitch that listener hears.
  position(t){return this.speed()*(this.clamp(t)-2);}
  heard(t){const x=this.position(t),r=Math.hypot(x,AmbulanceModel.roadside);return this.siren()*AmbulanceModel.v/(AmbulanceModel.v+this.speed()*x/r);}
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
  exact(){const a=this.config.ask;if(a==='ahead')return this.ahead();if(a==='behind')return this.behind();if(a==='siren')return this.siren();return this.speed();}
  unit(){return AmbulanceModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),v=AmbulanceModel.v,f=this.siren(),vs=this.speed(),tol=AmbulanceModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='approach'){if(near(a,this.behind()))slip='leavingFormula';else if(near(a,f+vs))slip='addedSpeed';}
      else if(c.key==='leave'){if(near(a,this.ahead()))slip='approachingFormula';else if(near(a,f-vs))slip='subtractedSpeed';}
      else if(c.key==='speed'){if(near(a,c.heard-c.f))slip='pitchDifference';else if(near(a,v*(c.heard-c.f)/c.f))slip='wrongBase';else if(near(a,v*(c.heard-c.f)/(c.heard+c.f)))slip='averageBase';}
      else if(c.key==='source'){if(near(a,c.heard*(v-c.vs)/v))slip='wrongSign';else if(near(a,c.heard+c.vs))slip='addedHz';}
      else{if(near(a,v))slip='soundSpeed';else if(near(a,v/3))slip='leavingOctave';else if(near(a,2*v))slip='doubleSound';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!AmbulanceModel.missions[saved.index])return false;
    const probe=new AmbulanceModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={ahead:"f' =",behind:"f' =",speed:'v_s =',siren:'f ='};
// Givens: the siren and its speed, the siren and the pitch heard ahead, the pitch heard behind and the speed, or an octave.
function given(m){
  if(m.key==='speed')return 'f = '+plain(m.f)+" Hz · f' = "+plain(m.heard)+' Hz';
  if(m.key==='source')return "f' = "+plain(m.heard)+' Hz · v_s = '+plain(m.vs)+' m/s';
  if(m.key==='octave')return 'f = '+plain(m.f)+" Hz · f' = 2·f";
  return 'f = '+plain(m.f)+' Hz · v_s = '+plain(m.vs)+' m/s';
}
function equation(){
  const c=model.config,e=model.exact(),v=AmbulanceModel.v;
  if(c.key==='leave')return "f' = "+plain(c.f)+' × 340 ÷ (340 + '+plain(c.vs)+') = '+number(e,0)+' Hz';
  if(c.key==='speed')return 'v_s = 340 × '+plain(c.heard-c.f)+' ÷ '+plain(c.heard)+' = '+number(e,1)+' m/s';
  if(c.key==='source')return 'f = '+plain(c.heard)+' × (340 + '+plain(c.vs)+') ÷ 340 = '+number(e,0)+' Hz';
  if(c.key==='octave')return 'v_s = v ÷ 2 = 340 ÷ 2 = '+number(e,0)+' m/s';
  return "f' = "+plain(c.f)+' × 340 ÷ (340 − '+plain(c.vs)+') = '+number(e,0)+' Hz';
}
function baseEquation(){return "f' = f·v ÷ (v ∓ v_s)";}
// The asked quantity stays hidden until the run is over.
function metrics(t,begun){
  const a=model.config.ask,over=model.status==='done',show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&!over?'?':v;};
  show('siren-value',number(model.siren(),0),a==='siren');show('speed-value',number(model.speed(),1),a==='speed');
  show('ahead-value',number(model.ahead(),0),a==='ahead');show('behind-value',number(model.behind(),0),a==='behind');
}
function values(){return {e:number(model.exact(),model.config.ask==='speed'?1:0)};}
function runningCopy(t){return text('ambulanceCopy',{p:number(model.heard(t),0)});}
// The pitch your answer implies: heard ahead, heard behind, or ahead for a guessed speed (null if at or above v).
function guessPitch(){const c=model.config,a=model.answer,v=AmbulanceModel.v;if(c.ask==='ahead'||c.ask==='behind')return a;if(c.ask==='siren')return a*v/(v+c.vs);return a<v?model.siren()*v/(v-a):null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,yH=40,k=Math.min((g.area-40)/100,(height-150)/(2*yH)),xR=Math.min(160,Math.max(100,(g.area-40)/k)),x0=24+((g.area-40)-xR*k)/2,top=58,X=x=>x0+x*k,Y=y=>top+(yH-y)*k;
  // A street from above, stretched to fill the scene. Sound is drawn far slower than real (25 units a second) but with the true ratio v_s ÷ v; the
  // siren sends out a crest every third of a second from wherever it is.
  const cs=25,va=cs*model.speed()/AmbulanceModel.v,xs=35,pos=q=>xs+va*q;
  box(X(0),Y(yH),xR*k,2*yH*k,'#24313e');box(X(0),Y(5),xR*k,10*k,'#3a4652');line([{x:X(0),y:Y(0)},{x:X(xR),y:Y(0)}],'#9fb6c7',1,[8,8]);
  if(g.begun){ctx.save();ctx.beginPath();ctx.rect(X(0),Y(yH),xR*k,2*yH*k);ctx.clip();
    for(let n=0;n/3<=s;n++){const q=n/3,r=cs*(s-q),cx=pos(q),pts=[];if(r<=0)continue;for(let i=0;i<=64;i++){const a=2*Math.PI*i/64;pts.push({x:X(cx+r*Math.cos(a)),y:Y(r*Math.sin(a))});}line(pts,'#77b9ff',1.4);}
    ctx.restore();}
  const ax=pos(g.begun?s:0);box(X(ax)-14,Y(0)-7,28,14,'#f2f8fc');box(X(ax)-4,Y(0)-7,8,14,'#e0525a');label(text('ambulanceTag'),X(ax),Y(0)-12,'#f2f8fc','center',9);
  // Two listeners on the road: one the ambulance drives towards, one it leaves behind.
  for(const [lx,key] of [[xR-5,'aheadTag'],[5,'behindTag']]){dot(X(lx),Y(0),5,'#efd38a');label(text(key),X(lx),Y(-9),'#efd38a','center',9);}
  if(g.option){for(let m=0;m<=xR;m+=10)line([{x:X(m),y:Y(-yH)},{x:X(m),y:Y(-yH)-4}],'#9fb6c7',1);label(text('crestTag'),X(2),Y(-yH)-8,'#9fb6c7','left',8);}
  fit(text('slowTag'),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('pitchGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The pitch a listener 10 m from the road hears as the ambulance passes: high, a quick glide down, then low.
  const gp=g.guess?guessPitch():null,hi=Math.max(model.ahead(),gp??0),lo=Math.min(model.behind(),gp??Infinity),pad=(hi-lo)*.12+1,top=hi+pad,bot=lo-pad;
  const px0=g.area+40,px1=width-14,py0=90,py1=height-90,PX=q=>px0+q/4*(px1-px0),PY=f=>py1-(f-bot)/(top-bot)*(py1-py0),upto=Math.min(g.t,model.duration());
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  for(let q=0;q<=4;q++){line([{x:PX(q),y:py1},{x:PX(q),y:py1+4}],'#9fb6c7',1);label(plain(q),PX(q),py1+14,'#9fb6c7','center',8);}
  for(const f of [model.ahead(),model.siren(),model.behind()]){line([{x:px0,y:PY(f)},{x:px1,y:PY(f)}],'#4b6275',1,[3,5]);label(plain(Math.round(f)),px0-4,PY(f)+3,'#9fb6c7','right',8);}
  if(gp!==null)line([{x:px0,y:PY(gp)},{x:px1,y:PY(gp)}],'#efb958',1.5,[5,4]);
  const pts=[];for(let i=0;i<=300;i++){const q=upto*i/300;pts.push({x:PX(q),y:PY(model.heard(q))});}line(pts,'#f2f8fc',2);dot(PX(upto),PY(model.heard(upto)),4,'#f2f8fc');
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
