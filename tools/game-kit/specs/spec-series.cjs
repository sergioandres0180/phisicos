module.exports = {
kind:'series',model:'SeriesModel',title:'Bulb Chain',symbol:'I =',unit:'A',equation:'R = R₁ + R₂ + …',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .series-page .mission-list span{unicode-bidi:plaintext}.series-page .line-key.bulb{background:#ffd27a}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['bulb','bulbLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V_supply','scalar'],['current-value','currentMetric','A','I = V ÷ R','vector'],['bulb-value','bulbMetric','V','V = I·R','scalar']],
modelCode:String.raw`
class SeriesModel {
  // Bulbs in series share one path: the same current flows through each, the resistances add, R = R₁ + R₂ + …, and the
  // supply's voltage is shared in proportion to each resistance, V₁ = I·R₁. Bulbs keep fixed resistances (real filaments
  // change). The supply ramps steadily from 0 to its voltage over 2 s and holds for 1 s; a bulb burns out the exact moment
  // its voltage passes its rating (a voltage within 0.05% of the rating counts as holding), and then every bulb goes out.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static grace = .0005;
  static missions = [
    {key:'three',ask:'current',V:12,R:[4,4,4],mark:1,full:16},
    {key:'total',ask:'resistance',V:20,R:[2,5,3],mark:1,full:16},
    {key:'share',ask:'voltage',V:20,R:[2,5,3],mark:1,full:16},
    {key:'fourth',ask:'current',V:12,R:[4,4,4,4],mark:1,full:16},
    {key:'lights',ask:'count',V:230,bulb:12.5,rated:2.5,full:.5}
  ];
  static units = {current:'A',resistance:'Ω',voltage:'V',count:''};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SeriesModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){if(!Number.isFinite(value)||value<=0)return false;return this.config.ask==='count'?Number.isInteger(value)&&value<=1000:value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The bulbs in the chain: given, or your number of fairy lights.
  count(){const c=this.config;return c.R?c.R.length:(this.ready()?this.answer:0);}
  resistances(){const c=this.config;return c.R??Array(this.count()).fill(c.bulb);}
  total(){return this.resistances().reduce((a,b)=>a+b,0);}
  supply(t){return this.config.V*Math.min(1,Math.max(0,t/SeriesModel.ramp));}
  drive(t){const R=this.total();return R>0?this.supply(t)/R:0;}
  // In the fairy lights, each bulb gets V ÷ N; too few bulbs and one burns out, breaking the only path.
  blows(){const c=this.config;return !!c.rated&&this.ready()&&c.V/this.count()>c.rated*(1+SeriesModel.grace);}
  blowTime(){const c=this.config;return this.blows()?SeriesModel.ramp*c.rated*this.count()/c.V:Infinity;}
  blown(t){return t>=this.blowTime();}
  current(t){return this.blown(t)?0:this.drive(t);}
  across(i,t){return this.current(t)*(this.resistances()[i]??0);}
  marked(t){return this.across(this.config.mark??0,t);}
  // Brightness follows each bulb's power on a stated scale: full glow at the test's full power.
  glow(i,t){const I=this.current(t);return Math.min(1,I*I*(this.resistances()[i]??0)/this.config.full);}
  duration(){return SeriesModel.T;}
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
    const c=this.config,R=c.R,sum=R?R.reduce((a,b)=>a+b,0):0;
    return {three:()=>c.V/sum,total:()=>sum,share:()=>c.V*R[c.mark]/sum,fourth:()=>c.V/sum,lights:()=>Math.ceil(c.V/c.rated/(1+SeriesModel.grace))}[c.key]();
  }
  unit(){return SeriesModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=SeriesModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    // The fairy lights are a limit: the fewest whole number of bulbs that none burns out.
    const ok=c.key==='lights'?a===x:near(a,x);let slip=null;
    if(!ok){
      const R=c.R,sum=R?R.reduce((p,q)=>p+q,0):0;
      if(c.key==='three'){if(near(a,c.V/R[0]))slip='oneBulb';else if(near(a,sum))slip='resistance';}
      else if(c.key==='total'){if(near(a,1/R.reduce((p,q)=>p+1/q,0)))slip='parallel';else if(near(a,sum/R.length))slip='average';}
      else if(c.key==='share'){if(near(a,c.V/R.length))slip='equalShare';else if(near(a,c.V/sum))slip='current';}
      else if(c.key==='fourth'){if(near(a,c.V/(sum-R[0])))slip='same';else if(near(a,c.V/(sum-R[0])*R.length/(R.length-1)))slip='more';}
      else{if(near(a,c.V*c.rated))slip='multiplied';else slip=this.blows()?'blown':'notFewest';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SeriesModel.missions[saved.index])return false;
    const probe=new SeriesModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={current:'I =',resistance:'R =',voltage:'V =',count:'N ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the bulbs and the supply, or the fairy lights' rating.
function given(m){
  const keys={three:'givenThree',total:'givenTotal',share:'givenShare',fourth:'givenFourth',lights:'givenLights'};
  return text(keys[m.key],{V:plain(m.V),R:plain(m.R?.[0]??0),a:plain(m.R?.[0]??0),b:plain(m.R?.[1]??0),c:plain(m.R?.[2]??0),v:plain(m.rated??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='three')return 'I = V ÷ (R₁ + R₂ + R₃) = 12 ÷ 12 = 1 A';
  if(k==='total')return 'R = R₁ + R₂ + R₃ = 2 + 5 + 3 = 10 Ω';
  if(k==='share')return 'I = 20 ÷ 10 = 2 A, V₂ = I·R₂ = 2 × 5 = 10 V';
  if(k==='fourth')return 'I = 12 ÷ (4 × 4) = '+plain(.75)+' A';
  return 'N = 230 ÷ '+plain(2.5)+' = 92';
}
function baseEquation(){return 'R = R₁ + R₂ + …';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','current-value','bulb-value'])$(id).textContent='—';return;}
  $('supply-value').textContent=sig(model.supply(t));$('current-value').textContent=sig(model.current(t));$('bulb-value').textContent=sig(model.marked(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={V:sig(model.supply(t)),I:sig(model.current(t)),U:sig(model.marked(t)),N:plain(model.count()),v:plain(c.rated??0)};
  if(model.blown(t))return text('blownCopy',v);
  return text(c.R?'rampCopy':'lightsCopy',v);
}
// The colour of a bulb lit to brightness b (0 dark gray, 1 full glow).
const lit=b=>'rgb('+Math.round(70+185*b)+','+Math.round(90+120*b)+','+Math.round(105+17*b)+')';
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.12,R=area*.88,Ty=110,By=height-120,sx=L,sy=(Ty+By)/2,ax=R,ay=sy;
  const I=g.begun?model.current(t):0,blown=g.begun&&model.blown(t),n=model.count();
  const path=[[sx,sy-30],[sx,Ty],[R,Ty],[R,By],[sx,By],[sx,sy+30]];
  // The supply's label sits on the wire below it, or under the bottom wire when the loop is too short (phones).
  const tagY=By-sy>=80?sy+60:By+16;
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',2);
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(g.begun?sig(model.supply(t))+' V':plain(c.V)+' V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  const tag=text('supplyTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // The loop's length, for the fairy lights and the moving charges.
  const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
  const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const q=(d-s0)/l;return [a[0]+(bb[0]-a[0])*q,a[1]+(bb[1]-a[1])*q,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
  const xs=c.R?c.R.map((_,i)=>L+(R-L)*(i+1)/(c.R.length+1)):[];
  if(c.R){
    // Lamps (IEC: a circle with a cross) on the top wire, each glowing with its own power.
    c.R.forEach((r,i)=>{const x=xs[i],b=g.begun?model.glow(i,t):0;
      if(b>0)dot(x,Ty,14+18*b,'rgba(255,210,120,'+(.12+.38*b)+')');
      dot(x,Ty,13,lit(b));ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x,Ty,13,0,Math.PI*2);ctx.stroke();
      line([{x:x-9,y:Ty-9},{x:x+9,y:Ty+9}],'#f2f8fc',1.5);line([{x:x-9,y:Ty+9},{x:x+9,y:Ty-9}],'#f2f8fc',1.5);
      fit(plain(r)+' Ω',x,Ty-20,'#d1e3ed',10,(R-L)/(c.R.length+1)-6,'center');});
    // The voltmeter across the marked bulb.
    const mx=xs[c.mark],vy=Ty+52;line([{x:mx-18,y:Ty},{x:mx-18,y:vy},{x:mx-14,y:vy}],'#9fb6c7',1);line([{x:mx+18,y:Ty},{x:mx+18,y:vy},{x:mx+14,y:vy}],'#9fb6c7',1);
    dot(mx,vy,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(mx,vy,14,0,Math.PI*2);ctx.stroke();label('V',mx,vy+4,'#f2f8fc','center',12);
    box(mx-36,vy+20,72,20,'#0b1c29');fit(g.begun?sig(model.marked(t))+' V':'? V',mx,vy+34,'#f2f8fc',11,66,'center');
  }else{
    // Fairy lights: your number of small bulbs spread along the top, right, and bottom wires (up to 150 drawn).
    const start=seg[1][2],end=seg[4][2]+seg[4][3]*.75,shown=Math.min(n,150),broken=Math.max(0,Math.min(shown-1,Math.round(seg[1][3]/3/(end-start)*shown-.5))),b=g.begun?model.glow(0,t):0;
    // Bulbs that would sit on the ammeter or the supply's label are left out of the drawing.
    const hidden=(x,y)=>Math.hypot(x-ax,y-ay)<20||Math.abs(x-ax)<48&&y>ay&&y<ay+42||Math.abs(x-sx)<tw/2+4&&Math.abs(y-tagY+3)<10;
    for(let i=0;i<shown;i++){const [x,y]=at(start+(end-start)*(i+.5)/shown);if(hidden(x,y)&&!(blown&&i===broken))continue;
      if(blown&&i===broken){dot(x,y,4,'#3a4a57');line([{x:x-4,y:y-4},{x:x+4,y:y+4}],'#ff7b4a',1.5);line([{x:x-4,y:y+4},{x:x+4,y:y-4}],'#ff7b4a',1.5);continue;}
      if(b>0)dot(x,y,5+4*b,'rgba(255,210,120,'+(.1+.3*b)+')');dot(x,y,3.5,lit(b));}
    fit(n?text('bulbsTag',{N:plain(n)}):'N = ?',(L+R)/2,Ty-18,'#d1e3ed',10,(R-L)*.8,'center');
    fit(text('ratedTag',{v:plain(c.rated)}),(L+R)/2,Ty+24,'#9fb6c7',9,(R-L)*.6,'center');
    if(blown){const [x,y]=at(start+(end-start)*(broken+.5)/shown);fit(text('blownTag'),x,y+(y<sy?-12:22),'#efb958',11,140,'center');}
  }
  // The ammeter.
  dot(ax,ay,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(ax,ay,14,0,Math.PI*2);ctx.stroke();label('A',ax,ay+4,'#f2f8fc','center',12);
  box(ax-46,ay+20,92,20,'#0b1c29');fit(g.begun?sig(I)+' A':'? A',ax,ay+34,'#f2f8fc',11,86,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+(model.unit()?' '+model.unit():''),(L+R)/2,By+30,'#efb958',10,area*.6,'center');
  // The two directions: mint current arrows, and sky electrons the other way (not drawn over the fairy lights).
  if(g.option&&I>0){
    const skip=(x,y)=>Math.abs(y-Ty)<16&&xs.some(x0=>Math.abs(x-x0)<18)||Math.hypot(x-ax,y-ay)<18||Math.abs(x-ax)<8&&y>ay&&y<ay+44||Math.abs(x-sx)<8&&y>tagY-16&&y<tagY+8;
    const shift=t*I/(model.drive(model.duration())*model.duration()||1)*120;
    if(c.R)for(let d=0;d<total;d+=32){const [x,y]=at(d-shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    for(const fr of [.15,.45,.7,.92]){const [x0,y0,ux,uy]=at(fr*total),x=x0-uy*11,y=y0+ux*11;if(skip(x0,y0))continue;line([{x:x-ux*11,y:y-uy*11},{x:x+ux*11,y:y+uy*11}],'#75efc7',3);line([{x:x+ux*4-uy*5,y:y+uy*4+ux*5},{x:x+ux*11,y:y+uy*11},{x:x+ux*4+uy*5,y:y+uy*4-ux*5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box,label}=g,t=model.now();
  fit(text('barGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+20,px1=width-14,py0=92,py1=height-64,rs=model.resistances(),tot=model.total();
  // One bar per bulb (one for all the fairy lights), and their sum, which is the supply.
  const n=c.R?rs.length:1,peak=Math.max(...(c.R?rs:[c.bulb]).map(r=>c.V*r/tot),c.rated||0,c.ask==='voltage'&&g.guess?Math.min(model.answer,c.V):0,1e-9)*1.25;
  const PY=v=>py1-Math.max(0,Math.min(v,peak))/peak*(py1-py0),w=Math.min(44,(px1-px0)/n*.55);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  const vs=c.R?rs.map((_,i)=>model.across(i,t)):[model.across(0,t)];
  vs.forEach((v,i)=>{const x=px0+(px1-px0)*(i+.5)/n,mark=c.R&&i===c.mark;box(x-w/2,PY(v),w,py1-PY(v),mark?'#d1e3ed':'#5c7a8f');
    label(sig(v)+' V',x,PY(v)-6,'#f2f8fc','center',10);fit(c.R?plain(rs[i])+' Ω':text('eachTag',{N:plain(model.count())}),x,py1+14,'#9fb6c7',9,(px1-px0)/n-4,'center');});
  if(c.rated){line([{x:px0,y:PY(c.rated)},{x:px1,y:PY(c.rated)}],'#ff9a6a',1.5,[5,4]);fit(text('ratedTag',{v:plain(c.rated)}),px0+2,PY(c.rated)-5,'#ff9a6a',9,(px1-px0)*.8);}
  if(c.ask==='voltage'&&g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
  const sum=c.R?vs.map(v=>sig(v)).join(' + ')+' = '+sig(vs.reduce((a,b)=>a+b,0))+' V':plain(model.count())+' × '+sig(vs[0])+' V = '+sig(vs[0]*model.count())+' V';
  fit(sum,g.area+8,66,'#d1e3ed',10,width-g.area-16);
}
`
};
