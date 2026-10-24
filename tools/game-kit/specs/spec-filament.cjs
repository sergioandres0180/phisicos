module.exports = {
kind:'filament',model:'FilamentModel',title:'Hot Filament',symbol:'R =',unit:'Ω',equation:'R = R₀·(1 + α·(T − T₀))',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .filament-page .mission-list span{unicode-bidi:plaintext}.filament-page .line-key.hot{background:linear-gradient(90deg,#c9a27a,#ff7b4a,#ffe6a0)}',
toggle:['show-glow','glowToggle'],
legends:[['hot','wireLegend'],['white','meterLegend'],['blue','thermoLegend'],['orange','guessLegend']],
metrics:[['temp-value','tempMetric','°C','T','scalar'],['resistance-value','resistanceMetric','Ω','R = R₀·(1 + α·(T − T₀))','scalar'],['rise-value','riseMetric','Ω','ΔR = R₀·α·(T − T₀)','scalar']],
modelCode:String.raw`
class FilamentModel {
  // A metal's resistance rises as it heats: R = R₀·(1 + α·(T − T₀)), a straight-line teaching model (real tungsten curves
  // upward at high temperature). Copper α = 0.00393 /°C and tungsten 0.0045 /°C from T₀ = 20 °C; a Pt100 platinum sensor
  // reads 100 Ω at T₀ = 0 °C with α = 0.00385 /°C. The wire is heated steadily over 2 s and held for 1 s (a real lamp
  // heats in about a tenth of a second); the ohmmeter, ammeter, and thermometer are ideal. The lamp runs on 230 V.
  static T = 3;
  static heat = 2;
  static supply = 230;
  static tolerance = .02;
  static missions = [
    {key:'warm',ask:'resistance',metal:'copper',R0:10,T0:20,a:.00393,T1:70,top:100},
    {key:'glow',ask:'resistance',metal:'tungsten',R0:40,T0:20,a:.0045,T1:2500,top:3000},
    {key:'inrush',ask:'ratio',metal:'tungsten',R0:40,T0:20,a:.0045,T1:2500,top:3000,lamp:true},
    {key:'sensor',ask:'temperature',metal:'platinum',R0:100,T0:0,a:.00385,T1:50,top:100,reading:119.25},
    {key:'double',ask:'temperature',metal:'copper',R0:10,T0:20,a:.00393,T1:null,top:400,target:20}
  ];
  static units = {resistance:'Ω',ratio:'',temperature:'°C'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=FilamentModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // Temperatures stay above absolute zero and below 10 000 °C; resistances and ratios are positive.
  valid(value){if(!Number.isFinite(value))return false;return this.config.ask==='temperature'?value>-273.15&&value<=1e4:value>0&&value<=1e9;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The temperature at time t: heated steadily over 2 s to its final value, which in the last test is your temperature.
  final(){const c=this.config;return c.T1??(this.ready()?this.answer:c.T0);}
  temperature(t){const c=this.config;return c.T0+(this.final()-c.T0)*Math.min(1,Math.max(0,t/FilamentModel.heat));}
  resistanceAt(T){const c=this.config;return c.R0*(1+c.a*(T-c.T0));}
  resistance(t){return this.resistanceAt(this.temperature(t));}
  current(t){return FilamentModel.supply/this.resistance(t);}
  duration(){return FilamentModel.T;}
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
    const c=this.config;
    if(c.key==='warm'||c.key==='glow')return this.resistanceAt(c.T1);
    if(c.key==='inrush')return this.resistanceAt(c.T1)/c.R0;
    if(c.key==='sensor')return c.T0+(c.reading/c.R0-1)/c.a;
    return c.T0+(c.target/c.R0-1)/c.a;
  }
  unit(){return FilamentModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=FilamentModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='warm'){if(near(a,x-c.R0))slip='warmNoBase';else if(near(a,c.R0*(1+c.a*c.T1)))slip='absolute';}
      else if(c.key==='glow'){if(near(a,x-c.R0))slip='glowNoBase';}
      else if(c.key==='inrush'){if(near(a,1/x))slip='inverted';}
      else if(c.key==='sensor'){if(near(a,c.reading/(c.R0*c.a)))slip='sensorNoBase';}
      else{if(near(a,x-c.T0))slip='rise';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!FilamentModel.missions[saved.index])return false;
    const probe=new FilamentModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={resistance:'R =',ratio:'I_cold ÷ I_hot =',temperature:'T =',};
// Results to 4 significant figures (rounded first, so 119.24999… reads as 119.25 before rounding); meters to 5.
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
const sig5=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:5,useGrouping:false});
const deg=x=>number(x,1).replace('-','−');
// Givens: the metal, its resistance and temperatures, the reading, or the resistance to reach.
function given(m){
  const keys={warm:'givenWarm',glow:'givenGlow',inrush:'givenInrush',sensor:'givenSensor',double:'givenDouble'};
  return text(keys[m.key],{R:plain(m.R0),T0:plain(m.T0),T1:plain(m.T1??0),V:plain(FilamentModel.supply),r:plain(m.reading??0)});
}
function equation(){
  const c=model.config,k=c.key;
  if(k==='warm')return 'R = 10 × (1 + '+sig(.00393)+' × 50) = '+sig(model.exact())+' Ω';
  if(k==='glow')return 'R = 40 × (1 + '+sig(.0045)+' × 2480) = '+sig(model.exact())+' Ω';
  if(k==='inrush')return 'I_cold ÷ I_hot = R_hot ÷ R_cold = '+sig(486.4)+' ÷ 40 = '+sig(model.exact());
  if(k==='sensor')return 'T = ('+plain(119.25)+' ÷ 100 − 1) ÷ '+sig(.00385)+' = '+sig(model.exact())+' °C';
  return 'T = 20 + (2 − 1) ÷ '+sig(.00393)+' = '+sig(model.exact())+' °C';
}
function baseEquation(){return 'R = R₀·(1 + α·(T − T₀))';}
function metrics(t,begun){
  if(!begun){for(const id of ['temp-value','resistance-value','rise-value'])$(id).textContent='—';return;}
  const c=model.config,R=model.resistance(t);$('temp-value').textContent=deg(model.temperature(t));$('resistance-value').textContent=sig5(R);$('rise-value').textContent=sig5(R-c.R0);
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={T:deg(model.temperature(t)),R:sig5(model.resistance(t)),I:sig5(model.current(t))};
  return text(c.lamp?'lampCopy':c.key==='sensor'?'sensorCopy':'heatCopy',v);
}
// The colour of hot metal: dark, then dull red, orange, and yellow-white.
function glowColour(T,metal){
  const base=metal==='copper'?[201,162,122]:metal==='platinum'?[200,206,212]:[150,160,170];
  if(T<500)return 'rgb('+base.join(',')+')';
  const u=Math.min(1,(T-500)/2200),r=Math.round(180+75*Math.min(1,u*1.6)),gg=Math.round(40+190*u),b=Math.round(20+160*Math.max(0,u-.6)/.4);
  return 'rgb('+r+','+gg+','+b+')';
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const T=g.begun?model.temperature(t):c.T0,cx=area*.42,cy=height*.56,w=Math.min(area*.42,260),col=glowColour(T,c.metal);
  // A bath for the copper and platinum tests; a glass bulb for the tungsten ones.
  if(c.metal==='tungsten'){ctx.beginPath();ctx.strokeStyle='rgba(209,227,237,.5)';ctx.lineWidth=1.5;ctx.arc(cx,cy,w*.42,0,Math.PI*2);ctx.stroke();}
  else{box(cx-w/2-20,cy-30,w+40,90,'rgba(119,185,255,'+(.08+.12*Math.min(1,Math.max(0,(T-c.T0)/(c.top-c.T0))))+')');line([{x:cx-w/2-20,y:cy-30},{x:cx+w/2+20,y:cy-30}],'#77b9ff',1);}
  // The glow, then the coil itself between two posts.
  if(g.option&&T>500){const u=Math.min(1,(T-500)/2000);dot(cx,cy,30+60*u,'rgba(255,200,110,'+(.08+.25*u)+')');dot(cx,cy,16+30*u,'rgba(255,230,170,'+(.12+.4*u)+')');}
  const n=9,cw=w*.6,pts=[];for(let i=0;i<=n*8;i++){const s=i/(n*8);pts.push({x:cx-cw/2+s*cw,y:cy+10*Math.sin(s*n*2*Math.PI)});}
  line([{x:cx-w/2,y:cy+70},{x:cx-w/2,y:cy},{x:cx-cw/2,y:cy}],'#9fb6c7',2);line([{x:cx+cw/2,y:cy},{x:cx+w/2,y:cy},{x:cx+w/2,y:cy+70}],'#9fb6c7',2);line(pts,col,3);
  fit(text({copper:'copperTag',tungsten:'tungstenTag',platinum:'platinumTag'}[c.metal]),cx,cy+88,'#d1e3ed',11,w,'center');
  // The meter: an ammeter on the 230 V supply for the lamp, an ohmmeter otherwise.
  const my=cy-108,reading=c.lamp?'I = '+(g.begun?sig5(model.current(t)):'?')+' A':'R = '+(g.begun?sig5(model.resistance(t)):'?')+' Ω';
  box(cx-66,my-18,132,36,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1;ctx.strokeRect(cx-66,my-18,132,36);fit(reading,cx,my+6,'#f2f8fc',15,124,'center');
  line([{x:cx-w/2,y:cy},{x:cx-w/2,y:my},{x:cx-66,y:my}],'#5c7a8f',1);line([{x:cx+w/2,y:cy},{x:cx+w/2,y:my},{x:cx+66,y:my}],'#5c7a8f',1);
  if(c.lamp)fit(text('supplyTag',{V:plain(FilamentModel.supply)}),cx,my-26,'#d1e3ed',10,w,'center');
  else if(g.guess&&c.ask==='resistance')fit(text('guessTag')+': '+plain(model.answer)+' Ω',cx,my-26,'#efb958',10,w,'center');
  if(c.target)fit(text('targetTag',{R:plain(c.target)}),cx,my-26,'#d1e3ed',10,w,'center');
  if(c.reading)fit(text('readingTag',{r:plain(c.reading)}),cx,my-26,'#d1e3ed',10,w,'center');
  // The thermometer, with your temperature in orange.
  const tx=area*.86,ty0=cy-120,ty1=cy+80,TY=v=>ty1-Math.max(0,Math.min(1,(v-Math.min(0,c.T0))/(c.top-Math.min(0,c.T0))))*(ty1-ty0);
  box(tx-6,ty0,12,ty1-ty0,'#0b1c29');ctx.strokeStyle='#9fb6c7';ctx.strokeRect(tx-6,ty0,12,ty1-ty0);box(tx-4,TY(T),8,ty1-TY(T),'#77b9ff');dot(tx,ty1+8,9,'#77b9ff');
  for(const v of [0,c.top/2,c.top]){line([{x:tx-10,y:TY(v)},{x:tx-6,y:TY(v)}],'#9fb6c7',1);label(plain(v),tx-13,TY(v)+3,'#9fb6c7','right',9);}
  fit(g.begun?deg(T)+' °C':'? °C',tx,ty0-10,'#f2f8fc',12,90,'center');
  if(g.guess&&c.ask==='temperature'){const gy=TY(model.answer);line([{x:tx-14,y:gy},{x:tx+14,y:gy}],'#efb958',2);fit(text('guessTag'),tx+16,gy+3,'#efb958',9,area-tx-18);}
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text(c.lamp?'currentGraph':'resistanceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,Tlo=Math.min(0,c.T0),Thi=Math.max(c.top,c.ask==='temperature'&&g.guess?Math.min(model.answer,c.top*2):0);
  const f=c.lamp?T=>FilamentModel.supply/model.resistanceAt(T):T=>model.resistanceAt(T),top=(c.lamp?f(c.T0):Math.max(f(Thi),c.target||0,c.reading||0,g.guess&&c.ask==='resistance'?Math.min(model.answer,2*f(Thi)):0))*1.15;
  const PX=T=>px0+(Math.max(Tlo,Math.min(T,Thi))-Tlo)/(Thi-Tlo)*(px1-px0),PY=v=>py1-Math.max(0,Math.min(v,top))/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  // The straight line R(T) (or the current it lets through), faint over the whole range and bright as far as the run.
  const all=[],run=[],T=model.temperature(t);for(let i=0;i<=40;i++){const v=Tlo+(Thi-Tlo)*i/40;all.push({x:PX(v),y:PY(f(v))});}
  for(let i=0;i<=40;i++){const v=c.T0+(T-c.T0)*i/40;run.push({x:PX(v),y:PY(f(v))});}
  line(all,'#5c7a8f',1,[3,3]);line(run,'#d1e3ed',2);dot(PX(T),PY(f(T)),4,'#f2f8fc');
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{R:plain(c.target)}),px0+4,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6);}
  if(c.reading){line([{x:px0,y:PY(c.reading)},{x:px1,y:PY(c.reading)}],'#9fb6c7',1.5,[5,4]);fit(text('readingTag',{r:plain(c.reading)}),px0+4,PY(c.reading)-5,'#9fb6c7',9,(px1-px0)*.6);}
  if(g.guess){const a=model.answer;
    if(c.ask==='temperature'){line([{x:PX(a),y:py0},{x:PX(a),y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(a)-4,py0+10,'#efb958',9,px1-px0,'right');}
    else{const v=c.lamp?f(c.T0)/a:a;line([{x:px0,y:PY(v)},{x:px1,y:PY(v)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-4,PY(v)-5,'#efb958',9,px1-px0,'right');}}
  label((c.lamp?sig5(f(T))+' A':sig5(f(T))+' Ω'),PX(T)-8,PY(f(T))+16,'#f2f8fc','right',10);
  for(const v of [Tlo,(Tlo+Thi)/2,Thi])label(plain(Math.round(v)),PX(v),py1+14,'#9fb6c7','center',9);
  fit(text('tempAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
