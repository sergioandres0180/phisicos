module.exports = {
kind:'levitate',model:'LevitateModel',title:'Floating Bead',symbol:'r =',unit:'cm',equation:'k·q₁·q₂ ÷ r² = m·g',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .levitate-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-forces','forcesToggle'],
legends:[['blue','forceLegend'],['orange','weightLegend'],['white','threadLegend'],['gray','referenceLegend']],
metrics:[['height-value','heightMetric','cm','r','scalar'],['force-value','forceMetric','mN','F = k·q₁·q₂ ÷ r²','vector'],['pull-value','pullMetric','mN','T = m·g − F','vector'],['floor-value','floorMetric','mN','N','vector']],
modelCode:String.raw`
class LevitateModel {
  // Coulomb's law, F = k·q₁·q₂ ÷ r². A charged bead is fixed at the bottom of an upright glass tube; a bead with charge of
  // the same sign hangs on a thread above it and is lowered steadily from the top of the tube (16 cm) to 0.6 cm in 2 s,
  // then held 1 s. Slowly enough that it is always in balance: the thread pulls T = m·g − F while that is positive, and
  // goes slack exactly where F = m·g, at r* = √(k·q₁·q₂ ÷ (m·g)); below that, the bead floats there. r is measured
  // between the beads' centres; the beads are small spheres, so they act as point charges. g = 9.8 m/s².
  static k = 8.99e9;
  static g = 9.8;
  static top = .16;
  static rmin = .006;
  static lower = 2;
  static T = 3;
  static tolerance = .02;
  static missions = [
    {key:'height',ask:'height',q1:40e-9,q2:40e-9,m:1e-3},
    {key:'charge',ask:'charge',m:1.5e-3,target:.05},
    {key:'double',ask:'height',q1:40e-9,q2:80e-9,m:1e-3},
    {key:'floor',ask:'floor',q1:40e-9,q2:40e-9,m:1e-3,mb:3e-3},
    {key:'mass',ask:'mass',q1:30e-9,q2:30e-9,target:.02}
  ];
  static units = {height:'cm',charge:'nC',floor:'mN',mass:'g'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=LevitateModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Your charge (both beads) or your mass is used when one is asked; otherwise the given ones.
  charges(){const c=this.config;return c.ask==='charge'?[this.answer*1e-9,this.answer*1e-9]:[c.q1,c.q2];}
  mass(){const c=this.config;return c.ask==='mass'?this.answer*1e-3:c.m;}
  rStar(){const [a,b]=this.charges();return Math.sqrt(LevitateModel.k*a*b/(this.mass()*LevitateModel.g));}
  // The thread's end comes down steadily; the bead follows it until it floats, between the touching beads and the cap.
  hand(t){const L=LevitateModel;return L.top-(L.top-L.rmin)*Math.min(Math.max(t,0)/L.lower,1);}
  height(t){const L=LevitateModel;return Math.min(L.top,Math.max(L.rmin,this.hand(t),this.rStar()));}
  // The exact moment the thread goes slack, or null if it never does in the tube.
  slackTime(){const L=LevitateModel,r=this.rStar();if(r>=L.top||r<=L.rmin)return r>=L.top?0:null;return (L.top-r)/((L.top-L.rmin)/L.lower);}
  // Forces (N): the push F, the weight W, the thread's pull T, and the floor's push N on the bottom bead.
  forces(t){const [a,b]=this.charges(),r=this.height(t),F=LevitateModel.k*a*b/(r*r),W=this.mass()*LevitateModel.g,c=this.config;return {F,W,T:Math.max(0,W-F),N:c.mb?c.mb*LevitateModel.g+F:null};}
  duration(){return LevitateModel.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at 3 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,k=LevitateModel.k,g=LevitateModel.g;
    if(c.ask==='height')return 100*Math.sqrt(k*c.q1*c.q2/(c.m*g));
    if(c.ask==='charge')return 1e9*c.target*Math.sqrt(c.m*g/k);
    if(c.ask==='floor')return 1e3*(c.mb+c.m)*g;
    return 1e3*k*c.q1*c.q2/(g*c.target**2);
  }
  unit(){return LevitateModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),k=LevitateModel.k,g=LevitateModel.g,tol=LevitateModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='height'){if(near(a,100*k*c.q1*c.q2/(c.m*g)))slip='notSquared';else if(near(a,x/100))slip='metres';}
      else if(c.key==='charge'){if(near(a,1e9*c.target*c.m*g/k))slip='notSquaredCharge';else if(near(a,x*1e-9))slip='coulombs';}
      else if(c.key==='double'){const r1=100*Math.sqrt(k*c.q1*c.q1/(c.m*g));if(near(a,2*r1))slip='doubled';else if(near(a,r1))slip='same';else if(near(a,4*r1))slip='quadrupled';}
      else if(c.key==='floor'){if(near(a,1e3*c.mb*g))slip='noPush';else if(near(a,1e3*(c.mb-c.m)*g))slip='minus';else if(near(a,1e3*c.m*g))slip='topOnly';}
      else{if(near(a,1e3*k*c.q1*c.q2/(g*c.target)))slip='notSquaredMass';else if(near(a,x/1000))slip='kilograms';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!LevitateModel.missions[saved.index])return false;
    const probe=new LevitateModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={height:'r =',charge:'q =',floor:'N =',mass:'m =',};
const four=x=>plain(Number(x.toPrecision(4))),mN=x=>number(x*1e3,2);
// Givens: the charges and the floating bead's mass, the bottom bead's mass, or the height wanted.
function given(m){
  if(m.ask==='charge')return 'q₁ = q₂ · m = '+plain(m.m*1e3)+' g · r = '+plain(m.target*100)+' cm';
  if(m.ask==='mass')return plain(m.q1*1e9)+' nC · '+plain(m.q2*1e9)+' nC · r = '+plain(m.target*100)+' cm';
  return plain(m.q1*1e9)+' nC · '+plain(m.q2*1e9)+' nC · m = '+plain(m.m*1e3)+' g'+(m.mb?' · m₁ = '+plain(m.mb*1e3)+' g':'');
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.ask==='height')return 'r = √(k·q₁·q₂ ÷ m·g) = '+number(x,3)+' cm';
  if(c.ask==='charge')return 'q = r·√(m·g ÷ k) = '+number(x,2)+' nC';
  if(c.ask==='floor')return 'N = m₁·g + F = '+number(x,1)+' mN';
  return 'm = k·q² ÷ (g·r²) = '+number(x,3)+' g';
}
function baseEquation(){return 'k·q₁·q₂ ÷ r² = m·g';}
function metrics(t,begun){
  const f=model.forces(t);
  $('height-value').textContent=begun?number(model.height(t)*100,2):'—';$('force-value').textContent=begun?mN(f.F):'—';
  $('pull-value').textContent=begun?mN(f.T):'—';$('floor-value').textContent=begun&&f.N!==null?mN(f.N):'—';
}
function values(){return {x:four(model.exact())};}
function runningCopy(t){
  const f=model.forces(t);
  if(f.T>0)return text('lowerCopy',{T:mN(f.T)});
  return text(model.height(t)>=LevitateModel.top-1e-9?'capCopy':model.height(t)<=LevitateModel.rmin+1e-9?'touchCopy':'floatCopy',{r:number(model.height(t)*100,2)});
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,L=LevitateModel;
  // The tube, to scale: r runs from the bottom bead's centre up to the cap at 16 cm.
  const tx=area*.42,y0=height-74,y1=70,k=(y0-y1)/L.top,Y=r=>y0-r*k,R=7;
  ctx.fillStyle='rgba(169,216,232,.12)';ctx.fillRect(tx-22,y1-6,44,y0-y1+20);line([{x:tx-22,y:y1-6},{x:tx-22,y:y0+14}],'#a9d8e8',1.5);line([{x:tx+22,y:y1-6},{x:tx+22,y:y0+14}],'#a9d8e8',1.5);
  box(tx-34,y0+14,68,8,'#5c6b78');box(tx-26,y1-12,52,6,'#8aa3b5');
  if(g.option)for(let cm=0;cm<=16;cm+=2){line([{x:tx-34,y:Y(cm/100)},{x:tx-26,y:Y(cm/100)}],'#9fb6c7',1);label(plain(cm)+' cm',tx-38,Y(cm/100)+3,'#9fb6c7','right',9);}
  // The asked height as an orange dashed line, or the height wanted as a gray one.
  if(c.ask==='height'&&g.guess){const r=Math.min(L.top,model.answer/100);line([{x:tx-30,y:Y(r)},{x:tx+76,y:Y(r)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),tx+80,Y(r)+3,'#efb958',9,area-tx-90);}
  if(c.target){line([{x:tx-30,y:Y(c.target)},{x:tx+76,y:Y(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag'),tx+80,Y(c.target)+3,'#9fb6c7',9,area-tx-90);}
  const [q1,q2]=model.charges(),r=g.ready?model.height(t):L.top,yb=Y(0),yt=Y(r),f=g.ready?model.forces(t):null;
  // The thread hangs straight while it pulls and slack once the bead floats.
  if(f&&f.T>0)line([{x:tx,y:y1-6},{x:tx,y:yt-R}],'#f2f8fc',1.5);
  else{const hy=Y(model.hand(t)),pts=[];for(let i=0;i<=20;i++){const s=i/20;pts.push({x:tx+8*Math.sin(s*Math.PI*3)*Math.sin(s*Math.PI),y:y1-6+(yt-R-(y1-6))*s});}line(pts,'#9fb6c7',1.2);}
  const bead=(y,q,tag)=>{dot(tx,y,R,'#d9cfb8');label(q>0?'+':'−',tx,y+4,'#102637','center',12);fit(tag,tx+R+6,y+4,'#d1e3ed',9,60);};
  bead(yb,q1,'q₁');bead(yt,q2,'q₂');
  const arrow=(x,y,len,colour,tag)=>{if(Math.abs(len)<3)return;const e=y-len,d=Math.sign(len);line([{x,y},{x,y:e}],colour,2.5);line([{x:x-5,y:e+6*d},{x,y:e},{x:x+5,y:e+6*d}],colour,2.5);label(tag,x,e-(d>0?6:-14),colour,'center',10);};
  if(g.option&&g.begun){
    const s=40/f.W,cap=v=>Math.max(-120,Math.min(120,v));
    // Arrows sit to the right of the tube; the bottom bead's forces are in the floor test's bar panel.
    arrow(tx+34,yt,-40,'#efb958','W');arrow(tx+50,yt,cap(f.F*s),'#77b9ff','F');if(f.T>0)arrow(tx+66,yt,cap(f.T*s),'#f2f8fc','T');
  }
  if(g.begun)fit('r = '+number(r*100,2)+' cm',area-16,64,'#f2f8fc',12,area*.3,'right');
  if(g.option)fit(text('arrowNote'),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,box,label}=g,t=model.now();
  if(c.ask==='floor'){
    // Bars: the floating bead's weight, the push between the beads, and the floor's push on the bottom bead.
    fit(text('barGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
    if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
    const f=model.forces(t),bars=[['W',f.W,'#efb958'],['F',f.F,'#77b9ff'],['N',f.N,'#c9d6e0']],top=Math.max(f.N,model.answer*1e-3)*1.2,px0=g.area+20,px1=width-14,py0=76,py1=height-80,w=(px1-px0)/3;
    line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
    bars.forEach(([n,v,col],i)=>{const x=px0+w*(i+.5),h=v/top*(py1-py0);box(x-w*.22,py1-h,w*.44,h,col);label(n,x,py1+16,'#f2f8fc','center',12);label(mN(v)+' mN',x,py1-h-6,'#d1e3ed','center',9);});
    if(g.guess){const x=px0+w*2.5,y=py1-Math.min(model.answer*1e-3,top)/top*(py1-py0);line([{x:x-w*.36,y},{x:x+w*.36,y}],'#efb958',2,[5,4]);}
    return;
  }
  // The push against the gap, k·q₁·q₂ ÷ r², and the weight m·g: the bead floats where they cross.
  fit(text('forceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const [q1,q2]=model.charges(),W=model.mass()*LevitateModel.g,px0=g.area+40,px1=width-14,py0=70,py1=height-64,top=3*W,PX=r=>px0+r/LevitateModel.top*(px1-px0),PY=F=>py1-Math.min(F,top)/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  line([{x:px0,y:PY(W)},{x:px1,y:PY(W)}],'#efb958',1.5);fit('m·g',px1,PY(W)-5,'#efb958',9,60,'right');
  const pts=[];for(let i=0;i<=200;i++){const r=LevitateModel.rmin+(LevitateModel.top-LevitateModel.rmin)*i/200;pts.push({x:PX(r),y:PY(LevitateModel.k*q1*q2/(r*r))});}line(pts,'#77b9ff',2);
  if(c.ask==='height'&&g.guess){const x=PX(Math.min(LevitateModel.top,model.answer/100));line([{x,y:py0},{x,y:py1}],'#efb958',1.5,[5,4]);}
  if(c.target){const x=PX(c.target);line([{x,y:py0},{x,y:py1}],'#9fb6c7',1.5,[5,4]);}
  const r=model.height(t);dot(PX(r),PY(LevitateModel.k*q1*q2/(r*r)),5,'#f2f8fc');
  for(const cm of [0,4,8,12,16])label(plain(cm),PX(cm/100),py1+14,'#9fb6c7','center',9);
  fit(text('gapAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
