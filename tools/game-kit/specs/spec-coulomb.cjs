module.exports = {
kind:'coulomb',model:'CoulombModel',title:'Charge Tug',symbol:'F =',unit:'N',equation:'F = k·q₁·q₂ ÷ r²',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .coulomb-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-forces','forcesToggle'],
legends:[['blue','forceLegend'],['green','positiveLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['dist-value','distMetric','m','r','scalar'],['force-value','forceMetric','N','F','vector'],['react-value','reactMetric','N','F_A','vector'],['product-value','productMetric','µC²','q₁·q₂','scalar']],
modelCode:String.raw`
class CoulombModel {
  // Coulomb's law along a straight rod: two charges push (same sign) or pull (opposite signs) on each other with
  // F = k·q₁·q₂ ÷ r², equal and opposite, and forces from several charges add. Beads are point charges on a frictionless
  // rod, each held by a force gauge; the moving bead is brought in steadily over 2 s, slowly enough that the gauges
  // read the electric force at every moment, and held 1 s. In the balance test a third bead is held at your point and
  // let go at 2 s: it stays when your point is within 2% of the balance point (a little friction holds it there), and
  // otherwise it is pushed, drawn for 1 s as an illustration: between A and B toward the balance point, which is stable
  // along the rod, and beyond B away from both. Charges are in µC; forces are signed, + to the right.
  static k = 8.99e9;
  static approach = 2;
  static T = 3;
  static tolerance = .02;
  static missions = [
    {key:'pull',ask:'force',gauge:'B',view:[-.08,1],beads:[{name:'A',q:2,x:0},{name:'B',q:-3,x:.3,from:.9}]},
    {key:'balance',ask:'position',view:[-.08,2],beads:[{name:'A',q:4,x:0},{name:'B',q:1,x:.9}],probe:{name:'C',q:1}},
    {key:'middle',ask:'force',gauge:'C',view:[-.08,1],beads:[{name:'A',q:1,x:0},{name:'C',q:1,x:.1},{name:'B',q:-1,x:.3,from:.9}]},
    {key:'charge',ask:'charge',gauge:'B',view:[-.08,1.1],target:1.8,beads:[{name:'A',q:5,x:0},{name:'B',q:null,x:.5,from:1}]},
    {key:'scale',ask:'force',gauge:'B',view:[-.08,.7],ref:{q:1,r:.1},beads:[{name:'A',q:2,x:0},{name:'B',q:2,x:.2,from:.6}]}
  ];
  static units = {force:'N',position:'m',charge:'µC'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=CoulombModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=(this.config.ask==='position'?10:1e6);}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The balance test's bead stays when your point is within 2% of the balance point.
  stays(){return this.config.ask==='position'&&this.ready()&&Math.abs(this.answer-.6)<=CoulombModel.tolerance*.6;}
  // Every bead at time t, with your charge on B when the charge is asked and the balance bead at your point.
  beads(t){
    const c=this.config,s=Math.min(Math.max(t,0)/CoulombModel.approach,1);
    const list=c.beads.map(b=>({name:b.name,q:b.q===null?(this.ready()?this.answer:0):b.q,x:b.from===undefined?b.x:b.from+(b.x-b.from)*s}));
    if(c.probe&&this.ready())list.push({name:c.probe.name,q:c.probe.q,x:this.probeX(t),probe:true});
    return list;
  }
  // The balance bead: held at your point, then, if it is off balance, pushed the way the net force points: between A and
  // B it settles on the balance point (eased in over 1 s), beyond B it slides away.
  probeX(t){
    const a=this.answer,dt=Math.min(t-CoulombModel.approach,1);if(dt<=0||this.stays())return a;
    if(a<.9)return a+(.6-a)*(1-(1-dt)**2);
    return Math.min(this.config.view[1]-.03,a+Math.sign(this.forceAt(a))*.12*dt*dt);
  }
  // The net force (N) on a +1 µC bead at x from the fixed beads (the balance test).
  forceAt(x){return this.config.beads.reduce((F,b)=>F+CoulombModel.k*b.q*1e-12*Math.sign(x-b.x)/((x-b.x)**2),0);}
  // The net force (N, + to the right) on the named bead at time t.
  force(name,t){
    const list=this.beads(t),me=list.find(b=>b.name===name);if(!me)return null;
    return list.reduce((F,b)=>b===me?F:F+CoulombModel.k*me.q*b.q*1e-12*Math.sign(me.x-b.x)/((me.x-b.x)**2),0);
  }
  // The force from one bead on another, for the middle test's two pushes.
  pair(on,from,t){const list=this.beads(t),a=list.find(b=>b.name===on),b=list.find(b=>b.name===from);return CoulombModel.k*a.q*b.q*1e-12*Math.sign(a.x-b.x)/((a.x-b.x)**2);}
  duration(){return CoulombModel.T;}
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
    const c=this.config,k=CoulombModel.k;
    if(c.key==='pull')return k*2*3e-12/.09;
    if(c.key==='balance')return .6;
    if(c.key==='middle')return k*1e-12*(1/.01+1/.04);
    if(c.key==='charge')return c.target*.25/(k*5e-6)*1e6;
    return k*4e-12/.04;
  }
  unit(){return CoulombModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),k=CoulombModel.k,tol=CoulombModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='pull'){if(near(a,k*6e-12/.3))slip='notSquared';else if(near(a,k*6e-12/900))slip='centimetres';}
      else if(c.key==='balance'){if(near(a,.45))slip='midpoint';else if(near(a,.72))slip='noRoot';else if(near(a,1.8))slip='outside';}
      else if(c.key==='middle'){if(near(a,k*1e-12*(1/.01-1/.04)))slip='subtracted';else if(near(a,k*1e-12/.01))slip='firstOnly';}
      else if(c.key==='charge'){if(near(a,c.target*.5/(k*5e-6)*1e6))slip='notSquaredCharge';else if(near(a,x*1e-6))slip='coulombs';}
      else{const f=k*1e-12/.01;if(near(a,2*f))slip='doubled';else if(near(a,4*f))slip='quadrupled';else if(near(a,f/2))slip='halved';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!CoulombModel.missions[saved.index])return false;
    const probe=new CoulombModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={force:'F =',position:'x =',charge:'q =',};
const signed=q=>(q>0?'+':'')+plain(q),fN=x=>number(x,3);
// Givens: the charges in µC with their places or gap, the force wanted, or the force to scale from.
function given(m){
  if(m.key==='pull')return '+2 µC · '+plain(-3)+' µC · r = '+plain(.3)+' m';
  if(m.key==='balance')return '+4 µC (0) · +1 µC ('+plain(.9)+' m)';
  if(m.key==='middle')return '+1 · +1 · '+plain(-1)+' µC · 0 / '+plain(.1)+' / '+plain(.3)+' m';
  if(m.key==='charge')return '+5 µC · F = '+plain(1.8)+' N · r = '+plain(.5)+' m';
  return 'F = '+plain(.899)+' N · 2q, 2r';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='pull')return 'F = k·q₁·q₂ ÷ r² = '+fN(x)+' N';
  if(c.key==='balance')return '4 ÷ x² = 1 ÷ ('+plain(.9)+' − x)² → x = '+number(x,2)+' m';
  if(c.key==='middle')return 'F = F_A + F_B = '+fN(x)+' N';
  if(c.key==='charge')return 'q = F·r² ÷ (k·q₁) = '+number(x,2)+' µC';
  return 'F = k·2q·2q ÷ (2r)² = '+fN(x)+' N';
}
function baseEquation(){return 'F = k·q₁·q₂ ÷ r²';}
// The bead whose gauge is asked about (the balance bead in the balance test).
function gaugeName(){const c=model.config;return c.probe?c.probe.name:c.gauge;}
function metrics(t,begun){
  const c=model.config,list=model.beads(t),me=list.find(b=>b.name===gaugeName()),a=list.find(b=>b.name==='A');
  $('dist-value').textContent=begun&&me?number(me.x-a.x,3):'—';$('force-value').textContent=begun&&me?fN(model.force(me.name,t)):'—';
  $('react-value').textContent=begun?fN(model.force('A',t)):'—';$('product-value').textContent=begun&&me?plain(Number((a.q*me.q).toPrecision(4))):'—';
}
function values(){const x=model.exact();return {x:model.config.ask==='position'?number(x,2):model.config.ask==='charge'?number(x,1):fN(x)};}
function runningCopy(t){
  const c=model.config;
  if(c.probe){if(t<CoulombModel.approach)return text('probeCopy',{F:fN(model.force(c.probe.name,t))});return text(model.stays()?'stayCopy':model.answer<.9?'slideCopy':'awayCopy');}
  if(t<CoulombModel.approach)return text('approachCopy');
  return text('holdCopy',{F:fN(Math.abs(model.force(c.gauge,t)))});
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const [v0,v1]=c.view,X=x=>40+(x-v0)/(v1-v0)*(area-80),yr=height*.56,R=12;
  const Fref={pull:.6,balance:.1,middle:1.12,charge:1.8,scale:.9}[c.key],s=70/Fref,cap=v=>Math.max(-130,Math.min(130,v));
  const arrow=(x,y,len,colour,tag,w=2.5)=>{if(Math.abs(len)<3)return;const e=Math.max(22,Math.min(area-22,x+len)),d=Math.sign(len);line([{x,y},{x:e,y}],colour,w);line([{x:e-6*d,y:y-5},{x:e,y},{x:e-6*d,y:y+5}],colour,w);if(tag)label(tag,e+d*4,y+4,colour,d>0?'left':'right',10);};
  // The rod, its scale, and the reference pair of the scaling test above it.
  line([{x:X(v0),y:yr},{x:X(v1),y:yr}],'#8aa3b5',3);
  if(g.option){const step=v1-v0>1.5?.2:.1;for(let m=0;m<=v1+1e-9;m+=step){line([{x:X(m),y:yr+40},{x:X(m),y:yr+46}],'#9fb6c7',1);label(plain(Number(m.toFixed(2))),X(m),yr+58,'#9fb6c7','center',9);}}
  if(c.ref){const y=yr-110;line([{x:X(v0),y},{x:X(v1),y}],'#5c6b78',2);for(const x of [0,c.ref.r]){dot(X(x),y,8,'#5c6b78');label('+',X(x),y+4,'#d1e3ed','center',11);}fit(text('referenceTag',{F:plain(.899)}),X(c.ref.r)+16,y+4,'#9fb6c7',10,area*.5);}
  const list=model.beads(t);
  if(c.ask==='position'&&g.guess){const x=X(Math.min(v1,model.answer));line([{x,y:yr-84},{x,y:yr+40}],'#efb958',1.5,[5,4]);fit(text('guessTag'),x+4,yr-88,'#efb958',9,120);}
  if(!g.ready&&c.probe)fit(text('probeTag'),X(.45),yr-60,'#9fb6c7',10,area*.4,'center');
  list.forEach((b,i)=>{
    const x=X(b.x),col=b.q>0?'#1f6f5a':b.q<0?'#1d4f86':'#5c6b78';
    // A clamp holds a fixed bead; a gauge holds a moving or test bead until it is let go.
    const fixed=c.beads.find(f=>f.name===b.name&&f.from===undefined)&&!b.probe&&b.name!==c.gauge;
    if(fixed)box(x-7,yr-R-14,14,10,'#5c6b78');else if(!(b.probe&&t>=CoulombModel.approach)){line([{x,y:yr-R},{x,y:yr-42}],'#c9d6e0',1.5);box(x-28,yr-64,56,22,'#0b1c29');ctx.strokeStyle='#8aa3b5';ctx.lineWidth=1;ctx.strokeRect(x-28,yr-64,56,22);}
    dot(x,yr,R,col);label(b.q>0?'+':b.q<0?'−':'0',x,yr+5,'#f2f8fc','center',14);
    fit(b.name,x,fixed?yr-R-20:yr-70,'#f2f8fc',12,30,'center');
    fit((b.q?signed(Number(b.q.toPrecision(4))):'?')+' µC',x,yr+R+16,'#d1e3ed',10,80,'center');
    if(g.begun){const F=model.force(b.name,t);if(!fixed&&!(b.probe&&t>=CoulombModel.approach))fit(fN(Math.abs(F))+' N',x,yr-49,'#f2f8fc',11,50,'center');if(g.option)arrow(x,yr-22-(i%2)*12,cap(F*s),'#77b9ff','F');}
  });
  // The middle test: the two pushes on C, each from one bead, below the rod.
  if(c.key==='middle'&&g.begun&&g.option){const x=X(list.find(b=>b.name==='C').x);arrow(x,yr+76,cap(model.pair('C','A',t)*s),'#77b9ff','F_A',1.5);arrow(x,yr+92,cap(model.pair('C','B',t)*s),'#77b9ff','F_B',1.5);}
  if(g.begun){const me=list.find(b=>b.name===gaugeName());if(me){const y=yr+(c.key==='middle'?112:80);line([{x:X(0),y},{x:X(me.x),y}],'#9fb6c7',1);line([{x:X(0),y:y-4},{x:X(0),y:y+4}],'#9fb6c7',1);line([{x:X(me.x),y:y-4},{x:X(me.x),y:y+4}],'#9fb6c7',1);fit('r = '+number(me.x,3)+' m',(X(0)+X(me.x))/2,y-4,'#d1e3ed',10,Math.max(60,X(me.x)-X(0)),'center');}}
  if(g.option)fit(text('arrowNote',{F:plain(Fref)}),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text(c.probe?'balanceGraph':'forceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64;
  if(c.probe){
    // The net force on a +1 µC bead along the rod: it crosses zero at the balance point.
    const lim=.3,PX=x=>px0+(x-.05)/(c.view[1]-.1)*(px1-px0),PY=F=>(py0+py1)/2-Math.max(-lim,Math.min(lim,F))/lim*(py1-py0)/2;
    line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(0)},{x:px1,y:PY(0)}],'#8aa3b5',1);
    for(const part of [[.05,.86],[.94,c.view[1]-.05]]){const pts=[];for(let i=0;i<=120;i++){const x=part[0]+(part[1]-part[0])*i/120;pts.push({x:PX(x),y:PY(model.forceAt(x))});}line(pts,'#77b9ff',2);}
    if(g.guess){const x=PX(Math.min(c.view[1]-.05,model.answer));line([{x,y:py0},{x,y:py1}],'#efb958',1.5,[5,4]);}
    const p=model.probeX(t);dot(PX(p),PY(model.forceAt(p)),5,'#f2f8fc');
    for(const m of [0,.5,1,1.5])label(plain(m),PX(m),py1+14,'#9fb6c7','center',9);label('+'+plain(lim)+' N',px0-4,py0+8,'#9fb6c7','right',9);label('0',px0-4,PY(0)+3,'#9fb6c7','right',9);
    fit(text('positionAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);return;
  }
  // The held bead's force as the moving bead comes in; the orange line is your force, or your charge's force for the charge test.
  const mov=c.beads.find(b=>b.from!==undefined),F=x=>Math.abs(forceWith(x)),forceWith=x=>{const list=model.beads(0).map(b=>b.name===mov.name?{...b,x}:b),me=list.find(b=>b.name===c.gauge);return list.reduce((s,b)=>b===me?s:s+CoulombModel.k*me.q*b.q*1e-12*Math.sign(me.x-b.x)/((me.x-b.x)**2),0);};
  const Fend=F(mov.x),a=model.answer,top=Math.max(Fend,c.ask==='force'?Math.min(a,2.5*Fend):c.target)*1.25,PX=x=>px0+(mov.from-x)/(mov.from-mov.x)*(px1-px0),PY=v=>py1-Math.min(v,top)/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  const now=model.beads(t).find(b=>b.name===mov.name).x,pts=[];for(let i=0;i<=150;i++){const x=mov.from+(now-mov.from)*i/150;pts.push({x:PX(x),y:PY(F(x))});}line(pts,'#77b9ff',2);
  if(c.ask==='force'&&g.guess){line([{x:px0,y:PY(a)},{x:px1,y:PY(a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1,PY(Math.min(a,top))-5,'#efb958',9,px1-px0,'right');}
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{F:plain(c.target)}),px1,PY(c.target)-5,'#9fb6c7',9,px1-px0,'right');}
  if(c.ref){line([{x:px0,y:PY(.899)},{x:px1,y:PY(.899)}],'#5c6b78',1,[3,3]);}
  dot(PX(now),PY(F(now)),5,'#f2f8fc');
  label(plain(mov.from)+' m',px0,py1+14,'#9fb6c7','left',9);label(plain(mov.x)+' m',px1,py1+14,'#9fb6c7','right',9);label(fN(top/1.25)+' N',px0-4,PY(top/1.25)+3,'#9fb6c7','right',9);
  fit(text('approachAxis',{name:mov.name}),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
