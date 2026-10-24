module.exports = {
kind:'parallel',model:'ParallelModel',title:'Room Wiring',symbol:'R =',unit:'Ω',equation:'1/R = 1/R₁ + 1/R₂ + …',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .parallel-page .mission-list span{unicode-bidi:plaintext}.parallel-page .line-key.lamp{background:#ffd27a}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['lamp','branchLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V','scalar'],['main-value','mainMetric','A','I = I₁ + I₂ + …','vector'],['total-value','totalMetric','Ω','R = V ÷ I','scalar']],
modelCode:String.raw`
class ParallelModel {
  // Parallel branches each get the full supply voltage, so each draws I = V ÷ R on its own and the main current is the sum;
  // the combined resistance follows 1/R = 1/R₁ + 1/R₂ + …. The supply is steady; the branches switch on in turn over 2 s
  // (branch k of n at 2·(k + 1) ÷ n s) and the run ends at 3 s. In the unplug test one lamp is unplugged at 2.5 s. A main
  // breaker trips the exact moment the main current passes its rating (within 0.05% counts as holding), and every branch
  // goes off. Teaching values, not safety limits.
  static T = 3;
  static tolerance = .02;
  static grace = .0005;
  static unplugAt = 2.5;
  static missions = [
    {key:'pair',ask:'resistance',V:12,R:[6,3]},
    {key:'draw',ask:'current',V:12,R:[6,3]},
    {key:'unplug',ask:'current',V:12,R:[12,12,12],unplug:0,lamp:true},
    {key:'match',ask:'partner',V:12,R:[10,null],target:4},
    {key:'breaker',ask:'count',V:230,lamp:true,each:.5,breaker:16}
  ];
  static units = {resistance:'Ω',current:'A',partner:'Ω',count:''};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=ParallelModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){if(!Number.isFinite(value)||value<=0)return false;return this.config.ask==='count'?Number.isInteger(value)&&value<=1000:value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The branches: given, with your resistor in the match test, or your number of lamps on the breaker.
  resistances(){const c=this.config;if(c.R)return c.R.map(r=>r??(this.ready()?this.answer:Infinity));return Array(this.ready()?this.answer:0).fill(c.V/c.each);}
  count(){return this.resistances().length;}
  onTime(k){return 2*(k+1)/this.count();}
  // The breaker trips when the lamp that pushes the current past its rating switches on.
  trips(){const c=this.config;return !!c.breaker&&this.ready()&&this.count()*c.each>c.breaker*(1+ParallelModel.grace);}
  tripTime(){const c=this.config;return this.trips()?this.onTime(Math.floor(c.breaker*(1+ParallelModel.grace)/c.each)):Infinity;}
  tripped(t){return t>=this.tripTime()-1e-9;}
  unplugged(k,t){return this.config.unplug===k&&t>=ParallelModel.unplugAt-1e-9;}
  on(k,t){return t>=this.onTime(k)-1e-9&&!this.unplugged(k,t)&&!this.tripped(t);}
  branch(k,t){const R=this.resistances()[k];return this.on(k,t)&&Number.isFinite(R)?this.config.V/R:0;}
  lit(t){let n=0;for(let k=0;k<this.count();k++)if(this.on(k,t))n++;return n;}
  main(t){let I=0;for(let k=0;k<this.count();k++)I+=this.branch(k,t);return I;}
  total(t){const I=this.main(t);return I>0?this.config.V/I:Infinity;}
  duration(){return ParallelModel.T;}
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
    const c=this.config,R=c.R;
    return {pair:()=>1/(1/R[0]+1/R[1]),draw:()=>c.V/R[0]+c.V/R[1],unplug:()=>c.V/R[1]+c.V/R[2],match:()=>1/(1/c.target-1/R[0]),breaker:()=>Math.floor(c.breaker*(1+ParallelModel.grace)/c.each)}[c.key]();
  }
  unit(){return ParallelModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=ParallelModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    // The breaker is a limit: the most whole number of lamps that does not trip it.
    const ok=c.key==='breaker'?a===x:near(a,x);let slip=null;
    if(!ok){
      const R=c.R;
      if(c.key==='pair'){if(near(a,R[0]+R[1]))slip='added';else if(near(a,(R[0]+R[1])/2))slip='average';else if(near(a,1/R[0]+1/R[1]))slip='sumInverse';}
      else if(c.key==='draw'){if(near(a,c.V/(R[0]+R[1])))slip='series';else if(near(a,c.V/R[0])||near(a,c.V/R[1]))slip='oneBranch';}
      else if(c.key==='unplug'){if(near(a,3*c.V/R[0]))slip='same';else if(near(a,c.V/R[0]))slip='oneLamp';}
      else if(c.key==='match'){if(near(a,R[0]-c.target))slip='subtracted';else if(near(a,1/c.target-1/R[0]))slip='inverted';}
      else{if(near(a,c.breaker*c.each))slip='multiplied';else slip=this.trips()?'tripped':'spare';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!ParallelModel.missions[saved.index])return false;
    const probe=new ParallelModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={resistance:'R =',current:'I =',partner:'R₂ =',count:'N ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the branches and the supply, the combined resistance wanted, or the lamps and the breaker.
function given(m){
  const keys={pair:'givenPair',draw:'givenDraw',unplug:'givenUnplug',match:'givenMatch',breaker:'givenBreaker'};
  return text(keys[m.key],{V:plain(m.V),a:plain(m.R?.[0]??0),b:plain(m.R?.[1]??0),t:plain(m.target??0),e:plain(m.each??0),B:plain(m.breaker??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='pair')return '1/R = 1/6 + 1/3 = 1/2, R = 2 Ω';
  if(k==='draw')return 'I = 12 ÷ 6 + 12 ÷ 3 = 2 + 4 = 6 A';
  if(k==='unplug')return 'I = 12 ÷ 12 + 12 ÷ 12 = 2 A';
  if(k==='match')return '1/R₂ = 1/4 − 1/10, R₂ = '+sig(20/3)+' Ω';
  return 'N = 16 ÷ '+plain(.5)+' = 32';
}
function baseEquation(){return '1/R = 1/R₁ + 1/R₂ + …';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','main-value','total-value'])$(id).textContent='—';return;}
  const R=model.total(t);$('supply-value').textContent=sig(model.config.V);$('main-value').textContent=sig(model.main(t));$('total-value').textContent=Number.isFinite(R)?sig(R):'∞';
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={V:plain(c.V),I:sig(model.main(t)),n:plain(model.lit(t)),N:plain(model.count()),B:plain(c.breaker??0),m:plain(Math.floor((c.breaker??0)*(1+ParallelModel.grace)/(c.each||1))+1)};
  if(model.tripped(t))return text('tripCopy',v);
  if(c.unplug!==undefined&&model.unplugged(c.unplug,t))return text('unplugCopy',v);
  return text('switchCopy',v);
}
// The colour of a lamp lit (b = 1) or dark (b = 0).
const lit=b=>'rgb('+Math.round(70+185*b)+','+Math.round(90+120*b)+','+Math.round(105+17*b)+')';
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.1,R=area*.92,Ty=104,By=height-104,sx=L,sy=(Ty+By)/2,n=model.count(),rs=model.resistances();
  const x0=L+area*(c.breaker?.3:.22),bx=k=>x0+(R-x0)*(k+.5)/Math.max(n,1),many=n>5,mx=(sx+x0)/2-(c.breaker?area*.06:0),kx=(sx+x0)/2+area*.07;
  const tripped=g.begun&&model.tripped(t),I=g.begun?model.main(t):0;
  // The rails: live on top from the supply's +, neutral below back to its −.
  const end=n?bx(n-1):R;line([{x:sx,y:sy-30},{x:sx,y:Ty},{x:end,y:Ty}],'#c9d6e0',2);line([{x:end,y:By},{x:sx,y:By},{x:sx,y:sy+30}],'#c9d6e0',2);
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(plain(c.V)+' V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  const tagY=By-sy>=80?sy+60:By+16,tag=text('supplyTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // The main ammeter on the live rail, and the main breaker in the breaker test.
  dot(mx,Ty,13,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(mx,Ty,13,0,Math.PI*2);ctx.stroke();label('A',mx,Ty+4,'#f2f8fc','center',11);
  box(mx-34,Ty-38,68,18,'#0b1c29');fit(g.begun?sig(I)+' A':'? A',mx,Ty-25,'#f2f8fc',11,62,'center');
  if(c.breaker){box(kx-16,Ty-9,32,18,tripped?'#3a2a20':'#102637');ctx.strokeStyle=tripped?'#ff9a6a':'#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(kx-16,Ty-9,32,18);
    line([{x:kx-8,y:Ty+4},{x:kx+8,y:tripped?Ty-12:Ty-4}],tripped?'#ff9a6a':'#d1e3ed',2);fit(text(tripped?'trippedTag':'breakerTag',{B:plain(c.breaker)}),kx,Ty+26,tripped?'#efb958':'#9fb6c7',9,area*.25,'center');}
  // The branches, each between the rails with its own switch and, for a few, its own ammeter.
  const ly=sy-8,ay=By-30;
  for(let k=0;k<n;k++){
    const x=bx(k),on=g.begun&&model.on(k,t),out=g.begun&&c.unplug===k&&model.unplugged(k,t),Ik=g.begun?model.branch(k,t):0,col=on?'#c9d6e0':'#5c7a8f';
    if(many){line([{x,y:Ty},{x,y:By}],col,1);const b=on?1:0;if(b)dot(x,ly,6,'rgba(255,210,120,.35)');dot(x,ly,3.5,lit(b));continue;}
    // The switch: closed once the branch is on, open (a tilted blade) before and after.
    line([{x,y:Ty},{x,y:Ty+14}],col,2);if(on)line([{x,y:Ty+14},{x,y:Ty+30}],col,2);else line([{x,y:Ty+14},{x:x+11,y:Ty+27}],col,2);
    line([{x,y:Ty+30},{x,y:By}],col,2);
    if(c.lamp){const b=on?1:0;if(b)dot(x,ly,24,'rgba(255,210,120,.3)');dot(x,ly,13,out?'#0b1c29':lit(b));ctx.beginPath();ctx.strokeStyle=out?'#5c7a8f':'#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x,ly,13,0,Math.PI*2);ctx.stroke();
      line([{x:x-9,y:ly-9},{x:x+9,y:ly+9}],out?'#5c7a8f':'#f2f8fc',1.5);line([{x:x-9,y:ly+9},{x:x+9,y:ly-9}],out?'#5c7a8f':'#f2f8fc',1.5);
      if(out)fit(text('unpluggedTag'),x,ly-22,'#efb958',10,(R-x0)/n-4,'center');}
    else{box(x-11,ly-24,22,48,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.strokeRect(x-11,ly-24,22,48);}
    const name=Number.isFinite(rs[k])?plain(rs[k])+' Ω':'R₂ = ?';if(!out)fit(name,x+16,ly+4,'#d1e3ed',10,(R-x0)/n-22);
    dot(x,ay,11,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.2;ctx.arc(x,ay,11,0,Math.PI*2);ctx.stroke();label('A',x,ay+4,'#f2f8fc','center',10);
    fit(g.begun?sig(Ik)+' A':'? A',x+14,ay+4,'#f2f8fc',10,(R-x0)/n-18);
  }
  if(c.breaker)fit(n?text('lampsTag',{N:plain(n)}):'N = ?',(x0+R)/2,By+18,'#d1e3ed',10,R-x0,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+(model.unit()?' '+model.unit():''),(L+R)/2,By+(c.breaker?34:30),'#efb958',10,area*.6,'center');
  // The two directions: mint current arrows into each branch, sky electrons moving the other way along every wire.
  if(g.option&&I>0){
    const top=g.begun?Math.max(...Array.from({length:3},(_,i)=>model.main(model.duration()*(i+1)/3)),I):1,phase=(t*36/(top||1));
    const flow=(xa,ya,xb,yb,Ic)=>{if(Ic<=0)return;const len=Math.hypot(xb-xa,yb-ya),ux=(xb-xa)/len,uy=(yb-ya)/len,off=((phase*Ic)%22+22)%22;
      for(let d=off;d<len;d+=22){const x=xb-ux*d,y=yb-uy*d;if(Math.hypot(x-mx,y-Ty)<16||c.breaker&&Math.abs(x-kx)<20&&Math.abs(y-Ty)<12)continue;if(!many&&Math.abs(x-xb)<1&&(Math.abs(y-ly)<28||Math.abs(y-ay)<14))continue;
        dot(x,y,3.5,'#77b9ff');line([{x:x-2,y},{x:x+2,y}],'#0b1c29',1.2);}};
    // Electrons run against the current: leftward on the live rail, up each branch, rightward on the neutral rail.
    let rest=I;if(n)flow(sx,Ty,bx(0),Ty,rest);
    for(let k=0;k<n;k++){const x=bx(k),Ik=model.branch(k,t);if(!many)flow(x,Ty+30,x,By,Ik);rest-=Ik;if(k+1<n&&rest>1e-12){flow(x,Ty,bx(k+1),Ty,rest);flow(bx(k+1),By,x,By,rest);}}
    if(n)flow(bx(0),By,sx,By,I);
    const ax=(sx+mx)/2;line([{x:ax-10,y:Ty-12},{x:ax+10,y:Ty-12}],'#75efc7',3);line([{x:ax+4,y:Ty-17},{x:ax+10,y:Ty-12},{x:ax+4,y:Ty-7}],'#75efc7',3);
    if(!many)for(let k=0;k<n;k++)if(model.branch(k,t)>0){const x=bx(k)-14,y=Ty+50;line([{x,y:y-10},{x,y:y+10}],'#75efc7',3);line([{x:x-5,y:y+4},{x,y:y+10},{x:x+5,y:y+4}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('mainGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+36,px1=width-14,py0=86,py1=height-64,T=model.duration();
  // The main current against time: it steps up as each branch switches on, and down when one goes off.
  let top=0;for(let i=0;i<=300;i++)top=Math.max(top,model.main(T*i/300));
  top=Math.max(top,c.breaker||0,c.target?c.V/c.target:0,c.ask==='current'&&g.guess?Math.min(model.answer,3*top||1):0,1e-9)*1.2;
  const PX=s=>px0+s/T*(px1-px0),PY=i=>py1-Math.max(0,Math.min(i,top))/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  const pts=[];for(let i=0;i<=360;i++){const s=t*i/360;pts.push({x:PX(s),y:PY(model.main(s))});}line(pts,'#d1e3ed',2);dot(PX(t),PY(model.main(t)),4,'#f2f8fc');
  label(sig(model.main(t))+' A',PX(t)-6,PY(model.main(t))-8,'#f2f8fc','right',10);
  if(c.breaker){line([{x:px0,y:PY(c.breaker)},{x:px1,y:PY(c.breaker)}],'#ff9a6a',1.5,[5,4]);fit(text('breakerTag',{B:plain(c.breaker)}),px0+4,PY(c.breaker)-5,'#ff9a6a',9,(px1-px0)*.7);}
  if(c.target){const it=c.V/c.target;line([{x:px0,y:PY(it)},{x:px1,y:PY(it)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{R:plain(c.target),I:plain(it)}),px0+4,PY(it)-5,'#9fb6c7',9,(px1-px0)*.8);}
  if(c.ask==='current'&&g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
  const Rt=model.total(t);if(Number.isFinite(Rt))fit('R = '+plain(c.V)+' V ÷ '+sig(model.main(t))+' A = '+sig(Rt)+' Ω',g.area+8,66,'#d1e3ed',10,width-g.area-16);
  for(const s of [0,1,2,3])label(plain(s),PX(s),py1+14,'#9fb6c7','center',9);
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
