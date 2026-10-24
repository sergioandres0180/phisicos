module.exports = {
kind:'potmap',model:'PotentialModel',title:'Potential Map',symbol:'V =',unit:'V',equation:'V = k·Q ÷ r, W = q·ΔV',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .potmap-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-contours','contourToggle'],
legends:[['gray','contourLegend'],['blue','forceLegend'],['green','positiveLegend'],['orange','guessLegend']],
metrics:[['dist-value','distMetric','m','r','scalar'],['potential-value','potentialMetric','V','V = Σ k·Q ÷ r','scalar'],['delta-value','deltaMetric','V','ΔV','scalar'],['work-value','workMetric','nJ','W = q·ΔV','scalar']],
modelCode:String.raw`
class PotentialModel {
  // Electric potential is energy per charge, a number with a sign at every point: a point charge Q makes V = k·Q ÷ r, and
  // the potentials of several charges simply add, with no directions to worry about. Carrying a charge q from one point to
  // another takes work W = q·(V₂ − V₁), whatever the path; along a contour (equal potential) it takes none, because the
  // electric force is always across the path. A +1 nC test charge is carried steadily along the asked path for 2 s and
  // held 1 s; it is too small to move the fixed charges. With q = 1 nC, the work in nJ equals the change of potential in V.
  // Charges in nC, lengths in m, potentials in V.
  static k = 8.99e9;
  static carry = 2;
  static T = 3;
  static tolerance = .02;
  static zeroWindow = .5;
  static q = 1;
  static missions = [
    {key:'level',ask:'potential',charges:[{q:2,x:0,y:0}],path:'line',from:[.55,0],to:[.3,0],fScale:[2e-7,40]},
    {key:'climb',ask:'work',charges:[{q:2,x:0,y:0}],path:'line',from:[.3,0],to:[.1,0],fScale:[2e-7,40]},
    {key:'ring',ask:'work',charges:[{q:2,x:0,y:0}],path:'ring',r:.3,fScale:[2e-7,40]},
    {key:'pair',ask:'potential',charges:[{q:3,x:-.2,y:0},{q:1,x:.2,y:0}],path:'line',from:[0,-.25],to:[0,0],fScale:[4e-7,40]},
    {key:'contour',ask:'distance',charges:[{q:4,x:0,y:0}],path:'line',from:[.6,0],to:null,target:120,fScale:[4e-7,40]}
  ];
  static units = {potential:'V',work:'nJ',distance:'m'};
  static limits = {potential:1e9,work:1e6,distance:10};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=PotentialModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // A work answer may be negative or 0 (the ring's is 0); potentials and distances are positive.
  valid(value){const c=this.config;if(!Number.isFinite(value))return false;return c.ask==='work'?Math.abs(value)<=PotentialModel.limits.work:value>0&&value<=PotentialModel.limits[c.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The potential (V) at (x, y): the plain sum of k·Q ÷ r over the fixed charges.
  potential(x,y){return this.config.charges.reduce((V,c)=>V+PotentialModel.k*c.q*1e-9/Math.max(Math.hypot(x-c.x,y-c.y),1e-9),0);}
  // The field (N/C) at (x, y), for the force arrow on the test charge.
  field(x,y){let Ex=0,Ey=0;for(const c of this.config.charges){const dx=x-c.x,dy=y-c.y,r=Math.max(Math.hypot(dx,dy),1e-9),E=PotentialModel.k*c.q*1e-9/(r*r);Ex+=E*dx/r;Ey+=E*dy/r;}return [Ex,Ey];}
  // The point at fraction s of the path: a straight line (to your distance in the contour test) or half the 0.3 m ring.
  at(s){
    const c=this.config;
    if(c.path==='ring'){const a=Math.PI/2-Math.PI*s;return [c.r*Math.cos(a),c.r*Math.sin(a)];}
    const to=c.to??(this.ready()?[this.answer,0]:null);if(!to)return null;
    return [c.from[0]+(to[0]-c.from[0])*s,c.from[1]+(to[1]-c.from[1])*s];
  }
  length(){const c=this.config;if(c.path==='ring')return Math.PI*c.r;const a=this.at(0),b=this.at(1);return a&&b?Math.hypot(b[0]-a[0],b[1]-a[1]):0;}
  probeAt(t){return this.at(Math.min(Math.max(t,0)/PotentialModel.carry,1));}
  // The work you have done (nJ) by time t: q·(V now − V at the start).
  work(t){const a=this.at(0),p=this.probeAt(t);return p?PotentialModel.q*(this.potential(...p)-this.potential(...a)):null;}
  nearest(t){const p=this.probeAt(t);return p?Math.min(...this.config.charges.map(c=>Math.hypot(p[0]-c.x,p[1]-c.y))):null;}
  duration(){return PotentialModel.T;}
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
    const c=this.config,k=PotentialModel.k;
    if(c.key==='level')return k*2e-9/.3;
    if(c.key==='climb')return k*2e-9*(1/.1-1/.3);
    if(c.key==='ring')return 0;
    if(c.key==='pair')return k*4e-9/.2;
    return k*4e-9/c.target;
  }
  unit(){return PotentialModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),k=PotentialModel.k,tol=PotentialModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    // The ring's work is 0, which needs its own window of 0.5 nJ.
    const ok=c.key==='ring'?Math.abs(a)<=PotentialModel.zeroWindow:near(a,x);let slip=null;
    if(!ok){
      if(c.key==='level'){if(near(a,k*2e-9/.09))slip='squared';else if(near(a,k*2e-9/30))slip='centimetres';}
      else if(c.key==='climb'){if(near(a,k*2e-9/.1))slip='finalOnly';else if(near(a,-x))slip='fieldWork';}
      else if(c.key==='ring'){if(near(a,k*2e-9/.3))slip='potential';else if(near(a,k*2e-9/.09*Math.PI*.3))slip='forceTimesPath';}
      else if(c.key==='pair'){if(near(a,k*2e-9/.2))slip='subtracted';else if(near(a,k*2e-9/.04))slip='field';}
      else if(near(a,Math.sqrt(x)))slip='squaredDistance';
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!PotentialModel.missions[saved.index])return false;
    const probe=new PotentialModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={potential:'V =',work:'W =',distance:'r =',};
const signed=q=>(q>0?'+':'')+plain(q);
// Givens: the charge and the distance or path, the pair, or the contour wanted.
function given(m){
  if(m.key==='level')return 'Q = +2 nC · r = '+plain(.3)+' m';
  if(m.key==='climb')return 'Q = +2 nC · r: '+plain(.3)+' → '+plain(.1)+' m';
  if(m.key==='ring')return 'Q = +2 nC · r = '+plain(.3)+' m · 180°';
  if(m.key==='pair')return '+3 / +1 nC · d = '+plain(.4)+' m';
  return 'Q = +4 nC · V = '+plain(120)+' V';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='level')return 'V = k·Q ÷ r = '+number(x,2)+' V';
  if(c.key==='climb')return 'W = q·(V₂ − V₁) = '+number(x,1)+' nJ';
  if(c.key==='ring')return 'W = q·(V₂ − V₁) = '+number(0,0)+' nJ';
  if(c.key==='pair')return 'V = V₁ + V₂ = '+number(x,1)+' V';
  return 'r = k·Q ÷ V = '+number(x,3)+' m';
}
function baseEquation(){return 'V = k·Q ÷ r, W = q·ΔV';}
function metrics(t,begun){
  const p=begun?model.probeAt(t):null;
  if(!p){for(const id of ['dist-value','potential-value','delta-value','work-value'])$(id).textContent='—';return;}
  const W=model.work(t);
  $('dist-value').textContent=number(model.nearest(t),3);$('potential-value').textContent=number(model.potential(...p),2);
  $('delta-value').textContent=number(W/PotentialModel.q,2);$('work-value').textContent=number(W,1);
}
function values(){const c=model.config,x=model.exact();return {x:c.key==='level'?number(x,2):c.key==='ring'?number(0,0):c.ask==='distance'?number(x,3):number(x,1)};}
function runningCopy(t){
  const p=model.probeAt(t),vals={V:number(model.potential(...p),2),W:number(model.work(t),1)};
  if(model.config.path==='ring')return text('ringCopy',vals);
  return text(t<PotentialModel.carry?'carryCopy':'holdCopy',vals);
}
let mapCache=null;
// Shading cells (lighter is higher potential, opaque, 32 shades) and contours by marching squares on a 10 px grid.
function buildMap(key,g,s,ox,yc,top,bottom){
  const c=g.c,area=g.area,wx=px=>(px-ox)/s,wy=py=>(yc-py)/s,X=x=>ox+x*s,Y=y=>yc-y*s,shade=new globalThis.Map();
  for(let px=0;px<area;px+=8)for(let py=top;py<bottom;py+=8){
    const V=model.potential(wx(px+4),wy(py+4)),f=Math.round(31*Math.sqrt(Math.min(1,Math.max(0,V/300))))/31;
    const colour='rgb('+Math.round(16+54*f)+','+Math.round(38+67*f)+','+Math.round(55+75*f)+')';if(!shade.has(colour))shade.set(colour,[]);shade.get(colour).push(px,py);
  }
  const step=10,nx=Math.ceil(area/step),ny=Math.ceil((bottom-top)/step),G=[];
  for(let i=0;i<=nx;i++){G.push([]);for(let j=0;j<=ny;j++)G[i].push(model.potential(wx(i*step),wy(top+j*step)));}
  const near=(px,py)=>c.charges.some(q=>Math.hypot(X(q.x)-px,Y(q.y)-py)<14);
  const contour=(level,out)=>{
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
      const v0=G[i][j],v1=G[i+1][j],v2=G[i+1][j+1],v3=G[i][j+1];
      if(Math.min(v0,v1,v2,v3)>=level||Math.max(v0,v1,v2,v3)<level)continue;
      const px=i*step,py=top+j*step;if(near(px+step/2,py+step/2))continue;
      const v=[v0,v1,v2,v3],xy=[[px,py],[px+step,py],[px+step,py+step],[px,py+step]],pts=[];
      for(let e=0;e<4;e++){const a=v[e]-level,b=v[(e+1)%4]-level;if((a<0)!==(b<0)){const f=a/(a-b),p0=xy[e],p1=xy[(e+1)%4];pts.push(p0[0]+(p1[0]-p0[0])*f,p0[1]+(p1[1]-p0[1])*f);}}
      for(let e=0;e+3<pts.length;e+=4)out.push(pts[e],pts[e+1],pts[e+2],pts[e+3]);
    }
    return out;
  };
  const minor=[],major=[],labels=[],guess=[];
  // The rings and their labels appear once the run starts: before that they would give the answer away.
  if(g.begun&&g.option){
    for(let L=20;L<=300;L+=20)contour(L,L%100?minor:major);
    const placed=[];
    for(const q of c.charges){let prev=null;for(let d=16;d<300;d+=1){const px=X(q.x)-d*.5,py=Y(q.y)+d*.866;if(px<8||py>bottom-4)break;const V=model.potential(wx(px),wy(py));if(prev!==null)for(let L=20;L<=300;L+=20)if(prev>=L&&V<L&&!placed.some(p=>Math.hypot(p[0]-px,p[1]-py)<16)){placed.push([px,py]);labels.push([plain(L),px-3,py+3]);}prev=V;}}
  }
  if(g.guess&&c.ask==='potential')contour(model.answer,guess);
  return {key,shade,minor,major,labels,guess};
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,P=PotentialModel;
  const s=Math.min((area-60)/1.05,(height-110)/.72),ox=area*(c.charges.length>1?.5:.3),yc=height*.53,X=x=>ox+x*s,Y=y=>yc-y*s,wx=px=>(px-ox)/s,wy=py=>(yc-py)/s;
  const top=56,bottom=height-36;
  // The map only changes with the test, your answer, the size, and whether the run has started, so it is computed once
  // for each of those and redrawn from the cache: shading cells grouped by colour, then contour segments and labels.
  const key=[model.index,model.answer,area,height,g.begun&&g.option,g.guess].join('|');
  if(mapCache?.key!==key)mapCache=buildMap(key,g,s,ox,yc,top,bottom);
  for(const [colour,cells] of mapCache.shade){ctx.fillStyle=colour;for(let i=0;i<cells.length;i+=2)ctx.fillRect(cells[i],cells[i+1],8,8);}
  const segs=(list,colour,w)=>{if(!list.length)return;ctx.beginPath();ctx.strokeStyle=colour;ctx.lineWidth=w;for(let i=0;i<list.length;i+=4){ctx.moveTo(list[i],list[i+1]);ctx.lineTo(list[i+2],list[i+3]);}ctx.stroke();};
  segs(mapCache.minor,'#6f8ba0',1);segs(mapCache.major,'#9fb6c7',1);for(const [txt,x,y] of mapCache.labels)label(txt,x,y,'#d1e3ed','right',9);
  segs(mapCache.guess,'#efb958',1.5);
  // Your prediction: the contour at your potential, or a ring at your distance.
  if(g.guess&&c.ask==='distance'){ctx.beginPath();ctx.strokeStyle='#efb958';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.arc(X(0),Y(0),model.answer*s,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  if(g.guess&&c.ask!=='work'){const gx=c.ask==='distance'?X(Math.min(model.answer,1)):X(c.charges.length>1?.02:.3)+4;fit(text('guessTag'),Math.min(area-60,gx+6),Y(.05)-30,'#efb958',9,110);}
  for(const q of c.charges){dot(X(q.x),Y(q.y),12,'#1f6f5a');label('+',X(q.x),Y(q.y)+5,'#f2f8fc','center',14);fit(signed(q.q)+' nC',X(q.x),Y(q.y)-18,'#f2f8fc',10,70,'center');}
  if(!g.ready&&c.ask==='distance'){fit(text('reachTag'),X(.3),Y(-.2),'#d1e3ed',10,area*.5,'center');return clock();}
  // The path, then the test charge with its meter.
  const pts=[];for(let i=0;i<=60;i++){const p=model.at(i/60);pts.push({x:X(p[0]),y:Y(p[1])});}line(pts,'#c9d6e0',1,[2,4]);
  const p=model.probeAt(t),bx=X(p[0]),by=Y(p[1]);
  if(g.begun&&g.option){const [Ex,Ey]=model.field(...p),F=P.q*1e-9*Math.hypot(Ex,Ey),L=Math.min(110,F/c.fScale[0]*c.fScale[1]);if(L>3){const ux=Ex/Math.hypot(Ex,Ey),uy=-Ey/Math.hypot(Ex,Ey),ex=bx+ux*L,ey=by+uy*L;line([{x:bx,y:by},{x:ex,y:ey}],'#77b9ff',2.5);line([{x:ex-7*ux+4*uy,y:ey-7*uy-4*ux},{x:ex,y:ey},{x:ex-7*ux-4*uy,y:ey-7*uy+4*ux}],'#77b9ff',2.5);label('F',ex+ux*8,ey+uy*8+4,'#77b9ff','center',10);}}
  dot(bx,by,6,'#1f6f5a');label('+',bx,by+4,'#f2f8fc','center',10);
  const mx=Math.min(area-96,Math.max(8,bx+12)),my=Math.min(bottom-36,Math.max(top+4,by+12));
  box(mx,my,88,32,'#0b1c29');ctx.strokeStyle='#8aa3b5';ctx.lineWidth=1;ctx.strokeRect(mx,my,88,32);
  fit('V = '+(g.begun?number(model.potential(...p),2):'?')+' V',mx+5,my+13,'#f2f8fc',10,80);fit('W = '+(g.begun?number(model.work(t),1):'?')+' nJ',mx+5,my+27,'#f2f8fc',10,80);
  if(g.option)fit(text('arrowNote',{F:plain(c.fScale[0]*1e6)}),16,height-24,'#9fb6c7',10,area-28);
  clock();
  function clock(){fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');}
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('pathGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The potential along the path against the distance carried; the work so far is q times the rise.
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,Ltot=model.length(),N=120,V=s=>model.potential(...model.at(s));
  let vmax=0;for(let i=0;i<=N;i++)vmax=Math.max(vmax,V(i/N));
  const V0=V(0),guessV=c.ask==='potential'?model.answer:c.ask==='work'?V0+model.answer:null;
  const topV=1.25*Math.max(vmax,c.target||0,guessV!==null?Math.min(guessV,2*vmax):0),PX=s=>px0+s*(px1-px0),PY=v=>py1-Math.max(0,Math.min(v,topV))/topV*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  const sNow=Math.min(t/PotentialModel.carry,1),pts=[];for(let i=0;i<=N;i++)pts.push({x:PX(i/N),y:PY(V(i/N))});line(pts,'#5c7a8f',1,[3,3]);
  const done=[];for(let i=0;i<=N*sNow;i++)done.push({x:PX(i/N),y:PY(V(i/N))});done.push({x:PX(sNow),y:PY(V(sNow))});line(done,'#d1e3ed',2);
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{V:plain(c.target)}),px1,PY(c.target)-5,'#9fb6c7',9,px1-px0,'right');}
  if(g.guess&&guessV!==null){line([{x:px0,y:PY(guessV)},{x:px1,y:PY(guessV)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(guessV)-5,'#efb958',9,px1-px0);}
  // The work bracket: from the start level to the potential now.
  if(c.ask==='work'){const x=PX(sNow)+8;line([{x:px0,y:PY(V0)},{x,y:PY(V0)}],'#9fb6c7',1,[2,3]);line([{x,y:PY(V0)},{x,y:PY(V(sNow))}],'#75efc7',2);if(Math.abs(PY(V0)-PY(V(sNow)))>12)fit('W = q·ΔV',Math.min(px1-50,x+4),(PY(V0)+PY(V(sNow)))/2+4,'#75efc7',9,60);}
  dot(PX(sNow),PY(V(sNow)),5,'#f2f8fc');
  label(plain(0),PX(0),py1+14,'#9fb6c7','center',9);label(plain(Number(Ltot.toFixed(2))),PX(1),py1+14,'#9fb6c7','right',9);
  const tick=topV>500?200:topV>250?100:topV>120?50:20;for(let v=tick;v<topV;v+=tick)label(plain(v)+' V',px0-4,PY(v)+3,'#9fb6c7','right',9);label('0',px0-4,py1+3,'#9fb6c7','right',9);
  fit(text('pathAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
