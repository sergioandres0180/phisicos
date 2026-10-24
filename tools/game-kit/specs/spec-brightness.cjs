module.exports = {
kind:'brightness',model:'BrightnessModel',title:'Bulb Brightness',symbol:'P =',unit:'W',equation:'P = V·I = I²·R = V² ÷ R',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .brightness-page .mission-list span{unicode-bidi:plaintext}.brightness-page .line-key.bulb{background:#ffd27a}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['bulb','glowLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V','scalar'],['current-value','currentMetric','A','I = V ÷ R','vector'],['power-value','powerMetric','W','P = I²·R','scalar']],
modelCode:String.raw`
class BrightnessModel {
  // Electrical power is the rate a component turns electrical energy into heat and light: P = V·I = I²·R = V² ÷ R. A
  // bulb's rating (60 W at 230 V) fixes its resistance, R = V² ÷ P, and bulbs keep that resistance here (real filaments
  // change). What a bulb actually gives depends on the circuit, not on its label. Brightness follows the power on a stated
  // scale, full glow at 100 W. The supply ramps steadily from 0 over 2 s and holds for 1 s.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static full = 100;
  static missions = [
    {key:'power',ask:'power',V:12,bulbs:[{R:6}],mark:0},
    {key:'rating',ask:'resistance',V:230,bulbs:[{P:60,V:230,mine:true}],mark:0},
    {key:'chain',ask:'power',V:230,bulbs:[{P:60,V:230},{P:60,V:230}],mark:0},
    {key:'surprise',ask:'power',V:230,bulbs:[{P:60,V:230},{P:100,V:230}],mark:0},
    {key:'half',ask:'power',V:115,bulbs:[{P:100,V:230}],mark:0}
  ];
  static units = {power:'W',resistance:'Ω'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BrightnessModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e7;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Each bulb's resistance: given, from its rating, or your value in the rating test.
  resistances(){return this.config.bulbs.map(b=>b.mine?(this.ready()?this.answer:Infinity):b.R??b.V*b.V/b.P);}
  supply(t){return this.config.V*Math.min(1,Math.max(0,t/BrightnessModel.ramp));}
  current(t){const R=this.resistances().reduce((a,b)=>a+b,0);return Number.isFinite(R)?this.supply(t)/R:0;}
  across(i,t){const R=this.resistances()[i];return Number.isFinite(R)?this.current(t)*R:0;}
  power(i,t){const I=this.current(t),R=this.resistances()[i];return Number.isFinite(R)?I*I*R:0;}
  glow(i,t){return Math.min(1,this.power(i,t)/BrightnessModel.full);}
  duration(){return BrightnessModel.T;}
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
    const c=this.config,b=c.bulbs,R=b.map(x=>x.R??x.V*x.V/x.P),sum=R.reduce((p,q)=>p+q,0);
    if(c.key==='rating')return b[0].V*b[0].V/b[0].P;
    const I=c.V/sum;return I*I*R[c.mark];
  }
  unit(){return BrightnessModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=BrightnessModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      const b=c.bulbs,R=b.map(q=>q.R??q.V*q.V/q.P),I=c.V/R.reduce((p,q)=>p+q,0);
      if(c.key==='power'){if(near(a,R[0]))slip='divided';else if(near(a,1/R[0]))slip='inverted';}
      else if(c.key==='rating'){if(near(a,b[0].V/b[0].P))slip='VoverP';else if(near(a,b[0].P/b[0].V))slip='current';}
      else if(c.key==='chain'){if(near(a,b[0].P/2))slip='halved';else if(near(a,b[0].P))slip='rated';}
      else if(c.key==='surprise'){if(near(a,b[0].P))slip='rated';else if(near(a,I*I*R[1]))slip='swapped';}
      else{if(near(a,b[0].P/2))slip='halved';else if(near(a,b[0].P))slip='rated';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BrightnessModel.missions[saved.index])return false;
    const probe=new BrightnessModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={power:'P =',resistance:'R ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the supply and the current, or the bulbs' ratings and the supply.
function given(m){
  const keys={power:'givenPower',rating:'givenRating',chain:'givenChain',surprise:'givenSurprise',half:'givenHalf'};
  const b=m.bulbs;return text(keys[m.key],{V:plain(m.V),I:plain(2),a:plain(b[0].P??0),b:plain(b[1]?.P??0),r:plain(b[0].V??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='power')return 'P = V·I = 12 × 2 = 24 W';
  if(k==='rating')return 'R = V² ÷ P = 230² ÷ 60 = '+sig(230*230/60)+' Ω';
  if(k==='chain')return 'I = 230 ÷ '+sig(2*230*230/60)+' = '+sig(60/460)+' A, P = I²·R = 15 W';
  if(k==='surprise'){const a=230*230/60,b=230*230/100,i=230/(a+b);return 'I = 230 ÷ '+sig(a+b)+' = '+sig(i)+' A, P₆₀ = I²·R = '+sig(i*i*a)+' W';}
  return 'P = V² ÷ R = 115² ÷ '+sig(529)+' = 25 W';
}
function baseEquation(){return 'P = V·I = I²·R = V² ÷ R';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','current-value','power-value'])$(id).textContent='—';return;}
  $('supply-value').textContent=sig(model.supply(t));$('current-value').textContent=sig(model.current(t));$('power-value').textContent=sig(model.power(model.config.mark,t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={V:sig(model.supply(t)),I:sig(model.current(t)),P:sig(model.power(0,t)),Q:sig(model.power(1,t))};
  return text(c.bulbs.length>1?'twoCopy':'rampCopy',v);
}
// The colour of a bulb lit to brightness b (0 dark gray, 1 full glow).
const lit=b=>'rgb('+Math.round(70+185*b)+','+Math.round(90+120*b)+','+Math.round(105+17*b)+')';
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.12,R=area*.88,Ty=110,By=height-120,sx=L,sy=(Ty+By)/2,ax=R,ay=sy,n=c.bulbs.length,rs=model.resistances();
  const I=g.begun?model.current(t):0,xs=c.bulbs.map((_,i)=>L+(R-L)*(i+1)/(n+1));
  const path=[[sx,sy-30],[sx,Ty],[R,Ty],[R,By],[sx,By],[sx,sy+30]];
  const tagY=By-sy>=80?sy+60:By+16;
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',2);
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(g.begun?sig(model.supply(t))+' V':plain(c.V)+' V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  const tag=text('supplyTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // Each bulb glows with its own power; a wattmeter under it reads that power.
  c.bulbs.forEach((bulb,i)=>{const x=xs[i],b=g.begun?model.glow(i,t):0,w=(R-L)/(n+1);
    if(b>0)dot(x,Ty,16+22*b,'rgba(255,210,120,'+(.12+.4*b)+')');
    dot(x,Ty,15,lit(b));ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x,Ty,15,0,Math.PI*2);ctx.stroke();
    line([{x:x-10,y:Ty-10},{x:x+10,y:Ty+10}],'#f2f8fc',1.5);line([{x:x-10,y:Ty+10},{x:x+10,y:Ty-10}],'#f2f8fc',1.5);
    const name=bulb.P?text('ratedTag',{P:plain(bulb.P),V:plain(bulb.V)}):plain(bulb.R)+' Ω';fit(name,x,Ty-24,'#d1e3ed',10,w-6,'center');
    if(bulb.mine)fit(model.ready()?'R = '+plain(model.answer)+' Ω':'R = ?',x,Ty-38,'#efb958',10,w-6,'center');
    const vy=Ty+48;box(x-38,vy-11,76,22,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.2;ctx.strokeRect(x-38,vy-11,76,22);
    fit(g.begun?sig(model.power(i,t))+' W':'? W',x,vy+4,'#f2f8fc',11,70,'center');label('W',x-30,vy-14,'#9fb6c7','left',9);});
  dot(ax,ay,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(ax,ay,14,0,Math.PI*2);ctx.stroke();label('A',ax,ay+4,'#f2f8fc','center',12);
  box(ax-46,ay+20,92,20,'#0b1c29');fit(g.begun?sig(I)+' A':'? A',ax,ay+34,'#f2f8fc',11,86,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),(L+R)/2,By+30,'#efb958',10,area*.6,'center');
  if(g.option&&I>0){
    const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
    const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const q=(d-s0)/l;return [a[0]+(bb[0]-a[0])*q,a[1]+(bb[1]-a[1])*q,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
    const skip=(x,y)=>Math.abs(y-Ty)<18&&xs.some(x0=>Math.abs(x-x0)<20)||Math.hypot(x-ax,y-ay)<18||Math.abs(x-ax)<8&&y>ay&&y<ay+44||Math.abs(x-sx)<8&&y>tagY-26&&y<tagY+18;
    const shift=t*I/(model.current(model.duration())*model.duration()||1)*120;
    for(let d=0;d<total;d+=32){const [x,y]=at(d-shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    for(const fr of [.15,.45,.7,.92]){const [x0,y0,ux,uy]=at(fr*total),x=x0-uy*11,y=y0+ux*11;if(skip(x0,y0))continue;line([{x:x-ux*11,y:y-uy*11},{x:x+ux*11,y:y+uy*11}],'#75efc7',3);line([{x:x+ux*4-uy*5,y:y+uy*4+ux*5},{x:x+ux*11,y:y+uy*11},{x:x+ux*4+uy*5,y:y+uy*4-ux*5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g,t=model.now();
  fit(text('powerGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+20,px1=width-14,py0=86,py1=height-64,n=c.bulbs.length,T=model.duration();
  // A bar for each bulb's actual power, beside a dashed outline of the power on its label.
  let top=0;for(let i=0;i<n;i++)top=Math.max(top,model.power(i,T),c.bulbs[i].P||0);top=Math.max(top,c.ask==='power'&&g.guess?Math.min(model.answer,3*top||1):0,1e-9)*1.2;
  const PY=v=>py1-Math.max(0,Math.min(v,top))/top*(py1-py0),w=Math.min(46,(px1-px0)/n*.5);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  c.bulbs.forEach((bulb,i)=>{const x=px0+(px1-px0)*(i+.5)/n,v=model.power(i,t);
    if(bulb.P){ctx.setLineDash([4,3]);ctx.strokeStyle='#9fb6c7';ctx.lineWidth=1;ctx.strokeRect(x-w/2-4,PY(bulb.P),w+8,py1-PY(bulb.P));ctx.setLineDash([]);fit(text('labelTag',{P:plain(bulb.P)}),x,PY(bulb.P)-5,'#9fb6c7',9,(px1-px0)/n-4,'center');}
    box(x-w/2,PY(v),w,py1-PY(v),'#ffd27a');label(sig(v)+' W',x,Math.min(PY(v)-6,py1-6),'#f2f8fc','center',10);
    fit(bulb.P?text('ratedTag',{P:plain(bulb.P),V:plain(bulb.V)}):plain(bulb.R)+' Ω',x,py1+14,'#9fb6c7',9,(px1-px0)/n-4,'center');});
  if(c.ask==='power'&&g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
}
`
};
