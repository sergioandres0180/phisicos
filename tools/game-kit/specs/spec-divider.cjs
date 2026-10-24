module.exports = {
kind:'divider',model:'DividerModel',title:'Voltage Divider',symbol:'V =',unit:'V',equation:'V_out = V·R₂ ÷ (R₁ + R₂)',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .divider-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','potentialLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V_supply','scalar'],['current-value','currentMetric','mA','I = V ÷ (R₁ + R₂)','vector'],['out-value','outMetric','V','V_out','scalar']],
modelCode:String.raw`
class DividerModel {
  // A voltage divider: resistors in series across a supply carry one current, I = V ÷ (R₁ + R₂ + …), so each takes a share
  // of the voltage in proportion to its resistance, and the output across the lower part is V_out = V·R_below ÷ R_total.
  // Resistances are in kΩ and currents in mA. The voltmeter is ideal (it draws no current). The supply ramps steadily from
  // 0 to its voltage over 2 s and holds for 1 s. Sensors are fixed resistances at the moment of the test.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static missions = [
    {key:'split',ask:'voltage',V:9,R:[1,2],out:1},
    {key:'design',ask:'resistance',V:12,R:[1.4,null],out:1,target:5},
    {key:'light',ask:'voltage',V:9,R:[10,1],out:1,sensor:'light'},
    {key:'sensor',ask:'resistance',V:5,R:[4.7,null],out:1,target:2.5,sensor:'heat'},
    {key:'ladder',ask:'voltage',V:12,R:[1,2,3],out:2}
  ];
  static units = {voltage:'V',resistance:'kΩ'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=DividerModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=(this.config.ask==='voltage'?1e4:1e6);}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The chain from the top: given resistors, with your resistor (or sensor value) at the bottom in the design tests.
  resistances(){return this.config.R.map(r=>r??(this.ready()?this.answer:Infinity));}
  total(){return this.resistances().reduce((a,b)=>a+b,0);}
  below(i){return this.resistances().slice(i).reduce((a,b)=>a+b,0);}
  supply(t){return this.config.V*Math.min(1,Math.max(0,t/DividerModel.ramp));}
  // The current in mA (V ÷ kΩ), and the potential of each node above the bottom rail: node 0 is the top.
  current(t){const R=this.total();return Number.isFinite(R)?this.supply(t)/R:0;}
  node(i,t){return i===0?this.supply(t):this.current(t)*this.below(i);}
  out(t){return this.node(this.config.out,t);}
  duration(){return DividerModel.T;}
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
    if(c.ask==='resistance')return R[0]*c.target/(c.V-c.target);
    return c.V*R.slice(c.out).reduce((a,b)=>a+b,0)/R.reduce((a,b)=>a+b,0);
  }
  unit(){return DividerModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=DividerModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      const R=c.R,sum=R.reduce((p,q)=>p+(q??0),0);
      if(c.key==='split'){if(near(a,c.V*R[0]/sum))slip='splitSwapped';else if(near(a,c.V*R[1]/R[0]))slip='noSum';}
      else if(c.key==='design'){if(near(a,R[0]*(c.V-c.target)/c.target))slip='designSwapped';else if(near(a,R[0]*c.V/c.target))slip='total';}
      else if(c.key==='light'){if(near(a,c.V*R[0]/sum))slip='lightSwapped';else if(near(a,c.V*R[1]/R[0]))slip='lightNoSum';}
      else if(c.key==='sensor'){if(near(a,2*R[0]))slip='doubled';else if(near(a,R[0]/2))slip='half';}
      else{if(near(a,c.V*R[1]/sum))slip='twoOnly';else if(near(a,c.V*(R[1]+R[2])/sum))slip='top';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!DividerModel.missions[saved.index])return false;
    const probe=new DividerModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={voltage:'V =',resistance:'R₂ ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the supply and the chain from the top, the output wanted, or the sensor below.
function given(m){
  const keys={split:'givenSplit',design:'givenDesign',light:'givenLight',sensor:'givenSensor',ladder:'givenLadder'};
  return text(keys[m.key],{V:plain(m.V),a:plain(m.R[0]),b:plain(m.R[1]??0),c:plain(m.R[2]??0),t:plain(m.target??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='split')return 'V_out = 9 × 2 ÷ (1 + 2) = 6 V';
  if(k==='design')return 'R₂ = R₁·V_out ÷ (V − V_out) = '+plain(1.4)+' × 5 ÷ 7 = 1 kΩ';
  if(k==='light')return 'V_out = 9 × 1 ÷ (10 + 1) = '+sig(9/11)+' V';
  if(k==='sensor')return 'R₂ = '+plain(4.7)+' × '+plain(2.5)+' ÷ (5 − '+plain(2.5)+') = '+plain(4.7)+' kΩ';
  return 'V = 12 × 3 ÷ (1 + 2 + 3) = 6 V';
}
function baseEquation(){return 'V_out = V·R₂ ÷ (R₁ + R₂)';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','current-value','out-value'])$(id).textContent='—';return;}
  $('supply-value').textContent=sig(model.supply(t));$('current-value').textContent=sig(model.current(t));$('out-value').textContent=sig(model.out(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){return text('rampCopy',{V:sig(model.supply(t)),I:sig(model.current(t)),U:sig(model.out(t))});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.12,cx=area*.56,vx=area*.84,Ty=96,By=height-96,sx=L,sy=(Ty+By)/2,n=c.R.length,rs=model.resistances();
  const I=g.begun?model.current(t):0,slot=(By-Ty-48)/n,rh=Math.max(16,Math.min(48,slot-14));
  const ry=i=>Ty+24+slot*(i+.5),ny=i=>i===0?Ty:i===n?By:Ty+24+slot*i,oy=ny(c.out);
  const path=[[sx,sy-30],[sx,Ty],[cx,Ty],[cx,By],[sx,By],[sx,sy+30]];
  // The supply's label sits on the wire below it, or under the bottom wire when the loop is too short (phones).
  const tagY=By-sy>=80?sy+60:By+16;
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',2);
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(g.begun?sig(model.supply(t))+' V':plain(c.V)+' V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  const tag=text('supplyTag');ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,90)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#9fb6c7',9,90,'center');
  // The chain, top to bottom: IEC resistors standing on the right-hand wire, sensors with their symbols.
  c.R.forEach((r,i)=>{const y=ry(i);box(cx-11,y-rh/2,22,rh,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.strokeRect(cx-11,y-rh/2,22,rh);
    const name=r!==null?plain(r)+' kΩ':model.ready()?plain(model.answer)+' kΩ':'R₂ = ?',nx=cx-(c.sensor==='light'&&i===n-1?rh/2+14:20);fit(name,nx,y+4,'#d1e3ed',10,nx-sx-40,'right');
    if(c.sensor&&i===n-1){
      if(c.sensor==='light'){ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.2;ctx.arc(cx,y,rh/2+6,0,Math.PI*2);ctx.stroke();
        for(const d of [-6,4]){line([{x:cx+34,y:y-22+d},{x:cx+18,y:y-8+d}],'#ffd27a',1.5);line([{x:cx+18,y:y-8+d},{x:cx+24,y:y-9+d}],'#ffd27a',1.5);line([{x:cx+18,y:y-8+d},{x:cx+19,y:y-14+d}],'#ffd27a',1.5);}}
      else{line([{x:cx-16,y:y+rh/2+2},{x:cx+16,y:y-rh/2-2}],'#d1e3ed',1.5);line([{x:cx-16,y:y+rh/2+2},{x:cx-24,y:y+rh/2+2}],'#d1e3ed',1.5);}
      fit(text(c.sensor==='light'?'lightTag':'heatTag'),nx,y+18,'#9fb6c7',9,nx-sx-40,'right');}});
  for(let i=1;i<n;i++)dot(cx,ny(i),3.5,'#f2f8fc');
  // The voltmeter from the output node to the bottom rail.
  const vy=(oy+By)/2;line([{x:cx,y:oy},{x:vx,y:oy},{x:vx,y:vy-14}],'#9fb6c7',1);line([{x:vx,y:vy+14},{x:vx,y:By},{x:cx,y:By}],'#9fb6c7',1);
  dot(cx,oy,4,'#f2f8fc');fit(text('outTag'),cx+16,oy-6,'#f2f8fc',10,vx-cx-20);
  dot(vx,vy,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(vx,vy,14,0,Math.PI*2);ctx.stroke();label('V',vx,vy+4,'#f2f8fc','center',12);
  box(vx-40,vy+18,80,20,'#0b1c29');fit(g.begun?sig(model.out(t))+' V':'? V',vx,vy+32,'#f2f8fc',11,74,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),(L+vx)/2,By+30,'#efb958',10,area*.7,'center');
  // The two directions: mint current arrows, sky electrons the other way.
  if(g.option&&I>0){
    const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
    const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const q=(d-s0)/l;return [a[0]+(bb[0]-a[0])*q,a[1]+(bb[1]-a[1])*q,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
    const skip=(x,y)=>Math.abs(x-cx)<16&&c.R.some((_,i)=>Math.abs(y-ry(i))<rh/2+8)||Math.abs(x-sx)<8&&y>tagY-26&&y<tagY+18;
    const shift=t*I/(model.current(model.duration())*model.duration()||1)*120;
    for(let d=0;d<total;d+=32){const [x,y]=at(d-shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    for(const fr of [.12,.4,.75,.93]){const [x0,y0,ux,uy]=at(fr*total),x=x0-uy*11,y=y0+ux*11;if(skip(x0,y0))continue;line([{x:x-ux*11,y:y-uy*11},{x:x+ux*11,y:y+uy*11}],'#75efc7',3);line([{x:x+ux*4-uy*5,y:y+uy*4+ux*5},{x:x+ux*11,y:y+uy*11},{x:x+ux*4+uy*5,y:y+uy*4-ux*5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('potentialGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+36,px1=width-14,py0=70,py1=height-64,rs=model.resistances(),tot=model.total(),n=rs.length;
  // The potential falls in a straight line with the resistance passed from the top; nodes sit where resistors meet.
  const Vtop=Math.max(c.V,c.ask==='voltage'&&g.guess?Math.min(model.answer,2*c.V):0)*1.15;
  const PX=r=>px0+Math.max(0,Math.min(r,tot))/tot*(px1-px0),PY=v=>py1-Math.max(0,Math.min(v,Vtop))/Vtop*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  line([{x:PX(0),y:PY(c.V)},{x:PX(tot),y:PY(0)}],'#5c7a8f',1,[3,3]);line([{x:PX(0),y:PY(model.supply(t))},{x:PX(tot),y:PY(0)}],'#d1e3ed',2);
  let r=0;for(let i=0;i<=n;i++){const x=PX(r),v=model.node(i,t);
    if(i>0&&i<n)line([{x,y:py0},{x,y:py1}],'#5c7a8f',1,[2,3]);dot(x,PY(v),i===c.out?4.5:3,i===c.out?'#f2f8fc':'#9fb6c7');
    if(i===c.out){const right=x>px0+(px1-px0)*.7;label(sig(v)+' V',x+(right?-6:6),PY(v)-6,'#f2f8fc',right?'right':'left',10);}
    if(i<n){fit(plain(rs[i])+' kΩ',PX(r+rs[i]/2),py1+14,'#9fb6c7',9,PX(r+rs[i])-x-4,'center');r+=rs[i];}}
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{V:plain(c.target)}),px1-2,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6,'right');}
  if(c.ask==='voltage'&&g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
  label(sig(c.V),px0-4,PY(c.V)+3,'#9fb6c7','right',9);label('0',px0-4,py1+3,'#9fb6c7','right',9);
  fit(text('rAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
