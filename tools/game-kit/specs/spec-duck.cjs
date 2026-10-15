module.exports = {
kind:'duck',model:'DuckModel',title:'Paddling Duck',symbol:"λ' =",unit:'cm',equation:"λ' = (v ∓ v_s) ÷ f",
toggle:['show-ruler','rulerToggle'],
legends:[['blue','rippleLegend'],['white','duckLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['duck-value','duckMetric','cm/s','v_s'],['freq-value','freqMetric','Hz','f'],['ahead-value','aheadMetric','cm',"λ'"],['behind-value','behindMetric','cm',"λ'"]],
modelCode:String.raw`
class DuckModel {
  // The Doppler effect on water. A duck paddles f times a second while swimming at v_s, and each paddle sends out a circular
  // ripple at speed v from where the duck is. Ahead the ripples bunch up, λ = (v − v_s) ÷ f; behind they spread out,
  // λ = (v + v_s) ÷ f. A duck faster than its ripples overtakes them: they pile up into a V-shaped bow wave whose arms make
  // an angle θ with its path, sin θ = v ÷ v_s. Lengths in cm, times in s; a run lasts 4 s at real speed.
  static tolerance = .02;
  static missions = [
    {key:'ahead',ask:'ahead',v:30,vs:10,f:2,pace:1},
    {key:'behind',ask:'behind',v:25,vs:15,f:2.5,pace:1},
    {key:'speed',ask:'speed',v:30,f:3,lambda:6,pace:1},
    {key:'bow',ask:'angle',v:25,vs:50,f:2,pace:1},
    {key:'frequency',ask:'freq',v:30,vs:6,lambda:12,pace:1}
  ];
  static units = {ahead:'cm',behind:'cm',speed:'cm/s',angle:'°',freq:'Hz'};
  static limits = {ahead:1e5,behind:1e5,speed:1e5,angle:90,freq:1e4};
  static start = 30;
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=DuckModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=DuckModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The real duck speed and paddling frequency of each test, and the ripple spacing ahead (null if the duck outruns them).
  speed(){const c=this.config;return c.vs??c.v-c.lambda*c.f;}
  freq(){const c=this.config;return c.f??(c.v+c.vs)/c.lambda;}
  ahead(){const d=this.config.v-this.speed();return d>0?d/this.freq():null;}
  behind(){return (this.config.v+this.speed())/this.freq();}
  bowAngle(){const r=this.config.v/this.speed();return r<1?Math.asin(r)*180/Math.PI:null;}
  // The duck's position along its path (cm), and the ripples so far: where each was sent from and its radius now.
  position(t){return DuckModel.start+this.speed()*this.clamp(t);}
  ripples(t){const s=this.clamp(t),f=this.freq(),out=[];for(let n=0;n/f<=s+1e-12;n++){const q=n/f;out.push({x:this.position(q),r:this.config.v*(s-q)});}return out;}
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
  exact(){const a=this.config.ask;if(a==='ahead')return this.ahead();if(a==='behind')return this.behind();if(a==='speed')return this.speed();if(a==='angle')return this.bowAngle();return this.freq();}
  unit(){return DuckModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=DuckModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='ahead'){if(near(a,this.behind()))slip='behindInstead';else if(near(a,c.v/c.f))slip='stillWater';else if(near(a,(c.v-c.vs)*c.f))slip='multipliedF';}
      else if(c.key==='behind'){if(near(a,this.ahead()))slip='aheadInstead';else if(near(a,c.v/c.f))slip='stillWater';else if(near(a,(c.v+c.vs)*c.f))slip='multipliedF';}
      else if(c.key==='speed'){if(near(a,c.lambda*c.f))slip='lambdaTimesF';else if(near(a,c.v-c.lambda/c.f))slip='dividedF';else if(near(a,c.v/c.f-c.lambda))slip='spacingDifference';}
      else if(c.key==='bow'){if(near(a,90-e))slip='complement';else if(near(a,c.v/c.vs))slip='sineOnly';else if(near(a,Math.atan(c.v/c.vs)*180/Math.PI))slip='tangent';}
      else{if(near(a,c.v/c.lambda))slip='ignoredDuck';else if(near(a,(c.v-c.vs)/c.lambda))slip='wrongSide';else if(near(a,c.lambda*(c.v+c.vs)))slip='multipliedL';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!DuckModel.missions[saved.index])return false;
    const probe=new DuckModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={ahead:"λ' =",behind:"λ' =",speed:'v_s =',angle:'θ =',freq:'f ='};
// Givens: ripple speed v, duck speed, paddling frequency, or a measured spacing in place of the unknown.
function given(m){
  if(m.key==='speed')return 'v = '+plain(m.v)+" cm/s · f = "+plain(m.f)+" Hz · λ' = "+plain(m.lambda)+' cm';
  if(m.key==='bow')return 'v = '+plain(m.v)+' cm/s · v_s = '+plain(m.vs)+' cm/s';
  if(m.key==='frequency')return 'v = '+plain(m.v)+' cm/s · v_s = '+plain(m.vs)+" cm/s · λ' = "+plain(m.lambda)+' cm';
  return 'v = '+plain(m.v)+' cm/s · v_s = '+plain(m.vs)+' cm/s · f = '+plain(m.f)+' Hz';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.key==='behind')return "λ' = ("+plain(c.v)+' + '+plain(c.vs)+') ÷ '+plain(c.f)+' = '+number(e,1)+' cm';
  if(c.key==='speed')return 'v_s = '+plain(c.v)+' − '+plain(c.lambda)+' × '+plain(c.f)+' = '+number(e,1)+' cm/s';
  if(c.key==='bow')return 'sin θ = '+plain(c.v)+' ÷ '+plain(c.vs)+' → θ = '+number(e,1)+'°';
  if(c.key==='frequency')return 'f = ('+plain(c.v)+' + '+plain(c.vs)+') ÷ '+plain(c.lambda)+' = '+number(e)+' Hz';
  return "λ' = ("+plain(c.v)+' − '+plain(c.vs)+') ÷ '+plain(c.f)+' = '+number(e,1)+' cm';
}
function baseEquation(){return model.config.key==='bow'?'sin θ = v ÷ v_s':"λ' = (v ∓ v_s) ÷ f";}
// The asked quantity stays hidden until the run is over; a duck faster than its ripples has none ahead.
function metrics(t,begun){
  const a=model.config.ask,over=model.status==='done',show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&!over?'?':v;},ah=model.ahead();
  show('duck-value',number(model.speed(),1),a==='speed');show('freq-value',number(model.freq()),a==='freq');
  show('ahead-value',ah===null?'—':number(ah,1),a==='ahead');show('behind-value',number(model.behind(),1),a==='behind');
}
function values(){const a=model.config.ask;return {e:number(model.exact(),a==='freq'?2:1)};}
function runningCopy(t){return text('duckCopy',{n:plain(model.ripples(t).length)});}
// What your answer implies: a spacing ahead or behind (cm), or the bow wave's angle.
function guessSpacing(){const c=model.config,a=model.answer;if(c.ask==='ahead'||c.ask==='behind')return a;if(c.ask==='speed')return c.lambda;if(c.ask==='freq')return c.lambda;return null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,W=240,Hh=80,k=Math.min((g.area-40)/W,(height-150)/(2*Hh)),x0=24+((g.area-40)-W*k)/2,top=58,X=x=>x0+x*k,Y=y=>top+(Hh-y)*k;
  // A pond from above: every paddle sends out a ring from where the duck was; the rings crowd ahead and spread behind.
  box(X(0),Y(Hh),W*k,2*Hh*k,'#1f4152');
  if(g.begun){ctx.save();ctx.beginPath();ctx.rect(X(0),Y(Hh),W*k,2*Hh*k);ctx.clip();
    for(const rp of model.ripples(s)){if(rp.r<=0)continue;const pts=[];for(let i=0;i<=64;i++){const a=2*Math.PI*i/64;pts.push({x:X(rp.x+rp.r*Math.cos(a)),y:Y(rp.r*Math.sin(a))});}line(pts,'#8fd0ff',1.4);}
    ctx.restore();}
  line([{x:X(0),y:Y(0)},{x:X(W),y:Y(0)}],'#4f7286',1,[4,6]);
  const dx=model.position(g.begun?s:0);box(X(dx)-9,Y(0)-6,18,12,'#f2f8fc');dot(X(dx)+9,Y(0)-4,4,'#f2f8fc');label(text('duckTag'),X(dx),Y(0)-12,'#f2f8fc','center',9);
  // Your answer: orange marks a guessed spacing apart, ahead of the duck or behind it, or the guessed bow wave.
  if(g.guess){const gs=guessSpacing(),side=c.ask==='behind'||c.key==='frequency'?-1:1;
    if(gs!==null){for(let n=1;n<=4;n++){const gx=dx+side*n*gs;if(gx>=0&&gx<=W)line([{x:X(gx),y:Y(0)-8},{x:X(gx),y:Y(0)+8}],'#efb958',2.5);}fit(text('guessTag'),X(dx+side*gs)+(side>0?4:-4),Y(0)+22,'#efb958',9,110,side>0?'left':'right');}
    else{const th=model.answer*Math.PI/180;for(const sg of [1,-1])line([{x:X(dx),y:Y(0)},{x:X(dx-120*Math.cos(th)),y:Y(sg*120*Math.sin(th))}],'#efb958',1.5,[6,5]);fit(text('guessTag'),X(dx)-8,Y(0)+22,'#efb958',9,110,'right');}}
  if(g.option){for(let m=0;m<=W;m+=10){line([{x:X(m),y:Y(-Hh)},{x:X(m),y:Y(-Hh)+(m%50?3:6)}],'#9fb6c7',1);if(m%50===0)label(plain(m)+' cm',X(m),Y(-Hh)+16,'#9fb6c7','center',8);}}
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('profileGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // A side view along the duck's path: each ripple crest crossing the path is a peak, close together ahead, wide behind.
  const s=Math.min(g.t,model.duration()),W=240,px0=g.area+14,px1=width-14,py=(height)/2,PX=x=>px0+x/W*(px1-px0),dx=model.position(s),crests=[];
  for(const rp of model.ripples(s)){if(rp.r<=0)continue;crests.push(rp.x+rp.r,rp.x-rp.r);}
  const pts=[];for(let i=0;i<=400;i++){const x=W*i/400;let h=0;for(const cx of crests)h=Math.max(h,Math.exp(-(((x-cx)/2.2)**2)));pts.push({x:PX(x),y:py-h*40});}line(pts,'#8fd0ff',2);
  line([{x:px0,y:py},{x:px1,y:py}],'#4f7286',1);dot(PX(dx),py-6,5,'#f2f8fc');
  for(let m=0;m<=W;m+=50){line([{x:PX(m),y:py+50},{x:PX(m),y:py+54}],'#9fb6c7',1);label(plain(m),PX(m),py+64,'#9fb6c7','center',8);}
  fit(text('pathAxis'),px0,py+80,'#9fb6c7',9,px1-px0);
}
`
};
