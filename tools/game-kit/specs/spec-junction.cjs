module.exports = {
kind:'junction',model:'JunctionModel',title:'Current Splitter',symbol:'I₂ =',unit:'A',equation:'I = I₁ + I₂ + …',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .junction-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','meterLegend'],['orange','guessLegend']],
metrics:[['in-value','inMetric','A','I_in','vector'],['out-value','outMetric','A','I₁ + I₂ + …','vector'],['branch-value','branchMetric','V','V = I₁·R₁ = I₂·R₂','scalar']],
modelCode:String.raw`
class JunctionModel {
  // At a junction the current splits and joins with nothing lost: what flows in flows out, I = I₁ + I₂ + … (Kirchhoff's
  // current law). Branches in parallel share one voltage, so each current is I_k = V ÷ R_k and the currents divide
  // inversely to resistance. The source (a voltage, or a fixed current fed in) ramps steadily from 0 over 2 s and holds for
  // 1 s; in the add test the second branch is switched on at 2 s. A meter is a resistance like any other branch.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static missions = [
    {key:'rest',ask:'branch',I:3,R:[5,10/3],hidden:true},
    {key:'divide',ask:'current',I:6,R:[2,4]},
    {key:'main',ask:'current',V:6,R:[12,20,30]},
    {key:'add',ask:'current',V:12,R:[4,6],late:1},
    {key:'shunt',ask:'shunt',I:1,R:[20,null],meter:.05}
  ];
  static units = {branch:'A',current:'A',shunt:'Ω'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=JunctionModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The branches: given, with your shunt beside the meter in the last test.
  resistances(){return this.config.R.map(r=>r??(this.ready()?this.answer:Infinity));}
  count(){return this.config.R.length;}
  ramp(t){return Math.min(1,Math.max(0,t/JunctionModel.ramp));}
  on(k,t){return this.config.late!==k||t>=JunctionModel.ramp-1e-9;}
  conductance(t){return this.resistances().reduce((a,r,k)=>a+(this.on(k,t)?1/r:0),0);}
  // The shared voltage across the branches: the source's, or the fed current over the branches' conductance.
  voltage(t){const c=this.config;if(c.V!==undefined)return c.V*this.ramp(t);const G=this.conductance(t);return G>0?c.I*this.ramp(t)/G:0;}
  branch(k,t){return this.on(k,t)?this.voltage(t)/this.resistances()[k]:0;}
  main(t){let I=0;for(let k=0;k<this.count();k++)I+=this.branch(k,t);return I;}
  duration(){return JunctionModel.T;}
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
    const c=this.config,R=c.R,G=R.reduce((a,r)=>a+(r?1/r:0),0);
    return {rest:()=>c.I*(1/R[1])/G,divide:()=>c.I*(1/R[0])/G,main:()=>R.reduce((a,r)=>a+c.V/r,0),add:()=>c.V/R[0],shunt:()=>c.meter*R[0]/(c.I-c.meter)}[c.key]();
  }
  unit(){return JunctionModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=JunctionModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      const R=c.R,known=c.key==='rest'?c.I-x:0;
      if(c.key==='rest'){if(near(a,c.I+known))slip='added';else if(near(a,c.I))slip='whole';}
      else if(c.key==='divide'){if(near(a,c.I-x))slip='swapped';else if(near(a,c.I/2))slip='equal';}
      else if(c.key==='main'){if(near(a,c.V/R[0]))slip='largest';else if(near(a,x/3))slip='average';}
      else if(c.key==='add'){if(near(a,x*R[1]/(R[0]+R[1])))slip='shared';else if(near(a,x/2))slip='halved';}
      else{if(near(a,c.meter*R[0]/c.I))slip='noSubtract';else if(near(a,R[0]*(c.I-c.meter)/c.meter))slip='inverted';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!JunctionModel.missions[saved.index])return false;
    const probe=new JunctionModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={branch:'I₂ =',current:'I =',shunt:'R_s ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the current in and one branch, the two branches, the branch currents, the added branch, or the meter.
function given(m){
  const keys={rest:'givenRest',divide:'givenDivide',main:'givenMain',add:'givenAdd',shunt:'givenShunt'};
  const k={rest:1.2};return text(keys[m.key],{I:plain(m.I??0),V:plain(m.V??0),k:plain(k[m.key]??0),a:plain(m.R[0]),b:plain(m.R[1]??0),x:plain(.5),y:plain(.3),z:plain(.2),m:plain(1000*(m.meter??0))});
}
function equation(){
  const k=model.config.key;
  if(k==='rest')return 'I₂ = 3 − '+plain(1.2)+' = '+plain(1.8)+' A';
  if(k==='divide')return 'I₁ = 6 × 4 ÷ (2 + 4) = 4 A';
  if(k==='main')return 'I = '+plain(.5)+' + '+plain(.3)+' + '+plain(.2)+' = 1 A';
  if(k==='add')return 'I₁ = 12 ÷ 4 = 3 A';
  return 'R_s = '+plain(.05)+' × 20 ÷ (1 − '+plain(.05)+') = '+sig(1/.95)+' Ω';
}
function baseEquation(){return 'I = I₁ + I₂ + …';}
function metrics(t,begun){
  if(!begun){for(const id of ['in-value','out-value','branch-value'])$(id).textContent='—';return;}
  $('in-value').textContent=sig(model.main(t));$('out-value').textContent=sig(model.main(t));$('branch-value').textContent=sig(model.voltage(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={I:sig(model.main(t)),V:sig(model.voltage(t)),A:sig(model.branch(0,t)),m:sig(1000*model.branch(0,t))};
  if(c.late!==undefined&&model.on(c.late,t))return text('addCopy',v);
  if(c.meter)return text('meterCopy',v);
  return text('rampCopy',v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.1,R=area*.92,Ty=104,By=height-104,sx=L,sy=(Ty+By)/2,n=model.count(),rs=model.resistances();
  const x0=L+area*.26,bx=k=>x0+(R-x0)*(k+.5)/n,mx=(sx+x0)/2,ly=sy-8,ay=By-30,I=g.begun?model.main(t):0;
  line([{x:sx,y:sy-30},{x:sx,y:Ty},{x:bx(n-1),y:Ty}],'#c9d6e0',2);line([{x:bx(n-1),y:By},{x:sx,y:By},{x:sx,y:sy+30}],'#c9d6e0',2);
  // The source: a voltage supply, or a current source (a circle with an arrow) feeding a fixed current.
  if(c.V!==undefined){box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);fit(plain(c.V)+' V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);}
  else{dot(sx,sy,30,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(sx,sy,30,0,Math.PI*2);ctx.stroke();line([{x:sx,y:sy+16},{x:sx,y:sy-14}],'#f2f8fc',2);line([{x:sx-6,y:sy-7},{x:sx,y:sy-14},{x:sx+6,y:sy-7}],'#f2f8fc',2);fit(plain(c.I)+' A',sx+36,sy+4,'#f2f8fc',11,area*.15);}
  const tagY=By-sy>=80?sy+60:By+16,tag=text(c.V!==undefined?'supplyTag':'sourceTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // The meter on the way in.
  dot(mx,Ty,13,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(mx,Ty,13,0,Math.PI*2);ctx.stroke();label('A',mx,Ty+4,'#f2f8fc','center',11);
  box(mx-34,Ty-38,68,18,'#0b1c29');fit(g.begun?sig(I)+' A':'? A',mx,Ty-25,'#f2f8fc',11,62,'center');fit(text('inTag'),mx,Ty+28,'#9fb6c7',9,x0-sx-10,'center');
  // The junctions where the current splits (top) and joins (bottom).
  for(let k=0;k<n;k++){dot(bx(k),Ty,4,'#f2f8fc');dot(bx(k),By,4,'#f2f8fc');}
  for(let k=0;k<n;k++){
    const x=bx(k),on=!g.begun||model.on(k,t),Ik=g.begun?model.branch(k,t):0,col=on?'#c9d6e0':'#5c7a8f',w=(R-x0)/n;
    if(c.late===k&&!model.on(k,t)){line([{x,y:Ty},{x,y:Ty+14}],col,2);line([{x,y:Ty+14},{x:x+11,y:Ty+27}],col,2);line([{x,y:Ty+30},{x,y:By}],col,2);}
    else line([{x,y:Ty},{x,y:By}],col,2);
    if(c.meter&&k===0){
      // The sensitive meter: a dial that reads 0 to 50 mA, pinned when the current is more.
      const r=20,f=Math.min(1.08,Ik/c.meter),a=Math.PI*(1.15-1.3*Math.min(1,f));dot(x,ly,r,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x,ly,r,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.strokeStyle='#5c7a8f';ctx.lineWidth=1;ctx.arc(x,ly+4,r-6,Math.PI*1.15,Math.PI*1.85,false);ctx.stroke();
      line([{x,y:ly+4},{x:x+Math.cos(a)*(r-5),y:ly+4-Math.sin(a)*(r-5)}],f>1.0005?'#ff9a6a':'#efb958',2);
      fit(text('meterTag',{m:plain(1000*c.meter),r:plain(rs[0])}),x,ly+r+14,'#d1e3ed',9,w-6,'center');
      box(x-34,ly+r+20,68,18,'#0b1c29');fit(g.begun?sig(1000*Ik)+' mA':'? mA',x,ly+r+33,f>1.0005?'#efb958':'#f2f8fc',10,62,'center');continue;
    }
    box(x-11,ly-24,22,48,'#102637');ctx.strokeStyle=on?'#f2f8fc':'#5c7a8f';ctx.lineWidth=2;ctx.strokeRect(x-11,ly-24,22,48);
    const name=c.hidden?'R'+'₁₂₃'[k]:Number.isFinite(rs[k])?plain(rs[k])+' Ω':'R_s = ?';fit(name,x+16,ly+4,'#d1e3ed',10,w-22);
    dot(x,ay,11,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.2;ctx.arc(x,ay,11,0,Math.PI*2);ctx.stroke();label('A',x,ay+4,'#f2f8fc','center',10);
    fit(g.begun?sig(Ik)+' A':'? A',x+14,ay+4,'#f2f8fc',10,w-18);
  }
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),(L+R)/2,By+30,'#efb958',10,area*.6,'center');
  // The two directions: mint arrows show the current splitting; sky electrons run the other way, faster where more flows.
  if(g.option&&I>0){
    const top=model.main(model.duration())||1,phase=t*36/top;
    const flow=(xa,ya,xb,yb,Ic)=>{if(Ic<=1e-12)return;const len=Math.hypot(xb-xa,yb-ya),ux=(xb-xa)/len,uy=(yb-ya)/len,off=((phase*Ic)%22+22)%22;
      for(let d=off;d<len;d+=22){const x=xb-ux*d,y=yb-uy*d;if(Math.hypot(x-mx,y-Ty)<16||Math.abs(y-ly)<30&&Math.abs(x-xb)<1||Math.abs(y-ay)<14&&Math.abs(x-xb)<1)continue;dot(x,y,3.5,'#77b9ff');line([{x:x-2,y},{x:x+2,y}],'#0b1c29',1.2);}};
    let rest=I;flow(sx,Ty,bx(0),Ty,rest);
    for(let k=0;k<n;k++){const x=bx(k),Ik=model.branch(k,t);flow(x,Ty,x,By,Ik);rest-=Ik;if(k+1<n&&rest>1e-12){flow(x,Ty,bx(k+1),Ty,rest);flow(bx(k+1),By,x,By,rest);}}
    flow(bx(0),By,sx,By,I);
    const ax=(sx+mx)/2;line([{x:ax-10,y:Ty-12},{x:ax+10,y:Ty-12}],'#75efc7',3);line([{x:ax+4,y:Ty-17},{x:ax+10,y:Ty-12},{x:ax+4,y:Ty-7}],'#75efc7',3);
    for(let k=0;k<n;k++)if(model.branch(k,t)>0){const x=bx(k)-14,y=Ty+42;line([{x,y:y-10},{x,y:y+10}],'#75efc7',3);line([{x:x-5,y:y+4},{x,y:y+10},{x:x+5,y:y+4}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g,t=model.now();
  fit(text('splitGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+20,px1=width-14,py0=92,py1=height-64,n=model.count(),T=model.duration();
  // A bar for the current in, then one for each branch: the branch bars add up to the first.
  const vals=[model.main(t),...Array.from({length:n},(_,k)=>model.branch(k,t))];
  let top=0;for(let i=0;i<=30;i++)top=Math.max(top,model.main(T*i/30));top=Math.max(top,c.ask!=='shunt'&&g.guess?Math.min(model.answer,3*top||1):0,1e-9)*1.25;
  const PY=v=>py1-Math.max(0,Math.min(v,top))/top*(py1-py0),m=n+1,w=Math.min(40,(px1-px0)/m*.55);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  vals.forEach((v,i)=>{const x=px0+(px1-px0)*(i+.5)/m;box(x-w/2,PY(v),w,py1-PY(v),i===0?'#d1e3ed':'#5c7a8f');label(sig(v)+' A',x,PY(v)-6,'#f2f8fc','center',9);
    fit(i===0?text('inTag'):(c.meter&&i===1?'G':'I'+'₁₂₃'[i-1]),x,py1+14,'#9fb6c7',9,(px1-px0)/m-4,'center');});
  if(c.ask!=='shunt'&&g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
  fit(vals.slice(1).map(v=>sig(v)).join(' + ')+' = '+sig(vals[0])+' A',g.area+8,66,'#d1e3ed',10,width-g.area-16);
}
`
};
