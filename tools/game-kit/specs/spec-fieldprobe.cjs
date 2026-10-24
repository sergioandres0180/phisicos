module.exports = {
kind:'fieldprobe',model:'FieldProbeModel',title:'Field Probe',symbol:'E =',unit:'N/C',equation:'E = F ÷ q = k·Q ÷ r²',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .fieldprobe-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-field','fieldToggle'],
legends:[['gray','fieldLegend'],['blue','forceLegend'],['green','positiveLegend'],['orange','guessLegend']],
metrics:[['dist-value','distMetric','m','r','scalar'],['force-value','forceMetric','µN','F','vector'],['field-value','fieldMetric','N/C','E = F ÷ q','vector'],['probe-value','probeMetric','nC','q','scalar']],
modelCode:String.raw`
class FieldProbeModel {
  // The electric field is the force per charge, E = F ÷ q: the force a small test charge feels at a point, divided by its
  // charge. It belongs to the point, not to the probe: a probe with three times the charge feels three times the force, and
  // E is the same. A point charge Q makes E = k·Q ÷ r², pointing away from + and toward −, and the fields of several charges
  // add as vectors. A small positive probe on an insulating wand is carried steadily from 0.15 m below the point up to it
  // over 2 s and held 1 s; its gauge reads the force at every moment. The sources are fixed point charges (the dome's charge
  // is chosen so the field at the point is exactly 3 × 10⁵ N/C), and the probe is too small to move them. Charges in nC,
  // lengths in m, forces in N.
  static k = 8.99e9;
  static carry = 2;
  static T = 3;
  static rise = .15;
  static tolerance = .02;
  static dome = 3e5*.04/8.99e9*1e9;
  static missions = [
    {key:'probe',ask:'field',view:[-.12,.42],sources:[{q:FieldProbeModel.dome,x:0,y:0,hidden:true}],P:[.2,0],probe:2,gauge:'mN',eScale:[1e5,25],fScale:[6e-4,40],graph:'ratio'},
    {key:'point',ask:'field',view:[-.12,.48],sources:[{q:5,x:0,y:0}],P:[.3,0],probe:1,gauge:'µN',eScale:[100,15],fScale:[1e-7,15],graph:'distance'},
    {key:'swap',ask:'force',view:[-.12,.42],sources:[{q:FieldProbeModel.dome,x:0,y:0,hidden:true}],P:[.2,0],probe:6,gauge:'mN',eScale:[1e5,25],fScale:[6e-4,40],graph:'ratio'},
    {key:'dipole',ask:'field',view:[-.32,.32],sources:[{q:4,x:-.2,y:0},{q:-4,x:.2,y:0}],P:[0,0],probe:1,gauge:'µN',eScale:[500,20],fScale:[5e-7,20],graph:'path'},
    {key:'reach',ask:'distance',view:[-.12,.52],sources:[{q:10,x:0,y:0}],P:null,probe:1,gauge:'µN',target:1000,eScale:[1000,70],fScale:[1e-6,70],graph:'distance'}
  ];
  static units = {field:'N/C',force:'mN',distance:'m'};
  static limits = {field:1e12,force:1e9,distance:10};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=FieldProbeModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // The dipole test accepts 0, the slip of cancelling the two fields; every other answer is positive.
  valid(value){return Number.isFinite(value)&&(this.config.key==='dipole'?value>=0:value>0)&&value<=FieldProbeModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The point the probe is carried to: given, or at your distance from the charge in the reach test.
  point(){const c=this.config;if(c.P)return c.P;return this.ready()?[this.answer,0]:null;}
  // The field (N/C) at (x, y) from the fixed charges alone: the probe's own charge never counts.
  field(x,y){
    let Ex=0,Ey=0;
    for(const s of this.config.sources){const dx=x-s.x,dy=y-s.y,r2=dx*dx+dy*dy,r=Math.sqrt(r2);if(!r)continue;const E=FieldProbeModel.k*s.q*1e-9/r2;Ex+=E*dx/r;Ey+=E*dy/r;}
    return [Ex,Ey];
  }
  strength(x,y){const [Ex,Ey]=this.field(x,y);return Math.hypot(Ex,Ey);}
  // The probe rises steadily from 0.15 m below the point for 2 s, then is held there.
  probeAt(t){const P=this.point();if(!P)return null;const s=Math.min(Math.max(t,0)/FieldProbeModel.carry,1);return [P[0],P[1]-FieldProbeModel.rise*(1-s)];}
  // The force on the probe (N): its charge times the field where it is.
  force(t){const p=this.probeAt(t);if(!p)return null;const [Ex,Ey]=this.field(p[0],p[1]),q=this.config.probe*1e-9;return [q*Ex,q*Ey];}
  // The probe's distance from the first (positive) charge.
  distance(t){const p=this.probeAt(t),s=this.config.sources[0];return p?Math.hypot(p[0]-s.x,p[1]-s.y):null;}
  duration(){return FieldProbeModel.T;}
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
    const c=this.config,k=FieldProbeModel.k;
    if(c.key==='probe')return .6e-3/2e-9;
    if(c.key==='point')return k*5e-9/.09;
    if(c.key==='swap')return 6e-9*3e5*1e3;
    if(c.key==='dipole')return 2*k*4e-9/.04;
    return Math.sqrt(k*10e-9/c.target);
  }
  unit(){return FieldProbeModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),k=FieldProbeModel.k,tol=FieldProbeModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='probe'){if(near(a,.6e-3*2e-9))slip='multiplied';else if(near(a,2e-9/.6e-3))slip='inverted';else if(near(a,.6e-3/2))slip='noNano';else if(near(a,.6/2e-9))slip='noMilli';}
      else if(c.key==='point'){if(near(a,k*5e-9/.3))slip='notSquared';else if(near(a,k*5e-9/900))slip='centimetres';}
      else if(c.key==='swap'){if(near(a,.6))slip='same';else if(near(a,.2))slip='ratioInverted';else if(near(a,1.8e-3))slip='newtons';}
      else if(c.key==='dipole'){if(a===0)slip='cancelled';else if(near(a,k*4e-9/.04))slip='oneCharge';else if(near(a,2*k*4e-9/.16))slip='fullGap';}
      else if(near(a,k*10e-9/c.target))slip='notRoot';
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!FieldProbeModel.missions[saved.index])return false;
    const probe=new FieldProbeModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={field:'E =',force:'F =',distance:'r =',};
const sig=x=>plain(Number(x.toPrecision(4))),signed=q=>(q>0?'+':'')+plain(q);
// A force in the gauge's unit (mN or µN), and in µN for the metric.
const gaugeText=F=>model.config.gauge==='mN'?sig(F*1e3)+' mN':sig(F*1e6)+' µN';
// Givens: the probe's charge and force, the charge and distance, or the field wanted.
function given(m){
  if(m.key==='probe')return 'q = '+plain(2)+' nC · F = '+plain(.6)+' mN';
  if(m.key==='point')return 'Q = +5 nC · r = '+plain(.3)+' m';
  if(m.key==='swap')return 'q: '+plain(2)+' → '+plain(6)+' nC · F₁ = '+plain(.6)+' mN';
  if(m.key==='dipole')return '+4 / '+plain(-4)+' nC · d = '+plain(.4)+' m';
  return 'Q = +10 nC · E = '+plain(1000)+' N/C';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='probe')return 'E = F ÷ q = '+sig(x)+' N/C';
  if(c.key==='point')return 'E = k·Q ÷ r² = '+number(x,1)+' N/C';
  if(c.key==='swap')return 'F = q·E = '+number(x,2)+' mN';
  if(c.key==='dipole')return 'E = E₊ + E₋ = '+number(x,0)+' N/C';
  return 'r = √(k·Q ÷ E) = '+number(x,3)+' m';
}
function baseEquation(){return 'E = F ÷ q = k·Q ÷ r²';}
function metrics(t,begun){
  const c=model.config,F=begun?model.force(t):null,p=begun?model.probeAt(t):null;
  $('dist-value').textContent=p?number(model.distance(t),3):'—';
  $('force-value').textContent=F?sig(Math.hypot(...F)*1e6):'—';
  $('field-value').textContent=p?sig(model.strength(...p)):'—';
  $('probe-value').textContent=begun?signed(c.probe):'—';
}
function values(){const c=model.config,x=model.exact();return {x:c.ask==='distance'?number(x,3):c.ask==='force'?number(x,2):c.key==='point'?number(x,1):c.key==='dipole'?number(x,0):sig(x)};}
function runningCopy(t){
  const F=model.force(t),p=model.probeAt(t),vals={F:gaugeText(Math.hypot(...F)),E:sig(model.strength(...p))};
  return text(t<FieldProbeModel.carry?'carryCopy':'holdCopy',vals);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const [v0,v1]=c.view,s=(area-80)/(v1-v0),X=x=>40+(x-v0)*s,yc=height*.42,Y=y=>yc-y*s;
  const P=model.point(),Ep=P?model.strength(...P):c.target,p0=model.probeAt(t),pr=p0&&[Math.min(area-24,X(p0[0])),Y(p0[1])];
  const arrow=(x,y,dx,dy,colour,w,tag,dash=[])=>{const L=Math.hypot(dx,dy);if(L<3)return;const ux=dx/L,uy=dy/L,ex=x+dx,ey=y+dy,a=w<1.2?3.5:7,b=w<1.2?2.5:4;line([{x,y},{x:ex,y:ey}],colour,w,dash);line([{x:ex-a*ux+b*uy,y:ey-a*uy-b*ux},{x:ex,y:ey},{x:ex-a*ux-b*uy,y:ey-a*uy+b*ux}],colour,w);if(tag)label(tag,ex+ux*6+(ux>=0?2:-2),ey+uy*6+4,colour,ux>=0?'left':'right',10);};
  // The field map: one arrow per grid point, pointing along E, its length on a log scale (10 × the field = 12 px longer).
  if(g.option){
    for(let gx=30;gx<area-14;gx+=34)for(let gy=66;gy<height-44;gy+=34){
      const x=v0+(gx-40)/s,y=(yc-gy)/s;if(c.sources.some(q=>Math.hypot(X(q.x)-gx,Y(q.y)-gy)<22))continue;
      // Leave the probe, its gauge, and the point clear.
      if(pr&&Math.abs(gx-pr[0])<40&&gy>pr[1]-20&&gy<pr[1]+56)continue;if(P&&Math.hypot(gx-X(P[0]),gy-Y(P[1]))<22)continue;
      const [Ex,Ey]=model.field(x,y),E=Math.hypot(Ex,Ey);if(!E)continue;
      const L=Math.max(4,Math.min(30,18+12*Math.log10(E/Ep)));arrow(gx-Ex/E*L/2,gy+Ey/E*L/2,Ex/E*L,-Ey/E*L,'#5f7688',1);
    }
  }
  for(const q of c.sources){dot(X(q.x),Y(q.y),13,q.q>0?'#1f6f5a':'#1d4f86');label(q.q>0?'+':'−',X(q.x),Y(q.y)+5,'#f2f8fc','center',15);fit(q.hidden?'Q = ?':signed(q.q)+' nC',X(q.x),Y(q.y)+30,'#d1e3ed',10,90,'center');}
  if(c.sources[0].hidden)fit(text('domeTag'),X(c.sources[0].x),Y(0)-22,'#9fb6c7',9,120,'center');
  // The reach test: your distance as an orange ring, and the ring where E really is 1000 N/C once the run is over.
  if(c.ask==='distance'){
    const q=c.sources[0],ring=(r,colour)=>{ctx.beginPath();ctx.strokeStyle=colour;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.arc(X(q.x),Y(q.y),r*s,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);};
    ctx.save();ctx.beginPath();ctx.rect(0,52,area,height-92);ctx.clip();
    if(g.guess)ring(model.answer,'#efb958');if(g.done)ring(model.exact(),'#9fb6c7');ctx.restore();
    if(g.done){const r=model.exact();fit(text('targetTag',{E:plain(c.target)}),X(q.x),Math.max(64,Y(r)-6),'#9fb6c7',9,140,'center');}
    if(!g.ready)fit(text('reachTag'),X(.25),Y(.12),'#9fb6c7',10,area*.45,'center');
  }
  if(!P)return clock();
  const px=Math.min(area-24,X(P[0])),py=Y(P[1]);
  line([{x:px-6,y:py},{x:px+6,y:py}],'#d1e3ed',1);line([{x:px,y:py-6},{x:px,y:py+6}],'#d1e3ed',1);fit('P',px-8,py-8,'#d1e3ed',11,20,'right');
  // Your prediction at the point: the field arrow, or the probe's force for the swap test.
  const [Ex,Ey]=model.field(...P),u=[Ex/Ep,-Ey/Ep],eLen=v=>Math.min(150,v/c.eScale[0]*c.eScale[1]),fLen=v=>Math.min(150,v/c.fScale[0]*c.fScale[1]);
  if(g.guess&&c.ask!=='distance'){const L=c.ask==='force'?fLen(model.answer*1e-3):eLen(model.answer);arrow(px,py-26,u[0]*L,u[1]*L,'#efb958',1.5,text('guessTag'),[5,4]);}
  // The probe on its insulating wand, with the force gauge on the wand.
  const p=model.probeAt(t),bx=Math.min(area-24,X(p[0])),by=Y(p[1]);
  line([{x:bx,y:by+6},{x:bx,y:height-34}],'#c9d6e0',3);
  box(bx-34,by+30,68,20,'#0b1c29');ctx.strokeStyle='#8aa3b5';ctx.lineWidth=1;ctx.strokeRect(bx-34,by+30,68,20);
  fit(g.begun?gaugeText(Math.hypot(...model.force(t))):'F = ?',bx,by+44,'#f2f8fc',10,62,'center');
  dot(bx,by,6,'#1f6f5a');label('+',bx,by+4,'#f2f8fc','center',10);fit('q = '+signed(c.probe)+' nC',bx+10,by+22,'#d1e3ed',9,90);
  if(g.begun&&g.option){
    const [Fx,Fy]=model.force(t),[ex,ey]=model.field(...p),E=Math.hypot(ex,ey),F=Math.hypot(Fx,Fy);
    if(E){const L=eLen(E);arrow(bx,by,ex/E*L,-ey/E*L,'#d1e3ed',2.5,'E');const Lf=fLen(F);arrow(bx-ey/E*12,by-ex/E*12,ex/E*Lf,-ey/E*Lf,'#77b9ff',2.5,'F');}
  }
  if(g.option)fit(text('arrowNote',{E:plain(c.eScale[0]),e:c.eScale[1],F:c.gauge==='mN'?plain(c.fScale[0]*1e3)+' mN':plain(c.fScale[0]*1e6)+' µN',f:c.fScale[1]}),16,height-24,'#9fb6c7',10,area-28);
  clock();
  function clock(){fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');}
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text(c.graph+'Graph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,p=model.probeAt(t),Enow=model.strength(...p);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(c.graph==='ratio'){
    // F against q at the probe's place: every probe charge lands on one line through 0, whose slope is E.
    const qmax=8,top=2.88,PX=q=>px0+q/qmax*(px1-px0),PY=F=>py1-Math.min(F,top)/top*(py1-py0),mN=q=>Enow*q*1e-9*1e3;
    line([{x:PX(0),y:PY(0)},{x:PX(qmax),y:PY(mN(qmax))}],'#77b9ff',2);
    for(let q=1;q<=qmax;q++)dot(PX(q),PY(mN(q)),q===c.probe?5:2.5,q===c.probe?'#f2f8fc':'#9fb6c7');
    if(g.guess){if(c.ask==='field'){const a=model.answer,end=Math.min(qmax,top/(a*1e-6));line([{x:PX(0),y:PY(0)},{x:PX(end),y:PY(a*end*1e-6)}],'#efb958',1.5,[5,4]);}
      else{const y=PY(model.answer);line([{x:PX(c.probe),y:py1},{x:PX(c.probe),y}],'#efb958',1.5,[5,4]);dot(PX(c.probe),y,4,'#efb958');}}
    fit(text('slopeTag'),PX(1.2),PY(mN(qmax))+4,'#77b9ff',9,px1-px0-20);
    for(const q of [0,2,4,6,8])label(plain(q),PX(q),py1+14,'#9fb6c7','center',9);
    label(plain(2.4)+' mN',px0-4,PY(2.4)+3,'#9fb6c7','right',9);label('0',px0-4,py1+3,'#9fb6c7','right',9);
    fit(text('chargeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);return;
  }
  if(c.graph==='distance'){
    // E against distance from the charge: k·Q ÷ r², with the probe's distance as a dot.
    const q=c.sources[0],r0=.05,r1=c.key==='reach'?.6:.45,Eref=c.target||model.exact(),top=4*Eref,E=r=>FieldProbeModel.k*q.q*1e-9/(r*r);
    const PX=r=>px0+(Math.min(r,r1)-r0)/(r1-r0)*(px1-px0),PY=v=>py1-Math.min(v,top)/top*(py1-py0),pts=[];
    for(let i=0;i<=160;i++){const r=r0+(r1-r0)*i/160;pts.push({x:PX(r),y:PY(E(r))});}line(pts,'#77b9ff',2);
    if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{E:plain(c.target)}),px1,PY(c.target)-5,'#9fb6c7',9,px1-px0,'right');}
    if(g.guess){if(c.ask==='distance'){const x=PX(Math.max(r0,model.answer));line([{x,y:py0},{x,y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),x+4,py0+10,'#efb958',9,px1-x);}
      else{const y=PY(model.answer);line([{x:px0,y},{x:px1,y}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1,y-5,'#efb958',9,px1-px0,'right');}}
    const r=model.distance(t);if(r>=r0)dot(PX(r),PY(Enow),5,'#f2f8fc');
    for(const m of [.1,.2,.3,.4,.5,.6])if(m<=r1)label(plain(m),PX(m),py1+14,'#9fb6c7','center',9);
    const tick=c.key==='reach'?2000:1000;label(plain(tick)+' N/C',px0-4,PY(tick)+3,'#9fb6c7','right',9);label('0',px0-4,py1+3,'#9fb6c7','right',9);
    fit(text('distanceAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);return;
  }
  // The dipole: E along the probe's path up the middle line, from each charge and in total.
  const h=FieldProbeModel.rise,one=y=>FieldProbeModel.k*4e-9/(.04+y*y),total=y=>2*one(y)*.2/Math.sqrt(.04+y*y),x0=model.exact(),top=1.3*Math.max(x0,Math.min(model.answer,2*x0));
  const PX=d=>px0+(h-d)/h*(px1-px0),PY=v=>py1-Math.min(v,top)/top*(py1-py0),a=[],b=[];
  for(let i=0;i<=120;i++){const d=h*(1-i/120);a.push({x:PX(d),y:PY(one(d))});b.push({x:PX(d),y:PY(total(d))});}
  line(a,'#9fb6c7',1.5,[3,3]);line(b,'#77b9ff',2);
  fit(text('eachTag'),px1,PY(one(0))+14,'#9fb6c7',9,px1-px0,'right');fit(text('totalTag'),px1,PY(total(0))-6,'#77b9ff',9,px1-px0,'right');
  if(g.guess){const y=PY(model.answer);line([{x:px0,y},{x:px1,y}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,y-5,'#efb958',9,px1-px0);}
  const d=-p[1];dot(PX(d),PY(Enow),5,'#f2f8fc');
  for(const m of [.15,.1,.05,0])label(plain(m),PX(m),py1+14,'#9fb6c7','center',9);
  label(plain(1000)+' N/C',px0-4,PY(1000)+3,'#9fb6c7','right',9);label('0',px0-4,py1+3,'#9fb6c7','right',9);
  fit(text('pathAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
