module.exports = {
kind:'kettle',model:'KettleModel',title:'Kettle Race',symbol:'t =',unit:'s',equation:'E = P·t = m·c·ΔT',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .kettle-page .mission-list span{unicode-bidi:plaintext}.kettle-page .line-key.cold{background:#4a90d9}.kettle-page .line-key.hot{background:#ff7b4a}',
toggle:['show-flow','flowToggle'],
legends:[['green','energyLegend'],['cold','coldLegend'],['hot','hotLegend'],['orange','guessLegend']],
metrics:[['energy-value','energyMetric','kJ','E = P·t','scalar'],['temp-value','tempMetric','°C','T','scalar'],['power-value','powerMetric','W','P','scalar']],
modelCode:String.raw`
class KettleModel {
  // A kettle turns electrical energy into heat: E = P·t, and heating water takes E = m·c·ΔT with c = 4180 J/(kg·°C) and
  // 1 L of water = 1 kg. No heat is lost unless an efficiency is given; then only that share of E heats the water. A
  // kettle made for 230 V and run on 115 V takes a quarter of its power (its element keeps its resistance). The water
  // warms at a steady rate and stays at 100 °C once it boils. Each run is sped up so it lasts 4 s.
  static c = 4180;
  static tolerance = .02;
  static missions = [
    {key:'boil',ask:'time',P:2000,m:1,T0:20,eff:1},
    {key:'energy',ask:'energy',P:1500,m:1,T0:20,eff:1,run:180},
    {key:'losses',ask:'time',P:2000,m:1,T0:20,eff:.9},
    {key:'power',ask:'power',P:null,m:.5,T0:20,eff:1,run:60},
    {key:'abroad',ask:'time',P:2000,V:230,use:115,m:1,T0:20,eff:1}
  ].map(m=>{const P=(m.P??0)*(m.use?(m.use/m.V)**2:1),T=m.run??1.25*m.m*KettleModel.c*(100-m.T0)/(m.eff*P);return {...m,T,pace:T/4};});
  static units = {time:'s',energy:'kJ',power:'W'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=KettleModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e9;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The power the kettle takes: its rating, a quarter of it on half the voltage, or yours in the power test.
  power(){const c=this.config;if(c.P===null)return this.ready()?this.answer:0;return c.P*(c.use?(c.use/c.V)**2:1);}
  rate(){const c=this.config;return c.eff*this.power()/(c.m*KettleModel.c);}
  temp(t){const c=this.config;return Math.min(100,c.T0+this.rate()*t);}
  energy(t){return this.power()*t;}
  boilTime(){const r=this.rate();return r>0?(100-this.config.T0)/r:Infinity;}
  boiling(t){return t>=this.boilTime()-1e-9;}
  // Your kettle in the time tests: it boils exactly at your time, to race the real one.
  paceTemp(t){const c=this.config;return this.ready()?Math.min(100,c.T0+(100-c.T0)*t/this.answer):c.T0;}
  duration(){return this.config.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the test's time.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,heat=c.m*KettleModel.c*(100-c.T0),P=(c.P??0)*(c.use?(c.use/c.V)**2:1);
    return {boil:()=>heat/(c.eff*P),energy:()=>P*c.run/1000,losses:()=>heat/(c.eff*P),power:()=>heat/c.run,abroad:()=>heat/P}[c.key]();
  }
  unit(){return KettleModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=KettleModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='boil'){if(near(a,x/60))slip='minutes';else if(near(a,c.m*KettleModel.c*100/c.P))slip='fullRange';}
      else if(c.key==='energy'){if(near(a,c.P*c.run/60/1000))slip='minutesEnergy';else if(near(a,c.P*c.run))slip='joules';}
      else if(c.key==='losses'){if(near(a,x*c.eff*c.eff))slip='times';else if(near(a,x/60))slip='minutes';}
      else if(c.key==='power'){if(near(a,2*x))slip='fullLitre';else if(near(a,x*c.run))slip='seconds';}
      else{if(near(a,x/2))slip='half';else if(near(a,x/4))slip='same';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!KettleModel.missions[saved.index])return false;
    const probe=new KettleModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={time:'t =',energy:'E =',power:'P ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the kettle's power, the water, its starting temperature, and the time, the efficiency, or the supply.
function given(m){
  const keys={boil:'givenBoil',energy:'givenEnergy',losses:'givenLosses',power:'givenPower',abroad:'givenAbroad'};
  return text(keys[m.key],{P:plain(m.P??0),L:plain(m.m),T:plain(m.T0),n:plain(3),e:plain(100*m.eff),s:plain(m.run??0),V:plain(m.V??0),u:plain(m.use??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='boil')return 't = m·c·ΔT ÷ P = 1 × 4180 × 80 ÷ 2000 = '+sig(167.2)+' s';
  if(k==='energy')return 'E = P·t = 1500 × 180 = 270000 J = 270 kJ';
  if(k==='losses')return 't = 334400 ÷ ('+plain(.9)+' × 2000) = '+sig(334400/1800)+' s';
  if(k==='power')return 'P = '+plain(.5)+' × 4180 × 80 ÷ 60 = '+sig(167200/60)+' W';
  return 'P = 2000 × (115 ÷ 230)² = 500 W, t = 334400 ÷ 500 = '+sig(668.8)+' s';
}
function baseEquation(){return 'E = P·t = m·c·ΔT';}
function metrics(t,begun){
  if(!begun){for(const id of ['energy-value','temp-value','power-value'])$(id).textContent='—';return;}
  $('energy-value').textContent=sig(model.energy(t)/1000);$('temp-value').textContent=number(model.temp(t),1);$('power-value').textContent=sig(model.power());
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const v={P:sig(model.power()),E:sig(model.energy(t)/1000),T:number(model.temp(t),1),t:sig(model.boilTime())};
  return text(model.boiling(t)?'boilCopy':'heatCopy',v);
}
// Water from cold blue to hot orange-red with its temperature.
const water=T=>{const u=Math.max(0,Math.min(1,(T-20)/80));return 'rgb('+Math.round(74+181*u)+','+Math.round(144-21*u)+','+Math.round(217-143*u)+')';};
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,race=c.ask==='time';
  const ky=height*.5,kw=Math.min(96,area*.2),kh=kw*1.15;
  // A kettle: body, spout, handle, the water inside coloured by its temperature, steam once it boils, and a thermometer.
  const kettle=(x,T,tag,ghost)=>{
    const top=ky-kh/2,col=ghost?'#efb958':'#f2f8fc';
    box(x-kw/2,top,kw,kh,ghost?'rgba(239,185,88,.08)':'#102637');
    const lvl=kh*.72;box(x-kw/2+3,top+kh-lvl,kw-6,lvl-3,ghost?'rgba(239,185,88,.25)':water(T));
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(x-kw/2,top,kw,kh);
    line([{x:x-kw/2,y:top+kh*.25},{x:x-kw/2-18,y:top+kh*.05},{x:x-kw/2-14,y:top+kh*.02},{x:x-kw/2,y:top+kh*.12}],col,2);
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.arc(x+kw/2,ky,kh*.28,-Math.PI/2,Math.PI/2);ctx.stroke();
    if(T>=100-1e-9)for(const dx of [-kw*.25,0,kw*.25]){const pts=[];for(let i=0;i<=8;i++)pts.push({x:x+dx+Math.sin(i*1.2+t*.08)*4,y:top-6-i*4});line(pts,'rgba(209,227,237,.6)',2);}
    const tx=x+kw/2+kh*.28+16,tb=top+kh,tt=top+6;line([{x:tx,y:tt},{x:tx,y:tb}],'#5c7a8f',6);
    line([{x:tx,y:tb},{x:tx,y:tb-(tb-tt)*Math.max(0,Math.min(1,T/100))}],ghost?'#efb958':water(T),4);dot(tx,tb+4,5,ghost?'#efb958':water(T));
    fit((g.begun?number(T,1):'?')+' °C',tx,tt-10,col,10,area*.15,'center');fit(tag,x,top-48,col,10,kw+60,"center");};
  const P=model.power(),x1=race?area*.3:area*.4;
  kettle(x1,g.begun?model.temp(t):c.T0,c.P===null?(model.ready()?plain(model.answer)+' W':'P = ? W'):plain(P)+' W',false);
  fit(text('waterTag',{L:plain(c.m),T:plain(c.T0)}),x1,ky+kh/2+18,'#9fb6c7',9,kw+60,'center');
  if(race){const x2=area*.7;kettle(x2,g.begun?model.paceTemp(t):c.T0,model.ready()?text('paceTag',{t:plain(model.answer)}):text('paceTag',{t:'?'}),true);}
  if(c.use)fit(text('abroadTag',{V:plain(c.V),u:plain(c.use)}),x1,ky+kh/2+32,'#efb958',9,kw+80,'center');
  if(c.eff<1)fit(text('lossTag',{e:plain(100*c.eff)}),x1,ky+kh/2+32,'#efb958',9,kw+80,'center');
  // The cord from the socket, with energy flowing in.
  const sx=area*.08,sy=ky+kh*.3;box(sx-12,sy-12,24,24,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.2;ctx.strokeRect(sx-12,sy-12,24,24);
  line([{x:sx+12,y:sy},{x:x1-kw/2,y:sy}],'#c9d6e0',2);
  if(g.option&&g.begun&&P>0){const off=(t/c.pace*30)%24;for(let d=off;d<(x1-kw/2-sx-24);d+=24){const x=sx+16+d;line([{x:x-5,y:sy-7},{x:x+3,y:sy-7}],'#75efc7',2.5);line([{x:x,y:sy-10},{x:x+3,y:sy-7},{x,y:sy-4}],'#75efc7',2.5);}}
  if(g.guess&&!race)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),area/2,height-40,'#efb958',10,area*.7,'center');
  fit(text('speedTag',{p:sig(c.pace)}),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('tempGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+34,px1=width-14,py0=86,py1=height-64,T=model.duration();
  // Temperature against time: a straight climb until 100 °C, then flat while it boils; your kettle dashed in orange.
  const PX=s=>px0+s/T*(px1-px0),PY=v=>py1-(Math.max(0,Math.min(v,110))/110)*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(100)},{x:px1,y:PY(100)}],'#5c7a8f',1,[3,3]);fit(text('boilTag'),px0+4,PY(100)-5,'#9fb6c7',9,(px1-px0)*.6);
  const pts=[];for(let i=0;i<=80;i++){const s=t*i/80;pts.push({x:PX(s),y:PY(model.temp(s))});}line(pts,'#ff9a6a',2);dot(PX(t),PY(model.temp(t)),4,'#f2f8fc');
  if(c.ask==='time'&&g.guess){const a=Math.min(model.answer,T);line([{x:PX(0),y:PY(c.T0)},{x:PX(a),y:PY(model.paceTemp(a))}],'#efb958',1.5,[5,4]);if(model.answer<=T)line([{x:PX(model.answer),y:PY(100)},{x:PX(model.answer),y:py1}],'#efb958',1,[2,3]);}
  if(c.run)line([{x:PX(c.run),y:py0},{x:PX(c.run),y:py1}],'#5c7a8f',1,[2,3]);
  fit('E = P·t = '+sig(model.power())+' W × '+number(t,1)+' s = '+sig(model.energy(t)/1000)+' kJ',g.area+8,66,'#d1e3ed',10,width-g.area-16);
  for(const v of [0,50,100])label(plain(v),px0-4,PY(v)+3,'#9fb6c7','right',9);
  for(const s of [0,T/2,T])label(sig(s),PX(s),py1+14,'#9fb6c7','center',9);
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
