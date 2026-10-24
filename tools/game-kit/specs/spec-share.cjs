module.exports = {
kind:'share',model:'ShareModel',title:'Touch and Share',symbol:'Q_B =',unit:'nC',equation:'ΣQ = ΣQ₀',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .share-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','positiveLegend'],['blue','electronLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['a-value','aMetric','nC','Q_A','vector'],['b-value','bMetric','nC','Q_B','vector'],['c-value','cMetric','nC','Q_C','vector'],['total-value','totalMetric','nC','Q_A + Q_B + Q_C','scalar']],
modelCode:String.raw`
class ShareModel {
  // Charge on metal spheres on insulating stands. Two metal spheres in contact (or joined by a wire) end at the same
  // potential, k·Q ÷ r: identical spheres share their total charge equally; spheres far apart joined by a long thin wire
  // share it in proportion to their radii. Plastic is an insulator: charge does not flow into or out of it. The total
  // charge never changes. Each contact is a 2.5 s leg: 1 s moving together, 0.5 s in contact, 1 s apart; the charge
  // moves at the instant of contact.
  static tolerance = .02;
  static leg = 2.5;
  static approach = 1;
  static hold = .5;
  // Spheres are listed in the order they stand, left to right; steps are the pairs that touch, in turn; ask names the sphere asked about.
  static missions = [
    {key:'pair',ask:'B',spheres:[{name:'A',q:12,r:1},{name:'B',q:0,r:1}],steps:[[0,1]]},
    {key:'relay',ask:'A',spheres:[{name:'B',q:0,r:1},{name:'A',q:12,r:1},{name:'C',q:0,r:1}],steps:[[1,0],[1,2]]},
    {key:'plastic',ask:'A',spheres:[{name:'A',q:12,r:1},{name:'B',q:0,r:1,plastic:true}],steps:[[0,1]]},
    {key:'sizes',ask:'B',wire:true,spheres:[{name:'A',q:16,r:3},{name:'B',q:0,r:1}],steps:[[0,1]]},
    {key:'mixed',ask:'C',spheres:[{name:'A',q:10,r:1},{name:'B',q:-4,r:1},{name:'C',q:0,r:1}],steps:[[0,1],[1,2]]}
  ];
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=ShareModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // Charges may be signed, and 0 is a slip worth explaining.
  valid(value){return Number.isFinite(value)&&Math.abs(value)<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  duration(){return this.config.steps.length*ShareModel.leg;}
  contactTime(k){return k*ShareModel.leg+ShareModel.approach;}
  // How far the k-th pair has moved together (0 apart, 1 touching): linear in, held, linear out.
  closeness(k,t){const s=t-k*ShareModel.leg;if(s<=0||s>=ShareModel.leg)return 0;if(s<1)return s;if(s<=1.5)return 1;return (ShareModel.leg-s)/1;}
  // Whether the k-th pair is in contact at time t.
  touching(k,t){const c=this.contactTime(k);return t>=c-1e-12&&t<=c+ShareModel.hold+1e-12;}
  // The charges (nC) at time t: every contact that has happened shares the pair's total in proportion to the radii.
  charges(t){
    const s=this.config.spheres,q=s.map(x=>x.q);
    this.config.steps.forEach(([i,j],k)=>{
      if(t<this.contactTime(k)-1e-12||s[i].plastic||s[j].plastic)return;
      const total=q[i]+q[j];q[i]=total*s[i].r/(s[i].r+s[j].r);q[j]=total*s[j].r/(s[i].r+s[j].r);
    });
    return q;
  }
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly when the last pair is back apart.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;return this.charges(this.duration())[c.spheres.findIndex(s=>s.name===c.ask)];}
  unit(){return 'nC';}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=ShareModel.tolerance,near=(p,q)=>q===0?p===0:Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='pair'){if(near(a,12))slip='allMoved';else if(a===0)slip='noneMoved';}
      else if(c.key==='relay'){if(near(a,4))slip='threeWay';else if(near(a,6))slip='firstOnly';}
      else if(c.key==='plastic'){if(near(a,6))slip='likeMetal';else if(a===0)slip='gaveAll';}
      else if(c.key==='sizes'){if(near(a,8))slip='equal';else if(near(a,12))slip='swapped';else if(near(a,1.6))slip='area';}
      else{if(near(a,3))slip='firstOnlyMixed';else if(near(a,3.5))slip='ignoredSign';else if(near(a,2))slip='threeWayMixed';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!ShareModel.missions[saved.index])return false;
    const probe=new ShareModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={A:'Q_A =',B:'Q_B =',C:'Q_C ='};
const signed=q=>q===0?'0':(q>0?'+':'')+plain(Number(q.toPrecision(4)));
// Givens: each sphere's starting charge in the order of its name, and the radii or PVC where they matter.
function given(m){
  const byName=[...m.spheres].sort((a,b)=>a.name<b.name?-1:1);
  if(m.wire)return byName.map(s=>s.name+' '+signed(s.q)+' nC, r '+plain(s.r)+' cm').join(' · ');
  return byName.map(s=>s.name+' '+signed(s.q)).join(' · ')+' nC'+(m.spheres.some(s=>s.plastic)?' · B: PVC':'');
}
function askedName(){return model.config.ask;}
function equation(){
  const c=model.config,x=plain(model.exact());
  if(c.key==='pair')return 'Q_B = (12 + 0) ÷ 2 = '+x+' nC';
  if(c.key==='relay')return 'Q_A = 12 ÷ 2 ÷ 2 = '+x+' nC';
  if(c.key==='plastic')return 'Q_A = '+x+' nC, ΔQ = 0';
  if(c.key==='sizes')return 'Q_B = 16 × 1 ÷ (3 + 1) = '+x+' nC';
  return 'Q_C = (10 − 4) ÷ 2 ÷ 2 = '+x+' nC';
}
function baseEquation(){return 'ΣQ = ΣQ₀';}
function chargeOf(name,t){const s=model.config.spheres,i=s.findIndex(x=>x.name===name);return i<0?null:model.charges(t)[i];}
function metrics(t,begun){
  for(const n of ['A','B','C']){const q=chargeOf(n,t);$(n.toLowerCase()+'-value').textContent=begun&&q!==null?signed(q):'—';}
  $('total-value').textContent=begun?signed(model.charges(t).reduce((a,b)=>a+b,0)):'—';
}
function values(){return {x:plain(model.exact())};}
// The contact under way at time t, if any.
function contactAt(t){return model.config.steps.findIndex((_,k)=>model.touching(k,t));}
function runningCopy(t){
  const k=contactAt(t),c=model.config;
  if(k<0)return text('moveCopy');
  const [i,j]=c.steps[k];
  if(c.spheres[i].plastic||c.spheres[j].plastic)return text('noFlowCopy');
  return text(c.wire?'wireCopy':'contactCopy');
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,s=c.spheres,n=s.length,q=model.charges(t);
  const floor=height-96,k=c.wire?20:32,R=x=>x.r*k,cy=floor-112,home=s.map((_,i)=>area*(i+1)/(n+1));
  // Each sphere's position: the pair in contact moves together until their surfaces touch (spheres joined by a wire stay put).
  const x=home.slice();
  if(!c.wire)c.steps.forEach(([i,j],m)=>{const f=model.closeness(m,t);if(!f)return;const gap=Math.abs(home[j]-home[i])-R(s[i])-R(s[j]),d=Math.sign(home[j]-home[i]);x[i]+=d*f*gap/2;x[j]-=d*f*gap/2;});
  box(16,floor,area-32,4,'#5c6b78');
  // The wire runs from the top of each sphere; a switch in the middle closes for the contact.
  if(c.wire){const w=model.touching(0,t),y=cy-R(s[0])-30,mid=(x[0]+x[1])/2;line([{x:x[0],y:cy-R(s[0])},{x:x[0],y},{x:mid-16,y}],'#c9d6e0',2);line([{x:mid+12,y},{x:x[1],y},{x:x[1],y:cy-R(s[1])}],'#c9d6e0',2);line([{x:mid-16,y},{x:mid+12,y:w?y:y-14}],w?'#75efc7':'#c9d6e0',2);fit(text('wireTag'),mid,y+16,'#9fb6c7',9,area*.4,'center');}
  s.forEach((sp,i)=>{
    const r=R(sp),cx=x[i];
    box(cx-3,cy+r,6,floor-cy-r,'#8aa3b5');box(cx-14,floor-6,28,6,'#5c6b78');
    ctx.fillStyle=sp.plastic?'#d9cfb8':'#7d8e9c';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
    if(sp.plastic){ctx.strokeStyle='#b8a98e';ctx.lineWidth=1;for(let a=-r;a<r;a+=6){ctx.beginPath();ctx.moveTo(cx+a,cy-Math.sqrt(Math.max(0,r*r-a*a)));ctx.lineTo(cx+a,cy+Math.sqrt(Math.max(0,r*r-a*a)));ctx.stroke();}}
    else{ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(cx-r*.35,cy-r*.35,r*.35,0,Math.PI*2);ctx.fill();}
    // About one mark per nC, spread evenly over the surface of a metal sphere.
    const m=Math.min(24,Math.round(Math.abs(q[i]))||(q[i]?1:0));
    for(let j=0;j<m;j++){const a=-Math.PI/2+2*Math.PI*j/m,px=cx+(r-9)*Math.cos(a),py=cy+(r-9)*Math.sin(a);label(q[i]>0?'+':'−',px,py+5,q[i]>0?'#75efc7':'#77b9ff','center',14);}
    if(c.wire)fit(sp.name,cx+r+8,cy-r+6,'#f2f8fc',13,40);else fit(sp.name,cx,cy-r-10,'#f2f8fc',13,40,'center');
    fit(text(sp.plastic?'plasticTag':'metalTag'),cx,floor+18,'#9fb6c7',9,area/(n+1)-8,'center');
    if(g.begun)fit(signed(q[i])+' nC',cx,floor+34,q[i]>0?'#75efc7':q[i]<0?'#77b9ff':'#d1e3ed',11,area/(n+1)-8,'center');
  });
  // Electrons flow, during contact, from the sphere whose charge rises to the one whose charge falls.
  const kk=contactAt(t);
  if(g.option&&g.begun&&kk>=0){
    const [i,j]=c.steps[kk],before=model.charges(model.contactTime(kk)-1e-6),after=model.charges(model.contactTime(kk));
    if(Math.abs(after[i]-before[i])>1e-9){const from=after[i]>before[i]?i:j,to=from===i?j:i,y=c.wire?cy-R(s[0])-50:cy-Math.max(R(s[i]),R(s[j]))-28,x0=x[from],x1=x[to],d=Math.sign(x1-x0);
      line([{x:x0,y},{x:x1-d*8,y}],'#77b9ff',2);line([{x:x1-d*14,y:y-5},{x:x1-d*8,y},{x:x1-d*14,y:y+5}],'#77b9ff',2);fit('e⁻',(x0+x1)/2,y-6,'#77b9ff',11,40,'center');}
  }
  fit(text('markNote'),16,height-24,'#9fb6c7',10,area*.6);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g;
  fit(text('chargeGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // One bar per sphere, in the order of the names, about a zero line; the orange mark is your answer on the asked sphere.
  const t=model.now(),names=c.spheres.map(s=>s.name).sort(),px0=g.area+20,px1=width-14,py0=76,py1=height-80,mid=(py0+py1)/2;
  const top=Math.max(...c.spheres.map(s=>Math.abs(s.q))),a=model.answer,span=Math.max(top,g.guess&&Number.isFinite(a)?Math.min(Math.abs(a),2.5*top):0)*1.15,Y=v=>mid-v/span*(py1-py0)/2;
  line([{x:px0,y:mid},{x:px1,y:mid}],'#8aa3b5',1);
  const w=(px1-px0)/names.length;
  names.forEach((nm,i)=>{
    const v=chargeOf(nm,t),x=px0+w*(i+.5);
    box(x-w*.22,Math.min(Y(v),mid),w*.44,Math.abs(Y(v)-mid),v>=0?'#75efc7':'#77b9ff');
    label(nm,x,py1+16,'#f2f8fc','center',12);label(signed(v),x,(v>=0?Y(v)-6:Y(v)+14),'#d1e3ed','center',10);
    if(g.guess&&Number.isFinite(a)&&nm===askedName()){const gv=Math.max(-span,Math.min(span,a));line([{x:x-w*.36,y:Y(gv)},{x:x+w*.36,y:Y(gv)}],'#efb958',2,[5,4]);}
  });
  fit(text('totalCopy',{q:signed(model.charges(t).reduce((p,q)=>p+q,0))}),px0,py1+34,'#9fb6c7',9,px1-px0);
}
`
};
