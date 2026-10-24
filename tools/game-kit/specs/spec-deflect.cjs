module.exports = {
kind:'deflect',model:'DeflectModel',title:'Electron Beam',symbol:'E =',unit:'V/m',equation:'y = ½·(q·E ÷ m)·(L ÷ v₀)²',sci:true,timeUnit:'ns',
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .deflect-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-arrows','arrowsToggle'],
legends:[['white','velocityLegend'],['blue','forceLegend'],['gray','fieldLegend'],['orange','guessLegend']],
metrics:[['field-value','fieldMetric','V/m','E = V ÷ d','vector'],['accel-value','accelMetric','m/s²','a_y','vector'],['height-value','heightMetric','','y','scalar'],['vy-value','vyMetric','m/s','v_y','vector']],
modelCode:String.raw`
class DeflectModel {
  // A cathode-ray tube seen from the side. A particle leaves the gun along the axis at v₀ and enters the gap between two
  // horizontal plates d apart and L long, top plate positive. Between the plates the field is uniform, E = V ÷ d, pointing
  // from + to −, with no fringe outside them; the force q·E is steady and vertical, so the particle keeps v₀ along the tube
  // and gains a = q·E ÷ m across it: the path is a parabola, y = ½·a·(x ÷ v₀)², and a straight line after the plates. An
  // electron (−e) is pulled up toward the + plate, a proton (+e) is pushed down. Gravity is ignored (about 10¹⁴ times
  // smaller), every speed is under 9% of the speed of light so the model is non-relativistic, and a particle whose bend
  // reaches a plate stops on it at that exact moment. Up is positive. Time is in ns; each run is slowed so it lasts about 4 s.
  static e = 1.602e-19;
  static me = 9.109e-31;
  static mp = 1.673e-27;
  static gun = -.02;
  static L = .05;
  static d = .02;
  static screen = .12;
  static tolerance = .02;
  static missions = [
    {key:'field',ask:'field',V:500,v0:2.5e7,particle:'electron'},
    {key:'push',ask:'accel',V:300,v0:2e7,particle:'electron'},
    {key:'bend',ask:'bend',V:300,v0:2e7,particle:'electron'},
    {key:'aim',ask:'voltage',V:null,v0:2e7,particle:'electron',target:.005},
    {key:'proton',ask:'small',V:300,v0:2e7,particle:'proton'}
  ].map(m=>({...m,pace:(DeflectModel.screen-DeflectModel.gun)/m.v0*1e9/4}));
  static units = {field:'V/m',accel:'m/s²',bend:'mm',voltage:'V',small:'µm'};
  static limits = {field:1e12,accel:1e30,bend:1e6,voltage:1e6,small:1e9};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=DeflectModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // The proton's bend is signed (up is positive) and can't be 0; every other answer is positive.
  valid(value){const c=this.config;return Number.isFinite(value)&&(c.ask==='small'?value!==0:value>0)&&Math.abs(value)<=DeflectModel.limits[c.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The plates' voltage: given, or yours in the aiming test.
  voltage(){const c=this.config;return c.V??(this.ready()?this.answer:0);}
  field(){return this.voltage()/DeflectModel.d;}
  mass(){return this.config.particle==='proton'?DeflectModel.mp:DeflectModel.me;}
  // The vertical acceleration between the plates (m/s², up positive): the field points down, so −e is pulled up.
  accel(){const q=this.config.particle==='proton'?DeflectModel.e:-DeflectModel.e;return -q*this.field()/this.mass();}
  // The particle's path for a given acceleration a, at time t in ns: gun to plates, a parabola between them, then a line.
  static path(c,a,t){
    const D=DeflectModel,v=c.v0,s=Math.max(t,0)*1e-9,s1=-D.gun/v,sL=D.L/v,hit=a&&.5*Math.abs(a)*sL*sL>=D.d/2?Math.sqrt(D.d/Math.abs(a)):null;
    const end=hit!==null?s1+hit:(D.screen-D.gun)/v,u=Math.min(s,end),x=D.gun+v*u;
    if(u<=s1)return {x,y:0,vy:0,phase:'gun',end:end*1e9,hit};
    const p=Math.min(u-s1,sL);let y=.5*a*p*p,vy=a*p;
    if(u-s1<=sL)return {x,y,vy,phase:hit!==null&&u>=end?'hit':'plates',end:end*1e9,hit};
    return {x,y:y+vy*(u-s1-sL),vy,phase:u>=end?'screen':'free',end:end*1e9,hit};
  }
  state(t){return DeflectModel.path(this.config,this.accel(),t);}
  // The bend at the end of the plates (m), and where the particle lands on the screen.
  exitHeight(a=this.accel()){const s=DeflectModel.L/this.config.v0;return .5*a*s*s;}
  duration(){return this.state(1e9).end;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly when the particle reaches the screen or a plate.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,D=DeflectModel,s=D.L/c.v0;
    if(c.key==='field')return 500/D.d;
    if(c.key==='push')return D.e*15000/D.me;
    if(c.key==='bend')return .5*D.e*15000/D.me*s*s*1e3;
    if(c.key==='aim')return 2*c.target*D.me*D.d*c.v0*c.v0/(D.e*D.L*D.L);
    return -.5*D.e*15000/D.mp*s*s*1e6;
  }
  unit(){return DeflectModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),D=DeflectModel,tol=D.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='field'){if(near(a,500*D.d))slip='multiplied';else if(near(a,500/2))slip='centimetres';}
      else if(c.key==='push'){if(near(a,D.e*15000/D.mp))slip='protonMass';else if(near(a,D.e*15000))slip='forceOnly';}
      else if(c.key==='bend'){if(near(a,2*x))slip='noHalf';else if(near(a,x/1e3))slip='metres';}
      else if(c.key==='aim'){if(near(a,x/2))slip='noHalfVoltage';else if(near(a,x/D.d))slip='fieldTyped';}
      else{const el=.5*D.e*15000/D.me*(D.L/c.v0)**2;
        if(near(a,el*1e6)||near(a,el*1e3))slip='sameAsElectron';else if(near(a,-el*1e6)||near(a,-el*1e3))slip='mirrored';else if(near(a,-x))slip='sameDirection';else if(near(a,x/1e3))slip='millimetres';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!DeflectModel.missions[saved.index])return false;
    const probe=new DeflectModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={field:'E =',accel:'a =',bend:'y =',voltage:'V =',small:'y =',};
const sig=x=>plain(Number(x.toPrecision(4)));
// A height in mm, or in µm for the proton, whose bend is a thousand times smaller.
const small=()=>model.config.particle==='proton';
const heightText=y=>small()?sig(y*1e6)+' µm':sig(y*1e3)+' mm';
// Givens: the plates, the field and particle, the beam, the target, or the proton.
function given(m){
  if(m.key==='field')return 'V = '+plain(500)+' V · d = '+plain(2)+' cm';
  if(m.key==='push')return 'e⁻ · E = '+plain(15000)+' V/m';
  if(m.key==='bend')return 'v₀ = '+plain(2e7)+' m/s · L = '+plain(5)+' cm';
  if(m.key==='aim')return 'y = '+plain(5)+' mm · d = '+plain(2)+' cm';
  return 'p⁺ · v₀ = '+plain(2e7)+' m/s';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='field')return 'E = V ÷ d = '+plain(500)+' ÷ '+plain(.02)+' = '+number(x,0)+' V/m';
  if(c.key==='push')return 'a = e·E ÷ m = '+sig(x)+' m/s²';
  if(c.key==='bend')return 'y = ½·a·(L ÷ v₀)² = '+number(x,3)+' mm';
  if(c.key==='aim')return 'V = 2·y·m·d·v₀² ÷ (e·L²) = '+number(x,1)+' V';
  return 'y = −½·a_p·(L ÷ v₀)² = '+sig(x)+' µm';
}
function baseEquation(){return 'y = ½·(q·E ÷ m)·(L ÷ v₀)²';}
function metrics(t,begun){
  if(!begun){for(const id of ['field-value','accel-value','height-value','vy-value'])$(id).textContent='—';return;}
  const s=model.state(t),inside=s.phase==='plates';
  $('field-value').textContent=number(model.field(),0);$('accel-value').textContent=inside?sig(model.accel()):'0';
  $('height-value').textContent=heightText(s.y);$('vy-value').textContent=s.vy?sig(s.vy):'0';
}
function values(){const c=model.config,x=model.exact();return {x:c.ask==='field'?number(x,0):c.ask==='accel'?sig(x):c.ask==='voltage'?number(x,1):c.ask==='small'?sig(x):number(x,3)};}
function runningCopy(t){
  const s=model.state(t);
  if(s.phase==='gun')return text('gunCopy',{v:plain(model.config.v0)});
  if(s.phase==='plates')return text(small()?'platesDownCopy':'platesCopy',{a:sig(Math.abs(model.accel()))});
  return text('freeCopy');
}
// The acceleration your answer implies, for your dashed path (none in the aiming test, whose answer drives the plates).
function guessAccel(){
  const c=model.config,a=model.answer,s=DeflectModel.L/c.v0;
  if(c.ask==='field')return DeflectModel.e*a/DeflectModel.me;
  if(c.ask==='accel')return a;
  if(c.ask==='bend')return 2*a*1e-3/(s*s);
  if(c.ask==='small')return 2*a*1e-6/(s*s);
  return null;
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,D=DeflectModel;
  const v0=-.033,s=(area-80)/(.158),X=x=>40+(x-v0)*s,yc=height*.52,Y=y=>yc-y*s;
  const arrow=(x,y,dx,dy,colour,w,tag,dash=[])=>{const L=Math.hypot(dx,dy);if(L<3)return;const ux=dx/L,uy=dy/L,ex=x+dx,ey=y+dy;line([{x,y},{x:ex,y:ey}],colour,w,dash);line([{x:ex-7*ux+4*uy,y:ey-7*uy-4*ux},{x:ex,y:ey},{x:ex-7*ux-4*uy,y:ey-7*uy+4*ux}],colour,w);if(tag)label(tag,ex+ux*5+(Math.abs(ux)>.5?(ux>0?3:-3):6),ey+uy*5+4,colour,Math.abs(ux)>.5&&ux<0?'right':'left',10);};
  // The axis, the gun, the plates with their field, and the screen with a mm ruler.
  line([{x:X(D.gun),y:Y(0)},{x:X(D.screen),y:Y(0)}],'#3a5468',1,[3,4]);
  box(X(v0),Y(0)-9,X(D.gun)-X(v0),18,'#5c6b78');fit(text(small()?'protonGunTag':'gunTag'),X(v0),Y(0)+26,'#9fb6c7',9,X(0)-X(v0)+6);
  const top=Y(D.d/2),bot=Y(-D.d/2);
  box(X(0),top-6,X(D.L)-X(0),6,'#2f7d68');box(X(0),bot,X(D.L)-X(0),6,'#2c5a8c');
  label('+',X(0)-8,top,'#75efc7','center',13);label('−',X(0)-8,bot+8,'#77b9ff','center',13);
  const V=model.voltage();fit(c.V===null&&!g.ready?'V = ?':'V = '+plain(Number(V.toPrecision(4)))+' V',(X(0)+X(D.L))/2,top-12,'#d1e3ed',10,X(D.L)-X(0)+40,'center');
  fit('L = '+plain(5)+' cm · d = '+plain(2)+' cm',(X(0)+X(D.L))/2,bot+22,'#9fb6c7',9,X(D.L)-X(0)+60,'center');
  if(g.option&&V>0)for(let i=1;i<=4;i++){const x=X(D.L*i/5);arrow(x,top+3,0,bot-top-6,'#6f8799',1);}
  if(g.option&&V>0)label('E',X(D.L*.5)+5,Y(0)-4,'#9fb6c7','left',10);
  const sx=X(D.screen);box(sx,Y(.045),6,Y(-.045)-Y(.045),'#1e3d52');ctx.strokeStyle='#5c7a8f';ctx.lineWidth=1;ctx.strokeRect(sx,Y(.045),6,Y(-.045)-Y(.045));
  for(let m=-40;m<=40;m+=10){line([{x:sx+6,y:Y(m/1e3)},{x:sx+(m%20?9:12),y:Y(m/1e3)}],'#7f97a8',1);if(m&&!(m%20))label((m>0?'+':'')+plain(m),sx+14,Y(m/1e3)+3,'#9fb6c7','left',8);}
  fit(text('screenTag'),sx+3,Y(.045)-8,'#9fb6c7',9,area-sx,'center');
  // The target mark; its label gives way to the bend's once the particle is past the plates.
  if(c.target){const y=Y(c.target);line([{x:X(D.L)-14,y},{x:X(D.L)+14,y}],'#9fb6c7',2,[4,3]);if(!(g.begun&&model.state(t).x>=D.L))fit(text('targetTag',{y:plain(5)}),X(D.L)+16,y-4,'#9fb6c7',9,90);}
  // Your dashed path, clipped to the tube.
  const ga=g.guess?guessAccel():null;
  if(ga!==null){const pts=[],end=D.path(c,ga,1e9).end;for(let i=0;i<=160;i++){const p=D.path(c,ga,end*i/160);pts.push({x:X(p.x),y:Y(p.y)});}line(pts,'#efb958',1.5,[5,4]);const q=D.path(c,ga,end);if(q.phase==='hit')fit(text('guessTag'),X(q.x)+4,q.y>0?top+14:bot-6,'#efb958',9,110);else fit(text('guessTag'),X(q.x)-4,Y(q.y)+(q.y>=0?-8:14),'#efb958',9,110,'right');}
  if(small()&&g.ready)fit(text('tinyTag'),X(D.L*.5),bot+38,'#9fb6c7',9,X(D.screen)-X(0),'center');
  if(!g.ready)return clock();
  // The glowing trail, the particle, and its arrows.
  const st=model.state(t),pts=[];
  if(g.begun){for(let i=0;i<=140;i++){const p=model.state(t*i/140);pts.push({x:X(p.x),y:Y(p.y)});}line(pts,'rgba(166,212,255,.35)',5);line(pts,'#a6d4ff',1.5);}
  const px=X(st.x),py=Y(st.y),col=small()?'#1f6f5a':'#1d4f86';
  if(st.phase==='screen'){dot(sx,py,7,'rgba(117,239,199,.35)');dot(sx,py,3.5,'#c8fff0');}
  if(st.phase==='hit'){for(let i=0;i<6;i++){const an=i*Math.PI/3;line([{x:px+4*Math.cos(an),y:py+4*Math.sin(an)},{x:px+9*Math.cos(an),y:py+9*Math.sin(an)}],'#efb958',1.5);}fit(text('hitTag'),px-4,st.y>0?top+14:bot-6,'#efb958',10,140,'right');}
  dot(px,py,6,col);label(small()?'+':'−',px,py+4,'#f2f8fc','center',10);
  if(g.begun&&g.option&&st.phase!=='screen'&&st.phase!=='hit'){
    const k=50/c.v0;arrow(px,py,c.v0*k,-st.vy*k,'#f2f8fc',2,'v');
    if(Math.abs(st.vy*k)>=3){line([{x:px,y:py},{x:px+c.v0*k,y:py}],'#d1e3ed',1,[2,3]);line([{x:px+c.v0*k,y:py},{x:px+c.v0*k,y:py-st.vy*k}],'#d1e3ed',1,[2,3]);}
    if(st.phase==='plates'){const ref=c.key==='field'?25000:c.key==='aim'?model.exact()/D.d:15000,L=Math.min(110,36*model.field()/ref)*Math.sign(model.accel());arrow(px,py,0,-L,'#77b9ff',2.5,'F');}
  }
  // The bend at the end of the plates, once the particle is past them.
  if(g.begun&&st.x>=D.L&&st.phase!=='hit'){const y=model.exitHeight(),x=X(D.L)+2;line([{x,y:Y(0)},{x,y:Y(y)}],'#d1e3ed',1);fit('y = '+heightText(y),x+6,(Y(0)+Y(y))/2+(Math.abs(Y(y)-Y(0))<14?(y>=0?-12:16):4),'#d1e3ed',10,110);}
  clock();
  function clock(){fit('t = '+number(t)+' ns',area-16,44,'#f2f8fc',13,area*.3,'right');if(g.option)fit(text('slowNote',{t:plain(Number(c.pace.toPrecision(3)))}),16,height-24,'#9fb6c7',10,area-28);}
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now(),D=DeflectModel;
  fit(text('heightGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Height against distance along the plates: mm for electrons, µm for the proton.
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,u=small()?1e6:1e3,lim=small()?6e-6:12e-3,unit=small()?' µm':' mm';
  const PX=x=>px0+x/D.L*(px1-px0),PY=y=>(py0+py1)/2-Math.max(-lim,Math.min(lim,y))/lim*(py1-py0)/2;
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(0)},{x:px1,y:PY(0)}],'#8aa3b5',1);
  if(!small())for(const y of [D.d/2,-D.d/2])line([{x:px0,y:PY(y)},{x:px1,y:PY(y)}],y>0?'#2f7d68':'#2c5a8c',3);
  const curve=(a,upto,colour,w,dash)=>{const pts=[];for(let i=0;i<=120;i++){const x=Math.min(upto,D.L)*i/120,p=D.path(c,a,(x-D.gun)/c.v0*1e9);if(p.x<x-1e-12)break;pts.push({x:PX(x),y:PY(p.y)});}line(pts,colour,w,dash);};
  const st=model.state(t);curve(model.accel(),Math.max(0,st.x),'#a6d4ff',2);
  const last=a=>{const p=D.path(c,a,1e9).x<D.L?D.path(c,a,1e9):D.path(c,a,(D.L-D.gun)/c.v0*1e9);return {x:Math.min(p.x,D.L),y:p.y};};
  const ga=g.guess?guessAccel():null;if(ga!==null){curve(ga,D.L,'#efb958',1.5,[5,4]);const q=last(ga);fit(text('guessTag'),PX(q.x)-4,PY(q.y)+(q.y>=0?-8:14),'#efb958',9,px1-px0,'right');}
  if(c.target){line([{x:px1-20,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',2,[4,3]);}
  if(st.x>=0&&st.x<=D.L)dot(PX(st.x),PY(st.y),5,'#f2f8fc');
  for(const m of [0,1,2,3,4,5])label(plain(m),PX(m/100),py1+14,'#9fb6c7','center',9);
  const tick=small()?5e-6:1e-2;label('+'+plain(tick*u)+unit,px0-4,PY(tick)+3,'#9fb6c7','right',9);label(plain(-tick*u)+unit,px0-4,PY(-tick)+3,'#9fb6c7','right',9);label('0',px0-4,PY(0)+3,'#9fb6c7','right',9);
  fit(text('plateAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
