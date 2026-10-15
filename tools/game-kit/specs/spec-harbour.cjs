module.exports = {
kind:'harbour',model:'HarbourModel',title:'Harbour Gap',symbol:'θ =',unit:'°',equation:'sin θ = λ ÷ a',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','waveLegend'],['white','probeLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['lambda-value','lambdaMetric','m','λ'],['gap-value','gapMetric','m','a'],['probe-value','probeMetric','°','θ'],['height-value','heightMetric','%','A']],
modelCode:String.raw`
class HarbourModel {
  // Diffraction. Straight sea waves reach a gap of width a in a harbour wall and spread out behind it. Far from the gap the
  // height of the waves in a direction θ from straight ahead is |sin β ÷ β| of the height straight ahead, β = π·a·sin θ ÷ λ:
  // the first calm direction is sin θ = λ ÷ a. The narrower the gap compared with λ, the wider the spread; once a ≤ λ there
  // is no calm direction and the waves fill the harbour. A run sweeps a wave gauge from straight ahead (0°) to the wall (90°).
  static tolerance = .02;
  static missions = [
    {key:'calm',ask:'angle',lambda:10,a:20,pace:1},
    {key:'gap',ask:'gap',lambda:6,boat:30,pace:1},
    {key:'wavelength',ask:'lambda',a:14,calmAt:35,pace:1},
    {key:'spread',ask:'widest',lambda:15,pace:1},
    {key:'period',ask:'angle',v:5,T:2,a:25,pace:1}
  ];
  static units = {angle:'°',gap:'m',lambda:'m',widest:'m'};
  static limits = {angle:90,gap:1000,lambda:1000,widest:1000};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=HarbourModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=HarbourModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The real wavelength and gap of each test.
  lambda(){const c=this.config;if(c.v)return c.v*c.T;if(c.calmAt)return c.a*Math.sin(c.calmAt*Math.PI/180);return c.lambda;}
  gap(){const c=this.config;if(c.boat)return c.lambda/Math.sin(c.boat*Math.PI/180);if(c.key==='spread')return c.lambda;return c.a;}
  // Relative wave height (signed) far behind the gap in direction θ (degrees), and the first calm direction (null if none).
  static sinc(b){return Math.abs(b)<1e-9?1:Math.sin(b)/b;}
  amplitude(theta){return HarbourModel.sinc(Math.PI*this.gap()*Math.sin(theta*Math.PI/180)/this.lambda());}
  calmAngle(){const s=this.lambda()/this.gap();return s>1+1e-12?null:Math.asin(Math.min(1,s))*180/Math.PI;}
  // The drawn sea, slowed to one crest a second: straight waves in front of the wall (x < 0), spreading ones behind it.
  field(x,y,t){const s=this.clamp(t),l=this.lambda();if(x<0)return Math.cos(2*Math.PI*(x/l-s));const r=Math.hypot(x,y),th=Math.atan2(Math.abs(y),x)*180/Math.PI;return this.amplitude(th)*Math.cos(2*Math.PI*(r/l-s));}
  probe(t){return 90*this.clamp(t)/this.duration();}
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
  exact(){const c=this.config;if(c.ask==='angle')return this.calmAngle();if(c.ask==='lambda')return this.lambda();return this.gap();}
  unit(){return HarbourModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),l=this.lambda(),d=Math.PI/180,tol=HarbourModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='calm'){if(near(a,l/c.a))slip='sineOnly';else if(near(a,Math.atan(l/c.a)/d))slip='tangent';else if(near(a,90-e))slip='fromWall';}
      else if(c.key==='gap'){if(near(a,l*Math.sin(c.boat*d)))slip='multiplied';else if(near(a,l/Math.tan(c.boat*d)))slip='tangentGap';else if(near(a,l))slip='lambdaOnly';else if(near(a,l/Math.cos(c.boat*d)))slip='cosine';}
      else if(c.key==='wavelength'){if(near(a,c.a/Math.sin(c.calmAt*d)))slip='divided';else if(near(a,c.a*Math.tan(c.calmAt*d)))slip='tangentLambda';else if(near(a,c.a*Math.cos(c.calmAt*d)))slip='cosineLambda';}
      else if(c.key==='spread'){if(near(a,l/2))slip='halfGap';else if(near(a,2*l))slip='doubleGap';}
      else{if(near(a,Math.asin(c.v/c.a)/d))slip='speedOnly';else if(near(a,Math.asin(c.v/c.T/c.a)/d))slip='dividedPeriod';else if(near(a,Math.atan(l/c.a)/d))slip='tangent';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!HarbourModel.missions[saved.index])return false;
    const probe=new HarbourModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={angle:'θ =',gap:'a =',lambda:'λ =',widest:'a ='};
// Givens: the wavelength and gap, the wavelength and the boat's direction, the gap and the calm direction, the wavelength
// for the widest spread, or the waves' speed and period with the gap.
function given(m){
  if(m.key==='gap')return 'λ = '+plain(m.lambda)+' m · θ = '+plain(m.boat)+'°';
  if(m.key==='wavelength')return 'a = '+plain(m.a)+' m · θ = '+plain(m.calmAt)+'°';
  if(m.key==='spread')return 'λ = '+plain(m.lambda)+' m · θ = 90°';
  if(m.key==='period')return 'v = '+plain(m.v)+' m/s · T = '+plain(m.T)+' s · a = '+plain(m.a)+' m';
  return 'λ = '+plain(m.lambda)+' m · a = '+plain(m.a)+' m';
}
function equation(){
  const c=model.config,e=model.exact(),l=model.lambda();
  if(c.key==='gap')return 'a = λ ÷ sin θ = '+plain(l)+' ÷ sin '+plain(c.boat)+'° = '+number(e,1)+' m';
  if(c.key==='wavelength')return 'λ = a·sin θ = '+plain(c.a)+' × sin '+plain(c.calmAt)+'° = '+number(e)+' m';
  if(c.key==='spread')return 'a = λ ÷ sin 90° = '+plain(l)+' ÷ 1 = '+number(e,1)+' m';
  if(c.key==='period')return 'sin θ = v·T ÷ a = '+plain(l)+' ÷ '+plain(c.a)+' → θ = '+number(e,1)+'°';
  return 'sin θ = λ ÷ a = '+plain(l)+' ÷ '+plain(c.a)+' → θ = '+number(e,1)+'°';
}
function baseEquation(){return model.config.key==='period'?'λ = v·T':'sin θ = λ ÷ a';}
// The asked quantity stays hidden until the run is over.
function metrics(t,begun){
  const c=model.config,over=model.status==='done',show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&!over?'?':v;},p=model.probe(t);
  show('lambda-value',number(model.lambda()),c.ask==='lambda');show('gap-value',number(model.gap()),c.ask==='gap'||c.ask==='widest');
  show('probe-value',number(p,0));show('height-value',number(Math.abs(model.amplitude(p))*100,0));
}
function values(){const c=model.config;return {e:number(model.exact(),c.ask==='lambda'?2:1),l:number(model.lambda(),0)};}
function runningCopy(t){const p=model.probe(t);return text('harbourCopy',{a:number(p,0),h:number(Math.abs(model.amplitude(p))*100,0)});}
// The calm direction your answer points at (null if your gap is narrower than the wavelength), and the gap it implies.
function guessAngle(){const c=model.config,a=model.answer,l=model.lambda(),as=s=>s>1?null:Math.asin(s)*180/Math.PI;if(c.ask==='angle')return a;if(c.ask==='lambda')return as(a/c.a);return as(l/a);}
function guessGap(){const c=model.config;return c.ask==='gap'||c.ask==='widest'?model.answer:null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,xL=-25,yB=-55,yT=55,k=Math.min((g.area-40)/120,(height-150)/(yT-yB)),xR=xL+Math.min(185,Math.max(120,(g.area-40)/k)),x0=24,top=58,X=x=>x0+(x-xL)*k,Y=y=>top+(yT-y)*k,l=model.lambda(),a=model.gap(),hideGap=!g.begun&&(c.ask==='gap'||c.ask==='widest');
  // The harbour from above, stretched to fill the scene: open sea on the left, the wall at x = 0 with its gap, water behind.
  box(X(xL),Y(yT),(xR-xL)*k,(yT-yB)*k,'#2b3a48');
  if(g.begun){const cell=Math.max(1.2,l/5);for(let x=xL;x<xR;x+=cell)for(let y=yB;y<yT;y+=cell){const v=model.field(x+cell/2,y+cell/2,s);box(X(x),Y(y+cell),cell*k+.5,cell*k+.5,'rgb('+Math.round(43+v*70)+','+Math.round(58+v*90)+','+Math.round(72+v*110)+')');}}
  const half=hideGap?0:a/2;box(X(-1),Y(yT),2*k,(yT-half)*k,'#d9cfb8');box(X(-1),Y(-half),2*k,(-half-yB)*k,'#d9cfb8');
  if(hideGap)label('?',X(0)+8,Y(0)+4,'#efb958','left',13);
  label(text('wallTag'),X(1)+6,Y(yT)+14,'#d1e3ed','left',9);label(text('seaTag'),X(xL)+6,Y(yB)-8,'#d1e3ed','left',9);
  if(g.option){for(let m=0;m<=xR;m+=10){line([{x:X(m),y:Y(yB)},{x:X(m),y:Y(yB)+5}],'#9fb6c7',1);if(m%20===0&&m>0)label(plain(m)+' m',X(m),Y(yB)+16,'#9fb6c7','center',8);}}
  // Moored boats at 15°, 30°, and 50°, 48 m from the gap: they rock with the waves where they are.
  for(const th of [15,30,50]){const r=48,bx=r*Math.cos(th*Math.PI/180),by=r*Math.sin(th*Math.PI/180),v=g.begun?model.field(bx,by,s):0,tilt=.5*v,px=X(bx),py=Y(by);line([{x:px-7*Math.cos(tilt),y:py-7*Math.sin(tilt)},{x:px+7*Math.cos(tilt),y:py+7*Math.sin(tilt)}],'#f2f8fc',3);line([{x:px,y:py},{x:px+7*Math.sin(tilt),y:py-7*Math.cos(tilt)}],'#f2f8fc',1);}
  label(text('boatTag'),X(48*Math.cos(50*Math.PI/180))+10,Y(48*Math.sin(50*Math.PI/180))-6,'#f2f8fc','left',9);
  // Your answer: the calm directions it implies (dashed orange), and the gap it implies on the wall.
  if(g.guess){const ga=guessAngle(),gg=guessGap();if(ga!==null)for(const sg of [1,-1]){const R=Math.min((xR-1)/Math.max(Math.cos(ga*Math.PI/180),.01),(yT-1)/Math.max(Math.sin(ga*Math.PI/180),.01));line([{x:X(0),y:Y(0)},{x:X(R*Math.cos(ga*Math.PI/180)),y:Y(sg*R*Math.sin(ga*Math.PI/180))}],'#efb958',1.5,[6,5]);}
    if(gg!==null&&gg/2<yT)for(const sg of [1,-1])line([{x:X(-4),y:Y(sg*gg/2)},{x:X(4),y:Y(sg*gg/2)}],'#efb958',3);
    const at=ga!==null?{x:X(30*Math.cos(ga*Math.PI/180))+6,y:Y(30*Math.sin(ga*Math.PI/180))-6}:{x:X(4)+4,y:Y(Math.min(gg/2,yT-4))-6};fit(text('guessTag'),at.x,at.y,'#efb958',9,120);}
  // The wave gauge sweeping round from straight ahead.
  if(g.begun){const p=model.probe(s)*Math.PI/180,R=44;line([{x:X(0),y:Y(0)},{x:X(R*Math.cos(p)),y:Y(R*Math.sin(p))}],'#f2f8fc',1,[2,4]);dot(X(R*Math.cos(p)),Y(R*Math.sin(p)),4,'#f2f8fc');}
  fit(text('slowTag'),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('heightGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Wave height against direction, measured by the gauge as it sweeps: dips to zero in the calm directions.
  const px0=g.area+14,px1=width-14,py0=90,py1=height-90,PX=th=>px0+th/90*(px1-px0),PY=v=>py1-v*(py1-py0),p=model.probe(Math.min(g.t,model.duration()));
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  for(let th=0;th<=90;th+=15){line([{x:PX(th),y:py1},{x:PX(th),y:py1+4}],'#9fb6c7',1);if(th%30===0)label(plain(th)+'°',PX(th),py1+14,'#9fb6c7','center',8);}
  if(g.guess){const ga=guessAngle();if(ga!==null)line([{x:PX(ga),y:py0},{x:PX(ga),y:py1}],'#efb958',1.5,[5,4]);}
  const pts=[];for(let i=0;i<=300;i++){const th=p*i/300;pts.push({x:PX(th),y:PY(Math.abs(model.amplitude(th)))});}line(pts,'#f2f8fc',2);dot(PX(p),PY(Math.abs(model.amplitude(p))),4,'#f2f8fc');
  fit(text('angleAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
